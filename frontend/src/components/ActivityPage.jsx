import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

const ACTIVITY_LABELS = {
  quiz_attempted:      ['📝', 'Attempted a quiz'],
  quiz_passed:         ['✅', 'Passed a quiz'],
  article_read:        ['📖', 'Read an article'],
  note_viewed:         ['📄', 'Viewed study notes'],
  document_downloaded: ['⬇️', 'Downloaded a document'],
  webinar_attended:    ['🎥', 'Attended a webinar'],
};

const relTime = (d) => {
  const s = Math.floor((Date.now() - new Date(d)) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return Math.floor(s / 60) + 'm ago';
  if (s < 86400) return Math.floor(s / 3600) + 'h ago';
  return Math.floor(s / 86400) + 'd ago';
};

export default function ActivityPage({ addToast }) {
  const today = new Date();
  const dim = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const [selDay, setSelDay] = useState(null);

  // DB-driven state
  const [activityByDate, setActivityByDate] = useState({});
  const [weeklyHours, setWeeklyHours] = useState([0, 0, 0, 0, 0, 0, 0]); // Mon-Sun
  const [activityFeed, setActivityFeed] = useState([]);
  const [quizTarget, setQuizTarget] = useState(5);
  const [readTarget, setReadTarget] = useState(7);
  const [quizProgress, setQuizProgress] = useState(0);
  const [readProgress, setReadProgress] = useState(0);
  const [upcoming, setUpcoming] = useState([]);
  const [totalHours, setTotalHours] = useState(0);

  const loadUpcoming = useCallback(async () => {
    const { data: authData } = await supabase.auth.getUser();
    if (!authData?.user) return;
    const { data } = await supabase
      .from('webinar_registrations')
      .select('*')
      .eq('user_id', authData.user.id)
      .gte('webinar_date', new Date().toISOString())
      .order('webinar_date', { ascending: true });
    setUpcoming(data || []);
  }, []);

  useEffect(() => {
    async function loadAll() {
      try {
        const { data: authData } = await supabase.auth.getUser();
        if (!authData?.user) return;
        const uid = authData.user.id;

        // Calendar + weekly hours: group activity logs by date
        const { data: logs } = await supabase
          .from('activity_logs')
          .select('created_at, duration_minutes')
          .eq('user_id', uid);
        const map = (logs || []).reduce((acc, log) => {
          const d = log.created_at.split('T')[0];
          acc[d] = (acc[d] || 0) + 1;
          return acc;
        }, {});
        setActivityByDate(map);

        // Total hours from all logs
        const allHours = (logs || []).reduce((acc, log) => acc + (log.duration_minutes || 30), 0) / 60;
        setTotalHours(Math.round(allHours * 10) / 10);

        // Weekly hours (Mon=0 … Sun=6) for current week
        const now2 = new Date();
        const day2 = now2.getDay();
        const monday2 = new Date(now2);
        monday2.setDate(now2.getDate() - (day2 === 0 ? 6 : day2 - 1));
        monday2.setHours(0, 0, 0, 0);
        const weekly = [0, 0, 0, 0, 0, 0, 0];
        (logs || []).forEach(log => {
          const d = new Date(log.created_at);
          if (d >= monday2) {
            const dayIdx = (d.getDay() + 6) % 7; // Mon=0 … Sun=6
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

        // This week's Monday
        const now = new Date();
        const day = now.getDay();
        const monday = new Date(now);
        monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
        monday.setHours(0, 0, 0, 0);
        const mondayISO = monday.toISOString();

        const { data: quizLogs } = await supabase
          .from('activity_logs')
          .select('id')
          .eq('user_id', uid)
          .eq('activity_type', 'quiz_attempted')
          .gte('created_at', mondayISO);
        setQuizProgress((quizLogs || []).length);

        const { data: readLogs } = await supabase
          .from('activity_logs')
          .select('id')
          .eq('user_id', uid)
          .in('activity_type', ['article_read', 'note_viewed'])
          .gte('created_at', mondayISO);
        setReadProgress((readLogs || []).length);

      } catch (e) {
        console.warn('ActivityPage load failed:', e.message);
      }
    }
    loadAll();
    loadUpcoming();
  }, [loadUpcoming]);

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
    } catch (e) {
      addToast('error', 'Could not save targets');
    }
  };

  const handleAddToCalendar = async (webinar) => {
    try {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData?.user) { addToast('warn', 'Sign in to save to calendar'); return; }
      await supabase.from('webinar_registrations').insert({
        user_id: authData.user.id,
        webinar_id: String(webinar.id || webinar.t),
        webinar_title: webinar.t,
        webinar_date: webinar.datetime || new Date(Date.now() + 86400000).toISOString(),
      });
      addToast('success', `"${webinar.t}" added to your schedule!`);
      loadUpcoming();
    } catch (e) {
      addToast('error', 'Could not save. Try again.');
    }
  };

  const getCalendarColor = (dateStr) => {
    const count = activityByDate[dateStr] || 0;
    if (count === 0) return null;
    if (count <= 2) return '#BBF7D0';
    if (count <= 5) return '#4ADE80';
    return '#16A34A';
  };

  const pct = (actual, target) => target > 0 ? Math.min(100, Math.round((actual / target) * 100)) : 0;

  const getDayType = (d) => {
    if (d === today.getDate()) return 'today';
    return 'empty';
  };

  const todayStr = today.toISOString().split('T')[0];

  return (
    <div className="page">
      <div className="ph">
        <div className="pt">📅 My Activity</div>
        <div className="ps">Learning goals, schedules & calendar</div>
      </div>
      <div className="sg4">
        {[
          { l: 'Active Days', v: Object.keys(activityByDate).length || '—', i: '🔥', c: 'rose' },
          { l: 'Books Read', v: activityFeed.filter(a => a.activity_type === 'article_read').length || '—', i: '📖', c: 'teal' },
          { l: 'Quizzes Done', v: activityFeed.filter(a => a.activity_type?.startsWith('quiz')).length || '—', i: '📝', c: 'violet' },
          { l: 'Hours Logged', v: totalHours > 0 ? `${totalHours}h` : '—', i: '⏱', c: 'amber' },
        ].map((s, i) => (
          <div key={i} className={`stat ${s.c} fu`} style={{ animationDelay: `${i * 0.07}s` }}>
            <div className="stat-ic">{s.i}</div>
            <div className="stat-v">{s.v}</div>
            <div className="stat-l">{s.l}</div>
          </div>
        ))}
      </div>

      <div className="grid2">
        <div className="card">
          <div className="ct" style={{ marginBottom: 6 }}>Activity Calendar</div>
          <div className="cs" style={{ marginBottom: 12 }}>{today.toLocaleString('default', { month: 'long', year: 'numeric' })}</div>
          <div style={{ display: 'flex', gap: 4, marginBottom: 6 }}>
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
              <div key={i} style={{ flex: 1, textAlign: 'center', fontSize: 9, fontWeight: 700, color: '#6B7280', fontFamily: 'Inter,sans-serif' }}>{d}</div>
            ))}
          </div>
          <div className="cal">
            {Array.from({ length: dim }, (_, i) => i + 1).map(d => {
              const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
              const calColor = getCalendarColor(dateStr);
              const dayType = getDayType(d);
              return (
                <div
                  key={d}
                  className={`cd ${dayType}`}
                  style={calColor ? { background: calColor, borderRadius: 6, cursor: 'pointer' } : {}}
                  onClick={() => setSelDay(d)}
                >
                  {d}
                </div>
              );
            })}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 12, fontSize: 10, color: '#6B7280' }}>
            {[['#BBF7D0', '1–2 activities'], ['#4ADE80', '3–5 activities'], ['#16A34A', '6+ activities'], ['#EFF6FF', 'Webinar'], ['#F3F4F6', 'No Activity']].map(([bg, l]) => (
              <span key={l} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 10, height: 10, borderRadius: 3, background: bg, display: 'inline-block' }} />{l}
              </span>
            ))}
          </div>
          {selDay && (
            <div style={{ marginTop: 12, background: '#EFF6FF', borderRadius: 10, padding: '10px 12px', fontSize: 12, color: '#1D4ED8' }}>
              <strong>Day {selDay}:</strong>{' '}
              {(() => {
                const ds = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(selDay).padStart(2, '0')}`;
                const cnt = activityByDate[ds] || 0;
                return cnt > 0 ? `✅ ${cnt} activit${cnt === 1 ? 'y' : 'ies'} recorded.`
                  : 'No activity recorded.';
              })()}
            </div>
          )}
        </div>

        <div className="card">
          <div className="ct" style={{ marginBottom: 14 }}>📊 Weekly Progress</div>
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d, i) => {
            const hrs = weeklyHours[i];
            const maxHrs = Math.max(...weeklyHours, 1);
            return (
              <div key={d} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 9 }}>
                <div style={{ width: 28, fontSize: 11, fontWeight: 600, color: '#6B7280' }}>{d}</div>
                <div className="pb" style={{ flex: 1 }}><div className="pf" style={{ width: `${(hrs / maxHrs) * 100}%` }} /></div>
                <div style={{ fontSize: 11, color: '#6B7280', width: 32, textAlign: 'right' }}>{hrs > 0 ? `${hrs}h` : '—'}</div>
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
              <span style={{ fontSize: 12, fontWeight: 500 }}>Articles/notes per week</span>
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

      {/* Engagement history feed */}
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

      {/* Upcoming webinars */}
      {/* Study Insights — generated from activity_logs */}
      {activityFeed.length > 0 && (() => {
        const quizzes = activityFeed.filter(a => a.activity_type?.startsWith('quiz'));
        const reads = activityFeed.filter(a => a.activity_type === 'article_read');
        const lastActivity = activityFeed[0]?.created_at ? new Date(activityFeed[0].created_at) : null;
        const daysSinceLast = lastActivity ? Math.floor((Date.now() - lastActivity) / 86400000) : null;
        const insights = [];

        if (reads.length === 0) insights.push({ icon: '📚', text: 'You haven\'t read any e-books yet this month. Start with a short article to build your streak!', color: '#EFF6FF', textColor: '#1D4ED8' });
        if (quizzes.length === 0) insights.push({ icon: '📝', text: 'Try the Exam Prep section — practice MCQs are one of the best ways to retain what you\'ve read.', color: '#F0FDF4', textColor: '#15803D' });
        if (daysSinceLast !== null && daysSinceLast >= 3) insights.push({ icon: '🔥', text: `It's been ${daysSinceLast} days since your last activity. A 10-minute reading session today can restart your streak!`, color: '#FFFBEB', textColor: '#92400E' });
        if (reads.length >= 5 && quizzes.length === 0) insights.push({ icon: '💡', text: 'Great reading habit! Combine it with quizzes to maximise retention. Head to Exam Prep.', color: '#EDE9FE', textColor: '#5B21B6' });
        if (quizzes.length >= 3 && reads.length < 2) insights.push({ icon: '📖', text: 'You\'re doing well on quizzes! Supplement with e-book reading to deepen conceptual understanding.', color: '#EFF6FF', textColor: '#1D4ED8' });

        if (insights.length === 0) return null;
        return (
          <div className="card mt4" style={{ marginBottom: 20 }}>
            <div className="ct" style={{ marginBottom: 12 }}>💡 Study Insights</div>
            <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 12 }}>Personalised tips based on your activity</div>
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

      <div className="card mt4">
        <div className="ct" style={{ marginBottom: 14 }}>📅 My Upcoming Webinars</div>
        {upcoming.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '20px 0', color: '#9CA3AF', fontSize: 13 }}>
            No upcoming webinars. Register from the Conferences page.
          </div>
        ) : upcoming.map(w => (
          <div key={w.id} style={{ padding: '10px 16px', background: '#EEF2FF', borderRadius: 10, marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 13 }}>{w.webinar_title}</div>
              <div style={{ fontSize: 11, color: '#6B7280', marginTop: 2 }}>
                {w.webinar_date ? new Date(w.webinar_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'TBD'}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
