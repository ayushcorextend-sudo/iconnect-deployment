import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import GoalRingShared from './dashboard/GoalRing';

// ── Shared sub-components ──────────────────────────────────────
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

// GoalRing is imported from dashboard/GoalRing (shared component)

const fmtDate = (iso) => new Date(iso).toLocaleDateString('en-IN', {
  day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
});

const ACTIVITY_META = {
  article_read:       { icon: '📖', label: 'Read an E-Book' },
  quiz_complete:      { icon: '🎯', label: 'Completed an Exam Quiz' },
  kahoot_play:        { icon: '🎮', label: 'Played a Kahoot Quiz' },
  webinar_register:   { icon: '📅', label: 'Registered for a Webinar' },
  conference_view:    { icon: '🏥', label: 'Viewed a Conference' },
  login:              { icon: '🔑', label: 'Logged in' },
};

function StatCard({ icon, label, value, sub, gradient, textColor }) {
  return (
    <div style={{
      background: gradient,
      borderRadius: 16, padding: '20px 22px',
      display: 'flex', flexDirection: 'column', gap: 6,
      boxShadow: '0 4px 14px rgba(0,0,0,0.08)',
      flex: '1 1 160px', minWidth: 140,
    }}>
      <div style={{ fontSize: 28 }}>{icon}</div>
      <div style={{ fontSize: 26, fontWeight: 900, color: textColor || '#111827', lineHeight: 1 }}>
        {value}
      </div>
      <div style={{ fontSize: 12, fontWeight: 600, color: textColor ? 'rgba(255,255,255,0.8)' : '#6B7280' }}>
        {label}
      </div>
      {sub && (
        <div style={{ fontSize: 11, color: textColor ? 'rgba(255,255,255,0.6)' : '#9CA3AF', marginTop: 2 }}>
          {sub}
        </div>
      )}
    </div>
  );
}

export default function MyPerformancePage({ userId }) {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [scores, setScores] = useState({ total: 0, quiz: 0, reading: 0 });
  const [hoursStudied, setHoursStudied] = useState(0);
  const [booksRead, setBooksRead] = useState(0);
  const [quizzesCompleted, setQuizzesCompleted] = useState(0);
  const [avgQuizScore, setAvgQuizScore] = useState(null);
  const [recentActivity, setRecentActivity] = useState([]);
  const [weeklyData, setWeeklyData] = useState([]);
  const [rank, setRank] = useState(null);
  const [percentile, setPercentile] = useState(null);
  const [heatmapData, setHeatmapData] = useState(Array(35).fill(0));
  const [weeklyMins, setWeeklyMins] = useState(0);
  const [trendData, setTrendData] = useState([]);

  useEffect(() => {
    async function load() {
      const uid = userId;
      if (!uid) return;
      setLoading(true);
      try {
        // ── Profile ──────────────────────────────────────────────
        const { data: prof } = await supabase
          .from('profiles')
          .select('name, speciality, college, joining_year')
          .eq('id', uid)
          .maybeSingle();
        setProfile(prof);

        // ── Scores + rank ─────────────────────────────────────────
        const { data: allScores } = await supabase
          .from('user_scores')
          .select('user_id, total_score, quiz_score, reading_score')
          .order('total_score', { ascending: false });

        if (allScores?.length) {
          const idx = allScores.findIndex(s => s.user_id === uid);
          if (idx !== -1) {
            const row = allScores[idx];
            setScores({ total: row.total_score || 0, quiz: row.quiz_score || 0, reading: row.reading_score || 0 });
            setRank(idx + 1);
            const pct = Math.round(((allScores.length - (idx + 1)) / allScores.length) * 100);
            setPercentile(pct);
          }
        }

        // ── Activity logs ─────────────────────────────────────────
        const { data: logs } = await supabase
          .from('activity_logs')
          .select('activity_type, duration_minutes, created_at')
          .eq('user_id', uid)
          .order('created_at', { ascending: false })
          .limit(200);

        if (logs) {
          const totalMins = logs.reduce((acc, l) => acc + (l.duration_minutes || 30), 0);
          setHoursStudied(Math.round((totalMins / 60) * 10) / 10);
          setBooksRead(logs.filter(l => l.activity_type === 'article_read').length);
          setRecentActivity(logs.slice(0, 10));

          // Build 7-day chart — Mon to today, count activities per calendar day
          const now = new Date();
          const days = Array.from({ length: 7 }, (_, i) => {
            const d = new Date(now);
            d.setDate(now.getDate() - (6 - i));
            return {
              label: d.toLocaleDateString('en-IN', { weekday: 'short' }),
              date: d.toDateString(),
              count: 0,
            };
          });
          logs.forEach(l => {
            const dDate = new Date(l.created_at).toDateString();
            const slot = days.find(d => d.date === dDate);
            if (slot) slot.count++;
          });
          setWeeklyData(days);

          // 35-day heatmap
          const heatmap = Array(35).fill(0);
          logs.forEach(l => {
            const diffDays = Math.floor((now - new Date(l.created_at)) / 86400000);
            if (diffDays < 35) heatmap[34 - diffDays]++;
          });
          setHeatmapData(heatmap);

          // 4-week trend (group by week, newest last)
          const weeks = Array.from({ length: 4 }, (_, i) => {
            const weekEnd = new Date(now - i * 7 * 86400000);
            const weekStart = new Date(now - (i + 1) * 7 * 86400000);
            const label = i === 0 ? 'This week' : i === 1 ? 'Last week' : `-${i + 1}w`;
            return { label, start: weekStart, end: weekEnd, count: 0, mins: 0 };
          }).reverse();
          logs.forEach(l => {
            const d = new Date(l.created_at);
            const slot = weeks.find(w => d >= w.start && d < w.end);
            if (slot) { slot.count++; slot.mins += l.duration_minutes || 30; }
          });
          setTrendData(weeks);

          // Weekly learning minutes (last 7 days)
          const weekStart = new Date(now - 7 * 86400000);
          const wMins = logs
            .filter(l => new Date(l.created_at) >= weekStart)
            .reduce((acc, l) => acc + (l.duration_minutes || 30), 0);
          setWeeklyMins(wMins);
        }

        // ── Exam attempts ─────────────────────────────────────────
        const { data: attempts } = await supabase
          .from('exam_attempts')
          .select('score, total_questions')
          .eq('user_id', uid);

        if (attempts?.length) {
          setQuizzesCompleted(attempts.length);
          const avg = attempts.reduce((acc, a) => acc + (a.score / Math.max(a.total_questions, 1)) * 100, 0) / attempts.length;
          setAvgQuizScore(Math.round(avg));
        }

      } catch (e) {
        console.warn('MyPerformancePage load failed:', e.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [userId]);

  const maxCount = Math.max(...(weeklyData.map(d => d.count)), 1);
  const scoreMax = Math.max(scores.total, 1);
  const quizPct = Math.round((scores.quiz / scoreMax) * 100);
  const readPct = Math.round((scores.reading / scoreMax) * 100);

  if (loading) return (
    <div className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300 }}>
      <div style={{ textAlign: 'center', color: '#9CA3AF' }}>
        <div style={{ fontSize: 36, marginBottom: 10 }}>⏳</div>
        <div style={{ fontSize: 14, fontWeight: 500 }}>Loading your analytics…</div>
      </div>
    </div>
  );

  return (
    <div className="page">

      {/* ── HEADER CARD ─────────────────────────────────────────── */}
      <div style={{
        background: 'linear-gradient(135deg, #1E40AF 0%, #4F46E5 55%, #7C3AED 100%)',
        borderRadius: 18, padding: '24px 28px', marginBottom: 24,
        color: '#fff', boxShadow: '0 8px 24px rgba(37,99,235,0.3)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 900, marginBottom: 4 }}>
              📊 My Performance Analytics
            </div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)', marginBottom: 12 }}>
              {profile?.name || 'Doctor'} · {profile?.speciality || '—'} · {profile?.college || '—'}
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {rank && (
                <span style={{
                  background: 'rgba(255,255,255,0.18)', borderRadius: 99,
                  padding: '4px 14px', fontSize: 12, fontWeight: 700,
                }}>
                  🏆 Rank #{rank} on Leaderboard
                </span>
              )}
              {percentile !== null && (
                <span style={{
                  background: percentile >= 75 ? 'rgba(16,185,129,0.3)' : 'rgba(255,255,255,0.18)',
                  borderRadius: 99, padding: '4px 14px', fontSize: 12, fontWeight: 700,
                }}>
                  📊 Top {100 - percentile}% of users
                </span>
              )}
              <span style={{
                background: 'rgba(255,255,255,0.18)', borderRadius: 99,
                padding: '4px 14px', fontSize: 12, fontWeight: 700,
              }}>
                ⭐ {scores.total.toLocaleString()} Total Points
              </span>
            </div>
          </div>
          <div style={{
            background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(6px)',
            borderRadius: 14, padding: '14px 20px', textAlign: 'center', minWidth: 120,
          }}>
            <div style={{ fontSize: 36, fontWeight: 900, lineHeight: 1 }}>
              {avgQuizScore !== null ? `${avgQuizScore}%` : '—'}
            </div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 4, fontWeight: 600 }}>
              Avg Quiz Score
            </div>
          </div>
        </div>
      </div>

      {/* ── STAT GRID ────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 24 }}>
        <StatCard
          icon="⭐"
          label="Total Points"
          value={scores.total.toLocaleString()}
          sub={`Quiz: ${scores.quiz.toLocaleString()} · Reading: ${scores.reading.toLocaleString()}`}
          gradient="linear-gradient(135deg,#EFF6FF,#DBEAFE)"
          textColor="#1D4ED8"
        />
        <StatCard
          icon="⏱"
          label="Hours Studied"
          value={`${hoursStudied}h`}
          sub={`Across ${booksRead} book${booksRead !== 1 ? 's' : ''} read`}
          gradient="linear-gradient(135deg,#F5F3FF,#EDE9FE)"
          textColor="#6D28D9"
        />
        <StatCard
          icon="📝"
          label="Quizzes Completed"
          value={quizzesCompleted}
          sub={quizzesCompleted > 0 ? 'NEET-PG exam attempts' : 'No quizzes yet'}
          gradient="linear-gradient(135deg,#ECFDF5,#D1FAE5)"
          textColor="#059669"
        />
        <StatCard
          icon="🏆"
          label="Leaderboard Rank"
          value={rank ? `#${rank}` : '—'}
          sub={rank ? 'Keep earning points!' : 'Complete quizzes to rank'}
          gradient="linear-gradient(135deg,#FFFBEB,#FEF3C7)"
          textColor="#D97706"
        />
      </div>

      {/* ── SCORE BREAKDOWN + 7-DAY CHART (2-col) ───────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginBottom: 24 }}>

        {/* Score breakdown */}
        <div className="card" style={{ margin: 0 }}>
          <div className="ch" style={{ marginBottom: 16 }}>
            <div className="ct">📈 Score Breakdown</div>
          </div>
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>Quiz Points</span>
              <span style={{ fontSize: 12, color: '#2563EB', fontWeight: 700 }}>{scores.quiz.toLocaleString()}</span>
            </div>
            <div style={{ height: 10, background: '#F3F4F6', borderRadius: 99, overflow: 'hidden' }}>
              <div style={{ width: `${quizPct}%`, height: '100%', background: 'linear-gradient(90deg,#2563EB,#4F46E5)', borderRadius: 99, transition: 'width .6s' }} />
            </div>
          </div>
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>Reading Points</span>
              <span style={{ fontSize: 12, color: '#7C3AED', fontWeight: 700 }}>{scores.reading.toLocaleString()}</span>
            </div>
            <div style={{ height: 10, background: '#F3F4F6', borderRadius: 99, overflow: 'hidden' }}>
              <div style={{ width: `${readPct}%`, height: '100%', background: 'linear-gradient(90deg,#7C3AED,#A855F7)', borderRadius: 99, transition: 'width .6s' }} />
            </div>
          </div>
          <div style={{ background: '#F9FAFB', borderRadius: 10, padding: '12px 14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: '#6B7280', fontWeight: 600 }}>Total Points</span>
              <span style={{ fontSize: 18, fontWeight: 900, color: '#111827' }}>{scores.total.toLocaleString()}</span>
            </div>
          </div>
          {avgQuizScore !== null && (
            <div style={{ marginTop: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>Avg Quiz Score</span>
                <span style={{ fontSize: 12, color: '#059669', fontWeight: 700 }}>{avgQuizScore}%</span>
              </div>
              <div style={{ height: 10, background: '#F3F4F6', borderRadius: 99, overflow: 'hidden' }}>
                <div style={{
                  width: `${avgQuizScore}%`, height: '100%',
                  background: avgQuizScore >= 70 ? 'linear-gradient(90deg,#059669,#10B981)' : avgQuizScore >= 50 ? 'linear-gradient(90deg,#D97706,#F59E0B)' : 'linear-gradient(90deg,#DC2626,#EF4444)',
                  borderRadius: 99, transition: 'width .6s',
                }} />
              </div>
            </div>
          )}
        </div>

        {/* 7-day activity bar chart */}
        <div className="card" style={{ margin: 0 }}>
          <div className="ch" style={{ marginBottom: 16 }}>
            <div className="ct">📅 Last 7 Days Activity</div>
          </div>
          {weeklyData.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#9CA3AF', fontSize: 13, padding: '20px 0' }}>
              No activity data yet.
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', height: 120, marginBottom: 10 }}>
                {weeklyData.map((d, i) => {
                  const barPct = d.count === 0 ? 0 : Math.max(12, Math.round((d.count / maxCount) * 100));
                  const isToday = i === 6;
                  return (
                    <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, height: '100%', justifyContent: 'flex-end' }}>
                      {d.count > 0 && (
                        <span style={{ fontSize: 10, fontWeight: 700, color: isToday ? '#2563EB' : '#6B7280' }}>{d.count}</span>
                      )}
                      <div style={{
                        width: '100%', borderRadius: '4px 4px 0 0',
                        height: `${barPct}%`,
                        background: d.count === 0
                          ? '#F3F4F6'
                          : isToday
                            ? 'linear-gradient(180deg,#2563EB,#4F46E5)'
                            : 'linear-gradient(180deg,#93C5FD,#BFDBFE)',
                        transition: 'height .5s',
                        minHeight: 6,
                      }} />
                    </div>
                  );
                })}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {weeklyData.map((d, i) => (
                  <div key={i} style={{ flex: 1, textAlign: 'center', fontSize: 10, color: i === 6 ? '#2563EB' : '#9CA3AF', fontWeight: i === 6 ? 700 : 400 }}>
                    {d.label}
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 12, fontSize: 12, color: '#6B7280', textAlign: 'center' }}>
                {weeklyData.reduce((acc, d) => acc + d.count, 0)} total actions this week
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── 4-WEEK TREND ─────────────────────────────────────────── */}
      {trendData.length > 0 && (
        <div className="card" style={{ marginBottom: 24 }}>
          <div className="ch" style={{ marginBottom: 16 }}>
            <div className="ct">📈 4-Week Activity Trend</div>
            <span style={{ fontSize: 12, color: '#9CA3AF' }}>Weekly comparison</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
            {trendData.map((w, i) => {
              const maxCount = Math.max(...trendData.map(t => t.count), 1);
              const barPct = w.count === 0 ? 4 : Math.max(10, Math.round((w.count / maxCount) * 100));
              const isLatest = i === trendData.length - 1;
              const prevCount = i > 0 ? trendData[i - 1].count : null;
              const delta = prevCount !== null ? w.count - prevCount : null;
              return (
                <div key={i} style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: isLatest ? '#2563EB' : '#6B7280', marginBottom: 8 }}>{w.label}</div>
                  <div style={{ height: 80, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'center' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: isLatest ? '#2563EB' : '#374151', marginBottom: 3 }}>{w.count}</div>
                    <div style={{
                      width: '60%', height: `${barPct}%`,
                      background: isLatest ? 'linear-gradient(180deg,#2563EB,#4F46E5)' : 'linear-gradient(180deg,#93C5FD,#BFDBFE)',
                      borderRadius: '4px 4px 0 0', transition: 'height .5s',
                      minHeight: 4,
                    }} />
                  </div>
                  <div style={{ fontSize: 10, color: '#9CA3AF', marginTop: 4 }}>{Math.round(w.mins / 60 * 10) / 10}h</div>
                  {delta !== null && (
                    <div style={{ fontSize: 10, fontWeight: 700, color: delta > 0 ? '#059669' : delta < 0 ? '#DC2626' : '#9CA3AF', marginTop: 2 }}>
                      {delta > 0 ? `+${delta}` : delta === 0 ? '=' : delta} vs prev
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── ACTIVITY CALENDAR & WEEKLY GOAL (2-col) ─────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16, marginBottom: 24 }}>
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
          <GoalRingShared mins={weeklyMins} userId={userId} />
          <div style={{ marginTop: 16, padding: '10px 14px', background: '#F9FAFB', borderRadius: 10, width: '100%', boxSizing: 'border-box' }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>This week</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#6B7280' }}>
              <span>Studied</span>
              <span style={{ fontWeight: 700, color: '#2563EB' }}>{Math.round(weeklyMins / 60 * 10) / 10}h</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#6B7280', marginTop: 4 }}>
              <span>Target</span>
              <span style={{ fontWeight: 700 }}>5.0h</span>
            </div>
            <div style={{ height: 6, background: '#F3F4F6', borderRadius: 99, overflow: 'hidden', marginTop: 8 }}>
              <div style={{
                width: `${Math.min(weeklyMins / 300 * 100, 100)}%`, height: '100%',
                background: weeklyMins >= 300 ? 'linear-gradient(90deg,#059669,#10B981)' : 'linear-gradient(90deg,#2563EB,#4F46E5)',
                borderRadius: 99, transition: 'width .6s',
              }} />
            </div>
          </div>
        </div>
      </div>

      {/* ── RECENT ACTIVITY TIMELINE ─────────────────────────────── */}
      <div className="card">
        <div className="ch" style={{ marginBottom: 16 }}>
          <div className="ct">🕐 Recent Activity</div>
          <span style={{ fontSize: 12, color: '#9CA3AF' }}>Last {recentActivity.length} actions</span>
        </div>

        {recentActivity.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#9CA3AF', fontSize: 13, padding: '20px 0' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>📭</div>
            No activity recorded yet. Start reading or taking quizzes!
          </div>
        ) : (
          <div style={{ position: 'relative', paddingLeft: 24 }}>
            {/* Vertical timeline line */}
            <div style={{
              position: 'absolute', left: 9, top: 8, bottom: 8,
              width: 2, background: 'linear-gradient(180deg,#2563EB,#E5E7EB)',
              borderRadius: 2,
            }} />

            {recentActivity.map((log, i) => {
              const meta = ACTIVITY_META[log.activity_type] || { icon: '📌', label: log.activity_type };
              const isLast = i === recentActivity.length - 1;
              return (
                <div
                  key={i}
                  style={{
                    display: 'flex', alignItems: 'flex-start', gap: 14,
                    paddingBottom: isLast ? 0 : 16, position: 'relative',
                  }}
                >
                  {/* Timeline dot */}
                  <div style={{
                    width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                    background: i === 0 ? '#2563EB' : '#E5E7EB',
                    border: i === 0 ? '3px solid #BFDBFE' : '2px solid #D1D5DB',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 10, marginLeft: -11, zIndex: 1,
                  }}>
                    {i === 0 && <div style={{ width: 6, height: 6, background: '#fff', borderRadius: '50%' }} />}
                  </div>

                  {/* Content */}
                  <div style={{
                    flex: 1, background: i === 0 ? '#EFF6FF' : 'var(--surf)',
                    borderRadius: 10, padding: '10px 14px',
                    border: i === 0 ? '1px solid #BFDBFE' : '1px solid var(--border)',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                      <span style={{ fontSize: 16 }}>{meta.icon}</span>
                      <span style={{ fontSize: 13, fontWeight: i === 0 ? 700 : 500, color: 'var(--text)' }}>
                        {meta.label}
                      </span>
                      {i === 0 && (
                        <span style={{ fontSize: 10, background: '#2563EB', color: '#fff', borderRadius: 99, padding: '1px 7px', fontWeight: 700 }}>
                          Latest
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 11, color: '#9CA3AF' }}>{fmtDate(log.created_at)}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}
