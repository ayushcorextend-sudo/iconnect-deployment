import { create } from 'zustand';
import { supabase } from '../lib/supabase';

// Page name → URL path mapping
const toPath = (page) => '/' + (page === 'dashboard' ? '' : page);
const fromPath = (pathname) => {
  const seg = pathname.replace(/^\//, '');
  return seg || 'dashboard';
};

// BUG-A: Whitelist of all valid page identifiers — setPage rejects anything unknown.
// This prevents AI navigation commands or devtools exploits from routing to arbitrary pages.
const VALID_PAGES = new Set([
  'dashboard', 'ebooks', 'upload', 'leaderboard', 'activity', 'notifications',
  'profile', 'users', 'reports', 'settings', 'registration', 'conferences',
  'exam', 'broadcast', 'performance', 'learn', 'live-arena', 'arena-host', 'arena-student',
  'calendar', 'case-sim', 'study-plan', 'exam-manage', 'social', 'groups',
  'kahoot', 'notes',
]);

// Active Supabase realtime channels (module-level, survive re-renders)
const _channels = new Map();

// BUG-O: Navigator function lives outside Zustand state — functions are not
// serializable and break Zustand DevTools + any persist middleware.
let _navigateFn = null;
export function setNavigator(fn) { _navigateFn = fn; }
export function imperativeNavigate(path) { if (_navigateFn) _navigateFn(path); }

// BUG-P: track toast timeout IDs so reset() can cancel them
const _toastTimers = new Map();

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

  // Called once in MainApp to wire the router navigate function
  initRouter: (navigate, location) => {
    // BUG-O: store navigate outside Zustand — functions aren't serializable
    setNavigator(navigate);
    const page = fromPath(location.pathname);
    set({ page });
  },

  setPage: (page) => {
    // BUG-A: reject unknown page names — prevents AI/devtools navigation exploits
    if (!VALID_PAGES.has(page)) {
      console.warn(`[useAppStore] setPage: rejected unknown page "${page}"`);
      return;
    }
    // NAV-FIX: skip no-op navigations to the same page — prevents redundant
    // re-renders and potential stale-content races from double setPage calls
    // (e.g. initRouter + auth loadProfile both setting the deep-link page).
    if (page === get().page) return;
    set({ page, notifPanel: false });
    // BUG-O: use module-level imperativeNavigate, not Zustand state
    imperativeNavigate(toPath(page));
  },

  // Sync page when browser back/forward changes the URL.
  // Guard: skip if page is already correct — prevents redundant re-renders.
  syncFromLocation: (pathname) => {
    const page = fromPath(pathname);
    if (page === get().page) return;
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
    // BUG-P: store the timer ID so reset() can cancel pending dismissals
    const timer = setTimeout(() => {
      _toastTimers.delete(id);
      set(s => ({ toasts: s.toasts.filter(x => x.id !== id) }));
    }, 3500);
    _toastTimers.set(id, timer);
  },

  // Cancel all pending toast timers and wipe state (call on logout)
  reset: () => {
    for (const timer of _toastTimers.values()) clearTimeout(timer);
    _toastTimers.clear();
    set({ toasts: [], notifications: [], notifPanel: false });
  },

  // BUG-H: deduplicate by id — realtime + initial fetch can both fire for the same row
  pushNotification: (notif) => set(s => {
    if (s.notifications.some(n => n.id === notif.id)) return s;
    return { notifications: [notif, ...s.notifications] };
  }),

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
      .subscribe((status, err) => {
        if (status === 'CHANNEL_ERROR') {
          console.warn('[Realtime] Channel error for notifications — removing to prevent infinite retry:', err?.message);
          supabase.removeChannel(channel);
          _channels.delete(key);
        }
        if (status === 'TIMED_OUT') {
          console.warn('[Realtime] Channel timed out — removing to prevent infinite retry');
          supabase.removeChannel(channel);
          _channels.delete(key);
        }
      });

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

  // ── Diary cache — shared between Dashboard and Activity page ────────────
  // Maps date string ('YYYY-MM-DD') → saved diary payload.
  // Written by JournalModal on every save; read by both calendar pages to
  // reflect edits immediately without waiting for a full re-fetch.
  diaryCache: {},
  setDiaryCache: (date, data) =>
    set(s => ({ diaryCache: { ...s.diaryCache, [date]: { ...data, _savedAt: Date.now() } } })),
}));
