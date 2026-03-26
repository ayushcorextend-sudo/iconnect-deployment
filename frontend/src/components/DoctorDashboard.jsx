import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase, getUserContentStates, toggleBookmark, getDiaryEntriesRange } from '../lib/supabase';
import { useAppStore } from '../stores/useAppStore';
import { getPersonalizedSuggestions } from '../lib/aiService';
import { getCached, setCached, invalidate } from '../lib/dataCache';
import { defaultSuggestions } from '../mocks';
import { SAMessageBox } from './BroadcastPage';

import LatestAlerts from './dashboard/LatestAlerts';
import MyActivitySection from './dashboard/MyActivitySection';
import ForYouWidget from './dashboard/ForYouWidget';
import StudyPlanCard from './dashboard/StudyPlanCard';
import CalendarGoalRow from './dashboard/CalendarGoalRow';
import WebinarLeaderboardRow from './dashboard/WebinarLeaderboardRow';
import LatestContentSection from './dashboard/LatestContentSection';
import ReadingBookmarksRow from './dashboard/ReadingBookmarksRow';

// Module-level stale-while-revalidate cache (2-min TTL, keyed by userId)
const _dashCache = new Map(); // uid → { data, ts }
const DASH_CACHE_TTL = 2 * 60 * 1000;

export default function DoctorDashboard({ artifacts = [], notifications = [], setPage, userName, openChatBotDoubt, userId: userIdProp, darkMode }) {
  const approved = artifacts.filter(a => a.status === 'approved');
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
  const [contentStates, setContentStates] = useState({});
  const [currentUserId, setCurrentUserId] = useState(null);
  const [dashLoading, setDashLoading] = useState(true);
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
  const [activePlan, setActivePlan] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [dashError, setDashError] = useState(null);

  // Ref so refreshForYou can access latest computed values without stale closure
  const dashDataRef = useRef({ booksRead: 0, quizScore: 0, totalScore: 0, weeklyMins: 0, lastActive: null, recentSubjects: [] });

  // ── Cross-page diary sync via Zustand diaryCache ─────────────────────────
  // When JournalModal saves a diary entry (from any page), it writes to
  // diaryCache. We watch that here and merge new dates into activityByDate
  // immediately, so the heatmap reflects the change without a full reload.
  const diaryCache = useAppStore(s => s.diaryCache);
  useEffect(() => {
    if (Object.keys(diaryCache).length === 0) return;
    setActivityByDate(prev => {
      let changed = false;
      const next = { ...prev };
      Object.entries(diaryCache).forEach(([date, data]) => {
        if (data.study_hours > 0 && !next[date]) {
          next[date] = 1;
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [diaryCache]);

  useEffect(() => {
    async function load() { // eslint-disable-line no-shadow
      try {
        // Use userId passed from parent (via AuthStore in App.jsx) — no extra auth round-trip
        const uid = userIdProp;
        if (!uid) return;
        setCurrentUserId(uid);

        // ── Skip re-fetch if cache is fresh (< 2 min) ───────
        const cached = _dashCache.get(uid);
        if (cached && Date.now() - cached.ts < DASH_CACHE_TTL) {
          // Data already in state from previous mount — nothing to do
          setDashLoading(false);
          return;
        }

        // ── Fire all independent queries in parallel ───────
        const [profileRes, statesRes, scoresRes, logsRes, actLogsRes, artsRes, wbRes, planRes, lbProfilesRes] = await Promise.all([
          supabase.from('profiles').select('speciality').eq('id', uid).maybeSingle(),
          getUserContentStates(uid),
          supabase.from('user_scores').select('user_id, total_score, quiz_score, reading_score')
            .order('total_score', { ascending: false }).limit(5),
          supabase.from('activity_logs').select('activity_type, duration_minutes, created_at')
            .eq('user_id', uid).order('created_at', { ascending: false }).limit(2000),
          supabase.from('activity_logs').select('reference_id')
            .eq('user_id', uid).eq('activity_type', 'article_read'),
          supabase.from('artifacts').select('id, title, subject, emoji, pages')
            .eq('status', 'approved').limit(20),
          supabase.from('admin_webinars').select('*')
            .gte('scheduled_at', new Date().toISOString()).order('scheduled_at').limit(1),
          supabase.from('study_plan_history').select('id, plan, completed_tasks')
            .eq('user_id', uid).eq('is_active', true).order('created_at', { ascending: false }).limit(1),
          supabase.from('profiles').select('id, name, speciality, college').limit(20),
        ]);

        const profileData = profileRes.data;
        const states      = statesRes;
        const scoreData   = scoresRes.data;
        const logs        = logsRes.data;
        const actLogs     = actLogsRes.data;
        const arts        = artsRes.data;
        const wb          = wbRes.data;
        const activePlanData = planRes.data?.[0] || null;

        // ── Profile ────────────────────────────────────────
        if (profileData?.speciality) setMySpeciality(profileData.speciality);
        setContentStates(states);

        // ── Scores & Leaderboard ──────────────────────────
        const lbProfiles = lbProfilesRes.data;
        if (scoreData?.length) {
          const profileMap = (lbProfiles || []).reduce((acc, p) => { acc[p.id] = p; return acc; }, {});

          const mapped = scoreData.map(row => ({
            id: row.user_id,
            name: profileMap[row.user_id]?.name || 'Anonymous',
            speciality: profileMap[row.user_id]?.speciality || '—',
            score: row.total_score || 0,
            isMe: row.user_id === uid,
          }));
          setMiniLB(mapped);

          const meScore = scoreData.find(d => d.user_id === uid);
          if (meScore) {
            setMyScore(meScore.total_score || 0);
            setMyQuizPts(meScore.quiz_score || 0);
            setMyReadPts(meScore.reading_score || 0);
            setMyRank(mapped.findIndex(r => r.isMe) + 1);
          }
        }

        // ── Activity stats ────────────────────────────────
        if (logs) {
          const readCount = logs.filter(l => l.activity_type === 'article_read').length;
          setBooksRead(readCount);

          const totalMins = logs.reduce((acc, l) => acc + (l.duration_minutes || 0), 0);
          setHoursStudied(Math.round(totalMins / 60));

          const now = new Date();
          const weekDays = Array(7).fill(0);
          logs.forEach(l => {
            const d = new Date(l.created_at);
            if (Math.floor((now - d) / 86400000) < 7) {
              const dow = (d.getDay() + 6) % 7;
              weekDays[dow] += 1;
            }
          });
          setWeekActivity(weekDays);

          const byDate = {};
          logs.forEach(l => {
            const dateStr = new Date(l.created_at).toISOString().split('T')[0];
            byDate[dateStr] = (byDate[dateStr] || 0) + 1;
          });
          // Merge diary entries into heatmap
          const ninetyDaysAgo = new Date(Date.now() - 90 * 86400000).toISOString().split('T')[0];
          const { data: diaryEntries } = await getDiaryEntriesRange(uid, ninetyDaysAgo);
          (diaryEntries || []).forEach(d => {
            if (d.study_hours) byDate[d.date] = (byDate[d.date] || 0) + 1;
          });

          setActivityByDate(byDate);
          setRecentActivities(logs.slice(0, 5));

          const weekStart = new Date(now - 7 * 86400000);
          const wMins = logs
            .filter(l => new Date(l.created_at) >= weekStart)
            .reduce((acc, l) => acc + (l.duration_minutes || 0), 0);
          setWeeklyMins(wMins);
        } else {
          setWeekActivity([0, 0, 0, 0, 0, 0, 0]);
          setActivityByDate({});
          setRecentActivities([]);
        }

        // ── Recommendations ───────────────────────────────
        const readIds = new Set((actLogs || []).map(l => l.reference_id));
        const unreadArts = (arts || []).filter(a => !readIds.has(String(a.id)));
        setRecommendations(unreadArts.sort(() => Math.random() - 0.5).slice(0, 3));

        // ── Next Webinar ──────────────────────────────────
        setNextWebinar(wb?.[0] || null);

        // ── Active Study Plan ─────────────────────────────
        setActivePlan(activePlanData);

        // ── AI "For You" (async, non-blocking) ────────────
        const meScore = scoreData?.find(d => d.user_id === uid);
        const readCount = logs ? logs.filter(l => l.activity_type === 'article_read').length : 0;
        const wMinsForAI = logs
          ? logs.filter(l => new Date(l.created_at) >= new Date(Date.now() - 7 * 86400000))
               .reduce((acc, l) => acc + (l.duration_minutes || 0), 0)
          : 0;
        const recentSubjectsSet = new Set(
          (arts || []).filter(a => (actLogs || []).some(l => l.reference_id === String(a.id))).map(a => a.subject).filter(Boolean)
        );
        const recentSubjects = Array.from(recentSubjectsSet).slice(0, 5);

        // Persist to ref so refreshForYou always has fresh data
        dashDataRef.current = {
          booksRead: readCount,
          quizScore: meScore?.quiz_score || 0,
          totalScore: meScore?.total_score || 0,
          weeklyMins: wMinsForAI,
          lastActive: logs?.[0]?.created_at || null,
          recentSubjects,
        };

        const forYouCacheKey = `forYou_${uid}_${readCount}_${meScore?.total_score || 0}`;
        const cachedForYou = getCached(forYouCacheKey);
        if (cachedForYou) {
          setAiForYou({ loading: false, items: cachedForYou, error: null });
        } else {
          getPersonalizedSuggestions({
            speciality: profileData?.speciality || '',
            ...dashDataRef.current,
          }).then(({ suggestions, error }) => {
            const items = suggestions || defaultSuggestions;
            setCached(forYouCacheKey, items, 5 * 60 * 1000);
            setAiForYou({ loading: false, items, error: error || null });
          });
        }

        // ── Cache fresh data for stale-while-revalidate ───
        _dashCache.set(uid, {
          ts: Date.now(),
          data: { profileData, states, scoreData, logs, actLogs, arts, wb, activePlanData, lbProfiles },
        });

      } catch (e) {
        console.warn('Dashboard load failed:', e.message);
        setDashError('Dashboard data failed to load. Please refresh or try again.');
      } finally {
        setDashLoading(false);
      }
    }
    load();
  }, [refreshKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const refreshForYou = useCallback(async () => {
    if (!currentUserId) return;
    setAiForYou({ loading: true, items: [], error: null });
    try {
      // mySpeciality is already in state from load() — no redundant profile fetch needed
      const { suggestions, error } = await getPersonalizedSuggestions({
        speciality: mySpeciality,
        ...dashDataRef.current,
      });
      const items = suggestions || defaultSuggestions;
      const { booksRead: br, totalScore: ts } = dashDataRef.current;
      setCached(`forYou_${currentUserId}_${br}_${ts}`, items, 5 * 60 * 1000);
      setAiForYou({ loading: false, items, error: error || null });
    } catch (e) {
      console.warn('DoctorDashboard: refreshForYou failed:', e.message);
      setAiForYou({ loading: false, items: defaultSuggestions, error: 'Could not refresh suggestions.' });
    }
  }, [currentUserId, mySpeciality]);

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
    } catch (e) {
      console.warn('DoctorDashboard: failed to toggle bookmark:', e.message);
      setContentStates(prev => ({
        ...prev,
        [key]: { ...prev[key], isBookmarked: !newVal },
      }));
    }
  };

  const handleSetReminder = async () => {
    if (!nextWebinar || reminderSaving) return;
    setReminderSaving(true);
    try {
      const uid = userIdProp;
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
    } catch (e) { console.warn('DoctorDashboard: failed to set reminder:', e.message); }
    setReminderSaving(false);
  };

  const recentlyRead = useMemo(
    () => approved.filter(a => (contentStates[String(a.id)]?.currentPage || 1) > 1).slice(0, 3),
    [approved, contentStates]
  );
  const bookmarked = useMemo(
    () => approved.filter(a => contentStates[String(a.id)]?.isBookmarked).slice(0, 3),
    [approved, contentStates]
  );

  // Resolve userId: prefer prop (passed from App), fallback to state
  const resolvedUserId = userIdProp || currentUserId;

  // Stable callback for CalendarGoalRow — no new ref each render
  const refreshDashboard = useCallback(() => {
    _dashCache.delete(resolvedUserId);
    setRefreshKey(k => k + 1);
  }, [resolvedUserId]);

  // Stable callback for handleBookmarkToggle
  const stableBookmarkToggle = useCallback((e, artifactId) => {
    handleBookmarkToggle(e, artifactId);
  }, [currentUserId, contentStates]); // eslint-disable-line react-hooks/exhaustive-deps

  // Guard: if userId not yet available, show loading instead of crashing
  if (!resolvedUserId) {
    return (
      <div className="page" style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
        <div style={{ width: 36, height: 36, borderRadius: '50%', border: '3px solid var(--border)', borderTopColor: '#4F46E5', animation: 'spin 0.8s linear infinite' }} />
      </div>
    );
  }

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

      {dashError && (
        <div className="bg-red-50 border border-red-300 rounded-xl px-4 py-3 mb-4 flex items-center justify-between gap-3">
          <span className="text-sm text-red-600">⚠️ {dashError}</span>
          <button
            onClick={() => { setDashError(null); setRefreshKey(k => k + 1); }}
            className="bg-red-600 text-white border-0 rounded-md px-3 py-1 text-xs font-semibold cursor-pointer whitespace-nowrap hover:bg-red-700 transition-colors"
          >Retry</button>
        </div>
      )}

      <LatestAlerts notifications={notifications} setPage={setPage} />

      <MyActivitySection
        dashLoading={dashLoading}
        myScore={myScore}
        booksRead={booksRead}
        hoursStudied={hoursStudied}
        myQuizPts={myQuizPts}
        myReadPts={myReadPts}
        weekActivity={weekActivity}
        recentActivities={recentActivities}
        setPage={setPage}
      />

      <ForYouWidget
        aiForYou={aiForYou}
        recommendations={recommendations}
        refreshForYou={refreshForYou}
        openChatBotDoubt={openChatBotDoubt}
        setPage={setPage}
      />

      <StudyPlanCard
        dashLoading={dashLoading}
        studyPlan={studyPlan}
        setStudyPlan={setStudyPlan}
        mySpeciality={mySpeciality}
        booksRead={booksRead}
        myQuizPts={myQuizPts}
        myScore={myScore}
        setPage={setPage}
        activePlan={activePlan}
      />

      <CalendarGoalRow
        dashLoading={dashLoading}
        activityByDate={activityByDate}
        weeklyMins={weeklyMins}
        currentUserId={currentUserId}
        refreshDashboard={refreshDashboard}
      />

      <WebinarLeaderboardRow
        nextWebinar={nextWebinar}
        currentUserId={resolvedUserId}
        reminderPopover={reminderPopover}
        setReminderPopover={setReminderPopover}
        reminderLeadMins={reminderLeadMins}
        setReminderLeadMins={setReminderLeadMins}
        reminderChannels={reminderChannels}
        setReminderChannels={setReminderChannels}
        reminderSaving={reminderSaving}
        handleSetReminder={handleSetReminder}
        myRank={myRank}
        myScore={myScore}
        myQuizPts={myQuizPts}
        myReadPts={myReadPts}
        miniLB={miniLB}
        setPage={setPage}
      />

      <LatestContentSection
        latestContent={latestContent}
        contentStates={contentStates}
        handleBookmarkToggle={stableBookmarkToggle}
        setPage={setPage}
      />

      <ReadingBookmarksRow
        recentlyRead={recentlyRead}
        bookmarked={bookmarked}
        contentStates={contentStates}
        setPage={setPage}
      />
    </div>
  );
}
