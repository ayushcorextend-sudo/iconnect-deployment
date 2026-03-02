import Avatar from './Avatar';
import { LB_DATA } from '../data/constants';

export default function DoctorDashboard({ artifacts = [], notifications = [], setPage, userName }) {
  const approved = artifacts.filter(a => a.status === 'approved');
  const pending = artifacts.filter(a => a.status === 'pending');
  const unread = notifications.filter(n => n.unread).length;
  const me = LB_DATA.find(l => l.isMe);

  return (
    <div className="page">
      <div className="ph">
        <div className="pt">Welcome back, {userName || 'Doctor'}! 👋</div>
        <div className="ps">Keep up the great work — you&apos;re ranked <strong style={{ color: '#2563EB' }}>#4</strong> this month</div>
      </div>
      <div className="sg4">
        {[
          { l: 'Books Read', v: '14', i: '📖', c: 'teal' },
          { l: 'My Rank', v: `#${me?.id || 4}`, i: '🏆', c: 'amber' },
          { l: 'Total Score', v: (me?.score || 8750).toLocaleString(), i: '⭐', c: 'violet' },
          { l: 'Unread Alerts', v: unread, i: '🔔', c: 'rose' },
        ].map((s, i) => (
          <div key={i} className={`stat ${s.c} fu`} style={{ animationDelay: `${i * 0.07}s` }}>
            <div className="stat-ic">{s.i}</div>
            <div className="stat-v">{s.v}</div>
            <div className="stat-l">{s.l}</div>
          </div>
        ))}
      </div>

      <div className="card mt4" style={{ marginBottom: 20, background: 'linear-gradient(135deg,#111827,#1F2937)', color: 'white' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 14 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: 'Inter,sans-serif', fontWeight: 800, fontSize: 15 }}>📊 Academic Progress Score</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,.5)', marginTop: 2 }}>Based on reading, quizzes, notes & research</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontFamily: 'Inter,sans-serif', fontSize: 26, fontWeight: 800, color: '#2563EB' }}>8,750</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,.4)' }}>total points</div>
          </div>
        </div>
        <div className="score-seg">
          {[{ w: 37, c: '#2563EB' }, { w: 34, c: '#7C6FF7' }, { w: 15, c: '#FFB347' }, { w: 14, c: '#38BDF8' }].map((s, i) => (
            <div key={i} className="seg-part" style={{ width: `${s.w}%`, background: s.c }} />
          ))}
        </div>
        <div style={{ display: 'flex', gap: 16, marginTop: 8, flexWrap: 'wrap' }}>
          {[['🟢', 'Quiz', '3,200 pts'], ['🟣', 'Reading', '2,950 pts'], ['🟡', 'Notes', '1,300 pts'], ['🔵', 'Research', '1,300 pts']].map(([c, l, v]) => (
            <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'rgba(255,255,255,.6)' }}>
              <span>{c}</span>{l}: <strong style={{ color: 'white' }}>{v}</strong>
            </div>
          ))}
        </div>
      </div>

      <div className="grid2">
        <div className="card">
          <div className="ch">
            <div className="ct">📚 E-Book Library</div>
            <button className="btn btn-s btn-sm" onClick={() => setPage('ebooks')}>View All</button>
          </div>
          {approved.slice(0, 3).map(a => (
            <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderBottom: '1px solid #F9FAFB' }}>
              <span style={{ fontSize: 22 }}>{a.emoji}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{a.title}</div>
                <div style={{ fontSize: 11, color: '#6B7280' }}>{a.subject} · {a.pages}pg</div>
              </div>
              <span className="bdg bg-g">Available</span>
            </div>
          ))}
          {pending.length > 0 && (
            <div style={{ marginTop: 10, padding: '8px 10px', background: '#FFFBEB', borderRadius: 10, fontSize: 12, color: '#92400E', fontWeight: 600 }}>
              ⏳ {pending.length} new book{pending.length > 1 ? 's' : ''} pending verification — visible below
            </div>
          )}
        </div>

        <div className="card">
          <div className="ch">
            <div className="ct">🏆 Leaderboard</div>
            <button className="btn btn-s btn-sm" onClick={() => setPage('leaderboard')}>Full Board</button>
          </div>
          {LB_DATA.slice(0, 4).map((l, i) => (
            <div key={l.id} className={`lb-row ${l.isMe ? 'me' : ''}`}>
              <div className="lb-pos" style={{ color: i < 3 ? ['#FFD700', '#C0C0C0', '#CD7F32'][i] : '#6B7280' }}>{i + 1}</div>
              <Avatar name={l.name} size={28} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: l.isMe ? 700 : 500 }}>{l.name}{l.isMe ? ' 👈' : ''}</div>
                <div style={{ fontSize: 11, color: '#6B7280' }}>{l.speciality}</div>
              </div>
              <div style={{ fontFamily: 'Inter,sans-serif', fontSize: 13, fontWeight: 800, color: '#2563EB' }}>{l.score.toLocaleString()}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="card mt4">
        <div className="ch">
          <div className="ct">🔔 Recent Notifications</div>
          <button className="btn btn-s btn-sm" onClick={() => setPage('notifications')}>View All</button>
        </div>
        {notifications.slice(0, 3).map(n => (
          <div key={n.id} className={`ni ${n.unread ? 'unr' : ''}`}>
            <div className="ni-ic" style={{ background: '#F9FAFB' }}>{n.icon}</div>
            <div>
              <div className="ni-t">{n.title}</div>
              <div className="ni-b">{n.body}</div>
              <div className="ni-time">{n.time} · via {n.channel}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
