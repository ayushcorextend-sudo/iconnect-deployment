# iConnect — Navigation Bug Brief & Claude CLI Fix Blueprint
# ════════════════════════════════════════════════════════════════
# Created: 2026-04-02
# Priority: HIGH — These bugs make the app look broken to users
# ════════════════════════════════════════════════════════════════

## EXECUTIVE SUMMARY

Multiple pages display stale content from the previously visited page. When a user
navigates away from "My Performance" to Social Features, Learn Hub, or E-Books,
the Performance Analytics banner, stat cards, Score Breakdown, and 7-Day Activity
chart persist in the content area. The sidebar and URL update correctly — only the
main content fails to swap.

**Gemini's diagnosis was wrong.** This is NOT a missing `<Switch>`/`<Routes>` issue.
iConnect uses Zustand state-based routing with a `renderPage()` switch statement
that correctly returns one component at a time. The real root causes are below.

---

## BUG 1: Stale Page Content Persists Across Navigation

### Symptoms
- Navigate from My Performance → Social Features: Performance Analytics stays visible
- Navigate from My Performance → Learn Hub: Learn Hub header appears but Performance content remains below
- Navigate from My Performance → E-Books: E-Book Library header appears but Performance content remains below
- Sidebar active state and browser URL update correctly — only content area is stale

### Root Cause: AnimatePresence `mode="popLayout"` + Suspense + Lazy Loading Collision

**File:** `frontend/src/components/ui/PageTransition.jsx` (line 11)

```jsx
<AnimatePresence mode="popLayout">
```

**File:** `frontend/src/App.jsx` (lines 646-652)

```jsx
<PageErrorBoundary resetKey={page}>
  <Suspense fallback={<PageLoader />}>
    <PageTransition pageKey={page}>
      {renderPage()}
    </PageTransition>
  </Suspense>
</PageErrorBoundary>
```

**What happens step-by-step:**

1. User clicks "Social Features" in sidebar
2. `NavItem` calls `startTransition(() => setPage('social'))` (Sidebar.jsx)
3. `page` state updates from `'performance'` → `'social'`
4. Sidebar re-renders with correct active state, URL updates to `/social`
5. `renderPage()` returns `<ComingSoonPage>` (lazy-loaded)
6. `React.lazy()` triggers async chunk fetch → Suspense enters pending state
7. **HERE'S THE BUG:** `AnimatePresence mode="popLayout"` tells Framer Motion:
   "Keep the OLD motion.div mounted while the NEW one enters"
8. The old motion.div (key="performance") with MyPerformancePage content stays in DOM
9. The new motion.div (key="social") tries to mount, but its child is still Suspense-pending
10. `startTransition` from step 2 ALSO tells React: "Keep showing old UI until new is ready"
11. **Result:** Old page content stays visible indefinitely until the lazy chunk loads

**Why it's worse than a normal delay:** If the chunk load fails (network error, cache miss),
the old content stays FOREVER. There's no timeout or error recovery for this state.

### The Fix

**Primary fix — PageTransition.jsx:**
Change `mode="popLayout"` to `mode="wait"`. This forces the old page to fully exit
before the new one enters, preventing DOM overlap during Suspense pending states.

**Secondary fix — App.jsx Suspense/PageTransition order:**
Move `<Suspense>` INSIDE `<PageTransition>` so the PageLoader spinner renders within
the animated container, not outside it. This ensures the animation system controls
the fallback visibility.

**Tertiary fix — Sidebar.jsx startTransition:**
The `useTransition` wrapping `setPage()` compounds the problem. For instant page swaps,
`setPage()` should be called directly. The "pulsing dot" loading indicator on the nav
item is not worth the stale content bug it causes.

---

## BUG 2: Content Stacking (Multiple Pages Visible Simultaneously)

### Symptoms
- Screenshots show BOTH the new page header (Learn Hub, E-Book Library) AND
  the old page content (Performance Analytics) stacked vertically
- This is distinct from Bug 1 — here the new page partially renders on top

### Root Cause: Same as Bug 1

The `mode="popLayout"` allows both the exiting and entering motion.divs to exist
simultaneously. When the new lazy component loads fast enough to partially render
but the exit animation hasn't completed, you get both pages stacked in the DOM.

The `popLayout` mode was specifically designed for cases where you want overlapping
enter/exit animations (like a card stack). For page routing, `mode="wait"` is correct.

### The Fix

Same as Bug 1 — changing to `mode="wait"` eliminates the stacking entirely.

---

## BUG 3: CSS `fadeUp` Animation Double-Fires

### Symptoms
- Subtle: the old page content sometimes appears to "re-animate" when it should be static

### Root Cause

**File:** `frontend/src/index.css` (line 365)

```css
.page { flex: 1; padding: 24px; animation: fadeUp .35s ease both; }
```

This CSS animation runs on mount AND when the `.page` class is re-applied. Combined with
the Framer Motion `pageVariants` animation, there are TWO competing animation systems.
When popLayout keeps the old DOM alive, the CSS animation can re-trigger on style recalc.

### The Fix

Remove the CSS `animation: fadeUp .35s ease both` from `.page`. Framer Motion's
`pageVariants` already handles enter/exit animations. Having both is redundant and
creates visual glitches.

---

## IMPACT SUMMARY

| Bug | User Impact | Severity |
|-----|------------|----------|
| Stale content | App looks completely broken — wrong page content | CRITICAL |
| Content stacking | Two pages visible at once — confusing, unprofessional | HIGH |
| CSS double animation | Subtle visual jank on page transitions | LOW |

---

## FILES TO MODIFY

| File | Change |
|------|--------|
| `frontend/src/components/ui/PageTransition.jsx` | `mode="popLayout"` → `mode="wait"` |
| `frontend/src/App.jsx` | Reorder Suspense inside PageTransition |
| `frontend/src/components/Sidebar.jsx` | Remove `useTransition` from NavItem |
| `frontend/src/index.css` | Remove `animation: fadeUp` from `.page` |

---

# ════════════════════════════════════════════════════════════════
# CLAUDE CLI FIX BLUEPRINT
# ════════════════════════════════════════════════════════════════
#
# Copy everything below this line and paste it into Claude CLI
# as your prompt. It will execute the fixes.
#
# ════════════════════════════════════════════════════════════════

```
You are fixing 3 navigation bugs in iConnect that cause stale page content, content
stacking, and animation glitches. Read .agent/handoff.md and .agent/architecture.md
first as required by CLAUDE.md.

CONTEXT: iConnect uses Zustand state-based routing (NOT React Router routes). Pages
are rendered via a switch statement in renderPage() in App.jsx. The page state is set
by setPage() in useAppStore. Sidebar calls setPage() on click. Pages are lazy-loaded
and wrapped in Suspense + PageTransition (Framer Motion AnimatePresence).

THE BUGS:
1. AnimatePresence mode="popLayout" in PageTransition.jsx keeps old page DOM alive
   during Suspense pending state, so stale content from the previous page persists
2. startTransition() in Sidebar.jsx compounds this by telling React to keep old UI
3. CSS .page animation in index.css conflicts with Framer Motion pageVariants

DO THESE 4 CHANGES (in order):

═══ CHANGE 1: PageTransition.jsx ═══
File: frontend/src/components/ui/PageTransition.jsx
- Change AnimatePresence mode from "popLayout" to "wait"
- This forces old page to fully unmount before new page enters
- Keep everything else (variants, durations, key) exactly the same

═══ CHANGE 2: App.jsx — Suspense/PageTransition order ═══
File: frontend/src/App.jsx (around line 646-652)
Current order:
  <PageErrorBoundary resetKey={page}>
    <Suspense fallback={<PageLoader />}>
      <PageTransition pageKey={page}>
        {renderPage()}
      </PageTransition>
    </Suspense>
  </PageErrorBoundary>

Change to:
  <PageErrorBoundary resetKey={page}>
    <PageTransition pageKey={page}>
      <Suspense fallback={<PageLoader />}>
        {renderPage()}
      </Suspense>
    </PageTransition>
  </PageErrorBoundary>

WHY: This puts Suspense INSIDE the animated container so the PageLoader spinner
participates in the page transition animation. The spinner fades in with the new
page slot instead of being invisible behind the old page.

═══ CHANGE 3: Sidebar.jsx — Remove useTransition ═══
File: frontend/src/components/Sidebar.jsx
- In the NavItem component, remove the useTransition hook
- Change the onClick from:
    startTransition(() => { setPage(item.k); });
  To simply:
    setPage(item.k);
- Remove the isPending state and any pulsing-dot indicator tied to it
- Remove the useTransition import from React
- Keep onClose() call after setPage()

WHY: startTransition tells React "this update is low priority, keep showing old UI."
That's the opposite of what we want for page navigation — we want IMMEDIATE swap.

═══ CHANGE 4: index.css — Remove competing CSS animation ═══
File: frontend/src/index.css (search for .page selector, around line 365)
- Remove ONLY the `animation: fadeUp .35s ease both;` property from the .page rule
- Keep all other properties (flex, padding, etc.)
- Also search for the @keyframes fadeUp definition and remove it if .page was its
  only consumer (grep for "fadeUp" first to check)

WHY: Framer Motion pageVariants already handles enter/exit animations (opacity + y).
The CSS animation is redundant and causes double-animation glitches.

═══ VERIFICATION ═══
After all 4 changes:
1. Run: cd frontend && npm run build
2. Confirm no build errors
3. Check that PageTransition.jsx is <25 lines (tiny file, just the mode change)
4. Check that Sidebar.jsx no longer imports useTransition
5. Check that index.css .page rule has no animation property

═══ RULES ═══
- Do NOT create new Zustand stores
- Do NOT modify renderPage() switch logic — it's correct
- Do NOT add React Router <Routes> or <Route> — the app uses state-based routing
- Do NOT touch any .bak files
- Update .agent/handoff.md when done with what changed and current state
```

---

## WHY GEMINI'S DIAGNOSIS WAS WRONG

| Gemini Said | Reality |
|------------|---------|
| "Missing `<Switch>` or `<Routes>` wrapper" | App doesn't use React Router for rendering. Uses Zustand `setPage()` + switch statement. |
| "Route definitions rendering every partial match" | There are no `<Route>` components. `renderPage()` is a switch — only one case executes. |
| "`<NavLink>` with `end` attribute needed" | Sidebar uses plain `onClick` → `setPage()`. No `<NavLink>` anywhere. |
| "MainContent component not re-rendering" | MainContent re-renders fine. The DOM just isn't unmounting due to AnimatePresence mode. |
| "Use `useEffect` cleanup for charts" | Charts aren't the problem. The entire old page stays mounted. Individual cleanup won't help. |

The actual fix is 4 small, surgical changes totaling ~10 lines of code modification.
