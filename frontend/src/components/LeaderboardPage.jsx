import { useState, useEffect, useMemo, useRef } from 'react';
import Avatar from './Avatar';
import { supabase } from '../lib/supabase';
import { getCached, setCached } from '../lib/dataCache';

const PAGE_SIZE = 20;

function calculateStreak(logs) {
  const dates = new Set((logs || []).map(l => l.created_at.split('T')[0]));
  let streak = 0;
  const today = new Date();
  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const iso = d.toISOString().split('T')[0];
    if (dates.has(iso)) streak++;
    else if (i > 0) break;
  }
  return streak;
}

export default function LeaderboardPage({ setPage }) {
  const [period, setPeriod] = useState('alltime');
  const [tab, setTab] = useState('global');
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [myUserId, setMyUserId] = useState(null);
  const [myProfile, setMyProfile] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [myStreak, setMyStreak] = useState(0);
  const myRowRef = useRef(null);

  useEffect(() => {
    async function load() {
      // ── Stale-while-revalidate: show cached data instantly ──────────────
      const cacheKey = `lb_${period}`;
      const cached = getCached(cacheKey);
      if (cached) {
        setLeaderboard(cached.leaderboard);
        setMyProfile(cached.myProfile);
        setMyUserId(cached.myUserId);
        setLoading(false); // no skeleton flash on repeat visits
      } else {
        setLoading(true);
      }

      try {
        const { data: authData } = await supabase.auth.getUser();
        const uid = authData?.user?.id || null;
        setMyUserId(uid);

        let myProfileData = null;
        if (uid) {
          const [mpRes, streakRes] = await Promise.all([
            supabase.from('profiles').select('speciality, college').eq('id', uid).maybeSingle(),
            supabase.from('activity_logs').select('created_at').eq('user_id', uid).gte('created_at', new Date(Date.now() - 365 * 86400000).toISOString()),
          ]);
          myProfileData = mpRes.data || null;
          setMyProfile(myProfileData);
          setMyStreak(calculateStreak(streakRes.data || []));
        }

        let scoreData = [];

        if (period === 'alltime') {
          const { data, error } = await supabase
            .from('user_scores')
            .select('user_id, total_score, quiz_score, reading_score')
            .order('total_score', { ascending: false })
            .limit(50);
          if (!error && data) {
            scoreData = data.map(d => ({
              user_id: d.user_id,
              score: d.total_score || 0,
              quizPts: d.quiz_score || 0,
              readPts: d.reading_score || 0,
            }));
          }
        } else {
          const days = period === 'weekly' ? 7 : 30;
          const since = new Date(Date.now() - days * 86400000).toISOString();
          const { data: logs } = await supabase
            .from('activity_logs')
            .select('user_id, score_delta, activity_type')
            .gte('created_at', since);

          const agg = {};
          (logs || []).forEach(log => {
            if (!agg[log.user_id]) agg[log.user_id] = { score: 0, quizPts: 0, readPts: 0 };
            const delta = log.score_delta || 0;
            agg[log.user_id].score += delta;
            if (log.activity_type?.startsWith('quiz')) agg[log.user_id].quizPts += delta;
            if (log.activity_type === 'article_read') agg[log.user_id].readPts += delta;
          });
          scoreData = Object.entries(agg)
            .map(([user_id, s]) => ({ user_id, ...s }))
            .filter(d => d.score > 0)
            .sort((a, b) => b.score - a.score)
            .slice(0, 50);
        }

        if (scoreData.length === 0) {
          setLeaderboard([]);
          setLoading(false);
          return;
        }

        const userIds = scoreData.map(d => d.user_id);
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, name, speciality, college')
          .in('id', userIds);

        const profileMap = (profiles || []).reduce((acc, p) => {
          acc[p.id] = p; return acc;
        }, {});

        const mapped = scoreData.map(row => {
          const p = profileMap[row.user_id] || {};
          return {
            id: row.user_id,
            name: p.name || 'Anonymous',
            college: p.college || '—',
            speciality: p.speciality || '—',
            score: row.score,
            quizPts: row.quizPts,
            readPts: row.readPts,
            isMe: row.user_id === uid,
          };
        });

        setLeaderboard(mapped);
        // Update cache for next visit (2-min TTL)
        setCached(`lb_${period}`, { leaderboard: mapped, myProfile: myProfileData, myUserId: uid });
      } catch (e) {
        console.warn('Leaderboard fetch failed:', e.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [period]);

  useEffect(() => setCurrentPage(1), [period, tab]);

  const displayedLeaderboard = useMemo(() => {
    if (tab === 'speciality') {
      const mySpec = myProfile?.speciality;
      if (mySpec) return leaderboard.filter(l => l.speciality === mySpec);
    }
    if (tab === 'college') {
      const myCollege = myProfile?.college;
      if (myCollege) return leaderboard.filter(l => l.college === myCollege);
    }
    return leaderboard;
  }, [leaderboard, tab, myProfile]);

  const myRankIdx = leaderboard.findIndex(l => l.isMe);
  const myRank = myRankIdx >= 0 ? myRankIdx + 1 : null;
  const me = leaderboard.find(l => l.isMe);
  const totalPages = Math.ceil(displayedLeaderboard.length / PAGE_SIZE);
  const pagedList = displayedLeaderboard.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const myPage = myRankIdx >= 0 ? Math.ceil((myRankIdx + 1) / PAGE_SIZE) : null;

  function jumpToMyRank() {
    if (myPage && myPage !== currentPage) { setCurrentPage(myPage); return; }
    myRowRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  const top3 = displayedLeaderboard.slice(0, 3);
  const podOrd = top3.length >= 3 ? [top3[1], top3[0], top3[2]] : top3;
  const podH = [100, 140, 80];
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
    <div className="page" style={{ paddingBottom: me ? 80 : 0 }}>
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

      <div className="tabs">
        {[['global', '🌐 Global'], ['speciality', '🩺 My Speciality'], ['college', '🏥 My College']].map(([k, l]) => (
          <button key={k} className={`tab ${tab === k ? 'act' : ''}`} onClick={() => setTab(k)}>{l}</button>
        ))}
      </div>

      {/* Top 3 Podium */}
      {top3.length >= 3 && (
        <div className="card" style={{ background: 'linear-gradient(135deg,#111827,#1F2937)', marginBottom: 20 }}>
          <div style={{ textAlign: 'center', marginBottom: 12, fontSize: 11, color: 'rgba(255,255,255,.35)', fontFamily: 'Inter,sans-serif', letterSpacing: '1px', textTransform: 'uppercase' }}>
            Top 3 Performers
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 16 }}>
            {podOrd.map((l, i) => (
              <div key={l.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                {podR[i] === 1 && <span style={{ fontSize: 22 }}>👑</span>}
                <div style={{ position: 'relative' }}>
                  <Avatar name={l.name} size={podR[i] === 1 ? 56 : 44} style={{ border: `3px solid ${podC[i]}` }} />
                  <div style={{
                    position: 'absolute', bottom: -4, right: -4,
                    width: 20, height: 20, borderRadius: '50%',
                    background: podC[i], color: '#222', fontSize: 9, fontWeight: 800,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    border: '2px solid white', fontFamily: 'Inter,sans-serif',
                  }}>
                    {podR[i]}
                  </div>
                </div>
                <div style={{ fontFamily: 'Inter,sans-serif', fontSize: 14, fontWeight: 800, color: podC[i] }}>
                  {l.score.toLocaleString()}
                </div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,.6)', textAlign: 'center', maxWidth: 80, wordBreak: 'break-word' }}>
                  {l.name.split(' ').slice(-1)[0]}
                </div>
                <div style={{
                  height: podH[i], width: 72, borderRadius: '8px 8px 0 0',
                  background: `${podC[i]}22`, border: `1px solid ${podC[i]}55`,
                  display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
                  paddingBottom: 8, color: podC[i], fontSize: 11,
                  fontFamily: 'Inter,sans-serif', fontWeight: 700,
                }}>
                  #{podR[i]}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Rankings list */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
          <div className="ct" style={{ margin: 0 }}>
            {tab === 'global' ? 'Full Rankings' : tab === 'speciality' ? `My Speciality: ${myProfile?.speciality || '—'}` : `My College: ${myProfile?.college || '—'}`}
            {!loading && displayedLeaderboard.length > 0 && (
              <span style={{ fontSize: 12, fontWeight: 500, color: '#9CA3AF', marginLeft: 8 }}>({displayedLeaderboard.length} users)</span>
            )}
          </div>
          {myRank && (
            <button
              onClick={jumpToMyRank}
              style={{ background: '#EEF2FF', border: '1px solid #C7D2FE', borderRadius: 8, padding: '5px 14px', fontSize: 12, fontWeight: 700, color: '#4F46E5', cursor: 'pointer' }}
            >
              🎯 Jump to My Rank #{myRank}
            </button>
          )}
        </div>

        {loading ? (
          [1, 2, 3, 4, 5].map(i => <SkeletonRow key={i} />)
        ) : displayedLeaderboard.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px 16px', color: '#6B7280' }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>🌱</div>
            <div style={{ fontWeight: 700, fontSize: 15, color: '#374151', marginBottom: 8 }}>
              {tab === 'global'
                ? "You're a pioneer here!"
                : "You're the first from your group!"}
            </div>
            <div style={{ fontSize: 13, lineHeight: 1.6, maxWidth: 320, margin: '0 auto', color: '#9CA3AF' }}>
              {tab === 'global'
                ? "No scores yet — every point you earn right now puts you at #1. Start a quiz and claim the top spot before others show up."
                : "None of your peers have scored yet. Be the first to represent your speciality / college — take a quiz or finish a book now."}
            </div>
            {setPage && (
              <button
                onClick={() => setPage('exam')}
                style={{
                  marginTop: 16, padding: '9px 22px',
                  background: 'linear-gradient(135deg,#4F46E5,#7C3AED)',
                  color: '#fff', border: 'none', borderRadius: 10,
                  fontWeight: 700, fontSize: 13, cursor: 'pointer',
                }}
              >
                Take a Quiz →
              </button>
            )}
          </div>
        ) : (
          pagedList.map((l, i) => {
            const globalIdx = (currentPage - 1) * PAGE_SIZE + i;
            return (
            <div
              key={l.id}
              ref={l.isMe ? myRowRef : null}
              className={`lb-row ${l.isMe ? 'me' : ''}`}
              style={l.isMe ? { background: 'rgba(79,70,229,0.08)', border: '1px solid #4F46E5', borderRadius: 8 } : {}}
            >
              <div className="lb-pos" style={{ color: globalIdx < 3 ? ['#FFD700', '#C0C0C0', '#CD7F32'][globalIdx] : '#6B7280' }}>
                {globalIdx + 1}
              </div>
              <Avatar name={l.name} size={34} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>
                  {l.name}{l.isMe ? ' (You)' : ''}
                </div>
                <div style={{ fontSize: 11, color: '#6B7280' }}>{l.college} · {l.speciality}</div>
                <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                  {[['🟢', l.quizPts], ['🟣', l.readPts]].map(([c, v]) => (
                    <span key={c} style={{ fontSize: 10, color: '#6B7280' }}>{c} {(v || 0).toLocaleString()}</span>
                  ))}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontFamily: 'Inter,sans-serif', fontSize: 15, fontWeight: 800, color: '#2563EB' }}>
                  {l.score.toLocaleString()}
                </div>
                <div style={{ fontSize: 10, color: '#6B7280' }}>pts</div>
              </div>
            </div>
            );
          })
        )}
        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 14, paddingTop: 12, borderTop: '1px solid #F3F4F6' }}>
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              style={{ background: 'none', border: '1px solid #E5E7EB', borderRadius: 7, padding: '5px 12px', fontSize: 13, cursor: currentPage === 1 ? 'not-allowed' : 'pointer', color: currentPage === 1 ? '#D1D5DB' : '#374151' }}
            >← Prev</button>
            <span style={{ fontSize: 13, color: '#6B7280' }}>Page {currentPage} of {totalPages}</span>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              style={{ background: 'none', border: '1px solid #E5E7EB', borderRadius: 7, padding: '5px 12px', fontSize: 13, cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', color: currentPage === totalPages ? '#D1D5DB' : '#374151' }}
            >Next →</button>
          </div>
        )}
      </div>

      {/* Sticky personal rank footer */}
      {!loading && (
        <div style={{
          position: 'sticky', bottom: 0, zIndex: 50,
          background: 'linear-gradient(135deg,#1E1B4B,#3730A3)',
          borderRadius: '12px 12px 0 0',
          padding: '12px 18px',
          display: 'flex', alignItems: 'center', gap: 14,
          boxShadow: '0 -4px 20px rgba(0,0,0,0.2)',
          marginLeft: -16, marginRight: -16,
        }}>
          <div style={{
            width: 42, height: 42, borderRadius: '50%',
            background: me ? 'rgba(37,99,235,0.3)' : 'rgba(255,255,255,0.1)',
            border: `2px solid ${me ? '#2563EB' : 'rgba(255,255,255,0.2)'}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'Inter,sans-serif', fontSize: 14, fontWeight: 800,
            color: me ? '#93C5FD' : 'rgba(255,255,255,0.4)',
          }}>
            {myRank ? `#${myRank}` : '—'}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ color: '#fff', fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              {me ? `${me.name} · Your rank` : 'Not ranked yet'}
              {myStreak > 0 && (
                <span style={{ fontSize: 10, fontWeight: 700, background: 'rgba(239,68,68,0.25)', color: '#FCA5A5', padding: '2px 7px', borderRadius: 99, border: '1px solid rgba(239,68,68,0.4)' }}>
                  🔥 {myStreak}d streak
                </span>
              )}
            </div>
            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, marginTop: 2 }}>
              {me
                ? `${(me.score || 0).toLocaleString()} pts total`
                : 'Complete a quiz or read a book to earn your first points'}
            </div>
          </div>
          {(!me || me.score === 0) && setPage && (
            <button
              onClick={() => setPage('exam')}
              style={{
                padding: '7px 16px', borderRadius: 8, border: 'none', flexShrink: 0,
                background: 'linear-gradient(135deg,#F59E0B,#D97706)',
                color: '#1E1B4B', fontWeight: 700, fontSize: 12, cursor: 'pointer',
              }}
            >
              Take a Quiz →
            </button>
          )}
          {me && me.score > 0 && (
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ fontFamily: 'Inter,sans-serif', fontSize: 22, fontWeight: 800, color: '#60A5FA' }}>
                {(me.score || 0).toLocaleString()}
              </div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>pts</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
