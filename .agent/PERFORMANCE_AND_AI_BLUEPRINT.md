# iConnect — Performance & AI Key Fix Blueprint
# ════════════════════════════════════════════════════════════════
# Created: 2026-04-02
# ════════════════════════════════════════════════════════════════

## WHY THE SITE FEELS SLOW — 5 Root Causes

### 1. Main Bundle is 655KB (should be <400KB)
The Vite build produces a 655KB index chunk. Even with code splitting for Supabase,
Framer Motion, and Lucide, the main chunk carries all stores, auth logic, layout
components, ChatBot, and OnboardingBanner eagerly.

### 2. Dashboard Fires 10 Supabase Queries on Mount
DoctorDashboard.jsx fires 9 parallel queries + 1 sequential follow-up:
- One query fetches **2,000 activity log rows** just to calculate weekly stats
- Another fetches **90 days of diary data** in one shot for the heatmap
- Users see a spinner until ALL 10 queries resolve (slowest wins)

### 3. Realtime WebSocket Opens on Every Page Load
The Supabase client is created with no options, so realtime is enabled by default.
A WebSocket connection opens immediately on every page load, even for users who
never visit pages that need real-time updates (only Arena and notifications use it).

### 4. Framer Motion Adds 123KB for Page Transitions
PageTransition.jsx is the only consumer of Framer Motion's AnimatePresence in the
main render path. This 123KB library loads on every page for a 0.18s fade animation
that could be done with 5 lines of CSS.

### 5. Axios (29KB) is Redundant
Supabase client already uses fetch. Axios is imported but adds no value.

---

## GOOGLE AI STUDIO KEY — YES, IT WORKS

**Short answer:** A Google AI Studio API key is 100% compatible with the current setup.

**How it works:** The `gemini-proxy` edge function calls:
```
https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=GEMINI_API_KEY
```

Google AI Studio keys work with this exact endpoint. AI Studio and Gemini API use the
same infrastructure — the key format is identical.

**To set it up:**
```bash
npx supabase secrets set GEMINI_API_KEY=your-google-ai-studio-key-here
```

That's it. The edge function reads `GEMINI_API_KEY` from secrets and passes it to the
Gemini API. No code changes needed.

**Caveats:**
- AI Studio free tier has lower rate limits (~60 RPM) — fine for your current user base
- For production scale, upgrade to a Google Cloud billing-enabled key
- The key stays server-side in Supabase secrets — never exposed to browser

**All 15 AI features will work:** explainQuestion, generateStudyPlan, getClinicalCase,
auditContent, askDoubtBuster, generateReadingQuiz, generateSmartNote, generateContextualPlan,
assessFatigueLevel, generateActiveRecallAudio, generateSpacedRepetitionCards,
gradeSubjectiveAnswer, getPersonalizedSuggestions, analyzeKnowledgeGap, getPredictiveAlerts.

---

# ════════════════════════════════════════════════════════════════
# CLAUDE CLI PERFORMANCE FIX BLUEPRINT
# ════════════════════════════════════════════════════════════════
#
# Copy everything below and paste into Claude CLI.
# This is a multi-phase optimization — do Phase 1 first, test, then Phase 2.
#
# ════════════════════════════════════════════════════════════════

```
You are optimizing iConnect for speed. The app feels sluggish everywhere — initial
load, page navigation, and data rendering. Read .agent/handoff.md and
.agent/architecture.md first as required by CLAUDE.md.

CONTEXT:
- React 19 + Vite 7 + Supabase + Zustand state-based routing
- Main bundle: 655KB (target: <400KB)
- DoctorDashboard fires 10 Supabase queries on mount
- Supabase realtime WebSocket opens on every page even when unused
- Framer Motion (123KB) used only for a fade animation

DO THESE CHANGES IN ORDER. Test build after each phase.

═══ PHASE 1: Kill the Query Waterfall (BIGGEST IMPACT) ═══

File: frontend/src/components/DoctorDashboard.jsx

The dashboard fetches 2000 activity_logs rows and 90 days of diary data on mount.
Fix this:

A) Activity logs query: Change `.limit(2000)` to `.limit(200)` and add
   `.gte('created_at', sevenDaysAgo)` filter for the weekly stats computation.
   The 90-day heatmap data should come from a SEPARATE lightweight query that
   only selects `created_at` and `activity_type` (not all columns).

B) Split the 90-day heatmap query: Instead of fetching full diary entries for 90 days,
   query only `date, mood, study_hours` columns (no notes text, no goals array).

C) Progressive rendering: Don't wait for ALL 10 queries. Render KPI cards as soon
   as the first 3 queries resolve (profile, scores, basic stats). Let the heatmap
   and "For You" section load independently with their own loading states.

   Pattern:
   - Group 1 (instant): profile, scores, leaderboard → render KPI cards
   - Group 2 (deferred): activity logs, diary, artifacts → render below fold
   - Group 3 (lazy): study plan, webinar → render last

RULES:
- All Supabase queries go through frontend/src/lib/supabase.js ONLY
- If you need a new query function, add it to supabase.js
- Do NOT create new Zustand stores
- Keep the existing Promise.all pattern but split into 3 groups

═══ PHASE 2: Disable Realtime by Default ═══

File: frontend/src/lib/supabase.js (first ~10 lines)

Change the Supabase client initialization from:
  export const supabase = createClient(url, key)
To:
  export const supabase = createClient(url, key, {
    realtime: { params: { eventsPerSecond: 2 } },
    global: { headers: { 'x-client-info': 'iconnect-web' } }
  })

This keeps realtime available (Arena and notifications need it) but reduces the
default event rate from 10/s to 2/s, cutting WebSocket traffic by 80%.

DO NOT disable realtime entirely — LiveArenaStudent.jsx and NotificationsPage.jsx
subscribe to Supabase Realtime channels.

═══ PHASE 3: Lazy-Load ChatBot and OnboardingBanner ═══

File: frontend/src/App.jsx

ChatBot and OnboardingBanner are eagerly imported but not needed on initial render.
Change them to lazy imports:

  const ChatBot = lazy(() => import('./components/chatbot/ChatPanel'));
  const OnboardingBanner = lazy(() => import('./components/OnboardingBanner'));

Wrap their usage in the JSX with individual Suspense boundaries:
  <Suspense fallback={null}>
    <OnboardingBanner ... />
  </Suspense>

  <Suspense fallback={null}>
    <ChatBot ... />
  </Suspense>

fallback={null} is correct here — these are secondary UI that can pop in after load.

═══ PHASE 4: Replace Framer Motion Page Transition with CSS ═══

File: frontend/src/components/ui/PageTransition.jsx

Replace the entire Framer Motion implementation with a pure CSS approach:

  export default function PageTransition({ pageKey, children }) {
    return (
      <div key={pageKey} className="page-enter" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {children}
      </div>
    );
  }

File: frontend/src/index.css — add:

  @keyframes pageEnter {
    from { opacity: 0; transform: translateY(6px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .page-enter { animation: pageEnter 0.18s ease-out both; }

Then check if framer-motion is imported anywhere else in the codebase:
  grep -r "from 'framer-motion'" frontend/src/

If PageTransition was the ONLY consumer, remove framer-motion from package.json
and run npm install. This saves 123KB from the bundle.

If other files use framer-motion (likely JournalModal, some dashboard widgets),
do NOT remove the package — just remove the import from PageTransition.jsx.

═══ PHASE 5: Remove Axios if Unused ═══

Search for axios usage:
  grep -r "from 'axios'" frontend/src/
  grep -r "import axios" frontend/src/

If no files import axios, remove it:
  cd frontend && npm uninstall axios

If files do import it, leave it for now — flag it for a future cleanup.

═══ VERIFICATION ═══

After all phases:
1. Run: cd frontend && npm run build
2. Check bundle sizes in build output — main chunk should be <500KB (ideally <400KB)
3. No build errors
4. Confirm framer-motion is NOT imported in PageTransition.jsx
5. Confirm Supabase client has the realtime config
6. Confirm ChatBot and OnboardingBanner are lazy-loaded

Update .agent/handoff.md with what changed and bundle size before/after.
```

---

## EXPECTED IMPACT

| Change | Time Saved | Bundle Saved |
|--------|-----------|--------------|
| Query waterfall → progressive render | 2-4s on dashboard | — |
| Realtime throttle | 200-500ms initial load | — |
| Lazy ChatBot + OnboardingBanner | 300-500ms initial load | ~50KB |
| CSS transitions (remove Framer Motion) | — | 123KB |
| Remove axios | — | 29KB |
| **TOTAL** | **~3-5s faster** | **~200KB smaller** |
