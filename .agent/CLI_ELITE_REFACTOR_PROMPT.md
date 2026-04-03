
# CLAUDE CODE PROMPT — Elite Architecture Refactor: Kill the Navigation Bug at the Root
# ════════════════════════════════════════════════════════════════
# This is NOT a patch. This is a structural refactor that makes the
# navigation stale-content bug (and an entire class of future bugs)
# architecturally impossible.
#
# Paste the content inside the triple backticks into Claude Code CLI.
# ════════════════════════════════════════════════════════════════

```
You are performing a surgical architectural refactor on iConnect's routing and page-rendering system. The goal is to fix a P0 navigation bug AND prevent an entire class of state-sync bugs from ever recurring.

READ THESE FILES FIRST (mandatory):
- .agent/E2E_COWORK_REPORT.md (the bug evidence — READ THE FULL "BUG-NAV-001" SECTION)
- .agent/handoff.md (session state)
- CLAUDE.md (project rules — follow strictly, especially "no new stores")

═══ THE P0 BUG ═══

Every sidebar click shows the PREVIOUS page's content. 100% reproducible, zero console errors.

Dashboard → click E-Books → URL says /ebooks, TopBar says "E-Book Library", content shows DASHBOARD.
E-Books → click Activity → URL says /activity, TopBar says "My Activity", content shows E-BOOKS.

Hard refresh on any page loads correct content. Only sidebar navigation is broken.

═══ THE ROOT CAUSE (ARCHITECTURAL) ═══

The app has a circular state dependency between Zustand and React Router:

```
Sidebar click
  → setPage('ebooks')                    [1] Zustand set({ page: 'ebooks' })
  → imperativeNavigate('/ebooks')        [2] React Router navigate('/ebooks')
  → location.pathname changes            [3] React Router triggers re-render
  → syncFromLocation useEffect fires     [4] Zustand set({ page: 'ebooks' }) AGAIN
  → React re-renders                     [5] But WHICH render wins?
```

Two different state systems (Zustand + React Router) both think they own "current page."
Under React 19's concurrent rendering + StrictMode + automatic batching, this creates a
race where renders can commit with stale values.

This is a DESIGN problem, not a code bug. Patching it with guards or microtasks will create
new edge cases. We need to pick ONE source of truth.

═══ THE REFACTOR: URL IS THE SINGLE SOURCE OF TRUTH ═══

**Principle: The URL drives the page. Not Zustand. Not imperative calls. The URL.**

This is how Next.js, Remix, React Router v6.4+, Linear, Notion, and every serious
React app works. The URL is the source of truth for "what page am I on."

PHASE 1: MAKE REACT ROUTER OWN THE ROUTES (the critical fix)
PHASE 2: DECOMPOSE THE GOD COMPONENT (structural health)
PHASE 3: VERIFY + BUILD + TEST

═══ PHASE 1: React Router Route Declarations ═══

**Step 1.1: Create a route config file**

Create `frontend/src/routes.jsx`:

```jsx
import { lazy } from 'react';

// Lazy page components
const SADashboard           = lazy(() => import('./components/SADashboard'));
const CADashboard           = lazy(() => import('./components/CADashboard'));
const ContentAdminDashboard = lazy(() => import('./components/ContentAdminDashboard'));
const DoctorDashboard       = lazy(() => import('./components/DoctorDashboard'));
const EBooksPage            = lazy(() => import('./components/EBooksPage'));
const UploadPage            = lazy(() => import('./components/UploadPage'));
const LeaderboardPage       = lazy(() => import('./components/LeaderboardPage'));
const ActivityPage          = lazy(() => import('./components/ActivityPage'));
const NotificationsPage     = lazy(() => import('./components/NotificationsPage'));
const ProfilePage           = lazy(() => import('./components/ProfilePage'));
const UsersPage             = lazy(() => import('./components/UsersPage'));
const ReportsPage           = lazy(() => import('./components/ReportsPage'));
const SettingsPage          = lazy(() => import('./components/SettingsPage'));
const RegistrationPage      = lazy(() => import('./components/RegistrationPage'));
const ComingSoonPage        = lazy(() => import('./components/ComingSoonPage'));
const ConferencesPage       = lazy(() => import('./components/ConferencesPage'));
const ExamPage              = lazy(() => import('./components/ExamPage'));
const BroadcastPage         = lazy(() => import('./components/BroadcastPage'));
const CaseSimulator         = lazy(() => import('./components/CaseSimulator'));
const StudyPlanPage         = lazy(() => import('./components/StudyPlan/StudyPlanPage'));
const ExamManager           = lazy(() => import('./components/Exam/ExamManager'));
const MyPerformancePage     = lazy(() => import('./components/MyPerformancePage'));
const LearnHub              = lazy(() => import('./components/content/LearnHub'));
const LiveArenaHost         = lazy(() => import('./components/arena/LiveArenaHost'));
const LiveArenaStudent      = lazy(() => import('./components/arena/LiveArenaStudent'));
const StudyCalendar         = lazy(() => import('./components/StudyCalendar'));
const NotesPage             = lazy(() => import('./pages/Notes'));

// Role → allowed page keys (empty = unrestricted)
export const ROLE_PAGES = {
  doctor: [
    'dashboard', 'ebooks', 'leaderboard', 'activity', 'notifications',
    'profile', 'exam', 'broadcast', 'performance', 'learn',
    'arena-student', 'calendar', 'case-sim', 'study-plan',
    'social', 'groups', 'conferences', 'settings', 'notes',
  ],
  contentadmin: [
    'dashboard', 'upload', 'notifications', 'profile', 'settings',
    'learn', 'broadcast',
  ],
  superadmin: [], // unrestricted
};

// Page key → route path
// (key and path are the same for most pages; dashboard = '/')
export const PAGE_PATH = {
  dashboard: '/',
};

export function getPageFromPath(pathname) {
  const seg = pathname.replace(/^\//, '') || 'dashboard';
  return seg;
}

export function getPathFromPage(page) {
  return PAGE_PATH[page] || `/${page}`;
}

// The route table — maps page keys to components
// The `element` factory receives props so we don't break existing prop drilling
// (Phase 2 will remove prop drilling; this is the bridge)
export const PAGE_COMPONENTS = {
  // Dashboards (role-dispatched in the layout, not here)
  dashboard: { superadmin: SADashboard, contentadmin: ContentAdminDashboard, doctor: DoctorDashboard },
  ebooks:        EBooksPage,
  upload:        UploadPage,
  leaderboard:   LeaderboardPage,
  activity:      ActivityPage,
  notifications: NotificationsPage,
  profile:       ProfilePage,
  users:         UsersPage,
  reports:       ReportsPage,
  settings:      SettingsPage,
  registration:  RegistrationPage,
  conferences:   ConferencesPage,
  exam:          ExamPage,
  broadcast:     BroadcastPage,
  'case-sim':    CaseSimulator,
  'study-plan':  StudyPlanPage,
  'exam-manage': ExamManager,
  performance:   MyPerformancePage,
  learn:         LearnHub,
  'arena-host':  LiveArenaHost,
  'arena-student': LiveArenaStudent,
  calendar:      StudyCalendar,
  notes:         NotesPage,
};

// "Coming Soon" pages with their configs
export const COMING_SOON = {
  social: {
    title: 'Social Features', icon: '👥',
    desc: 'Connect with peers, share notes, follow top performers and build your medical network.',
    features: [
      { i: '👫', t: 'Peer Network', d: 'Follow and connect with doctors from your speciality' },
      { i: '📝', t: 'Note Sharing', d: 'Share and discover study notes' },
      { i: '💬', t: 'Chat Groups', d: 'Private and group messaging' },
      { i: '🌟', t: 'Verification Badge', d: 'Blue tick for verified doctors (Facebook-style)' },
    ],
  },
  groups: {
    title: 'Interest Groups', icon: '🎯',
    desc: 'Join or create groups based on speciality, college, or study topics.',
    features: [
      { i: '🏥', t: 'Speciality Groups', d: 'MD, MS, DM groups for each subject' },
      { i: '📚', t: 'Study Circles', d: 'Small group study sessions' },
      { i: '📢', t: 'Mass Communication', d: 'Admin broadcast to all group members' },
      { i: '📱', t: 'WhatsApp Business', d: 'Group notifications via WhatsApp Business API' },
    ],
  },
};
```

**Step 1.2: Replace renderPage() with a URL-driven page resolver**

In App.jsx, REMOVE the entire `renderPage()` function (lines 547-622).
REMOVE all lazy imports from the top of App.jsx (lines 37-63).
REMOVE the ROLE_PAGES constant (lines 531-545).
REMOVE `imperativeNavigate` from useAppStore.setPage.
REMOVE `initRouter`, `syncFromLocation`, and their useEffects.

Replace with a clean `<PageRenderer>` component that reads the URL directly:

```jsx
import { useLocation, useNavigate } from 'react-router-dom';
import { PAGE_COMPONENTS, COMING_SOON, ROLE_PAGES, getPageFromPath } from './routes';
import PageErrorBoundary from './components/ui/PageErrorBoundary';

function PageRenderer({ role, sharedProps }) {
  const location = useLocation();
  const navigate = useNavigate();
  const page = getPageFromPath(location.pathname);

  // Role guard — redirect unauthorized pages
  const allowed = ROLE_PAGES[role];
  if (allowed && allowed.length > 0 && !allowed.includes(page)) {
    // Use useEffect to redirect, never during render
    useEffect(() => { navigate('/', { replace: true }); }, []);
    return <PageLoader />;
  }

  // Kahoot redirect
  if (page === 'kahoot') {
    useEffect(() => { navigate('/arena-student', { replace: true }); }, []);
    return <PageLoader />;
  }

  // Coming soon pages
  if (COMING_SOON[page]) {
    const ComingSoonPage = PAGE_COMPONENTS[page] || lazy(() => import('./components/ComingSoonPage'));
    return <ComingSoonPage {...COMING_SOON[page]} />;
  }

  // Resolve the component
  let Component = PAGE_COMPONENTS[page];
  if (!Component) {
    // Unknown page — redirect to dashboard
    useEffect(() => { navigate('/', { replace: true }); }, []);
    return <PageLoader />;
  }

  // Dashboard is role-dispatched
  if (page === 'dashboard' && typeof Component === 'object') {
    Component = Component[role] || Component.doctor;
  }

  // Render with Suspense + ErrorBoundary keyed on URL path (not Zustand state)
  return (
    <PageErrorBoundary key={location.pathname} resetKey={location.pathname}>
      <Suspense fallback={<PageLoader />}>
        <Component {...sharedProps} />
      </Suspense>
    </PageErrorBoundary>
  );
}
```

NOTE: The `useEffect` for redirects is INSIDE the component body — this is a simplification.
In practice, you should extract redirect logic into a helper or use `Navigate` from react-router:
```jsx
import { Navigate } from 'react-router-dom';
// Instead of useEffect(() => navigate('/'), []):
return <Navigate to="/" replace />;
```

**Step 1.3: Fix the Zustand store — remove routing responsibility**

In `useAppStore.js`:

```js
// REMOVE: imperativeNavigate from setPage
// REMOVE: initRouter action
// REMOVE: syncFromLocation action
// REMOVE: setNavigator, imperativeNavigate exports
// REMOVE: _navigateFn module variable

// KEEP page state (for TopBar title, sidebar highlighting, etc.)
// But page is now DERIVED from the URL, not independently managed.

setPage: (page) => {
  if (!VALID_PAGES.has(page)) {
    console.warn(`[useAppStore] setPage: rejected unknown page "${page}"`);
    return;
  }
  // ONLY update Zustand state — do NOT call navigate()
  // The Sidebar will use navigate() from react-router directly
  set({ page, notifPanel: false });
},
```

**Step 1.4: Fix Sidebar to use React Router navigation**

In `Sidebar.jsx`, the NavItem should use `useNavigate` from react-router:

```jsx
import { useNavigate } from 'react-router-dom';

function NavItem({ item, page, setPage, onClose }) {
  const navigate = useNavigate();
  const isActive = page === item.k;
  const Icon = iconMap[item.k] || LayoutDashboard;

  return (
    <div
      className={`nav-item-v2 ${isActive ? 'nav-active' : ''}`}
      onClick={() => {
        const path = item.k === 'dashboard' ? '/' : `/${item.k}`;
        navigate(path);  // URL is the source of truth
        setPage(item.k); // Keep Zustand in sync for TopBar/sidebar
        if (onClose) onClose();
      }}
    >
      <Icon size={18} strokeWidth={isActive ? 2 : 1.5} />
      <span className="nav-label">{item.l}</span>
      {item.b ? <span className="nav-bdg-v2">{item.b}</span> : null}
    </div>
  );
}
```

**Step 1.5: Sync Zustand page from URL (one-way, URL → Zustand)**

In App.jsx MainApp, replace the old initRouter/syncFromLocation with:

```jsx
const location = useLocation();
const setPage = useAppStore(s => s.setPage);

// One-way sync: URL → Zustand (for TopBar, sidebar, etc.)
useEffect(() => {
  const page = getPageFromPath(location.pathname);
  setPage(page);
}, [location.pathname, setPage]);
```

This is ONE-WAY: URL changes Zustand. Zustand never changes the URL.
The only thing that changes the URL is `navigate()` calls in Sidebar/components.

**Step 1.6: Replace renderPage() call in JSX**

In the MainApp return JSX, replace:
```jsx
<PageErrorBoundary key={page} resetKey={page}>
  <Suspense fallback={<PageLoader />}>
    {renderPage()}
  </Suspense>
</PageErrorBoundary>
```

With:
```jsx
<PageRenderer role={role} sharedProps={sharedProps} />
```

═══ PHASE 2: DECOMPOSE THE GOD COMPONENT ═══

MainApp is 580 lines with 48 Zustand selectors, 15+ useCallbacks, and 8 useEffects.
This is the #1 source of re-render bugs. Decompose it into:

**Step 2.1: Extract auth logic into a custom hook**

Create `frontend/src/hooks/useAuthBootstrap.js`:
Move the entire auth useEffect (lines 208-330 of current App.jsx) into this hook.
It should return: { role, userName, userId, needsProfile, login, logout, ... }

**Step 2.2: Extract artifact management into a custom hook**

Create `frontend/src/hooks/useArtifacts.js`:
Move onApprove, onReject, onUpload, onApproveUser, onRejectUser.
These are pure Supabase operations + Zustand updates — they don't need to live in MainApp.

**Step 2.3: Extract notification subscription into a custom hook**

Create `frontend/src/hooks/useNotificationSubscription.js`:
Move the subscribeToNotifications useEffect.

**Step 2.4: MainApp becomes a thin shell**

After extraction, MainApp should be ~100 lines:
- Call the hooks
- Render the layout (Sidebar + TopBar + PageRenderer + ChatBot + Toasts)
- That's it

═══ PHASE 3: VERIFY ═══

Step 3.1: Run `npm run dev` and test these EXACT navigation flows:

TEST 1: Dashboard → E-Books → Dashboard (3x rapidly)
  ✓ Each page must show ITS OWN content
  ✓ No "one page behind" behavior
  ✓ key={location.pathname} forces full remount

TEST 2: Dashboard → Activity → Performance → Dashboard
  ✓ Each transition shows the correct page
  ✓ No stale content from previous page

TEST 3: Dashboard → Profile → Notifications → E-Books → Dashboard (5 pages, rapid clicks)
  ✓ Zero stale content anywhere

TEST 4: Click sidebar items 10 times as fast as possible
  ✓ Every page shows its own content
  ✓ No console errors

TEST 5: Type /case-sim directly in the URL bar and press Enter
  ✓ Case Simulator should load (deep linking works!)

TEST 6: Press browser Back button after navigating Dashboard → E-Books → Activity
  ✓ Going back should show E-Books, then Dashboard
  ✓ Browser history works correctly

Step 3.2: Run `npm run build` — must succeed with no errors.

Step 3.3: Check console for errors during all 6 tests.

═══ CRITICAL RULES ═══

- Follow CLAUDE.md strictly — no new Zustand stores, no raw supabase.from(), no .bak edits
- Do NOT break any existing component APIs — sharedProps must still work
- Do NOT change how any individual page component works internally
- Do NOT modify the database, edge functions, or supabase.js
- The TopBar `title` should still work (it reads from the `titles` object using the page key)
- Keep the `VALID_PAGES` allowlist in useAppStore — it's a security guard
- Keep the `key` on the error boundary — but key on `location.pathname` instead of `page`

═══ FILES TO MODIFY ═══

| File | Action |
|------|--------|
| `frontend/src/routes.jsx` | CREATE — route config, lazy imports, role guards |
| `frontend/src/App.jsx` | MODIFY — remove renderPage(), lazy imports, add PageRenderer |
| `frontend/src/stores/useAppStore.js` | MODIFY — remove imperativeNavigate from setPage, remove initRouter/syncFromLocation |
| `frontend/src/components/Sidebar.jsx` | MODIFY — NavItem uses useNavigate() |
| `frontend/src/hooks/useAuthBootstrap.js` | CREATE — extracted auth effect |
| `frontend/src/hooks/useArtifacts.js` | CREATE — extracted artifact handlers |
| `frontend/src/hooks/useNotificationSubscription.js` | CREATE — extracted realtime subscription |

═══ IMPORTANT: INCREMENTAL APPROACH ═══

Do PHASE 1 first. Build and test. If navigation works, THEN do Phase 2.
Phase 2 is structural cleanup — it won't fix the P0 bug but prevents future bugs.
Do NOT try to do everything at once.

After ALL changes, update .agent/handoff.md with:
- What was changed and why
- The new architecture diagram (URL → Zustand one-way sync)
- Test results for all 6 tests
```
