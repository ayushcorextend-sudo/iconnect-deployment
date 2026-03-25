import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { getCached, setCached } from '../lib/dataCache';
import ActivityHeatmapClickable from './Activity/ActivityHeatmapClickable';
import JournalModal from './JournalModal';
import { useAuth } from '../context/AuthContext';
import { useAppStore } from '../stores/useAppStore';
import { wowVariance, peakFocusTime, weeklyBuckets, trendColor, trendArrow } from '../lib/analytics';

// ── Activity colour classification ────────────────────────────────────────
const PRODUCTIVE = new Set(['quiz_passed','article_read','clinical_case_logged','study_plan_completed','spaced_rep_reviewed','exam_set_completed','quiz_complete']);
const NEUTRAL    = new Set(['daily_login','note_viewed','document_downloaded','diary_entry','webinar_attended']);
// anything else (quiz_attempted without pass, etc.) → unproductive

function activityColor(type) {
  if (PRODUCTIVE.has(type)) return { bg: '#F0FDF4', border: '#BBF7D0', text: '#15803D', dot: '#10B981' };
  if (NEUTRAL.has(type))    return { bg: '#FFFBEB', border: '#FDE68A', text: '#92400E', dot: '#F59E0B' };
  return                           { bg: '#FFF1F2', border: '#FECDD3', text: '#9F1239', dot: '#F43F5E' };
}

const ACTIVITY_LABELS = {
  quiz_attempted:      ['📝', 'Attempted a quiz'],
  quiz_passed:         ['✅', 'Passed a quiz'],
  quiz_complete:       ['✅', 'Completed a reading quiz'],
  article_read:        ['📖', 'Read an article'],
  note_viewed:         ['📄', 'Viewed study notes'],
  document_downloaded: ['⬇️', 'Downloaded a document'],
  webinar_attended:    ['🎥', 'Attended a webinar'],
  daily_login:         ['🔑', 'Daily login'],
  clinical_case_logged:['🏥', 'Logged clinical case'],
  study_plan_completed:['🗓', 'Study task completed'],
  spaced_rep_reviewed: ['🧠', 'Flashcard reviewed'],
  exam_set_completed:  ['📝', 'Completed exam set'],
  doubt_asked:         ['❓', 'Asked a doubt'],
  diary_entry:         ['📒', 'Diary entry'],
};

function calculateStreak(map) {
  let streak = 0;
  const today = new Date();
  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const iso = d.toISOString().split('T')[0];
    if (map[iso]) streak++;
    else if (i > 0) break;
  }
  return streak;
}

const pct = (a, t) => t > 0 ? Math.min(100, Math.round((a / t) * 100)) : 0;
const relTime = d => {
  const s = Math.floor((Date.now() - new Date(d)) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return Math.floor(s / 60) + 'm ago';
  if (s < 86400) return Math.floor(s / 3600) + 'h ago';
  return Math.floor(s / 86400) + 'd ago';
};

export default function ActivityPage({ addToast }) {
  const { user } = useAuth();
  const diaryCache = useAppStore(s => s.diaryCache);
  const [activityByDate, setActivityByDate] = useState({});
  const [weeklyHours, setWeeklyHours] = useState([0, 0, 0, 0, 0, 0, 0]);
  const [activityFeed, setActivityFeed] = useState([]);
  const [quizTarget, setQuizTarget] = useState(5);
  const [readTarget, setReadTarget] = useState(7);
  const [quizProgress, setQuizProgress] = useState(0);
  const [readProgress, setReadProgress] = useState(0);
  const [streak, setStreak] = useState(0);
  const [uid, setUid] = useState(null);
  // KPI state — set from fresh fetch, not derived at render time (avoids stale cache drift)
  const [activeDays, setActiveDays] = useState(0);
  const [booksRead, setBooksRead] = useState(0);
  const [quizzesDone, setQuizzesDone] = useState(0);
  // Diary state
  const [selectedDate, setSelectedDate] = useState(null);
  const [diaryDates, setDiaryDates] = useState(new Set());
  // Analytics insights
  const [wowInsight, setWowInsight] = useState(null);
  const [peakTime, setPeakTime] = useState(null);

  // ── Cross-page sync: merge any diary saves from Dashboard into diaryDates ─
  // diaryCache is updated by JournalModal whenever a save completes, even if
  // that save happened on the Dashboard page. When ActivityPage next mounts
  // (or if it's already mounted), this effect merges the cached dates in.
  useEffect(() => {
    if (Object.keys(diaryCache).length === 0) return;
    setDiaryDates(prev => {
      const next = new Set(prev);
      Object.keys(diaryCache).forEach(date => next.add(date));
      return next;
    });
  }, [diaryCache]);

  useEffect(() => {
    async function loadAll() {
      try {
        const userId = user?.id;
        if (!userId) return;
        setUid(userId);

        const cached = getCached(`activity_${userId}`);
        if (cached) {
          setActivityByDate(cached.activityByDate);
          setWeeklyHours(cached.weeklyHours);
          setActivityFeed(cached.activityFeed);
          setStreak(cached.streak);
          setActiveDays(cached.activeDays ?? 0);
          setBooksRead(cached.booksRead ?? 0);
          setQuizzesDone(cached.quizzesDone ?? 0);
          setQuizProgress(cached.quizProgress);
          setReadProgress(cached.readProgress);
          setQuizTarget(cached.quizTarget ?? 5);
          setReadTarget(cached.readTarget ?? 7);
        }

        const since90 = new Date();
        since90.setDate(since90.getDate() - 89);
        since90.setHours(0, 0, 0, 0);

        const [logsRes, feedRes, targetsRes, quizRes, readRes, diaryRes] = await Promise.all([
          supabase.from('activity_logs').select('created_at, duration_minutes, activity_type, reference_id').eq('user_id', userId).gte('created_at', since90.toISOString()).limit(5000),
          supabase.from('activity_logs').select('activity_type, reference_id, score_delta, created_at').eq('user_id', userId).order('created_at', { ascending: false }).limit(30),
          supabase.from('personal_targets').select('target_type, target_value').eq('user_id', userId),
          null, null,
          supabase.from('calendar_diary').select('date').eq('user_id', userId).gte('date', since90.toISOString().split('T')[0]),
        ]);

        const logs90 = logsRes.data || [];
        const map = logs90.reduce((acc, log) => {
          const d = log.created_at.split('T')[0];
          acc[d] = (acc[d] || 0) + 1;
          return acc;
        }, {});
        setActivityByDate(map);
        const newStreak = calculateStreak(map);
        setStreak(newStreak);

        // KPIs — computed from 90-day logs, not from the 30-item feed
        const newActiveDays = Object.keys(map).length; // unique dates only
        const newBooksRead  = new Set(
          logs90.filter(l => l.activity_type === 'article_read' && l.reference_id)
                .map(l => l.reference_id)
        ).size;
        const newQuizzesDone = new Set(
          logs90.filter(l => l.activity_type?.startsWith('quiz') && l.reference_id)
                .map(l => l.reference_id)
        ).size;
        setActiveDays(newActiveDays);
        setBooksRead(newBooksRead);
        setQuizzesDone(newQuizzesDone);

        const now = new Date();
        const dow = now.getDay();
        const monday = new Date(now);
        monday.setDate(now.getDate() - (dow === 0 ? 6 : dow - 1));
        monday.setHours(0, 0, 0, 0);
        const weekly = [0, 0, 0, 0, 0, 0, 0];
        (logsRes.data || []).forEach(log => {
          const d = new Date(log.created_at);
          if (d >= monday) {
            const dayIdx = (d.getDay() + 6) % 7;
            weekly[dayIdx] += (log.duration_minutes || 30) / 60;
          }
        });
        const roundedWeekly = weekly.map(h => Math.round(h * 10) / 10);
        setWeeklyHours(roundedWeekly);
        setActivityFeed(feedRes.data || []);

        // ── Analytics insights ───────────────────────────────────
        const buckets4 = weeklyBuckets(logs90, 4);
        const thisW = buckets4[3]?.count ?? 0;
        const lastW = buckets4[2]?.count ?? 0;
        setWowInsight(wowVariance(thisW, lastW));
        setPeakTime(peakFocusTime(logs90));

        let qTarget = 5, rTarget = 7;
        (targetsRes.data || []).forEach(t => {
          if (t.target_type === 'quizzes_per_week') { setQuizTarget(t.target_value); qTarget = t.target_value; }
          if (t.target_type === 'articles_per_week') { setReadTarget(t.target_value); rTarget = t.target_value; }
        });

        const mondayISO = monday.toISOString();
        const [quizLogsRes, readLogsRes] = await Promise.all([
          supabase.from('activity_logs').select('id').eq('user_id', userId).in('activity_type', ['quiz_attempted','quiz_passed','quiz_complete']).gte('created_at', mondayISO),
          supabase.from('activity_logs').select('id').eq('user_id', userId).in('activity_type', ['article_read','note_viewed']).gte('created_at', mondayISO),
        ]);
        const qProg = (quizLogsRes.data || []).length;
        const rProg = (readLogsRes.data || []).length;
        setQuizProgress(qProg);
        setReadProgress(rProg);

        // Diary dots
        const dDates = new Set((diaryRes.data || []).map(r => r.date));
        setDiaryDates(dDates);

        setCached(`activity_${userId}`, {
          activityByDate: map, weeklyHours: roundedWeekly,
          activityFeed: feedRes.data || [], streak: newStreak,
          activeDays: newActiveDays, booksRead: newBooksRead, quizzesDone: newQuizzesDone,
          quizProgress: qProg, readProgress: rProg, quizTarget: qTarget, readTarget: rTarget,
        }, 90 * 1000);

      } catch (e) {
        console.warn('ActivityPage load failed:', e.message);
      }
    }
    loadAll();
  }, []);

  const saveTargets = async () => {
    try {
      const userId = user?.id;
      if (!userId) { addToast('warn', 'Sign in to save targets'); return; }
      await supabase.from('personal_targets').upsert([
        { user_id: userId, target_type: 'quizzes_per_week', target_value: Number(quizTarget) },
        { user_id: userId, target_type: 'articles_per_week', target_value: Number(readTarget) },
      ], { onConflict: 'user_id,target_type' });
      addToast('success', 'Targets saved!');
    } catch (_) { addToast('error', 'Could not save targets'); }
  };

  // Productivity summary for today
  const todayIso = new Date().toISOString().split('T')[0];
  const todayFeed = activityFeed.filter(a => a.created_at?.startsWith(todayIso));
  const todayProductive = todayFeed.filter(a => PRODUCTIVE.has(a.activity_type)).length;

  return (
    <div className="page">
      {/* Stat cards */}
      <div className="sg4">
        {[
          { l: 'Active Days', v: activeDays,                    i: '📅', c: 'teal' },
          { l: 'Books Read',  v: booksRead,                     i: '📖', c: 'violet' },
          { l: 'Quizzes',    v: quizzesDone,                   i: '📝', c: 'amber' },
          { l: 'Streak',     v: streak > 0 ? `${streak}d` : 0, i: '🔥', c: 'rose' },
        ].map((s, i) => (
          <div key={i} className={`stat ${s.c} fu`} style={{ animationDelay: `${i * 0.07}s` }}>
            <div className="stat-ic">{s.i}</div>
            <div className="stat-v">{s.v}</div>
            <div className="stat-l">{s.l}</div>
          </div>
        ))}
      </div>

      {/* Heatmap + weekly progress */}
      <div className="grid2">
        <div className="card">
          <div className="ct" style={{ marginBottom: 4 }}>🔥 90-Day Activity</div>
          <div className="cs" style={{ marginBottom: 14, color: streak > 0 ? '#15803D' : '#9CA3AF' }}>
            {streak > 0 ? `${streak}-day streak — keep it up!` : 'Click any date to add a diary entry'}
          </div>
          <ActivityHeatmapClickable
            data={activityByDate}
            diaryDates={diaryDates}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
          />
        </div>

        <div className="card">
          <div className="ch" style={{ marginBottom: 14 }}>
            <div className="ct">📊 Weekly Progress</div>
            {wowInsight && wowInsight.direction !== 'flat' && (
              <span style={{
                fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 99,
                background: wowInsight.direction === 'up' ? '#DCFCE7' : '#FEE2E2',
                color: trendColor(wowInsight.direction),
              }}>
                {trendArrow(wowInsight.direction)} {wowInsight.pct}% WoW
              </span>
            )}
          </div>
          {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map((d, i) => {
            const hrs = weeklyHours[i];
            const maxHrs = Math.max(...weeklyHours, 1);
            return (
              <div key={d} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 9 }}>
                <div style={{ width: 28, fontSize: 11, fontWeight: 600, color: '#6B7280' }}>{d}</div>
                <div className="pb" style={{ flex: 1 }}>
                  <div className="pf" style={{ width: `${(hrs / maxHrs) * 100}%` }} />
                </div>
                <div style={{ fontSize: 11, color: '#6B7280', width: 32, textAlign: 'right' }}>
                  {hrs > 0 ? `${hrs}h` : '—'}
                </div>
              </div>
            );
          })}
          <div className="divider" />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: '#6B7280' }}>Total this week</span>
            <span style={{ fontWeight: 700, color: '#2563EB' }}>{weeklyHours.reduce((a, b) => a + b, 0).toFixed(1)}h</span>
          </div>
          {peakTime && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
              <span style={{ fontSize: 12, color: '#6B7280' }}>Peak focus time</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#2563EB' }}>⚡ {peakTime.label} ({peakTime.pct}%)</span>
            </div>
          )}
          <div className="divider" />
          <div className="ct" style={{ marginBottom: 10, marginTop: 4 }}>🎯 Learning Targets</div>
          {[
            { label: 'Quizzes per week', prog: quizProgress, target: quizTarget, setT: setQuizTarget, color: '#4F46E5' },
            { label: 'Articles / notes per week', prog: readProgress, target: readTarget, setT: setReadTarget, color: '#10B981' },
          ].map(({ label, prog, target, setT, color }) => (
            <div key={label} style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, alignItems: 'center' }}>
                <span style={{ fontSize: 12, fontWeight: 500 }}>{label}</span>
                <input type="number" min="0" max="50" value={target} onChange={e => setT(Number(e.target.value))}
                  style={{ width: 52, padding: '3px 6px', border: '1px solid #E5E7EB', borderRadius: 6, fontSize: 12, textAlign: 'center' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#6B7280', marginBottom: 4 }}>
                <span>{prog} / {target} this week</span><span>{pct(prog, target)}%</span>
              </div>
              <div style={{ background: '#E5E7EB', borderRadius: 99, height: 6 }}>
                <div style={{ background: color, borderRadius: 99, height: 6, width: pct(prog, target) + '%', transition: 'width .4s' }} />
              </div>
            </div>
          ))}
          <button className="btn btn-p btn-sm" onClick={saveTargets} style={{ width: '100%', justifyContent: 'center' }}>💾 Save Targets</button>
        </div>
      </div>

      {/* Daily productivity summary */}
      {todayFeed.length > 0 && (
        <div style={{
          background: todayProductive > 0 ? 'linear-gradient(135deg,#F0FDF4,#DCFCE7)' : 'linear-gradient(135deg,#FFF7ED,#FFEDD5)',
          border: `1px solid ${todayProductive > 0 ? '#BBF7D0' : '#FED7AA'}`,
          borderRadius: 12, padding: '12px 16px', marginBottom: 16,
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <span style={{ fontSize: 22 }}>{todayProductive > 0 ? '🟢' : '🟡'}</span>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>Today's Summary</div>
            <div style={{ fontSize: 12, color: '#6B7280' }}>
              {todayFeed.length} activit{todayFeed.length !== 1 ? 'ies' : 'y'} · {todayProductive} productive · click any date to add diary notes
            </div>
          </div>
        </div>
      )}

      {/* Color-coded activity feed */}
      <div className="card mt4">
        <div className="ch">
          <div className="ct">📚 Recent Activity</div>
          <div style={{ display: 'flex', gap: 12, fontSize: 10, color: '#9CA3AF' }}>
            <span>🟢 Productive</span><span>🟡 Neutral</span><span>🔴 Unproductive</span>
          </div>
        </div>
        {activityFeed.length === 0 ? (
          <div style={{ color: '#9CA3AF', textAlign: 'center', padding: 24, fontSize: 14 }}>
            No activity yet — start reading and taking quizzes!
          </div>
        ) : (
          activityFeed.map((item, i) => {
            const [icon, label] = ACTIVITY_LABELS[item.activity_type] || ['📌', item.activity_type?.replace(/_/g, ' ') || 'Activity'];
            const col = activityColor(item.activity_type);
            return (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '9px 10px', marginBottom: 4, borderRadius: 9,
                background: col.bg, border: `1px solid ${col.border}`,
              }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: col.dot, flexShrink: 0 }} />
                <span style={{ fontSize: 20 }}>{icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: col.text }}>{label}</div>
                  <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 1 }}>{relTime(item.created_at)}</div>
                </div>
                {item.score_delta > 0 && (
                  <span className="bdg bg-g">+{item.score_delta} pts</span>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Journal modal — slide-in panel from right */}
      {selectedDate && uid && (
        <JournalModal
          date={selectedDate}
          userId={uid}
          onClose={() => setSelectedDate(null)}
          addToast={addToast}
          onSave={(date) => setDiaryDates(prev => new Set([...prev, date]))}
          mode="panel"
        />
      )}
    </div>
  );
}
