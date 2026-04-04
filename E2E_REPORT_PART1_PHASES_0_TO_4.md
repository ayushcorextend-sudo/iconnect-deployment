# iConnect E2E Test Report — Part 1 (Phases 0–4)
**Date:** 2026-04-05
**Tester:** Claude Opus 4.6 (automated browser agent)
**Target:** https://iconnect-med.vercel.app
**Browser:** Chrome (desktop, 1440×760 viewport)

---

## Executive Summary

Phases 0 through 4 tested environment setup, authentication flows for all 3 roles, Super Admin pages, Content Admin pages, and the full Doctor page sweep. Out of ~40 discrete test points, **29 passed cleanly, 5 passed with warnings, and 6 failed or had significant issues.**

**Severity Breakdown:**
- CRITICAL: 1 (now fixed — "Invalid time value" crash)
- HIGH: 4
- MEDIUM: 5
- LOW: 3

---

## Phase 0 — Environment Setup

| Check | Result | Notes |
|-------|--------|-------|
| Site loads at production URL | PASS | Cold load ~2.8s |
| HTTPS active | PASS | Lock icon confirmed |
| No fatal JS errors on cold load | PASS | Zero TypeError/ReferenceError |
| Console baseline warnings | WARN | `supabase.js` dynamic import warning (known baseline), 653KB chunk size warning (known baseline) |
| Supabase HEAD requests | FAIL | 3× HTTP 503 on cold load (profiles pending count ×2, unread notifications count). Likely Supabase free-tier rate limiting. |
| PWA Install banner | INFO | "Install App" button renders in sidebar — known baseline, not a regression |

---

## Phase 1 — Auth & Sessions

### 1A. Super Admin Login (admin@iconnect.in)
| Test | Result | Notes |
|------|--------|-------|
| Email + password login | PASS | Redirects to `/users` (SA dashboard) |
| Auth lock warnings on login | WARN | 12+ warnings: "Lock not released within 5000ms… orphaned lock from React Strict Mode." Systemic issue — every login triggers these. |
| fetchArtifacts AbortError | WARN | 3+ errors: "Lock broken by another request with the 'steal' option." Related to auth lock race condition. |
| Session token in localStorage | PASS | `sb-kzxsyeznpudomeqxbnvp-auth-token` set correctly |
| Logout flow | PASS | Redirects to login, clears session |

### 1B. Content Admin Login (content@iconnect.in)
| Test | Result | Notes |
|------|--------|-------|
| Email + password login | PASS | Reaches CA portal |
| Role mismatch in DB | **HIGH** | `content@iconnect.in` has role "PG Aspirant" in `profiles` table, NOT "contentadmin". CA portal does NOT validate role on login — any user could theoretically access CA portal URL if they know it. |
| CA portal renders | PASS | Dashboard loads, shows doctor-style UI (because role is actually "PG Aspirant") |

### 1C. Doctor Login (content@iconnect.in as doctor role)
| Test | Result | Notes |
|------|--------|-------|
| Login | PASS | Since content@ has PG Aspirant role, it effectively acts as doctor |
| Dashboard loads | **PASS (CRITICAL FIX VERIFIED)** | Previous "Invalid time value" TypeError crash is NOW FIXED. Dashboard loads cleanly with zero console errors. |

### 1D. Auth Token Tampering
| Test | Result | Notes |
|------|--------|-------|
| Delete localStorage auth token | PASS (with note) | Deleting token doesn't immediately invalidate in-memory Supabase session. Hard refresh correctly redirects to login. Expected Supabase behavior but minor security concern — stale in-memory sessions can persist until next page load. |

---

## Phase 2 — Super Admin Pages

| Page | Route | Result | Notes |
|------|-------|--------|-------|
| User Management | `/users` | PASS | Table loads, columns render, search works |
| E-Books Management | `/ebooks` | PASS | Book list renders, "0 pages" on Harrison's (known baseline) |
| Reports | `/reports` | PASS | Analytics cards render |
| Broadcast | `/broadcast` | PASS | Form renders with recipient selector |
| Settings | `/settings` | PASS | Tenant settings load |

**Super Admin console during sweep:** No new errors beyond baseline auth lock warnings.

---

## Phase 3 — Content Admin Pages

| Page | Route | Result | Notes |
|------|-------|--------|-------|
| CA Login Portal | `/ca/login` | PASS | Form renders |
| CA Dashboard | `/ca/dashboard` | **WARN** | Loads but shows doctor-style UI because user role is "PG Aspirant" not "contentadmin". No CA-specific controls visible. |
| Role Isolation | — | **HIGH** | CA portal does not gate access by database role. No server-side role check on CA routes. |

---

## Phase 4 — Doctor Full Page Sweep

| Page | Route | Result | Console Errors | Notes |
|------|-------|--------|----------------|-------|
| Dashboard | `/dashboard` | **PASS** | 0 errors | **CRITICAL FIX CONFIRMED** — "Invalid time value" crash resolved. Stats cards, welcome message, activity chart all render. |
| My Activity | `/activity` | PASS | 0 new | Activity feed loads |
| E-Books | `/ebooks` | PASS | Realtime warning | Book cards render. 1× `[Realtime] Channel error for notifications — will retry` |
| Exam Questions | `/exam` | PASS | 0 new | 10 subjects displayed, 6 questions each. "Leave site?" beforeunload dialog fires on navigation away (minor UX issue). |
| My Leaderboard | `/leaderboard` | PASS | 0 new | Podium renders with top 3 + rank table |
| Notifications | `/notifications` | PASS | 0 new | Notification list loads |
| AI Chatbot | floating widget | **WARN** | Gemini 404 | Chat UI opens and accepts input, but backend returns "Gemini error: 404". AI responses non-functional. Backend API issue, not frontend. |
| Conferences | `/conferences` | PASS | 0 new | Empty state renders correctly |
| Learn Hub | `/learn` | PASS | 0 new | Mock Tests section visible with cards |
| Live Arena | `/live-arena` | **FAIL** | 0 new | Redirects immediately to `/dashboard`. Route is broken — component likely missing or route guard misconfigured. |
| Study Calendar | `/calendar` | PASS | 0 new | Calendar grid renders, current month displayed |
| Study Plan Engine | `/study-plan` | PASS | 0 new | 4 tabs (My Plan, Case Log, My Persona, Flash Review). Empty state with "Generate Plan" CTA. |
| Case Simulator | `/case-sim` | PASS | 0 new | Specialty dropdown + "Generate Case" button render. Empty state correct. |
| My Performance | `/performance` | **WARN** | **53× Realtime warnings** | Page renders with analytics (98 points, 8.5h studied, Rank #4, Score Breakdown, 7-day chart). BUT: notifications Realtime channel enters infinite retry loop — 53+ identical warnings logged at same timestamp. Performance concern. |
| Social Features | `/social` | PASS | 0 new | Placeholder page — "Planned for Version 3". Peer Network + Note Sharing cards. |
| Interest Groups | `/interest-groups` | PASS | 0 new | Loaded (navigated via URL) |
| My Profile | `/profile` | PASS | 0 new | Personal info, Academic info, Profile Verification Steps all render. Shows "Verified Doctor" badge. |

---

## Cumulative Bug Registry (Phases 0–4)

| # | Severity | Category | Description | Route/Component | Reproducible |
|---|----------|----------|-------------|-----------------|-------------|
| BUG-001 | **HIGH** | Auth/Security | Content Admin role mismatch — `content@iconnect.in` has role "PG Aspirant" in DB, CA portal doesn't validate role | CA login portal | Always |
| BUG-002 | **HIGH** | Auth | Supabase auth lock race condition — 12+ "orphaned lock" warnings + 3+ AbortErrors on every login | All login flows | Always |
| BUG-003 | **HIGH** | Routing | `/live-arena` redirects to Dashboard — route broken or component missing | Live Arena | Always |
| BUG-004 | **HIGH** | Backend/AI | AI Chatbot returns "Gemini error: 404" — backend API endpoint broken or API key expired | Chatbot widget | Always |
| BUG-005 | **MEDIUM** | Realtime | Notifications Realtime channel infinite retry loop — 53+ warnings logged in single burst on `/performance` page | My Performance | Always |
| BUG-006 | **MEDIUM** | Infra | 3× Supabase 503 errors on cold load HEAD requests (profiles pending, unread notifications) | Initial load | Intermittent |
| BUG-007 | **MEDIUM** | UX | Exam Questions page fires `beforeunload` "Leave site?" dialog when navigating away via sidebar | `/exam` | Always |
| BUG-008 | **MEDIUM** | Security | Deleting localStorage auth token doesn't invalidate in-memory session until hard refresh | All authenticated pages | Always |
| BUG-009 | **MEDIUM** | Auth/Security | CA portal has no server-side role gate — any authenticated user can access CA routes | `/ca/*` | Always |
| BUG-010 | **LOW** | Console | `supabase.js` dynamic import warning on every page load | Global | Always (known baseline) |
| BUG-011 | **LOW** | Performance | 653KB JS chunk exceeds recommended 500KB limit | Global | Always (known baseline) |
| BUG-012 | **LOW** | Data | Harrison's Principles shows "0 pages" in E-Books | `/ebooks` | Always (known baseline) |
| BUG-013 | **LOW** | UX | Realtime channel warning on E-Books page (single occurrence per visit) | `/ebooks` | Always |

---

## Verified Fix

| Issue | Previous State | Current State |
|-------|---------------|---------------|
| "Invalid time value" TypeError crash on Doctor Dashboard | CRITICAL — Dashboard crashed on load with unhandled TypeError | **FIXED** — Dashboard loads cleanly with zero console errors. Stats, charts, and all widgets render correctly. |

---

## What Remains (Part 2 — Phases 5–9)

- **Phase 5:** Dark Mode / Light Mode toggle stress test + full sweep in both themes
- **Phase 6:** Responsive breakpoints at 320px, 400px, 768px, 1440px
- **Phase 7:** Stress tests — rapid navigation, rapid button clicks, empty form submissions, network interruption
- **Phase 8:** Accessibility — keyboard nav, aria-labels, color contrast
- **Phase 9:** Z-Index & overlay integrity — toast vs modal layering, chatbot over content, dropdown stacking

*Part 2 will be executed in the next session using the CLI master prompt provided alongside this report.*
