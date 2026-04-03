# CLAUDE CODE PROMPT — Fix Navigation Stale Content Bug (P0 BLOCKER)
# ════════════════════════════════════════════════════════════════
# Paste everything below into Claude Code CLI.
# ════════════════════════════════════════════════════════════════

```
You are debugging a P0 navigation bug in iConnect. READ THESE FILES FIRST (mandatory):
- .agent/E2E_COWORK_REPORT.md (full E2E evidence with screenshots)
- .agent/handoff.md (session state)
- CLAUDE.md (project rules — follow strictly)

═══ THE BUG ═══

Every sidebar click renders the PREVIOUS page's content in the new page's frame.
This is 100% reproducible, zero console errors, completely silent.

Evidence from Chrome E2E audit:

| Step | Clicked     | URL       | TopBar says      | Content ACTUALLY shows |
|------|-------------|-----------|------------------|------------------------|
| 1    | (fresh load)| /         | Dashboard        | Dashboard (CORRECT)    |
| 2    | E-Books     | /ebooks   | E-Book Library   | Dashboard (WRONG)      |
| 3    | My Activity | /activity | My Activity      | E-Books (WRONG)        |
| 4    | Case Sim    | /case-sim | Case Simulator   | My Activity (WRONG)    |
| 5    | Dashboard   | /         | Dashboard        | Case Sim (WRONG)       |

Pattern: content is ALWAYS one navigation behind. TopBar + sidebar update correctly.
Hard refresh on any page loads the CORRECT content. Only sidebar clicks are broken.

═══ WHAT WE KNOW ═══

1. TopBar reads `page` from Zustand and renders the correct title → `page` IS updating
2. Sidebar reads `page` and highlights the correct item → `page` IS updating
3. `renderPage()` uses the same `page` variable in a switch statement
4. `key={page}` on `<PageErrorBoundary>` should force full unmount/remount
5. There is NO `useTransition` anywhere in the codebase (already checked)
6. Console is completely silent — no errors, no warnings
7. Network requests return 200 — no API failures

═══ ARCHITECTURE (so you don't waste time re-reading) ═══

Routing:
- `main.jsx`: `<StrictMode><BrowserRouter><App /></BrowserRouter></StrictMode>`
- `App.jsx` has `<MainApp>` which uses `useNavigate()` + `useLocation()`
- Page state lives in Zustand: `useAppStore(s => s.page)` (line 112 of App.jsx)
- `setPage` lives in Zustand: `useAppStore(s => s.setPage)` (line 121 of App.jsx)

Navigation flow:
1. Sidebar `NavItem` calls `setPage(item.k)` (plain call, no useTransition)
2. `useAppStore.setPage()` does: `set({ page, notifPanel: false })` then `imperativeNavigate(toPath(page))`
3. `imperativeNavigate` calls the stored React Router `navigate()` function
4. `syncFromLocation` effect in App.jsx: `useEffect(() => { syncFromLocation(location.pathname); }, [location.pathname])`

Rendering (App.jsx lines 651-655):
```jsx
<PageErrorBoundary key={page} resetKey={page}>
  <Suspense fallback={<PageLoader />}>
    {renderPage()}
  </Suspense>
</PageErrorBoundary>
```

`renderPage()` (line 547) is a plain function that switches on `page` and returns the matching lazy component.

═══ HYPOTHESES TO INVESTIGATE ═══

1. **DOUBLE STATE UPDATE RACE**: `setPage('ebooks')` updates Zustand immediately AND calls `navigate('/ebooks')`. This triggers `syncFromLocation` which calls `set({ page })` AGAIN. In React 19 with automatic batching, could there be a render with a stale intermediate state? Check if `syncFromLocation` is causing a re-render that reverts the page.

2. **STALE CLOSURE in renderPage()**: Is `renderPage()` capturing an old `page` value? It's defined inside the component body so it should read the latest `page`, but check if `useMemo` or `useCallback` wrapping could stale-capture it. (renderPage itself is NOT memoized, so this is unlikely but verify.)

3. **KEY NOT CHANGING**: If `page` appears to change for TopBar/Sidebar but `key={page}` on PageErrorBoundary somehow receives the old value, React would not unmount the old tree. Add `console.log('KEY:', page)` right before the JSX return to verify.

4. **React StrictMode + React 19 double-render**: In StrictMode, React calls render functions twice. With Zustand's synchronous `set()`, could the second render have a different state? Check if removing `<StrictMode>` from `main.jsx` temporarily fixes the bug.

5. **React Router navigate() re-triggering**: `navigate('/ebooks')` might cause React Router to re-render the component tree, and during that re-render, `location.pathname` triggers `syncFromLocation` which sets page to the SAME value. But Zustand skips re-renders for same-value sets... UNLESS the selector creates a new reference. Check if `s => s.page` returns a stable value.

6. **PageErrorBoundary swallowing the remount**: Check if `PageErrorBoundary` has a `shouldComponentUpdate` or `getDerivedStateFromProps` that prevents re-rendering even when `key` changes. Read `frontend/src/components/ui/PageErrorBoundary.jsx`.

═══ DEBUGGING STEPS (DO THESE FIRST) ═══

Step 1: Add diagnostic logging to the render path.

In App.jsx, right before the return JSX (around line 630), add:
```js
console.log('[RENDER] page =', page, '| location =', location.pathname);
```

In the `renderPage()` function (line 547), add as the FIRST line:
```js
console.log('[renderPage] page =', page);
```

In useAppStore.js `setPage` (line 58), add:
```js
console.log('[setPage] →', page, '| prev:', get().page);
```

In useAppStore.js `syncFromLocation` (line 70), add:
```js
console.log('[syncFromLocation] pathname →', pathname, '| page:', fromPath(pathname), '| prev:', get().page);
```

Step 2: Build and test locally with `npm run dev`. Navigate between pages and read the console log sequence.

Expected healthy output for clicking E-Books:
```
[setPage] → ebooks | prev: dashboard
[RENDER] page = ebooks | location = /ebooks
[renderPage] page = ebooks
```

If you see something like:
```
[setPage] → ebooks | prev: dashboard
[syncFromLocation] pathname → /ebooks | page: ebooks | prev: ebooks
[RENDER] page = dashboard | location = /ebooks   ← THIS IS THE BUG
```
...then the render is happening with stale state.

Step 3: Based on the logs, implement the fix. The likely fix is one of:
- Remove `imperativeNavigate` from `setPage` (stop the double-update)
- Use `window.history.replaceState` instead of React Router `navigate()` (avoids re-render cycle)
- Add a guard in `syncFromLocation`: `if (fromPath(pathname) === get().page) return;` (already same, skip)
- Move the URL update OUT of Zustand and into a React `useEffect` that watches `page`

Step 4: After fixing, test these exact flows 3x each:
- Dashboard → E-Books → back to Dashboard
- Dashboard → Activity → Performance → Dashboard
- Dashboard → Profile → Notifications → E-Books → Dashboard
- Click sidebar items 10 times rapidly

Step 5: Run `npm run build` — must succeed with no errors.

═══ RULES ═══
- Follow CLAUDE.md strictly — no new stores, no raw supabase.from(), no .bak edits
- The ONLY files you should need to modify: App.jsx and/or useAppStore.js
- Do NOT modify Sidebar.jsx — it's working correctly
- Do NOT add useTransition — it's not needed
- Do NOT remove the key={page} on PageErrorBoundary — it's correct
- After fixing, update .agent/handoff.md with what you changed and why
```
