import { useState, useRef, useEffect } from 'react'
import { ROLES } from '../data/constants'
import { supabase } from '../lib/supabase'
import usePWAInstall from '../hooks/usePWAInstall'
import { useTenantStore } from '../stores/useTenantStore'
import { useAuth } from '../context/AuthContext'
import {
  Search, Moon, Sun, Bell, Menu, Download, ShieldCheck,
  X, ChevronRight, Lock, Share, PlusSquare, ExternalLink
} from 'lucide-react'

export default function TopBar({
  title, role, unreadCount, setPage,
  notifPanelOpen, setNotifPanel, notifications,
  darkMode, setDarkMode, setSidebarOpen
}) {
  const { user } = useAuth()
  const tenant = useTenantStore(s => s.tenant)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [liveUnread, setLiveUnread] = useState(null)
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768)
  const searchRef = useRef(null)
  const bellRef = useRef(null)
  const { isInstalled, isInstallable, isIOS, promptInstall } = usePWAInstall()
  // Install button popover state — only used as fallback when promptInstall can't do it directly
  const [installHint, setInstallHint] = useState(null) // null | 'ios-safari' | 'ios-chrome' | 'no-prompt'
  const installHintRef = useRef(null)

  async function handleInstallClick() {
    const result = await promptInstall()
    if (result === 'accepted' || result === 'dismissed' || result === 'shared') {
      setInstallHint(null)
      return
    }
    // Could not install in one click — show the appropriate inline hint
    setInstallHint(result)
    // Auto-dismiss the desktop tooltip after 6s
    if (result === 'no-prompt') {
      setTimeout(() => setInstallHint(h => (h === 'no-prompt' ? null : h)), 6000)
    }
  }

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
        if (!user?.id) return
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

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    if (!installHint) return
    const handleClick = (e) => {
      if (installHintRef.current && !installHintRef.current.contains(e.target)) {
        setInstallHint(null)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [installHint])

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

  const displayUnread = liveUnread !== null ? liveUnread : (unreadCount || 0)

  return (
    <div className="topbar-v2">
      {/* ── Mobile search overlay — full-width bar replaces topbar on mobile ── */}
      {searchOpen && isMobile && (
        <div className="topbar-search-overlay" ref={searchRef}>
          <Search size={16} style={{ color: 'var(--muted)', flexShrink: 0 }} />
          <input
            autoFocus
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search pages..."
            style={{
              flex: 1, border: 'none', outline: 'none', fontSize: 14,
              background: 'transparent', color: 'var(--text)', fontFamily: 'inherit',
            }}
          />
          <button
            onClick={() => { setSearchOpen(false); setSearchQuery('') }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: 'var(--muted)', display: 'flex' }}
          >
            <X size={18} />
          </button>
          {/* Results dropdown */}
          {(searchQuery || !searchQuery) && (
            <div className="topbar-search-overlay-results">
              {!searchQuery && (
                <div style={{ padding: '18px 16px', color: 'var(--muted)', fontSize: 13, textAlign: 'center' }}>
                  Start typing to search…
                </div>
              )}
              {searchQuery && searchResults.length === 0 && (
                <div style={{ padding: '18px 16px', color: 'var(--muted)', fontSize: 13, textAlign: 'center' }}>
                  No results for &quot;{searchQuery}&quot;
                </div>
              )}
              {searchResults.map(res => (
                <div
                  key={res.key}
                  className="search-result-item"
                  onClick={() => { setPage(res.key); setSearchOpen(false); setSearchQuery('') }}
                >
                  <span style={{ fontSize: 16, width: 24 }}>{res.icon}</span>
                  <span>{res.label}</span>
                  <ChevronRight size={14} style={{ marginLeft: 'auto', opacity: 0.4 }} />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Normal topbar content (hidden on mobile when search open) ── */}
      {(!searchOpen || !isMobile) && (
        <>
          <div className="topbar-left-v2">
            <button
              className="topbar-menu-btn"
              onClick={() => setSidebarOpen && setSidebarOpen(true)}
              aria-label="Open menu"
            >
              <Menu size={20} />
            </button>
            <div className="topbar-breadcrumb">
              {tenant?.logo_url && (
                <img src={tenant.logo_url} alt="" style={{ width: 22, height: 22, borderRadius: 5, objectFit: 'cover', marginRight: 6, verticalAlign: 'middle' }} />
              )}
              <span className="topbar-title-v2">{title}</span>
            </div>
          </div>

          <div className="topbar-center-v2">
            <div className="secure-session-badge">
              <Lock size={12} />
              <span>Secure Session</span>
            </div>
          </div>

          <div className="topbar-right-v2">
            {/* Search — desktop gets dropdown, mobile opens full overlay */}
            <div ref={searchRef} style={{ position: 'relative' }}>
              <button
                className="topbar-icon-btn"
                onClick={() => { setSearchOpen(s => !s); setSearchQuery('') }}
                title="Search"
              >
                <Search size={18} />
              </button>
              {searchOpen && !isMobile && (
                <div className="topbar-dropdown search-dropdown">
                  <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Search size={14} style={{ color: 'var(--muted)', flexShrink: 0 }} />
                    <input
                      autoFocus
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      placeholder="Search pages..."
                      style={{
                        flex: 1, border: 'none', outline: 'none',
                        fontSize: 13, background: 'transparent',
                        color: 'var(--text)', fontFamily: 'inherit'
                      }}
                    />
                  </div>
                  {!searchQuery && (
                    <div style={{ padding: '16px 14px', color: 'var(--muted)', fontSize: 13, textAlign: 'center' }}>
                      Start typing to search...
                    </div>
                  )}
                  {searchQuery && searchResults.length === 0 && (
                    <div style={{ padding: '16px 14px', color: 'var(--muted)', fontSize: 13, textAlign: 'center' }}>
                      No results for &quot;{searchQuery}&quot;
                    </div>
                  )}
                  {searchResults.map(res => (
                    <div
                      key={res.key}
                      className="search-result-item"
                      onClick={() => { setPage(res.key); setSearchOpen(false); setSearchQuery('') }}
                    >
                      <span style={{ fontSize: 16, width: 24 }}>{res.icon}</span>
                      <span>{res.label}</span>
                      <ChevronRight size={14} style={{ marginLeft: 'auto', opacity: 0.4 }} />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Dark mode toggle */}
            <button
              className="topbar-icon-btn"
              onClick={() => setDarkMode && setDarkMode(!darkMode)}
              title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {darkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            {/* PWA install — single direct button on every device. Hidden on desktop if prompt is unavailable to avoid annoying tooltip. */}
            {!isInstalled && (isInstallable || isIOS) && (
              <div ref={installHintRef} style={{ position: 'relative' }}>
                <button
                  className="topbar-install-btn"
                  onClick={handleInstallClick}
                  title="Install iConnect App"
                >
                  <Download size={14} />
                  <span>Install</span>
                </button>

                {/* Fallback popovers — only shown when 1-click install couldn't fire */}
                {installHint === 'ios-safari' && (
                  <div className="topbar-dropdown" style={{ width: 260, right: 0, padding: '14px 16px' }}>
                    <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10, color: 'var(--text)' }}>📲 Install iConnect</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: 'var(--text)' }}>
                        <div style={{ width: 28, height: 28, borderRadius: 8, background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <Share size={14} style={{ color: '#2563EB' }} />
                        </div>
                        <span>Tap the <strong>Share</strong> button in Safari</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: 'var(--text)' }}>
                        <div style={{ width: 28, height: 28, borderRadius: 8, background: '#F0FDF4', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <PlusSquare size={14} style={{ color: '#16A34A' }} />
                        </div>
                        <span>Scroll down → tap <strong>Add to Home Screen</strong></span>
                      </div>
                    </div>
                  </div>
                )}

                {installHint === 'ios-chrome' && (
                  <div className="topbar-dropdown" style={{ width: 260, right: 0, padding: '14px 16px' }}>
                    <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8, color: 'var(--text)' }}>📲 Install iConnect</div>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 13, color: 'var(--text)', lineHeight: 1.45 }}>
                      <ExternalLink size={15} style={{ color: '#4F46E5', marginTop: 1, flexShrink: 0 }} />
                      <span>Chrome can't install apps on iPhone. Open this page in <strong>Safari</strong>, then tap Install — it'll work in one tap.</span>
                    </div>
                  </div>
                )}

                {installHint === 'no-prompt' && (
                  <div className="topbar-install-tooltip">
                    Click the <strong>install icon (⊕)</strong> in your address bar to install iConnect.
                  </div>
                )}
              </div>
            )}

            {/* Notification bell */}
        <div ref={bellRef} style={{ position: 'relative' }}>
          <button
            className="topbar-icon-btn"
            onClick={() => setNotifPanel(!notifPanelOpen)}
            title="Notifications"
          >
            <Bell size={18} />
            {displayUnread > 0 && (
              <span className="notif-badge-v2">
                {displayUnread > 99 ? '99+' : displayUnread}
              </span>
            )}
          </button>

          {notifPanelOpen && (
            <div className="topbar-dropdown notif-dropdown">
              <div className="notif-dropdown-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontWeight: 700, fontSize: 14 }}>Notifications</span>
                  {displayUnread > 0 && (
                    <span className="notif-unread-chip">{displayUnread} new</span>
                  )}
                </div>
                <button className="notif-close-btn" onClick={() => setNotifPanel(false)}>
                  <X size={16} />
                </button>
              </div>

              <div style={{ maxHeight: 320, overflowY: 'auto' }}>
                {recent.length === 0 ? (
                  <div style={{ padding: '28px 16px', textAlign: 'center' }}>
                    <div style={{ fontSize: 28, marginBottom: 8, opacity: 0.5 }}>✅</div>
                    <div style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 500 }}>All caught up!</div>
                  </div>
                ) : (
                  recent.map((n, idx) => (
                    <div
                      key={n.id}
                      className={`notif-item-v2 ${n.is_read === false ? 'unread' : ''}`}
                      onClick={() => { setPage('notifications'); setNotifPanel(false) }}
                    >
                      <div className="notif-dot-wrap">
                        {n.is_read === false && <div className="notif-dot" />}
                      </div>
                      <div className="notif-icon-wrap">
                        {n.icon || '🔔'}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="notif-title-v2">{n.title}</div>
                        <div className="notif-body-v2">{n.body?.substring(0, 60)}{n.body?.length > 60 ? '…' : ''}</div>
                        <div className="notif-time-v2">{n.time}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="notif-dropdown-footer">
                <button
                  className="notif-view-all-btn"
                  onClick={() => { setPage('notifications'); setNotifPanel(false) }}
                >
                  View All Notifications
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </div>

            {/* Verified badge */}
            <div className="verified-badge-v2">
              <ShieldCheck size={14} />
              <span>Verified</span>
            </div>

            {/* Role label */}
            <div className="role-badge-v2">{r?.label}</div>
          </div>
        </>
      )}
    </div>
  )
}
