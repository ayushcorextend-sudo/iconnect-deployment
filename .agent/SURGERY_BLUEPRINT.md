# iConnect Medical — Zero-Regression Surgery Blueprint

## THE DEFINITIVE MASTER PLAN FOR SYSTEMIC ARCHITECTURAL RECOVERY

> **Document Classification:** Terminal Execution Prompt — Sequential Phases  
> **Author Role:** Chief Software Architect + Principal QA Engineer  
> **Prerequisite:** Read this ENTIRE document before touching a single file.  
> **Hard Stop Protocol:** After each phase, print `═══ PHASE N COMPLETE ═══` and STOP.  
> Do NOT proceed until Ayush says "next". Never run `git push`.

---

## ═══════════════════════════════════════════════════════════════
## SECTION 0 — THE PATHOLOGY REPORT
## (Deep Architectural Deduction — Not a Bug List Restatement)
## ═══════════════════════════════════════════════════════════════

The 35+ bugs reported in the intake document are **symptoms of 7 systemic diseases**. Treating symptoms without curing the underlying disease is precisely why the codebase has been stuck in whack-a-mole regression cycles. This section traces each disease to its root, deduces the **unseen damage** the bug list didn't catch, and establishes the surgical priority order.

### Disease 1: The Absent Service Layer (54 Direct DB Calls)

**Bug Cluster:** BUG-G (54 direct `supabase.from()` calls), BUG-E (camelCase→DB leak), BUG-B (fake validation), BUG-F (correct vs. correct_key), BUG-K (9 uncancelled API calls), Spaced Rep direct DB update, Exam Flow silent error eater.

**Root Cause:** There is no centralized data access layer. Every component independently calls Supabase, which means every component independently reimplements (or more commonly, forgets to implement) error handling, auth token attachment, case transformation, request cancellation, retry logic, and caching.

**Deduction Chain — What The Bug List Didn't Say:**

1. **No Request Deduplication Exists.** If 54 components each fetch their own data, overlapping queries to the same tables are guaranteed. Two components mounting simultaneously that both need `profiles` will fire two identical queries. This wastes Supabase connection pool slots and doubles latency for the user.

2. **No Request Cancellation Exists (Confirmed by BUG-K).** The DoctorDashboard fires 9 concurrent calls with no `AbortController`. This means if a user navigates away mid-load, 9 in-flight requests complete in the background, attempt to `setState` on unmounted components, and leak memory. Multiply this pattern across 54 call sites and the app is hemorrhaging wasted network requests.

3. **No Centralized Retry Logic Exists.** The Exam Flow's empty dropdown on network error (reported bug) is not an isolated case. Every single data-fetching component that doesn't have its own retry logic (which is all of them, because the pattern is `catch → toast → give up`) will show empty/broken states on transient network failures.

4. **The camelCase↔snake_case Transform is Completely Missing.** BUG-E reports that `...profile` spread sends camelCase to a snake_case DB, producing NULL inserts. This isn't a one-off mistake — it means every form in the app that writes to any table is at risk of the same bug. The fact that only `firstName`/`mciNumber` were reported means the others either: (a) happen to have single-word column names that don't need transformation, or (b) are silently inserting NULLs that nobody has noticed yet.

5. **Rate Limiting is Impossible to Implement.** Without a single choke point for outbound requests, there's no place to add rate limiting, request throttling, or circuit-breaker logic. If Supabase ever rate-limits this app, 54 components will independently and chaotically fail.

**Unseen Damage Guaranteed to Exist:**
- Corrupted data rows in production where camelCase field names mapped to NULL DB columns.
- Wasted Supabase connection pool utilization from duplicate and uncancelled requests.
- Silent memory leaks from every async operation that completes after its component unmounts.

---

### Disease 2: Authentication is Decorative, Not Enforced

**Bug Cluster:** SEC-001 (OTP bypass), SEC-002 (NVIDIA key exposed), SEC-003 (Supabase key hardcoded), SEC-004 (sendBeacon without auth), SEC-005 (fake account creation), BUG-T (localStorage rate limiting), Registration Flow DevTools bypass.

**Root Cause:** The authentication system was designed as a UI flow (show login screen → show OTP screen → show dashboard), not as a security perimeter. Every enforcement mechanism is client-side, which means every enforcement mechanism is bypassable.

**Deduction Chain — What The Bug List Didn't Say:**

1. **Row-Level Security (RLS) is Either Missing or Permissive.** If unauthenticated `sendBeacon` calls (SEC-004) are reaching Supabase and getting rejected with 401, that means the *only* thing stopping unauthorized data access is the Supabase auth middleware, not RLS policies on the tables themselves. If RLS were properly configured per-table, the 401 would be redundant — the query would succeed but return zero rows. The fact that the system relies on auth tokens rather than RLS means a compromised or reused token grants unrestricted table access.

2. **The Exposed API Keys Are Already Compromised.** SEC-002 and SEC-003 report that the NVIDIA API key and Supabase anon key are hardcoded in the JS bundle. Every user who has ever opened DevTools on this app can see these keys. The NVIDIA key must be rotated immediately. The Supabase anon key should be treated as public (it's designed to be), but the app must ensure RLS policies are tight enough that the anon key alone cannot access sensitive data.

3. **The Registration Flow Has No Server-Side Validation.** The DevTools step-bypass bug reveals that field validation (MCI number, etc.) is enforced only by React state. This means a POST request with missing mandatory fields will succeed if the Supabase table doesn't have `NOT NULL` constraints on those columns. Given BUG-E's evidence that NULL inserts are happening, those constraints are likely missing.

4. **Account Enumeration is Trivially Possible.** With `shouldCreateUser: true` on OTP, any email address can be tested — if OTP sends successfully, the email is valid. Combined with zero server-side rate limiting (BUG-T confirms rate limiting is localStorage-based), an attacker can enumerate all registered emails.

**Unseen Damage Guaranteed to Exist:**
- Phantom accounts created by the `shouldCreateUser: true` setting that are polluting the user count.
- The NVIDIA API key may already have unauthorized usage charges.
- Doctor profiles with missing mandatory fields that passed the client-side-only validation.

---

### Disease 3: The "Optimistic Silence" Anti-Pattern

**Bug Cluster:** BUG-B (fake validation saves anyway), Idempotency fire-and-forget key, Quiz silent bail-out, Exam `catch(_)` error eater, Exam empty dropdown silent failure, Spaced Rep direct DB update without `.catch()`.

**Root Cause:** The codebase has a systemic pattern of `catch and continue` — errors are caught but the code proceeds as if nothing happened. This is architecturally more dangerous than having no error handling at all, because:
- Sentry/monitoring never sees the error (confirmed: "Sentry ko error nahi jata").
- The user never sees the error (a generic toast replaces all specifics).
- The data is corrupted silently rather than failing loudly.

**Deduction Chain:**

1. **BUG-B is Not Just One Bug — It's a Pattern.** `validateInsert` using `.safeParse()` that warns but saves anyway means the Zod validation layer is effectively a no-op. Any future developer who adds Zod validation elsewhere will assume it enforces data integrity, but if the pattern is `warn and proceed`, every new schema is equally useless. The `validateInsert` function itself is the bug — it must throw, not warn.

2. **The Idempotency System is Completely Broken.** Three separate bugs compound into total failure: (a) the check query errors and the code inserts anyway, (b) the key save has no `.catch()` or `await`, (c) the TOCTOU race means two simultaneous requests both pass the check. The result: the idempotency system creates a false sense of safety while providing none.

3. **Error Classification is Impossible.** `catch(_)` discards the error object entirely. A network timeout, a 403 auth failure, a 500 server error, and a validation error all produce the identical generic toast. This means debugging production issues requires reproducing them locally — there is no telemetry, no error classification, no way to distinguish a server outage from a code bug.

**Unseen Damage Guaranteed to Exist:**
- Duplicate exam submissions and quiz attempts in the database from the broken idempotency.
- Quiz scores of 0 in the database that were actually caused by the stale closure bug, not by student performance.
- An unknowable number of silently swallowed errors that have corrupted data in ways that haven't been discovered yet.

---

### Disease 4: State Lifecycle Mismanagement

**Bug Cluster:** BUG-C (global `_dashCache` survives logout), BUG-J (auth race condition), BUG-O (navigator in Zustand), BUG-N (uncached callbacks → full re-render), Quiz stale closure (0 score), Quiz unmounted state leak, Spaced Rep stale `userId` closure, BUG-P (toast setTimeout leaks).

**Root Cause:** The app has no unified state architecture. Data lives in at least 5 different locations simultaneously: Zustand store, module-level variables (`_dashCache`), `localStorage`, component-local `useState`, and `setInterval`/`setTimeout` closures. There is no contract for what gets cleaned up when, and no single place where logout cleanup occurs.

**Deduction Chain:**

1. **BUG-C is a Cross-User Data Leak.** A module-level `Map` that survives logout means Doctor A's dashboard data is visible to Doctor B if they log in on the same browser without a full page refresh. In a medical application, this is a **patient data exposure risk** — if dashboard data includes patient counts, case summaries, or any PHI, this is a compliance violation.

2. **BUG-J Reveals Missing Auth Initialization Architecture.** The race between `onAuthStateChange` and `getSession()` means the auth listener is being set up inside a component's `useEffect`, not at the app root as a singleton. This causes `isAuthLoading` to flicker, producing login screen flashes for already-authenticated users. The fix is architectural: auth must initialize once, outside React, and expose a promise that the React tree awaits before rendering.

3. **The Quiz Stale Closure is the Most Dangerous Bug in the App.** A student completes an entire quiz, their timer expires, and the auto-submit fires with the answers captured at timer start (empty). The student's real answers are discarded. Their score is recorded as 0. They have no way to know this happened or retry. For a medical exam preparation platform, this directly undermines the core product value.

4. **BUG-O (Navigator in Zustand) Breaks DevTools and Hydration.** Storing a function reference in Zustand means: (a) Zustand DevTools can't serialize the state for inspection, (b) if Zustand persistence is ever enabled, the serialization will fail or produce a meaningless value, and (c) any middleware that clones state (like immer) will break on the function reference.

**Unseen Damage Guaranteed to Exist:**
- Students with incorrect quiz/exam scores due to the stale closure bug who have no way to know their real scores.
- Memory leaks from every `setTimeout`/`setInterval` that isn't cleaned up on unmount, accumulating over long sessions.
- Potential cross-user data exposure from `_dashCache` in shared device scenarios (hospital computers, shared tablets).

---

### Disease 5: The Content Pipeline is Untyped End-to-End

**Bug Cluster:** BUG-F (correct vs. correct_key), BUG-X (admin builder ↔ student renderer mismatch), BUG-S (regex JSON parse fails on nesting).

**Root Cause:** Content — the core product of a medical education platform — flows through an untyped pipeline. The admin creates content in one shape, it's stored with ambiguous field names, and the student renderer interprets it with different assumptions. There is no shared schema between creation and consumption.

**Deduction Chain:**

1. **BUG-F Proves There's No Single Source of Truth for Question Schema.** `ExamPage` reads `q.correct` while `QuizPlayer` reads `q.correct_key`. This means either: (a) the DB has both columns and they contain different values, or (b) one component is reading a field that doesn't exist and getting `undefined`. Either way, the question schema is ambiguous, and any new feature that touches questions will have a 50/50 chance of using the wrong field name.

2. **BUG-S Proves AI Responses Are Parsed Unsafely.** Using regex to extract JSON from an AI response is inherently fragile — regex cannot parse nested structures. The correct approach is structured output (JSON mode) from the AI provider, followed by `JSON.parse()`, followed by Zod validation. The current regex approach means every AI feature is one nested object away from crashing.

3. **BUG-X Means Content Creation is a Trust Exercise.** If the admin builder produces content that the student renderer can't handle, then every piece of content is a potential crash on the student side. Without shared schema validation at save time, the admin has no way to know they've created broken content.

---

### Disease 6: PWA and Theme Infrastructure Debt (BUG-V, BUG-W)

**Root Cause:** These aren't code bugs — they're missing infrastructure. The PWA install flow requires a correctly configured `manifest.json`, a registered Service Worker, HTTPS, and proper icon assets. The theme system requires centralized CSS variables instead of scattered Tailwind classes.

**Deduction:** The theme fracturing (BUG-W) is almost certainly the result of incremental feature development where each developer chose their own dark mode approach. Some components use `dark:` Tailwind variants, some use `data-theme` attribute selectors, and some have hardcoded hex colors. A systematic audit will likely reveal 3+ competing theme mechanisms in the same app.

---

### Disease 7: Missing Edge-Case Handling Across All Flows

**Bug Cluster:** Exam permanent hang (no timeout), crash on `toLowerCase()` of undefined, NaN progress bar (division by zero), missing `.single()` guard, BUG-A (AI navigation to invalid page), BUG-H (duplicate notifications), BUG-I (user truncation at 200), BUG-L (minimum 1-minute timer), BUG-M (kahoot blank route), BUG-U (dead admin tab).

**Root Cause:** These are the accumulated debris of features built without defensive programming. Each is individually minor but collectively they create an app that feels fragile and untrustworthy.

**Deduction:** The sheer number of missing guards (null checks, timeout handlers, division-by-zero protection, whitelist validation) suggests the codebase was never subjected to edge-case testing. A systematic "what if X is null/undefined/zero/empty" audit across all critical flows will likely reveal additional unreported issues beyond what's listed.

---

## ═══════════════════════════════════════════════════════════════
## SECTION 1 — BUG-TO-PHASE CROSS-REFERENCE MAP
## ═══════════════════════════════════════════════════════════════

Every bug is mapped to exactly one phase. No bug is fixed twice. No bug is forgotten.

| Bug ID | Description | Phase | Step | Disease |
|--------|-------------|-------|------|---------|
| **PHASE 0 — Environment** | | | | |
| — | Git safety net, manual audits, surgery log | 0 | 0.1–0.6 | — |
| **PHASE 1 — Security & Service Layer** | | | | |
| SEC-001 | OTP bypass for pending/rejected doctors | 1 | 1.3 | D2 |
| SEC-002 | NVIDIA API key exposed in bundle | 1 | 1.2 | D2 |
| SEC-003 | Supabase key hardcoded as string | 1 | 1.2 | D2 |
| SEC-004 | sendBeacon without auth token | 1 | 1.5 | D2 |
| SEC-005 | shouldCreateUser allows fake accounts | 1 | 1.3 | D2 |
| BUG-C | Cross-user cache leak on logout | 1 | 1.4 | D4 |
| BUG-G | 54 direct supabase.from() calls | 1 | 1.1 | D1 |
| BUG-T | OTP rate limit in localStorage | 1 | 1.3 | D2 |
| **PHASE 2 — Data Integrity & Typing** | | | | |
| BUG-B | Fake validation (warn but save) | 2 | 2.1 | D3 |
| BUG-E | camelCase→snake_case DB leak | 2 | 2.1 | D1 |
| BUG-F | correct vs. correct_key mismatch | 2 | 2.2 | D5 |
| BUG-Q | AuditLog accepts empty string | 2 | 2.1 | D3 |
| BUG-D | Phantom offline registration | 2 | 2.4 | D3 |
| IDEM-1 | DB error → duplicate insert | 2 | 2.3 | D3 |
| IDEM-2 | Fire-and-forget key save | 2 | 2.3 | D3 |
| IDEM-3 | TOCTOU race on payload_hash | 2 | 2.3 | D3 |
| REG-1 | DevTools step bypass | 2 | 2.5 | D2 |
| **PHASE 3 — State Management & Logic** | | | | |
| BUG-J | Auth state race condition (login flicker) | 3 | 3.1 | D4 |
| BUG-O | Navigator function in Zustand | 3 | 3.4 | D4 |
| BUG-N | Uncached callbacks → re-render cascade | 3 | 3.4 | D4 |
| BUG-A | AI navigation to invalid page | 3 | 3.5 | D7 |
| BUG-H | Duplicate notifications | 3 | 3.5 | D7 |
| BUG-I | User list truncated at 200 | 3 | 3.5 | D7 |
| BUG-L | Minimum 1-minute timer | 3 | 3.5 | D7 |
| BUG-K | 9 uncancelled API calls | 3 | 3.5 | D1 |
| BUG-S | Regex JSON parse breaks on nesting | 3 | 3.5 | D5 |
| QUIZ-1 | Stale closure → 0 score on timeout | 3 | 3.2 | D4 |
| QUIZ-2 | Unmounted state leak (350ms timeout) | 3 | 3.2 | D4 |
| QUIZ-3 | Silent bail-out on null quiz | 3 | 3.2 | D7 |
| QUIZ-4 | Missing .single() error guard | 3 | 3.2 | D7 |
| EXAM-1 | Permanent hang (no AI timeout) | 3 | 3.3 | D7 |
| EXAM-2 | Crash on undefined.toLowerCase() | 3 | 3.3 | D7 |
| EXAM-3 | catch(_) silent error eater | 3 | 3.3 | D3 |
| EXAM-4 | Empty dropdown on network error | 3 | 3.3 | D7 |
| SR-1 | NaN progress bar (0/0 division) | 3 | 3.3 | D7 |
| SR-2 | Stale userId closure | 3 | 3.3 | D4 |
| SR-3 | Direct DB update without .catch() | 3 | 3.3 | D1 |
| BUG-P | Toast setTimeout memory leaks | 3 | 3.4 | D4 |
| **PHASE 4 — UI/UX, Theme, PWA** | | | | |
| BUG-V | PWA install flow missing | 4 | 4.2 | D6 |
| BUG-W | Theme fracturing across app | 4 | 4.1 | D6 |
| BUG-X | Content admin ↔ student mismatch | 4 | 4.3 | D5 |
| BUG-M | Kahoot route blank screen | 4 | 4.4 | D7 |
| BUG-U | Dead admin kahoot tab | 4 | 4.4 | D7 |

---

## ═══════════════════════════════════════════════════════════════
## SECTION 2 — GLOBAL RULES (NEVER VIOLATE THESE)
## ═══════════════════════════════════════════════════════════════

### Persona & Engagement Model

You are **iConnect-Surgeon**, a senior full-stack engineer specializing in React 19, Supabase (PostgreSQL + Realtime + Storage + Edge Functions), Zustand, Zod, and Tailwind CSS 3. Your mission is zero-regression surgical repair of a live medical education platform.

### The 10 Commandments

1. **No `git push`** — ever. Only `git add` + `git commit`. Ayush pushes manually after review.
2. **Hard Stop Protocol** — After finishing each phase, print `═══ PHASE N COMPLETE ═══` and STOP. Do NOT continue until Ayush types "next".
3. **Read Before Write** — Always `cat` or read a file before editing it. Never edit blind. Never assume file contents from memory.
4. **Blast Radius Report** — Before modifying ANY file, produce a report listing every component, hook, utility, and route that imports from or depends on the code being changed. Ayush verifies the list. If a dependency is missed, we catch it here — not after deployment.
5. **Complete Functions, Not Patches** — Every function written must be production-grade: `try/catch/finally` on every async operation, explicit error paths, meaningful error messages. No 2-line hacks. No `catch(_)`.
6. **No Silent Failures** — Every error path must either: (a) show the user a meaningful message, (b) log to a monitoring service, or (c) both. `console.log` in production is not monitoring.
7. **Backup Before Surgery** — For files >500 lines, create a `.bak` copy first: `cp File.jsx File.jsx.bak`.
8. **Build After Every Step** — Run `npm run build` after each numbered step. If it fails, fix the error before proceeding. Do NOT skip build checks.
9. **No New Dependencies Without Permission** — Use only packages already in `package.json`. If absolutely needed, ask Ayush first.
10. **Surgery Log** — Every change gets documented in `SURGERY_LOG.md` with: the bug ID, the file changed, what was changed, the blast radius, and how to verify.

### Tech Stack Reference

| Layer | Technology | Version |
|-------|-----------|---------|
| UI Framework | React | 19.x |
| Build Tool | Vite | 7.x |
| Styling | Tailwind CSS | 3.x |
| Animations | Framer Motion | 12.x |
| Icons | Lucide React | latest |
| Backend | Supabase | 2.x |
| AI Primary | NVIDIA Llama 3.1-70B | via REST API |
| AI Fallback | Google Gemini | via Supabase Edge Function |
| State | Zustand | (to be used/installed) |
| Validation | Zod | (to be used/installed) |
| PWA | vite-plugin-pwa | 1.x |

### Commit Message Format

```
type: Phase N.Step — short description

- What changed and why
- Blast radius: which components are affected
- Verify: how to confirm the fix works

Co-Authored-By: Claude <noreply@anthropic.com>
```

Types: `sec` (security), `fix` (bug fix), `refactor` (architecture), `feat` (new capability), `docs` (documentation)

---

## ═══════════════════════════════════════════════════════════════
## SECTION 3 — PHASE 0: ENVIRONMENT & ALIGNMENT (THE SAFETY NET)
## ═══════════════════════════════════════════════════════════════

**Objective:** Establish rollback infrastructure, catalog unseen bugs via manual audit, and create the surgical workspace. No code changes to the application in this phase.

### Step 0.1 — Git Safety Net

```bash
# Tag current production for instant rollback
git tag v-pre-surgery -m "Snapshot before architectural surgery"

# Create isolated surgery branch
git checkout -b surgery/main

# All subsequent work happens in feature branches off surgery/main
# Phase 1 work → surgery/phase-1-security
# Phase 2 work → surgery/phase-2-integrity
# etc.
```

**Rationale:** If any phase goes catastrophically wrong, `git checkout v-pre-surgery` restores the entire app in one command. Feature branches per phase allow selective cherry-picking if only parts of a phase are needed.

### Step 0.2 — Create Surgery Log

Create file: `SURGERY_LOG.md` at project root.

```markdown
# iConnect Surgery Log

## Format
| Date | Bug ID | File Changed | What Changed | Blast Radius | Verification |
|------|--------|-------------|-------------|-------------|-------------|

## Phase 1 — Security & Service Layer
(entries will be added as work progresses)

## Phase 2 — Data Integrity & Typing
(entries will be added as work progresses)

## Phase 3 — State Management & Logic
(entries will be added as work progresses)

## Phase 4 — UI/UX, Theme, PWA
(entries will be added as work progresses)
```

### Step 0.3 — Manual PWA Audit (BUG-V)

**Ayush's homework.** This cannot be diagnosed from code alone.

Open the app on:
- **Android Chrome** (physical device, not emulator)
- **iOS Safari** (physical device)
- **Desktop Chrome** (Lighthouse PWA audit)

Document with screenshots:

| Check | Expected | Actual | Screenshot |
|-------|----------|--------|-----------|
| `manifest.json` served at correct URL | 200 OK | ? | |
| `manifest.json` Content-Type | `application/manifest+json` | ? | |
| `manifest.json` has `name` and `short_name` | Non-empty strings | ? | |
| `manifest.json` has `start_url` matching app root | `/` or `/index.html` | ? | |
| `manifest.json` has `display: "standalone"` | `standalone` | ? | |
| Icons at 192x192 and 512x512 present | Both present | ? | |
| `theme_color` and `background_color` set | Hex values | ? | |
| Service Worker registered | `navigator.serviceWorker.controller` is truthy | ? | |
| Service Worker scope covers entire app | Scope is `/` | ? | |
| `beforeinstallprompt` event fires (Android Chrome) | Event captured | ? | |
| Lighthouse PWA score | ≥ 90 | ? | |

### Step 0.4 — Manual Theme Audit (BUG-W)

**Ayush's homework.** Walk through every screen in both Light and Dark mode.

Screens to audit (capture screenshot of each in both modes):

1. Login page
2. Registration page
3. Doctor Dashboard
4. E-Books grid
5. E-Book reader
6. Exam page (subject selection + quiz in progress)
7. Leaderboard
8. Activity page
9. Notifications
10. Profile/Settings
11. Admin Dashboard (SA)
12. Broadcast page (CA)
13. Chat/Doubt bot
14. Study Plan

For each screen, note:
- Any text that becomes invisible (dark text on dark background or vice versa)
- Any hardcoded white/black backgrounds that don't respond to theme toggle
- Any components using inconsistent theme mechanisms (`dark:` vs `data-theme` vs hardcoded)

**Deliverable:** A spreadsheet with screen name, screenshot, and list of broken elements. This becomes the Phase 4 remediation checklist.

### Step 0.5 — Manual Content Pipeline Audit (BUG-X)

**Ayush's homework.**

1. In the Content Admin panel, create one of each content type (MCQ, explanation, case study, etc.).
2. For each, load the student-facing view.
3. Document every rendering mismatch, broken layout, or missing element.
4. Record the exact JSON structure the admin builder produces and the exact JSON structure the student renderer expects.

**Deliverable:** Side-by-side screenshots and JSON samples for each content type.

### Step 0.6 — Codebase Reconnaissance

Before any code changes, run these diagnostic commands and record the output:

```bash
# Count direct Supabase calls (confirms BUG-G scope)
grep -rn "supabase\.from(" src/ --include="*.jsx" --include="*.js" | wc -l

# Find all files with hardcoded hex colors (Theme audit)
grep -rn "#[0-9A-Fa-f]\{6\}" src/ --include="*.jsx" --include="*.js" | wc -l

# Find all catch(_) or catch(e) that don't log the error
grep -rn "catch\s*(" src/ --include="*.jsx" --include="*.js" | head -50

# Find all setTimeout/setInterval without cleanup
grep -rn "setTimeout\|setInterval" src/ --include="*.jsx" --include="*.js" | wc -l

# Find all module-level variables (potential cache leak candidates like _dashCache)
grep -rn "^const \|^let \|^var " src/ --include="*.jsx" --include="*.js" | grep -v "import\|export\|from\|require" | head -30

# Find all .env references vs hardcoded strings
grep -rn "NVIDIA\|nvidia" src/ --include="*.jsx" --include="*.js"
grep -rn "supabase" src/ --include="*.js" | grep -v "from\|import\|node_modules"

# Measure God Files (any file > 500 lines)
find src/ -name "*.jsx" -o -name "*.js" | xargs wc -l | sort -rn | head -20

# Find sendBeacon calls
grep -rn "sendBeacon" src/ --include="*.jsx" --include="*.js"

# Find localStorage usage (potential security/state issues)
grep -rn "localStorage" src/ --include="*.jsx" --include="*.js" | wc -l
```

Record all output in `SURGERY_LOG.md` under a "Reconnaissance" section. This is our baseline.

```
═══ PHASE 0 COMPLETE ═══
STOP HERE. Wait for Ayush to provide the manual audit results and say "next".
```

---

## ═══════════════════════════════════════════════════════════════
## SECTION 4 — PHASE 1: CONTAINMENT & SECURITY (THE FOUNDATION)
## ═══════════════════════════════════════════════════════════════

**Objective:** Seal every security hole and build the centralized service layer that all subsequent phases depend on. Nothing else can be safely fixed until this layer exists.

**Branch:** `surgery/phase-1-security`

### Step 1.1 — Build `dbService.js` (Kills Disease 1: The 54 Direct Calls)

**Blast Radius Report Required Before Starting:** List every file that currently contains `supabase.from(`. These are all future migration targets.

Create file: `src/lib/dbService.js`

This module becomes the **ONLY** legal way for any component to talk to Supabase. It is a thin, disciplined wrapper that enforces the following in exactly one place:

**1.1a — Core Architecture:**

```
Component → dbService.query('table', options) → camelCase↔snake_case transform
                                               → Auth token verification
                                               → AbortController attachment
                                               → try/catch with structured error return
                                               → Retry logic for idempotent reads
                                               → Supabase call
                                               → Response normalization
```

**1.1b — The Case Transformer:**

Create two pure utility functions (no dependencies, easily testable):

```javascript
// camelCase → snake_case for writes to DB
function toSnakeCase(obj) { /* recursive key transform */ }

// snake_case → camelCase for reads from DB
function toCamelCase(obj) { /* recursive key transform */ }
```

These are called automatically by `dbService` on every write (toSnakeCase) and every read (toCamelCase). No component ever needs to think about case conversion again. **This kills BUG-E.**

**1.1c — The Error Wrapper:**

Every `dbService` method returns a consistent shape:

```javascript
{ data: T | null, error: string | null, status: 'ok' | 'error' | 'aborted' }
```

Never throw. Never swallow. The caller always gets a clean object to inspect. **This kills the "Optimistic Silence" disease for all future DB calls.**

**1.1d — The AbortController:**

Every query method accepts an optional `AbortSignal`. If the signal fires (component unmounted), the Supabase request is cancelled and the method returns `{ data: null, error: null, status: 'aborted' }`. **This kills BUG-K's 9 uncancelled calls** — but only for components that are migrated to use `dbService`.

**1.1e — Migration Strategy (CRITICAL):**

We do NOT migrate all 54 call sites in this step. That would be a massive, risky change. Instead:

1. Build `dbService.js` with full tests.
2. Migrate the **5 most critical call sites first** (identified by the reconnaissance grep):
   - The DoctorDashboard's 9 concurrent fetches
   - The registration profile insert (fixes BUG-E)
   - The exam attempt insert (idempotency critical path)
   - The activity log insert (fixes SEC-004)
   - The notification fetch (fixes BUG-H dedup)
3. Verify each migration with a build + manual test.
4. Remaining call sites are migrated incrementally across Phase 2 and 3, as we touch those files for other bugs.

**Every migrated call site gets logged in `SURGERY_LOG.md`.**

Commit: `refactor: Phase 1.1 — create dbService.js centralized data layer + migrate 5 critical paths`

---

### Step 1.2 — Secure API Keys (Kills SEC-002, SEC-003)

**Blast Radius Report:** Identify every file that references `NVIDIA`, `nvidia`, or contains a hardcoded Supabase URL/key string.

**1.2a — NVIDIA API Key:**

The key must never touch the browser. Strategy:

1. Create a Supabase Edge Function: `supabase/functions/ai-proxy/index.ts`
   - Accepts: `{ action, payload, maxTokens }` + valid JWT in Authorization header
   - Reads NVIDIA key from Edge Function environment variable (set via Supabase dashboard)
   - Calls NVIDIA API server-side
   - Returns response to client
   - Includes: 15-second timeout, structured error response, rate limiting (30 req/user/min)

2. Until the Edge Function is deployed, create the spec as a document:
   `src/docs/AI_EDGE_FUNCTION_SPEC.md`

3. In `src/lib/aiService.js`:
   - Remove the hardcoded NVIDIA_API_KEY constant
   - Remove the NVIDIA_BASE_URL constant
   - Replace `callNvidia()` with a call to the Edge Function
   - Add a `USE_EDGE_FUNCTION` flag (default `false`) for incremental rollout
   - Keep the old direct-call path as `callNvidiaDirect()` behind the flag

**1.2b — Supabase Anon Key:**

1. Move to environment variable: `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `.env`
2. Verify `.env` is in `.gitignore`
3. Update `src/lib/supabase.js` to read from `import.meta.env`
4. **Rotate the current key** — it's been exposed in the JS bundle. Document this as a manual step for Ayush in the Supabase dashboard.

Commit: `sec: Phase 1.2 — move NVIDIA key to Edge Function + env vars for Supabase`

---

### Step 1.3 — Lock the Auth Gate (Kills SEC-001, SEC-005, BUG-T)

**Blast Radius Report:** Identify every file that touches OTP logic, `signInWithOtp`, session checking, or user creation.

**1.3a — Kill Fake Account Creation (SEC-005):**

In the OTP configuration:
```javascript
// BEFORE (dangerous):
shouldCreateUser: true

// AFTER (secure):
shouldCreateUser: false
```

New accounts go through an explicit registration flow only. The OTP endpoint becomes login-only.

**1.3b — Block Pending/Rejected Doctors (SEC-001):**

After OTP verification succeeds, before granting app access:

```javascript
// Pseudocode — actual implementation after reading the file
const { data: profile } = await dbService.query('profiles', {
  filter: { id: session.user.id },
  single: true
});

if (!profile) {
  await supabase.auth.signOut();
  showMessage('No profile found. Please register first.');
  return;
}

if (profile.status === 'pending') {
  await supabase.auth.signOut();
  showMessage('Your account is pending approval.');
  return;
}

if (profile.status === 'rejected') {
  await supabase.auth.signOut();
  showMessage('Your account has been rejected. Contact support.');
  return;
}
```

This is **server-side enforcement** (the signOut is real), not UI gating.

**1.3c — Move OTP Rate Limiting Server-Side (BUG-T):**

Delete the localStorage-based rate limiting entirely. Replace with:

1. Client-side: disable the "Send OTP" button for 60 seconds after sending (UX convenience only, not security).
2. Server-side: document the requirement for Supabase Auth config `RATE_LIMIT_EMAIL_SENT=5` per hour per email.
3. Create spec: `src/docs/OTP_RATE_LIMIT_SPEC.md` with Cloudflare WAF rule recommendations.

Commit: `sec: Phase 1.3 — block unverified doctors + kill fake accounts + server-side OTP limits`

---

### Step 1.4 — Kill the Global Cache Leak (Kills BUG-C)

**Blast Radius Report:** Identify every module-level variable in the codebase that could hold user-specific data.

**1.4a — Delete `_dashCache`:**

The module-level `Map` in DoctorDashboard must be destroyed. Replace with one of:

- A Zustand slice with an explicit `reset()` action called during logout, OR
- A cache inside `dbService.js` that is keyed by `userId` and has a `clearAll()` method called on auth state change to `SIGNED_OUT`.

**1.4b — Audit All Module-Level Variables:**

The reconnaissance grep from Phase 0.6 identified module-level `const`/`let`/`var` declarations. For each:

- If it holds user-specific data → move to Zustand or `dbService` cache with logout cleanup.
- If it's a pure configuration constant (no user data) → leave it.
- If it's a mutable cache (Map, Set, Array) → add logout cleanup.

**1.4c — Create a Centralized Logout Cleanup Function:**

```javascript
// src/lib/logout.js
export async function performLogout() {
  // 1. Clear all Zustand stores
  useAuthStore.getState().clearAuth();
  useAppStore.getState().reset();
  // 2. Clear dbService cache
  dbService.clearCache();
  // 3. Clear any other module-level caches
  // 4. Sign out from Supabase
  await supabase.auth.signOut();
  // 5. Navigate to login
}
```

Every logout trigger in the app calls this single function. No more scattered cleanup.

Commit: `sec: Phase 1.4 — eliminate cross-user cache leak + centralized logout cleanup`

---

### Step 1.5 — Fix sendBeacon (Kills SEC-004)

**Blast Radius Report:** Find all `sendBeacon` calls.

**Strategy:**

`navigator.sendBeacon` cannot attach custom headers (including auth tokens). It's fundamentally incompatible with authenticated Supabase endpoints.

Replace with:

1. **Primary:** On `visibilitychange` event (when `document.visibilityState === 'hidden'`), call `dbService` normally. This works for tab switching and most tab closes.

2. **Fallback:** On `beforeunload`, queue the data in `localStorage` (keyed by a UUID). On next app load, check for queued data and flush it with proper auth.

3. **The data being sent:** Activity logs / time-tracking data. These should go through the batched `trackActivity` system (which should use `dbService` after this phase).

Commit: `sec: Phase 1.5 — replace unauthenticated sendBeacon with auth-aware flush`

---

### Phase 1 — Verification Checklist

```
[ ] npm run build succeeds with zero errors
[ ] grep -r "NVIDIA_API_KEY" src/ returns 0 hardcoded values (only env references)
[ ] grep -r "shouldCreateUser: true" src/ returns 0 results
[ ] dbService.js exists and is used by 5+ components
[ ] Module-level _dashCache is deleted
[ ] A centralized logout function exists and clears all caches
[ ] sendBeacon calls are replaced with auth-aware alternatives
[ ] SURGERY_LOG.md has entries for every change made
```

Commit: `milestone: Phase 1 complete — security sealed, service layer established`

```
═══ PHASE 1 COMPLETE ═══
STOP HERE. Wait for Ayush to say "next".
```

---

## ═══════════════════════════════════════════════════════════════
## SECTION 5 — PHASE 2: DATA INTEGRITY & TYPING (THE SKELETON)
## ═══════════════════════════════════════════════════════════════

**Objective:** Ensure no malformed data enters or leaves the database. Create a single source of truth for every data schema. Make invalid states unrepresentable.

**Branch:** `surgery/phase-2-integrity`

### Step 2.1 — Zod Schemas as the Single Source of Truth

**Install if needed:** `npm install zod` (check package.json first).

Create directory: `src/schemas/`

Create one Zod schema per domain entity. Each schema has two forms:

```javascript
// src/schemas/profile.js

import { z } from 'zod';

// Frontend form shape (camelCase)
export const ProfileFormSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  mciNumber: z.string().min(1, 'MCI number is required'),
  phone: z.string().max(20).optional(),
  speciality: z.string().max(100).optional(),
  college: z.string().max(200).optional(),
  state: z.string().max(100).optional(),
});

// Database row shape (snake_case) — used by dbService internally
export const ProfileDBSchema = z.object({
  first_name: z.string().min(1),
  last_name: z.string().min(1),
  mci_number: z.string().min(1),
  phone: z.string().max(20).optional(),
  speciality: z.string().max(100).optional(),
  college: z.string().max(200).optional(),
  state: z.string().max(100).optional(),
});
```

**The critical change to `validateInsert`:**

```javascript
// src/schemas/validate.js

export function validateInsert(schema, data) {
  const result = schema.safeParse(data);
  if (!result.success) {
    const firstIssue = result.error.issues[0];
    // THROW, not warn. This is the fix for BUG-B.
    throw new Error(`Validation failed: ${firstIssue.path.join('.')} — ${firstIssue.message}`);
  }
  return result.data; // cleaned, validated, stripped of unknown fields
}
```

**Schemas to create (one file each in `src/schemas/`):**

| File | Entity | Used By |
|------|--------|---------|
| `profile.js` | Profile insert/update | Registration, ProfilePage |
| `question.js` | Question schema (resolves BUG-F) | ExamPage, QuizPlayer, Admin builder |
| `examAttempt.js` | Exam attempt insert | ExamPage, QuizPlayer |
| `activityLog.js` | Activity log insert | trackActivity.js |
| `artifact.js` | Artifact insert | UploadPage |
| `notification.js` | Notification insert | BroadcastPage |
| `calendarDiary.js` | Diary entry upsert | ActivityPage |
| `auditLog.js` | Audit log insert (fixes BUG-Q) | AuditLog component |
| `spacedRepCard.js` | Flashcard insert/update | SpacedRepetition |
| `index.js` | Barrel export | All consumers |

Commit: `feat: Phase 2.1 — Zod schema library + validateInsert that THROWS on invalid data`

---

### Step 2.2 — Unify the Question Schema (Kills BUG-F)

**Blast Radius Report:** Find every reference to `q.correct`, `q.correct_key`, `correct`, `correct_key`, and `correctAnswer` across the entire codebase.

**Strategy:**

1. Determine which column actually exists in the database. Check the `exam_questions` table schema.
2. Pick ONE canonical name. If the DB column is `correct`, use `correct`. If it's `correct_key`, use `correct_key`.
3. Create the Zod schema with the canonical name.
4. Update EVERY reference across ExamPage, QuizPlayer, and any other consumer to use the canonical name.
5. If both columns exist in the DB, create a migration to consolidate (copy data from one to the other, then drop the duplicate).

**The schema becomes the arbiter:**

```javascript
// src/schemas/question.js
export const QuestionSchema = z.object({
  id: z.number().int().positive(),
  subjectId: z.number().int().positive(),
  question: z.string().min(1),
  optionA: z.string().min(1),
  optionB: z.string().min(1),
  optionC: z.string().min(1),
  optionD: z.string().min(1),
  correct: z.enum(['a', 'b', 'c', 'd']),  // THE canonical field name
  explanation: z.string().optional(),
});
```

Both ExamPage and QuizPlayer import this schema. The ambiguity is physically eliminated.

Commit: `fix: Phase 2.2 — unify question correct answer field to single canonical name`

---

### Step 2.3 — Fix Idempotency TOCTOU (Kills All Idempotency Bugs)

**Strategy:** Move duplicate prevention from application-level check (which has the TOCTOU race) to database-level constraint (which is atomic).

**2.3a — Database Migration:**

```sql
-- Add UNIQUE constraint on payload_hash
ALTER TABLE [relevant_table] ADD CONSTRAINT uq_payload_hash UNIQUE (payload_hash);
```

**2.3b — Insert Pattern:**

```javascript
// Use ON CONFLICT instead of check-then-insert
const { data, error } = await dbService.insert('table', payload, {
  onConflict: 'payload_hash',
  onConflictAction: 'ignore' // or 'update' if appropriate
});

if (data && data.length === 0) {
  // Duplicate detected — handle gracefully
  return { duplicate: true };
}
```

**2.3c — Fix the fire-and-forget key save:**

Add proper `await` and error handling to the idempotency key save. Wrap in `try/catch`. Log failures.

Commit: `fix: Phase 2.3 — atomic idempotency via DB constraint, eliminate TOCTOU race`

---

### Step 2.4 — Fix Phantom Offline Registration (Kills BUG-D)

**Strategy:**

1. On next app load, check `localStorage` for pending registrations.
2. Attempt to sync to server.
3. If sync fails: show a persistent, non-dismissible banner: "Your account hasn't been created yet. Connect to the internet and try again."
4. **Critical:** The user must NOT be able to use the app in a "pending local" state as if they're registered. The app should show only the registration screen with the banner.

Commit: `fix: Phase 2.4 — sync offline registrations on reconnect, block unsynced usage`

---

### Step 2.5 — Server-Side Registration Validation (Kills REG-1 DevTools Bypass)

**Strategy:**

The registration form's mandatory fields must be enforced at the database level:

1. SQL Migration: Add `NOT NULL` constraints to mandatory profile columns (name, mci_number, etc.).
2. Create a Supabase RPC or Edge Function for registration that validates all fields server-side before inserting.
3. The React form validation becomes UX convenience only — the server is the authority.

Commit: `sec: Phase 2.5 — server-side registration validation, DB NOT NULL constraints`

---

### Phase 2 — Verification Checklist

```
[ ] npm run build succeeds
[ ] src/schemas/ directory exists with schemas for all entities
[ ] validateInsert THROWS on invalid data (test with bad input)
[ ] grep -r "q.correct_key\|q\.correct" shows consistent usage
[ ] Idempotency table has UNIQUE constraint on payload_hash
[ ] No localStorage-only registrations can be used to access the app
[ ] SURGERY_LOG.md updated
```

Commit: `milestone: Phase 2 complete — data integrity enforced at schema + DB level`

```
═══ PHASE 2 COMPLETE ═══
STOP HERE. Wait for Ayush to say "next".
```

---

## ═══════════════════════════════════════════════════════════════
## SECTION 6 — PHASE 3: STATE MANAGEMENT & LOGIC (THE MUSCLES)
## ═══════════════════════════════════════════════════════════════

**Objective:** Eliminate stale closures, race conditions, memory leaks, and lifecycle violations. Make the app resilient to timing edge cases.

**Branch:** `surgery/phase-3-state`

### Step 3.1 — Fix Auth Race Condition (Kills BUG-J)

**Blast Radius Report:** Find `onAuthStateChange`, `getSession()`, `isAuthLoading` across all files.

**Strategy:**

Move auth initialization outside the React tree entirely:

```javascript
// src/lib/auth.js — singleton, runs once at import time

const authReadyPromise = new Promise((resolve) => {
  supabase.auth.onAuthStateChange((event, session) => {
    useAuthStore.getState().setSession(session);
    if (event === 'INITIAL_SESSION') {
      resolve(); // First event = auth is ready
    }
    if (event === 'SIGNED_OUT') {
      performLogout(); // centralized cleanup from Phase 1
    }
  });
});

export { authReadyPromise };
```

In `App.jsx`:

```javascript
const [authReady, setAuthReady] = useState(false);

useEffect(() => {
  authReadyPromise.then(() => setAuthReady(true));
}, []);

if (!authReady) return <FullScreenLoader />;
// ... rest of app
```

This eliminates the race: there's one listener, one promise, one state transition. No flickering.

Commit: `fix: Phase 3.1 — singleton auth initialization eliminates login flicker`

---

### Step 3.2 — Fix Quiz Timer Stale Closure (Kills QUIZ-1, QUIZ-2, QUIZ-3, QUIZ-4)

**Blast Radius Report:** Identify the QuizPlayer component, its timer logic, and the `finish()` function.

**3.2a — Kill the Stale Closure (QUIZ-1):**

The `setInterval` captures `answers` at the time the timer starts. When the timer fires, it submits stale (empty) answers.

**Fix:** Use a `useRef` for the answers:

```javascript
const answersRef = useRef({});

// When user selects an answer:
function selectAnswer(questionId, answer) {
  setAnswers(prev => {
    const next = { ...prev, [questionId]: answer };
    answersRef.current = next; // always keep ref in sync
    return next;
  });
}

// When timer fires:
function onTimeout() {
  submitAnswers(answersRef.current); // reads latest, not stale closure
}
```

**3.2b — Kill the Unmounted State Leak (QUIZ-2):**

The 350ms post-quiz timeout must be tracked and cleaned up:

```javascript
const timeoutRef = useRef(null);
const isMountedRef = useRef(true);

useEffect(() => {
  return () => {
    isMountedRef.current = false;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  };
}, []);

// In the post-quiz handler:
timeoutRef.current = setTimeout(() => {
  if (isMountedRef.current) {
    // safe to update state and call DB
  }
}, 350);
```

**3.2c — Fix the Silent Bail-out (QUIZ-3):**

```javascript
// BEFORE: silent return
if (!quiz) return;

// AFTER: navigate to error state
if (!quiz) {
  addToast('error', 'Quiz data could not be loaded. Please try again.');
  setPage('dashboard'); // or navigate(-1)
  return;
}
```

**3.2d — Fix the Missing .single() Guard (QUIZ-4):**

When `.single()` throws because no quiz was found, catch it and show "Quiz not found":

```javascript
const { data: quiz, error } = await dbService.query('quizzes', {
  filter: { id: quizId },
  single: true
});

if (error || !quiz) {
  addToast('error', 'Quiz not found. It may have been removed.');
  return;
}
```

Commit: `fix: Phase 3.2 — eliminate quiz stale closure, unmounted leak, silent failures`

---

### Step 3.3 — Fix Exam and Spaced Rep Flow Bugs

**3.3a — AI Timeout (EXAM-1):**

```javascript
// In aiService.js — every AI call gets an AbortController with timeout
const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 15000); // 15 seconds

try {
  const response = await fetch(url, { signal: controller.signal, ... });
  clearTimeout(timeout);
  return response;
} catch (e) {
  clearTimeout(timeout);
  if (e.name === 'AbortError') {
    return { text: null, error: 'AI is taking too long. Please try again.' };
  }
  throw e;
}
```

**3.3b — Crash on undefined.toLowerCase() (EXAM-2):**

```javascript
// BEFORE: crashes if q.correct is undefined
const isCorrect = userAnswer.toLowerCase() === q.correct.toLowerCase();

// AFTER: defensive
const correctAnswer = q.correct || q.correct_key || '';
if (!correctAnswer) {
  logError('warn', `Question ${q.id} has no correct answer defined`);
  return false; // or skip this question in scoring
}
const isCorrect = userAnswer.toLowerCase() === correctAnswer.toLowerCase();
```

**3.3c — Replace catch(_) Error Eater (EXAM-3):**

```javascript
// BEFORE:
catch (_) { addToast('error', 'Something went wrong'); }

// AFTER:
catch (error) {
  const message = error?.message || 'Unknown error';
  logError('error', `Exam flow error: ${message}`, {
    component: 'ExamPage',
    questionId: currentQuestion?.id,
    stack: error?.stack?.slice(0, 500)
  });

  if (message.includes('network') || message.includes('fetch')) {
    addToast('error', 'Network issue. Check your connection and try again.');
  } else if (message.includes('auth') || message.includes('401')) {
    addToast('error', 'Session expired. Please log in again.');
  } else {
    addToast('error', 'Something went wrong. The error has been reported.');
  }
}
```

**3.3d — Empty Dropdown Guard (EXAM-4):**

```javascript
// When subjects fail to load:
if (error) {
  addToast('warning', 'Could not load subjects. Retrying...');
  // Auto-retry once after 3 seconds
  setTimeout(() => fetchSubjects(), 3000);
  return;
}
if (!data || data.length === 0) {
  showEmptyState('No subjects available. Please check back later.');
  return;
}
```

**3.3e — NaN Progress Bar (SR-1):**

```javascript
// BEFORE:
const progress = (completed / totalDue) * 100;
// When totalDue is 0 → NaN%

// AFTER:
const progress = totalDue > 0 ? Math.round((completed / totalDue) * 100) : 0;
// When totalDue is 0 → show "All caught up!" state instead of progress bar
```

**3.3f — Stale userId Closure (SR-2):**

Same `useRef` pattern as the quiz fix. Store `userId` in a ref that's always current.

**3.3g — Direct DB Update without .catch() (SR-3):**

Migrate to `dbService` which handles errors centrally. If not yet migrated, add explicit error handling.

Commit: `fix: Phase 3.3 — exam/SR timeouts, crash guards, error classification, NaN prevention`

---

### Step 3.4 — Fix Zustand and React Hygiene (Kills BUG-O, BUG-N, BUG-P)

**3.4a — Remove Navigator from Zustand (BUG-O):**

The `_navigate` function stored in Zustand breaks DevTools serialization and hydration.

Replace with a navigation utility module:

```javascript
// src/lib/navigate.js
let _navigate = null;

export function setNavigator(fn) { _navigate = fn; }
export function navigate(path) { if (_navigate) _navigate(path); }
```

Set the navigator once in App.jsx from `useNavigate()`. Components import `navigate` from the utility, not from Zustand.

**3.4b — Wrap Callbacks in useCallback (BUG-N):**

Identify all callback props in `sharedProps` / `commonProps`. Wrap each in `useCallback` with correct dependency arrays. This stops the full-dashboard re-render cascade.

**3.4c — Track Toast Timeouts (BUG-P):**

```javascript
// In the toast manager, track all timeout IDs
const timeoutIds = useRef(new Map());

function addToast(type, msg) {
  const id = Date.now();
  setToasts(prev => [...prev, { id, type, msg }]);

  const timeoutId = setTimeout(() => {
    removeToast(id);
    timeoutIds.current.delete(id);
  }, 5000);

  timeoutIds.current.set(id, timeoutId);
}

// On unmount, clear all
useEffect(() => {
  return () => {
    timeoutIds.current.forEach(id => clearTimeout(id));
    timeoutIds.current.clear();
  };
}, []);
```

Commit: `fix: Phase 3.4 — remove navigator from Zustand, memoize callbacks, track toast timers`

---

### Step 3.5 — Fix Remaining Logic Bugs

**3.5a — AI Navigation Whitelist (BUG-A):**

```javascript
const VALID_PAGES = ['dashboard', 'ebooks', 'exam', 'leaderboard', 'activity', /* ... */];

function handleAINavigation(suggestedPage) {
  if (VALID_PAGES.includes(suggestedPage)) {
    setPage(suggestedPage);
  } else {
    addToast('info', 'AI suggested an unknown page. Staying here.');
  }
}
```

**3.5b — Deduplicate Notifications (BUG-H):**

In the Zustand notification store, deduplicate by notification ID before rendering:

```javascript
addNotification: (notif) => set(state => {
  if (state.notifications.some(n => n.id === notif.id)) return state; // already exists
  return { notifications: [notif, ...state.notifications] };
}),
```

**3.5c — Remove User Truncation (BUG-I):**

Replace `.limit(200)` with cursor-based pagination or remove the limit entirely (with proper virtualization in the UI to handle large lists).

**3.5d — Fix Minimum Timer (BUG-L):**

Record actual elapsed time in seconds. If a minimum threshold is a product decision, make it configurable and document it — don't hide it in code.

**3.5e — Fix Regex JSON Parse (BUG-S):**

Replace regex-based JSON extraction with:

```javascript
// Ask the AI for JSON output format in the prompt
// Then parse:
try {
  const parsed = JSON.parse(aiResponse);
  return validateInsert(ExpectedSchema, parsed);
} catch {
  // AI didn't return valid JSON — try to extract it
  const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    return JSON.parse(jsonMatch[0]);
  }
  throw new Error('Could not parse AI response as JSON');
}
```

**3.5f — Abort 9 Dashboard Calls on Unmount (BUG-K):**

If these calls are now going through `dbService` (from Phase 1), they automatically get AbortController support. Otherwise, add explicit AbortControllers:

```javascript
useEffect(() => {
  const controller = new AbortController();
  fetchAllDashboardData(controller.signal);
  return () => controller.abort();
}, [userId]);
```

Commit: `fix: Phase 3.5 — AI navigation guard, notification dedup, pagination, timer fix, JSON parse`

---

### Phase 3 — Verification Checklist

```
[ ] npm run build succeeds
[ ] Login does not flicker (auth race fixed)
[ ] Quiz timeout submits actual answers, not empty (test with DevTools throttling)
[ ] AI explainer shows retry button after 15s, not infinite spinner
[ ] ExamPage handles missing correct answer without crashing
[ ] NaN progress bar is impossible (0/0 shows "All caught up")
[ ] Toast timeouts are tracked and cleared on unmount
[ ] Navigator function is not in Zustand store
[ ] SURGERY_LOG.md updated
```

Commit: `milestone: Phase 3 complete — state management, closures, and lifecycle fixed`

```
═══ PHASE 3 COMPLETE ═══
STOP HERE. Wait for Ayush to say "next".
```

---

## ═══════════════════════════════════════════════════════════════
## SECTION 7 — PHASE 4: SKIN, POLISH, & PWA (THE USER EXPERIENCE)
## ═══════════════════════════════════════════════════════════════

**Objective:** Fix everything the user sees and feels. Centralize the theme system. Validate the content pipeline. Achieve a flawless PWA install flow.

**Branch:** `surgery/phase-4-polish`

### Step 4.1 — Centralize Theme System (Kills BUG-W)

**Using Phase 0.4 audit results as the remediation checklist.**

**4.1a — Define CSS Custom Properties:**

```css
/* src/styles/theme.css */

:root {
  /* Surfaces */
  --color-surface: #FFFFFF;
  --color-surface-alt: #F8FAFC;
  --color-surface-elevated: #FFFFFF;

  /* Text */
  --color-text-primary: #1E293B;
  --color-text-secondary: #64748B;
  --color-text-muted: #94A3B8;

  /* Borders */
  --color-border: #E2E8F0;
  --color-border-strong: #CBD5E1;

  /* Brand */
  --color-primary: #2563EB;
  --color-primary-hover: #1D4ED8;
  --color-accent: #7C3AED;
  --color-success: #10B981;
  --color-warning: #F59E0B;
  --color-danger: #EF4444;
}

[data-theme="dark"] {
  --color-surface: #1E1E2E;
  --color-surface-alt: #2A2A3C;
  --color-surface-elevated: #2A2A3C;

  --color-text-primary: #E2E8F0;
  --color-text-secondary: #94A3B8;
  --color-text-muted: #64748B;

  --color-border: #3B3B50;
  --color-border-strong: #4B4B60;
}
```

**4.1b — Systematic Replacement:**

For each component identified in the Phase 0.4 audit:

1. Replace hardcoded `bg-white` → `bg-[var(--color-surface)]`
2. Replace hardcoded `text-gray-900` → `text-[var(--color-text-primary)]`
3. Replace hardcoded `border-gray-200` → `border-[var(--color-border)]`
4. Etc.

Alternatively, extend `tailwind.config.js` with semantic color names that reference the CSS variables:

```javascript
// tailwind.config.js
colors: {
  surface: 'var(--color-surface)',
  'surface-alt': 'var(--color-surface-alt)',
  'text-primary': 'var(--color-text-primary)',
  // etc.
}
```

Then replace: `bg-white → bg-surface`, `text-gray-900 → text-text-primary`.

This is a large but mechanical refactor. Tackle it screen by screen using the audit checklist.

Commit: `refactor: Phase 4.1 — centralize theme system with CSS custom properties`

---

### Step 4.2 — Fix PWA Install Flow (Kills BUG-V)

**Using Phase 0.3 audit results.**

**4.2a — Fix `manifest.json`:**

Verify and fix:
```json
{
  "name": "iConnect Office",
  "short_name": "iConnect",
  "start_url": "/",
  "display": "standalone",
  "theme_color": "#2563EB",
  "background_color": "#FFFFFF",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "/icons/icon-512-maskable.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```

**4.2b — Capture Install Prompt:**

```javascript
// In App.jsx or a top-level component
const [installPrompt, setInstallPrompt] = useState(null);

useEffect(() => {
  const handler = (e) => {
    e.preventDefault(); // Prevent browser's auto-prompt
    setInstallPrompt(e); // Store for later use
  };
  window.addEventListener('beforeinstallprompt', handler);
  return () => window.removeEventListener('beforeinstallprompt', handler);
}, []);

// Install button click handler:
function handleInstall() {
  if (installPrompt) {
    installPrompt.prompt();
    installPrompt.userChoice.then((result) => {
      if (result.outcome === 'accepted') {
        addToast('success', 'App installed!');
      }
      setInstallPrompt(null);
    });
  }
}
```

**4.2c — Verify on Physical Device:**

This MUST be tested on a physical Android device. Chrome DevTools emulation does not reliably trigger `beforeinstallprompt`.

Commit: `feat: Phase 4.2 — fix PWA install flow with proper manifest + install prompt capture`

---

### Step 4.3 — Align Content Pipeline (Kills BUG-X)

**Using Phase 0.5 audit results.**

**Strategy:**

1. The Zod schemas from Phase 2 (`src/schemas/question.js`, etc.) become the shared contract.
2. The Admin builder validates content against the schema **on save**. If it doesn't pass, the admin sees the exact validation error and cannot save.
3. The student renderer parses content through the same schema. If a question somehow arrives malformed (legacy data), it shows "This question couldn't be loaded" with a report button, instead of crashing.

```javascript
// In student renderer:
try {
  const validatedQuestion = QuestionSchema.parse(rawQuestion);
  renderQuestion(validatedQuestion);
} catch (e) {
  renderBrokenQuestionFallback(rawQuestion.id, e.message);
  logError('warn', `Malformed question ${rawQuestion.id}`, { error: e.message });
}
```

Commit: `fix: Phase 4.3 — shared schema validation in admin builder + student renderer`

---

### Step 4.4 — Cleanup Dead Routes and Tabs

**4.4a — Kahoot Blank Route (BUG-M):**

```javascript
// Instead of rendering a blank page:
case 'kahoot':
  return <Redirect to="/dashboard" message="This feature has moved." />;
  // Or: return <Navigate to="/dashboard" replace />;
```

**4.4b — Dead Admin Tab (BUG-U):**

Remove the admin 'kahoot' tab from the sidebar, or point it to the correct replacement component.

Commit: `fix: Phase 4.4 — redirect dead kahoot route, remove dead admin tab`

---

### Phase 4 — Verification Checklist

```
[ ] npm run build succeeds
[ ] Every screen looks correct in both Light and Dark mode (re-run Phase 0.4 audit)
[ ] PWA install prompt fires on Android Chrome (physical device test)
[ ] Lighthouse PWA score ≥ 90
[ ] Admin-created content renders correctly on student side (re-run Phase 0.5 audit)
[ ] /kahoot route redirects cleanly, no blank screen
[ ] Admin sidebar has no dead tabs
[ ] SURGERY_LOG.md updated
```

Commit: `milestone: Phase 4 complete — theme centralized, PWA fixed, content pipeline validated`

```
═══ PHASE 4 COMPLETE ═══
ALL SURGICAL PHASES DONE. Do not proceed further.
```

---

## ═══════════════════════════════════════════════════════════════
## SECTION 8 — THE ZERO-REGRESSION EXECUTION PROTOCOL
## ═══════════════════════════════════════════════════════════════

### Rules of Engagement for the Coding Phase

These are the strict, non-negotiable rules that govern every line of code written during this surgery:

**Rule 1: One File at a Time.**
I will request a specific file. You provide it. I analyze it completely — reading every line, tracing every import, understanding every dependency — before writing a single character of code. No assumptions about what's "probably" in a file.

**Rule 2: Blast Radius Report Before Every Change.**
Before I write any fix, I will provide a report listing:
- Every component that imports from the file being changed
- Every hook that depends on the function being modified
- Every route that renders the component being touched
- Every Zustand store action that the code calls
You will verify this list against your knowledge of the codebase. If we missed a dependency, we catch it here.

**Rule 3: Complete Functions, Not Patches.**
Every function I write will include:
- Strict parameter types (JSDoc or TypeScript)
- `try/catch/finally` on every async operation
- Explicit return types
- Defensive null/undefined checks on all inputs
- Meaningful error messages that include context (component name, operation, relevant IDs)
- Dependency arrays verified against ESLint `exhaustive-deps`

**Rule 4: No Silent Failures.**
Every error path must do at least one of:
- Show the user a specific, actionable message
- Log to a monitoring service with context
- Both
`console.log` is not monitoring. `catch(_)` is not handling.

**Rule 5: Verify Before Moving On.**
After every change, I will provide a manual verification checklist specific to that change. You test it. If it passes, we proceed. If it doesn't, we fix it before touching anything else.

**Rule 6: The Surgery Log is Sacred.**
Every change gets documented in `SURGERY_LOG.md` with: bug ID, file changed, what was changed, the blast radius, and how to verify. This log is the anti-whack-a-mole measure.

**Rule 7: No Premature Optimization.**
We fix correctness first, performance second. A slow correct app is infinitely better than a fast broken app.

**Rule 8: The 300-Line Rule.**
No single component file may exceed 300 lines after our changes. If a file grows past this limit, we split it into sub-components in the same directory using the pattern:
```
src/components/FeatureName/
├── index.jsx              — Orchestrator (<80 lines)
├── SubComponentA.jsx      — Specific view
├── SubComponentB.jsx      — Specific view
├── hooks/
│   └── useFeatureData.js  — Custom hook
└── constants.js           — Feature-specific constants
```

---

## ═══════════════════════════════════════════════════════════════
## SECTION 9 — POST-SURGERY VERIFICATION MATRIX
## ═══════════════════════════════════════════════════════════════

After all 4 phases are complete, run this comprehensive verification:

| # | Test | Expected Result | Phase |
|---|------|----------------|-------|
| 1 | `npm run build` | Zero errors, zero warnings | All |
| 2 | Login with approved doctor | Dashboard loads, no flicker | 1, 3 |
| 3 | Login with pending doctor | Auto-signout + "Pending" message | 1 |
| 4 | Login with rejected doctor | Auto-signout + "Rejected" message | 1 |
| 5 | Random email OTP attempt | "No account found" (shouldCreateUser: false) | 1 |
| 6 | `grep -r "NVIDIA_API_KEY" src/` | 0 hardcoded results | 1 |
| 7 | `grep -r "commonProps" src/` | Should be reducing over time | 3 |
| 8 | Open Dashboard → navigate away → come back | No stale data from previous user | 1 |
| 9 | Register with missing MCI number | Server-side rejection | 2 |
| 10 | Submit exam with network interruption | No duplicate entries | 2 |
| 11 | Take quiz → timer expires | Score reflects actual answers, not 0 | 3 |
| 12 | AI explanation request | Shows result or timeout after 15s | 3 |
| 13 | `q.correct` vs `q.correct_key` | Consistent across all pages | 2 |
| 14 | Spaced rep with 0 due cards | Shows "All caught up!", no NaN | 3 |
| 15 | All screens in Dark mode | No broken colors | 4 |
| 16 | All screens in Light mode | No broken colors | 4 |
| 17 | PWA install on Android | Prompt fires, install works | 4 |
| 18 | Admin creates MCQ → student views | Renders correctly | 4 |
| 19 | Navigate to /kahoot | Clean redirect, no blank screen | 4 |
| 20 | Long session (30+ min) | No memory growth from timer leaks | 3 |

---

## ═══════════════════════════════════════════════════════════════
## SECTION 10 — READY TO BEGIN
## ═══════════════════════════════════════════════════════════════

I acknowledge the Zero-Regression Execution Protocol as binding for our entire engagement.

**Phase 0 is your homework, Ayush.** I need:
1. The PWA audit results (Step 0.3)
2. The theme audit screenshots (Step 0.4)
3. The content pipeline audit (Step 0.5)

While you do those, I can begin **Phase 1 (Security & Service Layer)** immediately.

**To begin Phase 1, I need the first file: `src/lib/supabase.js`** — the Supabase client initialization. This is where Disease 1 begins, and this is where the `dbService` wrapper will connect. Please provide it, and the surgery begins.

---

**END OF SURGERY BLUEPRINT**

Copy this document as the master reference. Phases execute sequentially. No shortcuts. No hacks. Zero regressions.
