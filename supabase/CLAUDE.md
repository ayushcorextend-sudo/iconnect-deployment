# iConnect Supabase — Database & RLS Rules
# ════════════════════════════════════════════════════════════════
# Scoped to: supabase/
# Read alongside: root CLAUDE.md
# ════════════════════════════════════════════════════════════════

## ── MIGRATION RULES ─────────────────────────────────────────────

### Creating migrations
Always use the CLI — NEVER manually create migration files:
```bash
supabase migration new description_of_change
```
This generates the correct timestamp automatically.

### Migration file checklist
Every migration MUST:
- [ ] Use `IF NOT EXISTS` for CREATE TABLE, CREATE INDEX, CREATE POLICY
- [ ] Use `IF EXISTS` for DROP statements
- [ ] Wrap new RLS policies in `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies...) THEN ... END IF; END $$`
- [ ] Be idempotent — safe to run twice
- [ ] Have a comment at the top explaining what it does and why
- [ ] NEVER reference tables that don't exist earlier in the migration sequence

### The profiles dependency rule
Many tables reference `profiles`. The `profiles` table is created in `20260301071219_remote_schema.sql`.
Any migration referencing `profiles` MUST have a timestamp AFTER `20260301071219`.

## ── TABLE REFERENCE MAP ─────────────────────────────────────────

Core tables (from remote schema):
- `profiles` — user profiles, roles, status, MCI verification
- `artifacts` — educational content (PDFs, videos)
- `user_content_state` — bookmarks, reading progress per user per artifact
- `user_notes` — notes attached to artifacts
- `smart_notes` — AI-generated notes (has `is_starred` column)
- `conferences` — webinars/conferences
- `audit_logs` — action audit trail (NEVER delete from this table)
- `idempotency_keys` — prevent duplicate submissions

Multi-tenant tables:
- All tenant-scoped tables use `tenant_id` column
- `tenantResolver.js` handles tenant resolution on the client

## ── RLS POLICY RULES ────────────────────────────────────────────

**NEVER modify RLS policies without explicit "APPROVE RLS CHANGE" from the user.**

Current RLS pattern:
- Doctors: read approved content, write own profile/notes
- Content Admins: write artifacts (pending status), manage own uploads
- Super Admins: full access via service role or role check

Standard RLS policy pattern:
```sql
-- Always check pg_policies before creating
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'Policy Name Here' 
    AND tablename = 'table_name'
  ) THEN
    CREATE POLICY "Policy Name Here" ON table_name
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.id = auth.uid()
          AND profiles.role IN ('superadmin', 'contentadmin')
        )
      );
  END IF;
END $$;
```

## ── EDGE FUNCTIONS ──────────────────────────────────────────────

Located in `supabase/functions/`. Each function:

| Function | Purpose |
|----------|---------|
| `gemini-proxy` | Proxies Gemini AI requests (keeps API key server-side) |
| `generate-embeddings` | Creates pgvector embeddings for semantic search |
| `query-embedding` | Queries semantic search |
| `submit-exam` | Server-side exam scoring (prevents client manipulation) |
| `send-approval-email` | Doctor approval notification |
| `send-notification-email` | General notification emails |
| `welcome-email` | New user welcome |
| `backfill-zones` | Data migration utility |

### Edge function rules
- CORS is handled by `_shared/cors.ts` — always import it
- NEVER put API keys in function code — use Supabase secrets
- All functions must handle OPTIONS preflight requests
- Return consistent error shapes: `{ error: string, code: string }`

## ── STORAGE BUCKETS ─────────────────────────────────────────────

Known buckets:
- `verification-documents` — MCI/NMC certificates (private)
- `artifacts` (inferred) — PDF/video content files

Rules:
- Private buckets require signed URLs — use `ui/SignedImg.jsx` and `useSignedUrl.js`
- NEVER use public URLs for verification documents
- File size limit: 50MiB (set in config.toml)

## ── LOCAL DEV COMMANDS ──────────────────────────────────────────

```bash
# Start local Supabase
supabase start

# Check migration sync status
supabase migration list

# Create new migration
supabase migration new description

# Push pending migrations to remote
supabase db push

# Generate TypeScript types (run after schema changes)
supabase gen types typescript --local > frontend/src/lib/database.types.ts

# Diff local vs remote schema
supabase db diff
```

## ── TYPE GENERATION ─────────────────────────────────────────────

After ANY schema change, regenerate types:
```bash
supabase gen types typescript --local > frontend/src/lib/database.types.ts
```

This file is the source of truth for TypeScript types. Import from it, don't write manual types for DB shapes.

## ── AUDIT LOG RULES ─────────────────────────────────────────────

The `audit_logs` table and `src/lib/auditLog.js` track all sensitive actions.

Actions that MUST be audit logged:
- Doctor approval/rejection
- Role changes
- Content approval/rejection
- Exam submissions
- Admin actions

NEVER delete from `audit_logs`. It is an append-only table.
