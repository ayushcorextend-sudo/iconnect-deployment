import { ROLES } from '../data/constants';
import usePWAInstall from '../hooks/usePWAInstall';
import { useTenantStore } from '../stores/useTenantStore';
import {
  LayoutDashboard, CalendarDays, BookOpen, GraduationCap, Trophy,
  Activity, BarChart3, Bell, User, Users, MessageSquare, Target,
  Building2, FileText, Microscope, Swords, Upload, Settings,
  Radio, Megaphone, LogOut, Download, ChevronRight,
  Bookmark, Globe, Video, Brain, Sparkles, ClipboardList, ClipboardCheck
} from 'lucide-react';

const iconMap = {
  dashboard: LayoutDashboard,
  calendar: CalendarDays,
  ebooks: BookOpen,
  learn: GraduationCap,
  'arena-student': Swords,
  'arena-host': Swords,
  leaderboard: Trophy,
  activity: Activity,
  performance: BarChart3,
  notifications: Bell,
  profile: User,
  social: Users,
  groups: Target,
  conferences: Globe,
  exam: FileText,
  'case-sim': Microscope,
  'study-plan': ClipboardList,
  'exam-manage': ClipboardCheck,
  users: Users,
  reports: BarChart3,
  settings: Settings,
  broadcast: Megaphone,
  upload: Upload,
  research: Bookmark,
  literature: BookOpen,
  webinars: Video,
  quiz: Brain,
  rewards: Sparkles,
};

function NavGroup({ label, children }) {
  return (
    <div className="nav-group">
      {label && <div className="nav-group-label">{label}</div>}
      {children}
    </div>
  );
}

function NavItem({ item, page, setPage, onClose }) {
  const isActive = page === item.k;
  const Icon = iconMap[item.k] || LayoutDashboard;

  return (
    <div
      className={`nav-item-v2 ${isActive ? 'nav-active' : ''}`}
      onClick={() => {
        setPage(item.k);
        if (onClose) onClose();
      }}
    >
      <Icon size={18} strokeWidth={isActive ? 2 : 1.5} />
      <span className="nav-label">{item.l}</span>
      {item.b ? <span className="nav-bdg-v2">{item.b}</span> : null}
    </div>
  );
}

export default function Sidebar({
  role, page, setPage, onLogout,
  pendingCount, unreadCount,
  isOpen, onClose
}) {
  const { isInstallable, promptInstall } = usePWAInstall();
  const tenant = useTenantStore(s => s.tenant);

  // ── Admin Navigation ──
  const adminOverview = [
    { k: 'dashboard', l: 'Dashboard' },
  ];
  const adminManage = [
    { k: 'users', l: 'User Management' },
    { k: 'ebooks', l: 'Content Management' },
    { k: 'reports', l: 'Reports' },
    { k: 'broadcast', l: 'Engage' },
    { k: 'settings', l: 'Settings' },
  ];

  // ── Content Admin Navigation ──
  const caOverview = [
    { k: 'dashboard', l: 'Dashboard' },
  ];
  const caContent = [
    { k: 'upload', l: 'Upload Content' },
    { k: 'ebooks', l: 'E-Book Library' },
    { k: 'arena-host', l: 'Host Live Arena' },
    { k: 'exam-manage', l: 'Exam Manager' },
    { k: 'broadcast', l: 'Notification Center' },
  ];
  const caAccount = [
    { k: 'notifications', l: 'Notifications', b: unreadCount || null },
    { k: 'profile', l: 'My Profile' },
    { k: 'settings', l: 'Settings' },
  ];

  // ── Doctor Navigation (Grouped) ──
  const drOverview = [
    { k: 'dashboard', l: 'Dashboard' },
    { k: 'activity', l: 'My Activity' },
    { k: 'leaderboard', l: 'My Leaderboard' },
    { k: 'notifications', l: 'Notifications', b: unreadCount || null },
  ];
  const drContent = [
    { k: 'ebooks', l: 'E-Books' },
    { k: 'learn', l: 'Learn Hub' },
    { k: 'exam', l: 'Exam Questions' },
    { k: 'conferences', l: 'Conferences' },
    { k: 'arena-student', l: 'Live Arena' },
    { k: 'calendar', l: 'Study Calendar' },
    { k: 'case-sim', l: 'Case Simulator' },
    { k: 'study-plan', l: 'Study Plan Engine' },
  ];
  const drMore = [
    { k: 'performance', l: 'My Performance' },
    { k: 'social', l: 'Social Features' },
    { k: 'groups', l: 'Interest Groups' },
    { k: 'profile', l: 'My Profile' },
  ];

  const renderNav = () => {
    if (role === 'superadmin') {
      return (
        <>
          <NavGroup label="OVERVIEW">
            {adminOverview.map(it => <NavItem key={it.k} item={it} page={page} setPage={setPage} onClose={onClose} />)}
          </NavGroup>
          <NavGroup label="MANAGEMENT">
            {adminManage.map(it => <NavItem key={it.k} item={it} page={page} setPage={setPage} onClose={onClose} />)}
          </NavGroup>
        </>
      );
    }
    if (role === 'contentadmin') {
      return (
        <>
          <NavGroup label="OVERVIEW">
            {caOverview.map(it => <NavItem key={it.k} item={it} page={page} setPage={setPage} onClose={onClose} />)}
          </NavGroup>
          <NavGroup label="CONTENT">
            {caContent.map(it => <NavItem key={it.k} item={it} page={page} setPage={setPage} onClose={onClose} />)}
          </NavGroup>
          <NavGroup label="ACCOUNT">
            {caAccount.map(it => <NavItem key={it.k} item={it} page={page} setPage={setPage} onClose={onClose} />)}
          </NavGroup>
        </>
      );
    }
    // Doctor
    return (
      <>
        <NavGroup label="OVERVIEW">
          {drOverview.map(it => <NavItem key={it.k} item={it} page={page} setPage={setPage} onClose={onClose} />)}
        </NavGroup>
        <NavGroup label="CONTENT">
          {drContent.map(it => <NavItem key={it.k} item={it} page={page} setPage={setPage} onClose={onClose} />)}
        </NavGroup>
        <NavGroup>
          {drMore.map(it => <NavItem key={it.k} item={it} page={page} setPage={setPage} onClose={onClose} />)}
        </NavGroup>
      </>
    );
  };

  return (
    <div className={`sidebar-v2 ${isOpen ? 'sidebar-open' : ''}`}>
      {/* Logo Header */}
      <div className="sb-header-v2">
        <div className="sb-logo-v2">
          {tenant?.logo_url ? (
            <img src={tenant.logo_url} alt={tenant.name} style={{ width: 32, height: 32, borderRadius: 8, objectFit: 'cover' }} />
          ) : (
            <div className="sb-logo-icon-v2" style={{ background: tenant?.primary_color || '#4F46E5' }}>i</div>
          )}
          <div>
            <div className="sb-logo-text-v2">{tenant?.name || 'iConnect'}</div>
            <div className="sb-role-label">
              {role === 'superadmin' ? 'Super Admin' : role === 'contentadmin' ? 'Content Admin' : 'Icon Lifescience'}
            </div>
          </div>
        </div>
        <button className="sidebar-close" onClick={onClose} aria-label="Close sidebar">
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Navigation */}
      <nav className="sb-nav-v2">
        {renderNav()}
      </nav>

      {/* Footer */}
      <div className="sb-footer-v2">
        {isInstallable && (
          <button className="sb-install-btn" onClick={promptInstall} title="Install iConnect as an app">
            <Download size={15} />
            Install App
          </button>
        )}
        <button
          className="sb-logout-btn"
          onClick={() => { if (onClose) onClose(); onLogout(); }}
        >
          <LogOut size={15} />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
}
