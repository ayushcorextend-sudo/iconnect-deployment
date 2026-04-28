# iConnect — Session Handoff
# ════════════════════════════════════════════════════════════════
# INSTRUCTIONS: Fill this out at the END of every session.
# Claude reads this at the START of every session.
# Be specific. Vague entries are useless.
# ════════════════════════════════════════════════════════════════

## Last Updated
2026-04-28 (v2) — WelcomeBanner upgraded with real ICON LIFE SCIENCES PNG assets (brain + doctor figures + 3 PNG icons in bubbles).

---

## 2026-04-28 (v2) — WelcomeBanner: real artwork swap

### What changed since v1
The v1 image-free build (CSS sphere + Lucide icons) didn't match the polished mockup. User dropped the 6 brand PNGs into `frontend/src/assets/welcome/` and we rebuilt.

**Files:**

1. **`frontend/src/assets/welcome/`** (NEW directory)
   - `Connected_Brain_Visual.png` — 34 KB (centerpiece, animated glow pulse)
   - `Doctor_Male_Profile.png` — 23 KB (left silhouette)
   - `Doctor_Female_Profile.png` — 24 KB (right silhouette)
   - `Microscope.png` — 22 KB (top-left bubble — Psychiatry)
   - `Knowledge_Book.png` — 25 KB (top-right bubble — Neurology)
   - `Tablet_Dashboard.png` — 30 KB (bottom-left bubble — Neurosurgery)
   - Note: a stray `Hero.jsx` got copied into this folder; harmless (nothing imports it) but couldn't `rm` from sandbox due to mount perms — user can delete manually if desired.

2. **`frontend/src/components/ui/WelcomeBanner.jsx`** (REWRITE)
   - Now mirrors the user-provided Hero.jsx structure exactly: orbit rings + brain `<img>` + doctor `<img>`s + 3 bubbles with PNG `<img>` icons + label pills.
   - Modal overlay wrapper retained (overlay backdrop, close X, Escape dismiss, body scroll lock).
   - localStorage gate retained (`iconnect_welcome_seen_v1`).
   - Animations: kept pure CSS keyframes — added `wb-brain-glow` (4.5s drop-shadow pulse on the brain) alongside `wb-bubble-float` and the entry transitions.
   - Description card uses the short mockup copy. The longer marketing copy from earlier was dropped to match the mockup faithfully.
   - Footer reverted to emoji icons (🎓 🌱 📊) per the mockup.

### Build status
- ✅ esbuild parse-check passes (151/151 braces)
- ✅ All 6 PNG paths confirmed present at `frontend/src/assets/welcome/*.png`
- ⚠️ Full Vite build not run in sandbox per the standing ARM64 rollup constraint — user runs `cd frontend && npm run build` locally

### Deploy
```bash
cd frontend && npm run dev   # to see it locally first
# or
cd frontend && npm run build && git add -A && git commit -m "feat(welcome): real ICON LIFE PNG assets" && git push
```

### Reset for re-test
To see the banner again after dismissing it:
```js
// in browser DevTools console
localStorage.removeItem('iconnect_welcome_seen_v1'); location.reload();
```

---

## 2026-04-28 — Post-Login Welcome Banner

### What shipped
First-login welcome modal that mirrors the ICON LIFE SCIENCES "Welcome to iCONNECT" splash. Shown once per device after a successful login (gated by localStorage), dismissed via "Start Learning" → routes to dashboard via the existing login flow.

**Files changed:**

1. **`frontend/src/components/ui/WelcomeBanner.jsx`** (NEW)
   - Self-contained welcome modal — overlay + card, dark navy gradient, orange iCONNECT wordmark.
   - Centerpiece is a CSS-radial-gradient "neural sphere" with pulsing animation + 7 synapse dots — image-free so it ships immediately. Real PNG asset can be swapped in later by replacing the `<div className="wb-sphere">` block.
   - 3 floating specialty bubbles use Lucide icons (Microscope=Psychiatry, BookOpen=Neurology, Stethoscope=Neurosurgery) with orange label pills.
   - Marketing copy from the user is woven into the description card + 3 mission rows beneath the scene (HeartPulse / Bell / GraduationCap headers).
   - Footer uses GraduationCap / Sprout / BarChart3 for Learn | Grow | Excel.
   - Animations are pure CSS keyframes (`wb-overlay-in`, `wb-card-in`, `wb-sphere-pulse`, `wb-bubble-float`, `wb-synapse`) injected via inline `<style>` — same pattern as PWAInstallBanner.
   - localStorage gate: `iconnect_welcome_seen_v1` (bumping the v# resets it for everyone).
   - Z-index uses `Z.loginBanner` (9999) from the existing zIndex scale.
   - Escape key + backdrop click both dismiss; body scroll locked while open.

2. **`frontend/src/App.jsx`**
   - +import `WelcomeBanner` (next to `PWAInstallBanner` at line ~34)
   - +`<WelcomeBanner />` mounted in the authed shell next to `<PWAInstallBanner />` at line ~759
   - No login callback changes — banner self-gates on localStorage so it Just Works after any successful auth flow (OTP, password, OAuth).

### Why no framer-motion
The README/handoff said "Framer Motion 12" is in the stack but it's NOT in `frontend/package.json`. PWAInstallBanner avoids it intentionally for the same reason. This banner follows that pattern — pure CSS keyframes, zero new dependencies.

### Build status
- ✅ `esbuild --loader:.jsx=jsx` parses both WelcomeBanner.jsx and App.jsx cleanly
- ✅ Brace balance 178/178 in WelcomeBanner.jsx
- ✅ All Lucide icons used (Microscope, BookOpen, Stethoscope, GraduationCap, Sprout, BarChart3, Bell, HeartPulse, X) exist in lucide-react@0.575.0
- ⚠️ Full Vite build not run in sandbox per the standing ARM64 rollup constraint — user should `cd frontend && npm run build` locally

### Deploy
```bash
cd frontend && npm run build && git add -A && git commit -m "feat: first-login WelcomeBanner — ICON LIFE SCIENCES splash" && git push
```

### To swap in real PNG assets later
The Hero.jsx the user uploaded references 6 PNGs (Microscope.png, Tablet_Dashboard.png, Doctor_Female_Profile.png, Doctor_Male_Profile.png, Connected_Brain_Visual.png, Knowledge_Book.png). To use them:
1. Drop them into `frontend/src/assets/welcome/`
2. In WelcomeBanner.jsx, replace the `<div className="wb-sphere">` block with `<img src={BrainVisual} ... />` (~line 360 area)
3. Optional: swap the Microscope/BookOpen/Stethoscope icon bubbles for `<img>` tags using the corresponding PNGs

### DO NOT TOUCH
- `iconnect_welcome_seen_v1` localStorage key — bump to `_v2` if/when the banner content changes meaningfully and you want existing users to see it again.

---

## 2026-04-17 — Registration/Profile Setup Flow Redesign

### What changed
User provided detailed spec for redesigning the Professional Details step of ProfileSetupPage.jsx with conditional field logic based on Program Type (MBBS/MD/MS), cascading super-specialization dropdowns, and academic timeline auto-calculation.

**Files changed:**

1. **`frontend/src/data/constants.js`**
   - Added `MBBS` to `SPECIALITIES` (empty array — no speciality for MBBS)
   - Removed `DM`, `MCh`, `DNB` from `SPECIALITIES` (moved to super-spec)
   - **NEW:** `SUPER_SPEC_OPTIONS` — maps MD → [DM, Fellowship], MS → [MCh, DNB]
   - **NEW:** `SUPER_SPECIALITIES` — speciality lists for DM, MCh, DNB
   - Updated `PROG_YEARS` — added MBBS: 5

2. **`frontend/src/components/ProfileSetupPage.jsx`** (FULL REWRITE)
   - **5-step flow:** Basic Info → Personal → Professional → Academic Timeline → Verification
   - **Step 1 (Basic Info):** Password setup only
   - **Step 2 (Personal):** Name, phone, DOB (optional), state, district, hometown, zone
   - **Step 3 (Professional):** Program Type dropdown (MBBS default)
     - MBBS: only college + place fields
     - MD/MS: speciality dropdown + college + place + optional super-spec toggle
     - Super-spec: DM/Fellowship (after MD) or MCh/DNB (after MS)
     - Fellowship: name, institution, duration
     - DM/MCh/DNB: speciality, college, place, year
   - **Step 4 (Timeline):** Year of joining → auto-calculated current year, passout year, access expiry. Profile summary card.
   - **Step 5 (Verification):** MCI/NMC, NEET rank, certificate upload, final summary

3. **`frontend/src/lib/supabase.js`** — `createProfileForOAuthUser` now persists:
   - `dob`, `super_spec_type`, `super_speciality`, `super_college`, `super_place`, `super_year`
   - `fellowship_name`, `fellowship_institution`, `fellowship_duration`
   - (DB columns already exist from migration `20260324000000_registration_professional_fields.sql`)

4. **`frontend/src/components/RegistrationPage.jsx`** — Fixed broken imports:
   - `DM_SPECIALITIES`, `MCH_SPECIALITIES`, `DNB_SPECIALITIES` now read from `SUPER_SPECIALITIES` instead of `SPECIALITIES` (since DM/MCh/DNB moved)

### Build status
- ✅ All exports verified (node ESM import test)
- ✅ Brace matching verified on all changed files
- ⚠️ Full Vite build cannot run in sandbox (ARM64 rollup mismatch) — user must build locally

### Deploy needed
```bash
cd frontend && npm run build && git add -A && git commit -m "feat: 5-step registration flow with conditional fields + super-spec cascading" && git push
```

### DO NOT TOUCH
- Migration `20260324000000_registration_professional_fields.sql` — already applied, columns exist
- `RegistrationPage.jsx` beyond the import fix — it has its own separate flow logic

---

## 2026-04-07 — Groq AI provider + BUG-NAV-002 + PWA install overhaul

### Groq Provider (gemini-proxy rewrite)
**File changed:** `supabase/functions/gemini-proxy/index.ts`
- Rewritten to be a **multi-provider AI proxy** with automatic fallback
- Provider chain: **Groq (primary)** → **Gemini (fallback)**
- Groq uses OpenAI-compatible API (`api.groq.com`), model `llama-3.3-70b-versatile`
- If `GROQ_API_KEY` is set → uses Groq first; on failure falls back to Gemini
- If only `GEMINI_API_KEY` is set → uses Gemini only (backwards compatible)
- If neither key is set → returns 503 with clear error
- Streaming SSE works for both providers (Groq uses OpenAI delta format, Gemini uses candidates format)
- **No frontend changes needed** — response shape `{ text, provider }` is backward compatible
- **Zero changes to aiService.js or ChatBot.jsx** — both send `{ system, messages }` and read `data.text`

**To activate Groq:**
```bash
npx supabase secrets set GROQ_API_KEY=<YOUR_GROQ_KEY>
npx supabase functions deploy gemini-proxy --no-verify-jwt
```

**To test:** Open any AI feature (ChatBot, Doubt Buster, Study Plan, etc.) — should respond much faster than Gemini since Groq has ~10x lower latency.

### BUG-NAV-002 FIXED — Deep-linking now works after login
- **Root cause:** `login()` callback in App.jsx hardcoded `setPage('dashboard')` + set `authBootedRef.current = true` which blocked the URL-aware auth effect
- **Fix:** Changed to `setPage(window.location.pathname.replace(/^\//, '') || 'dashboard')` — reads deep-link from URL bar
- **File:** `frontend/src/App.jsx` (login callback only)

### PWA Install System Rebuilt (BUG-V)
- **New:** `frontend/src/lib/pwaInstallManager.js` — global singleton captures `beforeinstallprompt` at module-load time
- **Rewritten:** `frontend/src/hooks/usePWAInstall.js` — backed by singleton, exposes iOS support
- **New:** `frontend/src/components/ui/PWAInstallBanner.jsx` — bottom-sheet with iOS guide
- **Modified:** TopBar.jsx (install button on both desktop + mobile), main.jsx (early import), App.jsx (banner wired), index.css (banner styles)

---

## Last Updated (previous)
2026-04-06 — ENTERPRISE-PWA: App Shell Model, BottomNav, offline, push/biometric scaffolds.

---

## 2026-04-06 — Enterprise-grade mobile PWA foundation

### What shipped this session
Goal: take the mobile experience from "responsive web-wrapper" to enterprise-grade PWA
(App Shell Model, Lighthouse-95+-ready, offline-first, 60fps feel, installable, future
push/biometric capability). User explicitly asked for a long-term asset, not a quick fix.

**New files:**
- `frontend/src/styles/mobile.css` — single source of truth for mobile. Safe-area vars
  (`--safe-top/right/bottom/left`), fluid type scale (`--fs-xs` … `--fs-2xl` via
  `clamp()`), bottom-nav height vars, 48px tap-target minimums, iOS input zoom fix
  (`font-size: 16px !important` on mobile inputs), `overscroll-behavior-y: none`,
  `.chatbot-drawer` bottom-sheet layout at ≤768px, `.ca-dashboard-layout`/
  `.ca-dashboard-sidebar` horizontal-scroll tab row mobile variant, `.pdf-notes-panel-mobile`
  full-screen override, `.bottom-nav` frosted-glass (`backdrop-filter: saturate(180%) blur(20px)`),
  `@media (display-mode: standalone)` rules, `@media (prefers-reduced-motion: reduce)` guards.
- `frontend/src/hooks/useIsMobile.js` — SSR-safe `matchMedia` hook + `useIsStandalone`
  for detecting installed-PWA mode.
- `frontend/src/components/ui/DashboardSkeleton.jsx` — skeleton matching dashboard
  visual footprint for perceived-performance loads.
- `frontend/src/components/ui/BottomNav.jsx` — memoized role-aware bottom tab bar
  (5 items for doctor / contentadmin / superadmin). Items map to existing Zustand
  `page` keys. Doctor's AI tab calls `onOpenAI` (setChatBotMode('chat')) instead of
  navigating. `navigator.vibrate(8)` for haptics on supported devices. Badges wired
  to `unreadCount` / `pendingCount` via `badgeKey`.
- `frontend/src/lib/pushNotifications.js` — Web Push client helper (stub). Exports
  `isPushSupported`, `getPushPermission`, `subscribeToPush`, `unsubscribeFromPush`,
  `hasActiveSubscription`. Uses `VITE_VAPID_PUBLIC_KEY`. Header docs enumerate the
  server-side TODOs (VAPID keygen, Supabase secrets, `push_subscriptions` migration,
  `push-subscribe` / `push-send` edge functions, SW push event handler).
- `frontend/src/lib/biometric.js` — WebAuthn client helper (stub). Exports
  `isBiometricSupported`, `hasPlatformAuthenticator`, `registerBiometric`,
  `authenticateWithBiometric`. Uses `navigator.credentials.create/get` with
  `authenticatorAttachment: 'platform'`, `userVerification: 'required'`. Header docs
  enumerate server-side TODOs (`webauthn_credentials` migration, `webauthn-challenge`
  and `webauthn-verify` edge functions using `@simplewebauthn/server`, `VITE_RP_ID`).
- `frontend/public/offline.html` — branded offline page with gradient background,
  animated logo, status pill, auto-reload on `online` event, `prefers-color-scheme`
  dark mode, safe-area aware. Replaces generic browser "No internet" screen.

**Files modified:**
- `frontend/vite.config.js` — comprehensive PWA upgrade:
  - Manifest: `display_override: ['window-controls-overlay','standalone','minimal-ui']`,
    `id: '/'`, `start_url: '/?source=pwa'`, `lang: 'en-IN'`, `orientation: 'portrait-primary'`,
    `categories: ['education','medical','productivity']`, icons split into `any` +
    `maskable` purposes, `shortcuts` (Dashboard, E-Books, Exams, Ask AI), `share_target`
    (`/?share=1`), `screenshots`.
  - Workbox: `skipWaiting`, `clientsClaim`, `cleanupOutdatedCaches`, `navigateFallback: 'index.html'`,
    `navigateFallbackDenylist` (API/auth paths excluded), `maximumFileSizeToCacheInBytes: 5MB`.
  - Runtime caching:
    - `fonts.googleapis.com` → StaleWhileRevalidate
    - `fonts.gstatic.com` → CacheFirst 1 year
    - `supabase.co/storage/` → CacheFirst 7 days (signed URLs immutable per lifetime)
    - `supabase.co/rest/v1/activity_logs` → NetworkOnly + BackgroundSync (offline
      retry via `activity-sync` queue)
    - `supabase.co/auth/` → NetworkOnly (security)
    - `supabase.co/functions/` → NetworkOnly
    - `supabase.co/rest/v1/*` → **NetworkFirst** (4s timeout, 10-min cache) — chosen
      over SWR to avoid cross-user RLS data leakage
    - Images → StaleWhileRevalidate 30 days
- `frontend/index.html` —
  - `viewport` gets `maximum-scale=1.0, user-scalable=no, viewport-fit=cover`
  - Dual `theme-color` (light/dark media queries), `color-scheme: light dark`,
    `format-detection: telephone=no`
  - Multiple apple-touch-icon sizes
  - Preconnect to `fonts.googleapis.com` and `fonts.gstatic.com`
  - **App Shell Splash**: inline `#app-shell-splash` with `.as-logo` (gradient "i"),
    `.as-title`, `.as-sub`, `.as-spinner`, animated via inline CSS. Paints BEFORE
    React boots. Inline script listens for `app-ready` CustomEvent to fade+remove;
    8-second failsafe so nobody gets stranded.
- `frontend/src/main.jsx` — dispatches `app-ready` CustomEvent via double
  `requestAnimationFrame` after `createRoot().render()` so the splash fades out
  once React has painted its first frame.
- `frontend/src/index.css` — `@import './styles/mobile.css'` added after theme.css.
  `.login-card` width changed from `420px` to `min(420px, 92vw)` + `max-width: 420px`
  so it never overflows narrow viewports.
- `frontend/src/App.jsx` — imports `BottomNav` + `useIsMobile`. `const isMobile =
  useIsMobile(768)`. `<BottomNav role page setPage unreadCount pendingCount onOpenAI />`
  conditionally rendered inside the shell when `isMobile` is true. AI tap calls
  `setChatBotMode('chat')`.
- `frontend/src/components/ContentAdminDashboard.jsx` — added `className="ca-dashboard-layout"`
  and `className="ca-dashboard-sidebar"` to the flex layout/sidebar at lines 128/131
  so mobile.css can reflow to a vertical stack with horizontal scroll tabs at ≤768px
  (inline `display: flex` and `width: 200` kept for desktop; mobile class overrides).
- `frontend/src/components/ebooks/PDFReaderView.jsx` — added `className="pdf-notes-panel-mobile"`
  to the notes side-panel so mobile.css makes it full-viewport on ≤768px (still
  320px fixed on desktop via inline styles).
- `frontend/src/components/ChatBot.jsx` — swipe-to-dismiss gesture. Added `drawerRef`,
  `dragStateRef`. `onTouchStart/Move/End/Cancel` on the chat header only engage
  when `innerWidth <= 768`. Drags apply `transform: translateY(Δy)` live; release
  past 120px (or 25% of viewport) triggers `setOpen(false)`. `chatbot-dragging` class
  disables transition during drag.

### Build status
✅ **Verified via `npx vite build --outDir /sessions/epic-awesome-turing/dist-verify --emptyOutDir`:**
`✓ 2286 modules transformed · built in 7.05s · 59 precache entries (1532.67 KiB) · sw.js + workbox-*.js generated`
The in-tree `dist/` cannot be replaced from this sandbox (permission-denied on old
chunk unlinks) — user should run `rm -rf frontend/dist && npm run build` locally
before deploying. The transform itself is clean.

### Current state
- ✅ **CLIENT-SIDE PWA IS COMPLETE** and enterprise-grade.
- ⚠️ **Push + Biometric are CLIENT-SIDE STUBS** — fully scaffolded but require
  backend work to be functional (see Tier-2/3 below).

### Tier-2 follow-ups (backend work required — NOT landed this session)
**Push Notifications:**
1. Generate VAPID keys: `npx web-push generate-vapid-keys`
2. Set Supabase secrets: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`
3. Set frontend env: `VITE_VAPID_PUBLIC_KEY` (same public value) in `.env.local`
4. Create migration `supabase/migrations/YYYYMMDDHHMMSS_push_subscriptions.sql`:
   `user_id uuid refs auth.users`, `endpoint text`, `p256dh text`, `auth text`,
   `created_at timestamptz`, RLS: user can only read/write own rows.
5. Edge functions: `push-subscribe` (upsert subscription), `push-unsubscribe`,
   `push-send` (use `web-push` npm lib from edge function or Node worker).
6. Workbox is `generateSW` mode — to add a `push` event handler, either switch to
   `injectManifest` with a custom `src/sw.js`, OR use the in-app `showNotification`
   API after `self.registration` is available. The handler template is in
   `pushNotifications.js` header comments for copy-paste.

**Biometric (WebAuthn):**
1. Create migration `supabase/migrations/YYYYMMDDHHMMSS_webauthn_credentials.sql`
   with the schema documented in `biometric.js` header (id, user_id, credential_id,
   public_key, counter, transports, device_name, created_at, last_used_at + RLS).
2. Edge functions: `webauthn-challenge` (random challenge + RP info), `webauthn-verify`
   (uses `@simplewebauthn/server` to verify attestation + assertion, returns Supabase
   JWT to set session).
3. Frontend env: `VITE_RP_ID` = production domain (e.g. `iconnect-med.vercel.app`).
4. Wire a "Sign in with Face ID / Touch ID" button into `LoginPage` that calls
   `authenticateWithBiometric()` when a credential exists for the entered email.
5. Post-login in `AuthContext`: offer `registerBiometric()` as a progressive
   enhancement after first successful password login.

### Tier-3 polish opportunities (future)
- Skeleton screens wired into each dashboard page's Suspense fallback (scaffold is
  `DashboardSkeleton.jsx`)
- PWA screenshot assets (currently reuses icon-512.png as placeholder screenshot)
- iOS splash screens (apple-touch-startup-image) at all device sizes
- Lighthouse CI in GitHub Actions to enforce 95+ PWA score on PRs
- Web Share Target handler: `/?share=1` currently just opens home — wire it to
  a "Save to notes" flow for doctors receiving shared articles.

### Files NOT touched this session (by design)
- `supabase/migrations/*` — no DB changes landed
- `supabase/functions/*` — no new edge functions landed
- `frontend/src/components/Sidebar.jsx` — stays as the desktop/≥768px nav
- All `.bak` files
- Any store — state model unchanged

---

## Current State
✅ **NAV-FIX: Dual-content rendering bug on /arena-student FIXED — needs deploy.**
✅ **PWA install system REBUILT — needs deploy.**
✅ **BUG-NAV-002 FIXED — deep-linking now works after login.**

### NAV-FIX: Stale Page Content (this session)
- **Symptom:** Navigating to `/arena-student` showed BOTH LearnHub content (Mock Tests tabs, quiz cards) AND LiveArenaStudent (Join Arena PIN form) stacked together. TopBar and Sidebar correctly showed "Live Arena".
- **Investigation:** Exhaustively read App.jsx, LiveArenaStudent.jsx, LearnHub.jsx, DoctorDashboard.jsx, OnboardingBanner.jsx, useAppStore.js, Sidebar.jsx, constants.js, PageErrorBoundary.jsx. Checked git history (30+ commits). Built and verified chunk separation. All individual pieces are logically correct — the `switch` cases are clean, components don't cross-import, sidebar has no duplicates.
- **Root cause:** React 19 concurrent rendering + Suspense lazy-loading race condition. The `key={page}` approach (attempted 3 times in commits e5faf0d, 3e0706a, be22033) was insufficient — React's Fiber reconciler can briefly show stale Suspense-resolved content during page transitions when both the old and new lazy chunks are cached.
- **Fix — 3 files changed:**
  1. **`frontend/src/App.jsx`** — Triple-layer defense:
     - `PageGuard` component: runtime validation that Zustand page state matches the expected page, returns null if mismatched
     - Composite `pageKey` (`page::counter`) using monotonic ref counter, preventing React from ever reusing stale Fiber nodes
     - Both `PageErrorBoundary` and `Suspense` now keyed with `pageKey` (was just `page` on ErrorBoundary)
  2. **`frontend/src/stores/useAppStore.js`** — `setPage` now skips no-op navigations (`if (page === get().page) return`) to prevent redundant re-renders from double setPage calls (initRouter + auth loadProfile)
  3. **`frontend/src/components/arena/LiveArenaStudent.jsx`** — Join form wrapped in `<div className="page">` for consistent layout (was bare `<div>`)
- **Build:** ✅ passes (56 precache entries, chunks properly separated)
- **Deploy needed:** Push to main → Vercel auto-deploys

### BUG-NAV-002 FIX (this session)
- **Root cause:** The `login()` callback in App.jsx (line 369) hardcoded `setPage('dashboard')` after every login. When a user visited `/ebooks` → saw Login → logged in, the URL bar still showed `/ebooks` (React conditional render, no redirect) but the callback always went to dashboard.
- **Secondary cause:** `login()` set `authBootedRef.current = true` before the auth effect could run, so the auth effect's URL-aware `setPage(urlPage)` logic (line 279-280) was permanently blocked for that session.
- **Fix:** Replaced `setPage('dashboard')` with `setPage(window.location.pathname.replace(/^\//, '') || 'dashboard')` — reads the deep-link from the URL bar, same pattern as the auth effect.
- **File changed:** `frontend/src/App.jsx` — `login()` callback only
- **Edge cases handled:** Role guard in `renderPage()` still redirects to dashboard if the deep-link page isn't allowed for the user's role.
- **Build:** ✅ passes

### PWA Install Overhaul (this session) — BUG-V RESOLVED
6 files changed/created:

1. **`frontend/src/lib/pwaInstallManager.js`** (NEW) — Global singleton captures `beforeinstallprompt` at module-load time (before React mounts). Previously event was lost if fired during auth loading. Pub/sub pattern lets multiple components share one event.

2. **`frontend/src/hooks/usePWAInstall.js`** (REWRITTEN) — Now backed by singleton instead of independent `addEventListener`. Exposes `isIOS`, `showIOSGuide` for iOS Safari support. Multiple components safely share state.

3. **`frontend/src/components/ui/PWAInstallBanner.jsx`** (NEW) — Bottom-sheet install banner, slides up 3s after load. Android/Chrome: native install prompt button. iOS Safari: step-by-step Add to Home Screen guide. Dismisses for 7 days on close. CSS animation (no framer-motion dependency).

4. **`frontend/src/components/TopBar.jsx`** — Install button now shows on BOTH desktop and mobile (was `isMobile` only). Added `showIOSGuide` from hook.

5. **`frontend/src/main.jsx`** — Imports `pwaInstallManager` as first module so event listener registers before React.

6. **`frontend/src/index.css`** — Added PWA banner styles: slide-up animation, iOS guide steps, responsive mobile layout, dark mode support.

7. **`frontend/src/App.jsx`** — Wired `<PWAInstallBanner />` into app shell alongside `<OfflineIndicator />`.

- **Build:** ✅ passes (2281 modules, 56 precache entries)
- **Note:** Old `dist/` folder has permission lock — user must `rm -rf frontend/dist` before local rebuild, or Vercel handles it automatically.

✅ **AI stack REWRITTEN — needs deploy + test.**

### AI REWRITE (this session) — FAANG-Level Upgrade
All 4 AI files rewritten from scratch:

1. **`supabase/functions/_shared/cors.ts`** — Origin allowlist (was `*` wildcard). Now only `iconnect-med.vercel.app` + localhost accepted. Legacy `corsHeaders` export kept for backward compat.

2. **`supabase/functions/ai-orchestrator/index.ts`** — Full rewrite:
   - Circuit breaker: tracks failures per provider, auto-skips after 3 failures in 60s
   - Streaming SSE: `stream: true` in request body → token-by-token delivery
   - Request tracing: `x-trace-id` header propagated through full chain
   - Input validation: max_tokens clamped 1–2048, prompts capped at 12k chars
   - Structured JSON logging with timestamps, trace IDs, latency
   - Origin-specific CORS (no more wildcard)
   - Provider name returned in response (`{ data, provider }`)
   - Proper 429 with `Retry-After` header

3. **`supabase/functions/gemini-proxy/index.ts`** — Rewrite:
   - Streaming SSE support
   - Input validation (50 message limit, 4k chars per message)
   - Structured logging, request tracing
   - Origin-specific CORS
   - Timeout handling (504 vs 502 distinction)

4. **`frontend/src/lib/aiService.js`** — Rewrite:
   - Removed dead `USE_EDGE_FUNCTION` flag and direct Gemini client code
   - Added `readSSEStream()` for streaming token consumption
   - `callOrchestrator()` supports `{ stream, onToken }` options
   - Request tracing via `x-trace-id`
   - Client-side prompt truncation matching server limits
   - Human-friendly error messages for rate limit and auth expiry
   - Consistent `parseAiJson()` used by ALL structured response functions
   - All 15 exported functions preserved with identical signatures

- **Build:** ✅ passes (verified)
- **Deploy needed:** Both edge functions must be redeployed:
  ```
  npx supabase functions deploy ai-orchestrator --no-verify-jwt
  npx supabase functions deploy gemini-proxy --no-verify-jwt
  ```
- **GEMINI_API_KEY:** Already set as Supabase secret ✅
- **Backward compatible:** All 10 consumer components import unchanged function signatures

✅ **P0 navigation bug FIXED and built. Needs deploy.**

### BUG-NAV-001 FIX (this session)
- **Root cause confirmed:** `syncFromLocation` was running on EVERY `location.pathname` change, including programmatic `navigate()` calls (PUSH events). When `setPage('ebooks')` called `navigate('/ebooks')`, React could render with `page='ebooks'` but `location.pathname='/'` (old URL still in closure). `syncFromLocation('/')` then RESET page back to 'dashboard', causing the one-page-behind bug.
- **Fix 1 — App.jsx:** Only call `syncFromLocation` when `navigationType === 'POP'` (browser back/forward + direct URL load). Programmatic PUSH/REPLACE navigations skip it entirely.
- **Fix 2 — useAppStore.js:** Added `if (page === get().page) return;` guard in `syncFromLocation` to prevent redundant re-renders.
- **Files changed:** `frontend/src/App.jsx` (import useNavigationType, guard effect), `frontend/src/stores/useAppStore.js` (no-op guard)
- **Build:** ✅ passes

### ⚠️ STILL OPEN: BUG-NAV-002 (deep-link fails — loads Dashboard instead of target page)
This is a separate bug. `initRouter` sets page from URL on mount, but the auth effect calls `setPage(urlPage)` which may navigate away. Needs investigation after BUG-NAV-001 is confirmed fixed in production.

### ⚠️ STILL OPEN: BUG-AUTH-001 (admin buttons visible on public login page)
Low-risk security cosmetic issue. Not blocking.

---

✅ **ARCHITECTURAL SURGERY COMPLETE. All 4 phases deployed to Vercel (commit 1975334).**

### Surgery Summary
- **Phase 1 (Security):** dbService.js service layer, NVIDIA key moved to edge function, auth hardening, cache leak killed, sendBeacon fixed
- **Phase 2 (Data Integrity):** Zod schema layer (8 schema files), idempotency constraints, question schema unified, phantom offline registration blocked
- **Phase 3 (State Management):** BUG-O (navigate out of Zustand), BUG-N (useCallback memoization), BUG-P (toast timer tracking), BUG-A (page whitelist), BUG-H (notification dedup), BUG-I (user truncation removed), BUG-L (timer inflation fixed), BUG-S (parseAiJson helper)
- **Phase 4 (UI/UX/PWA):** theme.css CSS custom properties, BUG-X (quiz schema mismatch fixed), BUG-M (kahoot redirect), BUG-U (dead admin tab removed)

### ⏳ Pending Manual Actions (Ayush must do these)

1. **[URGENT] Rotate NVIDIA API key** — was previously in browser bundle
   - `npx supabase secrets set NVIDIA_API_KEY=<new-key>`
   - Then flip `USE_EDGE_FUNCTION = true` in `frontend/src/lib/aiService.js`

2. **Set OTP rate limits** in Supabase dashboard Auth settings
   - 5 OTP emails per hour per address

3. **Dark mode audit (BUG-W)** — 1,591 hardcoded hex colors in inline styles
   - Walk each screen in dark mode
   - Report which screens look broken
   - Claude will replace hex values with CSS vars from theme.css

4. **PWA install test (BUG-V)** — open deployed URL in Chrome on Android, verify install prompt fires

### ✅ Previous Critical Stability Fixes Still Apply
- **AUTH-001:** Auth effect no longer re-fires setPage('dashboard') on token refresh (authBootedRef guard)
- **AUTH-002:** Login page no longer flickers — spinner shown while session exists but role unresolved
- **UX-001:** beforeunload "Leave site?" popup removed from all pages except active exams
- **DASH-002:** DoctorDashboard shows spinner when userId not yet available (prevents crash)
- Error states + retry UI: MyPerformancePage, SmartNotesPanel — complete
- Empty catch blocks: 54 blocks across 21 files — complete
- Duplicate page headers removed: ExamPage, NotificationsPage, EBooksPage, LeaderboardPage — complete
- Duplicate search bar removed: LibraryFilterBar (kept SemanticSearch as sole search) — complete
- **Dark mode pass 1:** NotificationsPage + ProfilePage (~25 hardcoded hex → CSS vars)
- **Dark mode pass 2:** Remaining rgba() fixes — typeBg, ROLE_LABELS bg, incomplete banner, completion badges, "Not provided" text (#92400E → #F59E0B)
- `.ni-t` class in index.css now has `color: var(--text)` for dark mode
- NA-003 + NA-013: Already complete from prior session (popLayout, 0.18/0.1s, 9-query Promise.all, SWR cache)
- `supabase db push` — ✅ DONE (migration 20260326032952 applied to prod)
- Mega fix pass (this session): PROF-001 (authData undefined bug fixed), PROF-003 (name/phone validation), USER-001 (Suspend/Activate bulk action + suspended filter), DASH-001 (profiles query capped at 1000 rows), dark mode UserManagement (~15 hardcoded colors → CSS vars + rgba)
- **Ready for: NA-009 (initial query reduction) or NA-014 (auth.getUser() cleanup)**

---

## What Changed This Session — Error Handling + UI Sprint

### FIX 8: Dark Mode Contrast — NotificationsPage.jsx
- Replaced ~12 hardcoded hex colors (#F9FAFB, #F3F4F6, #E5E7EB, #D1D5DB, #6B7280, #9CA3AF, #374151) with CSS variables (var(--surf), var(--border), var(--muted), var(--light), var(--text))
- Notification card backgrounds, borders, body text, mark-read button, date group labels all now respect dark theme

### FIX 9: Dark Mode Contrast — ProfilePage.jsx
- Replaced ~13 hardcoded hex colors with CSS variables
- Personal info rows: label color → var(--muted), value color → var(--text), dividers → var(--border)
- Academic info rows: same treatment
- Verification steps: done color → #60A5FA (visible on dark), pending → #F59E0B, default → var(--muted)
- Stats cards: background → var(--surf), value → #60A5FA, label → var(--muted)
- Completion badges: subject text → #60A5FA, date → var(--muted)
- Read-only email input: bg → var(--surf), color → var(--muted)
- Loading spinner border: → var(--border)

### FIX 10: .ni-t CSS class — index.css
- Added `color: var(--text)` to `.ni-t` (notification title) — was inheriting from parent with no explicit color

### FIX (earlier): Duplicate Page Headers Removed
- ExamPage.jsx: removed .ph block, kept subtitle as standalone .ps
- NotificationsPage.jsx: removed .ph-row, kept "unread" count + "Mark all read" button
- EBooksPage.jsx: removed .ph-row with title, kept document count + view toggle
- LeaderboardPage.jsx: removed .ph-row, kept subtitle + period tabs

### FIX (earlier): Duplicate Search Bar — LibraryFilterBar.jsx
- Removed "Search by title" text input (SemanticSearch is the primary search)

---

## What Changed Previous Session — Error Handling Sprint

### FIX 5: Error State + Retry UI — MyPerformancePage.jsx
- Added `loadError` + `retryKey` state variables
- Catch block now sets `loadError` message
- Renders error banner with retry button (increments retryKey to re-trigger useEffect)
- useEffect dependency array now includes `retryKey`

### FIX 6: Error State + Retry UI — SmartNotesPanel.jsx
- Added `loadError` state
- fetchNotes: now checks Supabase `error` response, throws if present, sets `loadError`
- handleSave: catch now sets `draft.error` for inline error display
- handleDelete: catch now logs warning
- Notes list renders error banner with retry button between loading and empty states

### FIX 7: Empty Catch Block Remediation (54 blocks across 21 files)
All `catch (_) {}` blocks replaced with `catch (e) { console.warn('Context:', e.message); }`:
- ProfilePage.jsx (2), ReportsPage.jsx (3), UsersPage.jsx (2)
- supabase.js (6 — signOut kept as safe-to-ignore comment)
- DoctorEngageView.jsx (1), ChatBot.jsx (1), App.jsx (7)
- LearnHub.jsx (1), SADashboard.jsx (3), ConferencesPage.jsx (1)
- ReadingQuizModal.jsx (1), MCIVerificationQueue.jsx (1), EBooksPage.jsx (4)
- DiaryPanel.jsx (1), PersonaBuilder.jsx (1), WebinarLeaderboardRow.jsx (1)
- ManageAdminsTab.jsx (1), ArtifactsTab.jsx (2), WebinarCalendarTab.jsx (1)
- AIInsightsTab.jsx (1), DoctorDashboard.jsx (3)

### Migration: Patch triggers + missing columns
**New file:** `supabase/migrations/20260326032952_patch_missing_triggers_and_columns.sql`
- Creates shared `set_updated_at()` trigger function
- Attaches BEFORE UPDATE trigger to all 6 tables from the previous migration
- Adds: `study_hours`, `goals_met` to calendar_diary; `weekly_target_mins` to user_study_persona; `updated_at` to clinical_logs and idempotency_keys
- Includes commented-out DOWN migration

---

## What Changed Previous Session — Performance Sprint

### FIX 1: App.jsx — Killed re-render hell (BIGGEST IMPACT)
**Modified:** `frontend/src/App.jsx`
- Replaced `useAppStore(useShallow(s => s))` (subscribed to ENTIRE store) with 14 individual granular selectors
- Same for `useAuthStore(useShallow(s => s))` → 16 individual selectors
- Same for `useChatStore(useShallow(s => s))` → 2 selectors
- Same for `useTenantStore(useShallow(s => s))` → 3 selectors
- Removed `useShallow` import entirely
- Added `useMemo` for `sharedProps` object (was recreated every render, triggering all children)
- Added `useCallback` for `openChatBotDoubt` (was inline lambda)
- **Impact:** Before: ANY store change → full MainApp tree re-renders (Sidebar, TopBar, page, ChatBot, Toasts all re-paint). After: only the specific state consumers re-render.

### FIX 2: Query Waterfall Elimination
**Modified:** `frontend/src/components/MyPerformancePage.jsx`
- Converted 3 sequential `await` queries (profiles → scores → logs) into single `Promise.all([...])` — 3 network round-trips → 1

**Modified:** `frontend/src/components/ActivityPage.jsx`
- Merged secondary waterfall `Promise.all([quizLogsRes, readLogsRes])` (lines 185-188) INTO the initial Promise.all batch
- Pre-computed `mondayISO` before the batch (it only depends on `new Date()`, not query results)
- Eliminated duplicate `now`/`monday` computation
- **Impact:** ActivityPage: 5+2 queries in 2 batches → 6 queries in 1 batch. MyPerformancePage: 3 sequential → 3 parallel.

### FIX 3: React.memo on 7 Dashboard Child Components
**Modified (all wrapped in `React.memo`):**
- `frontend/src/components/dashboard/ForYouWidget.jsx`
- `frontend/src/components/dashboard/MyActivitySection.jsx`
- `frontend/src/components/dashboard/LatestAlerts.jsx`
- `frontend/src/components/dashboard/LatestContentSection.jsx`
- `frontend/src/components/dashboard/CalendarGoalRow.jsx`
- `frontend/src/components/dashboard/WebinarLeaderboardRow.jsx`
- `frontend/src/components/dashboard/ReadingBookmarksRow.jsx`
- `frontend/src/components/dashboard/StudyPlanCard.jsx`
- **Impact:** When DoctorDashboard re-renders (e.g., diaryCache update), children with unchanged props skip re-render entirely.

### FIX 4: Memoized Callbacks in DoctorDashboard
**Modified:** `frontend/src/components/DoctorDashboard.jsx`
- Replaced inline `refreshDashboard={() => {...}}` lambda with `useCallback`
- Added `stableBookmarkToggle` via `useCallback`
- **Impact:** CalendarGoalRow and LatestContentSection no longer receive new function references every render, making their React.memo effective.

### Previously Applied (by earlier Sonnet sessions)
- PageTransition.jsx: already optimized (mode="popLayout", 180ms/100ms durations)
- GoalRing.jsx: already responsive SVG + DB persistence + Tailwind conversion
- DoctorDashboard.jsx: already uses userIdProp (no auth.getUser call), has stale-while-revalidate cache, diary sync via Zustand

---

## Decisions Made
- **Granular selectors over useShallow:** `useShallow(s => s)` is semantically "subscribe to everything" even though it shallow-compares. Individual selectors are more explicit and each only triggers on their specific slice.
- **React.memo without custom comparator:** Sufficient because we memoized the callback props. Deep equality comparators add complexity with diminishing returns.
- **Did NOT create new Zustand stores:** All optimizations used existing stores as per CLAUDE.md rules.
- **Did NOT refactor supabase.js:** Query consolidation was done at the component level to minimize blast radius.

---

## DO NOT TOUCH
- `.bak` files — backup files, read-only
- `.agent/MASTER_AUDIT_AND_BLUEPRINT.md` — preserved as-is per user instruction
- `.agent/MASTER_BLUEPRINT_COMPLETE.md` — reference document
- `.agent/MASTER_EXECUTION_PROMPT.md` — Phase 1-6 complete, archived

---

## Previous Session (NA-029 + NA-030)

### NA-029 — Fix Activity Page UI Redundancy & KPI Aggregation ✅
**Modified:** `frontend/src/components/ActivityPage.jsx`
- Removed `.ph` header block ("My Activity" title + subtitle) — duplicate of TopBar title
- Added 3 new state vars (`activeDays`, `booksRead`, `quizzesDone`) set from fresh logsRes data — eliminates stale-cache drift where KPIs diverged from heatmap
- logsRes query now selects `activity_type, reference_id` in addition to `created_at, duration_minutes`
- `activeDays`: unique ISO dates in the 90-day map (Object.keys count) — matches heatmap exactly
- `booksRead`: distinct `reference_id` values for `article_read` events — no more row-count inflation
- `quizzesDone`: distinct `reference_id` values for `quiz*` events — no more row-count inflation
- KPI cards show `0` instead of `'—'` for zero values
- Cache structure updated to store/restore the 3 new KPI fields
- Removed the 3 stale render-time derived const lines

### NA-030 — 90-Day Heatmap UI Polish & Alignment ✅
**Modified:** `frontend/src/components/Activity/ActivityHeatmapClickable.jsx`
- Heatmap now centers inside its card: outer `textAlign: center` + inner `display: inline-block` wrapper eliminates dead space on wider screens
- Diary dots: enlarged 4→6px, repositioned from bottom-right corner to centered (`top: 50%, left: 50%, transform: translate(-50%,-50%)`), white border ring + indigo outline shadow for visibility on both light and dark cell backgrounds
- Legend diary dot updated with matching `border: 1.5px solid #4338CA`

---

## What Changed This Session (NA-027)

### NA-027 — Centralized Notes Architecture (Hidden Release) ✅
**New file:** `frontend/src/lib/supabase/notes.js`
- Domain-scoped DB module for all notes operations
- Pure helper: `buildHierarchy(notes)` — groups flat notes into `[{ subject, books: [{ artifactId, title, notes }] }]`
- All 8 DB functions: getUserNotesHierarchy, getSmartNotesHierarchy, getUserNoteById, createNote, updateNote, deleteNote, toggleSmartNoteStar, deleteSmartNote

**New file:** `frontend/src/pages/Notes.jsx`
- Three-level hierarchy: Subject cards → Book cards → Notes list
- URL deep-links: `?tab=my|ai`, `?subject=X`, `?book=artifactId`, `?id=noteId`
- `?id=noteId` auto-resolves subject+book then scrolls to the highlighted note
- Inline note editing (click Edit → textarea → Save/Cancel)
- New Note composer at Subject level (book selector + textarea)
- Search bar at Book level (filters note content + highlights)
- AI notes: star/unstar, delete
- Back button + breadcrumb for navigation

**Modified:** `frontend/src/App.jsx`
- Lazy import changed from `./components/NotesPage` to `./pages/Notes`

**Modified:** `frontend/src/components/Sidebar.jsx`
- Removed `{ k: 'notes', l: 'My Notes' }` from drMore
- Removed `StickyNote` icon import and iconMap entry
- Zero visible nav links to Notes — strictly hidden release

---

## What Changed This Session (NA-025 + NA-026)

### NA-025 — Weekly Progress Analytics ✅
**Modified:** `frontend/src/components/ActivityPage.jsx`
- Added imports: `wowVariance, peakFocusTime, weeklyBuckets, trendColor, trendArrow` from `analytics.js`
- Added state: `wowInsight`, `peakTime`
- In `loadAll()`: calls `weeklyBuckets(logs90, 4)` to compute WoW activity count; calls `peakFocusTime(logs90)` for peak hour
- Weekly Progress card header: shows WoW % badge (green/red pill) when direction is not flat
- Below "Total this week": added "Peak focus time" row with hour label + % of activity

### NA-026 — My Performance Analytics Insights ✅
**Modified:** `frontend/src/components/MyPerformancePage.jsx`
- Added imports: all analytics.js exports
- Added state: `wowCountInsight`, `wowMinsInsight`, `momCountInsight`, `peakTime`, `maData`
- 4-week trend computation now uses `weeklyBuckets(logs, 4)` via analytics.js
- WoW count + mins, MoM count (8-week proxy), peak focus, 3-pt moving average all computed
- 4-week trend bars: replaced `+N vs prev` raw delta with `trendBadge(wowVariance(count, prevCount))` + `trendColor()` inline
- NEW "Analytics Insights" card (after trend, before calendar): 4 insight panels — Activity WoW %, Study Time WoW %, Activity MoM %, Peak Focus time

**New file (from prior session):** `frontend/src/lib/analytics.js`
- Pure utility: `movingAverage`, `wowVariance`, `momVariance`, `weeklyBuckets`, `peakFocusTime`, `trendColor`, `trendArrow`, `trendBadge`
- No side effects, no DB calls — consumers pass pre-fetched data

---

## What Changed Earlier (NA-022 + NA-024)

### NA-022 — Dashboard Activity Calendar Drill-Down ✅
**New file:** `frontend/src/components/JournalModal.jsx`
- Unified diary component replacing both `DayDetailPanel` and `DiaryPanel`
- `mode="modal"` → centered overlay (Dashboard); `mode="panel"` → slide-in from right (Activity)
- Features: mood picker (5 emoji), debounced auto-save notes (1000ms debounce), study hours, goals-met toggle, activity log (from `getActivityLogsForDay`), content progress (from `getContentProgressForDay`)
- All DB access via supabase.js helpers — zero raw `supabase.from()` calls in component
- Writes to `useAppStore.diaryCache` on every save for cross-page sync

**Modified:** `frontend/src/components/dashboard/CalendarGoalRow.jsx`
- Replaced `DayDetailPanel` import with `JournalModal`
- Gets `addToast` from `useAppStore` directly (no prop drilling)
- `onSave` closes modal AND calls `refreshDashboard()` → triggers full heatmap re-fetch

### NA-024 — 90-Day Activity Heatmap Editability & Synchronization ✅
**Modified:** `frontend/src/components/ActivityPage.jsx`
- Replaced `DiaryPanel` with `JournalModal mode="panel"`
- `onSave` handler: adds saved date to local `diaryDates` Set immediately
- Subscribes to `useAppStore.diaryCache` → merges any diary saves from Dashboard into `diaryDates` without re-fetch

**Modified:** `frontend/src/components/DoctorDashboard.jsx`
- Added `import { useAppStore }`
- `useEffect` on `diaryCache`: merges dates with `study_hours > 0` into `activityByDate` → heatmap updates immediately when Activity page saves a diary

**Modified:** `frontend/src/stores/useAppStore.js`
- Added `diaryCache: {}` — map of date → saved diary payload
- Added `setDiaryCache(date, data)` action — called by JournalModal on every save

**Modified:** `frontend/src/lib/supabase.js`
- Added `getActivityLogsForDay(userId, date)` — activity timeline for JournalModal
- Added `getContentProgressForDay(userId, date)` — content progress for JournalModal

---

## What Changed Earlier (NA-019 → NA-023)

### NA-019 — Sidebar Navigation Latency ✅
**File:** `frontend/src/components/Sidebar.jsx`
- Added `useTransition` from React 18 to `NavItem`.
- `setPage(item.k)` is now called inside `startTransition()`.
- Effect: React suppresses the Suspense spinner during page transitions — the current page stays visible until the lazy bundle finishes loading, then swaps atomically. A small pulsing dot on the nav item gives immediate feedback.
- Previously: every first navigation showed a full-page spinner (jarring).

### NA-020 — Theme Toggle State Synchronisation ✅
**Files:** `frontend/src/stores/useAppStore.js`, `frontend/src/components/TopBar.jsx`

Two bugs fixed:

1. **FOUC (Flash of Unstyled Content):** `darkMode` HTML class was only applied inside a `useEffect` — after React's first render — causing dark-mode users to see a flash of light mode on every page load.
   - Fix: Applied `document.documentElement.classList.toggle('dark', isDark)` and `setAttribute('data-theme', ...)` **synchronously** inside the store's IIFE initializer, before React renders anything.
   - `setDarkMode` action also now applies the HTML class immediately on every toggle.

2. **Function-updater bug:** `TopBar.jsx` called `setDarkMode(d => !d)` — passing a function to a plain Zustand action (not useState). Functions are truthy, so `localStorage` always received `'dark'` and the `darkMode` state was set to a function reference.
   - Fix: Changed to `setDarkMode(!darkMode)` — passes the concrete boolean.

### NA-021 — Fix "For You" Refresh Redundancy ✅
**File:** `frontend/src/components/DoctorDashboard.jsx`
- `refreshForYou` callback was making a direct `supabase.from('profiles').select('speciality')` call inside the component — a CLAUDE.md violation ("NEVER write raw supabase.from() calls inside components").
- `mySpeciality` is already fetched and held in state by `load()` (line 100: `if (profileData?.speciality) setMySpeciality(profileData.speciality)`).
- Fix: Removed the profile re-fetch entirely. `refreshForYou` now uses `mySpeciality` from state. `dashDataRef.current` already holds all other AI input data (booksRead, quizScore, totalScore, weeklyMins, lastActive, recentSubjects).
- Net: one fewer network round-trip per refresh click; rule violation eliminated.

### NA-023 — Fix Weekly Learning Target Widget Sizing ✅
**Files:** `frontend/src/components/dashboard/GoalRing.jsx`, `frontend/src/components/dashboard/CalendarGoalRow.jsx`

**GoalRing.jsx:**
- NA-017 Tailwind conversion had left `style={{ maxWidth: 120 }}` as an unavoidable inline style (120px has no exact standard Tailwind 3 scale value).
- Changed to `className="max-w-44"` (11rem / 176px — standard Tailwind scale).
- Ring is now 47% larger, proportioned correctly inside its card, and has zero inline styles.

**CalendarGoalRow.jsx:**
- Grid container: `style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16, marginBottom: 20 }}` → `className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5"`
- GoalRing card: `style={{ margin: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}` → `className="card flex flex-col items-center justify-center" style={{ margin: 0 }}`
- Kept `style={{ margin: 0 }}` on both `.card` divs — the `.card` CSS class applies margin that must be overridden inline.

---

## What Changed This Session — Comprehensive Bug Fix Pass (2026-04-03)

### FIX: Navigation Stale Content — App.jsx
- Root cause: `setPage()` called DURING render in `renderPage()` (route guard + kahoot redirect)
- Calling Zustand's `set()` during render is a React anti-pattern — current render proceeds with stale state
- Fix: replaced `setPage(x); return null;` with `queueMicrotask(() => setPage(x)); return <PageLoader />;`
- This schedules the state update AFTER the current render completes
- `key={page}` on `<PageErrorBoundary>` still forces full unmount/remount on valid navigations

### FIX: WebSocket Infinite Retry — useAppStore.js + supabase.js
- Added status callback to `.subscribe()` in `subscribeToNotifications`
- On `TIMED_OUT`: removes channel and cleans up `_channels` map to prevent infinite retry
- On `CHANNEL_ERROR`: logs warning (Supabase handles retry automatically)
- Added `timeout: 30000` to Supabase client realtime config

### FIX: getContentProgressForDay — supabase.js
- Was querying `content_type, progress_pct` columns that don't exist in `user_content_state`
- Fixed to query actual columns: `artifact_id, current_page, is_bookmarked, updated_at`
- Maps result to the shape JournalModal expects: `{ content_type: 'reading', progress_pct: min(current_page*10, 100) }`

### NEW: admin_calendar_events migration
- Created `supabase/migrations/20260403000001_admin_calendar_events.sql`
- Table with: id, title, date, description, color, is_compulsory, created_by, timestamps
- RLS: SELECT for all, INSERT for admins, UPDATE/DELETE for superadmins
- IF NOT EXISTS guards on all policies + trigger

### AI/Orchestrator Review
- `ai-orchestrator` edge function is production-ready — no code changes needed
- `USE_EDGE_FUNCTION = true` in aiService.js routes all AI through orchestrator
- NVIDIA primary → Gemini fallback works correctly
- gemini-proxy 502 fix: user must set `GEMINI_API_KEY` secret and deploy edge functions

### Blueprint Created
- `.agent/COMPREHENSIVE_FIX_BLUEPRINT.md` — full analysis + CLI prompt + verification matrix

---

## ⏳ Pending Manual Actions (Ayush must do these)

1. **[CRITICAL] Set Gemini API key and deploy edge functions:**
   ```bash
   npx supabase secrets set GEMINI_API_KEY=<YOUR_GEMINI_KEY>
   npx supabase functions deploy gemini-proxy --no-verify-jwt
   npx supabase functions deploy ai-orchestrator
   ```

2. **[CRITICAL] Push the database migration:**
   ```bash
   npx supabase db push
   ```

3. **[CRITICAL] Build and deploy frontend:**
   ```bash
   cd frontend && npm run build && git add -A && git commit -m "fix: navigation, AI, WebSocket, DB schema" && git push
   ```

4. **Test all 5 fixes** using the verification matrix in `.agent/COMPREHENSIVE_FIX_BLUEPRINT.md`

## Next Session Must Start With

**→ After Ayush deploys, pick from:**
1. Verify all 5 fixes are working in production
2. Dark mode audit results from Ayush → BUG-W color replacement pass
3. NVIDIA key rotation follow-up (set NVIDIA_API_KEY for faster AI responses)

---

## Cumulative File Change Log (all sessions)

| File | Changes |
|------|---------|
| `frontend/src/components/JournalModal.jsx` | NEW — unified diary/journal modal (NA-022, NA-024) |
| `frontend/src/lib/supabase.js` | +getDiaryEntry, +upsertDiaryEntry, +getDiaryEntriesRange, +getActivityLogsForDay, +getContentProgressForDay, +getAllUserNotes, +getSmartNotes, +toggleSmartNoteStar, +deleteSmartNote |
| `frontend/src/components/ActivityPage.jsx` | JournalModal replaces DiaryPanel; diaryCache sync |
| `frontend/src/lib/aiService.js` | date-based variation seed in getPersonalizedSuggestions |
| `frontend/src/stores/useAppStore.js` | FOUC fix; setDarkMode; +diaryCache, +setDiaryCache |
| `frontend/src/components/App.jsx` | parallel fetches, lazy routes, PageErrorBoundary, ROLE_PAGES |
| `frontend/src/components/Sidebar.jsx` | useTransition in NavItem, My Notes nav item |
| `frontend/src/components/TopBar.jsx` | setDarkMode(!darkMode) fix |
| `frontend/src/components/DoctorDashboard.jsx` | weekActivity fix, error banner, useAuth, ForYou cache key, refreshForYou cleanup; +diaryCache sync; V1-V3 fixes |
| `frontend/src/lib/analytics.js` | NEW — pure analytics utilities (movingAverage, wowVariance, weeklyBuckets, peakFocusTime, trendColor/Arrow/Badge) |
| `frontend/src/components/MyPerformancePage.jsx` | percentile badge, 4-week trend chart → trendBadge %; new Analytics Insights card |
| `frontend/src/components/ActivityPage.jsx` | WoW badge in Weekly Progress header; peak focus time row |
| `frontend/src/components/NotesPage.jsx` | NEW — unified Notes page |
| `frontend/src/components/ui/PageErrorBoundary.jsx` | NEW — error boundary with resetKey |
| `frontend/src/components/dashboard/ActivityDots.jsx` | normalized bar heights |
| `frontend/src/components/dashboard/StudyPlanCard.jsx` | empty-state CTAs |
| `frontend/src/components/dashboard/DayDetailPanel.jsx` | error state, full Tailwind, diary helper |
| `frontend/src/components/dashboard/GoalRing.jsx` | full Tailwind, max-w-44 sizing |
| `frontend/src/components/dashboard/ForYouWidget.jsx` | full Tailwind, SuggestionRow extraction |
| `frontend/src/components/dashboard/CalendarGoalRow.jsx` | Tailwind grid + flex, sizing fix; JournalModal (NA-022) |
| `frontend/src/components/Activity/DiaryPanel.jsx` | getDiaryEntry/upsertDiaryEntry migration |
| 14+ other components | useAuth() replacing supabase.auth.getUser() |

---

## Architectural Decisions Made

- `DiaryPanel.jsx` retains direct `supabase` import for `activity_logs` (not diary table) — correct, no change needed
- `ForYouWidget.SuggestionRow` extracted as local component to eliminate 3 near-identical blocks
- `DayDetailPanel` preserves `mood` on save via `diary?.mood ?? null` — no mood UI in dashboard, but field is never overwritten
- Variation seed in `aiService.js` is date-based (daily) — cached results stable within a day, refresh daily
- `GoalRing` `maxWidth` inline style replaced with `max-w-44` — old `120px` was below the 7rem Tailwind minimum; 176px is the right visual size
- `ROLE_PAGES.superadmin = []` (empty = unrestricted) — easier to maintain than explicit list

---

## Do NOT Touch Until Discussed
- `frontend/src/migrations/` — reference only, never run or delete
- `*.bak` files — backups, leave alone
- `server/` — needs audit before any changes
- `supabase/migrations/20260301071219_remote_schema.sql` — master schema dump, do not modify

---

## Known Issues / Open Questions
- `supabase db diff` still fails locally (profiles ordering in 2024xxxx migrations) — cosmetic only, prod is fine
- `server/` Express backend vs Supabase redundancy — audit still pending
- Chunk size warning (`index-*.js` ~664kB gzip 211kB) — pre-existing, non-blocking; candidate for manual chunk splitting in a later session
- NA-022 spec not yet written — check if it's in next-actions-production.md or needs to be defined before implementation begins
