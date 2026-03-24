# iConnect — Session Handoff
# ════════════════════════════════════════════════════════════════
# INSTRUCTIONS: Fill this out at the END of every session.
# Claude reads this at the START of every session.
# Be specific. Vague entries are useless.
# ════════════════════════════════════════════════════════════════

## Last Updated
2026-03-24 — Session: Phase 2 Blueprint Execution — Security Hardening

## What We Worked On
Phase 1 (previous session):
- Created 6 DB tables, scoring trigger, regenerated database.types.ts

Phase 2 (this session):
- Task 2A: Added role-based route guards to renderPage() in App.jsx
  ROLE_PAGES allowlist: doctor (19 pages), contentadmin (7 pages), superadmin (unrestricted)
  Guard redirects to 'dashboard' if role tries to access a page not in their allowlist
- Task 2B: Wired ExamPage.jsx to submit-exam edge function
  Removed client-side score calculation entirely
  Score now comes from edge function response (tamper-proof)
  Added submitting state + disabled button during submission
  Kept SR card creation client-side (edge function doesn't handle it)
  Fixed swallowed catch block — now uses captureException(err) + addToast
- Task 2C: Fixed hardcoded Supabase keys in chatbotConstants.js
  SUPABASE_URL and SUPABASE_ANON_KEY now read from import.meta.env

## Current State
✅ Phase 1 Complete ✅ Phase 2 Complete
- Build: zero errors
- Route guards active for doctor + contentadmin roles
- Exam scoring: server-side via submit-exam edge function
- No hardcoded credentials in source

## Files Changed This Session
- frontend/src/App.jsx — ROLE_PAGES + renderPage() route guard
- frontend/src/components/ExamPage.jsx — new handleSubmit, submitting state, import cleanup
- frontend/src/components/chatbot/chatbotConstants.js — removed hardcoded keys

## Next Session Should Start With
→ Phase 3: Performance Overhaul
  Files to read: frontend/src/App.jsx (imports + renderPage), frontend/src/components/DoctorDashboard.jsx
  (load function), frontend/src/components/ActivityPage.jsx (data fetch), frontend/vite.config.js,
  frontend/src/lib/trackActivity.js, frontend/src/components/arena/LiveArenaStudent.jsx
  Tasks: lazy loading, Promise.all dashboard queries, vite manualChunks, memory leak fixes, Zustand selectors

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
