import { useState, useEffect } from 'react';
import Avatar from './Avatar';
import { supabase, getUserContentStates, toggleBookmark } from '../lib/supabase';
import { generateStudyPlan } from '../lib/aiService';
import AIResponseBox from './AIResponseBox';

// ── 35-day GitHub-style heatmap ────────────────────────────────
function ActivityHeatmap({ data }) {
  const max = Math.max(...data, 1);
  const COLORS = ['#F3F4F6', '#BFDBFE', '#93C5FD', '#3B82F6', '#1D4ED8'];
  const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  return (
    <div>
      <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
        {DAY_LABELS.map((d, i) => (
          <div key={i} style={{ flex: 1, textAlign: 'center', fontSize: 9, color: '#9CA3AF', fontWeight: 600 }}>{d}</div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
        {data.map((v, i) => {
          const intensity = v === 0 ? 0 : Math.min(4, Math.ceil((v / max) * 4));
          return (
            <div
              key={i}
              title={`${v} activit${v !== 1 ? 'ies' : 'y'}`}
              style={{ width: '100%', aspectRatio: '1', background: COLORS[intensity], borderRadius: 3 }}
            />
          );
        })}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 8, justifyContent: 'flex-end' }}>
        <span style={{ fontSize: 9, color: '#9CA3AF' }}>Less</span>
        {COLORS.map((c, i) => <div key={i} style={{ width: 10, height: 10, background: c, borderRadius: 2 }} />)}
        <span style={{ fontSize: 9, color: '#9CA3AF' }}>More</span>
      </div>
    </div>
  );
}

// ── Weekly goal ring (SVG) ─────────────────────────────────────
function GoalRing({ mins, targetMins = 300 }) {
  const r = 38;
  const circ = 2 * Math.PI * r;
  const pct = Math.min(mins / Math.max(targetMins, 1), 1);
  const offset = circ * (1 - pct);
  const hours = Math.floor(mins / 60);
  const m = mins % 60;
  const label = hours > 0 ? `${hours}h${m > 0 ? ` ${m}m` : ''}` : `${mins}m`;
  const color = pct >= 1 ? '#059669' : pct >= 0.6 ? '#D97706' : '#2563EB';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
      <svg width={96} height={96} viewBox="0 0 96 96">
        <circle cx={48} cy={48} r={r} fill="none" stroke="#F3F4F6" strokeWidth={8} />
        <circle
          cx={48} cy={48} r={r} fill="none" stroke={color} strokeWidth={8}
          strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset}
          transform="rotate(-90 48 48)"
          style={{ transition: 'stroke-dashoffset 0.8s ease' }}
        />
        <text x={48} y={44} textAnchor="middle" fontSize={13} fontWeight="700" fill={color}>{Math.round(pct * 100)}%</text>
        <text x={48} y={58} textAnchor="middle" fontSize={9} fill="#6B7280">{label || '0m'}</text>
      </svg>
      <div style={{ fontSize: 11, fontWeight: 700, color: '#374151' }}>Weekly Goal</div>
      <div style={{ fontSize: 10, color: '#9CA3AF' }}>{Math.round(mins / 60 * 10) / 10}h of 5h target</div>
      {pct >= 1 && <div style={{ fontSize: 11, color: '#059669', fontWeight: 600 }}>🎉 Goal achieved!</div>}
    </div>
  );
}

const fmtDt = (d) => d
  ? new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
  : '—';

const ACTIVITY_ICON = {
  quiz_attempted: '📝', quiz_passed: '🏆', article_read: '📖',
  note_viewed: '📋', document_downloaded: '📥', webinar_attended: '🎥', daily_login: '👋',
};
const ACTIVITY_LABEL = {
  quiz_attempted: 'Attempted a quiz', quiz_passed: 'Passed a quiz',
  article_read: 'Read an article', note_viewed: 'Viewed notes',
  document_downloaded: 'Downloaded a document', webinar_attended: 'Attended a webinar',
  daily_login: 'Logged in',
};
function relTime(ts) {
  if (!ts) return '';
  const s = Math.floor((Date.now() - new Date(ts)) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return Math.floor(s / 60) + 'm ago';
  if (s < 86400) return Math.floor(s / 3600) + 'h ago';
  if (s < 172800) return 'Yesterday';
  return Math.floor(s / 86400) + 'd ago';
}

// 7-day mini activity heatmap dots
function ActivityDots({ days }) {
  const labels = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end' }}>
      {labels.map((l, i) => (
        <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          <div style={{
            width: 28, borderRadius: 4,
            height: Math.max(8, (days[i] || 0) * 24),
            background: days[i] > 0 ? '#2563EB' : '#E5E7EB',
            transition: 'height .3s',
            minHeight: 8,
          }} />
          <span style={{ fontSize: 9, color: '#9CA3AF', fontWeight: 600 }}>{l}</span>
        </div>
      ))}
    </div>
  );
}

export default function DoctorDashboard({ artifacts = [], notifications = [], setPage, userName }) {
  const approved = artifacts.filter(a => a.status === 'approved');
  // Latest 4 approved, most recently added first (higher id = newer)
  const latestContent = [...approved].sort((a, b) => b.id - a.id).slice(0, 4);

  const [myScore, setMyScore] = useState(0);
  const [myQuizPts, setMyQuizPts] = useState(0);
  const [myReadPts, setMyReadPts] = useState(0);
  const [myRank, setMyRank] = useState(null);
  const [booksRead, setBooksRead] = useState(0);
  const [hoursStudied, setHoursStudied] = useState(0);
  const [weekActivity, setWeekActivity] = useState([0, 0, 0, 0, 0, 0, 0]);
  const [recommendations, setRecommendations] = useState([]);
  const [nextWebinar, setNextWebinar] = useState(null);
  const [miniLB, setMiniLB] = useState([]);
  const [contentStates, setContentStates] = useState({}); // { [String(artifactId)]: { isBookmarked, currentPage } }
  const [currentUserId, setCurrentUserId] = useState(null);
  const [dashLoading, setDashLoading] = useState(true);
  const [heatmapData, setHeatmapData] = useState(Array(35).fill(0));
  const [weeklyMins, setWeeklyMins] = useState(0);
  const [recentActivities, setRecentActivities] = useState([]);
  const [studyPlan, setStudyPlan] = useState({ loading: false, text: null, error: null });
  const [mySpeciality, setMySpeciality] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const { data: authData } = await supabase.auth.getUser();
        const uid = authData?.user?.id;
        if (!uid) return;
        setCurrentUserId(uid);

        // ── Profile speciality ────────────────────────────
        const { data: profileData } = await supabase.from('profiles').select('speciality').eq('id', uid).maybeSingle();
        if (profileData?.speciality) setMySpeciality(profileData.speciality);

        // ── Content states (bookmarks + progress) ─────────
        const states = await getUserContentStates(uid);
        setContentStates(states);

        // ── Scores & Leaderboard ──────────────────────────
        const { data: scoreData } = await supabase
          .from('user_scores')
          .select('user_id, total_score, quiz_score, reading_score')
          .order('total_score', { ascending: false })
          .limit(5);

        if (scoreData?.length) {
          const userIds = scoreData.map(d => d.user_id);
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, name, speciality, college')
            .in('id', userIds);
          const profileMap = (profiles || []).reduce((acc, p) => { acc[p.id] = p; return acc; }, {});

          const mapped = scoreData.map((row, i) => ({
            id: row.user_id,
            name: profileMap[row.user_id]?.name || 'Anonymous',
            speciality: profileMap[row.user_id]?.speciality || '—',
            score: row.total_score || 0,
            isMe: row.user_id === uid,
          }));
          setMiniLB(mapped);

          const meRow = mapped.find(r => r.isMe);
          if (meRow) {
            const meScore = scoreData.find(d => d.user_id === uid);
            setMyScore(meRow.score);
            setMyQuizPts(meScore?.quiz_score || 0);
            setMyReadPts(meScore?.reading_score || 0);
            setMyRank(mapped.findIndex(r => r.isMe) + 1);
          }
        }

        // ── Activity stats ────────────────────────────────
        const { data: logs } = await supabase
          .from('activity_logs')
          .select('activity_type, duration_minutes, created_at')
          .eq('user_id', uid)
          .order('created_at', { ascending: false });

        if (logs) {
          const readCount = logs.filter(l => l.activity_type === 'article_read').length;
          setBooksRead(readCount);

          const totalMins = logs.reduce((acc, l) => acc + (l.duration_minutes || 30), 0);
          setHoursStudied(Math.round(totalMins / 60));

          // 7-day activity (Mon=0 … Sun=6)
          const now = new Date();
          const weekDays = Array(7).fill(0);
          logs.forEach(l => {
            const d = new Date(l.created_at);
            const diffDays = Math.floor((now - d) / 86400000);
            if (diffDays < 7) {
              const dow = (d.getDay() + 6) % 7; // Mon=0
              weekDays[dow] = Math.min(1, weekDays[dow] + 0.4);
            }
          });
          setWeekActivity(weekDays);

          // 35-day heatmap
          const heatmap = Array(35).fill(0);
          logs.forEach(l => {
            const diffDays = Math.floor((now - new Date(l.created_at)) / 86400000);
            if (diffDays < 35) heatmap[34 - diffDays]++;
          });
          setHeatmapData(heatmap);

          setRecentActivities(logs.slice(0, 5));

          // Weekly learning minutes (last 7 days)
          const weekStart = new Date(now - 7 * 86400000);
          const wMins = logs
            .filter(l => new Date(l.created_at) >= weekStart)
            .reduce((acc, l) => acc + (l.duration_minutes || 30), 0);
          setWeeklyMins(wMins);
        }

        // ── Recommendations ───────────────────────────────
        const { data: actLogs } = await supabase
          .from('activity_logs')
          .select('reference_id')
          .eq('user_id', uid)
          .eq('activity_type', 'article_read');
        const readIds = new Set((actLogs || []).map(l => l.reference_id));

        const { data: arts } = await supabase
          .from('artifacts')
          .select('id, title, subject, emoji, pages')
          .eq('status', 'approved')
          .limit(20);
        const unreadArts = (arts || []).filter(a => !readIds.has(String(a.id)));
        setRecommendations(unreadArts.sort(() => Math.random() - 0.5).slice(0, 3));

        // ── Next Webinar ──────────────────────────────────
        const { data: wb } = await supabase
          .from('admin_webinars')
          .select('*')
          .gte('scheduled_at', new Date().toISOString())
          .order('scheduled_at')
          .limit(1);
        setNextWebinar(wb?.[0] || null);

      } catch (e) {
        console.warn('Dashboard load failed:', e.message);
      } finally {
        setDashLoading(false);
      }
    }
    load();
  }, []);

  const handleBookmarkToggle = async (e, artifactId) => {
    e.stopPropagation();
    if (!currentUserId) return;
    const key = String(artifactId);
    const newVal = !(contentStates[key]?.isBookmarked || false);
    setContentStates(prev => ({
      ...prev,
      [key]: { ...prev[key], isBookmarked: newVal },
    }));
    try {
      await toggleBookmark(currentUserId, artifactId, newVal);
    } catch (_) {
      setContentStates(prev => ({
        ...prev,
        [key]: { ...prev[key], isBookmarked: !newVal },
      }));
    }
  };

  const scoreMax = Math.max(myScore, 1);
  const quizPct = Math.round((myQuizPts / scoreMax) * 100);
  const readPct = Math.round((myReadPts / scoreMax) * 100);

  const recentlyRead = approved.filter(a => (contentStates[String(a.id)]?.currentPage || 1) > 1).slice(0, 3);
  const bookmarked = approved.filter(a => contentStates[String(a.id)]?.isBookmarked).slice(0, 3);

  return (
    <div className="page">
      <div className="ph">
        <div className="pt">Welcome back, {userName || 'Doctor'}! 👋</div>
        <div className="ps">
          {myRank
            ? <>You&apos;re ranked <strong style={{ color: '#2563EB' }}>#{myRank}</strong> on the leaderboard · Keep it up!</>
            : 'Start reading and taking quizzes to earn your rank!'}
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          LATEST ALERTS (top-tier widget — only when unread exist)
      ───────────────────────────────────────────────────────────── */}
      {notifications.filter(n => n.is_read === false).length > 0 && (
        <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 12, padding: '12px 16px', marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: '#92400E' }}>🔔 Latest Alerts</div>
            <button className="btn btn-s btn-sm" onClick={() => setPage('notifications')}>View All</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {notifications.filter(n => n.is_read === false).slice(0, 3).map(n => (
              <div key={n.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '8px 10px', background: '#fff', borderRadius: 8, border: '1px solid #FDE68A' }}>
                <span style={{ fontSize: 16, flexShrink: 0 }}>{n.icon || '🔔'}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.title}</div>
                  <div style={{ fontSize: 11, color: '#6B7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.body}</div>
                </div>
                <div style={{ fontSize: 10, color: '#9CA3AF', flexShrink: 0 }}>{n.time}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          SECTION 1: MY ACTIVITY
      ───────────────────────────────────────────────────────────── */}
      {dashLoading ? (
        <div className="card animate-pulse" style={{ marginBottom: 20 }}>
          <div style={{ height: 18, background: '#E5E7EB', borderRadius: 6, width: '35%', marginBottom: 20 }} />
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
            {[1,2,3,4].map(i => (
              <div key={i} style={{ flex: '1 1 120px', height: 62, background: '#F3F4F6', borderRadius: 10 }} />
            ))}
          </div>
          <div style={{ height: 8, background: '#F3F4F6', borderRadius: 99, marginBottom: 16 }} />
          <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end', height: 40 }}>
            {[32,48,24,40,56,20,44].map((h, i) => (
              <div key={i} style={{ flex: 1, height: h, background: '#F3F4F6', borderRadius: 4 }} />
            ))}
          </div>
        </div>
      ) : (
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="ch" style={{ marginBottom: 16 }}>
          <div className="ct">📊 My Activity</div>
          <button className="btn btn-s btn-sm" onClick={() => setPage('activity')}>View Details →</button>
        </div>

        {/* Stats row */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
          {[
            { label: 'Total Points', value: myScore.toLocaleString(), icon: '⭐', color: '#2563EB', bg: '#EFF6FF' },
            { label: 'Books Read', value: booksRead, icon: '📖', color: '#059669', bg: '#ECFDF5' },
            { label: 'Hours Studied', value: `${hoursStudied}h`, icon: '⏱', color: '#7C3AED', bg: '#F5F3FF' },
            { label: 'Quiz Points', value: myQuizPts.toLocaleString(), icon: '🎯', color: '#D97706', bg: '#FFFBEB' },
          ].map(s => (
            <div key={s.label} style={{
              flex: '1 1 120px',
              background: s.bg,
              borderRadius: 10,
              padding: '12px 14px',
              display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <span style={{ fontSize: 22 }}>{s.icon}</span>
              <div>
                <div style={{ fontSize: 18, fontWeight: 800, color: s.color, lineHeight: 1.1 }}>{s.value}</div>
                <div style={{ fontSize: 11, color: '#6B7280', marginTop: 2 }}>{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Score breakdown bar */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>Score Breakdown</span>
            <span style={{ fontSize: 12, color: '#6B7280' }}>{myScore.toLocaleString()} pts total</span>
          </div>
          <div style={{ height: 8, background: '#F3F4F6', borderRadius: 99, overflow: 'hidden', display: 'flex' }}>
            <div style={{ width: `${quizPct}%`, background: '#2563EB', transition: 'width .5s' }} />
            <div style={{ width: `${readPct}%`, background: '#7C3AED', transition: 'width .5s' }} />
          </div>
          <div style={{ display: 'flex', gap: 16, marginTop: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#6B7280' }}>
              <div style={{ width: 10, height: 10, background: '#2563EB', borderRadius: 2 }} />
              Quiz: <strong style={{ color: '#374151' }}>{myQuizPts.toLocaleString()} pts</strong>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#6B7280' }}>
              <div style={{ width: 10, height: 10, background: '#7C3AED', borderRadius: 2 }} />
              Reading: <strong style={{ color: '#374151' }}>{myReadPts.toLocaleString()} pts</strong>
            </div>
          </div>
        </div>

        {/* 7-day activity chart */}
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 10 }}>Last 7 Days Activity</div>
          <ActivityDots days={weekActivity} />
        </div>
      </div>
      )} {/* end dashLoading conditional */}

      {/* ─────────────────────────────────────────────────────────────
          SECTION 1.5: RECENT ACTIVITY
      ───────────────────────────────────────────────────────────── */}
      {!dashLoading && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="ch" style={{ marginBottom: 12 }}>
            <div className="ct">⚡ Recent Activity</div>
          </div>
          {recentActivities.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#9CA3AF', padding: '12px 0', fontSize: 13 }}>
              No activity yet — start reading or taking quizzes!
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {recentActivities.map((a, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '9px 0',
                  borderBottom: i < recentActivities.length - 1 ? '1px solid #F3F4F6' : 'none',
                }}>
                  <span style={{ fontSize: 18, flexShrink: 0, width: 26, textAlign: 'center' }}>
                    {ACTIVITY_ICON[a.activity_type] || '📋'}
                  </span>
                  <div style={{ flex: 1, fontSize: 12, fontWeight: 500, color: '#374151' }}>
                    {ACTIVITY_LABEL[a.activity_type] || a.activity_type.replace(/_/g, ' ')}
                  </div>
                  <div style={{ fontSize: 11, color: '#9CA3AF', flexShrink: 0 }}>{relTime(a.created_at)}</div>
                </div>
              ))}
            </div>
          )}
          <div style={{ display: 'flex', gap: 10, marginTop: 14, paddingTop: 14, borderTop: '1px solid #F3F4F6' }}>
            <button className="btn btn-s btn-sm" style={{ flex: 1 }} onClick={() => setPage('leaderboard')}>🏆 Leaderboard →</button>
            <button className="btn btn-s btn-sm" style={{ flex: 1 }} onClick={() => setPage('activity')}>📊 Activity History →</button>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          SECTION 2: AI SUGGESTIONS
      ───────────────────────────────────────────────────────────── */}
      <div style={{
        background: 'linear-gradient(135deg, #1E40AF 0%, #4F46E5 60%, #7C3AED 100%)',
        borderRadius: 14, padding: 20, marginBottom: 20, color: '#fff',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 3 }}>✨ AI Suggestions</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)' }}>Next learning recommendations based on your activity</div>
          </div>
          <button
            onClick={() => setPage('ebooks')}
            style={{
              background: 'rgba(255,255,255,0.15)', color: '#fff',
              border: '1px solid rgba(255,255,255,0.3)',
              borderRadius: 8, padding: '6px 14px', fontSize: 12,
              fontWeight: 600, cursor: 'pointer', backdropFilter: 'blur(4px)',
            }}
          >
            🤖 Ask AI →
          </button>
        </div>

        {recommendations.length === 0 ? (
          <div style={{
            background: 'rgba(255,255,255,0.1)', borderRadius: 10, padding: '16px',
            textAlign: 'center', fontSize: 13, color: 'rgba(255,255,255,0.75)',
          }}>
            📚 Read more books to unlock personalised AI recommendations!
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {recommendations.map((r, i) => (
              <div
                key={r.id}
                onClick={() => setPage('ebooks')}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  background: 'rgba(255,255,255,0.12)',
                  borderRadius: 10, padding: '10px 14px',
                  cursor: 'pointer', transition: 'background .2s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.12)'}
              >
                <div style={{
                  width: 36, height: 36, borderRadius: 8, flexShrink: 0,
                  background: 'rgba(255,255,255,0.15)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
                }}>
                  {r.emoji || '📚'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {r.title}
                  </div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', marginTop: 2 }}>
                    {r.subject} · {r.pages || '—'} pages
                  </div>
                </div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', flexShrink: 0 }}>#{i + 1} pick</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ─────────────────────────────────────────────────────────────
          SECTION 2.4: AI STUDY PLAN
      ───────────────────────────────────────────────────────────── */}
      {!dashLoading && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="ch" style={{ marginBottom: 12 }}>
            <div className="ct">🗓 AI Study Plan</div>
            {!studyPlan.loading && (
              <button
                className="btn btn-sm"
                style={{ background: 'linear-gradient(135deg,#4F46E5,#7C3AED)', color: '#fff', border: 'none', cursor: 'pointer' }}
                onClick={async () => {
                  setStudyPlan({ loading: true, text: null, error: null });
                  const { text, error } = await generateStudyPlan(mySpeciality, booksRead, myQuizPts, myScore);
                  setStudyPlan({ loading: false, text, error });
                }}
              >
                {studyPlan.text ? '↺ Regenerate' : '✨ Generate Plan'}
              </button>
            )}
          </div>
          {!studyPlan.loading && !studyPlan.text && !studyPlan.error && (
            <div style={{ textAlign: 'center', padding: '16px 0', color: '#9CA3AF', fontSize: 13 }}>
              Click <strong>✨ Generate Plan</strong> to get a personalised 7-day study schedule from AI.
            </div>
          )}
          <AIResponseBox
            loading={studyPlan.loading}
            error={studyPlan.error}
            text={studyPlan.text}
            label="7-Day Study Plan"
            onRetry={async () => {
              setStudyPlan({ loading: true, text: null, error: null });
              const { text, error } = await generateStudyPlan(mySpeciality, booksRead, myQuizPts, myScore);
              setStudyPlan({ loading: false, text, error });
            }}
          />
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          SECTION 2.5: ACTIVITY CALENDAR & WEEKLY GOAL
      ───────────────────────────────────────────────────────────── */}
      {!dashLoading && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16, marginBottom: 20 }}>
          <div className="card" style={{ margin: 0 }}>
            <div className="ch" style={{ marginBottom: 12 }}>
              <div className="ct">📅 35-Day Activity Calendar</div>
            </div>
            <ActivityHeatmap data={heatmapData} />
            <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 10, textAlign: 'center' }}>
              {heatmapData.reduce((a, v) => a + v, 0)} total activities in the last 35 days
            </div>
          </div>
          <div className="card" style={{ margin: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <div className="ch" style={{ marginBottom: 12, width: '100%' }}>
              <div className="ct">🎯 Weekly Learning Target</div>
            </div>
            <GoalRing mins={weeklyMins} />
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          SECTION 3 + 4: WEBINAR + LEADERBOARD RANK (responsive 2-col)
      ───────────────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginBottom: 20 }}>

        {/* Upcoming Webinar */}
        <div className="card" style={{ margin: 0 }}>
          <div className="ch" style={{ marginBottom: 14 }}>
            <div className="ct">📅 Upcoming Webinar</div>
          </div>
          {nextWebinar ? (
            <div>
              <div style={{ fontWeight: 700, fontSize: 15, color: '#111827', marginBottom: 6 }}>
                {nextWebinar.title}
              </div>
              {nextWebinar.speaker && (
                <div style={{ fontSize: 13, color: '#6B7280', marginBottom: 8 }}>
                  🎤 {nextWebinar.speaker}
                </div>
              )}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: '#EFF6FF', borderRadius: 8, padding: '8px 12px', marginBottom: 10,
              }}>
                <span style={{ fontSize: 16 }}>🗓</span>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#1D4ED8' }}>{fmtDt(nextWebinar.scheduled_at)}</div>
                  <div style={{ fontSize: 11, color: '#6B7280' }}>Duration: {nextWebinar.duration_min || 60} min</div>
                </div>
              </div>
              {nextWebinar.description && (
                <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 10 }}>{nextWebinar.description}</div>
              )}
              {nextWebinar.join_url ? (
                <a
                  href={nextWebinar.join_url}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    display: 'inline-block',
                    background: 'linear-gradient(135deg,#4F46E5,#3730A3)',
                    color: '#fff', borderRadius: 8, padding: '8px 16px',
                    fontSize: 12, fontWeight: 600, textDecoration: 'none',
                  }}
                >
                  🚀 Join Webinar
                </a>
              ) : (
                <div style={{ fontSize: 12, color: '#9CA3AF' }}>Join link will be shared soon</div>
              )}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{ fontSize: 40, marginBottom: 10 }}>📅</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 4 }}>No upcoming webinars</div>
              <div style={{ fontSize: 12, color: '#9CA3AF' }}>Check back soon — admin will schedule sessions here</div>
            </div>
          )}
        </div>

        {/* Leaderboard Rank */}
        <div className="card" style={{ margin: 0 }}>
          <div className="ch" style={{ marginBottom: 14 }}>
            <div className="ct">🏆 Leaderboard Rank</div>
            <button className="btn btn-s btn-sm" onClick={() => setPage('leaderboard')}>Full Board</button>
          </div>

          {/* My rank summary */}
          <div style={{
            background: myRank ? 'linear-gradient(135deg,#EFF6FF,#EDE9FE)' : '#F9FAFB',
            borderRadius: 10, padding: '14px', marginBottom: 14, textAlign: 'center',
          }}>
            <div style={{ fontSize: 36, fontWeight: 900, color: '#2563EB', lineHeight: 1 }}>
              {myRank ? `#${myRank}` : '—'}
            </div>
            <div style={{ fontSize: 12, color: '#6B7280', marginTop: 4 }}>Your current rank</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#374151', marginTop: 6 }}>
              {myScore.toLocaleString()} pts
            </div>
          </div>

          {/* Mini top-3 */}
          {miniLB.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '8px 0', color: '#9CA3AF', fontSize: 13 }}>
              No rankings yet. Start earning points!
            </div>
          ) : (
            miniLB.slice(0, 3).map((l, i) => (
              <div key={l.id} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: l.isMe ? '7px 8px' : '7px 0',
                borderBottom: i < 2 ? '1px solid #F9FAFB' : 'none',
                background: l.isMe ? 'rgba(37,99,235,0.04)' : 'transparent',
                borderRadius: l.isMe ? 6 : 0,
              }}>
                <div style={{
                  width: 22, fontSize: 12, fontWeight: 800, textAlign: 'center',
                  color: ['#EAB308', '#9CA3AF', '#CD7F32'][i] || '#6B7280',
                }}>
                  {['🥇', '🥈', '🥉'][i]}
                </div>
                <Avatar name={l.name} size={24} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: l.isMe ? 700 : 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {l.name}{l.isMe ? ' 👈' : ''}
                  </div>
                  <div style={{ fontSize: 10, color: '#9CA3AF' }}>{l.speciality}</div>
                </div>
                <div style={{ fontSize: 12, fontWeight: 800, color: '#2563EB', flexShrink: 0 }}>
                  {l.score.toLocaleString()}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          SECTION 5: LATEST CONTENT (horizontal scroll)
      ───────────────────────────────────────────────────────────── */}
      <div className="card">
        <div className="ch" style={{ marginBottom: 16 }}>
          <div className="ct">📚 Latest Content</div>
          <button className="btn btn-s btn-sm" onClick={() => setPage('ebooks')}>View Library →</button>
        </div>

        {latestContent.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px 0', color: '#9CA3AF' }}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>📭</div>
            <div style={{ fontSize: 13 }}>No approved content yet</div>
          </div>
        ) : (
          <div style={{
            display: 'flex', gap: 12,
            overflowX: 'auto', paddingBottom: 8,
            scrollbarWidth: 'thin',
            scrollbarColor: '#E5E7EB transparent',
          }}>
            {latestContent.map(a => {
              const state = contentStates[String(a.id)];
              const isBookmarked = state?.isBookmarked || false;
              const savedPage = state?.currentPage || 1;
              return (
                <div
                  key={a.id}
                  onClick={() => setPage('ebooks')}
                  style={{
                    flexShrink: 0, width: 180,
                    background: '#F9FAFB', borderRadius: 12,
                    padding: 14, cursor: 'pointer',
                    border: '1px solid #F3F4F6',
                    transition: 'transform .2s, box-shadow .2s',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  {/* Cover with bookmark overlay */}
                  <div style={{
                    position: 'relative',
                    width: '100%', height: 90, borderRadius: 8, marginBottom: 10,
                    background: 'linear-gradient(135deg,#EFF6FF,#EDE9FE)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 40,
                  }}>
                    {a.emoji || '📗'}
                    {/* Bookmark toggle icon */}
                    <button
                      onClick={e => handleBookmarkToggle(e, a.id)}
                      title={isBookmarked ? 'Remove bookmark' : 'Bookmark'}
                      style={{
                        position: 'absolute', top: 6, right: 6,
                        background: isBookmarked ? 'rgba(37,99,235,0.15)' : 'rgba(255,255,255,0.8)',
                        border: 'none', borderRadius: 6, padding: '3px 5px',
                        fontSize: 14, cursor: 'pointer', lineHeight: 1,
                        boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
                        transition: 'background .15s',
                      }}
                    >
                      {isBookmarked ? '🔖' : '🏷'}
                    </button>
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#111827', marginBottom: 4, lineHeight: 1.3 }}>
                    {a.title.length > 40 ? a.title.substring(0, 40) + '…' : a.title}
                  </div>
                  <div style={{ fontSize: 11, color: '#6B7280', marginBottom: savedPage > 1 ? 4 : 8 }}>{a.subject}</div>
                  {savedPage > 1 && (
                    <div style={{ marginBottom: 8 }}>
                      <span style={{
                        fontSize: 10, fontWeight: 600, color: '#2563EB',
                        background: '#EFF6FF', borderRadius: 99, padding: '2px 8px',
                      }}>
                        ▶ Resume p.{savedPage}
                      </span>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 10, color: '#9CA3AF' }}>{a.pages}pg</span>
                    <span style={{
                      fontSize: 10, fontWeight: 600, color: '#059669',
                      background: '#ECFDF5', borderRadius: 99, padding: '2px 7px',
                    }}>Available</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ─────────────────────────────────────────────────────────────
          SECTION 6: RECENTLY READ + BOOKMARKS
      ───────────────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginTop: 20 }}>

        {/* Recently Read */}
        <div className="card" style={{ margin: 0 }}>
          <div className="ch" style={{ marginBottom: 14 }}>
            <div className="ct">📖 Recently Read</div>
            {recentlyRead.length > 0 && (
              <button className="btn btn-s btn-sm" onClick={() => setPage('ebooks')}>View All</button>
            )}
          </div>
          {recentlyRead.length === 0 ? (
            <div style={{ border: '2px dashed #E5E7EB', borderRadius: 12, padding: '24px 16px', textAlign: 'center' }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>📭</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 4 }}>No books read yet</div>
              <div style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 14 }}>Start your journey in the Library!</div>
              <button className="btn btn-s btn-sm" onClick={() => setPage('ebooks')}>Browse Library →</button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {recentlyRead.map(a => {
                const savedPage = contentStates[String(a.id)]?.currentPage || 1;
                return (
                  <div
                    key={a.id}
                    onClick={() => setPage('ebooks')}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10, background: '#F9FAFB', cursor: 'pointer', border: '1px solid #F3F4F6', transition: 'background .15s' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#EFF6FF'}
                    onMouseLeave={e => e.currentTarget.style.background = '#F9FAFB'}
                  >
                    <div style={{ fontSize: 24, flexShrink: 0 }}>{a.emoji || '📗'}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.title}</div>
                      <div style={{ fontSize: 11, color: '#6B7280', marginTop: 2 }}>{a.subject}</div>
                    </div>
                    <span style={{ fontSize: 10, fontWeight: 600, color: '#2563EB', background: '#EFF6FF', borderRadius: 99, padding: '2px 8px', flexShrink: 0 }}>
                      p.{savedPage}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Bookmarks */}
        <div className="card" style={{ margin: 0 }}>
          <div className="ch" style={{ marginBottom: 14 }}>
            <div className="ct">🔖 Bookmarks</div>
            {bookmarked.length > 0 && (
              <button className="btn btn-s btn-sm" onClick={() => setPage('ebooks')}>View All</button>
            )}
          </div>
          {bookmarked.length === 0 ? (
            <div style={{ border: '2px dashed #E5E7EB', borderRadius: 12, padding: '24px 16px', textAlign: 'center' }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>🏷</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 4 }}>No bookmarks yet</div>
              <div style={{ fontSize: 12, color: '#9CA3AF' }}>Your saved materials will appear here for quick access.</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {bookmarked.map(a => (
                <div
                  key={a.id}
                  onClick={() => setPage('ebooks')}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10, background: '#F9FAFB', cursor: 'pointer', border: '1px solid #F3F4F6', transition: 'background .15s' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#FFF7ED'}
                  onMouseLeave={e => e.currentTarget.style.background = '#F9FAFB'}
                >
                  <div style={{ fontSize: 24, flexShrink: 0 }}>{a.emoji || '📗'}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.title}</div>
                    <div style={{ fontSize: 11, color: '#6B7280', marginTop: 2 }}>{a.subject}</div>
                  </div>
                  <span style={{ fontSize: 14, flexShrink: 0 }}>🔖</span>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
