# Surgery Controller — Phase-by-Phase Execution Guide

## HOW THIS WORKS
1. Read this file at the start of the surgery
2. Execute the current phase (marked below)
3. When Ayush says "next", move to the next phase
4. For each phase, read ONLY the specified section from `.agent/SURGERY_BLUEPRINT.md`
5. Execute ONLY the steps listed — nothing more
6. After each step: update SURGERY_LOG.md, run `npm run build`, report results
7. After all steps in a phase: print `═══ PHASE N COMPLETE ═══` and STOP

## CURRENT PHASE: 0

---

## PHASE 0 — Reconnaissance (No code changes)

**Read:** SURGERY_BLUEPRINT.md → Section 3 (Phase 0), Step 0.6 only
**Skip:** Steps 0.1, 0.2 (already done), Steps 0.3–0.5 (Ayush's homework)

**Execute these steps in order:**

### Step 0.6 — Codebase Reconnaissance
- Run every grep/find command listed in Step 0.6
- Record ALL output in SURGERY_LOG.md under `## Reconnaissance`
- Do NOT modify any application code
- Print a summary of findings (file counts, god files, security concerns)

**When done:** Print `═══ PHASE 0 COMPLETE ═══` and STOP.
Wait for Ayush to say "next".

---

## PHASE 1 — Security & Service Layer (5 steps)

**Read:** SURGERY_BLUEPRINT.md → Section 4 (Phase 1)
**Branch:** `git checkout -b surgery/phase-1-security`

**Execute these steps in order:**

### Step 1.1 — Build dbService.js
- Read BLUEPRINT Section 4, Step 1.1 (all sub-steps 1.1a through 1.1e)
- Blast radius report FIRST — list every file containing `supabase.from(`
- Build `src/lib/dbService.js` with case transformer, error wrapper, AbortController
- Migrate ONLY the 5 critical call sites listed in 1.1e
- Log every change in SURGERY_LOG.md
- `npm run build` — must pass

### Step 1.2 — Secure API Keys
- Read BLUEPRINT Step 1.2 (sub-steps 1.2a and 1.2b)
- Blast radius report — find all NVIDIA/supabase key references
- Move keys to env vars, create AI Edge Function spec document
- Log changes, `npm run build`

### Step 1.3 — Lock Auth Gate
- Read BLUEPRINT Step 1.3 (sub-steps 1.3a, 1.3b, 1.3c)
- Blast radius report — find all OTP/auth/signIn references
- Set shouldCreateUser: false, add status checks, remove localStorage rate limiting
- Log changes, `npm run build`

### Step 1.4 — Kill Global Cache Leak
- Read BLUEPRINT Step 1.4 (sub-steps 1.4a, 1.4b, 1.4c)
- Blast radius report — find all module-level mutable variables
- Delete _dashCache, create centralized logout function
- Log changes, `npm run build`

### Step 1.5 — Fix sendBeacon
- Read BLUEPRINT Step 1.5
- Blast radius report — find all sendBeacon calls
- Replace with auth-aware alternatives
- Log changes, `npm run build`

### Phase 1 Verification
- Run the Phase 1 verification checklist from the blueprint
- Print results for each check item
- Commit: `milestone: Phase 1 complete — security sealed, service layer established`

**When done:** Print `═══ PHASE 1 COMPLETE ═══` and STOP.
Wait for Ayush to say "next".

---

## PHASE 2 — Data Integrity & Typing (5 steps)

**Read:** SURGERY_BLUEPRINT.md → Section 5 (Phase 2)
**Branch:** `git checkout -b surgery/phase-2-integrity`

**Execute these steps in order:**

### Step 2.1 — Zod Schemas
- Read BLUEPRINT Step 2.1
- Install zod if not in package.json
- Create `src/schemas/` directory with all schema files listed
- Fix validateInsert to THROW, not warn
- Log changes, `npm run build`

### Step 2.2 — Unify Question Schema
- Read BLUEPRINT Step 2.2
- Blast radius report — find every correct/correct_key reference
- Check actual DB column name, pick canonical name, update all references
- Log changes, `npm run build`

### Step 2.3 — Fix Idempotency
- Read BLUEPRINT Step 2.3 (sub-steps 2.3a, 2.3b, 2.3c)
- Create DB migration for UNIQUE constraint
- Fix check-then-insert to use ON CONFLICT
- Fix fire-and-forget key save
- Log changes, `npm run build`

### Step 2.4 — Fix Phantom Offline Registration
- Read BLUEPRINT Step 2.4
- Add reconnect sync logic, block unsynced usage
- Log changes, `npm run build`

### Step 2.5 — Server-Side Registration Validation
- Read BLUEPRINT Step 2.5
- Create NOT NULL constraint migration
- Document server-side validation requirements
- Log changes, `npm run build`

### Phase 2 Verification
- Run the Phase 2 verification checklist from the blueprint
- Print results for each check item
- Commit: `milestone: Phase 2 complete — data integrity enforced`

**When done:** Print `═══ PHASE 2 COMPLETE ═══` and STOP.
Wait for Ayush to say "next".

---

## PHASE 3 — State Management & Logic (5 steps)

**Read:** SURGERY_BLUEPRINT.md → Section 6 (Phase 3)
**Branch:** `git checkout -b surgery/phase-3-state`

**Execute these steps in order:**

### Step 3.1 — Fix Auth Race Condition
- Read BLUEPRINT Step 3.1
- Blast radius report — find onAuthStateChange, getSession, isAuthLoading
- Move auth init outside React tree, create singleton promise
- Log changes, `npm run build`

### Step 3.2 — Fix Quiz Timer Stale Closure
- Read BLUEPRINT Step 3.2 (sub-steps 3.2a through 3.2d)
- Blast radius report — find QuizPlayer, timer, finish function
- Add useRef for answers, cleanup timeouts, fix silent bail-out, add .single() guard
- Log changes, `npm run build`

### Step 3.3 — Fix Exam and Spaced Rep Bugs
- Read BLUEPRINT Step 3.3 (sub-steps 3.3a through 3.3g)
- AI timeout, crash guard, error classification, empty dropdown, NaN bar, stale userId, .catch()
- Log changes, `npm run build`

### Step 3.4 — Fix Zustand and React Hygiene
- Read BLUEPRINT Step 3.4 (sub-steps 3.4a, 3.4b, 3.4c)
- Remove navigator from Zustand, wrap callbacks in useCallback, track toast timeouts
- Log changes, `npm run build`

### Step 3.5 — Fix Remaining Logic Bugs
- Read BLUEPRINT Step 3.5 (sub-steps 3.5a through 3.5f)
- AI navigation whitelist, notification dedup, user truncation, timer, regex JSON, abort dashboard calls
- Log changes, `npm run build`

### Phase 3 Verification
- Run the Phase 3 verification checklist from the blueprint
- Print results for each check item
- Commit: `milestone: Phase 3 complete — state management and lifecycle fixed`

**When done:** Print `═══ PHASE 3 COMPLETE ═══` and STOP.
Wait for Ayush to say "next".

---

## PHASE 4 — UI/UX, Theme, PWA (4 steps)

**Read:** SURGERY_BLUEPRINT.md → Section 7 (Phase 4)
**Branch:** `git checkout -b surgery/phase-4-polish`

**NOTE:** This phase depends on Ayush's homework from Phase 0 (Steps 0.3, 0.4, 0.5).
Ask Ayush for the audit results before starting each relevant step.

**Execute these steps in order:**

### Step 4.1 — Centralize Theme System
- Read BLUEPRINT Step 4.1 (sub-steps 4.1a, 4.1b)
- Ask Ayush for Phase 0.4 theme audit screenshots
- Create `src/styles/theme.css` with CSS custom properties
- Replace hardcoded colors screen by screen
- Log changes, `npm run build`

### Step 4.2 — Fix PWA Install Flow
- Read BLUEPRINT Step 4.2 (sub-steps 4.2a, 4.2b, 4.2c)
- Ask Ayush for Phase 0.3 PWA audit results
- Fix manifest.json, capture install prompt
- Log changes, `npm run build`

### Step 4.3 — Align Content Pipeline
- Read BLUEPRINT Step 4.3
- Ask Ayush for Phase 0.5 content pipeline audit results
- Add schema validation to admin builder + student renderer
- Log changes, `npm run build`

### Step 4.4 — Cleanup Dead Routes
- Read BLUEPRINT Step 4.4 (sub-steps 4.4a, 4.4b)
- Redirect kahoot route, remove dead admin tab
- Log changes, `npm run build`

### Phase 4 Verification
- Run the Phase 4 verification checklist from the blueprint
- Run the FULL post-surgery verification matrix (Section 9)
- Print results for ALL 20 test items
- Commit: `milestone: Phase 4 complete — all surgical phases done`

**When done:** Print `═══ PHASE 4 COMPLETE ═══ ALL SURGERY DONE.` and STOP.

---

## RULES THAT APPLY TO EVERY PHASE
- Read the relevant BLUEPRINT section BEFORE writing any code
- Blast radius report BEFORE modifying any file
- `npm run build` AFTER every step — fix errors before proceeding
- Update SURGERY_LOG.md with every change (bug ID, file, what changed, how to verify)
- Commit after each step with format: `type: Phase N.Step — description`
- Never run `git push` — only `git add` + `git commit`
- If a file is >500 lines, create a .bak copy first
- No new dependencies without asking Ayush
- If you fail at something 3 times, STOP and tell Ayush to escalate to Opus
