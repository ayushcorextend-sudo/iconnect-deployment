# iConnect — Session Handoff
# ════════════════════════════════════════════════════════════════
# INSTRUCTIONS: Fill this out at the END of every session.
# Claude reads this at the START of every session.
# Be specific. Vague entries are useless.
# ════════════════════════════════════════════════════════════════

## Last Updated
2026-03-24 — Session: Migration cleanup + Blueprint setup

## What We Worked On
- Cleaned iConnect migration history (supabase/migrations/)
- Resolved naming conflicts: 20260313_ca_workflow.sql → 20260313500000_ca_workflow.sql
- Resolved naming conflicts: 20260314_doctor_ux.sql → 20260314020000_doctor_ux.sql
- Deleted orphan remote entries via Supabase SQL Editor
- Pushed two pending migrations (professional fields + smart_notes patch)
- Created full CLAUDE.md hierarchy and .agent/ folder structure

## Current State
✅ Complete — migration history is clean and in sync

## Files Changed This Session
- supabase/migrations/20260313_ca_workflow.sql → renamed to 20260313500000_ca_workflow.sql
- supabase/migrations/20260314_doctor_ux.sql → renamed to 20260314020000_doctor_ux.sql
- supabase/migrations/20260324000000_registration_professional_fields.sql — pushed to remote
- supabase/migrations/20260324000001_patch_smart_notes_is_starred.sql — pushed to remote
- CLAUDE.md — created (root)
- frontend/CLAUDE.md — created
- supabase/CLAUDE.md — created
- server/CLAUDE.md — created
- .agent/architecture.md — created
- .agent/handoff.md — created (this file)

## Next Session Should Start With
[ ] No urgent task — migration cleanup complete.
    Suggested next: review frontend/src/styles/tokens.js and build out the design token system
    OR: audit frontend/src/lib/supabase.js and split into modules

## Decisions Made
- Chose to rename migrations with suffix `500000` / `020000` to avoid conflicts with existing timestamps
- Did NOT delete frontend/src/migrations/ — treating as reference documentation
- Did NOT migrate Express server — leaving as-is pending audit

## Do NOT Touch Until Discussed
- frontend/src/migrations/ — reference only, do not run or delete
- *.bak files — backups, leave alone
- server/ — needs audit before any refactor
- supabase/migrations/20260301071219_remote_schema.sql — master schema dump, do not modify

## Known Issues / Open Questions
- `supabase db diff` still fails locally due to profiles dependency ordering in 2024xxxx migrations
  This is a local-only cosmetic issue — production is fine. Fix when needed.
- server/ Express backend may have redundant routes vs Supabase — audit needed
