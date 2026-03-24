# iConnect — Session Handoff
# ════════════════════════════════════════════════════════════════
# INSTRUCTIONS: Fill this out at the END of every session.
# Claude reads this at the START of every session.
# Be specific. Vague entries are useless.
# ════════════════════════════════════════════════════════════════

## Last Updated
2026-03-24 — Session: Phase 1 Blueprint Execution — Database Foundation

## What We Worked On
- Created 3 new migrations as part of Opus Blueprint Phase 1:
  - 20260324083653_missing_tables_and_columns.sql — 6 tables + 2 columns + RLS + indexes
  - 20260324083908_scoring_system.sql — score_rules + fn_calculate_score_delta trigger
  - 20260324084313_fix_score_rules_points.sql — patch score_rules with correct point values
- Discovered 4 tables already existed on remote (calendar_diary, user_study_persona,
  clinical_logs, study_plan_history) with partial schemas — patched missing columns
- Regenerated frontend/src/lib/database.types.ts from remote schema
- All 3 migrations pushed and in sync (local = remote)
- Frontend build: ✅ zero errors

## Current State
✅ Phase 1 Complete
- 6 tables exist on remote: calendar_diary, user_study_persona, clinical_logs,
  study_plan_history, user_notes, idempotency_keys
- score_rules has 14 rows with correct point values
- trg_score_delta trigger fires on activity_logs INSERT → auto-populates score_delta + upserts user_scores
- activity_logs.duration_minutes column added
- database.types.ts regenerated and contains all new table types

## Files Changed This Session
- supabase/migrations/20260324083653_missing_tables_and_columns.sql — created + pushed
- supabase/migrations/20260324083908_scoring_system.sql — created + pushed
- supabase/migrations/20260324084313_fix_score_rules_points.sql — created + pushed
- frontend/src/lib/database.types.ts — regenerated

## Next Session Should Start With
→ Phase 2: Security Hardening
  Files to read: frontend/src/App.jsx (renderPage function), frontend/src/components/ExamPage.jsx
  (handleSubmit), supabase/functions/submit-exam/index.ts, frontend/src/lib/chatbotConstants.js
  Tasks: route guards, wire ExamPage to submit-exam edge function, fix hardcoded key

## Decisions Made
- Added ALTER TABLE ... ADD COLUMN IF NOT EXISTS patches for all pre-existing tables
  (calendar_diary, user_study_persona, clinical_logs, study_plan_history existed on remote)
- Created separate fix_score_rules_points migration rather than modifying the previous one
  (preserves idempotency and audit trail)
- score_rules ON CONFLICT changed to DO UPDATE in the fix migration to ensure correct values

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
