import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { getCached, setCached } from '../lib/dataCache';

const ACTIVITY_LABELS = {
  quiz_attempted:      ['📝', 'Attempted a quiz'],
  quiz_passed:         ['✅', 'Passed a quiz'],
  quiz_complete:       ['✅', 'Completed a reading quiz'],
  article_read:        ['📖', 'Read an article'],
  note_viewed:         ['📄', 'Viewed study notes'],
  document_downloaded: ['⬇️', 'Downloaded a document'],
  webinar_attended:    ['🎥', 'Attended a webinar'],
  daily_login:         ['🔑', 'Daily login'],
};

const relTime = (d) => {
  const s = Math.floor((Date.now() - new Date(d)) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return Math.floor(s / 60) + 'm ago';
  if (s < 86400) return Math.floor(s / 3600) + 'h ago';
  return Math.floor(s / 86400) + 'd ago';
};

// ── 90-day GitHub-style heatmap ────────────────────────────────────────────
function ActivityHeatmap({ data }) {
  // Build 90 days (oldest → newest), grouped into weeks (columns of 7)
  const days = [];
  const now = new Date();
  for (let i = 89; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    const iso = d.toISOString().split('T')[0];
    days.push({ iso, count: data[iso] || 0 });
  }

  // Pad to full week columns at the start
  const firstDow = new Date(days[0].iso).getDay(); // 0=Sun
  const padded = [...Array(firstDow).fill(null), ...days];
  const weeks = [];
  for (let i = 0; i < padded.length; i += 7) {
    weeks.push(padded.slice(i, i + 7));
  }

  const getColor = (count) => {
    if (!count || count === 0) return '#F3F4F6';
    if (count === 1) return '#BBF7D0';
    if (count <= 3) return '#4ADE80';
    if (count <= 6) return '#22C55E';
    return '#15803D';
  };

  const MONTH_LABELS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const DAY_LABELS = ['S','M','T','W','T','F','S'];

  return (
    <div style={{ overflowX: 'auto' }}>
      {/* Month label row */}
      <div style={{ display: 'flex', gap: 3, marginBottom: 4, paddingLeft: 20 }}>
        {weeks.map((week, wi) => {
          // Show month label when first day of month appears in this week
          const monthDay = week.find(d => d && d.iso.endsWith('-01'));
          const label = monthDay
            ? MONTH_LABELS[parseInt(monthDay.iso.split('-')[1], 10) - 1]
            : '';
          return (
            <div key={wi} style={{ width: 12, fontSize: 8, color: '#9CA3AF', textAlign: 'center' }}>
              {label}
            </div>
          );
        })}
      </div>

      <div style={{ display: 'flex', gap: 3 }}>
        {/* Day-of-week labels */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginRight: 2 }}>
          {DAY_LABELS.map((d, i) => (
            <div key={i} style={{ height: 12, fontSize: 8, color: '#9CA3AF', lineHeight: '12px', width: 12, textAlign: 'center' }}>
              {i % 2 === 1 ? d : ''}
            </div>
          ))}
        </div>

        {/* Heatmap grid */}
        {weeks.map((week, wi) => (
          <div key={wi} style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {week.map((day, di) => (
              <div
                key={di}
                title={day ? `${day.iso}: ${day.count} activit${day.count !== 1 ? 'ies' : 'y'}` : ''}
                style={{
                  width: 12, height: 12, borderRadius: 2,
                  background: day ? getColor(day.count) : 'transparent',
                }}
              />
            ))}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, fontSize: 10, color: '#9CA3AF' }}>
        <span>Less</span>
        {['#F3F4F6','#BBF7D0','#4ADE80','#22C55E','#15803D'].map(c => (
          <div key={c} style={{ width: 10, height: 10, borderRadius: 2, background: c }} />
        ))}
        <span>More</span>
      </div>
    </div>
  );
}

// ── Streak calculation ────────────────────────────────────────────────────
function calculateStreak(activityByDate) {
  let streak = 0;
  const today = new Date();
  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const iso = d.toISOString().split('T')[0];
    if (activityByDate[iso]) {
      streak++;
    } else if (i > 0) {
      break; // gap found — streak ends
    }
  }
  return streak;
}

const pct = (actual, target) => target > 0 ? Math.min(100, Math.round((actual / target) * 100)) : 0;

export default function ActivityPage({ addToast }) {
  // DB-driven state
  const [activityByDate, setActivityByDate] = useState({});
  const [weeklyHours, setWeeklyHours] = useState([0, 0, 0, 0, 0, 0, 0]);
  const [activityFeed, setActivityFeed] = useState([]);
  const [quizTarget, setQuizTarget] = useState(5);
  const [readTarget, setReadTarget] = useState(7);
  const [quizProgress, setQuizProgress] = useState(0);
  const [readProgress, setReadProgress] = useState(0);
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    async function loadAll() {
      try {
        const { data: authData } = await supabase.auth.getUser();
        if (!authData?.user) return;
        const uid = authData.user.id;

        // ── Restore from cache instantly to eliminate loading flash ─────────
        const cached = getCached(`activity_${uid}`);
        if (cached) {
          setActivityByDate(cached.activityByDate);
          setWeeklyHours(cached.weeklyHours);
          setActivityFeed(cached.activityFeed);
          setStreak(cached.streak);
          setQuizProgress(cached.quizProgress);
          setReadProgress(cached.readProgress);
          setQuizTarget(cached.quizTarget);
          setReadTarget(cached.readTarget);
        }

        // Activity logs — fetch last 90 days
        const since90 = new Date();
        since90.setDate(since90.getDate() - 89);
        since90.setHours(0, 0, 0, 0);

        const { data: logs } = await supabase
          .from('activity_logs')
          .select('created_at, duration_minutes')
          .eq('user_id', uid)
          .gte('created_at', since90.toISOString());

        // Group by date for heatmap
        const map = (logs || []).reduce((acc, log) => {
          const d = log.created_at.split('T')[0];
          acc[d] = (acc[d] || 0) + 1;
          return acc;
        }, {});
        setActivityByDate(map);
        setStreak(calculateStreak(map));

        // Weekly hours (Mon=0 … Sun=6) for current week
        const now = new Date();
        const dow = now.getDay();
        const monday = new Date(now);
        monday.setDate(now.getDate() - (dow === 0 ? 6 : dow - 1));
        monday.setHours(0, 0, 0, 0);
        const weekly = [0, 0, 0, 0, 0, 0, 0];
        (logs || []).forEach(log => {
          const d = new Date(log.created_at);
          if (d >= monday) {
            const dayIdx = (d.getDay() + 6) % 7;
            weekly[dayIdx] += (log.duration_minutes || 30) / 60;
          }
        });
        setWeeklyHours(weekly.map(h => Math.round(h * 10) / 10));

        // Feed: last 20 activities
        const { data: feedData } = await supabase
          .from('activity_logs')
          .select('activity_type, reference_id, score_delta, created_at')
          .eq('user_id', uid)
          .order('created_at', { ascending: false })
          .limit(20);
        setActivityFeed(feedData || []);

        // Targets
        const { data: targets } = await supabase
          .from('personal_targets')
          .select('target_type, target_value')
          .eq('user_id', uid);
        (targets || []).forEach(t => {
          if (t.target_type === 'quizzes_per_week') setQuizTarget(t.target_value);
          if (t.target_type === 'articles_per_week') setReadTarget(t.target_value);
        });

        // This week's progress
        const mondayISO = monday.toISOString();
        const { data: quizLogs } = await supabase
          .from('activity_logs')
          .select('id')
          .eq('user_id', uid)
          .in('activity_type', ['quiz_attempted', 'quiz_passed', 'quiz_complete'])
          .gte('created_at', mondayISO);
        setQuizProgress((quizLogs || []).length);

        const { data: readLogs } = await supabase
          .from('activity_logs')
          .select('id')
          .eq('user_id', uid)
          .in('activity_type', ['article_read', 'note_viewed'])
          .gte('created_at', mondayISO);
        const readProg = (readLogs || []).length;
        setReadProgress(readProg);

        // ── Write fresh data to cache (90s TTL) ────────────────────────────
        setCached(`activity_${uid}`, {
          activityByDate: map,
          weeklyHours: weekly.map(h => Math.round(h * 10) / 10),
          activityFeed: feedData || [],
          streak: calculateStreak(map),
          quizProgress: (quizLogs || []).length,
          readProgress: readProg,
          quizTarget,
          readTarget,
        }, 90 * 1000);

      } catch (e) {
        console.warn('ActivityPage load failed:', e.message);
      }
    }
    loadAll();
  }, []);

  const saveTargets = async () => {
    try {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData?.user) { addToast('warn', 'Sign in to save targets'); return; }
      const uid = authData.user.id;
      await supabase.from('personal_targets').upsert([
        { user_id: uid, target_type: 'quizzes_per_week', target_value: Number(quizTarget) },
        { user_id: uid, target_type: 'articles_per_week', target_value: Number(readTarget) },
      ], { onConflict: 'user_id,target_type' });
      addToast('success', 'Targets saved!');
    } catch (_) {
      addToast('error', 'Could not save targets');
    }
  };

  const activeDays = Object.keys(activityByDate).length;
  const booksRead = activityFeed.filter(a => a.activity_type === 'article_read').length;
  const quizzesDone = activityFeed.filter(a => a.activity_type?.startsWith('quiz')).length;

  return (
    <div className="page">
      <div className="ph">
        <div className="pt">📅 My Activity</div>
        <div className="ps">Learning goals, progress & streak</div>
      </div>

      {/* Stat cards */}
      <div className="sg4">
        {[
          { l: 'Active Days', v: activeDays || '—', i: '📅', c: 'teal' },
          { l: 'Books Read', v: booksRead || '—', i: '📖', c: 'violet' },
          { l: 'Quizzes Done', v: quizzesDone || '—', i: '📝', c: 'amber' },
          { l: 'Current Streak', v: streak > 0 ? `${streak}d` : '—', i: '🔥', c: 'rose' },
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
            {streak > 0 ? `${streak}-day streak — keep it up!` : 'Start studying to build your streak'}
          </div>
          <ActivityHeatmap data={activityByDate} />
        </div>

        <div className="card">
          <div className="ct" style={{ marginBottom: 14 }}>📊 Weekly Progress</div>
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d, i) => {
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
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 12, color: '#6B7280' }}>Total this week</span>
            <span style={{ fontFamily: 'Inter,sans-serif', fontWeight: 700, color: '#2563EB' }}>
              {weeklyHours.reduce((a, b) => a + b, 0).toFixed(1)} hours
            </span>
          </div>
          <div className="divider" />
          <div className="ct" style={{ marginBottom: 10, marginTop: 4 }}>🎯 Learning Targets</div>

          {/* Quiz target */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, alignItems: 'center' }}>
              <span style={{ fontSize: 12, fontWeight: 500 }}>Quizzes per week</span>
              <input
                type="number" min="0" max="50"
                value={quizTarget}
                onChange={e => setQuizTarget(Number(e.target.value))}
                style={{ width: 52, padding: '3px 6px', border: '1px solid #E5E7EB', borderRadius: 6, fontSize: 12, textAlign: 'center' }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#6B7280', marginBottom: 4 }}>
              <span>{quizProgress} / {quizTarget} this week</span>
              <span>{pct(quizProgress, quizTarget)}%</span>
            </div>
            <div style={{ background: '#E5E7EB', borderRadius: 99, height: 6 }}>
              <div style={{ background: '#4F46E5', borderRadius: 99, height: 6, width: pct(quizProgress, quizTarget) + '%', transition: 'width 0.4s' }} />
            </div>
          </div>

          {/* Reading target */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, alignItems: 'center' }}>
              <span style={{ fontSize: 12, fontWeight: 500 }}>Articles / notes per week</span>
              <input
                type="number" min="0" max="50"
                value={readTarget}
                onChange={e => setReadTarget(Number(e.target.value))}
                style={{ width: 52, padding: '3px 6px', border: '1px solid #E5E7EB', borderRadius: 6, fontSize: 12, textAlign: 'center' }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#6B7280', marginBottom: 4 }}>
              <span>{readProgress} / {readTarget} this week</span>
              <span>{pct(readProgress, readTarget)}%</span>
            </div>
            <div style={{ background: '#E5E7EB', borderRadius: 99, height: 6 }}>
              <div style={{ background: '#10B981', borderRadius: 99, height: 6, width: pct(readProgress, readTarget) + '%', transition: 'width 0.4s' }} />
            </div>
          </div>

          <button className="btn btn-p btn-sm" onClick={saveTargets} style={{ width: '100%', justifyContent: 'center' }}>
            💾 Save Targets
          </button>
        </div>
      </div>

      {/* Recent activity feed */}
      <div className="card mt4">
        <div className="ch"><div className="ct">📚 Recent Activity</div></div>
        {activityFeed.length === 0 ? (
          <div style={{ color: '#9CA3AF', textAlign: 'center', padding: 24, fontSize: 14 }}>
            No activity yet — start reading and taking quizzes!
          </div>
        ) : (
          activityFeed.map((item, i) => {
            const [icon, label] = ACTIVITY_LABELS[item.activity_type] || ['📌', 'Did something'];
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid #F9FAFB' }}>
                <span style={{ fontSize: 22 }}>{icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{label}</div>
                  <div style={{ fontSize: 11, color: '#6B7280', marginTop: 2 }}>{relTime(item.created_at)}</div>
                </div>
                {item.score_delta > 0 && (
                  <span className="bdg bg-g">+{item.score_delta} pts</span>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Study insights */}
      {activityFeed.length > 0 && (() => {
        const quizzes = activityFeed.filter(a => a.activity_type?.startsWith('quiz'));
        const reads = activityFeed.filter(a => a.activity_type === 'article_read');
        const lastActivity = activityFeed[0]?.created_at ? new Date(activityFeed[0].created_at) : null;
        const daysSinceLast = lastActivity ? Math.floor((Date.now() - lastActivity) / 86400000) : null;
        const insights = [];

        if (reads.length === 0) insights.push({ icon: '📚', text: 'You haven\'t read any e-books yet. Start with a short article to build your streak!', color: '#EFF6FF', textColor: '#1D4ED8' });
        if (quizzes.length === 0) insights.push({ icon: '📝', text: 'Try the Exam Prep section — practice MCQs are the best way to retain what you\'ve read.', color: '#F0FDF4', textColor: '#15803D' });
        if (daysSinceLast !== null && daysSinceLast >= 3) insights.push({ icon: '🔥', text: `It's been ${daysSinceLast} days since your last activity. A 10-minute session today restarts your streak!`, color: '#FFFBEB', textColor: '#92400E' });
        if (reads.length >= 5 && quizzes.length === 0) insights.push({ icon: '💡', text: 'Great reading habit! Combine it with quizzes to maximise retention.', color: '#EDE9FE', textColor: '#5B21B6' });

        if (insights.length === 0) return null;
        return (
          <div className="card mt4" style={{ marginBottom: 20 }}>
            <div className="ct" style={{ marginBottom: 12 }}>💡 Study Insights</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {insights.map((ins, i) => (
                <div key={i} style={{ background: ins.color, borderRadius: 10, padding: '12px 14px', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <span style={{ fontSize: 18 }}>{ins.icon}</span>
                  <span style={{ fontSize: 13, color: ins.textColor, lineHeight: 1.5 }}>{ins.text}</span>
                </div>
              ))}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
