import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase, getUserContentStates, toggleBookmark, getDiaryEntriesRange } from '../lib/supabase';
import { dbRun, registerCache } from '../lib/dbService';
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

// BUG-C: _dashCache moved to a registered cache so it is cleared on logout.
// registerCache() ensures performLogout() will call _dashCache.clear() before
// signing out — preventing cross-user data exposure on shared devices.
const _dashCache = new Map(); // uid → { data, ts }
const DASH_CACHE_TTL = 2 * 60 * 1000;
registerCache(() => _dashCache.clear());

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
    const controller = new AbortController();
    const { signal } = controller;

    async function load() { // eslint-disable-line no-shadow
      try {
        // Use userId passed from parent (via AuthStore in App.jsx) — no extra auth round-trip
        const uid = userIdProp;
        if (!uid) return;
        setCurrentUserId(uid);

        // ── Skip re-fetch if cache is fresh (< 2 min) ───────
        // NOTE: React state is reset to zeros on every remount (navigate away → back).
        // So on a cache hit we MUST restore the processed values — not just skip loading.
        const cached = _dashCache.get(uid);
        if (cached && Date.now() - cached.ts < DASH_CACHE_TTL && cached.computed) {
          const c = cached.computed;
          setMySpeciality(c.mySpeciality || '');
          setContentStates(c.contentStates || {});
          setMiniLB(c.miniLB || []);
          setMyScore(c.myScore || 0);
          setMyQuizPts(c.myQuizPts || 0);
          setMyReadPts(c.myReadPts || 0);
          setMyRank(c.myRank || null);
          setHoursStudied(c.hoursStudied || 0);
          setWeeklyMins(c.weeklyMins || 0);
          setWeekActivity(c.weekActivity || [0,0,0,0,0,0,0]);
          setRecentActivities(c.recentActivities || []);
          setBooksRead(c.booksRead || 0);
          setActivityByDate(c.activityByDate || {});
          setRecommendations(c.recommendations || []);
          setNextWebinar(c.nextWebinar || null);
          setActivePlan(c.activePlan || null);
          setDashLoading(false);
          return;
        }

        const sevenDaysAgo   = new Date(Date.now() - 7  * 86400000).toISOString();
        const ninetyDaysAgo  = new Date(Date.now() - 90 * 86400000).toISOString();
        const ninetyDaysDate = ninetyDaysAgo.split('T')[0];

        // ── Group 1: KPI data — resolves first, unblocks visible cards ──────
        const [profileRes, statesRes, scoresRes, lbProfilesRes] = await Promise.all([
          dbRun(supabase.from('profiles').select('speciality').eq('id', uid).maybeSingle(), signal),
          getUserContentStates(uid),
          dbRun(supabase.from('user_scores').select('user_id, total_score, quiz_score, reading_score')
            .order('total_score', { ascending: false }).limit(5), signal),
          dbRun(supabase.from('profiles').select('id, name, speciality, college').limit(20), signal),
        ]);

        if ([profileRes, scoresRes, lbProfilesRes].some(r => r.status === 'aborted')) return;

        const profileData = profileRes.data;
        const states      = statesRes;
        let scoreData   = scoresRes.data || [];
        const lbProfiles  = lbProfilesRes.data;

        // ── Profile ────────────────────────────────────────
        if (profileData?.speciality) setMySpeciality(profileData.speciality);
        setContentStates(states);

        // ── Scores & Leaderboard ──────────────────────────
        // If current user isn't in the top-5 results, fetch their score separately
        // so "My Activity" stats are never shown as zero for non-top-5 users.
        const userInScores = scoreData.some(d => d.user_id === uid);
        if (!userInScores) {
          try {
            const myScoreRes = await dbRun(
              supabase.from('user_scores')
                .select('user_id, total_score, quiz_score, reading_score')
                .eq('user_id', uid)
                .maybeSingle(),
              signal
            );
            if (myScoreRes?.data) scoreData = [...scoreData, myScoreRes.data];
          } catch (_) { /* silent — user simply has no score row yet */ }
        }

        if (scoreData.length) {
          const profileMap = (lbProfiles || []).reduce((acc, p) => { acc[p.id] = p; return acc; }, {});
          const mapped = scoreData.map(row => ({
            id: row.user_id,
            name: profileMap[row.user_id]?.name || 'Anonymous',
            speciality: profileMap[row.user_id]?.speciality || '—',
            score: row.total_score || 0,
            isMe: row.user_id === uid,
          }));
          // Only show top-5 in leaderboard widget, but always include self
          const lbTop5 = scoreData.filter(r => r.user_id !== uid).slice(0, 5).map(row => ({
            id: row.user_id,
            name: profileMap[row.user_id]?.name || 'Anonymous',
            speciality: profileMap[row.user_id]?.speciality || '—',
            score: row.total_score || 0,
            isMe: false,
          }));
          setMiniLB(lbTop5.length ? lbTop5 : mapped);
          const meScore = scoreData.find(d => d.user_id === uid);
          if (meScore) {
            setMyScore(meScore.total_score || 0);
            setMyQuizPts(meScore.quiz_score || 0);
            setMyReadPts(meScore.reading_score || 0);
            setMyRank(mapped.findIndex(r => r.isMe) + 1 || null);
          }
        }

        // KPI cards ready — unblock the initial render
        setDashLoading(false);

        // ── Group 2: Activity + content + heatmap (below-fold) ──────────────
        const [logsRes, heatmapRes, actLogsRes, artsRes, diaryRes] = await Promise.all([
          // 7-day window, 200 rows — feeds weekly bar chart + hoursStudied
          dbRun(supabase.from('activity_logs').select('activity_type, duration_minutes, created_at')
            .eq('user_id', uid).gte('created_at', sevenDaysAgo)
            .order('created_at', { ascending: false }).limit(200), signal),
          // 90-day lightweight — feeds heatmap only (no duration column needed)
          dbRun(supabase.from('activity_logs').select('created_at, activity_type')
            .eq('user_id', uid).gte('created_at', ninetyDaysAgo), signal),
          dbRun(supabase.from('activity_logs').select('reference_id')
            .eq('user_id', uid).eq('activity_type', 'article_read'), signal),
          dbRun(supabase.from('artifacts').select('id, title, subject, emoji, pages')
            .eq('status', 'approved').limit(20), signal),
          getDiaryEntriesRange(uid, ninetyDaysDate),
        ]);

        if ([logsRes, heatmapRes, actLogsRes, artsRes].some(r => r.status === 'aborted')) return;

        const logs      = logsRes.data;
        const heatmap   = heatmapRes.data;
        const actLogs   = actLogsRes.data;
        const arts      = artsRes.data;
        const diaryEntries = diaryRes.data;

        // ── Activity stats (7-day window) ─────────────────
        if (logs) {
          const totalMins = logs.reduce((acc, l) => acc + (l.duration_minutes || 0), 0);
          setHoursStudied(Math.round(totalMins / 60));
          setWeeklyMins(totalMins);

          const now = new Date();
          const weekDays = Array(7).fill(0);
          logs.forEach(l => {
            if (!l.created_at) return;
            const d = new Date(l.created_at);
            if (isNaN(d.getTime())) return;
            if (Math.floor((now - d) / 86400000) < 7) {
              const dow = (d.getDay() + 6) % 7;
              weekDays[dow] += 1;
            }
          });
          setWeekActivity(weekDays);
          setRecentActivities(logs.slice(0, 5));
        } else {
          setWeekActivity([0, 0, 0, 0, 0, 0, 0]);
          setRecentActivities([]);
        }

        // booksRead from unbounded article_read query (all-time accurate count)
        setBooksRead((actLogs || []).length);

        // ── 90-day heatmap from lightweight query ─────────
        const byDate = {};
        (heatmap || []).forEach(l => {
          if (!l.created_at) return;
          const d = new Date(l.created_at);
          if (isNaN(d.getTime())) return;
          const dateStr = d.toISOString().split('T')[0];
          byDate[dateStr] = (byDate[dateStr] || 0) + 1;
        });
        (diaryEntries || []).forEach(d => {
          if (d.study_hours) byDate[d.date] = (byDate[d.date] || 0) + 1;
        });
        setActivityByDate(byDate);

        // ── Recommendations ───────────────────────────────
        const readIds = new Set((actLogs || []).map(l => l.reference_id));
        const unreadArts = (arts || []).filter(a => !readIds.has(String(a.id)));
        setRecommendations(unreadArts.sort(() => Math.random() - 0.5).slice(0, 3));

        // ── Group 3: Deferred — study plan + webinar ──────
        const [wbRes, planRes] = await Promise.all([
          dbRun(supabase.from('admin_webinars').select('*')
            .gte('scheduled_at', new Date().toISOString()).order('scheduled_at').limit(1), signal),
          dbRun(supabase.from('study_plan_history').select('id, plan, completed_tasks')
            .eq('user_id', uid).eq('is_active', true).order('created_at', { ascending: false }).limit(1), signal),
        ]);

        if ([wbRes, planRes].some(r => r.status === 'aborted')) return;

        const wb = wbRes.data;
        const activePlanData = Array.isArray(planRes.data) ? planRes.data[0] || null : planRes.data || null;
        setNextWebinar(wb?.[0] || null);
        setActivePlan(activePlanData);

        // ── AI "For You" (async, non-blocking) ────────────
        const meScore       = scoreData?.find(d => d.user_id === uid);
        const readCount     = (actLogs || []).length;
        const wMinsForAI    = logs ? logs.reduce((acc, l) => acc + (l.duration_minutes || 0), 0) : 0;
        const recentSubjectsSet = new Set(
          (arts || []).filter(a => (actLogs || []).some(l => l.reference_id === String(a.id))).map(a => a.subject).filter(Boolean)
        );
        const recentSubjects = Array.from(recentSubjectsSet).slice(0, 5);

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

        // ── Cache both raw + computed — so remount restores state without re-fetching ───
        const meScoreRow = meScore;
        const totalMinsCache = logs ? logs.reduce((acc, l) => acc + (l.duration_minutes || 0), 0) : 0;
        const nowCache = new Date();
        const weekDaysCache = Array(7).fill(0);
        (logs || []).forEach(l => {
          if (!l.created_at) return;
          const d = new Date(l.created_at);
          if (isNaN(d.getTime())) return;
          if (Math.floor((nowCache - d) / 86400000) < 7) {
            const dow = (d.getDay() + 6) % 7;
            weekDaysCache[dow] += 1;
          }
        });
        const byDateCache = {};
        (heatmap || []).forEach(l => {
          if (!l.created_at) return;
          const d = new Date(l.created_at);
          if (isNaN(d.getTime())) return;
          byDateCache[d.toISOString().split('T')[0]] = (byDateCache[d.toISOString().split('T')[0]] || 0) + 1;
        });
        const profileMapCache = (lbProfiles || []).reduce((acc, p) => { acc[p.id] = p; return acc; }, {});
        const lbTop5Cache = (scoreData || []).filter(r => r.user_id !== uid).slice(0, 5).map(row => ({
          id: row.user_id,
          name: profileMapCache[row.user_id]?.name || 'Anonymous',
          speciality: profileMapCache[row.user_id]?.speciality || '—',
          score: row.total_score || 0,
          isMe: false,
        }));
        const readIdsCache = new Set((actLogs || []).map(l => l.reference_id));
        const unreadArtsCache = (arts || []).filter(a => !readIdsCache.has(String(a.id)));

        _dashCache.set(uid, {
          ts: Date.now(),
          data: { profileData, states, scoreData, logs, actLogs, arts, wb, activePlanData, lbProfiles },
          computed: {
            mySpeciality: profileData?.speciality || '',
            contentStates: states || {},
            miniLB: lbTop5Cache,
            myScore: meScoreRow?.total_score || 0,
            myQuizPts: meScoreRow?.quiz_score || 0,
            myReadPts: meScoreRow?.reading_score || 0,
            myRank: null, // rank is non-critical; skipped for simplicity
            hoursStudied: Math.round(totalMinsCache / 60),
            weeklyMins: totalMinsCache,
            weekActivity: weekDaysCache,
            recentActivities: (logs || []).slice(0, 5),
            booksRead: readCount,
            activityByDate: byDateCache,
            recommendations: unreadArtsCache.sort(() => Math.random() - 0.5).slice(0, 3),
            nextWebinar: wb?.[0] || null,
            activePlan: activePlanData || null,
          },
        });

      } catch (e) {
        console.warn('Dashboard load failed:', e.message);
        setDashError('Dashboard data failed to load. Please refresh or try again.');
      } finally {
        setDashLoading(false);
      }
    }
    load();
    return () => controller.abort(); // Cancel all 9 in-flight queries on unmount
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
      if (isNaN(webinarTime.getTime())) { setReminderSaving(false); return; }
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
