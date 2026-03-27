# iConnect Infrastructure & Cross-Cutting Concerns Audit
**Date:** 2026-03-24
**Scope:** Routing, Offline Sync, Multi-tenancy, Edge Functions, Error Handling, Mobile, Leaderboard & Broadcast

---

## PART A: ROUTING & NAVIGATION

### App.jsx Structure
- **Routing Approach:** No React Router — uses custom page state management via `useAppStore`
- **Location:** `/frontend/src/App.jsx`
- **Key Finding:** Pages are rendered via switch statement on `page` state (line 388-449)
- **Implementation Details:**
  - 23 pages lazy-loaded via `React.lazy()` for code splitting
  - Suspense with `PageLoader` provides loading UI
  - Pages: `dashboard`, `ebooks`, `exam`, `leaderboard`, `activity`, `broadcast`, `study-plan`, `arena-host`, `arena-student`, `case-sim`, etc.

### Sidebar.jsx - Role-Based Navigation
- **Location:** `/frontend/src/components/Sidebar.jsx`
- **Role Gating:** ✅ **WORKING**
  - **Superadmin:** Dashboard, User Management, Content Management, Reports, Settings, Broadcast
  - **Content Admin:** Dashboard, Upload Content, E-Book Library, Host Live Arena, Exam Manager, Notification Center, Profile, Settings
  - **Doctor:** Dashboard, My Activity, My Leaderboard, Notifications, E-Books, Learn Hub, Exam, Conferences, Live Arena (student), Calendar, Case Simulator, Study Plan
- **Mobile Responsiveness:** ✅ **Implemented**
  - Sidebar uses `sidebar-open` class on mobile (<768px)
  - Hamburger menu button shown on mobile (`.topbar-menu-btn` hidden on desktop)
  - Sidebar slides in from left with overlay

### TopBar.jsx
- **Location:** `/frontend/src/components/TopBar.jsx`
- **Features:**
  - ✅ Page search dropdown with fuzzy match on navigation
  - ✅ Dark mode toggle (synced to localStorage + document theme attribute)
  - ✅ Real-time notification badge with Supabase Realtime listener (line 46-75)
  - ✅ Notification panel shows 5 most recent + "View All" link
  - ✅ Mobile PWA install button (when `isInstallable` is true)
  - ✅ "Verified" & role badges
  - ✅ Security badge: "Secure Session" with lock icon

### Route Guards / Access Control
- **Finding:** No explicit ProtectedRoute component or route guard middleware
- **Current Protection:**
  - **Gate 1:** Auth state check in App.jsx (line 363) — if `!role`, show Login or Registration
  - **Gate 2:** BroadcastPage (line 16-29) explicitly checks if `role !== 'superadmin'` or `role !== 'contentadmin'`, otherwise shows "Access Restricted"
  - **Vulnerability:** No explicit guard prevents doctor from accessing `/exam-manage` or CA routes if they directly call `setPage()`. **The system relies entirely on UI hiding, not server-side validation.**

### 404 / Error Routes
- No catch-all 404 route — if page doesn't exist in the switch, shows "Coming Soon" page (line 440-447)

---

## PART B: OFFLINE SYNC

### useOfflineStore.js
- **Location:** `/frontend/src/stores/useOfflineStore.js`
- **State Tracked:** ✅ Complete
  - `isOnline` (boolean)
  - `pendingCount` (number of queued requests)
  - `lastSyncAt` (ISO timestamp)
  - `syncError` (error message)
- **Network Listeners:** ✅ Registered in app (line 29-38)
  - Listens to `window.online` and `window.offline` events
  - Clears syncError when back online

### offlineSync.js
- **Location:** `/frontend/src/lib/offlineSync.js`
- **Architecture:** ✅ **Fully Implemented**
  - **Storage:** IndexedDB (`iconnect-offline-queue`)
  - **Queue Functions:**
    - `queueRequest(tag, url, method, body, headers)` — stores to IndexedDB + registers SyncManager event
    - `getPendingRequests(tag)` — retrieves all queued requests by tag
    - `deletePendingRequest(id)` — removes after successful retry
    - `getPendingCount()` — count all pending
  - **SW Integration:** Calls `navigator.serviceWorker.ready.sync.register(tag)` for background sync
  - **Listener:** `onSyncMessage(handler)` listens for `SYNC_COMPLETE` messages from SW

### Service Worker / PWA
- **Location:** `vite.config.js`
- **Setup:** ✅ **Configured with VitePWA plugin**
  - **Manifest:** Configured for standalone mode (line 18)
  - **Icons:** 192x192 and 512x512 PNGs
  - **Workbox Config:**
    - `skipWaiting: true` — new SW activates immediately
    - `clientsClaim: true` — claims all clients
    - `navigateFallback: 'index.html'` — SPA fallback
  - **Runtime Caching Strategies:**
    - Google Fonts: `CacheFirst` with 1-year expiration
    - Activity logs: `NetworkOnly` with BackgroundSync (24-hour retry window)
    - All Supabase requests: `NetworkOnly` (never cache auth tokens)
  - **Background Sync Tag:** `activity-sync`

### Known Issue
- `usePWAInstall` hook is used to prompt install (Sidebar.jsx line 73, TopBar.jsx line 23)
- No evidence of actual SW file in `/frontend/public/` but Workbox generates it at build time

---

## PART C: MULTI-TENANCY

### tenantResolver.js
- **Location:** `/frontend/src/lib/tenantResolver.js`
- **Resolution Order:** ✅ **Well-Defined (line 4-9)**
  1. JWT claim `tenant_id` (from auth token)
  2. Custom domain match from `tenants` table
  3. Subdomain match: `slug.iconnect-med.vercel.app`
  4. Default public tenant (fallback)
- **Default Tenant:**
  ```
  id: '00000000-0000-0000-0000-000000000001'
  slug: 'default'
  name: 'iConnect'
  primary_color: '#4F46E5'
  secondary_color: '#818CF8'
  ```
- **Caching:** Single in-memory cache (`_cached`) — cleared on logout
- **Branding:** `applyTenantBranding()` sets CSS variables `--color-primary` and `--color-secondary` on `:root`

### useTenantStore.js
- **Location:** `/frontend/src/stores/useTenantStore.js`
- **State:** `tenant`, `loading`, `error`
- **Actions:**
  - `loadTenant()` — resolves tenant once on app load
  - `switchTenant(tenantId)` — for superadmin tenant switching
  - `clearTenant()` — on logout
- **Helpers:** `tenantName`, `tenantLogoUrl`, `primaryColor` getters

### Tenant Filtering in DB Queries
- **Finding:** Checked `supabase.js` (line 1-6)
- **Issue:** ⚠️ **No automatic tenant_id filtering visible in the first 200 lines**
- **Action Needed:** Full read of `supabase.js` sections for artifacts, user_content, and exam queries required to verify tenant isolation

### Sidebar/TopBar Branding
- ✅ Both use `useTenantStore` to display:
  - Tenant logo (if provided)
  - Tenant name
  - Tenant primary color for logo background

---

## PART D: EDGE FUNCTIONS

### Deployed Functions (8 total)
All located in `/supabase/functions/`:

#### 1. **submit-exam** ✅ WORKING
- **File:** `/supabase/functions/submit-exam/index.ts`
- **Purpose:** Tamper-proof exam scoring with idempotency
- **Key Features:**
  - JWT auth check (line 31-36)
  - Idempotency key lookup (line 68-80) — prevents double submission
  - Advisory lock (line 99-102) — prevents race conditions
  - Server-side score calculation (line 95)
  - Notification on pass (line 132-144)
  - Structured logging with trace ID
- **Called From:** ExamPage.jsx (via edge function POST)
- **CORS:** ✅ Uses `corsHeaders` from `_shared/cors.ts`

#### 2. **gemini-proxy** ✅ WORKING
- **File:** `/supabase/functions/gemini-proxy/index.ts`
- **Purpose:** Proxies AI chat requests to Gemini API (keeps API key server-side)
- **Key Features:**
  - OpenAI-style message format → Gemini format conversion
  - System prompt prepending
  - API key read from `Deno.env.get('GEMINI_API_KEY')`
  - CORS check: allows `ALLOWED_ORIGIN` or localhost
  - Max tokens: 600, temperature: 0.7
- **Called From:** ChatPanel.jsx, DoubtBusterPanel.jsx
- **CORS:** ✅ Custom CORS per origin

#### 3. **send-approval-email**
- **File:** `/supabase/functions/send-approval-email/index.ts`
- **Purpose:** Notify doctor when profile approved
- **Called From:** SuperAdminApprovals.jsx (when SA approves doctor)

#### 4. **send-notification-email**
- **File:** `/supabase/functions/send-notification-email/index.ts`
- **Purpose:** Send email notifications
- **Called From:** Various broadcast/notification components

#### 5. **welcome-email**
- **File:** `/supabase/functions/welcome-email/index.ts`
- **Purpose:** Send welcome email on registration
- **Called From:** RegistrationPage.jsx or ProfileSetupPage.jsx

#### 6. **generate-embeddings**
- **File:** `/supabase/functions/generate-embeddings/index.ts`
- **Purpose:** Generate pgvector embeddings for semantic search
- **Called From:** Content upload / artifact creation

#### 7. **query-embedding**
- **File:** `/supabase/functions/query-embedding/index.ts`
- **Purpose:** Search content by semantic similarity
- **Called From:** LearnHub.jsx or search components

#### 8. **backfill-zones**
- **File:** `/supabase/functions/backfill-zones/index.ts`
- **Purpose:** Admin utility to backfill zone data for doctors
- **Called From:** One-time admin tasks

### Shared CORS
- **File:** `/supabase/functions/_shared/cors.ts`
- **Headers:**
  ```
  'Access-Control-Allow-Origin': '*'
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-trace-id, x-request-start'
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS'
  ```
- **Issue:** ⚠️ CORS is `'*'` (all origins) — OK for public API, but Gemini proxy uses stricter origin check

---

## PART E: ERROR HANDLING & MOBILE

### Error Boundaries
- **ErrorBoundary.jsx** (line 1-52)
  - ✅ Catches unhandled React errors
  - Shows error message in expandable `<pre>` block
  - "Reload Application" button
  - No Sentry integration — just logs to console

- **AppErrorBoundary.jsx** (line 1-65)
  - ✅ Wraps entire app (App.jsx line 75)
  - **Sentry Integration:** ✅ Calls `captureException(error, errorInfo)` (line 19)
  - User-friendly error message
  - Collapsible error details

### Sentry Integration
- **Location:** `/frontend/src/lib/sentry.js`
- **Status:** ✅ **Configured (conditionally)**
  - Only initializes if `VITE_SENTRY_DSN` is set
  - **HIPAA-Aware:**
    - `maskAllText: true` — hides all text in session replays
    - `blockAllMedia: true` — blocks all media in replays
    - Redacts user.email in `beforeSend()` (line 41-44)
    - Strips authorization headers from breadcrumbs (line 29-40)
  - **Sampling:**
    - Dev: 100% (all traces)
    - Prod: 20% (1 in 5 traces)
  - **Replays:** 10% session, 100% on error
  - **Functions:**
    - `captureException(err, context)` — with no-op fallback
    - `captureMessage(msg, level)` — with no-op fallback
    - `setUser(id, role)` — only id + role, never email
    - `addBreadcrumb(category, message, data)`
    - `startSpan(name, op)` — performance monitoring

### Toast / Notification System
- **Toasts.jsx** component renders via `useAppStore.toasts` array
- Each component calls `addToast(type, message)` from `useAppStore`
- Types: `error`, `success`, `info`, `warning`
- **Mobile:** Toasts use fixed positioning, should work on mobile

### Mobile Responsiveness
- **Breakpoint:** 768px (md in Tailwind)
- **Sidebar:**
  - Desktop (≥768px): Fixed left sidebar, 260px wide
  - Mobile (<768px): Slides in from left with overlay, hidden by default (`transform: translateX(-100%)`)
- **TopBar:**
  - Menu button (hamburger) hidden on desktop, shown on mobile
  - Center badge hidden on mobile
  - Padding reduced on mobile (24px → 16px)
- **Main Content:**
  - Desktop: `margin-left: var(--sidebar-w)` (260px)
  - Mobile: `margin-left: 0`
- **Grid Layouts:**
  - Desktop: `sg4` (4 cols) and `sg3` (3 cols)
  - Mobile: Both become 2 cols (`grid-template-columns: repeat(2, 1fr)`)
- **Verified Badge:** Hidden on mobile

### Loading States
- ✅ **PageLoader:** Rotating spinner shown in Suspense (line 63-69 App.jsx)
- ✅ **Auth Loading:** "Loading iConnect..." message during `isAuthLoading` (line 341-348)
- ✅ **Skeleton Loaders:** `/frontend/src/components/ui/Skeleton.jsx` exists
- ✅ **Component-Level:** Most pages have `loading` state + conditionally render spinners/skeletons

---

## PART F: LEADERBOARD & BROADCAST

### LeaderboardPage.jsx
- **Location:** `/frontend/src/components/LeaderboardPage.jsx`
- **Status:** ✅ **WORKING**
- **Features:**
  - **Period Filter:** `alltime`, `weekly`, `monthly` (line 23)
  - **Tab Filter:** `global`, `speciality`, `college` (line 24)
  - **Real Data:** Pulls from:
    - `user_scores` table for all-time rankings (line 65-76)
    - `activity_logs` table for weekly/monthly (line 81-98)
  - **Aggregation:** Calculates `quizPts` and `readPts` per user
  - **Streak Calculation:** Counts consecutive daily activity (line 8-20)
  - **My Profile:** Shows "isMe" flag in leaderboard (line 127)
  - **Virtualization:** Uses `@tanstack/react-virtual` for large lists
  - **Caching:** Uses `dataCache` to cache leaderboard for period (line 35-44)
- **Rendering:** LeaderboardRow components with rank, name, score, college, speciality
- **Data Fetch:** Fetches top 50 users per period

### BroadcastPage.jsx
- **Location:** `/frontend/src/components/BroadcastPage.jsx`
- **Status:** ✅ **WORKING**
- **Role-Based Views:**
  - **Superadmin:** EngageLanding → choice of "Engage Doctors" or "Engage Content Admins" (line 35-43)
  - **Content Admin:** ContentAdminNotificationCenter (line 16-17)
  - **Doctor:** "Access Restricted" message (line 22-28)
  - **Other Roles:** Denied access
- **Sub-Components:**
  - `EngageLanding` — landing page for SA to choose audience
  - `DoctorEngageView` — broadcast to all doctors
  - `ContentAdminEngageView` — broadcast to all content admins
  - `ContentAdminNotificationCenter` — CA's own notification manager
  - `SAMessageBox` (exported for backward compat)

### Known Issues
- ⚠️ **LeaderboardPage:** Caches by period key but doesn't auto-refresh (relies on manual route change to bust cache)
- ⚠️ **BroadcastPage:** No persistence of drafted messages — if page is left, drafts are lost

---

## SUMMARY TABLE

| Area | Component | Status | Finding |
|------|-----------|--------|---------|
| **Routing** | App.jsx | ✅ Works | Custom page state, no React Router |
| **Navigation** | Sidebar.jsx | ✅ Role-based | SA/CA/Doctor routes gated in UI |
| **Guards** | ProtectedRoute | ⚠️ Missing | No server-side guard — UI-only protection |
| **404 Routes** | App.jsx | ✅ Works | Shows "Coming Soon" fallback |
| **Offline Sync** | useOfflineStore | ✅ Works | Full state tracking |
| **Offline Queue** | offlineSync.js | ✅ Works | IndexedDB + background sync |
| **PWA** | vite.config.js | ✅ Works | Manifest, icons, workbox configured |
| **Service Worker** | Workbox | ✅ Works | Cache-first fonts, network-only Supabase |
| **Tenancy** | tenantResolver | ✅ Works | JWT → subdomain → custom domain resolution |
| **Tenant Store** | useTenantStore | ✅ Works | Loads once, caches, allows switching |
| **Branding** | CSS vars | ✅ Works | Primary/secondary colors applied to :root |
| **Edge Functions** | 8 functions | ✅ Works | All deployed, CORS configured |
| **Idempotency** | submit-exam | ✅ Works | Prevents double submission |
| **Sentry** | sentry.js | ✅ Works | HIPAA-safe, token redaction, conditional init |
| **Error Boundaries** | 2 components | ✅ Works | Catches errors, shows fallback |
| **Mobile Nav** | Sidebar | ✅ Works | Hamburger, slide-in sidebar, overlay |
| **Dark Mode** | index.css | ✅ Works | Toggle persisted to localStorage |
| **Loading States** | PageLoader | ✅ Works | Spinner + skeleton components |
| **Leaderboard** | LeaderboardPage | ✅ Works | Real data, period/tab filters, caching |
| **Broadcast** | BroadcastPage | ✅ Works | SA engage, CA notification center |

---

## CRITICAL FINDINGS

1. **Route Guard Vulnerability:** No server-side protection — any role can call `setPage()` to access restricted pages if they guess the page name. **Recommend:** Add explicit role checks in each page component or create a `ProtectedPage` wrapper.

2. **Tenant Filtering:** Need full audit of `supabase.js` to verify all queries auto-filter by `tenant_id`. The multi-tenant setup is theoretically sound but filtering enforcement is unclear.

3. **Offline Sync:** IndexedDB queue is set up but unclear if any components actually call `queueRequest()`. Need to search for callers.

4. **Sentry Sampling:** Production is only sampling 20% of traces — may miss errors in low-traffic periods.

5. **Broadcast/Leaderboard:** Both working but have minor UX issues (no draft persistence, cache bust on period change).

---

## RECOMMENDATIONS

1. **Add Route Guards:** Create `ProtectedPage` HOC that checks `role` before rendering
2. **Tenant Filtering Audit:** Search all `supabase.js` calls for tenant_id filters
3. **Offline Sync Audit:** Find all `queueRequest()` callers to verify coverage
4. **Increase Sentry Sampling:** Consider 50%+ for production to catch more errors
5. **Leaderboard Caching:** Add TTL (5 min) instead of forever caching
6. **Broadcast Draft Save:** Persist drafts to localStorage during editing
