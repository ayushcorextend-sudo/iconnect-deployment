# iConnect — Comprehensive Testing Strategy
# ════════════════════════════════════════════════════════════════
# Version: 1.0 | Created: 2026-04-03
# Approach: Risk-Based Testing + Hybrid Execution (Automation + Exploratory)
# ════════════════════════════════════════════════════════════════

## 1. Executive Summary

This document defines a reusable, industry-grade testing strategy for iConnect — a medical education SaaS serving Indian doctors. The strategy uses **Risk-Based Testing** to focus effort where it matters most, combined with the **Test Pyramid** model (automated smoke → critical regression → exploratory hunting) to maximize bug discovery per hour invested.

**Testing team:** Claude (automated smoke tests via Playwright) + Ayush (manual regression + exploratory).

**Time budget per full cycle:** ~4–5 hours total (15 min automated smoke → 2 hrs critical regression → 1.5 hrs exploratory → 30 min triage).

---

## 2. Risk Classification — Feature Risk Map

Features are classified by **Business Impact × Failure Likelihood**. This determines testing priority.

### Tier 1 — P0 (Blocker): Release-Stopping

If any of these fail, the app is unusable. **Must pass before any deploy.**

| Feature | Risk Rationale |
|---------|---------------|
| Auth — Login (email/password) | No login = no app. 3 auth methods increase surface area. |
| Auth — OTP flow | Primary login method for doctors on mobile. |
| Auth — Google OAuth | Redirect-based; fragile across browsers. |
| Auth — Role routing | Wrong role → admin features exposed to doctors (security). |
| Registration — 4-step wizard | Only onboarding path. If broken, zero new users. |
| Doctor approval flow | Gating function — unapproved doctors locked out permanently. |
| Navigation — page routing | Recent BUG-NAV-001/002 fixes. History of regression here. |
| PWA — app loads & renders | Service worker issues can brick the app entirely. |

### Tier 2 — P1 (Critical): Core Functionality

Business-critical features that must work, but app is still partially usable without them.

| Feature | Risk Rationale |
|---------|---------------|
| E-Books — PDF viewer | Core value prop. Doctor reads content here daily. |
| Exam system — take exam | Scoring via edge function (submit-exam). Tamper-proof path. |
| Content upload (CA) | Only way content enters the system. |
| AI Chat / Doubt Buster | Key differentiator. Gemini proxy + orchestrator rewritten recently. |
| Notifications — realtime | WebSocket fix just applied. Regression risk. |
| Dashboard — doctor | Landing page. Multiple widget data sources. |
| Study Plan — spaced repetition | SM-2 algorithm. Incorrect scheduling = wrong study order. |
| Leaderboard | Social proof. Incorrect ranking = user trust loss. |

### Tier 3 — P2 (Major): Important but Non-Blocking

Features that enhance the experience. Bugs here are "known issues" not blockers.

| Feature | Risk Rationale |
|---------|---------------|
| Activity heatmap + diary | UI polish area. Recent NA-029/030 fixes. |
| Smart Notes | AI-generated. Star/bookmark functionality. |
| Profile editing | Low frequency action per user. |
| Dark mode | Known 1,591 hardcoded hex colors (BUG-W). Cosmetic. |
| Live Arena (quiz) | Event-based. Not always active. |
| Case Simulator | AI-driven. Edge case heavy. |
| Conferences page | Low usage feature. |

### Tier 4 — P3 (Minor): Cosmetic / Low-Risk

| Feature | Risk Rationale |
|---------|---------------|
| Settings page | Simple toggles. |
| "Coming Soon" pages (Social, Groups) | Placeholder only. |
| Sidebar animation | Framer Motion. Visual only. |
| Toast notifications | Already fixed (BUG-P timer tracking). |

---

## 3. The Test Pyramid — Three Layers

### Layer 1: Automated Smoke Tests (Playwright — run by Claude)

**Runtime target:** < 10 minutes
**Trigger:** Before every deploy, or on-demand
**Location:** `frontend/tests/smoke/`

These scripts verify the critical path is alive. If ANY smoke test fails, manual testing does not begin.

| Test | What It Checks |
|------|---------------|
| `smoke-auth.spec.ts` | Login page renders, form accepts input, error shown on bad credentials, OTP form appears |
| `smoke-navigation.spec.ts` | All role-guarded pages load correctly, deep-link works after login |
| `smoke-registration.spec.ts` | 4-step wizard renders, validation fires, form progresses |
| `smoke-dashboard.spec.ts` | Doctor dashboard loads, widgets render without crash |
| `smoke-ebooks.spec.ts` | E-Books page loads, PDF list renders, viewer opens |
| `smoke-pwa.spec.ts` | App loads, service worker registers, manifest accessible |

### Layer 2: Critical Path Regression (Manual — run by Ayush)

**Runtime target:** ~2 hours
**Method:** Follow the test case matrix (.xlsx) — P0 and P1 cases only
**Pass criteria:** All P0 pass. P1 failures documented as bugs with severity.

Execution order (most critical first):
1. Auth flows (all 3 methods + role guard + approval gate)
2. Registration wizard (happy path + validation edge cases)
3. Navigation (deep-link, back/forward, role guard redirect)
4. E-Books + PDF viewer
5. Exam take + submit
6. Content upload (CA role)
7. AI features (chat, doubt buster, smart notes)
8. Dashboard widgets (data loads, no crashes)
9. Notifications (realtime push)
10. Study Plan + Leaderboard

### Layer 3: Exploratory Testing (Manual — "Bug Hunt")

**Runtime target:** 1–1.5 hours
**Method:** Heuristic-based, unscripted testing
**Focus areas:** Recently changed code, edge cases, cross-browser

#### Heuristics to Apply:

**The "Sad Path" Attacks:**
- Enter letters in phone number fields
- Upload a 100MB PDF (above 50MB limit)
- Upload a .exe file renamed to .pdf
- Submit forms with all fields empty
- Click submit button 10x rapidly (idempotency check)
- Cut internet mid-save (offline sync test)
- Open 2 tabs, login as different roles simultaneously
- Navigate using browser back/forward rapidly
- Paste XSS payloads in text fields: `<script>alert(1)</script>`
- Enter SQL injection in search: `' OR 1=1 --`

**The "State Confusion" Attacks:**
- Login → open ebooks URL in new tab → does it deep-link correctly?
- Start exam → close tab → reopen → is exam state preserved?
- Login as doctor → manually type `/users` in URL bar → should redirect
- Delete browser cookies mid-session → what happens?
- Toggle dark mode mid-exam → does UI break?

**The "Data Boundary" Attacks:**
- Register with email longer than 255 chars
- Set MCI number with invalid format
- Create exam with 0 questions
- Upload artifact with 500-char title

**Mobile-Specific:**
- Rotate device during PDF reading
- Swipe back gesture during form fill
- PWA install on Android Chrome
- iOS Safari "Add to Home Screen" flow

---

## 4. Bug Report Standard

Every bug found during testing MUST follow this format:

```
**Title:** [Page] — [Short description]
**Severity:** P0 / P1 / P2 / P3
**Environment:** [Device], [OS], [Browser]
**Steps to Reproduce:**
1. [Step 1]
2. [Step 2]
3. [Step 3]
**Expected:** [What should happen]
**Actual:** [What actually happened]
**Screenshot/Recording:** [Attach]
**Related Code:** [File path if known]
```

Severity Guide:
- **P0 Blocker:** App crashes, data loss, security breach, main feature dead
- **P1 Critical:** Major feature broken but app usable, workaround exists
- **P2 Major:** Feature works but painfully (slow, confusing, ugly)
- **P3 Minor:** Typo, wrong color, cosmetic alignment

---

## 5. Pre-Deploy Checklist (Current Pending Deploys)

These specific items need validation for the pending deploy:

### Must Verify After Deploy:
- [ ] **BUG-NAV-001:** Navigate to ebooks → page loads correctly (not one-behind)
- [ ] **BUG-NAV-002:** Visit `/ebooks` while logged out → login → lands on ebooks (not dashboard)
- [ ] **PWA install (BUG-V):** Chrome Android → install prompt fires after 3s
- [ ] **PWA install iOS:** Safari → "Add to Home Screen" guide displays
- [ ] **AI chat:** Send message → get response (gemini-proxy deployed?)
- [ ] **AI orchestrator:** Circuit breaker, streaming SSE, trace headers working
- [ ] **WebSocket:** Login → receive realtime notification (no infinite retry)
- [ ] **getContentProgressForDay:** Open diary → content progress shows (not crashing on missing columns)
- [ ] **admin_calendar_events migration:** Table exists after `supabase db push`
- [ ] **CORS:** Only iconnect-med.vercel.app + localhost accepted (test from random origin)

### Pending Manual Actions (Ayush):
- [ ] `npx supabase secrets set GEMINI_API_KEY=<key>`
- [ ] `npx supabase functions deploy gemini-proxy --no-verify-jwt`
- [ ] `npx supabase functions deploy ai-orchestrator`
- [ ] `npx supabase db push`
- [ ] `cd frontend && npm run build && git push`

---

## 6. Regression Cycle Cadence

| When | What to Run | Time |
|------|-------------|------|
| Every deploy | Layer 1 (Smoke) only | 10 min |
| Weekly | Layer 1 + Layer 2 (P0/P1) | 2.5 hrs |
| Before major release | Full cycle (all 3 layers) | 4–5 hrs |
| After architecture change | Full cycle + targeted exploratory on changed area | 5–6 hrs |

---

## 7. Test Data Requirements

| Test Area | Required Data |
|-----------|--------------|
| Doctor login | Test doctor account (approved, active) |
| Doctor login (pending) | Test doctor account (pending approval) |
| Doctor login (rejected) | Test doctor account (rejected) |
| Superadmin login | Test superadmin account |
| Content admin login | Test contentadmin account |
| Exam testing | At least 1 published exam with 5+ questions |
| E-Books | At least 3 uploaded PDFs (various sizes) |
| Notifications | Trigger via admin broadcast or approval action |
| AI features | Valid GEMINI_API_KEY set as Supabase secret |
| Live Arena | Requires 2 simultaneous users (host + student) |

---

## 8. Automation Roadmap

### Phase 1 (Now): Smoke Tests
- Playwright scripts for 6 critical paths
- Run manually via `npx playwright test`
- No CI integration yet

### Phase 2 (Next Month): CI Integration
- GitHub Actions workflow: run smoke tests on every PR to main
- Block merge if smoke tests fail
- Add visual regression snapshots for key pages

### Phase 3 (Quarter 2): Expanded Automation
- API tests for edge functions (submit-exam, gemini-proxy)
- Component tests for complex widgets (ExamPage, JournalModal)
- Performance benchmarks (dashboard load < 3s, PDF render < 2s)

---

## 9. Known Gaps & Limitations

1. **No payment testing** — app is free, no billing flows exist
2. **Live Arena** — requires 2 concurrent sessions, hard to automate
3. **AI responses** — non-deterministic, can only test "response received" not "response correct"
4. **Email delivery** — OTP, approval, welcome emails go through Resend API; can verify send but not inbox
5. **Mobile native** — PWA testing limited to Chrome DevTools device emulation for automation
6. **Dark mode** — 1,591 hardcoded hex values outstanding (BUG-W); visual regression only after fix pass
7. **Express backend** — partially redundant with Supabase; unclear which routes are active in production

---

## 10. Files & Deliverables

| Deliverable | Location | Purpose |
|-------------|----------|---------|
| This strategy doc | `.agent/TESTING_STRATEGY.md` | Long-term reference |
| Test case matrix | `iConnect_Test_Matrix.xlsx` | Executable pass/fail tracking |
| Smoke tests | `frontend/tests/smoke/*.spec.ts` | Automated critical path checks |
| Bug reports | Track in `.agent/BUG_REPORTS.md` or Jira | Documented issues |
