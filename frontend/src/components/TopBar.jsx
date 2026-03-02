import { useState, useRef, useEffect } from 'react'
import { ROLES } from '../data/constants'

export default function TopBar({
  title, role, unreadCount, setPage,
  notifPanelOpen, setNotifPanel, notifications,
  darkMode, setDarkMode, setSidebarOpen
}) {
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const searchRef = useRef(null)
  const recent = notifications.filter(n => n.unread).slice(0, 3)
  const r = ROLES[role]

  const ALL_PAGES = [
    { label: 'Dashboard', key: 'dashboard', icon: '🏠' },
    { label: 'E-Book Library', key: 'ebooks', icon: '📚' },
    { label: 'Upload E-Book', key: 'upload', icon: '⬆️' },
    { label: 'My Leaderboard', key: 'leaderboard', icon: '🏆' },
    { label: 'My Activity', key: 'activity', icon: '📅' },
    { label: 'Notifications', key: 'notifications', icon: '🔔' },
    { label: 'My Profile', key: 'profile', icon: '👤' },
    { label: 'User Management', key: 'users', icon: '👥' },
    { label: 'Reports', key: 'reports', icon: '📈' },
    { label: 'Settings', key: 'settings', icon: '⚙️' },
  ]

  const searchResults = searchQuery.trim().length > 0
    ? ALL_PAGES
        .filter(p =>
          p.label.toLowerCase().includes(searchQuery.toLowerCase())
        )
        .slice(0, 6)
    : []

  useEffect(() => {
    const handleClick = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setSearchOpen(false)
        setSearchQuery('')
      }
    }
    const handleKey = (e) => {
      if (e.key === 'Escape') {
        setSearchOpen(false)
        setSearchQuery('')
      }
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [])

  return (
    <div className="topbar">
      <div className="topbar-left">
        <span
          style={{ cursor: 'pointer', fontSize: 18, padding: '4px 8px' }}
          onClick={() => setSidebarOpen && setSidebarOpen(true)}
        >☰</span>
        <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)' }}>{title}</span>
      </div>

      <div className="topbar-right">
        {/* Search widget */}
        <div ref={searchRef} style={{ position: 'relative' }}>
          <button
            className="icon-btn"
            onClick={() => { setSearchOpen(s => !s); setSearchQuery('') }}
            title="Search"
          >
            🔍
          </button>
          {searchOpen && (
            <div style={{
              position: 'absolute', top: 44, right: 0,
              width: 300, background: 'var(--white)',
              border: '1px solid var(--border)', borderRadius: 8,
              boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
              zIndex: 300, overflow: 'hidden'
            }}>
              <div style={{
                padding: '10px 12px',
                borderBottom: '1px solid var(--border)'
              }}>
                <input
                  autoFocus
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search pages..."
                  style={{
                    width: '100%', border: 'none', outline: 'none',
                    fontSize: 13, background: 'transparent',
                    color: 'var(--text)', fontFamily: 'inherit'
                  }}
                />
              </div>
              {!searchQuery && (
                <div style={{
                  padding: '16px 14px', color: 'var(--muted)',
                  fontSize: 13, textAlign: 'center'
                }}>
                  Start typing to search pages...
                </div>
              )}
              {searchQuery && searchResults.length === 0 && (
                <div style={{
                  padding: '16px 14px', color: 'var(--muted)',
                  fontSize: 13, textAlign: 'center'
                }}>
                  No results for "{searchQuery}"
                </div>
              )}
              {searchResults.map(r => (
                <div
                  key={r.key}
                  onClick={() => {
                    setPage(r.key)
                    setSearchOpen(false)
                    setSearchQuery('')
                  }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 14px', cursor: 'pointer',
                    fontSize: 13, color: 'var(--text)',
                    transition: 'background 0.15s'
                  }}
                  onMouseEnter={e =>
                    e.currentTarget.style.background = 'var(--surf)'
                  }
                  onMouseLeave={e =>
                    e.currentTarget.style.background = 'transparent'
                  }
                >
                  <span style={{ fontSize: 16, width: 24 }}>{r.icon}</span>
                  <span>{r.label}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Dark mode toggle */}
        <button
          className="icon-btn"
          onClick={() => setDarkMode && setDarkMode(d => !d)}
          title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {darkMode ? '☀️' : '🌙'}
        </button>

        {/* Notification bell */}
        <div style={{ position: 'relative' }}>
          <div className="icon-btn" onClick={() => setNotifPanel(!notifPanelOpen)}>
            🔔
            {unreadCount > 0 && <span className="notif-count">{unreadCount}</span>}
          </div>
          {notifPanelOpen && (
            <div style={{
              position: 'absolute', right: 0, top: 42, width: 320,
              background: 'var(--white)',
              borderRadius: 8, border: '1px solid var(--border)',
              boxShadow: '0 10px 15px -3px rgba(0,0,0,.1)', zIndex: 300,
              animation: 'scaleIn .15s ease',
            }}>
              <div style={{ padding: '12px 14px 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)' }}>
                <span style={{ fontWeight: 600, fontSize: 13 }}>Notifications</span>
                <span style={{ fontSize: 11, color: '#2563EB', cursor: 'pointer' }} onClick={() => setPage('notifications')}>See all</span>
              </div>
              <div style={{ padding: '6px', maxHeight: 280, overflowY: 'auto' }}>
                {recent.length === 0
                  ? <div style={{ padding: 16, textAlign: 'center', fontSize: 13, color: '#6B7280' }}>All caught up! ✅</div>
                  : recent.map(n => (
                    <div key={n.id} className="ni unr" onClick={() => { setPage('notifications'); setNotifPanel(false); }}>
                      <div className="ni-ic" style={{ background: '#EFF6FF' }}>{n.icon}</div>
                      <div>
                        <div className="ni-t">{n.title}</div>
                        <div className="ni-b">{n.body.substring(0, 55)}…</div>
                        <div className="ni-time">{n.time}</div>
                      </div>
                    </div>
                  ))
                }
              </div>
            </div>
          )}
        </div>

        <div className="role-badge">{r?.label}</div>
      </div>
    </div>
  )
}
