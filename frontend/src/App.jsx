import { useState, useEffect, useCallback } from 'react';
import {
  authSignOut,
  fetchArtifacts, approveArtifact,
  rejectArtifact,
} from './lib/supabase';
import OnboardingBanner from './components/OnboardingBanner';
import { ARTIFACTS_INIT, NOTIFS_INIT, titles } from './data/constants';
import Login from './components/Login';
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
import Toasts from './components/Toasts';
import SADashboard from './components/SADashboard';
import CADashboard from './components/CADashboard';
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

// Base user list — shared between UsersPage and SADashboard
const BASE_USERS = [
  { id: 1, name: 'Dr. Priya Sharma', email: 'priya@example.com', role: 'PG Aspirant', mci: 'MCI-2024-78432', hometown: 'Lucknow', state: 'Uttar Pradesh', zone: 'North', status: 'active', verified: true, score: 8200 },
  { id: 2, name: 'Dr. Ankit Verma', email: 'ankit@example.com', role: 'PG Aspirant', mci: 'MCI-2024-91234', hometown: 'Chennai', state: 'Tamil Nadu', zone: 'South', status: 'pending', verified: false, score: 0, speciality: 'Cardiology', college: 'JIPMER Puducherry', date: 'Feb 5, 2026' },
  { id: 3, name: 'Dr. Sneha Patel', email: 'sneha@example.com', role: 'PG Aspirant', mci: 'MCI-2024-88210', hometown: 'Ahmedabad', state: 'Gujarat', zone: 'West', status: 'active', verified: true, score: 7100 },
  { id: 4, name: 'Dr. Kiran Rao', email: 'kiran@example.com', role: 'PG Aspirant', mci: 'MCI-2023-66789', hometown: 'Hyderabad', state: 'Telangana', zone: 'South', status: 'active', verified: true, score: 6800 },
  { id: 5, name: 'Rajesh Kumar', email: 'rajesh@icon.com', role: 'Content Admin', mci: '—', hometown: 'Mumbai', state: 'Maharashtra', zone: 'West', status: 'active', verified: true, score: 0 },
];

export default function App() {
  const [role, setRole] = useState(null);
  const [userName, setUserName] = useState(null);
  const [page, setPage] = useState('dashboard');
  const [artifacts, setArtifacts] = useState(ARTIFACTS_INIT);
  const [notifications, setNotifications] = useState(NOTIFS_INIT);
  const [toasts, setToasts] = useState([]);
  const [notifPanel, setNotifPanel] = useState(false);
  const [demoMode, setDemoMode] = useState(false);
  const [appLoading, setAppLoading] = useState(true);
  const [darkMode, setDarkMode] = useState(
    () => localStorage.getItem('iconnect_theme') === 'dark'
  );
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Shared users state: base users + any locally registered users from localStorage
  const [users, setUsers] = useState(() => {
    try {
      const local = JSON.parse(localStorage.getItem('iconnect_users') || '[]');
      const formatted = local.map(u => ({
        id: u.id,
        name: u.name || u.email,
        email: u.email,
        role: 'PG Aspirant',
        mci: u.mci_number || '—',
        hometown: u.hometown || '—',
        state: u.homeState || u.state || '—',
        zone: u.zone || '—',
        speciality: u.speciality || '—',
        college: u.college || '—',
        status: 'pending',
        verified: false,
        score: 0,
        date: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
      }));
      // Avoid duplicates if a base user email matches a local user
      const localEmails = new Set(formatted.map(u => u.email));
      const baseFiltered = BASE_USERS.filter(u => !localEmails.has(u.email));
      return [...baseFiltered, ...formatted];
    } catch (_) {
      return BASE_USERS;
    }
  });

  const addToast = useCallback((type, msg) => {
    const id = Date.now();
    setToasts(t => [...t, { id, type, msg }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3500);
  }, []);

  // On mount: always start logged out, then fetch artifacts
  useEffect(() => {
    fetchArtifacts().then(data => {
      if (data && data.length > 0) setArtifacts(data);
      setAppLoading(false);
    });
  }, []);

  // Sync dark mode to <html data-theme> and localStorage
  useEffect(() => {
    document.documentElement.setAttribute(
      'data-theme', darkMode ? 'dark' : 'light'
    );
    localStorage.setItem('iconnect_theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  // Called by Login.jsx after successful authSignIn
  const login = ({ role: r, name, mode }) => {
    setRole(r);
    setUserName(name);
    setDemoMode(mode === 'offline');
    setPage('dashboard');
  };

  const logout = async () => {
    await authSignOut();
    setRole(null);
    setUserName(null);
    setDemoMode(false);
    setPage('dashboard');
    setArtifacts([]);
  };

  const onApprove = async (id) => {
    await approveArtifact(id);
    setArtifacts(a => a.map(x => x.id === id ? { ...x, status: 'approved' } : x));
  };

  const onReject = async (id) => {
    await rejectArtifact(id);
    setArtifacts(a => a.filter(x => x.id !== id));
  };

  // UploadPage handles the Supabase insert itself and passes the result here
  const onUpload = (art) => {
    setArtifacts(a => [art, ...a]);
    setNotifications(n => [{
      id: Date.now(),
      type: 'info',
      icon: '📤',
      unread: true,
      time: 'Just now',
      title: 'Upload Submitted',
      body: `"${art.title}" is pending Super Admin approval.`,
      channel: 'in_app',
    }, ...n]);
  };

  // User management handlers (for SADashboard Review modal)
  const onApproveUser = (id) => {
    setUsers(us => us.map(u => u.id === id ? { ...u, status: 'active', verified: true } : u));
  };
  const onRejectUser = (id) => {
    setUsers(us => us.filter(u => u.id !== id));
  };

  // Called by RegistrationPage after a successful registration
  const onRegisterSuccess = (newUser) => {
    setUsers(us => [...us, newUser]);
  };

  const unreadCount = notifications.filter(n => n.unread).length;
  const pendingCount = artifacts.filter(a => a.status === 'pending').length;

  useEffect(() => setNotifPanel(false), [page]);

  // Full-screen loading spinner while restoring session on first mount
  if (appLoading) return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: '#F9FAFB', gap: 16,
    }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <div style={{
        width: 48, height: 48, borderRadius: '50%',
        border: '4px solid #E5E7EB', borderTopColor: '#2563EB',
        animation: 'spin 0.8s linear infinite',
      }} />
      <div style={{ fontSize: 14, color: '#6B7280', fontWeight: 500 }}>
        Loading iConnect...
      </div>
    </div>
  );

  if (!role) return (
    <>
      {page === 'registration'
        ? <RegistrationPage addToast={addToast} setPage={setPage} onRegisterSuccess={onRegisterSuccess} />
        : <Login onLogin={login} onRegister={() => setPage('registration')} />
      }
      <Toasts toasts={toasts} />
    </>
  );

  const commonProps = {
    artifacts, setPage, addToast, notifications,
    setNotifications, role, onApprove, onReject, onUpload,
    userName, users, onApproveUser, onRejectUser,
  };

  const renderPage = () => {
    switch (page) {
      case 'dashboard':
        return role === 'superadmin' ? <SADashboard {...commonProps} />
          : role === 'contentadmin' ? <CADashboard {...commonProps} />
            : <DoctorDashboard {...commonProps} />;
      case 'ebooks': return <EBooksPage {...commonProps} />;
      case 'upload': return <UploadPage onUpload={onUpload} addToast={addToast} />;
      case 'leaderboard': return <LeaderboardPage />;
      case 'activity': return <ActivityPage addToast={addToast} />;
      case 'notifications': return <NotificationsPage notifications={notifications} setNotifications={setNotifications} addToast={addToast} />;
      case 'profile': return <ProfilePage addToast={addToast} />;
      case 'users': return <UsersPage users={users} addToast={addToast} />;
      case 'reports': return <ReportsPage addToast={addToast} />;
      case 'settings': return <SettingsPage addToast={addToast} />;
      case 'registration': return <RegistrationPage addToast={addToast} setPage={setPage} onRegisterSuccess={onRegisterSuccess} />;
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
      case 'kahoot': return <KahootPage />;
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
      {demoMode && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999,
          background: '#FEF3C7', color: '#92400E', textAlign: 'center',
          fontSize: 12, padding: '5px 0', fontWeight: 500, letterSpacing: 0.3,
        }}>
          ⚡ Demo Mode — Supabase offline. All data saved locally.
        </div>
      )}
      <div
        className="shell"
        style={{ marginTop: demoMode ? 28 : 0 }}
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
      </div>
    </>
  );
}
