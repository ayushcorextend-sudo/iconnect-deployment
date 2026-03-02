import { useState } from 'react';

export default function ActivityPage({ addToast }) {
  const today = new Date();
  const dim = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const actDays = [2, 5, 6, 8, 10, 12, 14, 15, 16, 18, 20, 22, 24, 25];
  const eventDays = [7, 14, 21, 28];
  const targetDays = [3, 10, 17, 24];
  const [selDay, setSelDay] = useState(null);

  const getDayType = d => {
    if (d === today.getDate()) return 'today';
    if (eventDays.includes(d)) return 'event';
    if (targetDays.includes(d)) return 'target';
    if (actDays.includes(d)) return 'act';
    return 'empty';
  };

  return (
    <div className="page">
      <div className="ph">
        <div className="pt">📅 My Activity</div>
        <div className="ps">Learning goals, schedules & calendar</div>
      </div>
      <div className="sg4">
        {[
          { l: 'Active Days', v: '14', i: '🔥', c: 'rose' },
          { l: 'Books Read', v: '6', i: '📖', c: 'teal' },
          { l: 'Quizzes Done', v: '23', i: '📝', c: 'violet' },
          { l: 'Hours Logged', v: '42h', i: '⏱', c: 'amber' },
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
            {Array.from({ length: dim }, (_, i) => i + 1).map(d => (
              <div key={d} className={`cd ${getDayType(d)}`} onClick={() => setSelDay(d)}>{d}</div>
            ))}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 12, fontSize: 10, color: '#6B7280' }}>
            {[['#2563EB', 'Active'], ['#F5F3FF', 'Webinar'], ['#FFFBEB', 'Target'], ['#F3F4F6', 'No Activity']].map(([bg, l]) => (
              <span key={l} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 10, height: 10, borderRadius: 3, background: bg, display: 'inline-block' }} />{l}
              </span>
            ))}
          </div>
          {selDay && (
            <div style={{ marginTop: 12, background: '#EFF6FF', borderRadius: 10, padding: '10px 12px', fontSize: 12, color: '#1D4ED8' }}>
              <strong>Day {selDay}:</strong>{' '}
              {actDays.includes(selDay) ? '✅ You were active this day.'
                : eventDays.includes(selDay) ? '📅 CME Webinar scheduled.'
                  : targetDays.includes(selDay) ? '🎯 Learning target set.'
                    : 'No activity recorded.'}
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
          {[['Read 3 chapters/week', '2/3', 67], ['Complete 1 quiz/day', '5/7', 71], ['30-min research session', '3/5', 60]].map(([g, p, pct]) => (
            <div key={g} style={{ marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                <span style={{ fontSize: 12 }}>{g}</span>
                <span style={{ fontSize: 11, color: '#6B7280' }}>{p}</span>
              </div>
              <div className="pb"><div className="pf" style={{ width: `${pct}%` }} /></div>
            </div>
          ))}
        </div>
      </div>

      <div className="card mt4">
        <div className="ch"><div className="ct">📚 Recent Activity Log</div></div>
        {[
          { i: '📗', a: 'Read', it: "Harrison's — Chapter 12: Cardiology", t: '2 hours ago', pts: '+50' },
          { i: '📝', a: 'Quiz', it: 'Cardiology MCQ Set B — 18/20 correct', t: 'Yesterday', pts: '+90' },
          { i: '🎯', a: 'Target', it: 'Weekly Reading Target completed — 3/3 chapters', t: '2 days ago', pts: '+200' },
          { i: '🏆', a: 'Achievement', it: '7-day learning streak unlocked! 🔥', t: '3 days ago', pts: '+500' },
          { i: '📅', a: 'Webinar', it: 'Attended: AIIMS CME — Advances in Neurology', t: 'Last week', pts: '+150' },
        ].map((a, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid #F9FAFB' }}>
            <span style={{ fontSize: 22 }}>{a.i}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{a.a}: <span style={{ fontWeight: 400 }}>{a.it}</span></div>
              <div style={{ fontSize: 11, color: '#6B7280', marginTop: 2 }}>{a.t}</div>
            </div>
            <span className="bdg bg-g">{a.pts} pts</span>
          </div>
        ))}
      </div>

      <div className="card mt4">
        <div className="ct" style={{ marginBottom: 14 }}>📅 Upcoming Scheduled Events</div>
        {[
          { d: 'Tomorrow, 6PM', t: 'CME Webinar: Cardiology Advances', l: 'Live · Zoom', c: 'violet' },
          { d: 'Fri, 10AM', t: 'NEET-PG Mock Test #5', l: 'Online · 3 hrs', c: 'rose' },
          { d: 'Next Mon, 7PM', t: 'Study Group: Pharmacology', l: 'In-App', c: 'teal' },
        ].map((e, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid #F9FAFB' }}>
            <div style={{ width: 46, height: 46, borderRadius: 10, background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>📅</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{e.t}</div>
              <div style={{ fontSize: 11, color: '#6B7280' }}>{e.d} · {e.l}</div>
            </div>
            <button className="btn btn-s btn-sm" onClick={() => addToast('success', `"${e.t}" added to your calendar!`)}>Add to Calendar</button>
          </div>
        ))}
      </div>
    </div>
  );
}
