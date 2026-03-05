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
    { k: 'reports', i: '📈', l: 'Reports' },
    { k: 'settings', i: '⚙️', l: 'Settings' },
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
    <div
      className={`sidebar ${isOpen ? 'sidebar-open' : ''}`}
      style={{ background: '#1E1B4B', borderRight: '1px solid rgba(255,255,255,0.08)' }}
    >
      <div className="sb-header" style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
        <div className="sb-logo">
          <div className="sb-logo-icon" style={{ background: '#F59E0B', color: '#1E1B4B' }}>i</div>
          <div>
            <div className="sb-logo-text" style={{ color: '#FFFFFF' }}>iConnect</div>
            <div className="sb-panel-label" style={{ color: 'rgba(255,255,255,0.5)' }}>
              {role === 'superadmin' ? 'Super Admin' : role === 'contentadmin' ? 'Content Admin' : 'PG Aspirant'}
            </div>
          </div>
        </div>
        <button
          className="sidebar-close"
          onClick={onClose}
          style={{ color: 'rgba(255,255,255,0.6)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 16 }}
        >✕</button>
      </div>
      <nav className="sb-nav">
        {nav.map(it => {
          const isActive = page === it.k;
          return (
            <div
              key={it.k}
              className="nav-item"
              style={{
                color: isActive ? '#FFFFFF' : '#CBD5E1',
                background: isActive ? 'rgba(255,255,255,0.10)' : 'transparent',
                borderLeft: isActive ? '3px solid #F59E0B' : '3px solid transparent',
                fontWeight: isActive ? 600 : 400,
                borderRadius: isActive ? '0 6px 6px 0' : 6,
                paddingLeft: isActive ? '9px' : '12px',
              }}
              onClick={() => {
                setPage(it.k)
                if (onClose) onClose()
              }}
              onMouseEnter={e => {
                if (!isActive) {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
                  e.currentTarget.style.color = '#FFFFFF';
                }
              }}
              onMouseLeave={e => {
                if (!isActive) {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = '#CBD5E1';
                }
              }}
            >
              <span className="nav-ic">{it.i}</span>
              <span>{it.l}</span>
              {it.b ? <span className="nav-bdg">{it.b}</span> : null}
            </div>
          );
        })}
      </nav>
      <div className="sb-footer" style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}>
        <button
          className="logout-btn"
          style={{ color: 'rgba(255,255,255,0.5)' }}
          onClick={() => {
            if (onClose) onClose()
            onLogout()
          }}
          onMouseEnter={e => e.currentTarget.style.color = '#EF4444'}
          onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.5)'}
        >⏏ Logout</button>
      </div>
    </div>
  );
}
