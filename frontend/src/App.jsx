import { useState, useEffect, useCallback } from 'react';
import {
  supabase,
  authSignOut,
  fetchArtifacts, approveArtifact,
  rejectArtifact, withRetryAndTimeout,
} from './lib/supabase';
import { sendNotification } from './lib/sendNotification';
import { auditLog } from './lib/auditLog';
import { trackActivity } from './lib/trackActivity';
import ErrorBoundary from './components/ErrorBoundary';
import { AuthProvider, useAuth } from './context/AuthContext';
import OnboardingBanner from './components/OnboardingBanner';
import { titles } from './data/constants';
import Login from './components/Login';
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
import Toasts from './components/Toasts';
import SADashboard from './components/SADashboard';
import CADashboard from './components/CADashboard';
import ContentAdminDashboard from './components/ContentAdminDashboard';
import LearnHub from './components/content/LearnHub';
import LiveArenaHost from './components/arena/LiveArenaHost';
import LiveArenaStudent from './components/arena/LiveArenaStudent';
import StudyCalendar from './components/StudyCalendar';
import DoctorDashboard from './components/DoctorDashboard';
import EBooksPage from './components/EBooksPage';
import UploadPage from './components/UploadPage';
import LeaderboardPage from './components/LeaderboardPage';
import ActivityPage from './components/ActivityPage';
import NotificationsPage from './components/NotificationsPage';
import ProfilePage from './components/ProfilePage';
import UsersPage from './components/UsersPage';
import ReportsPage from './components/ReportsPage';
import SettingsPage from './components/SettingsPage';
import RegistrationPage from './components/RegistrationPage';
import ComingSoonPage from './components/ComingSoonPage';
import KahootPage from './components/KahootPage';
import ConferencesPage from './components/ConferencesPage';
import ExamPage from './components/ExamPage';
import ChatBot from './components/ChatBot';
import BroadcastPage from './components/BroadcastPage';
import CaseSimulator from './components/CaseSimulator';
import ProfileSetupPage from './components/ProfileSetupPage';
import MyPerformancePage from './components/MyPerformancePage';

// ─── Outer shell ─────────────────────────────────────────────────────────────
// Wraps the entire app in ErrorBoundary + AuthProvider. No business logic here.
export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <MainApp />
      </AuthProvider>
    </ErrorBoundary>
  );
}

// ─── Inner application ────────────────────────────────────────────────────────
// Consumes the AuthContext. All business logic lives here.
function MainApp() {
  const { isAuthLoading, session, setAuthRole } = useAuth();

  const [role, setRole]                   = useState(null);
  const [userName, setUserName]           = useState(null);
  const [userId, setUserId]               = useState(null);
  const [page, setPage]                   = useState('dashboard');
  const [chatBotMode, setChatBotMode]     = useState(null); // null | 'chat' | 'doubt'
  const [artifacts, setArtifacts]         = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [toasts, setToasts]               = useState([]);
  const [notifPanel, setNotifPanel]       = useState(false);
  const [darkMode, setDarkMode]           = useState(
    () => localStorage.getItem('iconnect_theme') === 'dark'
  );
  const [sidebarOpen, setSidebarOpen]     = useState(false);
  const [needsProfile, setNeedsProfile]   = useState(false);
  const [pendingUserId, setPendingUserId] = useState(null);
  const [pendingEmail, setPendingEmail]   = useState(null);
  const [pendingMessage, setPendingMessage] = useState(null);
  const [users, setUsers]                 = useState([]);

  const addToast = useCallback((type, msg) => {
    const id = Date.now();
    setToasts(t => [...t, { id, type, msg }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3500);
  }, []);

  const fetchUsers = useCallback(async () => {
    try {
      const { data } = await supabase
        .from('profiles').select('*').order('created_at', { ascending: false }).limit(200);
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
    } catch (_) {}
  }, []);

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
    } catch (_) {}
  }, []);

  // ── Core auth-reactive effect ─────────────────────────────────────────────
  // Fires once when AuthContext finishes loading, then again if the session
  // user changes (login / logout from another tab).
  useEffect(() => {
    if (isAuthLoading) return; // strict lock — do not evaluate until auth settles

    // ── No live Supabase session ──────────────────────────────────────────
    if (!session?.user) return;

    // ── Live Supabase session ─────────────────────────────────────────────
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

      // Block unverified doctors
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
        // New OAuth user — needs profile setup
        const n = authUser.user_metadata?.full_name || userEmail;
        setRole('doctor');
        setUserName(n);
        setUserId(uid);
        setNeedsProfile(true);
        setPendingUserId(uid);
        setPendingEmail(userEmail);
        return;
      }

      const r = profile.role || 'doctor';
      const n = profile.name || authUser.user_metadata?.full_name || userEmail;
      setRole(r);
      setUserName(n);
      setUserId(uid);
      setAuthRole(r);

      fetchNotifs(uid);
      fetchUsers();
      setPage('dashboard');

      // Track daily login (once per calendar day per user)
      const todayKey = `iconnect_daily_login_${uid}_${new Date().toDateString()}`;
      if (!localStorage.getItem(todayKey)) {
        localStorage.setItem(todayKey, '1');
        trackActivity('daily_login', uid);
      }

      try {
        const data = await fetchArtifacts(r);
        if (data?.length) setArtifacts(data);
      } catch (_) {}
    }

    loadProfile();
  }, [isAuthLoading, session?.user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Warn user before closing tab while logged in ──────────────────────────
  useEffect(() => {
    if (!role) return;
    const handler = (e) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [role]);

  // ── Realtime notification subscription ───────────────────────────────────
  useEffect(() => {
    if (!userId) return;
    const sub = supabase
      .channel(`notifs-${userId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'notifications',
        filter: `user_id=eq.${userId}`,
      }, (payload) => {
        const n = payload.new;
        setNotifications(prev => [{
          ...n,
          time: new Date(n.created_at).toLocaleString('en-IN', {
            hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short',
          }),
        }, ...prev]);
      })
      .subscribe();
    return () => { supabase.removeChannel(sub); };
  }, [userId]);

  // NOTE: Auto-read on panel open intentionally removed.
  // Notifications stay unread until user explicitly clicks "Mark as Read".

  // ── Dark mode sync ────────────────────────────────────────────────────────
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light');
    localStorage.setItem('iconnect_theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  useEffect(() => setNotifPanel(false), [page]);

  // ── Auth handlers ─────────────────────────────────────────────────────────
  const login = ({ role: r, name, mode, needsProfile: np, userId: uid, email, authMode }) => {
    setRole(r);
    setUserName(name);
    setUserId(uid || null);
    if (uid) { fetchNotifs(uid); fetchUsers(); }
    if (np) {
      setNeedsProfile(true);
      setPendingUserId(uid);
      setPendingEmail(email);
    } else {
      // Smart routing: role determines dashboard, authMode ensures intent matches
      if (authMode === 'superadmin' || r === 'superadmin') setPage('dashboard');
      else if (authMode === 'contentadmin' || r === 'contentadmin') setPage('dashboard');
      else setPage('dashboard');
    }
  };

  const logout = async () => {
    window.removeEventListener('beforeunload', () => {});
    await authSignOut();
    setRole(null);
    setUserName(null);
    setUserId(null);
    setPage('dashboard');
    setArtifacts([]);
    setNotifications([]);
    setUsers([]);
    window.location.href = '/';
  };

  // ── Artifact handlers ─────────────────────────────────────────────────────
  const onApprove = async (id) => {
    await approveArtifact(id);
    setArtifacts(a => a.map(x => x.id === id ? { ...x, status: 'approved' } : x));
    const art = artifacts.find(x => x.id === id);
    auditLog('approve_artifact', 'artifact', id, { title: art?.title });
  };

  const onReject = async (id, reason = '') => {
    const art = artifacts.find(x => x.id === id);
    await rejectArtifact(id, reason);
    setArtifacts(a => a.map(x => x.id === id ? { ...x, status: 'rejected', rejection_reason: reason || 'No reason provided.' } : x));
    auditLog('reject_artifact', 'artifact', id, { title: art?.title, reason });
  };

  const onUpload = (art) => {
    setArtifacts(a => [art, ...a]);
    setNotifications(n => [{
      id: Date.now(), type: 'info', icon: '📤', unread: true, time: 'Just now',
      title: 'Upload Submitted',
      body: `"${art.title}" is pending Super Admin approval.`,
      channel: 'in_app',
    }, ...n]);
    try {
      const session = JSON.parse(localStorage.getItem('iconnect_session') || '{}');
      sendNotification(session.userId, 'Upload Submitted',
        `"${art.title}" is pending Super Admin approval.`, 'info', '📤', 'in_app');
    } catch (_) {}
  };

  // ── User management handlers ──────────────────────────────────────────────
  const onApproveUser = async (id) => {
    const u = users.find(x => x.id === id);
    setUsers(us => us.map(x => x.id === id ? { ...x, status: 'active', verified: true } : x));
    auditLog('approve_user', 'user', id, { name: u?.name, email: u?.email });
    try {
      await supabase.from('profiles').update({ status: 'active', verified: true }).eq('id', id);
    } catch (_) {}
  };

  const onRejectUser = async (id) => {
    const u = users.find(x => x.id === id);
    setUsers(us => us.map(x => x.id === id ? { ...x, status: 'rejected' } : x));
    auditLog('reject_user', 'user', id, { name: u?.name, email: u?.email });
    try {
      await supabase.from('profiles').update({ status: 'rejected' }).eq('id', id);
    } catch (_) {}
  };

  const onRegisterSuccess = (newUser) => {
    setUsers(us => [...us, newUser]);
  };

  // ── Derived counts ────────────────────────────────────────────────────────
  const unreadCount  = notifications.filter(n => n.is_read === false).length;
  const pendingCount = artifacts.filter(a => a.status === 'pending').length;

  // ══════════════════════════════════════════════════════════════════════════
  // STRICT LOCK: Do not evaluate any routing logic until auth is settled.
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
          />
      }
      <Toasts toasts={toasts} />
    </>
  );

  const commonProps = {
    artifacts, setArtifacts, setPage, addToast, notifications,
    setNotifications, role, onApprove, onReject, onUpload,
    userName, userId, users, onApproveUser, onRejectUser,
    openChatBotDoubt: () => setChatBotMode('doubt'),
    darkMode,
  };

  const renderPage = () => {
    switch (page) {
      case 'dashboard':
        return role === 'superadmin' ? <SADashboard {...commonProps} />
          : role === 'contentadmin' ? <ContentAdminDashboard userId={userId} userName={userName} role={role} setPage={setPage} addToast={addToast} />
            : <DoctorDashboard {...commonProps} />;
      case 'ebooks':        return <EBooksPage {...commonProps} />;
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
      case 'kahoot':       return <KahootPage />;
      case 'conferences':  return <ConferencesPage role={role} addToast={addToast} />;
      case 'exam':         return <ExamPage addToast={addToast} />;
      case 'broadcast':    return <BroadcastPage {...commonProps} />;
      case 'performance':  return <MyPerformancePage userId={userId} />;
      case 'learn':        return <LearnHub userId={userId} addToast={addToast} />;
      case 'arena-host':   return <LiveArenaHost userId={userId} addToast={addToast} />;
      case 'arena-student': return <LiveArenaStudent userId={userId} addToast={addToast} />;
      case 'calendar':     return <StudyCalendar userId={userId} addToast={addToast} />;
      case 'case-sim':     return <CaseSimulator addToast={addToast} />;
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
          <OnboardingBanner role={role} currentPage={page} setPage={setPage} />
          {renderPage()}
        </div>
        <Toasts toasts={toasts} />
        <ChatBot chatBotMode={chatBotMode} setChatBotMode={setChatBotMode} />
      </div>
    </>
  );
}
