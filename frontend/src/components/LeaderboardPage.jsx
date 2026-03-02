import { useState } from 'react';
import Avatar from './Avatar';
import { LB_DATA } from '../data/constants';

export default function LeaderboardPage() {
  const [period, setPeriod] = useState('monthly');
  const [tab, setTab] = useState('global');

  const top3 = LB_DATA.slice(0, 3);
  const podOrd = [top3[1], top3[0], top3[2]];
  const podH = [100, 132, 82];
  const podC = ['#C0C0C0', '#FFD700', '#CD7F32'];
  const podR = [2, 1, 3];
  const me = LB_DATA.find(l => l.isMe);

  return (
    <div className="page">
      <div className="ph-row ph">
        <div>
          <div className="pt">🏆 My Leaderboard</div>
          <div className="ps">Academic progress ranking — not just gamification</div>
        </div>
        <div className="tabs" style={{ margin: 0 }}>
          {['weekly', 'monthly', 'alltime'].map(p => (
            <button key={p} className={`tab ${period === p ? 'act' : ''}`} onClick={() => setPeriod(p)}>
              {p === 'alltime' ? 'All Time' : p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="card" style={{ background: 'linear-gradient(135deg,#111827,#1F2937)', color: 'white', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(37,99,235,.2)', border: '3px solid #2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter,sans-serif', fontSize: 22, fontWeight: 800, color: '#2563EB' }}>#4</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: 'Inter,sans-serif', fontWeight: 800, fontSize: 17 }}>Dr. Sneha Verma — Your Rank</div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,.5)', marginTop: 2 }}>PGIMER · Internal Medicine · MD 2nd Year</div>
            <div style={{ display: 'flex', gap: 12, marginTop: 10, flexWrap: 'wrap' }}>
              {[['🟢', 'Quiz', me.quizPts], ['🟣', 'Reading', me.readPts], ['🟡', 'Notes', me.notesPts], ['🔵', 'Research', me.resPts]].map(([ic, l, v]) => (
                <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
                  <span>{ic}</span><span style={{ color: 'rgba(255,255,255,.5)' }}>{l}:</span>
                  <span style={{ fontWeight: 700, color: 'white' }}>{v.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontFamily: 'Inter,sans-serif', fontSize: 32, fontWeight: 800, color: '#2563EB' }}>{me.score.toLocaleString()}</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,.4)' }}>total pts</div>
            <div style={{ fontSize: 11, color: '#2563EB', marginTop: 4 }}>↑ +3 positions this month</div>
          </div>
        </div>
        <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}>
          {[['📚', 'Books Read', '6'], ['📝', 'Quizzes', '23'], ['📋', 'Notes', '14'], ['🔬', 'Research', '8']].map(([i, l, v]) => (
            <div key={l} style={{ background: 'rgba(255,255,255,.07)', borderRadius: 10, padding: '10px', textAlign: 'center' }}>
              <div style={{ fontSize: 20 }}>{i}</div>
              <div style={{ fontFamily: 'Inter,sans-serif', fontSize: 16, fontWeight: 800, color: '#2563EB', margin: '4px 0 2px' }}>{v}</div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,.4)', fontFamily: 'Inter,sans-serif', fontWeight: 600 }}>{l}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="tabs">
        {[['global', '🌐 Global'], ['speciality', '🩺 My Speciality'], ['college', '🏥 My College']].map(([k, l]) => (
          <button key={k} className={`tab ${tab === k ? 'act' : ''}`} onClick={() => setTab(k)}>{l}</button>
        ))}
      </div>

      <div className="card" style={{ background: 'linear-gradient(135deg,#111827,#1F2937)', marginBottom: 20 }}>
        <div style={{ textAlign: 'center', marginBottom: 8, fontSize: 11, color: 'rgba(255,255,255,.35)', fontFamily: 'Inter,sans-serif', letterSpacing: '1px', textTransform: 'uppercase' }}>Top 3 Performers</div>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 16 }}>
          {podOrd.map((l, i) => (
            <div key={l.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              {podR[i] === 1 && <span style={{ fontSize: 20 }}>👑</span>}
              <div style={{ position: 'relative' }}>
                <Avatar name={l.name} size={podR[i] === 1 ? 52 : 42} style={{ border: `3px solid ${podC[i]}` }} />
                <div style={{ position: 'absolute', bottom: -4, right: -4, width: 18, height: 18, borderRadius: '50%', background: podC[i], color: '#222', fontSize: 9, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid white', fontFamily: 'Inter,sans-serif' }}>{podR[i]}</div>
              </div>
              <div style={{ fontFamily: 'Inter,sans-serif', fontSize: 13, fontWeight: 800, color: 'white' }}>{l.score.toLocaleString()}</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,.5)', textAlign: 'center', maxWidth: 72 }}>{l.name.split(' ').slice(-1)}</div>
              <div style={{ height: podH[i], width: 66, borderRadius: '8px 8px 0 0', background: `${podC[i]}22`, border: `1px solid ${podC[i]}44`, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', paddingBottom: 6, color: podC[i], fontSize: 11, fontFamily: 'Inter,sans-serif', fontWeight: 700 }}>#{podR[i]}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <div className="ct" style={{ marginBottom: 14 }}>Full Rankings</div>
        {LB_DATA.map((l, i) => (
          <div key={l.id} className={`lb-row ${l.isMe ? 'me' : ''}`}>
            <div className="lb-pos" style={{ color: i < 3 ? ['#FFD700', '#C0C0C0', '#CD7F32'][i] : '#6B7280' }}>{i + 1}</div>
            <Avatar name={l.name} size={34} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{l.name}{l.isMe ? ' (You)' : ''}</div>
              <div style={{ fontSize: 11, color: '#6B7280' }}>{l.college} · {l.speciality}</div>
              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                {[['🟢', l.quizPts], ['🟣', l.readPts]].map(([c, v]) => (
                  <span key={c} style={{ fontSize: 10, color: '#6B7280' }}>{c} {v.toLocaleString()}</span>
                ))}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontFamily: 'Inter,sans-serif', fontSize: 15, fontWeight: 800, color: '#2563EB' }}>{l.score.toLocaleString()}</div>
              <div style={{ fontSize: 10, color: '#6B7280' }}>pts</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
