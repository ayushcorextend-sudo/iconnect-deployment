import { lazy, Suspense, useEffect, useCallback, useMemo, useRef, useState } from 'react';
import { useNavigate, useLocation, useNavigationType } from 'react-router-dom';
import {
  supabase,
  authSignOut,
  fetchArtifacts, approveArtifact,
  rejectArtifact, withRetryAndTimeout,
} from './lib/supabase';
import { sendNotification } from './lib/sendNotification';
import { auditLog } from './lib/auditLog';
import { trackActivity, flushPendingFromStorage } from './lib/trackActivity';
import { captureException, setUser } from './lib/sentry';
import ErrorBoundary from './components/ErrorBoundary';
import AppErrorBoundary from './components/ui/AppErrorBoundary';
import { AuthProvider, useAuth } from './context/AuthContext';
const OnboardingBanner = lazy(() => import('./components/OnboardingBanner'));
import { titles } from './data/constants';

import { useAuthStore } from './stores/useAuthStore';
import { useAppStore }  from './stores/useAppStore';
import { useChatStore } from './stores/useChatStore';
import { useTenantStore } from './stores/useTenantStore';

// Always-present shell components (eager)
import Login from './components/Login';
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
import Toasts from './components/Toasts';
const ChatBot = lazy(() => import('./components/ChatBot'));
import ProfileSetupPage from './components/ProfileSetupPage';
import OfflineIndicator from './components/ui/OfflineIndicator';
import PWAInstallBanner from './components/ui/PWAInstallBanner';
// PageTransition removed — key={page} on Suspense handles page remount
import PageErrorBoundary from './components/ui/PageErrorBoundary';
import { clearAllCaches } from './lib/dbService';

// Page-level components — lazy loaded for code splitting
const SADashboard           = lazy(() => import('./components/SADashboard'));
const CADashboard           = lazy(() => import('./components/CADashboard'));
const ContentAdminDashboard = lazy(() => import('./components/ContentAdminDashboard'));
const DoctorDashboard       = lazy(() => import('./components/DoctorDashboard'));
const EBooksPage            = lazy(() => import('./components/EBooksPage'));
const UploadPage            = lazy(() => import('./components/UploadPage'));
const LeaderboardPage       = lazy(() => import('./components/LeaderboardPage'));
const ActivityPage          = lazy(() => import('./components/ActivityPage'));
const NotificationsPage     = lazy(() => import('./components/NotificationsPage'));
const ProfilePage           = lazy(() => import('./components/ProfilePage'));
const UsersPage             = lazy(() => import('./components/UsersPage'));
const ReportsPage           = lazy(() => import('./components/ReportsPage'));
const SettingsPage          = lazy(() => import('./components/SettingsPage'));
const RegistrationPage      = lazy(() => import('./components/RegistrationPage'));
const ComingSoonPage        = lazy(() => import('./components/ComingSoonPage'));
const ConferencesPage       = lazy(() => import('./components/ConferencesPage'));
const ExamPage              = lazy(() => import('./components/ExamPage'));
const BroadcastPage         = lazy(() => import('./components/BroadcastPage'));
const CaseSimulator         = lazy(() => import('./components/CaseSimulator'));
const StudyPlanPage         = lazy(() => import('./components/StudyPlan/StudyPlanPage'));
const ExamManager           = lazy(() => import('./components/Exam/ExamManager'));
const MyPerformancePage     = lazy(() => import('./components/MyPerformancePage'));
const LearnHub              = lazy(() => import('./components/content/LearnHub'));
const LiveArenaHost         = lazy(() => import('./components/arena/LiveArenaHost'));
const LiveArenaStudent      = lazy(() => import('./components/arena/LiveArenaStudent'));
const StudyCalendar         = lazy(() => import('./components/StudyCalendar'));
const NotesPage             = lazy(() => import('./pages/Notes'));

function PageLoader() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 320 }}>
      <div style={{ width: 36, height: 36, borderRadius: '50%', border: '3px solid #E5E7EB', borderTopColor: '#4F46E5', animation: 'spin 0.7s linear infinite' }} />
    </div>
  );
}

/**
 * PageGuard — renders children ONLY when `expectedPage` matches the current
 * Zustand page state. This is the nuclear guard against stale content: even if
 * React's Suspense/key reconciliation has a race, the guard will render null
 * rather than showing content from a different page.
 */
function PageGuard({ expectedPage, children }) {
  const currentPage = useAppStore(s => s.page);
  if (currentPage !== expectedPage) return null;
  return children;
}

// ─── Outer shell ─────────────────────────────────────────────────────────────
export default function App() {
  return (
    <ErrorBoundary>
      <AppErrorBoundary>
        <AuthProvider>
          <MainApp />
        </AuthProvider>
      </AppErrorBoundary>
    </ErrorBoundary>
  );
}

// ─── Inner application ────────────────────────────────────────────────────────
function MainApp() {
  const { isAuthLoading, session, setAuthRole } = useAuth();
  const navigate       = useNavigate();
  const location       = useLocation();
  const navigationType = useNavigationType();
  const authBootedRef = useRef(false); // prevents re-firing setPage('dashboard') on token refresh

  // Auth store — granular selectors
  const role           = useAuthStore(s => s.role);
  const userName       = useAuthStore(s => s.userName);
  const userId         = useAuthStore(s => s.userId);
  const needsProfile   = useAuthStore(s => s.needsProfile);
  const pendingUserId  = useAuthStore(s => s.pendingUserId);
  const pendingEmail   = useAuthStore(s => s.pendingEmail);
  const pendingMessage = useAuthStore(s => s.pendingMessage);
  const setRole        = useAuthStore(s => s.setRole);
  const setUserName    = useAuthStore(s => s.setUserName);
  const setUserId      = useAuthStore(s => s.setUserId);
  const setNeedsProfile  = useAuthStore(s => s.setNeedsProfile);
  const setPendingUserId = useAuthStore(s => s.setPendingUserId);
  const setPendingEmail  = useAuthStore(s => s.setPendingEmail);
  const setPendingMessage = useAuthStore(s => s.setPendingMessage);
  const clearAuth      = useAuthStore(s => s.clearAuth);

  // App store — GRANULAR selectors to prevent full-tree re-renders.
  // Reactive state (only these trigger re-renders when they change):
  const page          = useAppStore(s => s.page);
  // NAV-FIX: Monotonic counter that increments on every page change.
  // Combined with page name as a composite key, this guarantees React
  // fully unmounts the old component tree — even if Suspense/lazy-loading
  // causes React to attempt reconciliation with stale Fiber nodes.
  const pageGenRef = useRef(0);
  const prevPageRef = useRef(page);
  if (page !== prevPageRef.current) {
    pageGenRef.current += 1;
    prevPageRef.current = page;
  }
  const pageKey = `${page}::${pageGenRef.current}`;
  const darkMode      = useAppStore(s => s.darkMode);
  const sidebarOpen   = useAppStore(s => s.sidebarOpen);
  const notifPanel    = useAppStore(s => s.notifPanel);
  const toasts        = useAppStore(s => s.toasts);
  const notifications = useAppStore(s => s.notifications);
  const artifacts     = useAppStore(s => s.artifacts);
  const users         = useAppStore(s => s.users);
  // Stable action refs (functions never change, so selectors are ~free):
  const setPage       = useAppStore(s => s.setPage);
  const setDarkMode   = useAppStore(s => s.setDarkMode);
  const setSidebarOpen  = useAppStore(s => s.setSidebarOpen);
  const setNotifPanel   = useAppStore(s => s.setNotifPanel);
  const addToast        = useAppStore(s => s.addToast);
  const setNotifications = useAppStore(s => s.setNotifications);
  const setArtifacts     = useAppStore(s => s.setArtifacts);
  const setUsers         = useAppStore(s => s.setUsers);
  const updateArtifact   = useAppStore(s => s.updateArtifact);
  const prependArtifact  = useAppStore(s => s.prependArtifact);
  const updateUser       = useAppStore(s => s.updateUser);
  const pushNotification = useAppStore(s => s.pushNotification);
  const subscribeToNotifications = useAppStore(s => s.subscribeToNotifications);
  const unsubscribeAll   = useAppStore(s => s.unsubscribeAll);
  const resetAppState    = useAppStore(s => s.reset);

  // Chat store — granular
  const chatBotMode    = useChatStore(s => s.chatBotMode);
  const setChatBotMode = useChatStore(s => s.setChatBotMode);

  // Tenant store — granular
  const tenant      = useTenantStore(s => s.tenant);
  const loadTenant  = useTenantStore(s => s.loadTenant);
  const clearTenant = useTenantStore(s => s.clearTenant);
  useEffect(() => { loadTenant(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // BUG-D: Clear stale offline-registration data from localStorage.
  // The offline registration path was removed — any lingering iconnect_users entries
  // represent phantom accounts that were never synced to Supabase.
  // Run once on mount to prevent those users from seeing a broken state.
  useEffect(() => {
    const staleKey = 'iconnect_users';
    if (localStorage.getItem(staleKey)) {
      console.info('[App] Clearing stale offline registrations — re-register to create a real account.');
      localStorage.removeItem(staleKey);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Wire React Router into the app store (once on mount, then sync on back/forward)
  const initRouter       = useAppStore(s => s.initRouter);
  const syncFromLocation = useAppStore(s => s.syncFromLocation);
  useEffect(() => { initRouter(navigate, location); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  // Only sync page from URL when the user navigated via browser back/forward (POP).
  // Programmatic setPage() calls use navigate() which is PUSH/REPLACE — skipping those
  // prevents the double-update race where navigate('/ebooks') fires syncFromLocation('/')
  // (old URL still in location closure) and resets Zustand page back to 'dashboard'.
  useEffect(() => {
    if (navigationType === 'POP') {
      syncFromLocation(location.pathname);
    }
  }, [location.pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchUsers = useCallback(async () => {
    try {
      // BUG-I: removed .limit(200) — UsersPage virtualises the list so large user counts are safe
      const { data } = await supabase
        .from('profiles').select('*').order('created_at', { ascending: false });
      if (data?.length) {
        setUsers(data.map(p => ({
          id: p.id,
          name: p.name || p.email,
          email: p.email,
          role: p.role === 'doctor' ? 'PG Aspirant' : p.role,
          mci: p.mci_number || '—',
          hometown: p.hometown || '—',
          state: p.state || '—',
          district: p.district || '—',
          speciality: p.speciality || '—',
          college: p.college || '—',
          status: p.status || 'pending',
          verified: p.verified || false,
          score: 0,
        })));
      }
    } catch (e) { console.warn('App: fetchUsers failed:', e.message); }
  }, [setUsers]);

  const fetchNotifs = useCallback(async (uid) => {
    if (!uid) return;
    try {
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', uid)
        .order('created_at', { ascending: false })
        .limit(50);
      if (data?.length) setNotifications(data.map(n => ({
        ...n,
        time: n.created_at
          ? new Date(n.created_at).toLocaleString('en-IN', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })
          : 'Recently',
      })));
    } catch (e) { console.warn('App: fetchNotifs failed:', e.message); }
  }, [setNotifications]);

  // ── Core auth-reactive effect ─────────────────────────────────────────────
  // IMPORTANT: This must NOT re-run on token refresh. The guard below prevents
  // re-fetching the profile and re-calling setPage('dashboard') when only the
  // access token changed (same user). authBootedRef tracks initial login.
  useEffect(() => {
    if (isAuthLoading) return;
    if (!session?.user) return;
    // If we already booted this user, skip — prevents token-refresh re-fires
    // from yanking the user back to dashboard or causing cross-tab glitches.
    if (authBootedRef.current) return;

    const authUser = session.user;
    const uid = authUser.id;
    const userEmail = authUser.email || '';

    async function loadProfile() {
      let profile = null;
      try {
        const { data: p } = await withRetryAndTimeout(
          () => supabase.from('profiles').select('*').eq('id', uid).maybeSingle()
        );
        profile = p;
      } catch (err) {
        console.error('[MainApp] Profile fetch failed after retries:', err);
        addToast('error', 'Could not load your profile. Please refresh.');
        return;
      }

      if (profile?.role === 'doctor' && profile?.status === 'pending') {
        await supabase.auth.signOut();
        setPendingMessage('Your account is pending admin approval. You will be notified via email.');
        return;
      }
      if (profile?.role === 'doctor' && profile?.status === 'rejected') {
        await supabase.auth.signOut();
        setPendingMessage('Your account was not approved. Contact support@iconnect.in');
        return;
      }

      if (!profile) {
        const n = authUser.user_metadata?.full_name || userEmail;
        setRole('doctor');
        setUserName(n);
        setUserId(uid);
        setNeedsProfile(true);
        setPendingUserId(uid);
        setPendingEmail(userEmail);
        authBootedRef.current = true;
        return;
      }

      const r = profile.role || 'doctor';
      const n = profile.name || authUser.user_metadata?.full_name || userEmail;
      setRole(r);
      setUserName(n);
      setUserId(uid);
      setAuthRole(r);
      setUser(uid, r);

      // Only navigate to dashboard on FIRST login — respect deep-link URLs
      // If the URL already points to a valid page, keep it; otherwise go to dashboard
      const urlPage = window.location.pathname.replace(/^\//, '') || 'dashboard';
      setPage(urlPage === '' ? 'dashboard' : urlPage);
      authBootedRef.current = true;

      const todayKey = `iconnect_daily_login_${uid}_${new Date().toDateString()}`;
      if (!localStorage.getItem(todayKey)) {
        localStorage.setItem(todayKey, '1');
        trackActivity('daily_login', uid);
      }

      // SEC-004: Flush any activity logs saved to localStorage during a previous
      // page close (the beforeunload fallback in trackActivity.js).
      // Auth is established at this point so the flush uses proper credentials.
      flushPendingFromStorage().catch(e => console.warn('[App] flushPendingFromStorage failed:', e.message));

      // Kick off parallel post-login data fetches — none are blocking for render
      const parallelFetches = [
        fetchNotifs(uid).catch(e => console.warn('[App] fetchNotifs failed:', e.message)),
        fetchArtifacts(r).then(data => { if (data?.length) setArtifacts(data); }).catch(e => console.warn('[App] fetchArtifacts failed:', e.message)),
      ];
      if (r === 'superadmin' || r === 'contentadmin') {
        parallelFetches.push(fetchUsers().catch(e => console.warn('[App] fetchUsers failed:', e.message)));
      }
      await Promise.all(parallelFetches);
    }

    loadProfile();
  }, [isAuthLoading, session?.user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Warn user before closing tab (ONLY during active exams) ──────────────
  // Previously this blocked EVERY tab close/reload — causing "Leave site?"
  // popups across all tabs on every refresh. Now only guards exam sessions.
  useEffect(() => {
    if (!role) return;
    // Only intercept unload when user is actively taking an exam
    const isExamActive = page === 'exam' || page === 'arena-student';
    if (!isExamActive) return;
    const handler = (e) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [role, page]);

  // ── Centralized realtime notification subscription (via useAppStore) ─────
  useEffect(() => {
    if (!userId) return;
    subscribeToNotifications(userId);
    // No cleanup here — channels persist across renders; unsubscribeAll() is
    // called on logout to tear down all channels at once.
  }, [userId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Dark mode sync ────────────────────────────────────────────────────────
  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  // ── Global unhandled promise rejection handler ────────────────────────────
  // Catches any promise that rejects without a .catch() handler. Shows a toast
  // so users get feedback instead of silent failures.
  useEffect(() => {
    const handler = (e) => {
      // Skip AbortError — these are intentional (component unmount cleanup)
      if (e.reason?.name === 'AbortError') return;
      const msg = e.reason?.message || 'An unexpected error occurred.';
      addToast('error', msg);
    };
    window.addEventListener('unhandledrejection', handler);
    return () => window.removeEventListener('unhandledrejection', handler);
  }, [addToast]);

  // ── System dark mode listener (only fires if user hasn't set a preference) ─
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e) => {
      if (!localStorage.getItem('iconnect_theme')) setDarkMode(e.matches);
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [setDarkMode]);

  // ── Auth handlers ─────────────────────────────────────────────────────────
  const login = ({ role: r, name, needsProfile: np, userId: uid, email }) => {
    setRole(r);
    setUserName(name);
    setUserId(uid || null);
    // Mark as booted so the auth useEffect's loadProfile() doesn't re-run and
    // overwrite the role/userId we just set (race condition fix).
    authBootedRef.current = true;
    if (uid) {
      setAuthRole(r);
      setUser(uid, r);
      fetchNotifs(uid);
      if (r === 'superadmin' || r === 'contentadmin') fetchUsers();
      fetchArtifacts(r).then(data => { if (data?.length) setArtifacts(data); }).catch(e => console.warn('[App] fetchArtifacts (login) failed:', e.message));
      // Track daily login
      const todayKey = `iconnect_daily_login_${uid}_${new Date().toDateString()}`;
      if (!localStorage.getItem(todayKey)) {
        localStorage.setItem(todayKey, '1');
        trackActivity('daily_login', uid);
      }
    }
    if (np) {
      setNeedsProfile(true);
      setPendingUserId(uid);
      setPendingEmail(email);
    } else {
      // BUG-NAV-002: Respect deep-link URL instead of always landing on dashboard.
      // When a user visits /ebooks → sees Login → logs in, the URL bar still shows /ebooks
      // (React conditional render, not a redirect). Read it and navigate there.
      const deepLink = window.location.pathname.replace(/^\//, '') || 'dashboard';
      setPage(deepLink);
    }
  };

  const logout = async () => {
    authBootedRef.current = false; // allow fresh login flow on next session
    // BUG-C: clearAllCaches() clears _dashCache, signedUrl CACHE, dataCache _store,
    // tenantResolver _cached, and trackActivity queue — all registered via registerCache().
    clearAllCaches();
    // BUG-P: cancel any pending toast auto-dismiss timers and wipe toast/notif state
    resetAppState();
    // Note: beforeunload handler is cleaned up by the useEffect when role/page changes
    setUser(null, null);
    unsubscribeAll(); // tear down all realtime channels
    clearTenant();    // reset tenant cache (also cleared by clearAllCaches via registerCache)
    await authSignOut();
    clearAuth();
    setArtifacts([]);
    setUsers([]);
    window.location.href = '/';
  };

  // ── Artifact handlers — BUG-N: wrapped in useCallback so sharedProps useMemo deps are stable ─
  const onApprove = useCallback(async (id) => {
    await approveArtifact(id);
    updateArtifact(id, { status: 'approved' });
    const art = artifacts.find(x => x.id === id);
    auditLog('approve_artifact', 'artifact', id, { title: art?.title });
  }, [artifacts, updateArtifact]);

  const onReject = useCallback(async (id, reason = '') => {
    const art = artifacts.find(x => x.id === id);
    await rejectArtifact(id, reason);
    updateArtifact(id, { status: 'rejected', rejection_reason: reason || 'No reason provided.' });
    auditLog('reject_artifact', 'artifact', id, { title: art?.title, reason });
  }, [artifacts, updateArtifact]);

  const onUpload = useCallback((art) => {
    prependArtifact(art);
    pushNotification({
      id: Date.now(), type: 'info', icon: '📤', is_read: false, time: 'Just now',
      title: 'Upload Submitted',
      body: `"${art.title}" is pending Super Admin approval.`,
      channel: 'in_app',
    });
    try {
      const s = JSON.parse(localStorage.getItem('iconnect_session') || '{}');
      sendNotification(s.userId, 'Upload Submitted',
        `"${art.title}" is pending Super Admin approval.`, 'info', '📤', 'in_app');
    } catch (e) { console.warn('App: onUpload sendNotification failed:', e.message); }
  }, [prependArtifact, pushNotification]);

  // ── User management handlers ──────────────────────────────────────────────
  const onApproveUser = useCallback(async (id) => {
    const u = users.find(x => x.id === id);
    updateUser(id, { status: 'active', verified: true });
    auditLog('approve_user', 'user', id, { name: u?.name, email: u?.email });
    try {
      await supabase.from('profiles').update({ status: 'active', verified: true }).eq('id', id);
    } catch (e) { console.warn('App: onApproveUser profile update failed:', e.message); }
    try {
      if (u?.email) {
        await supabase.functions.invoke('send-approval-email', {
          body: {
            doctorEmail: u.email,
            doctorName: u.name || u.email,
            mciNumber: u.mci_number || '',
            college: u.college || '',
            approved: true,
          },
        });
      }
    } catch (e) { console.warn('App: onApproveUser send-approval-email function failed:', e.message); }
  }, [users, updateUser]);

  const onRejectUser = useCallback(async (id, rejectionReason) => {
    const u = users.find(x => x.id === id);
    updateUser(id, { status: 'rejected' });
    auditLog('reject_user', 'user', id, { name: u?.name, email: u?.email });
    try {
      await supabase.from('profiles').update({ status: 'rejected' }).eq('id', id);
    } catch (e) { console.warn('App: onRejectUser profile update failed:', e.message); }
    try {
      if (u?.email) {
        await supabase.functions.invoke('send-approval-email', {
          body: {
            doctorEmail: u.email,
            doctorName: u.name || u.email,
            mciNumber: u.mci_number || '',
            college: u.college || '',
            approved: false,
            rejectionReason: rejectionReason || 'No reason provided.',
          },
        });
      }
    } catch (e) { console.warn('App: onRejectUser send-approval-email function failed:', e.message); }
  }, [users, updateUser]);

  const onRegisterSuccess = useCallback((newUser) => {
    setUsers([...users, newUser]);
  }, [users, setUsers]);

  // ── Derived counts ────────────────────────────────────────────────────────
  const unreadCount  = notifications.filter(n => n.is_read === false).length;
  const pendingCount = artifacts.filter(a => a.status === 'pending').length;

  // ── Stable memoized values — MUST be before any early returns (hooks rules) ─
  // Stable callback for chatbot — avoids new function ref on every render
  const openChatBotDoubt = useCallback(() => setChatBotMode('doubt'), [setChatBotMode]);

  // Props passed explicitly to components that haven't been store-wired yet.
  // Memoized to prevent unnecessary child re-renders.
  const sharedProps = useMemo(() => ({
    artifacts, setArtifacts, setPage, addToast, notifications,
    setNotifications, role, onApprove, onReject, onUpload,
    userName, userId, users, onApproveUser, onRejectUser,
    openChatBotDoubt,
    darkMode,
  }), [artifacts, notifications, role, userName, userId, users, darkMode,
       setArtifacts, setPage, addToast, setNotifications,
       onApprove, onReject, onUpload, onApproveUser, onRejectUser, openChatBotDoubt]); // eslint-disable-line react-hooks/exhaustive-deps

  // ══════════════════════════════════════════════════════════════════════════
  if (isAuthLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 gap-4">
        <div className="w-12 h-12 rounded-full border-4 border-gray-200 border-t-blue-600 animate-spin" />
        <p className="text-sm text-gray-500 font-medium">Loading iConnect...</p>
      </div>
    );
  }

  if (needsProfile) return (
    <ProfileSetupPage
      userId={pendingUserId}
      email={pendingEmail}
      onComplete={(profileData) => {
        setNeedsProfile(false);
        setUserName(profileData.name);
        setPage('dashboard');
      }}
      addToast={addToast}
    />
  );

  // If session exists but role isn't resolved yet, show spinner (not Login page).
  // This prevents the 1-second Login flash while loadProfile() is still running.
  if (!role && session?.user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 gap-4">
        <div className="w-12 h-12 rounded-full border-4 border-gray-200 border-t-blue-600 animate-spin" />
        <p className="text-sm text-gray-500 font-medium">Loading iConnect...</p>
      </div>
    );
  }

  if (!role) return (
    <>
      {page === 'registration'
        ? <RegistrationPage addToast={addToast} setPage={setPage} onRegisterSuccess={onRegisterSuccess} />
        : <Login
            onLogin={login}
            onRegister={() => setPage('registration')}
            pendingMessage={pendingMessage}
            onDismissPendingMessage={() => setPendingMessage(null)}
            addToast={addToast}
            darkMode={darkMode}
          />
      }
      <Toasts toasts={toasts} />
    </>
  );

  // Role-based page access allowlists — prevents cross-role navigation via devtools.
  // Superadmin has no restrictions (empty array = bypass guard).
  const ROLE_PAGES = {
    doctor: [
      'dashboard', 'ebooks', 'leaderboard', 'activity', 'notifications',
      'profile', 'exam', 'broadcast', 'performance', 'learn',
      'arena-student', 'calendar', 'case-sim', 'study-plan',
      'social', 'groups', 'conferences', 'settings', 'notes',
    ],
    contentadmin: [
      'dashboard', 'upload', 'notifications', 'profile', 'settings',
      'learn', 'broadcast',
    ],
    superadmin: [], // unrestricted
  };

  const renderPage = () => {
    // Server-side route guard: redirect to default page if role has no access
    const allowedPages = ROLE_PAGES[role];
    if (role && allowedPages && allowedPages.length > 0 && page && !allowedPages.includes(page)) {
      // Schedule redirect outside render — never call setPage during render
      queueMicrotask(() => setPage('dashboard'));
      return <PageLoader />;
    }

    switch (page) {
      case 'dashboard':
        return role === 'superadmin' ? <SADashboard {...sharedProps} />
          : role === 'contentadmin' ? <ContentAdminDashboard userId={userId} userName={userName} role={role} setPage={setPage} addToast={addToast} darkMode={darkMode} />
            : <DoctorDashboard {...sharedProps} />;
      case 'ebooks':        return <EBooksPage {...sharedProps} />;
      case 'upload':        return <UploadPage onUpload={onUpload} addToast={addToast} artifacts={artifacts} userId={userId} userName={userName} />;
      case 'leaderboard':   return <LeaderboardPage setPage={setPage} />;
      case 'activity':      return <ActivityPage addToast={addToast} />;
      case 'notifications': return <NotificationsPage notifications={notifications} setNotifications={setNotifications} addToast={addToast} setPage={setPage} />;
      case 'profile':       return <ProfilePage addToast={addToast} />;
      case 'users':         return <UsersPage users={users} addToast={addToast} role={role} userId={userId} />;
      case 'reports':       return <ReportsPage addToast={addToast} />;
      case 'settings':      return <SettingsPage addToast={addToast} />;
      case 'registration':  return <RegistrationPage addToast={addToast} setPage={setPage} onRegisterSuccess={onRegisterSuccess} />;
      case 'social': return (
        <ComingSoonPage
          title="Social Features" icon="👥"
          desc="Connect with peers, share notes, follow top performers and build your medical network."
          features={[
            { i: '👫', t: 'Peer Network', d: 'Follow and connect with doctors from your speciality' },
            { i: '📝', t: 'Note Sharing', d: 'Share and discover study notes' },
            { i: '💬', t: 'Chat Groups', d: 'Private and group messaging' },
            { i: '🌟', t: 'Verification Badge', d: 'Blue tick for verified doctors (Facebook-style)' },
          ]}
        />
      );
      case 'groups': return (
        <ComingSoonPage
          title="Interest Groups" icon="🎯"
          desc="Join or create groups based on speciality, college, or study topics."
          features={[
            { i: '🏥', t: 'Speciality Groups', d: 'MD, MS, DM groups for each subject' },
            { i: '📚', t: 'Study Circles', d: 'Small group study sessions' },
            { i: '📢', t: 'Mass Communication', d: 'Admin broadcast to all group members' },
            { i: '📱', t: 'WhatsApp Business', d: 'Group notifications via WhatsApp Business API' },
          ]}
        />
      );
      case 'kahoot': {
        // BUG-M: redirect to the replacement feature — never show a blank screen
        // Schedule outside render — calling setPage during render causes stale content bugs
        queueMicrotask(() => setPage('arena-student'));
        return <PageLoader />;
      }
      case 'conferences':  return <ConferencesPage role={role} addToast={addToast} />;
      case 'exam':         return <ExamPage addToast={addToast} />;
      case 'broadcast':    return <BroadcastPage {...sharedProps} />;
      case 'performance':  return <MyPerformancePage userId={userId} />;
      case 'notes':        return <NotesPage />;
      case 'learn':        return <LearnHub userId={userId} addToast={addToast} />;
      case 'arena-host':   return <LiveArenaHost userId={userId} addToast={addToast} />;
      case 'arena-student': return <LiveArenaStudent userId={userId} addToast={addToast} />;
      case 'calendar':     return <StudyCalendar userId={userId} addToast={addToast} />;
      case 'case-sim':     return <CaseSimulator addToast={addToast} />;
      case 'study-plan':   return <StudyPlanPage userId={userId} addToast={addToast} />;
      case 'exam-manage':  return <ExamManager userId={userId} addToast={addToast} />;
      default: return (
        <div className="page">
          <div className="empty">
            <div className="empty-ic">🚧</div>
            <div className="empty-t">Coming Soon</div>
          </div>
        </div>
      );
    }
  };

  return (
    <>
      <div
        className="shell"
        onClick={() => setNotifPanel(false)}
      >
        <Sidebar
          role={role} page={page} setPage={setPage} onLogout={logout}
          pendingCount={pendingCount} unreadCount={unreadCount}
          isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)}
        />
        <div className="main" onClick={e => e.stopPropagation()}>
          <TopBar
            title={titles[page] || 'iConnect'}
            role={role}
            unreadCount={unreadCount}
            setPage={setPage}
            notifPanelOpen={notifPanel}
            setNotifPanel={setNotifPanel}
            notifications={notifications}
            darkMode={darkMode}
            setDarkMode={setDarkMode}
            setSidebarOpen={setSidebarOpen}
          />
          <Suspense fallback={null}>
            <OnboardingBanner role={role} currentPage={page} setPage={setPage} />
          </Suspense>
          {/* NAV-FIX: Triple-layer defense against stale page content:
              1. pageKey (page::counter) on ErrorBoundary — forces full unmount,
                 even for same-page re-navigations
              2. pageKey on Suspense — prevents React from reusing lazy-resolved
                 Fiber trees across page transitions
              3. PageGuard — runtime check: renders null if Zustand page state
                 doesn't match what renderPage() was called with */}
          <PageErrorBoundary key={pageKey} resetKey={page}>
            <Suspense key={pageKey} fallback={<PageLoader />}>
              <PageGuard expectedPage={page}>
                {renderPage()}
              </PageGuard>
            </Suspense>
          </PageErrorBoundary>
        </div>
        <Toasts toasts={toasts} />
        <Suspense fallback={null}>
          <ChatBot chatBotMode={chatBotMode} setChatBotMode={setChatBotMode} />
        </Suspense>
      </div>
      <OfflineIndicator />
      <PWAInstallBanner />
    </>
  );
}
