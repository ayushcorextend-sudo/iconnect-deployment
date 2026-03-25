import { create } from 'zustand';
import { supabase } from '../lib/supabase';

// Page name → URL path mapping
const toPath = (page) => '/' + (page === 'dashboard' ? '' : page);
const fromPath = (pathname) => {
  const seg = pathname.replace(/^\//, '');
  return seg || 'dashboard';
};

// Active Supabase realtime channels (module-level, survive re-renders)
const _channels = new Map();

export const useAppStore = create((set, get) => ({
  page:          'dashboard',
  darkMode:      (() => {
    const stored = localStorage.getItem('iconnect_theme');
    const isDark = stored ? stored === 'dark' : (window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false);
    // Apply class immediately — before React renders — to prevent flash of unstyled content
    document.documentElement.classList.toggle('dark', isDark);
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    return isDark;
  })(),
  sidebarOpen:   false,
  notifPanel:    false,
  toasts:        [],
  notifications: [],
  artifacts:     [],
  users:         [],
  _navigate:     null, // injected by MainApp after router mounts

  // Called once in MainApp to wire the router navigate function
  initRouter: (navigate, location) => {
    const page = fromPath(location.pathname);
    set({ _navigate: navigate, page });
  },

  setPage: (page) => {
    set({ page, notifPanel: false });
    const nav = get()._navigate;
    if (nav) nav(toPath(page), { replace: false });
  },

  // Sync page when browser back/forward changes the URL
  syncFromLocation: (pathname) => {
    const page = fromPath(pathname);
    set({ page, notifPanel: false });
  },

  setDarkMode: (darkMode) => {
    localStorage.setItem('iconnect_theme', darkMode ? 'dark' : 'light');
    // Apply synchronously so the class is set before the next React render
    document.documentElement.classList.toggle('dark', darkMode);
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light');
    set({ darkMode });
  },
  setSidebarOpen:   (sidebarOpen)   => set({ sidebarOpen }),
  setNotifPanel:    (notifPanel)    => set({ notifPanel }),
  setNotifications: (notifications) => set({ notifications }),
  setArtifacts:     (artifacts)     => set({ artifacts }),
  setUsers:         (users)         => set({ users }),

  addToast: (type, msg) => {
    const id = Date.now();
    set(s => ({ toasts: [...s.toasts, { id, type, msg }] }));
    setTimeout(() => set(s => ({ toasts: s.toasts.filter(x => x.id !== id) })), 3500);
  },

  pushNotification: (notif) => set(s => ({ notifications: [notif, ...s.notifications] })),

  // ── Centralized realtime notification subscription ──────────────────────
  // Call once after userId is known; safe to call again on re-login.
  subscribeToNotifications: (userId) => {
    if (!userId) return;
    const key = `notifs-${userId}`;
    if (_channels.has(key)) return; // already subscribed

    const channel = supabase
      .channel(key)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'notifications',
        filter: `user_id=eq.${userId}`,
      }, (payload) => {
        const n = payload.new;
        get().pushNotification({
          ...n,
          time: new Date(n.created_at).toLocaleString('en-IN', {
            hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short',
          }),
        });
      })
      .subscribe();

    _channels.set(key, channel);
  },

  // Remove all active realtime channels (call on logout)
  unsubscribeAll: () => {
    for (const [, channel] of _channels) {
      supabase.removeChannel(channel);
    }
    _channels.clear();
  },

  // Artifact helpers
  updateArtifact: (id, patch) =>
    set(s => ({ artifacts: s.artifacts.map(a => a.id === id ? { ...a, ...patch } : a) })),
  prependArtifact: (art) =>
    set(s => ({ artifacts: [art, ...s.artifacts] })),

  // User helpers
  updateUser: (id, patch) =>
    set(s => ({ users: s.users.map(u => u.id === id ? { ...u, ...patch } : u) })),
}));
