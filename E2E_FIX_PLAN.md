# iConnect E2E Bug Fix Plan — CLI Execution Strategy
## Date: April 5, 2026
## Based on: E2E Test Report (Phases 0-9) + handoff.md + architecture.md

---

## Triage Summary

| Bug | E2E ID | Already in Handoff? | Action Needed |
|-----|--------|---------------------|---------------|
| Gemini API 404 | P1-3 | YES — AI rewrite done, deploy pending | **DEPLOY ONLY** |
| Live Arena redirect | P1-1 | PARTIAL — arena-student fixed, needs deploy | **DEPLOY + verify** |
| Realtime infinite retry | P1-2 | NO — new finding | **CODE FIX** |
| Dark mode cards white | P2-4 | YES — BUG-W listed as pending manual action | **CODE FIX (systematic)** |
| Role routing inconsistency | P2-5 | NO — new finding | **CODE FIX** |
| Missing HTML landmarks | P2-6 | NO — new finding | **CODE FIX** |
| Interest Groups redirect | P2-8 | NO — route exists as 'groups' in App.jsx | **VERIFY (likely works)** |
| Supabase 503 cold start | P2-7 | Known baseline | **NO ACTION** (Supabase infra) |
| Chatbot buttons no aria | P3-9 | NO — new finding | **CODE FIX** |
| No skip navigation | P3-10 | NO — new finding | **CODE FIX** |
| Toast under chatbot z-index | P3-11 | NO — but z-index centralized | **CODE FIX (trivial)** |
| Auth lock warnings | P3-12 | Known issue | **NO ACTION** (Supabase SDK) |

---

## Execution Phases

### PHASE 0: Deploy Pending Fixes (NO code changes)
**Time: 5 min | Risk: LOW | Impact: Fixes P1-1 and P1-3**

These are already coded and built. They just need to ship.

```bash
# Step 1: Deploy edge functions (fixes Gemini 404)
cd /path/to/project
npx supabase functions deploy ai-orchestrator --no-verify-jwt
npx supabase functions deploy gemini-proxy --no-verify-jwt

# Step 2: Push frontend to Vercel (fixes Live Arena + NAV fixes)
cd frontend
git add -A && git commit -m "deploy: ship pending NAV-FIX + AI rewrite + PWA"
git push origin main
# Vercel auto-deploys on push to main
```

**Verify after deploy:**
- [ ] AI chatbot responds (no more 404)
- [ ] /arena-student loads correctly (no dual-content)
- [ ] Live Arena sidebar link works for doctors

---

### PHASE 1: Realtime Notification Retry Fix
**Time: 15 min | Risk: LOW | Impact: Fixes P1-2**
**File: `frontend/src/stores/useAppStore.js`**

**Problem:** The notification channel enters an infinite retry loop (53+ warnings in one burst). The `subscribeToNotifications()` function at line ~118 handles channel errors but doesn't implement exponential backoff.

**Fix strategy:**
```
1. Read useAppStore.js lines 118-161 (notification subscription section)
2. Add retry counter + exponential backoff to channel error handler
3. Cap max retries at 5 (then log error and stop)
4. Add a resubscribe-on-focus mechanism (window focus event) so users
   can recover without page reload
```

**Specific changes:**
- Add module-level `_retryCount` Map keyed by channel name
- On channel error: increment count, if count > 5 → `supabase.removeChannel()` + log
- On channel error with count <= 5: wait `Math.min(1000 * 2^count, 30000)ms` before retry
- On `window.focus` event: if channel was abandoned, resubscribe with count reset

---

### PHASE 2: Dark Mode Card Sweep (BUG-W continuation)
**Time: 45-60 min | Risk: LOW | Impact: Fixes P2-4**

**Already done:** NotificationsPage, ProfilePage, UserManagement, index.css
**Still needed:** All card/container components across CA and Doctor dashboards

**Strategy:** Systematic grep + replace approach.

```bash
# Step 1: Find all hardcoded background colors in JSX
grep -rn "background.*#\|bg-white\|bg-gray\|backgroundColor.*'" \
  frontend/src/components/ \
  --include="*.jsx" --include="*.js" | head -50

# Step 2: Identify the most impactful files
# Priority order (most visible pages first):
```

**File hit list (based on E2E findings):**

| File | What's broken | Fix |
|------|---------------|-----|
| `ContentAdminDashboard.jsx` | E-Library card list, stat cards have white bg | Add `dark:bg-slate-800` or use `var(--surf)` |
| `DoctorDashboard.jsx` | Dashboard widget cards | Same pattern |
| `EBooksPage.jsx` | Book cards | Same pattern |
| `LeaderboardPage.jsx` | Leaderboard cards | Same pattern |
| `ExamPage.jsx` | Question cards | Same pattern |
| `MyPerformancePage.jsx` | Stats cards, score breakdown | Same pattern |
| `StudyPlan/*.jsx` | Plan cards, tabs | Same pattern |
| `CaseSimulator.jsx` | Specialty selector, case card | Same pattern |
| Sidebar component | Active item highlight in dark | Check contrast |

**Pattern to apply everywhere:**
```
Replace: style={{ background: '#fff' }} or bg-white
With:    style={{ background: 'var(--surf)' }} or bg-white dark:bg-slate-800

Replace: style={{ color: '#374151' }}
With:    style={{ color: 'var(--text)' }}

Replace: style={{ borderColor: '#E5E7EB' }}
With:    style={{ borderColor: 'var(--border)' }}
```

**CSS variable reference (from theme.css, already defined):**
- `--bg`: page background
- `--surf`: card/surface background
- `--text`: primary text
- `--muted`: secondary text
- `--border`: borders
- `--light`: subtle backgrounds

---

### PHASE 3: Role Validation on CA Portal Login
**Time: 20 min | Risk: MEDIUM | Impact: Fixes P2-5**
**Files: `frontend/src/App.jsx` (login callback), `frontend/src/lib/supabase.js` (profile fetch)**

**Problem:** The CA login portal doesn't verify the user's `profiles.role` matches "contentadmin". A doctor can log in through the CA portal and see a doctor dashboard.

**Fix strategy:**
```
1. Read the login() callback in App.jsx (~line 369 per handoff)
2. After successful auth + profile fetch, check profile.role
3. If logging in via CA portal but role !== 'contentadmin':
   - Show error toast: "This account doesn't have Content Admin access"
   - Call authSignOut()
   - Return to CA login screen
4. Same check for SA portal: role must be 'superadmin'
```

**Key consideration:** The login form type (doctor/CA/SA) needs to be tracked. Check if there's already a state variable for which portal was selected. The login page has "Super Admin" and "Content Admin" buttons — these likely set a form mode. The role check should happen right after `setAuthRole()` is called.

---

### PHASE 4: Accessibility Fixes
**Time: 30 min | Risk: LOW | Impact: Fixes P2-6, P3-9, P3-10**

#### 4a. Add HTML landmarks
**File: `frontend/src/App.jsx` (or layout wrapper component)**

```
- Wrap sidebar in <nav aria-label="Main navigation">  (may already be <nav>)
- Wrap main content area in <main id="main-content">
- Wrap TopBar in <header role="banner">
- Add <footer> if there's a footer area
```

#### 4b. Add skip navigation link
**File: `frontend/src/App.jsx` or `index.css`**

```jsx
// At very top of app shell, before sidebar:
<a href="#main-content" className="skip-link">
  Skip to main content
</a>
```

```css
/* In index.css */
.skip-link {
  position: absolute;
  top: -40px;
  left: 0;
  background: var(--primary);
  color: white;
  padding: 8px 16px;
  z-index: 10000;
  transition: top 0.2s;
}
.skip-link:focus {
  top: 0;
}
```

#### 4c. Chatbot button aria-labels
**File: `frontend/src/components/ChatBot.jsx`**

```
- FAB button: add aria-label="Open AI Assistant"
- Close button (chatbot-close-btn): add aria-label="Close assistant"
- Send button (chatbot-send-btn): add aria-label="Send message"
- Tab buttons: add aria-label to Chat and Doubt Buster tabs
```

---

### PHASE 5: Z-Index Toast Fix (trivial)
**Time: 2 min | Risk: NONE | Impact: Fixes P3-11**
**File: `frontend/src/styles/zIndex.js`**

```
Change: toast: 999
To:     toast: 1003
```

This ensures toasts render above the chatbot panel (1002). The `offlineIndicator` (1200) and `loginBanner` (9999) already sit above both.

Also update `chatbot.css` or wherever `.toast-wrap` z-index is applied to use the token from `zIndex.js` instead of a hardcoded value.

---

### PHASE 6: Interest Groups Route Verification
**Time: 5 min | Risk: NONE | Impact: Fixes P2-8**

**Finding from exploration:** The route exists as `case 'groups'` in App.jsx (renders a "Coming soon" placeholder). The sidebar sends key `'groups'`. During E2E testing, navigating to `/interest-groups` (URL path) failed — but the actual route key is `groups`, not `interest-groups`.

**Verify:**
```
1. Check if initRouter / syncFromLocation maps '/interest-groups' → 'groups'
2. If not, the URL-based navigation won't work but sidebar click will
3. Fix: Add URL alias in router mapping, OR change sidebar route to match URL
```

This is likely already working via sidebar click — the E2E failure was from direct URL navigation (`/interest-groups`) which doesn't match the route key (`groups`).

---

## Execution Order (Recommended)

```
PHASE 0  →  Deploy pending (5 min)           ← HIGHEST ROI, zero risk
PHASE 1  →  Realtime retry fix (15 min)      ← P1 bug, small change
PHASE 5  →  Z-index toast fix (2 min)        ← Trivial
PHASE 4  →  Accessibility fixes (30 min)     ← Clean a11y wins
PHASE 3  →  Role validation (20 min)         ← Security fix, needs care
PHASE 2  →  Dark mode sweep (45-60 min)      ← Largest, most files
PHASE 6  →  Interest Groups verify (5 min)   ← Verify only
```

**Total estimated time: ~2 hours**

---

## Out of Scope (No Action)

| Issue | Reason |
|-------|--------|
| Supabase 503 on cold start | Supabase infrastructure, not app code |
| Auth lock warnings (12+ per login) | Supabase SDK + React Strict Mode interaction |
| Content Admin role in profiles table | Data issue — need to update via Supabase dashboard |

---

## Post-Fix Verification

After all phases complete:
1. `npm run build` — must pass with 0 errors
2. Run E2E test sweep again (at minimum: login → dashboard → dark mode toggle → chatbot open)
3. Verify edge function deployment: chatbot must respond
4. Check console for reduced warnings (especially Realtime retry)
5. Screen reader test: VoiceOver/NVDA on login + dashboard
