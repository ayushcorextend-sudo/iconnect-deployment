# iConnect Office — V2 Enterprise Refactoring Bible

## Sequential Terminal Prompts for AI Coding Agent

> **CRITICAL:** This document contains 4 sequential prompts to be pasted into your terminal AI
> coding agent (Claude Code / Sonnet). Each prompt MUST be executed in order. Each ends with a
> HARD STOP — do not proceed until you verify the app still builds and runs.
>
> **The existing codebase is functional. The goal is surgical refactoring — not a rewrite.**
> Every prompt below explicitly preserves existing behavior while fixing architectural flaws.
>
> **AUTONOMY NOTE:** Each prompt below includes a permissions suffix so Claude Code executes
> without asking for confirmation on every file operation. Paste the ENTIRE prompt block
> (including the suffix) into your terminal.

---

## FLAW → PHASE CROSS-REFERENCE

| Flaw # | Description | Fixed In |
|--------|-------------|----------|
| 1 | useState routing → React Router v7 | Phase 0 |
| 2 | State sync loss on page change | Phase 0 |
| 3 | Prop drilling via commonProps | Phase 0 |
| 4 | Stale closures in God Files | Phase 0 |
| 5 | God Files (1300+ lines) | Phase 0 |
| 6 | profiles table over-normalization | Phase 1 |
| 7 | No schema version control | Phase 1 |
| 8 | No Zod validation on inserts | Phase 0 + Phase 1 |
| 9 | Activity log DB bloat | Phase 1 |
| 10 | Client-side timestamps | Phase 1 |
| 11 | RLS too permissive | Phase 1 |
| 12 | Content served via raw URLs | Phase 1 |
| 13 | OTP SMS bombing | Phase 1 |
| 14 | AI calls from client | Phase 1 |
| 15 | No circuit breaker | Phase 1 |
| 16 | AI token bankruptcy | Phase 1 |
| 17 | SM-2 untested math | Phase 2 |
| 18 | Z-index collisions | Phase 0 |
| 19 | PDF performance | Phase 2 |
| 20 | PDF blob memory leak | Phase 2 |
| 21 | DOM bloat (leaderboard) | Phase 2 |
| 22 | No React.lazy | Phase 0 |
| 23 | Tailwind hex hardcoding | Phase 0 |
| 24 | No optimistic UI | Phase 2 |
| 25 | Realtime connection exhaustion | Phase 2 |
| 26 | Offline data loss | Phase 3 |
| 27 | PWA stale content | Phase 3 |
| 28 | No error telemetry | Phase 3 |
| 29 | Race conditions in tracking | Phase 3 |

---
---

# ══════════════════════════════════════════════════════════════════════════
# PROMPT 1 — PHASE 0: CORE ARCHITECTURE HARDENING
# (Fixes Flaws: 1, 2, 3, 4, 5, 8-partial, 18, 22, 23)
# ══════════════════════════════════════════════════════════════════════════

```
You are refactoring an existing, functional React 19 + Supabase SaaS app called "iConnect Office".
The codebase is at: frontend/src/
The app builds and runs. Your job is SURGICAL REFACTORING — not a rewrite. After every major
step, the app must still build with `npm run build`. If you break the build, stop and fix it
before continuing.

GLOBAL RULES FOR THIS ENTIRE SESSION:
- Never run `git push`. Only `git add` + `git commit`.
- After each numbered step below, run `npm run build` in the frontend/ directory. If it fails, fix
  the error before proceeding. Do NOT skip build checks.
- When splitting files, preserve ALL existing exports. Create re-export barrels if needed.
- Do NOT change any Supabase queries, API calls, or database schemas in this phase.
- Do NOT delete any functionality. Every feature must work identically after refactoring.
- Back up any file >500 lines before editing: cp File.jsx File.jsx.bak

═══════════════════════════════════════════════════════════════════
STEP 0.1 — INSTALL NEW DEPENDENCIES
═══════════════════════════════════════════════════════════════════

In the frontend/ directory, install exactly these packages:

  npm install zustand zod @tanstack/react-virtual

These are the only new runtime deps for this phase. Do NOT install react-router-dom (it's already
in package.json at ^7.13.1 — just not used yet).

Run `npm run build` to confirm nothing broke.
Commit: "chore: add zustand, zod, tanstack-virtual deps"

═══════════════════════════════════════════════════════════════════
STEP 0.2 — CENTRALIZED Z-INDEX SCALE (Flaw #18)
═══════════════════════════════════════════════════════════════════

Create file: src/styles/zIndex.js

This file defines the ONLY z-index values the app may use. Every component that sets a z-index
MUST import from here. No magic numbers.

Contents:

  export const Z = {
    BACKGROUND:    0,     // grid backgrounds, decorative elements
    BASE:          1,     // normal content flow
    STICKY:        10,    // sticky headers, toolbars
    SIDEBAR:       20,    // sidebar navigation
    DROPDOWN:      30,    // dropdown menus, filter panels, popovers
    TOPBAR:        40,    // top navigation bar
    OVERLAY:       50,    // backdrop overlays (modal dimming)
    MODAL:         60,    // modal dialogs
    TOAST:         70,    // toast notifications (always on top)
    TOOLTIP:       80,    // tooltips
    CURSOR:        90,    // cursor effects (if any)
    CRITICAL:      100,   // emergency overlays, blocking loaders
  };

Then search the ENTIRE src/ directory for any hardcoded z-index values — this includes:
- Inline style objects with `zIndex: <number>`
- Tailwind classes like `z-10`, `z-20`, `z-30`, `z-40`, `z-50`
- CSS files with `z-index: <number>`

For each one found:
- Replace Tailwind `z-50` with the closest Z constant via inline style: `style={{ zIndex: Z.OVERLAY }}`
- Or create corresponding Tailwind config entries. Whichever is less invasive for that file.
- Document what you changed with a comment: `// Z-scale: was z-50, now Z.OVERLAY`

Focus on these known hotspots:
- BroadcastPage.jsx (filter dropdowns use zIndex: 10 — change to Z.DROPDOWN)
- TopBar.jsx (should use Z.TOPBAR)
- Toasts.jsx (should use Z.TOAST)
- Any modal components (should use Z.MODAL)
- Sidebar.jsx (should use Z.SIDEBAR)

Run `npm run build`. Commit: "refactor: centralize z-index scale — no more magic numbers"

═══════════════════════════════════════════════════════════════════
STEP 0.3 — TAILWIND COLOR AUDIT (Flaw #23)
═══════════════════════════════════════════════════════════════════

Search the entire src/ directory for hardcoded hex colors in:
- Inline styles: `color: '#xxxxxx'`, `background: '#xxxxxx'`, `borderColor: '#xxxxxx'`
- Tailwind arbitrary values: `bg-[#xxxxxx]`, `text-[#xxxxxx]`, `border-[#xxxxxx]`

For each occurrence:
1. If there's already a matching Tailwind utility class (e.g., #2563EB = blue-600), replace with
   the Tailwind class.
2. If it's a brand color not in Tailwind, add it to tailwind.config.js under theme.extend.colors:
   - 'brand-cyan': '#06D6A0'
   - 'brand-indigo': '#7C3AED'
   - And any other custom colors you find repeated 3+ times.
3. For colors only used once in a specific context, it's OK to keep as an arbitrary Tailwind value
   `bg-[#hex]` — but add a comment explaining why.

EXCEPTION: Do NOT touch colors inside SVG elements or dynamically generated chart data.
EXCEPTION: Do NOT touch CSS @keyframes in <style> blocks embedded in JSX.

The goal: when `data-theme="dark"` is set, there should be ZERO colors that fail to adapt.
Check all new Tailwind color classes work in both themes.

Run `npm run build`. Commit: "refactor: eliminate hardcoded hex colors — use Tailwind tokens"

═══════════════════════════════════════════════════════════════════
STEP 0.4 — ZUSTAND STORES (Flaw #3: Prop Drilling)
═══════════════════════════════════════════════════════════════════

Create directory: src/stores/

Create these 4 Zustand stores. Each store is its own file. Use the pattern:
  import { create } from 'zustand';

--- FILE: src/stores/useAuthStore.js ---

Manages: userId, userName, role, session, isAuthLoading, needsProfile, pendingMessage
Actions: setAuth(userId, userName, role), clearAuth(), setNeedsProfile(bool), setPendingMessage(msg)

This replaces: the useState declarations at App.jsx lines 65-82 for role, userName, userId,
needsProfile, pendingUserId, pendingEmail, pendingMessage.

IMPORTANT: The existing AuthContext (src/context/AuthContext.jsx) still handles the Supabase
session lifecycle. useAuthStore is for the APP-LEVEL auth state (role, name, profile status).
They are complementary, not competing.

--- FILE: src/stores/useAppStore.js ---

Manages: darkMode, sidebarOpen, notifications[], toasts[], artifacts[], users[]
Actions: addToast(type, msg), removeToast(id), setNotifications(notifs), addNotification(notif),
         setArtifacts(arts), updateArtifact(id, patch), setUsers(users), toggleDarkMode(),
         setSidebarOpen(bool)

This replaces: useState declarations at App.jsx for notifications, toasts, artifacts, users,
darkMode, sidebarOpen, notifPanel.

For the toast auto-dismiss, DO NOT use setTimeout inside the store. Instead, in the addToast
action, set the toast with a `createdAt` timestamp. Create a useEffect in a `<ToastManager>`
component (or keep it in App.jsx) that cleans up expired toasts every second.

--- FILE: src/stores/useReaderStore.js ---

Manages: selectedArtifact, currentPage, zoom, notesOpen, focusMode, bookmarks[]
Actions: openBook(artifact), closebook(), setPage(n), setZoom(z), toggleNotes(), toggleFocus(),
         addBookmark(page), removeBookmark(page)

This solves Flaw #2 (State Sync): The reader state is NOT destroyed when the user navigates away
from the ebooks page. If they go to Leaderboard and come back, their reading position is
preserved because Zustand state lives outside the React tree.

--- FILE: src/stores/useChatStore.js ---

Manages: chatBotMode (null | 'chat' | 'doubt'), chatHistory[], currentQuestion
Actions: openChat(), openDoubt(), closeChat(), addMessage(msg), setQuestion(q)

This replaces: useState chatBotMode in App.jsx.

═══ WIRING ═══

After creating the 4 stores, update App.jsx:
1. Remove the 15+ useState declarations that are now in Zustand stores
2. Replace them with: const { userId, userName, role, ... } = useAuthStore();
   const { darkMode, notifications, artifacts, ... } = useAppStore();
   const { chatBotMode } = useChatStore();
3. Keep the existing useEffect hooks, but update them to use Zustand setters:
   - fetchNotifs → useAppStore.getState().setNotifications(data)
   - fetchUsers → useAppStore.getState().setUsers(data)
4. The commonProps object (lines 381-387) should be DELETED entirely.
5. Every component that previously received {...commonProps} must instead call useAuthStore() and
   useAppStore() directly to get what it needs.

CRITICAL: Do this wiring step-by-step, one component at a time:
a) Start with App.jsx itself — move state to stores, verify build.
b) Then update SADashboard.jsx — replace props with store hooks. Verify build.
c) Then DoctorDashboard.jsx. Verify build.
d) Then ContentAdminDashboard.jsx. Verify build.
e) Then EBooksPage.jsx. Verify build.
f) Then BroadcastPage.jsx. Verify build.
g) Then all remaining components that receive commonProps.

At the end, grep for "commonProps" in the entire codebase. It must return ZERO results.

Commit: "refactor: replace commonProps prop-drilling with 4 Zustand stores"

═══════════════════════════════════════════════════════════════════
STEP 0.5 — REACT ROUTER v7 MIGRATION (Flaw #1, #2)
═══════════════════════════════════════════════════════════════════

React Router v7 (react-router-dom ^7.13.1) is already installed but unused. The app currently
routes via useState('page') at App.jsx line 70. This means:
- Browser Back/Forward buttons don't work
- Deep-linking (e.g., /ebooks, /leaderboard) is impossible
- Refreshing the page always goes to Dashboard

MIGRATION PLAN (incremental, not big-bang):

A) Create file: src/routes.jsx

Define route configuration as an array of objects:
  export const routes = [
    { path: '/',              page: 'dashboard' },
    { path: '/ebooks',        page: 'ebooks' },
    { path: '/upload',        page: 'upload' },
    { path: '/leaderboard',   page: 'leaderboard' },
    { path: '/activity',      page: 'activity' },
    { path: '/notifications', page: 'notifications' },
    { path: '/profile',       page: 'profile' },
    { path: '/users',         page: 'users' },
    { path: '/reports',       page: 'reports' },
    { path: '/settings',      page: 'settings' },
    { path: '/registration',  page: 'registration' },
    { path: '/exam',          page: 'exam' },
    { path: '/exam-manage',   page: 'exam-manage' },
    { path: '/broadcast',     page: 'broadcast' },
    { path: '/performance',   page: 'performance' },
    { path: '/learn',         page: 'learn' },
    { path: '/arena-host',    page: 'arena-host' },
    { path: '/arena-student', page: 'arena-student' },
    { path: '/calendar',      page: 'calendar' },
    { path: '/case-sim',      page: 'case-sim' },
    { path: '/study-plan',    page: 'study-plan' },
    { path: '/social',        page: 'social' },
    { path: '/groups',        page: 'groups' },
    { path: '/conferences',   page: 'conferences' },
    { path: '/kahoot',        page: 'kahoot' },
    { path: '*',              page: 'not-found' },
  ];

B) Update App.jsx entry point:

Wrap the app in BrowserRouter:
  import { BrowserRouter } from 'react-router-dom';

  export default function App() {
    return (
      <ErrorBoundary>
        <BrowserRouter>
          <AuthProvider>
            <MainApp />
          </AuthProvider>
        </BrowserRouter>
      </ErrorBoundary>
    );
  }

C) Inside MainApp, replace the useState('page') + switch(page) pattern:

1. Remove: const [page, setPage] = useState('dashboard');
2. Remove: the entire renderPage() switch statement.
3. Instead, import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
4. Create a `setPage` SHIM function that maintains backward compatibility:
   const navigate = useNavigate();
   const location = useLocation();
   const setPage = useCallback((pageName) => {
     const route = routes.find(r => r.page === pageName);
     if (route) navigate(route.path);
   }, [navigate]);
   // Derive current "page" name from URL for components that still read it:
   const page = routes.find(r => r.path === location.pathname)?.page || 'dashboard';

5. Replace the renderPage() call with React Router <Routes>:
   <Routes>
     <Route path="/" element={
       role === 'superadmin' ? <SADashboard /> :
       role === 'contentadmin' ? <ContentAdminDashboard /> :
       <DoctorDashboard />
     } />
     <Route path="/ebooks" element={<EBooksPage />} />
     <Route path="/upload" element={<UploadPage />} />
     ... (one Route per entry in routes array)
     <Route path="*" element={<NotFoundPage />} />
   </Routes>

6. The `setPage` shim function must be stored in useAppStore so ANY component can navigate:
   Add to useAppStore: navigate: null, setNavigate: (fn) => set({ navigate: fn })
   In MainApp: const nav = useNavigate(); useEffect(() => useAppStore.getState().setNavigate(nav), [nav]);
   Then the old setPage('ebooks') calls anywhere in the app can just do:
     useAppStore.getState().navigate('/ebooks')
   Or create a helper: src/lib/navigate.js that wraps this.

7. For the Sidebar: replace all setPage('xxx') calls with navigate('/xxx') or the shim.

D) BACKWARD COMPATIBILITY — this is critical:

Many components still call `setPage('ebooks')` etc. To avoid breaking everything at once:
- Keep the setPage shim in useAppStore. Components can call it.
- Gradually, in later phases, replace setPage calls with useNavigate() directly.
- The shim ensures the app works during the transition.

E) PageTransition wrapper:

The existing PageTransition.jsx uses AnimatePresence keyed on `pageKey`. Update it to key on
`location.pathname` instead:
  const location = useLocation();
  <AnimatePresence mode="wait">
    <motion.div key={location.pathname} ... >
      <Outlet /> or {children}
    </motion.div>
  </AnimatePresence>

F) Verify:
- Navigate to each major route manually by changing the URL
- Browser back/forward works
- Page refresh on /ebooks stays on ebooks page
- Deep-linking works: opening /leaderboard directly goes to leaderboard

Run `npm run build`. Commit: "feat: migrate from useState routing to React Router v7 — browser
history + deep-linking now work"

═══════════════════════════════════════════════════════════════════
STEP 0.6 — BREAK DOWN GOD FILES (Flaw #5, #4)
═══════════════════════════════════════════════════════════════════

The following files are dangerously large. An AI coding agent editing a 2000-line file will
hallucinate missing code, duplicate functions, or silently drop sections. They MUST be split.

Target files and their split plans:

--- A) BroadcastPage.jsx (2007 lines) → src/components/broadcast/ ---

Create directory: src/components/broadcast/

Split into:
  broadcast/index.jsx              — Main orchestrator (<80 lines). Imports sub-components.
                                     Reads role from useAuthStore(). Renders the correct view.
  broadcast/EngageLanding.jsx      — The landing screen with Doctor/CA cards (~230 lines)
  broadcast/DoctorEngageView.jsx   — Doctor filtering + broadcast form (~650 lines). If still
                                     >300 lines, split the broadcast form into broadcast/BroadcastForm.jsx
  broadcast/CAEngageView.jsx       — Content admin engage view (~350 lines)
  broadcast/SAMessageBox.jsx       — The floating SA message icon + modal (~200 lines).
                                     Keep it as a named export for DoctorDashboard/CADashboard imports.
  broadcast/FilterDropdown.jsx     — Reusable dropdown filter pill (~110 lines)
  broadcast/NotificationCenter.jsx — The CA notification compose form (~270 lines)

Create barrel export:
  broadcast/index.jsx re-exports SAMessageBox (since other dashboards import it)

For App.jsx: change import from './components/BroadcastPage' to './components/broadcast'

After splitting, DELETE BroadcastPage.jsx (and its .bak). The broadcast/index.jsx is the new
entry point. Run `npm run build`.

--- B) DoctorDashboard.jsx (1385 lines) → src/components/doctor-dashboard/ ---

Split into:
  doctor-dashboard/index.jsx            — Layout shell + section orchestration (<100 lines)
  doctor-dashboard/GreetingHeader.jsx   — Welcome message + stats row (~120 lines)
  doctor-dashboard/ForYouCards.jsx      — AI recommendation cards (~150 lines)
  doctor-dashboard/QuickActions.jsx     — Action buttons grid (~100 lines)
  doctor-dashboard/RecentActivity.jsx   — Activity feed section (~150 lines)
  doctor-dashboard/StudyProgress.jsx    — Progress rings / charts (~200 lines)
  doctor-dashboard/GoalRing.jsx         — The editable goal ring (~150 lines)
  doctor-dashboard/MonthlyCalendar.jsx  — Calendar widget (~200 lines)

All sub-components read from Zustand stores (useAuthStore, useAppStore) instead of props.
After splitting, DELETE DoctorDashboard.jsx. Update App.jsx import.
Run `npm run build`.

--- C) SADashboard.jsx (1049 lines) → src/components/sa-dashboard/ ---

Split into:
  sa-dashboard/index.jsx               — Layout + tab navigation (<80 lines)
  sa-dashboard/OverviewCards.jsx        — Stats cards (~150 lines)
  sa-dashboard/PendingApprovals.jsx     — Approval queue (~200 lines)
  sa-dashboard/UserStatsPanel.jsx       — User analytics (~200 lines)
  sa-dashboard/WebinarManager.jsx       — Webinar CRUD (~200 lines)
  sa-dashboard/CalendarManager.jsx      — Admin calendar events (~150 lines)

Run `npm run build` after each file is created and the imports are wired.

--- D) EBooksPage.jsx (751 lines) → src/components/ebooks/ ---

Split into:
  ebooks/index.jsx                — Page shell + view switching (<80 lines)
  ebooks/EBookGrid.jsx            — Grid/list view of books (~200 lines)
  ebooks/EBookReader.jsx          — The PDF reader + controls (~250 lines)
  ebooks/NotesPanel.jsx           — Notes sidebar (~120 lines)
  ebooks/ReaderToolbar.jsx        — Zoom, page nav, bookmark buttons (~100 lines)

--- E) ChatBot.jsx (719 lines) → src/components/chatbot/ ---

Split into:
  chatbot/index.jsx               — ChatBot shell + mode switching (<60 lines)
  chatbot/ChatWindow.jsx          — Main chat interface (~250 lines)
  chatbot/DoubtForm.jsx           — Doubt submission form + AI response (~200 lines)
  chatbot/MessageBubble.jsx       — Individual message rendering (~80 lines)
  chatbot/ChatInput.jsx           — Input bar with send button (~80 lines)

VERIFICATION AFTER ALL SPLITS:
1. Run `npm run build` — must succeed with zero errors
2. grep -r "BroadcastPage\|DoctorDashboard\|SADashboard\|EBooksPage\|ChatBot" src/App.jsx
   — should show imports pointing to new directories
3. No file in src/components/ should exceed 650 lines (check with: find src/components -name
   "*.jsx" | xargs wc -l | sort -n | tail -20)
4. Every sub-component reads its data from Zustand stores, NOT from props drilled from App.jsx

Commit: "refactor: decompose 5 God Files into modular directories (29 new files)"

═══════════════════════════════════════════════════════════════════
STEP 0.7 — REACT.LAZY CODE SPLITTING (Flaw #22)
═══════════════════════════════════════════════════════════════════

In App.jsx, every page component is statically imported. This means the entire app (all 20+
pages) loads in one bundle, killing performance on Indian 4G networks.

Replace static imports with React.lazy for ALL page-level components (NOT for Sidebar, TopBar,
Toasts, ErrorBoundary — those must load immediately).

Pattern:
  const SADashboard = React.lazy(() => import('./components/sa-dashboard'));
  const DoctorDashboard = React.lazy(() => import('./components/doctor-dashboard'));
  const EBooksPage = React.lazy(() => import('./components/ebooks'));
  ... (all 20+ page components)

Wrap the <Routes> block in <React.Suspense>:
  <React.Suspense fallback={
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-10 h-10 rounded-full border-4 border-gray-200 border-t-blue-600
                      animate-spin" />
    </div>
  }>
    <Routes> ... </Routes>
  </React.Suspense>

IMPORTANT: React.lazy requires default exports. Check every page component:
- If a component uses `export default function PageName`, it's fine.
- If it uses named exports only, add a default export in its index.jsx barrel file.

Verify: Run `npm run build`. Check the dist/ output — you should now see multiple JS chunks
instead of one monolithic bundle. The main chunk should be significantly smaller.

Commit: "perf: lazy-load all page components — reduce initial bundle by ~60%"

═══════════════════════════════════════════════════════════════════
STEP 0.8 — ZOD VALIDATION LAYER (Flaw #8 — Foundation)
═══════════════════════════════════════════════════════════════════

Create file: src/lib/schemas.js

Define Zod schemas for EVERY Supabase table that receives client-side inserts or updates.
These schemas validate data BEFORE it hits Supabase, preventing garbage data.

Schemas to define (based on current codebase usage):

  import { z } from 'zod';

  export const NotificationInsertSchema = z.object({
    user_id: z.string().uuid(),
    title: z.string().min(1).max(200),
    body: z.string().min(1).max(2000),
    type: z.enum(['info', 'success', 'warn', 'error']),
    icon: z.string().max(10).optional(),
    channel: z.enum(['in_app', 'email', 'whatsapp', 'sms']).default('in_app'),
  });
  // NOTE: No created_at, no id — DB generates those. No sender_id until column exists.

  export const ActivityLogSchema = z.object({
    user_id: z.string().uuid(),
    activity_type: z.string().min(1).max(50),
    reference_id: z.string().max(200).default(''),
    score_delta: z.number().int().min(0).max(200),
  });

  export const ArtifactInsertSchema = z.object({
    title: z.string().min(1).max(300),
    subject: z.string().min(1).max(100),
    type: z.enum(['PDF', 'Video', 'Article', 'Notes']),
    uploaded_by: z.string().min(1),
    uploaded_by_id: z.string().uuid(),
    status: z.enum(['pending', 'approved', 'rejected', 'archived']).default('pending'),
    description: z.string().max(2000).optional(),
    url: z.string().url().optional(),
    file_url: z.string().url().optional(),
  });

  export const ProfileUpdateSchema = z.object({
    name: z.string().min(1).max(200).optional(),
    phone: z.string().max(20).optional(),
    speciality: z.string().max(100).optional(),
    college: z.string().max(200).optional(),
    state: z.string().max(100).optional(),
    bio: z.string().max(500).optional(),
  }).strict();  // .strict() rejects unknown fields — prevents injection

  export const ExamAttemptSchema = z.object({
    user_id: z.string().uuid(),
    subject_id: z.number().int().positive(),
    score: z.number().int().min(0),
    total: z.number().int().positive(),
    answers: z.record(z.string(), z.string()),  // { "q1": "A", "q2": "C" }
  });

  export const CalendarDiarySchema = z.object({
    user_id: z.string().uuid(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),  // YYYY-MM-DD
    mood: z.enum(['great', 'good', 'okay', 'bad', 'terrible']).optional(),
    notes: z.string().max(5000).optional(),
    study_hours: z.number().min(0).max(24).optional(),
    goals_met: z.boolean().optional(),
  });

  // Helper: validate and strip unknown fields before insert
  export function validateInsert(schema, data) {
    const result = schema.safeParse(data);
    if (!result.success) {
      console.error('[Zod Validation]', result.error.flatten());
      throw new Error('Validation failed: ' + result.error.issues[0]?.message);
    }
    return result.data;  // returns the cleaned, validated object
  }

DO NOT retroactively add Zod to every existing insert in this step. That happens in Phase 1.
This step only creates the schema definitions. The schemas are the contract.

Run `npm run build`. Commit: "feat: add Zod validation schemas for all Supabase mutations"

═══════════════════════════════════════════════════════════════════
PHASE 0 COMPLETE — VERIFICATION CHECKLIST
═══════════════════════════════════════════════════════════════════

Before proceeding, verify ALL of these:

  [ ] npm run build succeeds with zero errors
  [ ] No file in src/components/ exceeds 650 lines
  [ ] Grepping for "commonProps" returns zero results
  [ ] Browser URL bar updates when clicking sidebar items
  [ ] Browser Back/Forward buttons navigate between pages
  [ ] Refreshing the browser on /ebooks stays on ebooks page
  [ ] Dark mode toggle still works
  [ ] Opening E-books, navigating to Leaderboard, and going back preserves reader state (Zustand)
  [ ] dist/ directory contains multiple JS chunk files (code splitting working)
  [ ] Z.TOAST, Z.MODAL etc. are imported from styles/zIndex.js in relevant components

Commit: "milestone: Phase 0 complete — architecture hardened"

═══ PHASE 0 COMPLETE ═══
STOP HERE. Do not proceed until Ayush says "next".

═══════════════════════════════════════════════════════════════════
FULL AUTONOMY PERMISSIONS
═══════════════════════════════════════════════════════════════════

You have FULL PERMISSION to perform ALL of the following without asking:
- Read, create, edit, delete, rename, and move ANY file in this project
- Run ANY shell command including npm install, npm run build, git add, git commit
- Create new directories anywhere in the project
- Modify package.json, vite.config.js, tailwind.config.js, tsconfig.json, or any config file
- Install npm packages as specified in the instructions above
- Run linters, formatters, and build tools
- Execute grep, find, wc, cat, or any other read/diagnostic commands
- Create backup copies (.bak) of files before editing them
- Delete backup files and obsolete files after confirming replacements work

You do NOT have permission to:
- Run `git push` (this is the ONLY restriction)
- Delete the .git directory
- Modify .env files containing secrets

Execute every step above sequentially. Do NOT pause to ask "should I proceed?" or "is this OK?"
between steps. Just execute, verify the build, commit, and move to the next step. If the build
breaks, fix it autonomously before continuing. Only stop at the PHASE COMPLETE marker.
```

---
---

# ══════════════════════════════════════════════════════════════════════════
# PROMPT 2 — PHASE 1: DATABASE, SECURITY & AI INFRASTRUCTURE
# (Fixes Flaws: 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16)
# ══════════════════════════════════════════════════════════════════════════

```
You are continuing the surgical refactoring of the iConnect Office React 19 + Supabase app.
Phase 0 is complete: React Router, Zustand stores, God File splits, lazy loading, and Zod
schemas are in place. The app builds and runs.

This phase focuses on DATABASE SECURITY, AI INFRASTRUCTURE, and DATA INTEGRITY.

GLOBAL RULES (same as Phase 0):
- Never run `git push`.
- Run `npm run build` after every step.
- Do NOT break existing functionality.
- All SQL goes into numbered migration files: src/migrations/XXX_description.sql
- SQL migrations are NOT auto-run. Ayush applies them manually in Supabase SQL Editor.

═══════════════════════════════════════════════════════════════════
STEP 1.1 — SCHEMA VERSION TRACKING (Flaw #7)
═══════════════════════════════════════════════════════════════════

Create file: src/migrations/000_schema_version.sql

Contents:
  CREATE TABLE IF NOT EXISTS schema_versions (
    version  INT PRIMARY KEY,
    name     TEXT NOT NULL,
    applied_at TIMESTAMPTZ DEFAULT now()
  );

  INSERT INTO schema_versions (version, name)
  VALUES (0, 'initial_schema_tracking')
  ON CONFLICT (version) DO NOTHING;

Every subsequent migration file MUST start with:
  INSERT INTO schema_versions (version, name)
  VALUES (N, 'description_of_migration')
  ON CONFLICT (version) DO NOTHING;

And end with a check:
  -- Verify: SELECT * FROM schema_versions ORDER BY version;

═══════════════════════════════════════════════════════════════════
STEP 1.2 — DATABASE NORMALIZATION (Flaw #6)
═══════════════════════════════════════════════════════════════════

Create file: src/migrations/001_normalize_schema.sql

The `profiles` table currently stores everything: auth info, medical info, geographic info,
verification status, ranks. This violates 3NF and will cause update anomalies.

Do NOT drop or rename existing columns. Instead, create mapping tables and leave the profiles
table intact for backward compatibility. Future code will read from the new tables.

  INSERT INTO schema_versions (version, name) VALUES (1, 'normalize_schema');

  -- Lookup tables for medical data (reduces string repetition, enables analytics)
  CREATE TABLE IF NOT EXISTS specialities (
    id SERIAL PRIMARY KEY,
    name TEXT UNIQUE NOT NULL
  );

  CREATE TABLE IF NOT EXISTS colleges (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    state TEXT,
    UNIQUE(name, state)
  );

  -- Populate from existing data:
  INSERT INTO specialities (name)
  SELECT DISTINCT speciality FROM profiles WHERE speciality IS NOT NULL AND speciality != ''
  ON CONFLICT (name) DO NOTHING;

  INSERT INTO colleges (name, state)
  SELECT DISTINCT college, state FROM profiles WHERE college IS NOT NULL AND college != ''
  ON CONFLICT (name, state) DO NOTHING;

  -- Add foreign key columns to profiles (nullable, filled via backfill)
  ALTER TABLE profiles ADD COLUMN IF NOT EXISTS speciality_id INT REFERENCES specialities(id);
  ALTER TABLE profiles ADD COLUMN IF NOT EXISTS college_id INT REFERENCES colleges(id);

  -- Backfill (non-destructive: old string columns remain)
  UPDATE profiles p SET speciality_id = s.id
  FROM specialities s WHERE p.speciality = s.name AND p.speciality_id IS NULL;

  UPDATE profiles p SET college_id = c.id
  FROM colleges c WHERE p.college = c.name AND p.state = c.state AND p.college_id IS NULL;

  -- Index for leaderboard and filtering (Flaw #9 performance)
  CREATE INDEX IF NOT EXISTS idx_activity_logs_user_created
    ON activity_logs (user_id, created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_activity_logs_type
    ON activity_logs (activity_type);
  CREATE INDEX IF NOT EXISTS idx_user_scores_total
    ON user_scores (total_score DESC);
  CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
    ON notifications (user_id, is_read, created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_artifacts_status
    ON artifacts (status, created_at DESC);

═══════════════════════════════════════════════════════════════════
STEP 1.3 — SERVER-SIDE TIMESTAMPS (Flaw #10)
═══════════════════════════════════════════════════════════════════

Create file: src/migrations/002_server_timestamps.sql

  INSERT INTO schema_versions (version, name) VALUES (2, 'server_side_timestamps');

  -- Create RPC function for trusted server time
  CREATE OR REPLACE FUNCTION server_now()
  RETURNS TIMESTAMPTZ
  LANGUAGE sql STABLE
  AS $$ SELECT now(); $$;

  -- Ensure all tables have DEFAULT now() on created_at (most already do, but verify)
  ALTER TABLE activity_logs ALTER COLUMN created_at SET DEFAULT now();
  ALTER TABLE notifications ALTER COLUMN created_at SET DEFAULT now();
  ALTER TABLE user_notes ALTER COLUMN created_at SET DEFAULT now();
  ALTER TABLE audit_logs ALTER COLUMN created_at SET DEFAULT now();

  -- For exam timing: RPC that returns server time (so client can't fake 60-minute limit)
  CREATE OR REPLACE FUNCTION get_exam_server_time()
  RETURNS JSON
  LANGUAGE sql STABLE SECURITY DEFINER
  AS $$
    SELECT json_build_object('server_time', now(), 'epoch_ms', extract(epoch from now()) * 1000);
  $$;

Now update the FRONTEND code:

In src/lib/trackActivity.js:
- REMOVE the `score_delta` calculation from the client. Remove the SCORE_MAP object entirely.
- Instead, create a DB trigger that calculates score_delta server-side:

Create file: src/migrations/003_server_side_scoring.sql

  INSERT INTO schema_versions (version, name) VALUES (3, 'server_side_scoring');

  -- Score map lives in DB, not in client code
  CREATE TABLE IF NOT EXISTS score_rules (
    activity_type TEXT PRIMARY KEY,
    score_delta INT NOT NULL DEFAULT 0
  );

  INSERT INTO score_rules (activity_type, score_delta) VALUES
    ('quiz_attempted', 5), ('quiz_passed', 20), ('article_read', 10),
    ('note_viewed', 5), ('document_downloaded', 5), ('webinar_attended', 30),
    ('daily_login', 2), ('profile_complete', 25), ('verification_complete', 50),
    ('clinical_case_logged', 15), ('study_plan_completed', 25),
    ('spaced_rep_reviewed', 5), ('exam_set_completed', 30),
    ('doubt_asked', 5), ('diary_entry', 3), ('streak_7_day', 50), ('streak_30_day', 200)
  ON CONFLICT (activity_type) DO NOTHING;

  -- Trigger: auto-fill score_delta on activity_logs insert
  CREATE OR REPLACE FUNCTION fn_fill_score_delta()
  RETURNS TRIGGER
  LANGUAGE plpgsql AS $$
  BEGIN
    SELECT COALESCE(score_delta, 0) INTO NEW.score_delta
    FROM score_rules WHERE activity_type = NEW.activity_type;
    IF NEW.score_delta IS NULL THEN NEW.score_delta := 0; END IF;
    RETURN NEW;
  END;
  $$;

  DROP TRIGGER IF EXISTS trg_fill_score_delta ON activity_logs;
  CREATE TRIGGER trg_fill_score_delta
    BEFORE INSERT ON activity_logs
    FOR EACH ROW EXECUTE FUNCTION fn_fill_score_delta();

  -- Trigger: auto-update user_scores on activity_logs insert
  CREATE OR REPLACE FUNCTION fn_update_user_scores()
  RETURNS TRIGGER
  LANGUAGE plpgsql AS $$
  BEGIN
    INSERT INTO user_scores (user_id, total_score, quiz_score, reading_score, updated_at)
    VALUES (
      NEW.user_id,
      NEW.score_delta,
      CASE WHEN NEW.activity_type LIKE 'quiz_%' THEN NEW.score_delta ELSE 0 END,
      CASE WHEN NEW.activity_type IN ('article_read','note_viewed') THEN NEW.score_delta ELSE 0 END,
      now()
    )
    ON CONFLICT (user_id) DO UPDATE SET
      total_score = user_scores.total_score + NEW.score_delta,
      quiz_score = user_scores.quiz_score +
        CASE WHEN NEW.activity_type LIKE 'quiz_%' THEN NEW.score_delta ELSE 0 END,
      reading_score = user_scores.reading_score +
        CASE WHEN NEW.activity_type IN ('article_read','note_viewed') THEN NEW.score_delta ELSE 0 END,
      updated_at = now();
    RETURN NEW;
  END;
  $$;

  DROP TRIGGER IF EXISTS trg_update_user_scores ON activity_logs;
  CREATE TRIGGER trg_update_user_scores
    AFTER INSERT ON activity_logs
    FOR EACH ROW EXECUTE FUNCTION fn_update_user_scores();

Now simplify src/lib/trackActivity.js:

  import { supabase } from './supabase';
  import { validateInsert, ActivityLogSchema } from './schemas';

  const queue = [];       // in-memory buffer
  let flushTimer = null;
  const FLUSH_INTERVAL = 5000;  // flush every 5 seconds (Flaw #9: batching)
  const MAX_BATCH = 20;

  export function trackActivity(activityType, referenceId = '') {
    const userId = supabase.auth?.user?.()?.id;  // sync access, no await
    if (!userId) return;

    queue.push({ user_id: userId, activity_type: activityType, reference_id: String(referenceId) });

    if (queue.length >= MAX_BATCH) flushNow();
    else if (!flushTimer) {
      flushTimer = setTimeout(flushNow, FLUSH_INTERVAL);
    }
  }

  async function flushNow() {
    if (flushTimer) { clearTimeout(flushTimer); flushTimer = null; }
    if (queue.length === 0) return;

    const batch = queue.splice(0, MAX_BATCH);
    try {
      // Validate each entry
      const validated = batch.map(entry => validateInsert(ActivityLogSchema, entry));
      const { error } = await supabase.from('activity_logs').insert(validated);
      if (error) throw error;
    } catch (e) {
      console.warn('[trackActivity] batch insert failed:', e.message);
      // Push failed entries back to queue for retry (max once)
      // Don't push if they already failed once to avoid infinite loops
    }
  }

  // Flush on page unload (Flaw #29: race conditions)
  if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', () => {
      if (queue.length > 0) {
        // navigator.sendBeacon is fire-and-forget, works during unload
        const payload = JSON.stringify(queue.splice(0));
        navigator.sendBeacon(
          `${supabase.supabaseUrl}/rest/v1/activity_logs`,
          new Blob([payload], { type: 'application/json' })
        );
      }
    });
  }

  // Export flush for manual trigger (e.g., before navigation)
  export { flushNow as flushActivityQueue };

Commit: "feat: server-side timestamps + scoring triggers + batched activity logging"

═══════════════════════════════════════════════════════════════════
STEP 1.4 — ROW-LEVEL SECURITY HARDENING (Flaw #11)
═══════════════════════════════════════════════════════════════════

Create file: src/migrations/004_rls_hardening.sql

  INSERT INTO schema_versions (version, name) VALUES (4, 'rls_hardening');

  -- DROP overly permissive policies first
  DROP POLICY IF EXISTS "authenticated_insert_notifications" ON notifications;
  DROP POLICY IF EXISTS "users_read_own_notifications" ON notifications;

  -- Notifications: users can only READ their own
  CREATE POLICY "notif_select_own" ON notifications
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

  -- Notifications: only superadmin and contentadmin roles can INSERT
  -- (via JWT custom claim: auth.jwt() ->> 'role')
  CREATE POLICY "notif_insert_admin" ON notifications
    FOR INSERT TO authenticated
    WITH CHECK (
      -- Admins can send to anyone
      (auth.jwt() ->> 'user_role') IN ('superadmin', 'contentadmin')
      OR
      -- System can insert for the user themselves (self-notifications)
      user_id = auth.uid()
    );

  -- Activity logs: users can only insert their own
  CREATE POLICY "activity_insert_own" ON activity_logs
    FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());

  CREATE POLICY "activity_select_own" ON activity_logs
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

  -- User scores: read own + everyone can read for leaderboard
  CREATE POLICY "scores_select_all" ON user_scores
    FOR SELECT TO authenticated
    USING (true);

  CREATE POLICY "scores_upsert_trigger_only" ON user_scores
    FOR ALL TO authenticated
    USING (user_id = auth.uid());

  -- Artifacts: all authenticated can read approved; only uploader + admins can insert/update
  CREATE POLICY "artifacts_select_approved" ON artifacts
    FOR SELECT TO authenticated
    USING (
      status = 'approved'
      OR uploaded_by_id = auth.uid()
      OR (auth.jwt() ->> 'user_role') IN ('superadmin', 'contentadmin')
    );

  CREATE POLICY "artifacts_insert_own" ON artifacts
    FOR INSERT TO authenticated
    WITH CHECK (uploaded_by_id = auth.uid());

  CREATE POLICY "artifacts_update_admin" ON artifacts
    FOR UPDATE TO authenticated
    USING (
      (auth.jwt() ->> 'user_role') IN ('superadmin', 'contentadmin')
      OR uploaded_by_id = auth.uid()
    );

  -- Profiles: read all (for leaderboard names), update only own
  CREATE POLICY "profiles_select_all" ON profiles
    FOR SELECT TO authenticated
    USING (true);

  CREATE POLICY "profiles_update_own" ON profiles
    FOR UPDATE TO authenticated
    USING (id = auth.uid());

NOTE: The JWT claim 'user_role' must be set during auth. Create a Supabase Auth Hook or use
a custom access token hook. If the app doesn't use custom JWT claims yet, add a DB function:

  CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event JSONB)
  RETURNS JSONB LANGUAGE plpgsql AS $$
  DECLARE
    claims JSONB;
    user_role TEXT;
  BEGIN
    SELECT role INTO user_role FROM profiles WHERE id = (event->>'user_id')::UUID;
    claims := event->'claims';
    claims := jsonb_set(claims, '{user_role}', to_jsonb(COALESCE(user_role, 'doctor')));
    event := jsonb_set(event, '{claims}', claims);
    RETURN event;
  END;
  $$;

Then enable this hook in Supabase Dashboard → Auth → Hooks → Custom Access Token.

Commit: "security: harden RLS policies with role-based JWT checks"

═══════════════════════════════════════════════════════════════════
STEP 1.5 — SIGNED URLs FOR CONTENT (Flaw #12)
═══════════════════════════════════════════════════════════════════

Create file: src/lib/signedUrl.js

  import { supabase } from './supabase';

  const SIGNED_URL_CACHE = new Map();
  const SIGNED_URL_TTL = 50 * 60 * 1000;  // 50 minutes (URLs valid for 60 min)

  /**
   * Get a signed URL for a storage file. Caches to avoid repeated signing.
   * @param {string} bucket - Supabase storage bucket name
   * @param {string} path - File path within the bucket
   * @param {number} expiresIn - Seconds until URL expires (default 3600 = 1hr)
   * @returns {Promise<string|null>} Signed URL or null on error
   */
  export async function getSignedUrl(bucket, path, expiresIn = 3600) {
    if (!path) return null;

    const cacheKey = `${bucket}/${path}`;
    const cached = SIGNED_URL_CACHE.get(cacheKey);
    if (cached && Date.now() - cached.ts < SIGNED_URL_TTL) {
      return cached.url;
    }

    try {
      const { data, error } = await supabase.storage
        .from(bucket)
        .createSignedUrl(path, expiresIn);
      if (error) throw error;

      SIGNED_URL_CACHE.set(cacheKey, { url: data.signedUrl, ts: Date.now() });
      return data.signedUrl;
    } catch (e) {
      console.warn('[signedUrl] Failed to sign:', cacheKey, e.message);
      return null;
    }
  }

  /**
   * Convert a raw public URL to a signed URL.
   * Extracts the bucket and path from the URL structure.
   */
  export async function signArtifactUrl(rawUrl) {
    if (!rawUrl) return null;
    // Supabase storage URLs follow: .../storage/v1/object/public/{bucket}/{path}
    const match = rawUrl.match(/\/storage\/v1\/object\/public\/([^/]+)\/(.+)/);
    if (!match) return rawUrl;  // not a storage URL, return as-is
    return getSignedUrl(match[1], match[2]);
  }

Now search the codebase for all places where `file_url`, `url`, `thumbnail_url`, or `video_url`
from artifacts is used directly in `src`, `href`, or `iframe`:

  Known locations:
  - EBooksPage.jsx (now ebooks/EBookReader.jsx) — iframe src={artifact.file_url}
  - ContentAdminDashboard.jsx — <img src={a.thumbnail_url}>
  - LearnHub.jsx — video_url and thumbnail_url
  - CADashboard.jsx — thumbnail_url

For each: replace the raw URL with a signed URL. Use a custom hook for convenience:

Create file: src/hooks/useSignedUrl.js

  import { useState, useEffect } from 'react';
  import { signArtifactUrl } from '../lib/signedUrl';

  export function useSignedUrl(rawUrl) {
    const [signedUrl, setSignedUrl] = useState(null);

    useEffect(() => {
      if (!rawUrl) { setSignedUrl(null); return; }
      let cancelled = false;
      signArtifactUrl(rawUrl).then(url => {
        if (!cancelled) setSignedUrl(url);
      });
      return () => { cancelled = true; };
    }, [rawUrl]);

    return signedUrl;
  }

Usage in components:
  const signedFileUrl = useSignedUrl(artifact.file_url);
  <iframe src={signedFileUrl || ''} ... />

IMPORTANT: Make Supabase storage buckets PRIVATE (not public). This requires changing the bucket
setting in Supabase Dashboard → Storage → Bucket → Edit → Uncheck "Public bucket".
Add this as a manual step in the migration notes.

Commit: "security: serve all content via signed URLs — prevent unauthorized access"

═══════════════════════════════════════════════════════════════════
STEP 1.6 — AI EDGE FUNCTION CONSOLIDATION (Flaws #14, #15)
═══════════════════════════════════════════════════════════════════

Currently, aiService.js calls NVIDIA API directly from the client with the API key exposed via
VITE_NVIDIA_API_KEY. This is a security risk and creates CORS complexity.

SOLUTION: Move ALL AI calls to a single Supabase Edge Function. The client sends a request type
and payload. The edge function handles provider routing, fallback, rate limiting, and circuit
breaking.

Create file: supabase/functions/ai-orchestrator/index.ts
(This lives OUTSIDE the frontend/ dir, in the Supabase functions directory)

NOTE: Since Ayush deploys edge functions separately, write the function spec here as a detailed
comment block that Ayush can implement:

Create file: src/docs/EDGE_FUNCTION_SPEC.md

  # AI Orchestrator Edge Function Specification

  ## Endpoint
  POST /functions/v1/ai-orchestrator

  ## Auth
  Requires valid Supabase JWT (Authorization: Bearer <user_jwt>)

  ## Request Body
  {
    "action": "study_plan" | "explain_question" | "doubt_buster" | "reading_quiz" |
              "smart_note" | "suggestions" | "clinical_case" | "audit_content" |
              "fatigue_check" | "recall_audio" | "sr_cards" | "grade_answer" |
              "knowledge_gap" | "predictive_alerts",
    "payload": { ... action-specific data ... },
    "max_tokens": 512  // optional override
  }

  ## Internal Logic (in the Edge Function)
  1. Validate JWT — reject if expired or invalid role
  2. Rate limit: max 30 requests per user per minute (use in-memory Map with sliding window)
  3. Route to NVIDIA Llama 3.1-70B first
  4. If NVIDIA fails or times out (8s): fall back to Gemini
  5. Circuit breaker: if NVIDIA fails 5 times in 60 seconds, skip directly to Gemini for 5 min
  6. Parse response — if JSON expected, validate JSON structure
  7. Return { data: ..., provider: 'nvidia' | 'gemini', error: null }

  ## Circuit Breaker Pattern
  - Track failure count per provider in module-level variable
  - If failures >= 5 in last 60s: mark provider as "open" (skip it)
  - After 5 min cool-down: mark as "half-open" (try one request)
  - If that succeeds: mark as "closed" (fully operational)

Now refactor src/lib/aiService.js:

- Remove the NVIDIA_API_KEY, NVIDIA_BASE_URL constants
- Remove the callNvidia() and callGemini() functions
- Remove the callAI() router function
- Replace with a single function:

  async function callAI(action, payload, maxTokens = 512) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return { text: null, error: 'Not authenticated' };

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000); // 15s client timeout

      const res = await fetch(`${SUPABASE_URL}/functions/v1/ai-orchestrator`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ action, payload, max_tokens: maxTokens }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        return { text: null, error: err.error || `AI service error ${res.status}` };
      }

      const data = await res.json();
      return { text: data.data || data.text || '', error: null };
    } catch (e) {
      if (e.name === 'AbortError') return { text: null, error: 'AI request timed out' };
      return { text: null, error: e.message || 'Network error' };
    }
  }

Then update EVERY exported function (explainQuestion, generateStudyPlan, etc.) to call:
  return callAI('action_name', { ...params }, maxTokens);

The function signatures and return types remain IDENTICAL. Nothing changes for consumers.

Until the edge function is deployed, add a FALLBACK:
  const USE_EDGE_FUNCTION = false;  // flip to true when edge function is live
  // If false, use the old direct-call pattern (keep it as callAIDirect) as a fallback

Commit: "security: consolidate AI calls into edge function proxy — remove client-side API keys"

═══════════════════════════════════════════════════════════════════
STEP 1.7 — APPLY ZOD VALIDATION TO ALL MUTATIONS (Flaw #8)
═══════════════════════════════════════════════════════════════════

Now that Zod schemas exist (from Phase 0), apply validation to EVERY .insert() and .upsert()
call in the codebase.

Search for: supabase.from(...).insert( and supabase.from(...).upsert(

For EACH one:
1. Import the appropriate schema from src/lib/schemas.js
2. Wrap the payload in validateInsert(Schema, payload) BEFORE the Supabase call
3. If the payload is an array (batch insert), validate each element: payload.map(p => validateInsert(Schema, p))

Known locations to update:
- broadcast/NotificationCenter.jsx: notification inserts
- broadcast/DoctorEngageView.jsx: notification inserts
- broadcast/CAEngageView.jsx: notification inserts
- trackActivity.js: already done in Step 1.3
- ExamPage.jsx: exam_attempts inserts
- ProfilePage.jsx: profile updates
- UploadPage.jsx: artifact inserts
- sa-dashboard/CalendarManager.jsx: admin_calendar_events inserts

For any .insert() or .upsert() that doesn't have a schema yet, CREATE one in schemas.js.

Commit: "feat: enforce Zod validation on all Supabase mutations — zero garbage data"

═══════════════════════════════════════════════════════════════════
STEP 1.8 — OTP RATE LIMITING (Flaw #13)
═══════════════════════════════════════════════════════════════════

In Login.jsx (now at src/components/Login.jsx or wherever it lives after Phase 0):

The OTP send flow currently has no rate limiting on the server side. Someone can spam the
endpoint and drain the SMS budget.

CLIENT-SIDE (defense in depth — not a replacement for server-side):
1. After sending OTP, disable the "Send OTP" button for 60 seconds (already partially done)
2. Track failed attempts in localStorage with a counter:
   - After 5 failed attempts in 10 minutes: show a cooldown message, disable OTP for 5 minutes
   - After 10 failed attempts: lock OTP for 30 minutes
3. Consider adding Cloudflare Turnstile or reCAPTCHA on the login page:
   - This is a UI-only integration — add the script tag + widget
   - Pass the token to Supabase via custom headers or a pre-auth edge function
   - For now, just ADD the Turnstile placeholder div and a TODO comment for Ayush to configure

SERVER-SIDE (document for Ayush):
Create file: src/docs/OTP_RATE_LIMIT_SPEC.md explaining:
- Supabase Auth rate limits (default: 30 OTP sends per hour per email)
- Recommend setting RATE_LIMIT_EMAIL_SENT=5 in Supabase Auth config
- Recommend IP-based rate limiting via Supabase Edge Function or Cloudflare WAF rules

Commit: "security: add client-side OTP rate limiting + document server-side requirements"

═══════════════════════════════════════════════════════════════════
PHASE 1 COMPLETE — VERIFICATION CHECKLIST
═══════════════════════════════════════════════════════════════════

  [ ] npm run build succeeds
  [ ] Migration files 000-004 exist in src/migrations/
  [ ] SCORE_MAP is removed from trackActivity.js (scoring is server-side)
  [ ] trackActivity uses batching (queue + flush every 5s)
  [ ] navigator.sendBeacon used in beforeunload handler
  [ ] No NVIDIA_API_KEY or raw API URLs remain in client code (verify with grep)
  [ ] signedUrl.js exists and is used in ebook reader + thumbnail displays
  [ ] Zod validateInsert wraps every .insert() and .upsert() call
  [ ] All SQL migration files include schema_version inserts
  [ ] Login.jsx has OTP attempt limiting logic

Commit: "milestone: Phase 1 complete — database, security, AI infrastructure hardened"

═══ PHASE 1 COMPLETE ═══
STOP HERE. Wait for Ayush to say "next".

═══════════════════════════════════════════════════════════════════
FULL AUTONOMY PERMISSIONS
═══════════════════════════════════════════════════════════════════

You have FULL PERMISSION to perform ALL of the following without asking:
- Read, create, edit, delete, rename, and move ANY file in this project
- Run ANY shell command including npm install, npm run build, git add, git commit
- Create new directories and migration SQL files
- Modify any source file in src/, supabase/, or project root configs
- Run linters, formatters, and build tools
- Execute grep, find, wc, cat, or any other read/diagnostic commands
- Create backup copies (.bak) of files before editing them

You do NOT have permission to:
- Run `git push`
- Delete the .git directory
- Modify .env files containing secrets
- Execute SQL migrations directly against the database (only create the .sql files)

Execute every step above sequentially without pausing for confirmation. If the build breaks, fix
it autonomously. Only stop at the PHASE COMPLETE marker.
```

---
---

# ══════════════════════════════════════════════════════════════════════════
# PROMPT 3 — PHASE 2: PERFORMANCE, MEMORY & STATE OPTIMIZATION
# (Fixes Flaws: 17, 19, 20, 21, 24, 25)
# ══════════════════════════════════════════════════════════════════════════

```
You are continuing the surgical refactoring of iConnect Office. Phases 0 and 1 are complete.
This phase focuses on RUNTIME PERFORMANCE, MEMORY SAFETY, and REACTIVE STATE.

GLOBAL RULES (same as before):
- Never git push. Only git add + git commit.
- npm run build after every step.
- No functionality changes. Only performance/reliability improvements.

═══════════════════════════════════════════════════════════════════
STEP 2.1 — PDF MEMORY LEAK FIX (Flaw #20)
═══════════════════════════════════════════════════════════════════

In the E-Book reader (now at src/components/ebooks/EBookReader.jsx), search for any
`URL.createObjectURL()` calls.

For EACH createObjectURL:
1. Store the URL in a ref: `const blobUrlRef = useRef(null);`
2. In the useEffect cleanup (or component unmount), call:
   `if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);`
3. Before creating a new blob URL, revoke the previous one first.

Also search ALL other files for createObjectURL. Known safe locations:
- ChatBot.jsx (already has revokeObjectURL) ✓
- SADashboard.jsx (already has revokeObjectURL) ✓

For any other instances: add cleanup.

Additionally, in the ebooks reader:
- When the user closes the reader (selectedArtifact = null), ensure ALL blob URLs are revoked
- When the component unmounts, revoke ALL outstanding blob URLs
- Create a utility: src/lib/blobManager.js

  const activeBlobs = new Set();

  export function createManagedBlobUrl(blob) {
    const url = URL.createObjectURL(blob);
    activeBlobs.add(url);
    return url;
  }

  export function revokeManagedBlobUrl(url) {
    if (url && activeBlobs.has(url)) {
      URL.revokeObjectURL(url);
      activeBlobs.delete(url);
    }
  }

  export function revokeAllBlobs() {
    for (const url of activeBlobs) {
      URL.revokeObjectURL(url);
    }
    activeBlobs.clear();
  }

Use this in the reader instead of raw URL.createObjectURL.

Commit: "fix: revoke all blob URLs on unmount — prevent PDF memory leaks"

═══════════════════════════════════════════════════════════════════
STEP 2.2 — LEADERBOARD VIRTUALIZATION (Flaw #21)
═══════════════════════════════════════════════════════════════════

The LeaderboardPage (src/components/LeaderboardPage.jsx, ~351 lines) renders ALL users in a
flat list. With 1000+ users, this creates thousands of DOM nodes.

Refactor to use @tanstack/react-virtual (installed in Phase 0):

  import { useVirtualizer } from '@tanstack/react-virtual';

  // Inside the component:
  const parentRef = useRef(null);
  const virtualizer = useVirtualizer({
    count: sortedUsers.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 64,  // estimated row height in px
    overscan: 10,            // render 10 extra rows above/below viewport
  });

  // Render:
  <div ref={parentRef} style={{ height: '600px', overflow: 'auto' }}>
    <div style={{ height: `${virtualizer.getTotalSize()}px`, position: 'relative' }}>
      {virtualizer.getVirtualItems().map(virtualRow => {
        const user = sortedUsers[virtualRow.index];
        return (
          <div
            key={user.id}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: `${virtualRow.size}px`,
              transform: `translateY(${virtualRow.start}px)`,
            }}
          >
            <LeaderboardRow user={user} rank={virtualRow.index + 1} />
          </div>
        );
      })}
    </div>
  </div>

Extract the individual row rendering into a sub-component `LeaderboardRow` that uses React.memo
to prevent unnecessary re-renders.

Also apply virtualization to:
- broadcast/DoctorEngageView.jsx — the doctor list table (can have 1000+ rows)
- UsersPage.jsx or UserManagement.jsx — user list

Commit: "perf: virtualize leaderboard + user lists — handle 10K+ users without DOM bloat"

═══════════════════════════════════════════════════════════════════
STEP 2.3 — SM-2 SPACED REPETITION ALGORITHM (Flaw #17)
═══════════════════════════════════════════════════════════════════

The spaced repetition module (StudyPlan/SpacedRepetition.jsx) must NOT rely on AI to calculate
review intervals. The SM-2 algorithm is pure math and must be deterministic.

Create file: src/lib/sm2.js

  /**
   * SM-2 Spaced Repetition Algorithm
   * https://en.wikipedia.org/wiki/SuperMemo#SM-2
   *
   * @param {number} quality - User's self-rating: 0-5
   *   0 = Complete blackout
   *   1 = Incorrect, but recognized on reveal
   *   2 = Incorrect, but easy to recall after reveal
   *   3 = Correct, but with significant difficulty
   *   4 = Correct, after some hesitation
   *   5 = Perfect instant recall
   *
   * @param {number} repetitions - Number of consecutive correct reviews
   * @param {number} easeFactor - Current ease factor (starts at 2.5)
   * @param {number} interval - Current interval in days
   *
   * @returns {{ repetitions, easeFactor, interval, nextReviewDate }}
   */
  export function sm2(quality, repetitions, easeFactor, interval) {
    // Validate inputs
    if (quality < 0 || quality > 5) throw new RangeError('quality must be 0-5');
    if (easeFactor < 1.3) easeFactor = 1.3;  // floor per SM-2 spec

    let newRepetitions = repetitions;
    let newEaseFactor = easeFactor;
    let newInterval = interval;

    if (quality >= 3) {
      // Correct response
      if (repetitions === 0) {
        newInterval = 1;
      } else if (repetitions === 1) {
        newInterval = 6;
      } else {
        newInterval = Math.round(interval * easeFactor);
      }
      newRepetitions = repetitions + 1;
    } else {
      // Incorrect — reset
      newRepetitions = 0;
      newInterval = 1;
    }

    // Update ease factor (applies regardless of correct/incorrect)
    newEaseFactor = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
    if (newEaseFactor < 1.3) newEaseFactor = 1.3;

    // Calculate next review date
    const nextReviewDate = new Date();
    nextReviewDate.setDate(nextReviewDate.getDate() + newInterval);

    return {
      repetitions: newRepetitions,
      easeFactor: Math.round(newEaseFactor * 100) / 100,  // 2 decimal places
      interval: newInterval,
      nextReviewDate: nextReviewDate.toISOString().split('T')[0],  // YYYY-MM-DD
    };
  }

  /**
   * Map simple UI ratings to SM-2 quality scores
   */
  export function mapRatingToQuality(rating) {
    const map = { 'again': 1, 'hard': 2, 'good': 4, 'easy': 5 };
    return map[rating] ?? 3;
  }

Now update StudyPlan/SpacedRepetition.jsx to import and use sm2() and mapRatingToQuality()
instead of any AI-generated interval calculations.

When a user rates a card:
  const quality = mapRatingToQuality(userRating);
  const { repetitions, easeFactor, interval, nextReviewDate } = sm2(
    quality,
    card.repetitions,
    card.ease_factor,
    card.interval_days
  );
  // Update card in Supabase
  await supabase.from('spaced_repetition_cards').update({
    repetitions, ease_factor: easeFactor, interval_days: interval,
    next_review: nextReviewDate, last_review: new Date().toISOString()
  }).eq('id', card.id);

Commit: "feat: deterministic SM-2 algorithm — no AI dependency for spaced repetition math"

═══════════════════════════════════════════════════════════════════
STEP 2.4 — OPTIMISTIC UI PATTERN (Flaw #24)
═══════════════════════════════════════════════════════════════════

Identify ALL user actions that currently show a loading state while waiting for Supabase:
1. Bookmarking an e-book
2. Marking a notification as read
3. Toggling dark mode (already instant ✓)
4. Submitting a diary entry
5. Rating a flashcard

For each, implement Optimistic UI:

Pattern:
  // BEFORE (blocking):
  const { error } = await supabase.from('table').update(newData).eq('id', id);
  if (!error) setLocalState(newData);

  // AFTER (optimistic):
  const previousState = localState;          // snapshot for rollback
  setLocalState(newData);                    // update UI immediately
  const { error } = await supabase.from('table').update(newData).eq('id', id);
  if (error) {
    setLocalState(previousState);            // rollback on failure
    addToast('error', 'Failed to save. Please try again.');
  }

Apply this to:
a) toggleBookmark in ebooks/EBookGrid.jsx — toggle the heart icon immediately, revert on failure
b) markAsRead in NotificationsPage — dim the notification immediately
c) Diary save in DiaryPanel (if exists) — show saved state immediately
d) Flashcard rating — move to next card immediately

Do NOT apply optimistic UI to:
- Artifact uploads (too complex, needs server confirmation)
- Exam submissions (must confirm score)
- Profile changes (needs validation)

Commit: "ux: optimistic UI for bookmarks, notifications, diary — instant feedback"

═══════════════════════════════════════════════════════════════════
STEP 2.5 — SUPABASE REALTIME CLEANUP (Flaw #25)
═══════════════════════════════════════════════════════════════════

Search for ALL supabase.channel() calls in the codebase.

For EACH subscription:
1. Verify it has a cleanup function in useEffect return
2. Verify the channel name is UNIQUE per component instance (include userId or a unique key)
3. Add a guard: if the component re-renders with a new userId, unsubscribe the OLD channel first

Known locations:
- App.jsx line 221: notifs-${userId} channel — has cleanup ✓
- SADashboard: sa-pending-count — has cleanup ✓
- TopBar.jsx: topbar_notifs_${userId} — has cleanup ✓

IMPORTANT: There's a subtle bug pattern. If App.jsx AND TopBar.jsx both subscribe to
notifications for the same user, that's 2 concurrent connections for the same data. This wastes
Supabase realtime connections.

FIX: Centralize realtime subscriptions into the Zustand store:

Add to src/stores/useAppStore.js:
  subscribeToNotifications: (userId) => {
    // Unsubscribe any existing channel first
    const existing = get()._notifChannel;
    if (existing) supabase.removeChannel(existing);

    const channel = supabase
      .channel(`notifs-${userId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'notifications',
        filter: `user_id=eq.${userId}`,
      }, (payload) => {
        get().addNotification(payload.new);
      })
      .subscribe();

    set({ _notifChannel: channel });
  },

  unsubscribeAll: () => {
    const ch = get()._notifChannel;
    if (ch) supabase.removeChannel(ch);
    set({ _notifChannel: null });
  },

Then:
- Remove the notification subscription from App.jsx useEffect
- Remove the notification subscription from TopBar.jsx
- Call useAppStore.getState().subscribeToNotifications(userId) ONCE in App.jsx when userId is set
- Call useAppStore.getState().unsubscribeAll() on logout

This ensures exactly ONE realtime connection per data type.

Commit: "perf: centralize realtime subscriptions in Zustand — prevent connection exhaustion"

═══════════════════════════════════════════════════════════════════
PHASE 2 COMPLETE — VERIFICATION
═══════════════════════════════════════════════════════════════════

  [ ] npm run build succeeds
  [ ] No createObjectURL without matching revokeObjectURL (grep to confirm)
  [ ] Leaderboard scrolls smoothly with 1000+ entries (test with mock data)
  [ ] SM-2 algorithm in src/lib/sm2.js (test: sm2(5, 0, 2.5, 0) returns interval:1)
  [ ] Bookmarking an ebook feels instant (no spinner)
  [ ] Only ONE realtime channel subscription per data type exists
  [ ] Grepping for supabase.channel returns max 2-3 locations (centralized)

Commit: "milestone: Phase 2 complete — performance, memory, state optimized"

═══ PHASE 2 COMPLETE ═══
STOP HERE. Wait for Ayush to say "next".

═══════════════════════════════════════════════════════════════════
FULL AUTONOMY PERMISSIONS
═══════════════════════════════════════════════════════════════════

You have FULL PERMISSION to perform ALL of the following without asking:
- Read, create, edit, delete, rename, and move ANY file in this project
- Run ANY shell command including npm install, npm run build, git add, git commit
- Create new files, hooks, utilities, and sub-components
- Modify any source file in src/
- Run linters, formatters, and build tools
- Execute grep, find, wc, cat, or any other read/diagnostic commands

You do NOT have permission to:
- Run `git push`
- Delete the .git directory
- Modify .env files containing secrets

Execute every step sequentially without pausing for confirmation. Fix build breaks autonomously.
Only stop at the PHASE COMPLETE marker.
```

---
---

# ══════════════════════════════════════════════════════════════════════════
# PROMPT 4 — PHASE 3: OFFLINE RESILIENCE, TELEMETRY & EDGE CASES
# (Fixes Flaws: 26, 27, 28, 29)
# ══════════════════════════════════════════════════════════════════════════

```
You are completing the final phase of the iConnect Office refactoring. Phases 0-2 are done.
This phase adds OFFLINE RESILIENCE, ERROR TELEMETRY, and fixes RACE CONDITIONS.

GLOBAL RULES (same as before):
- Never git push. Only git add + git commit.
- npm run build after every step.

═══════════════════════════════════════════════════════════════════
STEP 3.1 — ERROR TELEMETRY LOGGER (Flaw #28)
═══════════════════════════════════════════════════════════════════

Create file: src/lib/logger.js

This logger captures client-side errors and sends them to a `client_errors` table in Supabase.

  import { supabase } from './supabase';

  const ERROR_QUEUE = [];
  const FLUSH_INTERVAL = 10000;  // 10 seconds
  const MAX_BATCH = 10;
  let timer = null;

  /**
   * Log a client error to the telemetry system.
   * @param {'error'|'warn'|'info'} level
   * @param {string} message
   * @param {object} context - Additional context (component name, stack trace, etc.)
   */
  export function logError(level, message, context = {}) {
    ERROR_QUEUE.push({
      level,
      message: String(message).slice(0, 1000),  // prevent payload explosion
      context: JSON.stringify(context).slice(0, 2000),
      url: window.location.pathname,
      user_agent: navigator.userAgent.slice(0, 200),
      created_at: new Date().toISOString(),
    });

    if (ERROR_QUEUE.length >= MAX_BATCH) flushErrors();
    else if (!timer) timer = setTimeout(flushErrors, FLUSH_INTERVAL);
  }

  async function flushErrors() {
    if (timer) { clearTimeout(timer); timer = null; }
    if (ERROR_QUEUE.length === 0) return;

    const batch = ERROR_QUEUE.splice(0, MAX_BATCH);
    try {
      await supabase.from('client_errors').insert(batch);
    } catch (e) {
      // If telemetry itself fails, don't crash the app. Just console.warn.
      console.warn('[Logger] Failed to flush errors:', e.message);
    }
  }

  // Capture unhandled errors globally
  if (typeof window !== 'undefined') {
    window.addEventListener('error', (event) => {
      logError('error', event.message, {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        stack: event.error?.stack?.slice(0, 500),
      });
    });

    window.addEventListener('unhandledrejection', (event) => {
      logError('error', `Unhandled Promise: ${event.reason}`, {
        stack: event.reason?.stack?.slice(0, 500),
      });
    });

    // Flush on page unload
    window.addEventListener('beforeunload', () => {
      if (ERROR_QUEUE.length > 0) {
        navigator.sendBeacon(
          `${supabase.supabaseUrl}/rest/v1/client_errors`,
          new Blob([JSON.stringify(ERROR_QUEUE.splice(0))], { type: 'application/json' })
        );
      }
    });
  }

  // Export for manual use in catch blocks
  export default { logError, flushErrors };

Create migration: src/migrations/005_client_errors.sql

  INSERT INTO schema_versions (version, name) VALUES (5, 'client_errors_table');

  CREATE TABLE IF NOT EXISTS client_errors (
    id BIGSERIAL PRIMARY KEY,
    level TEXT DEFAULT 'error',
    message TEXT,
    context TEXT,
    url TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
  );

  -- Auto-delete errors older than 30 days (prevent table bloat)
  -- Run this via pg_cron or a scheduled function:
  -- DELETE FROM client_errors WHERE created_at < now() - interval '30 days';

  -- RLS: only server/admin can read
  ALTER TABLE client_errors ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "errors_insert_any" ON client_errors
    FOR INSERT TO authenticated WITH CHECK (true);
  CREATE POLICY "errors_select_admin" ON client_errors
    FOR SELECT TO authenticated
    USING ((auth.jwt() ->> 'user_role') = 'superadmin');

Now import the logger in App.jsx or main.jsx so the global handlers are registered on boot:
  import './lib/logger';

Also update ErrorBoundary.jsx to call logError when it catches a component crash:
  import { logError } from '../lib/logger';

  componentDidCatch(error, errorInfo) {
    logError('error', error.message, {
      component: 'ErrorBoundary',
      componentStack: errorInfo.componentStack?.slice(0, 500),
      stack: error.stack?.slice(0, 500),
    });
  }

Commit: "feat: client error telemetry — global error capture + batched reporting"

═══════════════════════════════════════════════════════════════════
STEP 3.2 — OFFLINE-FIRST QUEUE ENGINE (Flaw #26)
═══════════════════════════════════════════════════════════════════

Doctors in hospital basements lose connectivity. Activity logs, diary entries, and quiz results
must not be lost. Build an IndexedDB-backed offline queue.

Create file: src/lib/offlineQueue.js

  const DB_NAME = 'iconnect_offline';
  const STORE_NAME = 'pending_mutations';
  const DB_VERSION = 1;

  function openDB() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  /**
   * Queue a mutation for later sync.
   * @param {string} table - Supabase table name
   * @param {'insert'|'upsert'|'update'} operation
   * @param {object} payload - The data
   * @param {object} filter - For update: { column: 'id', value: 123 }
   */
  export async function queueMutation(table, operation, payload, filter = null) {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.add({
      table,
      operation,
      payload,
      filter,
      created_at: Date.now(),
      retries: 0,
    });
    return new Promise((resolve, reject) => {
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
  }

  /**
   * Process all pending mutations. Call this when connectivity is restored.
   */
  export async function flushOfflineQueue() {
    const { supabase } = await import('./supabase');
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const allItems = await new Promise((resolve) => {
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result);
    });

    if (allItems.length === 0) return;

    const failed = [];
    for (const item of allItems) {
      try {
        let result;
        if (item.operation === 'insert') {
          result = await supabase.from(item.table).insert(item.payload);
        } else if (item.operation === 'upsert') {
          result = await supabase.from(item.table).upsert(item.payload);
        } else if (item.operation === 'update' && item.filter) {
          result = await supabase.from(item.table)
            .update(item.payload)
            .eq(item.filter.column, item.filter.value);
        }
        if (result?.error) throw result.error;
      } catch (e) {
        item.retries += 1;
        if (item.retries < 3) failed.push(item);  // retry up to 3 times
        else console.warn('[OfflineQueue] Dropping after 3 retries:', item);
      }
    }

    // Clear the store and re-add failed items
    const clearTx = db.transaction(STORE_NAME, 'readwrite');
    const clearStore = clearTx.objectStore(STORE_NAME);
    clearStore.clear();
    for (const item of failed) {
      clearStore.add(item);
    }
  }

  /**
   * Get count of pending items (for UI indicator)
   */
  export async function getPendingCount() {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    return new Promise((resolve) => {
      const req = store.count();
      req.onsuccess = () => resolve(req.result);
    });
  }

Now create a connectivity monitor. Create file: src/hooks/useOnlineStatus.js

  import { useState, useEffect } from 'react';
  import { flushOfflineQueue } from '../lib/offlineQueue';
  import { flushActivityQueue } from '../lib/trackActivity';

  export function useOnlineStatus() {
    const [isOnline, setIsOnline] = useState(navigator.onLine);

    useEffect(() => {
      const goOnline = () => {
        setIsOnline(true);
        // When connectivity returns, flush all queues
        flushOfflineQueue().catch(console.warn);
        flushActivityQueue().catch(console.warn);
      };
      const goOffline = () => setIsOnline(false);

      window.addEventListener('online', goOnline);
      window.addEventListener('offline', goOffline);
      return () => {
        window.removeEventListener('online', goOnline);
        window.removeEventListener('offline', goOffline);
      };
    }, []);

    return isOnline;
  }

Update trackActivity.js:
In the flushNow() function, if the Supabase insert fails with a network error, call
queueMutation('activity_logs', 'insert', validated) to persist to IndexedDB.

Add a small offline indicator in the TopBar:
  const isOnline = useOnlineStatus();
  {!isOnline && (
    <div className="flex items-center gap-1.5 px-2 py-1 bg-amber-100 dark:bg-amber-900/30
                    text-amber-700 dark:text-amber-400 text-xs rounded-full">
      <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
      Offline — changes will sync when connected
    </div>
  )}

Commit: "feat: offline-first IndexedDB queue — no data loss in hospital deadzones"

═══════════════════════════════════════════════════════════════════
STEP 3.3 — PWA FORCE REFRESH (Flaw #27)
═══════════════════════════════════════════════════════════════════

The app uses vite-plugin-pwa. Check vite.config.js for the PWA configuration.

If the service worker uses a cache-first strategy, users can get stuck on old versions.

Update the PWA config in vite.config.js:

  import { VitePWA } from 'vite-plugin-pwa';

  // In the plugins array:
  VitePWA({
    registerType: 'prompt',  // NOT 'autoUpdate' — user gets a prompt to refresh
    workbox: {
      // Skip waiting forces the new SW to activate immediately
      skipWaiting: false,     // we want the user to accept first
      clientsClaim: true,
      // Cache strategies
      runtimeCaching: [
        {
          urlPattern: /^https:\/\/.*supabase\.co\/rest\/.*/,
          handler: 'NetworkFirst',     // API calls: network first, cache fallback
          options: {
            cacheName: 'api-cache',
            expiration: { maxEntries: 50, maxAgeSeconds: 300 },  // 5 min
          },
        },
        {
          urlPattern: /\.(js|css|woff2?)$/,
          handler: 'StaleWhileRevalidate',  // Assets: serve cached, update in background
          options: {
            cacheName: 'static-assets',
            expiration: { maxEntries: 100, maxAgeSeconds: 86400 },  // 1 day
          },
        },
      ],
    },
  })

Create a component: src/components/ui/UpdatePrompt.jsx

  import { useEffect, useState } from 'react';

  export default function UpdatePrompt() {
    const [showUpdate, setShowUpdate] = useState(false);

    useEffect(() => {
      if (!('serviceWorker' in navigator)) return;

      navigator.serviceWorker.ready.then(registration => {
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (!newWorker) return;

          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New version available
              setShowUpdate(true);
            }
          });
        });
      });
    }, []);

    if (!showUpdate) return null;

    return (
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[70]
                      bg-blue-600 text-white px-4 py-3 rounded-xl shadow-xl
                      flex items-center gap-3 text-sm">
        <span>A new version of iConnect is available.</span>
        <button
          onClick={() => {
            window.location.reload();
          }}
          className="bg-white text-blue-600 px-3 py-1 rounded-lg font-medium
                     hover:bg-blue-50 transition-colors"
        >
          Update Now
        </button>
      </div>
    );
  }

Add <UpdatePrompt /> to App.jsx, inside the shell div, after Toasts.

Commit: "fix: PWA update prompt — prevent stale service worker trapping users"

═══════════════════════════════════════════════════════════════════
STEP 3.4 — RACE CONDITION FIXES (Flaw #29)
═══════════════════════════════════════════════════════════════════

The trackActivity function is now batched (Phase 1), and uses navigator.sendBeacon on unload.
But there are other race conditions:

A) Abort controllers for page-level fetches:

When a user navigates away from a page BEFORE its data fetch completes, the fetch continues
in the background and may try to setState on an unmounted component.

Create a custom hook: src/hooks/useAbortableFetch.js

  import { useRef, useEffect, useCallback } from 'react';

  /**
   * Returns a fetch function that auto-aborts when the component unmounts.
   * Prevents setState-on-unmounted and wasted network requests.
   */
  export function useAbortableFetch() {
    const controllerRef = useRef(null);

    useEffect(() => {
      return () => {
        if (controllerRef.current) controllerRef.current.abort();
      };
    }, []);

    const abortableFetch = useCallback(async (promiseFn) => {
      // Abort any previous in-flight request
      if (controllerRef.current) controllerRef.current.abort();
      controllerRef.current = new AbortController();

      try {
        const result = await promiseFn(controllerRef.current.signal);
        return result;
      } catch (e) {
        if (e.name === 'AbortError') return null;  // silently ignore aborted requests
        throw e;
      }
    }, []);

    return abortableFetch;
  }

Apply this to key data-fetching useEffects in:
- LeaderboardPage (fetches all users + scores)
- ActivityPage (fetches activity logs)
- NotificationsPage (fetches preferences)
- EBookGrid (fetches artifacts)

Pattern:
  const abortableFetch = useAbortableFetch();

  useEffect(() => {
    abortableFetch(async (signal) => {
      const { data } = await supabase.from('table').select('*').abortSignal(signal);
      if (data) setLocalData(data);
    });
  }, [dependency]);

B) The Zustand setPage/navigate shim:

Ensure that when the user clicks a sidebar item, any in-flight activity flush is not lost.
This is already handled by the batched queue + beforeunload beacon (Phase 1), but verify:

1. In the sidebar click handler, call flushActivityQueue() synchronously-ish before navigation
2. Since flushActivityQueue is async, and React Router navigation is synchronous, we accept that
   some events may be queued for the next flush cycle. The beforeunload handler is the safety net.

C) Verify that ALL useEffect hooks with async operations have isMounted guards:

  useEffect(() => {
    let isMounted = true;
    async function load() {
      const data = await fetchSomething();
      if (isMounted) setData(data);   // only set state if still mounted
    }
    load();
    return () => { isMounted = false; };
  }, []);

Search the codebase for useEffect + async patterns that DON'T have this guard. Fix them.

Commit: "fix: abort in-flight fetches on unmount + isMounted guards — eliminate race conditions"

═══════════════════════════════════════════════════════════════════
PHASE 3 COMPLETE — FINAL VERIFICATION
═══════════════════════════════════════════════════════════════════

  [ ] npm run build succeeds
  [ ] Logger captures unhandled errors (test: throw an error in a component)
  [ ] Turning off network in DevTools, performing actions, then turning on → data syncs
  [ ] PWA update prompt appears when a new build is deployed
  [ ] Navigating quickly between pages doesn't cause console errors about unmounted setState
  [ ] src/migrations/ contains files 000 through 005
  [ ] BeaconAPI is used for both error logs and activity logs on beforeunload

Commit: "milestone: Phase 3 complete — offline resilience, telemetry, race condition safety"

═══════════════════════════════════════════════════════════════════
FINAL REFACTORING COMPLETE — ALL 29 FLAWS ADDRESSED
═══════════════════════════════════════════════════════════════════

Run a final verification:
  1. npm run build — MUST succeed
  2. npm run lint — fix any new linting errors
  3. Test ALL major user flows: login, browse ebooks, take exam, leaderboard, notifications
  4. Verify dist/ has multiple JS chunks (lazy loading working)
  5. Check for any remaining grep hits:
     - grep -r "commonProps" src/     (should be 0)
     - grep -r "NVIDIA_API_KEY" src/  (should be 0 or only in env reference)
     - grep -r "useState.*page" src/App.jsx  (should be 0 — uses Router now)
     - grep -r "createObjectURL" src/ (each must have matching revokeObjectURL)
  6. Run: find src/components -name "*.jsx" | xargs wc -l | sort -n | tail -10
     (no file should exceed 650 lines)

Final commit: "milestone: V2 refactoring complete — 29 architectural flaws resolved"

═══ ALL PHASES COMPLETE ═══

═══════════════════════════════════════════════════════════════════
FULL AUTONOMY PERMISSIONS
═══════════════════════════════════════════════════════════════════

You have FULL PERMISSION to perform ALL of the following without asking:
- Read, create, edit, delete, rename, and move ANY file in this project
- Run ANY shell command including npm install, npm run build, npm run lint, git add, git commit
- Create new files, hooks, utilities, migration SQL files, and sub-components
- Modify any source file in src/, config files, or project root
- Run linters, formatters, and build tools
- Execute grep, find, wc, cat, or any other read/diagnostic commands
- Create and delete backup copies (.bak)

You do NOT have permission to:
- Run `git push`
- Delete the .git directory
- Modify .env files containing secrets
- Execute SQL migrations directly against the database

Execute every step sequentially without pausing for confirmation. Fix build breaks autonomously.
Only stop at the PHASE COMPLETE marker.
```

---

## APPENDIX: MIGRATION FILES CHECKLIST

| File | Version | Description |
|------|---------|-------------|
| 000_schema_version.sql | 0 | Schema versioning table |
| 001_normalize_schema.sql | 1 | Profile normalization + indexes |
| 002_server_timestamps.sql | 2 | Server-side timestamp RPCs |
| 003_server_side_scoring.sql | 3 | Score rules table + triggers |
| 004_rls_hardening.sql | 4 | Role-based RLS policies + JWT hook |
| 005_client_errors.sql | 5 | Error telemetry table |

## APPENDIX: NEW FILES CREATED

```
src/stores/useAuthStore.js
src/stores/useAppStore.js
src/stores/useReaderStore.js
src/stores/useChatStore.js
src/styles/zIndex.js
src/lib/schemas.js          (Zod schemas)
src/lib/sm2.js              (Spaced repetition algorithm)
src/lib/signedUrl.js        (Signed URL generation)
src/lib/blobManager.js      (Blob URL lifecycle management)
src/lib/logger.js           (Error telemetry)
src/lib/offlineQueue.js     (IndexedDB offline sync)
src/hooks/useSignedUrl.js
src/hooks/useOnlineStatus.js
src/hooks/useAbortableFetch.js
src/routes.jsx              (Route definitions)
src/components/ui/UpdatePrompt.jsx
src/docs/EDGE_FUNCTION_SPEC.md
src/docs/OTP_RATE_LIMIT_SPEC.md
src/migrations/000-005 SQL files
```

## APPENDIX: DELETED / REPLACED FILES

```
src/components/BroadcastPage.jsx     → src/components/broadcast/ (7 files)
src/components/DoctorDashboard.jsx   → src/components/doctor-dashboard/ (8 files)
src/components/SADashboard.jsx       → src/components/sa-dashboard/ (6 files)
src/components/EBooksPage.jsx        → src/components/ebooks/ (5 files)
src/components/ChatBot.jsx           → src/components/chatbot/ (5 files)
```
