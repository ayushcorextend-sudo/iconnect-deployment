import { useState, useEffect } from 'react';
import Avatar from './Avatar';
import { LB_DATA } from '../data/constants';
import { supabase } from '../lib/supabase';

export default function LeaderboardPage() {
  const [period, setPeriod] = useState('monthly');
  const [tab, setTab] = useState('global');
  const [leaderboard, setLeaderboard] = useState(LB_DATA);
  const [loading, setLoading] = useState(true);
  const [myUserId, setMyUserId] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        const { data: authData } = await supabase.auth.getUser();
        setMyUserId(authData?.user?.id || null);

        const { data, error } = await supabase
          .from('user_scores')
          .select('user_id, total_score, quiz_score, reading_score')
          .order('total_score', { ascending: false })
          .limit(50);

        if (error || !data || data.length === 0) {
          setLoading(false);
          return;
        }

        const userIds = data.map(d => d.user_id);
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, name, full_name, specialty, speciality, college, place_of_study')
          .in('id', userIds);

        const profileMap = (profiles || []).reduce((acc, p) => {
          acc[p.id] = p;
          return acc;
        }, {});

        const mapped = data.map((row) => {
          const p = profileMap[row.user_id] || {};
          return {
            id: row.user_id,
            name: p.full_name || p.name || 'Anonymous',
            college: p.college || p.place_of_study || '—',
            speciality: p.specialty || p.speciality || '—',
            score: row.total_score,
            quizPts: row.quiz_score,
            readPts: row.reading_score,
            notesPts: 0,
            resPts: 0,
            isMe: row.user_id === authData?.user?.id,
          };
        });

        setLeaderboard(mapped);
      } catch (e) {
        console.warn('Leaderboard fetch failed, using fallback:', e.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const me = leaderboard.find(l => l.isMe) || leaderboard.find(l => l.isMe === undefined && LB_DATA.find(d => d.isMe && d.name === l.name)) || LB_DATA.find(l => l.isMe);
  const myRank = leaderboard.findIndex(l => l.isMe) + 1 || 4;

  const top3 = leaderboard.slice(0, 3);
  const podOrd = top3.length >= 3 ? [top3[1], top3[0], top3[2]] : top3;
  const podH = [100, 132, 82];
  const podC = ['#C0C0C0', '#FFD700', '#CD7F32'];
  const podR = [2, 1, 3];

  const SkeletonRow = () => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 6, marginBottom: 4 }}>
      <div style={{ width: 22, height: 16, background: '#F3F4F6', borderRadius: 4 }} />
      <div style={{ width: 34, height: 34, background: '#F3F4F6', borderRadius: '50%' }} />
      <div style={{ flex: 1 }}>
        <div style={{ width: '60%', height: 13, background: '#F3F4F6', borderRadius: 4, marginBottom: 6 }} />
        <div style={{ width: '40%', height: 11, background: '#F3F4F6', borderRadius: 4 }} />
      </div>
      <div style={{ width: 60, height: 15, background: '#F3F4F6', borderRadius: 4 }} />
    </div>
  );

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
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(37,99,235,.2)', border: '3px solid #2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter,sans-serif', fontSize: 22, fontWeight: 800, color: '#2563EB' }}>#{myRank}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: 'Inter,sans-serif', fontWeight: 800, fontSize: 17 }}>{me?.name || 'Your Rank'} — Your Rank</div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,.5)', marginTop: 2 }}>{me?.college || '—'} · {me?.speciality || '—'}</div>
            <div style={{ display: 'flex', gap: 12, marginTop: 10, flexWrap: 'wrap' }}>
              {[['🟢', 'Quiz', me?.quizPts || 0], ['🟣', 'Reading', me?.readPts || 0], ['🟡', 'Notes', me?.notesPts || 0], ['🔵', 'Research', me?.resPts || 0]].map(([ic, l, v]) => (
                <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
                  <span>{ic}</span><span style={{ color: 'rgba(255,255,255,.5)' }}>{l}:</span>
                  <span style={{ fontWeight: 700, color: 'white' }}>{v.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontFamily: 'Inter,sans-serif', fontSize: 32, fontWeight: 800, color: '#2563EB' }}>{(me?.score || 0).toLocaleString()}</div>
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

      {top3.length >= 3 && (
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
      )}

      <div className="card">
        <div className="ct" style={{ marginBottom: 14 }}>Full Rankings</div>
        {loading ? (
          [1,2,3,4,5].map(i => <SkeletonRow key={i} />)
        ) : leaderboard.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px 0', color: '#9CA3AF', fontSize: 14 }}>
            No scores yet — start taking quizzes and reading articles!
          </div>
        ) : (
          leaderboard.map((l, i) => (
            <div key={l.id} className={`lb-row ${l.isMe ? 'me' : ''}`}
              style={l.isMe ? { background: 'rgba(79,70,229,0.08)', border: '1px solid #4F46E5', borderRadius: 8 } : {}}>
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
          ))
        )}
      </div>
    </div>
  );
}
