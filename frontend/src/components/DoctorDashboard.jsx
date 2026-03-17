import { useState, useEffect, useCallback } from 'react';
import Avatar from './Avatar';
import { supabase, getUserContentStates, toggleBookmark } from '../lib/supabase';
import { generateStudyPlan, getPersonalizedSuggestions } from '../lib/aiService';
import { getCached, setCached, invalidate } from '../lib/dataCache';
import { defaultSuggestions } from '../mocks';
import AIResponseBox from './AIResponseBox';
import { SAMessageBox } from './BroadcastPage';

// ── Monthly Activity Calendar ────────────────────────────────
const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAY_LABELS_SHORT = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

function MonthlyCalendar({ activityByDate = {} }) {
  const [viewDate, setViewDate] = useState(() => new Date());
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDow = (firstDay.getDay() + 6) % 7; // Mon=0

  const cells = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= lastDay.getDate(); d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const today = new Date();
  const isThisMonth = today.getFullYear() === year && today.getMonth() === month;
  const COLORS = ['transparent', '#BFDBFE', '#93C5FD', '#3B82F6', '#1D4ED8'];

  const totalThisMonth = Object.entries(activityByDate)
    .filter(([k]) => k.startsWith(`${year}-${String(month + 1).padStart(2, '0')}`))
    .reduce((sum, [, v]) => sum + v, 0);

  return (
    <div>
      {/* Nav */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <button
          onClick={() => setViewDate(new Date(year, month - 1, 1))}
          style={{ background: 'none', border: '1px solid #E5E7EB', borderRadius: 6, width: 28, height: 28, cursor: 'pointer', fontSize: 13, color: '#6B7280', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >‹</button>
        <div style={{ fontWeight: 700, fontSize: 13, color: '#111827' }}>{MONTH_NAMES[month]} {year}</div>
        <button
          onClick={() => setViewDate(new Date(year, month + 1, 1))}
          disabled={isThisMonth}
          style={{ background: 'none', border: '1px solid #E5E7EB', borderRadius: 6, width: 28, height: 28, cursor: isThisMonth ? 'not-allowed' : 'pointer', fontSize: 13, color: isThisMonth ? '#D1D5DB' : '#6B7280', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >›</button>
      </div>

      {/* Day labels */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 4 }}>
        {DAY_LABELS_SHORT.map(d => (
          <div key={d} style={{ textAlign: 'center', fontSize: 9, color: '#9CA3AF', fontWeight: 700, padding: '2px 0' }}>{d}</div>
        ))}
      </div>

      {/* Date cells */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3 }}>
        {cells.map((d, i) => {
          if (d === null) return <div key={`e-${i}`} style={{ aspectRatio: '1' }} />;
          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
          const count = activityByDate[dateStr] || 0;
          const isToday = isThisMonth && d === today.getDate();
          const intensity = count === 0 ? 0 : Math.min(4, Math.ceil(count / 1.5));
          return (
            <div
              key={d}
              title={count > 0 ? `${count} activit${count !== 1 ? 'ies' : 'y'}` : dateStr}
              style={{
                aspectRatio: '1',
                borderRadius: 5,
                background: isToday ? '#2563EB' : count > 0 ? COLORS[intensity] : '#F9FAFB',
                border: isToday ? '2px solid #1D4ED8' : count > 0 ? '1px solid rgba(37,99,235,0.15)' : '1px solid #F3F4F6',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 10, fontWeight: isToday ? 800 : 500,
                color: isToday ? '#fff' : intensity >= 3 ? '#1E3A8A' : '#374151',
                transition: 'transform .1s',
                cursor: 'default',
                position: 'relative',
              }}
            >
              {d}
              {count > 0 && !isToday && (
                <div style={{
                  position: 'absolute', bottom: 2, left: '50%', transform: 'translateX(-50%)',
                  width: 4, height: 4, borderRadius: '50%', background: '#2563EB',
                }} />
              )}
            </div>
          );
        })}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ fontSize: 9, color: '#9CA3AF' }}>Less</span>
          {COLORS.slice(1).map((c, i) => <div key={i} style={{ width: 9, height: 9, background: c, borderRadius: 2, border: '1px solid rgba(37,99,235,0.15)' }} />)}
          <span style={{ fontSize: 9, color: '#9CA3AF' }}>More</span>
        </div>
        <span style={{ fontSize: 10, color: '#9CA3AF' }}>{totalThisMonth} activities this month</span>
      </div>
    </div>
  );
}

// ── Weekly goal ring (SVG) — editable target ──────────────────
function GoalRing({ mins, userId }) {
  const STORAGE_KEY = userId ? `weekly_target_${userId}` : 'weekly_target_mins';
  const [targetMins, setTargetMins] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? parseInt(saved, 10) : 300;
  });
  const [editing, setEditing] = useState(false);
  const [inputVal, setInputVal] = useState(String(Math.round(targetMins / 60)));

  const saveTarget = () => {
    const hours = parseFloat(inputVal) || 5;
    const clamped = Math.max(0.5, Math.min(24, hours));
    const newMins = Math.round(clamped * 60);
    setTargetMins(newMins);
    localStorage.setItem(STORAGE_KEY, String(newMins));
    setEditing(false);
  };

  const r = 38;
  const circ = 2 * Math.PI * r;
  const pct = Math.min(mins / Math.max(targetMins, 1), 1);
  const offset = circ * (1 - pct);
  const hours = Math.floor(mins / 60);
  const m = mins % 60;
  const label = hours > 0 ? `${hours}h${m > 0 ? ` ${m}m` : ''}` : `${mins}m`;
  const color = pct >= 1 ? '#059669' : pct >= 0.6 ? '#D97706' : '#2563EB';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, width: '100%' }}>
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
      <div style={{ fontSize: 11, fontWeight: 700, color: '#374151' }}>Weekly Learning Target</div>
      {editing ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
          <input
            type="number"
            min="0.5" max="24" step="0.5"
            value={inputVal}
            onChange={e => setInputVal(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') saveTarget(); if (e.key === 'Escape') setEditing(false); }}
            autoFocus
            style={{
              width: 54, padding: '4px 8px', borderRadius: 6, border: '1.5px solid #4F46E5',
              fontSize: 12, fontWeight: 600, textAlign: 'center', outline: 'none',
            }}
          />
          <span style={{ fontSize: 11, color: '#6B7280' }}>hrs</span>
          <button
            onClick={saveTarget}
            style={{ background: '#4F46E5', color: '#fff', border: 'none', borderRadius: 6, padding: '4px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
          >✓</button>
          <button
            onClick={() => setEditing(false)}
            style={{ background: '#F3F4F6', color: '#6B7280', border: 'none', borderRadius: 6, padding: '4px 8px', fontSize: 11, cursor: 'pointer' }}
          >✕</button>
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ fontSize: 10, color: '#9CA3AF' }}>{Math.round(mins / 60 * 10) / 10}h of {Math.round(targetMins / 60 * 10) / 10}h target</div>
          <button
            onClick={() => { setInputVal(String(Math.round(targetMins / 60))); setEditing(true); }}
            title="Edit weekly target"
            style={{ background: 'none', border: '1px solid #E5E7EB', borderRadius: 5, padding: '2px 7px', fontSize: 10, color: '#6B7280', cursor: 'pointer' }}
          >✏ Edit</button>
        </div>
      )}
      {pct >= 1 && !editing && <div style={{ fontSize: 11, color: '#059669', fontWeight: 600 }}>🎉 Goal achieved!</div>}
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

export default function DoctorDashboard({ artifacts = [], notifications = [], setPage, userName, openChatBotDoubt, userId: userIdProp, darkMode }) {
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
  const [activityByDate, setActivityByDate] = useState({});
  const [weeklyMins, setWeeklyMins] = useState(0);
  const [recentActivities, setRecentActivities] = useState([]);
  const [studyPlan, setStudyPlan] = useState({ loading: false, text: null, error: null });
  const [mySpeciality, setMySpeciality] = useState('');
  const [aiForYou, setAiForYou] = useState({ loading: true, items: [], error: null });
  const [reminderPopover, setReminderPopover] = useState(false);
  const [reminderLeadMins, setReminderLeadMins] = useState(60);
  const [reminderChannels, setReminderChannels] = useState(['in_app']);
  const [reminderSaving, setReminderSaving] = useState(false);

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

          // 35-day heatmap (kept for count display)
          const heatmap = Array(35).fill(0);
          const byDate = {};
          logs.forEach(l => {
            const diffDays = Math.floor((now - new Date(l.created_at)) / 86400000);
            if (diffDays < 35) heatmap[34 - diffDays]++;
            const dateStr = new Date(l.created_at).toISOString().split('T')[0];
            byDate[dateStr] = (byDate[dateStr] || 0) + 1;
          });
          setHeatmapData(heatmap);
          setActivityByDate(byDate);

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

        // ── AI Personalised "For You" suggestions (async, non-blocking) ──────
        const recentSubjectsSet = new Set(
          (arts || []).filter(a => readIds.has(String(a.id))).map(a => a.subject).filter(Boolean)
        );
        const lastActivityLog = logs?.[0];
        const forYouCacheKey = `forYou_${uid}`;
        const cached = getCached(forYouCacheKey);
        if (cached) {
          setAiForYou({ loading: false, items: cached, error: null });
        } else {
          getPersonalizedSuggestions({
            speciality: profileData?.speciality || '',
            booksRead: logs ? logs.filter(l => l.activity_type === 'article_read').length : 0,
            quizScore: 0,
            totalScore: 0,
            weeklyMins: 0,
            lastActive: lastActivityLog?.created_at || null,
            recentSubjects: Array.from(recentSubjectsSet).slice(0, 5),
          }).then(({ suggestions, error }) => {
            const items = suggestions || defaultSuggestions;
            setCached(forYouCacheKey, items, 10 * 60 * 1000); // 10-min TTL
            setAiForYou({ loading: false, items, error: error || null });
          });
        }

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

  const refreshForYou = useCallback(async () => {
    if (!currentUserId) return;
    setAiForYou({ loading: true, items: [], error: null });
    invalidate(`forYou_${currentUserId}`);
    const { data: profileData } = await supabase.from('profiles').select('speciality').eq('id', currentUserId).maybeSingle();
    const { suggestions, error } = await getPersonalizedSuggestions({
      speciality: profileData?.speciality || '',
      booksRead: 0, quizScore: 0, totalScore: 0, weeklyMins: 0, lastActive: null, recentSubjects: [],
    });
    const items = suggestions || defaultSuggestions;
    setCached(`forYou_${currentUserId}`, items, 10 * 60 * 1000);
    setAiForYou({ loading: false, items, error: error || null });
  }, [currentUserId]);

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

  const handleSetReminder = async () => {
    if (!nextWebinar || reminderSaving) return;
    setReminderSaving(true);
    try {
      const { data: authData } = await supabase.auth.getUser();
      const uid = authData?.user?.id;
      if (!uid) return;
      const webinarTime = new Date(nextWebinar.scheduled_at);
      const remindAt = new Date(webinarTime.getTime() - reminderLeadMins * 60 * 1000);
      await supabase.from('user_reminders').insert([{
        user_id: uid,
        webinar_id: nextWebinar.id,
        remind_at: remindAt.toISOString(),
        lead_minutes: reminderLeadMins,
        channels: reminderChannels,
      }]);
      setReminderPopover(false);
    } catch (_) {}
    setReminderSaving(false);
  };

  const recentlyRead = approved.filter(a => (contentStates[String(a.id)]?.currentPage || 1) > 1).slice(0, 3);
  const bookmarked = approved.filter(a => contentStates[String(a.id)]?.isBookmarked).slice(0, 3);

  // Resolve userId: prefer prop (passed from App), fallback to state
  const resolvedUserId = userIdProp || currentUserId;

  return (
    <div className="page">
      {/* SA Message Box — fixed floating, appears only when superadmin has broadcast */}
      <SAMessageBox userId={resolvedUserId} darkMode={darkMode} />

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
          SECTION 2: PERSONALISED "FOR YOU" AI WIDGET
      ───────────────────────────────────────────────────────────── */}
      <div style={{
        background: 'linear-gradient(135deg, #1E40AF 0%, #4F46E5 60%, #7C3AED 100%)',
        borderRadius: 16, padding: 20, marginBottom: 20, color: '#fff',
        boxShadow: '0 8px 32px rgba(79,70,229,0.25)',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10, flexShrink: 0,
              background: 'rgba(255,255,255,0.18)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
            }}>✨</div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 2, display: 'flex', alignItems: 'center', gap: 8 }}>
                For You
                <span style={{
                  fontSize: 10, fontWeight: 600, background: 'rgba(255,255,255,0.2)',
                  padding: '2px 8px', borderRadius: 99, letterSpacing: '0.5px',
                  border: '1px solid rgba(255,255,255,0.3)',
                }}>AI POWERED</span>
              </div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.65)' }}>Personalised just for you · updates on every login</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={refreshForYou}
              disabled={aiForYou.loading}
              title="Refresh suggestions"
              style={{
                background: 'rgba(255,255,255,0.12)', color: '#fff',
                border: '1px solid rgba(255,255,255,0.25)',
                borderRadius: 9, padding: '7px 10px', fontSize: 14,
                cursor: aiForYou.loading ? 'not-allowed' : 'pointer',
                opacity: aiForYou.loading ? 0.5 : 1,
                transition: 'background .2s',
              }}
              onMouseEnter={e => { if (!aiForYou.loading) e.currentTarget.style.background = 'rgba(255,255,255,0.22)'; }}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.12)'}
            >🔄</button>
            <button
              onClick={() => { if (openChatBotDoubt) openChatBotDoubt(); }}
              style={{
                background: 'rgba(255,255,255,0.15)', color: '#fff',
                border: '1px solid rgba(255,255,255,0.3)',
                borderRadius: 9, padding: '7px 16px', fontSize: 12,
                fontWeight: 600, cursor: 'pointer', backdropFilter: 'blur(4px)',
                display: 'flex', alignItems: 'center', gap: 6,
                transition: 'background .2s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.25)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}
            >
              🤖 Ask AI
            </button>
          </div>
        </div>

        {/* AI-generated personalised suggestions */}
        {aiForYou.loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[1, 2, 3].map(i => (
              <div key={i} style={{
                background: 'rgba(255,255,255,0.1)',
                borderRadius: 11, padding: '12px 14px',
                display: 'flex', alignItems: 'center', gap: 12,
                animation: 'pulse 1.5s ease-in-out infinite',
              }}>
                <div style={{ width: 38, height: 38, borderRadius: 9, background: 'rgba(255,255,255,0.12)', flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ height: 11, background: 'rgba(255,255,255,0.12)', borderRadius: 5, width: '70%', marginBottom: 7 }} />
                  <div style={{ height: 9, background: 'rgba(255,255,255,0.08)', borderRadius: 5, width: '50%' }} />
                </div>
                <div style={{ width: 52, height: 20, borderRadius: 99, background: 'rgba(255,255,255,0.1)' }} />
              </div>
            ))}
            <div style={{ textAlign: 'center', fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 4 }}>
              ✨ AI is personalising your suggestions…
            </div>
          </div>
        ) : aiForYou.items.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {aiForYou.items.map((s, i) => {
              const tagColors = {
                'Weak Area':   { bg: 'rgba(239,68,68,0.25)',  text: '#FCA5A5', border: 'rgba(239,68,68,0.4)' },
                'Due Today':   { bg: 'rgba(245,158,11,0.25)', text: '#FCD34D', border: 'rgba(245,158,11,0.4)' },
                'High Yield':  { bg: 'rgba(16,185,129,0.25)', text: '#6EE7B7', border: 'rgba(16,185,129,0.4)' },
                'Quick Win':   { bg: 'rgba(59,130,246,0.25)', text: '#93C5FD', border: 'rgba(59,130,246,0.4)' },
                'Streak Risk': { bg: 'rgba(239,68,68,0.2)',   text: '#FCA5A5', border: 'rgba(239,68,68,0.35)' },
                'Trending':    { bg: 'rgba(168,85,247,0.25)', text: '#C4B5FD', border: 'rgba(168,85,247,0.4)' },
              };
              const tc = tagColors[s.tag] || { bg: 'rgba(255,255,255,0.12)', text: '#E2E8F0', border: 'rgba(255,255,255,0.25)' };
              return (
                <div
                  key={i}
                  onClick={() => setPage(s.action || 'ebooks')}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    background: 'rgba(255,255,255,0.1)',
                    borderRadius: 11, padding: '11px 14px',
                    cursor: 'pointer', transition: 'background .2s, transform .15s',
                    border: '1px solid rgba(255,255,255,0.12)',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.18)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.transform = 'none'; }}
                >
                  <div style={{
                    width: 38, height: 38, borderRadius: 9, flexShrink: 0,
                    background: 'rgba(255,255,255,0.15)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
                    border: '1px solid rgba(255,255,255,0.2)',
                  }}>
                    {s.icon || '📚'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 3 }}>
                      {s.title}
                    </div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {s.reason}
                    </div>
                  </div>
                  <div style={{
                    padding: '3px 9px', borderRadius: 99, fontSize: 10, fontWeight: 700,
                    background: tc.bg, color: tc.text, border: `1px solid ${tc.border}`,
                    whiteSpace: 'nowrap', flexShrink: 0, letterSpacing: '0.3px',
                  }}>
                    {s.tag}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Fallback: mock default suggestions when AI fails */
          recommendations.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {defaultSuggestions.map((s, i) => (
                <div
                  key={i}
                  onClick={() => setPage(s.action || 'ebooks')}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    background: 'rgba(255,255,255,0.1)', borderRadius: 11, padding: '11px 14px',
                    cursor: 'pointer', transition: 'background .2s',
                    border: '1px solid rgba(255,255,255,0.12)',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.18)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                >
                  <div style={{ width: 38, height: 38, borderRadius: 9, flexShrink: 0, background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, border: '1px solid rgba(255,255,255,0.2)' }}>
                    {s.icon || '📚'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 3 }}>{s.title}</div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.reason}</div>
                  </div>
                  <div style={{ padding: '3px 9px', borderRadius: 99, fontSize: 10, fontWeight: 700, background: 'rgba(255,255,255,0.12)', color: '#E2E8F0', border: '1px solid rgba(255,255,255,0.25)', whiteSpace: 'nowrap', flexShrink: 0 }}>
                    {s.tag || 'High Yield'}
                  </div>
                </div>
              ))}
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
          )
        )}

        {/* Bottom divider + unread content picks */}
        {!aiForYou.loading && recommendations.length > 0 && aiForYou.items.length > 0 && (
          <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.12)' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.5)', marginBottom: 8, letterSpacing: '0.5px' }}>
              ALSO UNREAD FOR YOU
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {recommendations.map(r => (
                <div
                  key={r.id}
                  onClick={() => setPage('ebooks')}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 7,
                    background: 'rgba(255,255,255,0.1)', borderRadius: 8,
                    padding: '6px 10px', cursor: 'pointer',
                    border: '1px solid rgba(255,255,255,0.12)',
                    transition: 'background .15s', fontSize: 12,
                    color: 'rgba(255,255,255,0.85)',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.18)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                >
                  <span style={{ fontSize: 14 }}>{r.emoji || '📖'}</span>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 140 }}>
                    {r.title}
                  </span>
                </div>
              ))}
            </div>
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
              <div style={{ marginTop: 10 }}>
                <button
                  onClick={() => setPage('study-plan')}
                  style={{ background: 'none', border: 'none', color: '#6366F1', fontSize: 12, cursor: 'pointer', fontWeight: 600, textDecoration: 'underline' }}
                >
                  📋 Open full Study Plan Engine →
                </button>
              </div>
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
          {studyPlan.text && (
            <div style={{ marginTop: 12, textAlign: 'right' }}>
              <button
                onClick={() => setPage('study-plan')}
                style={{ background: 'none', border: 'none', color: '#6366F1', fontSize: 12, cursor: 'pointer', fontWeight: 600, textDecoration: 'underline' }}
              >
                📋 Open full Study Plan Engine →
              </button>
            </div>
          )}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          SECTION 2.5: ACTIVITY CALENDAR & WEEKLY GOAL
      ───────────────────────────────────────────────────────────── */}
      {!dashLoading && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16, marginBottom: 20 }}>
          <div className="card" style={{ margin: 0 }}>
            <div className="ch" style={{ marginBottom: 12 }}>
              <div className="ct">📅 Activity Calendar</div>
            </div>
            <MonthlyCalendar activityByDate={activityByDate} />
          </div>
          <div className="card" style={{ margin: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <div className="ch" style={{ marginBottom: 12, width: '100%' }}>
              <div className="ct">🎯 Weekly Learning Target</div>
            </div>
            <GoalRing mins={weeklyMins} userId={currentUserId} />
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
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
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
                  <div style={{ fontSize: 12, color: '#9CA3AF' }}>Join link coming soon</div>
                )}
                <button
                  onClick={() => setReminderPopover(p => !p)}
                  style={{
                    padding: '8px 14px', borderRadius: 8,
                    background: reminderPopover ? '#F3F4F6' : '#FFFBEB',
                    border: '1px solid #FDE68A', fontSize: 12, fontWeight: 600,
                    cursor: 'pointer', color: '#92400E',
                  }}
                >
                  🔔 Remind Me
                </button>
              </div>
              {reminderPopover && (
                <div style={{
                  marginTop: 12, background: '#F9FAFB', borderRadius: 10,
                  border: '1px solid #E5E7EB', padding: '12px 14px',
                }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 8 }}>
                    Set a reminder
                  </div>
                  {/* Lead time */}
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
                    {[15, 60, 1440].map(mins => (
                      <button
                        key={mins}
                        onClick={() => setReminderLeadMins(mins)}
                        style={{
                          padding: '5px 12px', borderRadius: 8, fontSize: 11, fontWeight: 600,
                          border: reminderLeadMins === mins ? '2px solid #4F46E5' : '1.5px solid #E5E7EB',
                          background: reminderLeadMins === mins ? '#EEF2FF' : '#fff',
                          color: reminderLeadMins === mins ? '#4F46E5' : '#374151',
                          cursor: 'pointer',
                        }}
                      >
                        {mins === 15 ? '15 min' : mins === 60 ? '1 hour' : '1 day'} before
                      </button>
                    ))}
                  </div>
                  {/* Channels */}
                  <div style={{ fontSize: 11, color: '#6B7280', marginBottom: 6 }}>Notify via:</div>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                    {[['in_app', '🔔 In-App'], ['email', '📧 Email']].map(([ch, label]) => {
                      const active = reminderChannels.includes(ch);
                      return (
                        <label key={ch} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={active}
                            onChange={() => setReminderChannels(prev =>
                              active ? prev.filter(c => c !== ch) : [...prev, ch]
                            )}
                          />
                          {label}
                        </label>
                      );
                    })}
                  </div>
                  <button
                    onClick={handleSetReminder}
                    disabled={reminderSaving || reminderChannels.length === 0}
                    style={{
                      width: '100%', padding: '8px', borderRadius: 8, border: 'none',
                      background: reminderSaving || reminderChannels.length === 0 ? '#E5E7EB' : 'linear-gradient(135deg,#4F46E5,#7C3AED)',
                      color: reminderSaving || reminderChannels.length === 0 ? '#9CA3AF' : '#fff',
                      fontWeight: 700, fontSize: 12,
                      cursor: reminderSaving || reminderChannels.length === 0 ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {reminderSaving ? 'Saving…' : '✓ Save Reminder'}
                  </button>
                </div>
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

        {/* Leaderboard Rank — Flamboyant Edition */}
        <div style={{
          margin: 0, borderRadius: 16, overflow: 'hidden',
          boxShadow: myRank === 1 ? '0 8px 32px rgba(234,179,8,0.35), 0 2px 8px rgba(0,0,0,0.1)' : '0 4px 20px rgba(79,70,229,0.18)',
          border: myRank === 1 ? '1.5px solid rgba(234,179,8,0.4)' : '1.5px solid rgba(79,70,229,0.2)',
        }}>
          {/* Header banner */}
          <div style={{
            background: myRank === 1
              ? 'linear-gradient(135deg, #78350F 0%, #D97706 40%, #FCD34D 70%, #F59E0B 100%)'
              : myRank === 2
              ? 'linear-gradient(135deg, #374151 0%, #6B7280 50%, #9CA3AF 100%)'
              : myRank === 3
              ? 'linear-gradient(135deg, #7C2D12 0%, #C2410C 50%, #FB923C 100%)'
              : 'linear-gradient(135deg, #1E40AF 0%, #4F46E5 60%, #7C3AED 100%)',
            padding: '18px 16px 14px', position: 'relative', overflow: 'hidden',
          }}>
            {/* Sparkle decorations */}
            {myRank && myRank <= 3 && (
              <>
                <div style={{ position: 'absolute', top: 6, right: 12, fontSize: 22, opacity: 0.5, transform: 'rotate(15deg)' }}>✨</div>
                <div style={{ position: 'absolute', top: 20, right: 36, fontSize: 14, opacity: 0.4, transform: 'rotate(-10deg)' }}>⭐</div>
                <div style={{ position: 'absolute', bottom: 8, left: 14, fontSize: 16, opacity: 0.3 }}>🌟</div>
              </>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.75)', letterSpacing: '1px', marginBottom: 6, textTransform: 'uppercase' }}>Your Rank</div>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
                  <div style={{
                    fontSize: 52, fontWeight: 900, color: '#fff', lineHeight: 1,
                    textShadow: myRank === 1 ? '0 2px 12px rgba(0,0,0,0.3), 0 0 20px rgba(255,215,0,0.6)' : '0 2px 8px rgba(0,0,0,0.3)',
                    letterSpacing: '-2px',
                  }}>
                    {myRank ? `#${myRank}` : '—'}
                  </div>
                  {myRank && myRank <= 3 && (
                    <div style={{ fontSize: 32, marginBottom: 6 }}>
                      {myRank === 1 ? '🥇' : myRank === 2 ? '🥈' : '🥉'}
                    </div>
                  )}
                  {myRank === 1 && (
                    <div style={{ fontSize: 28, marginBottom: 4 }}>👑</div>
                  )}
                </div>
              </div>
              <button
                onClick={() => setPage('leaderboard')}
                style={{
                  background: 'rgba(255,255,255,0.2)', color: '#fff', border: '1px solid rgba(255,255,255,0.35)',
                  borderRadius: 8, padding: '6px 12px', fontSize: 11, fontWeight: 700, cursor: 'pointer',
                  backdropFilter: 'blur(4px)', whiteSpace: 'nowrap',
                }}
              >Full Board →</button>
            </div>
            <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
              <div style={{ background: 'rgba(255,255,255,0.18)', borderRadius: 8, padding: '5px 12px' }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: '#fff' }}>{myScore.toLocaleString()}</div>
                <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>TOTAL PTS</div>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.18)', borderRadius: 8, padding: '5px 12px' }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: '#fff' }}>{myQuizPts.toLocaleString()}</div>
                <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>QUIZ PTS</div>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.18)', borderRadius: 8, padding: '5px 12px' }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: '#fff' }}>{myReadPts.toLocaleString()}</div>
                <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>READ PTS</div>
              </div>
            </div>
          </div>

          {/* Mini top-3 leaderboard */}
          <div style={{ background: '#fff', padding: '12px 14px' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#9CA3AF', letterSpacing: '0.5px', marginBottom: 8 }}>TOP PERFORMERS</div>
            {miniLB.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '8px 0', color: '#9CA3AF', fontSize: 13 }}>
                No rankings yet. Start earning points!
              </div>
            ) : (
              miniLB.slice(0, 3).map((l, i) => (
                <div key={l.id} style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '7px 8px', marginBottom: 4,
                  borderRadius: 8,
                  background: l.isMe
                    ? 'linear-gradient(135deg, rgba(79,70,229,0.08), rgba(124,58,237,0.06))'
                    : i === 0 ? 'rgba(234,179,8,0.06)' : '#F9FAFB',
                  border: l.isMe ? '1.5px solid rgba(79,70,229,0.2)' : '1px solid #F3F4F6',
                }}>
                  <div style={{ width: 22, fontSize: 14, textAlign: 'center' }}>
                    {['🥇', '🥈', '🥉'][i]}
                  </div>
                  <Avatar name={l.name} size={26} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: l.isMe ? 700 : 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: l.isMe ? '#4F46E5' : '#111827' }}>
                      {l.name}{l.isMe ? ' ← You' : ''}
                    </div>
                    <div style={{ fontSize: 10, color: '#9CA3AF' }}>{l.speciality}</div>
                  </div>
                  <div style={{
                    fontSize: 12, fontWeight: 800, flexShrink: 0,
                    color: i === 0 ? '#D97706' : i === 1 ? '#6B7280' : '#C2410C',
                    background: i === 0 ? 'rgba(234,179,8,0.12)' : i === 1 ? 'rgba(107,114,128,0.1)' : 'rgba(194,65,12,0.1)',
                    borderRadius: 6, padding: '2px 8px',
                  }}>
                    {l.score.toLocaleString()}
                  </div>
                </div>
              ))
            )}
          </div>
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
