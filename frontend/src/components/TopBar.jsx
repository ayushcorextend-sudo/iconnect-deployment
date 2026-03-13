import { useState, useRef, useEffect } from 'react'
import { ROLES } from '../data/constants'
import { supabase } from '../lib/supabase'
import usePWAInstall from '../hooks/usePWAInstall'

export default function TopBar({
  title, role, unreadCount, setPage,
  notifPanelOpen, setNotifPanel, notifications,
  darkMode, setDarkMode, setSidebarOpen
}) {
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [liveUnread, setLiveUnread] = useState(null)
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768)
  const searchRef = useRef(null)
  const bellRef = useRef(null)
  const { isInstallable, promptInstall } = usePWAInstall()

  // Show up to 5 most recent notifications (regardless of read status)
  const recent = notifications.slice(0, 5)
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
    ? ALL_PAGES.filter(p => p.label.toLowerCase().includes(searchQuery.toLowerCase())).slice(0, 6)
    : []

  useEffect(() => {
    let channel
    async function load() {
      try {
        const { data: authData } = await supabase.auth.getUser()
        const user = authData?.user
        if (!user) return

        const { count } = await supabase
          .from('notifications')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('is_read', false)
        setLiveUnread(count || 0)

        channel = supabase.channel('topbar_notifs_' + user.id)
          .on('postgres_changes', {
            event: '*', schema: 'public', table: 'notifications',
            filter: `user_id=eq.${user.id}`
          }, async () => {
            const { count: newCount } = await supabase
              .from('notifications')
              .select('id', { count: 'exact', head: true })
              .eq('user_id', user.id)
              .eq('is_read', false)
            setLiveUnread(newCount || 0)
          })
          .subscribe()
      } catch (e) { /* silent */ }
    }
    load()
    return () => { if (channel) supabase.removeChannel(channel) }
  }, [])

  // Close search on outside click / Escape
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
        setNotifPanel(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [])

  // Track mobile breakpoint for install button visibility
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Close notif panel on outside click
  useEffect(() => {
    if (!notifPanelOpen) return
    const handleClick = (e) => {
      if (bellRef.current && !bellRef.current.contains(e.target)) {
        setNotifPanel(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [notifPanelOpen])

  // Use live count if available, fall back to prop
  const displayUnread = liveUnread !== null ? liveUnread : (unreadCount || 0)

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
              zIndex: 1000, overflow: 'hidden'
            }}>
              <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)' }}>
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
                <div style={{ padding: '16px 14px', color: 'var(--muted)', fontSize: 13, textAlign: 'center' }}>
                  Start typing to search pages...
                </div>
              )}
              {searchQuery && searchResults.length === 0 && (
                <div style={{ padding: '16px 14px', color: 'var(--muted)', fontSize: 13, textAlign: 'center' }}>
                  No results for &quot;{searchQuery}&quot;
                </div>
              )}
              {searchResults.map(r => (
                <div
                  key={r.key}
                  onClick={() => { setPage(r.key); setSearchOpen(false); setSearchQuery('') }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 14px', cursor: 'pointer',
                    fontSize: 13, color: 'var(--text)', transition: 'background 0.15s'
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--surf)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
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

        {/* Mobile PWA install button */}
        {isInstallable && isMobile && (
          <button
            className="icon-btn"
            onClick={promptInstall}
            title="Install iConnect App"
            style={{
              background: 'linear-gradient(135deg,#F59E0B,#D97706)',
              color: '#1E1B4B', borderRadius: 8,
              fontWeight: 700, fontSize: 12, padding: '5px 10px',
              border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 4,
              whiteSpace: 'nowrap',
            }}
          >
            ⬇ Install
          </button>
        )}

        {/* Notification bell — prominently in top-right */}
        <div ref={bellRef} style={{ position: 'relative' }}>
          <button
            className="icon-btn"
            onClick={() => setNotifPanel(!notifPanelOpen)}
            title="Notifications"
            style={{
              position: 'relative',
              transform: displayUnread > 0 ? 'scale(1.08)' : 'scale(1)',
              transition: 'transform 0.2s',
            }}
          >
            🔔
            {displayUnread > 0 && (
              <>
                {/* animate-ping ring behind badge */}
                <span
                  className="animate-ping"
                  style={{
                    position: 'absolute', top: -4, right: -4,
                    width: 18, height: 18, borderRadius: '50%',
                    background: '#EF4444', opacity: 0.5,
                    display: 'inline-flex',
                    pointerEvents: 'none',
                  }}
                />
                {/* count badge (static, on top) */}
                <span style={{
                  position: 'absolute', top: -4, right: -4,
                  background: '#EF4444', color: '#fff',
                  fontSize: 10, fontWeight: 700, lineHeight: 1,
                  borderRadius: '50%', minWidth: 18, height: 18,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  padding: '0 3px',
                  boxShadow: '0 0 0 2px var(--white)',
                }}>
                  {displayUnread > 99 ? '99+' : displayUnread}
                </span>
              </>
            )}
          </button>

          {/* Notification dropdown */}
          {notifPanelOpen && (
            <div style={{
              position: 'absolute', right: 0, top: 46,
              width: 340,
              background: 'var(--white)',
              borderRadius: 12,
              border: '1px solid var(--border)',
              boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
              zIndex: 1000,
              animation: 'scaleIn .15s ease',
              overflow: 'hidden',
            }}>
              {/* Header */}
              <div style={{
                padding: '14px 16px 12px',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                borderBottom: '1px solid var(--border)',
                background: 'var(--surf)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontWeight: 700, fontSize: 14 }}>Notifications</span>
                  {displayUnread > 0 && (
                    <span style={{
                      background: '#EF4444', color: '#fff',
                      fontSize: 10, fontWeight: 700,
                      borderRadius: 99, padding: '1px 7px',
                    }}>
                      {displayUnread} unread
                    </span>
                  )}
                </div>
                <button
                  onClick={() => setNotifPanel(false)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: 16, lineHeight: 1 }}
                >
                  ×
                </button>
              </div>

              {/* Notification list */}
              <div style={{ maxHeight: 320, overflowY: 'auto' }}>
                {recent.length === 0 ? (
                  <div style={{ padding: '28px 16px', textAlign: 'center' }}>
                    <div style={{ fontSize: 28, marginBottom: 8 }}>✅</div>
                    <div style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 500 }}>All caught up!</div>
                    <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>No new notifications</div>
                  </div>
                ) : (
                  recent.map((n, idx) => (
                    <div
                      key={n.id}
                      onClick={() => { setPage('notifications'); setNotifPanel(false) }}
                      style={{
                        display: 'flex', alignItems: 'flex-start', gap: 10,
                        padding: '12px 16px',
                        cursor: 'pointer',
                        borderBottom: idx < recent.length - 1 ? '1px solid var(--border)' : 'none',
                        background: n.is_read === false ? 'rgba(37,99,235,0.06)' : 'transparent',
                        transition: 'background 0.15s',
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--surf)'}
                      onMouseLeave={e => e.currentTarget.style.background = n.is_read === false ? 'rgba(37,99,235,0.06)' : 'transparent'}
                    >
                      {/* Unread dot */}
                      <div style={{ paddingTop: 3, flexShrink: 0 }}>
                        <div style={{
                          width: 7, height: 7, borderRadius: '50%',
                          background: n.is_read === false ? '#EF4444' : 'transparent',
                          border: n.is_read === false ? 'none' : '1px solid var(--border)',
                        }} />
                      </div>
                      <div style={{
                        width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                        background: n.is_read === false ? '#EFF6FF' : 'var(--surf)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 15,
                      }}>
                        {n.icon || '🔔'}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: n.is_read === false ? 600 : 500, color: 'var(--text)', marginBottom: 2 }}>
                          {n.title}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {n.body?.substring(0, 60)}{n.body?.length > 60 ? '…' : ''}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 3 }}>{n.time}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Footer: View All */}
              <div style={{
                padding: '10px 16px',
                borderTop: '1px solid var(--border)',
                background: 'var(--surf)',
              }}>
                <button
                  onClick={() => { setPage('notifications'); setNotifPanel(false) }}
                  style={{
                    width: '100%', padding: '8px', background: '#2563EB',
                    color: '#fff', border: 'none', borderRadius: 8,
                    fontSize: 13, fontWeight: 600, cursor: 'pointer',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = '#1D4ED8'}
                  onMouseLeave={e => e.currentTarget.style.background = '#2563EB'}
                >
                  View All Notifications →
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="role-badge">{r?.label}</div>
      </div>
    </div>
  )
}
