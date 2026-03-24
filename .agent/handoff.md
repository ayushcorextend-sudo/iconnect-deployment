# iConnect — Session Handoff
# ════════════════════════════════════════════════════════════════
# INSTRUCTIONS: Fill this out at the END of every session.
# Claude reads this at the START of every session.
# Be specific. Vague entries are useless.
# ════════════════════════════════════════════════════════════════

## Last Updated
2026-03-24 — Session: Phase 4 — Dashboard Data Wiring

## What We Worked On
Phase 3 (this session):
- Task 3A: DoctorDashboard parallel queries
  Rewrote sequential load() into single Promise.all([7 queries])
  duration_minutes || 30 → || 0 (wrong default fixed)
  Empty-state guards added for null logs
- Task 3C: Vite manualChunks bundle splitting
  vendor-supabase: 172 KB, vendor-motion: 125 KB, vendor-lucide: 19 KB
  Main bundle reduced by separating heavy vendors
- Task 3D: trackActivity memory leak fix
  Added cleanupActivityTracking() export (cancels timer, drains queue)
  Wired into App.jsx logout() — called before unsubscribeAll()
- Task 3E: Arena subscription memory leak + score reset bug
  subscribeArena(): removes existing channel before creating new (was leaking)
  joinArena upsert: removed score: 0 (was resetting score on rejoin)
- Task 3F: Zustand useShallow selectors
  All 4 broad store destructures in MainApp() wrapped with useShallow(s => s)
  Second useAppStore() call scoped to { initRouter, syncFromLocation } only
- Task 3G: Activity/Leaderboard query guards
  ActivityPage 90-day logs query: added .limit(5000)
  LeaderboardPage setCached: added TTL 5 * 60 * 1000 (was using default 2 min)

## Current State
✅ Phase 1 Complete ✅ Phase 2 Complete ✅ Phase 3 Complete ✅ Phase 4 Complete
- Build: zero errors (verified npm run build)
- All dashboard widgets wired to real DB data
- Duration tracking active across exam, quiz, ebooks, spaced repetition

## Files Changed This Session (Phase 4)
- supabase/migrations/20260324093903_phase4_missing_columns.sql — study_hours, goals_met, difficulty columns
- frontend/src/components/Activity/DiaryPanel.jsx — notes → personal_notes column fix
- frontend/src/components/StudyPlan/ClinicalLogger.jsx — key_learnings → learning_points, logged_at → created_at
- frontend/src/components/StudyPlan/WeeklyPlanner.jsx — plan_data → plan, completed_tasks persistence, planId state
- frontend/src/components/dashboard/StudyPlanCard.jsx — shows structured task progress from study_plan_history
- frontend/src/components/DoctorDashboard.jsx — 8th parallel query for active plan, activePlan state + prop
- frontend/src/components/quiz/QuizPlayer.jsx — trackActivity quiz_complete/quiz_passed/quiz_attempted + timer
- frontend/src/lib/trackActivity.js — startTimer/stopTimer exports, durationMinutes param
- frontend/src/components/ExamPage.jsx — startTimer on exam start, stopTimer + duration on submit
- frontend/src/components/EBooksPage.jsx — startTimer on open, stopTimer + trackActivity on close
- frontend/src/components/StudyPlan/SpacedRepetition.jsx — startTimer on load, stopTimer on session complete

## Next Session Should Start With
→ Phase 5: Feature Completion
  Files to read (only as needed per task):
  - frontend/src/components/dashboard/MonthlyCalendar.jsx (or CalendarGoalRow.jsx)
  - frontend/src/components/dashboard/WebinarLeaderboardRow.jsx
  - frontend/src/components/arena/LiveArenaStudent.jsx (already read)
  - frontend/src/components/SmartNotesPanel.jsx
  Tasks: DayDetailPanel calendar view, webinar save, arena final fixes,
  approval emails, PDF notes persistence, embeddings, AI insights

## Decisions Made
- ROLE_PAGES superadmin = [] (empty = unrestricted) rather than explicit list — easier to maintain
- Kept SR card creation in ExamPage client-side; edge function handles scoring + idempotency only
- Used captureException (named import) not default Sentry import — matches sentry.js exports
- Added ALTER TABLE ... ADD COLUMN IF NOT EXISTS patches for all pre-existing tables (Phase 1)

## Do NOT Touch Until Discussed
- frontend/src/migrations/ — reference only, do not run or delete
- *.bak files — backups, leave alone
- server/ — needs audit before any refactor
- supabase/migrations/20260301071219_remote_schema.sql — master schema dump, do not modify

## Known Issues / Open Questions
- supabase db diff still fails locally (profiles ordering in 2024xxxx migrations) — cosmetic, prod fine
- server/ Express backend redundancy vs Supabase — audit still pending
- Phase 1 trigger (trg_score_delta) cannot be verified without inserting a test row — verify
  manually in Supabase Studio after Phase 2 or as a spot check now
