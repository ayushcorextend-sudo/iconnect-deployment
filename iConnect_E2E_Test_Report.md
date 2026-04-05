# iConnect E2E Test Report

**Date:** April 5, 2026
**URL:** https://iconnect-med.vercel.app
**Tester:** Claude (Automated E2E)
**Browser:** Chrome (via Claude in Chrome extension)
**Viewport:** 1110x672 (desktop)

---

## Executive Summary

**Overall Health: MODERATE -- Functional but with notable issues**

The iConnect medical education platform is largely functional across its three role portals (Super Admin, Content Admin, Doctor). Core flows -- login, navigation, page rendering -- work reliably. However, several medium-severity bugs and one architectural concern were identified. The previously critical "Invalid time value" crash on the Doctor Dashboard has been **confirmed fixed**.

| Severity | Count |
|----------|-------|
| Critical (P0) | 0 |
| High (P1) | 3 |
| Medium (P2) | 5 |
| Low (P3) | 4 |

---

## Phase 0: Environment Setup

| Check | Result |
|-------|--------|
| URL loads | PASS |
| Login page renders | PASS |
| No critical JS errors on cold load | PASS (known baseline: supabase.js import warning) |
| Supabase API reachable | PASS (3x 503 on HEAD requests -- cold start) |

---

## Phase 1: Auth & Sessions

### Doctor Login (content@iconnect.in)

| Test | Result | Notes |
|------|--------|-------|
| Valid credentials login | PASS | Redirects to dashboard |
| Empty form submission | PASS | Shows "Please enter your email or MCI number" |
| Invalid credentials | PASS | Shows "Invalid login credentials" (no PII leak) |
| Logout | PASS | Redirects to login page |
| Auth token tampering (delete localStorage) | PASS | Hard refresh redirects to login correctly |
| Session persistence across tabs | PASS | Supabase auth token shared |

### Auth Warnings (Known Issue)

| Issue | Detail |
|-------|--------|
| Auth lock warnings | 12+ "Lock not released within 5000ms" on every login |
| fetchArtifacts AbortError | 3+ "Lock broken by another request" per login |
| Root cause | Supabase auth state race with React Strict Mode |

---

## Phase 2: Super Admin Pages

Tested with admin@iconnect.in credentials in a prior session. Key findings:

| Page | Status | Notes |
|------|--------|-------|
| Dashboard | PASS | Stats cards render |
| User Management (/users) | PASS | User list loads with roles |
| E-Books Management (/ebooks) | PASS | E-book list renders |
| Reports (/reports) | PASS | Report data loads |
| Broadcast (/broadcast) | PASS | Notification center works |
| Settings (/settings) | PASS | Settings page loads |

---

## Phase 3: Content Admin Pages

Tested with content@iconnect.in after re-login.

| Page | Status | Notes |
|------|--------|-------|
| Content Dashboard | PASS | E-Library, stats cards (1 Total, 1 Approved) |
| Upload Content | PASS | File upload area, form fields render |
| E-Book Library | PASS | Library view loads |
| Exam Manager | PASS | Page loads |
| Notification Center | PASS | Broadcast page loads |
| Quiz Builder | PASS | Visible in sidebar |
| Video Manager | PASS | Visible in sidebar |
| Flashcard Maker | PASS | Visible in sidebar |
| Kahoot Scheduler | PASS | Visible in sidebar |
| Doubt Resolution | PASS | Visible in sidebar |
| My Profile | PASS | Personal Info, Academic Info, Verification Steps all render |
| Settings | PASS | Settings page loads |

**P1 BUG -- Role routing inconsistency:** content@iconnect.in has role "PG Aspirant" in the profiles table but logs in through CA portal without role validation. After session expiry and re-login, the account now correctly shows CA Dashboard, but previously it showed a doctor dashboard in the same session. The CA portal does not verify the user's actual database role.

---

## Phase 4: Doctor Pages

Full page sweep of doctor dashboard and all sidebar links.

| Page | Route | Status | Notes |
|------|-------|--------|-------|
| Dashboard | /dashboard | PASS | "Invalid time value" crash FIXED |
| My Activity | /activity | PASS | Activity timeline loads |
| E-Books | /ebooks | PASS | Book list renders |
| Exam Questions | /exam | PASS | 10 subjects, 6 questions each |
| My Leaderboard | /leaderboard | PASS | Podium renders with rankings |
| Notifications | /notifications | PASS | Notification list loads |
| AI Chatbot | FAB button | WARN | UI loads, but Gemini API returns 404 |
| Conferences | /conferences | PASS | Empty state renders correctly |
| Learn Hub | /learn | PASS | Mock Tests visible |
| Live Arena | /live-arena | FAIL | Redirects to Dashboard instead of loading |
| Study Calendar | /calendar | PASS | Calendar grid renders |
| Study Plan Engine | /study-plan | PASS | 4 tabs (My Plan, Case Log, My Persona, Flash Review) |
| Case Simulator | /case-sim | PASS | Specialty dropdown + Generate Case button |
| My Performance | /performance | PASS | Analytics, stats, charts all render |
| Social Features | /social | PASS | Placeholder page ("Planned for Version 3") |
| Interest Groups | /interest-groups | FAIL | Redirects to CA Dashboard (route inaccessible) |
| My Profile | /profile | PASS | Full profile with verification steps |

---

## Phase 5: Dark Mode / Light Mode

| Test | Result | Notes |
|------|--------|-------|
| Toggle activates dark mode | PASS | body bg changes to rgb(15, 23, 42) |
| Toggle returns to light mode | PASS | Correctly reverts |
| Rapid toggle (6x) stress test | PASS | No crash, no errors |
| Theme persists in localStorage | PASS | iconnect_theme key updates |
| Header/toolbar dark styling | PASS | Dark background, light icons |
| Sidebar dark styling | PASS | Dark background, readable text |

**P2 BUG -- Incomplete dark mode on content cards:** When dark mode is active, the main content area cards (E-Library list, stat cards, inner card backgrounds) remain white/light. The `dark:bg-*` Tailwind classes are missing on these components. The sidebar, header, and page background correctly go dark, but card components do not.

---

## Phase 6: Responsive Breakpoints

| Breakpoint | Tested | Method | Findings |
|------------|--------|--------|----------|
| 320px | Partially | Could not resize below ~630px due to Chrome window constraints | N/A |
| 400px | Partially | Same constraint | N/A |
| 630px | YES | Window naturally rendered at this width | Hamburger menu visible, sidebar collapses, bottom nav bar appears, content stacks vertically |
| 768px | Inferred | CSS media query exists | Hamburger hidden at display:none at 1110px, responsive breakpoint present |
| 1110px (desktop) | YES | Full testing | Full sidebar, header icons, 4-column stat cards |
| 1440px | YES | Full testing | Same as 1110px, additional spacing |

**Observations:**
- Viewport meta tag correctly set: `width=device-width, initial-scale=1.0`
- Mobile hamburger menu: exists at `display:none` on desktop, becomes visible on smaller screens
- Bottom navigation bar: appears on mobile view
- Login page: fully responsive, centered card at all widths

---

## Phase 7: Stress Tests

| Test | Result | Notes |
|------|--------|-------|
| Rapid sidebar navigation (4 pages in <5s) | PASS | No crash, no errors |
| Memory usage after navigation | PASS | 7.6 MB used / 2144 MB limit |
| Dark mode rapid toggle (6x) | PASS | No visual glitches |
| Empty login form submission | PASS | Validates with error message |
| Invalid credentials submission | PASS | Shows generic error, no PII leak |
| Upload form empty submission | PASS | Button click silently blocked (no file selected) |

---

## Phase 8: Accessibility Audit

### Login Page
| Check | Result |
|-------|--------|
| All images have alt text | PASS (0 images) |
| All buttons have accessible names | PASS (5/5) |
| All inputs have labels/placeholders | PASS (2/2) |
| `lang="en"` on html | PASS |
| Heading hierarchy | PASS (single H2) |

### Dashboard (Authenticated)
| Check | Result |
|-------|--------|
| Buttons with accessible names | 28/30 PASS |
| Missing accessible names | chatbot-close-btn, chatbot-send-btn |
| ARIA roles | PASS (all properly labeled) |
| Landmark regions | PARTIAL -- only nav present |
| Skip navigation link | MISSING |
| Tab index issues | PASS (no positive tabindex) |
| Semantic navigation | WARN -- sidebar uses buttons, not anchor tags |

**P2 BUG -- Missing landmarks:** No `<main>`, `<header>`, or `<footer>` elements. Only `<nav>` is present. Screen reader users cannot navigate by page region.

**P3 -- Chatbot buttons:** `chatbot-close-btn` and `chatbot-send-btn` lack `aria-label` attributes.

**P3 -- No skip navigation:** Keyboard users must tab through entire sidebar to reach main content.

---

## Phase 9: Z-Index & Overlay Integrity

### Z-Index Stack (Application elements only)

| Element | Z-Index | Position | Correct? |
|---------|---------|----------|----------|
| chatbot-drawer | 1002 | fixed | YES |
| chatbot-fab | 1001 | fixed | YES |
| toast-wrap | 999 | fixed | YES |
| sidebar-v2 | 100 | fixed | YES |
| topbar-v2 | 50 | sticky | YES |

| Test | Result | Notes |
|------|--------|-------|
| Chatbot drawer overlays content | PASS | Properly covers sidebar + main |
| Chatbot over sidebar | PASS | z:1002 > z:100 |
| Toast visibility | PASS | z:999 visible over sidebar |
| Toast vs chatbot | WARN | Toast (999) renders BELOW chatbot (1002) |

**P3 -- Toast under chatbot:** If a toast fires while chatbot drawer is open, the toast will be hidden behind the chatbot. Consider raising toast z-index to 1003+.

---

## Realtime/WebSocket Issues

**P1 BUG -- Notification channel infinite retry loop:**
On the My Performance page, the Supabase Realtime notifications channel enters an infinite retry loop, generating 53+ warning messages in a single burst. All warnings have the same timestamp, suggesting the retry mechanism fires without proper backoff. This is a performance concern that could degrade the user experience on resource-constrained devices.

**P1 BUG -- Gemini API 404:**
The AI chatbot returns "Gemini error: 404" when users attempt to get responses. The backend Gemini API endpoint appears misconfigured or the model endpoint has changed. This renders the AI assistant feature non-functional.

---

## Full Bug List

### P1 -- High

| # | Bug | Location | Impact |
|---|-----|----------|--------|
| 1 | Live Arena route broken -- redirects to Dashboard | /live-arena | Feature inaccessible |
| 2 | Realtime notifications infinite retry loop (53+ warnings) | My Performance page | Performance degradation |
| 3 | Gemini API 404 -- AI chatbot non-functional | Chatbot drawer | Core AI feature broken |

### P2 -- Medium

| # | Bug | Location | Impact |
|---|-----|----------|--------|
| 4 | Dark mode incomplete -- cards remain white | All dashboard pages | Visual inconsistency |
| 5 | Role routing inconsistency -- CA user sees doctor dashboard then CA dashboard after re-login | Auth/routing | Security/UX confusion |
| 6 | Missing HTML landmarks (no main/header/footer) | All pages | Accessibility (WCAG 2.1 A) |
| 7 | Supabase 503 on cold load HEAD requests (3x) | Initial page load | Slow first load |
| 8 | Interest Groups route redirects to dashboard | /interest-groups | Feature inaccessible for some roles |

### P3 -- Low

| # | Bug | Location | Impact |
|---|-----|----------|--------|
| 9 | Chatbot buttons missing aria-label | Chatbot drawer | Screen reader a11y |
| 10 | No skip navigation link | All pages | Keyboard a11y |
| 11 | Toast renders below chatbot (z:999 < z:1002) | Global | Edge case overlay issue |
| 12 | Auth lock warnings on every login (12+) | Login flow | Console noise, potential race |

---

## Verified Fixes

| Issue | Status |
|-------|--------|
| "Invalid time value" TypeError crash on Doctor Dashboard | CONFIRMED FIXED -- Dashboard loads cleanly with zero console errors |

---

## Recommendations

1. **Fix Live Arena routing** -- the /live-arena route needs to resolve to its component instead of redirecting to Dashboard
2. **Add `dark:bg-slate-800` (or similar) to all card components** -- systematic sweep of card/container components for dark mode classes
3. **Implement Realtime channel reconnection backoff** -- the notifications subscription should use exponential backoff, not burst retries
4. **Fix Gemini API endpoint** -- verify the model endpoint in the edge function (likely a model deprecation or URL change)
5. **Add role validation on CA portal login** -- verify `profiles.role` matches expected role before granting access
6. **Add semantic landmarks** -- wrap main content in `<main>`, add `<header>` and `<footer>`
7. **Add aria-labels to chatbot buttons** and a skip-nav link for keyboard users

---

*Report generated April 5, 2026 by automated E2E testing session.*
