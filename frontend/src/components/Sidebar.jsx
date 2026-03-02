import { ROLES } from '../data/constants';

export default function Sidebar({
  role, page, setPage, onLogout,
  pendingCount, unreadCount,
  isOpen, onClose
}) {
  const adminNav = [
    { k: 'dashboard', i: '📊', l: 'Dashboard' },
    { k: 'users', i: '👥', l: 'User Management' },
    { k: 'ebooks', i: '📁', l: 'Content Management' },
  ];
  const contentNav = [
    { k: 'dashboard', i: '📊', l: 'Dashboard' },
    { k: 'ebooks', i: '📁', l: 'Content Management' },
  ];
  const doctorNav = [
    { k: 'dashboard', i: '🏠', l: 'Dashboard' },
    { k: 'ebooks', i: '📚', l: 'E-Book Library' },
    { k: 'leaderboard', i: '🏆', l: 'My Leaderboard' },
    { k: 'activity', i: '📅', l: 'My Activity' },
    { k: 'notifications', i: '🔔', l: 'Notifications', b: unreadCount || null },
    { k: 'profile', i: '👤', l: 'My Profile' },
    { k: 'social', i: '👥', l: 'Social Features' },
    { k: 'groups', i: '🎯', l: 'Interest Groups' },
    { k: 'kahoot', i: '🎮', l: 'Kahoot Quiz' },
  ];

  const nav = role === 'superadmin' ? adminNav : role === 'contentadmin' ? contentNav : doctorNav;

  return (
    <div className={`sidebar ${isOpen ? 'sidebar-open' : ''}`}>
      <div className="sb-header">
        <div className="sb-logo">
          <div className="sb-logo-icon">i</div>
          <div>
            <div className="sb-logo-text">iConnect</div>
            <div className="sb-panel-label">Admin Panel</div>
          </div>
        </div>
        <button className="sidebar-close" onClick={onClose}>✕</button>
      </div>
      <nav className="sb-nav">
        {nav.map(it => (
          <div
            key={it.k}
            className={`nav-item ${page === it.k ? 'act' : ''}`}
            onClick={() => {
              setPage(it.k)
              if (onClose) onClose()
            }}
          >
            <span className="nav-ic">{it.i}</span>
            <span>{it.l}</span>
            {it.b ? <span className="nav-bdg">{it.b}</span> : null}
          </div>
        ))}
      </nav>
      <div className="sb-footer">
        <button className="logout-btn" onClick={() => {
          if (onClose) onClose()
          onLogout()
        }}>⏏ Logout</button>
      </div>
    </div>
  );
}
