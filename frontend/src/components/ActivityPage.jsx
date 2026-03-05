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
  const [activityFeed, setActivityFeed] = useState([]);
  const [quizTarget, setQuizTarget] = useState(5);
  const [readTarget, setReadTarget] = useState(7);
  const [quizProgress, setQuizProgress] = useState(0);
  const [readProgress, setReadProgress] = useState(0);
  const [upcoming, setUpcoming] = useState([]);

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

        // Calendar: group activity logs by date
        const { data: logs } = await supabase
          .from('activity_logs')
          .select('created_at')
          .eq('user_id', uid);
        const map = (logs || []).reduce((acc, log) => {
          const d = log.created_at.split('T')[0];
          acc[d] = (acc[d] || 0) + 1;
          return acc;
        }, {});
        setActivityByDate(map);

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

  // Build day type for fallback (keep existing event days for display)
  const eventDays = [7, 14, 21, 28];
  const getDayType = (d) => {
    if (d === today.getDate()) return 'today';
    if (eventDays.includes(d)) return 'event';
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
          { l: 'Hours Logged', v: '—', i: '⏱', c: 'amber' },
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
                  : eventDays.includes(selDay) ? '📅 CME Webinar scheduled.'
                    : 'No activity recorded.';
              })()}
            </div>
          )}
        </div>

        <div className="card">
          <div className="ct" style={{ marginBottom: 14 }}>📊 Weekly Progress</div>
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d, i) => {
            const hrs = [3, 5, 2, 4, 6, 1, 2][i];
            return (
              <div key={d} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 9 }}>
                <div style={{ width: 28, fontSize: 11, fontWeight: 600, color: '#6B7280' }}>{d}</div>
                <div className="pb" style={{ flex: 1 }}><div className="pf" style={{ width: `${hrs * 14}%` }} /></div>
                <div style={{ fontSize: 11, color: '#6B7280', width: 28, textAlign: 'right' }}>{hrs}h</div>
              </div>
            );
          })}
          <div className="divider" />
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 12, color: '#6B7280' }}>Total this week</span>
            <span style={{ fontFamily: 'Inter,sans-serif', fontWeight: 700, color: '#2563EB' }}>23 hours</span>
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
      <div className="card mt4">
        <div className="ct" style={{ marginBottom: 14 }}>📅 Upcoming Scheduled Events</div>
        {[
          { id: 1, t: 'CME Webinar: Cardiology Advances', d: 'Tomorrow, 6PM', l: 'Live · Zoom', c: 'violet', datetime: new Date(Date.now() + 86400000).toISOString() },
          { id: 2, t: 'NEET-PG Mock Test #5', d: 'Fri, 10AM', l: 'Online · 3 hrs', c: 'rose', datetime: new Date(Date.now() + 3 * 86400000).toISOString() },
          { id: 3, t: 'Study Group: Pharmacology', d: 'Next Mon, 7PM', l: 'In-App', c: 'teal', datetime: new Date(Date.now() + 7 * 86400000).toISOString() },
        ].map((e, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid #F9FAFB' }}>
            <div style={{ width: 46, height: 46, borderRadius: 10, background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>📅</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{e.t}</div>
              <div style={{ fontSize: 11, color: '#6B7280' }}>{e.d} · {e.l}</div>
            </div>
            <button className="btn btn-s btn-sm" onClick={() => handleAddToCalendar(e)}>Add to Calendar</button>
          </div>
        ))}

        {upcoming.length > 0 && (
          <div style={{ marginTop: 20 }}>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 10, color: '#374151' }}>📅 My Upcoming Webinars</div>
            {upcoming.map(w => (
              <div key={w.id} style={{ padding: '10px 16px', background: '#EEF2FF', borderRadius: 10, marginBottom: 8, display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 500, fontSize: 13 }}>{w.webinar_title}</span>
                <span style={{ fontSize: 13, color: '#6B7280' }}>
                  {w.webinar_date ? new Date(w.webinar_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'TBD'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
