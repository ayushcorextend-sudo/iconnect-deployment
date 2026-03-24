# iConnect — Claude Code Master Rulebook
# ════════════════════════════════════════════════════════════════
# READ THIS FIRST. Every session. No exceptions.
# ════════════════════════════════════════════════════════════════

## ── MANDATORY SESSION START PROTOCOL ───────────────────────────

1. Read `.agent/handoff.md` — this tells you exactly where we left off
2. Read `.agent/architecture.md` — this is the living map of the codebase
3. Do NOT scan the full project. Ask the user to scope the task.
4. Confirm your understanding: "I see we left off at X, working on Y. Ready."

## ── PROJECT IDENTITY ────────────────────────────────────────────

**Product:** iConnect — Medical education SaaS for Indian doctors (MBBS/PG)
**Stack:**
- Frontend: React 19 + Vite 7 + Tailwind CSS 3 + Framer Motion 12
- State: Zustand 5 (6 stores — see architecture.md)
- Backend: Express.js (server/) — secondary, most logic is client-side
- Database: Supabase (PostgreSQL 17) with RLS
- Edge Functions: Deno (supabase/functions/)
- Auth: Supabase Auth (OTP + Google OAuth + password)
- Deployment: Vercel (frontend) + Supabase hosted (DB)
- Monitoring: Sentry

**User Roles:** `superadmin` → `contentadmin` → `doctor`
**Multi-tenant:** Yes — tenant isolation via `tenantResolver.js`

## ── ABSOLUTE HARD RULES ─────────────────────────────────────────

These are non-negotiable. Never deviate, never reason around them.

### Database & Security
- [ ] ALL Supabase queries go through `frontend/src/lib/supabase.js` only
- [ ] NEVER write raw `supabase.from()` calls inside components or stores
- [ ] NEVER log user data: no `console.log(user)`, `console.log(profile)`, `console.log(session)`
- [ ] NEVER expose `userId`, `email`, `mci_number`, or any PII in console output
- [ ] NEVER modify RLS policies without the user typing "APPROVE RLS CHANGE" explicitly
- [ ] NEVER add a new Supabase table without a migration file in `supabase/migrations/`
- [ ] Migrations ONLY go in `supabase/migrations/` — NEVER in `frontend/src/migrations/`
- [ ] Migration filenames MUST follow format: `YYYYMMDDHHMMSS_description.sql`

### State Management
- [ ] NEVER create a new Zustand store without checking all 6 existing stores first
- [ ] Existing stores: useAppStore, useAuthStore, useChatStore, useOfflineStore, useReaderStore, useTenantStore
- [ ] NEVER duplicate state that already exists in a store

### Components
- [ ] NEVER write inline Tailwind when a design token exists in `frontend/src/styles/tokens.js`
- [ ] NEVER create a new UI primitive (button, modal, card) without checking `frontend/src/components/ui/` first
- [ ] NEVER use arbitrary Tailwind values (e.g. `w-[347px]`) — use scale values only
- [ ] All async operations in components MUST have loading + error states

### Auth
- [ ] Auth state comes ONLY from `AuthContext.jsx` via `useAuth()` hook
- [ ] NEVER read auth state from localStorage directly in components
- [ ] NEVER call `supabase.auth.*` directly in components — use the functions in `supabase.js`

### Files
- [ ] `.bak` files are backups — NEVER edit them, NEVER delete them without asking
- [ ] NEVER edit `.env.local` files — tell the user what to add
- [ ] NEVER commit secrets, API keys, or credentials

## ── CODEBASE NAVIGATION RULES ───────────────────────────────────

When given a task, scope your file access to ONLY what's needed:

| Task Type | Files to Read |
|-----------|---------------|
| Auth bug | `AuthContext.jsx`, `supabase.js` (auth section), `useAuthStore.js` |
| UI component | The specific component + `tokens.js` + `ui/` folder |
| Database change | Relevant migration + `supabase.js` (relevant section) |
| New feature | `architecture.md` first, then relevant module folder |
| Edge function | `supabase/functions/[name]/index.ts` + `_shared/cors.ts` |
| State bug | The specific store + components that consume it |

DO NOT read the entire `supabase.js` file for every task — it is 400+ lines. Read only the relevant section.

## ── DESIGN SYSTEM RULES ─────────────────────────────────────────

See `frontend/CLAUDE.md` for full UI rules.

Core principles:
- Design tokens live in `frontend/src/styles/tokens.js` — use them
- Z-index values live in `frontend/src/styles/zIndex.js` — use them
- Animation: Framer Motion only — no CSS transitions for interactive elements
- Icons: Lucide React only — no other icon libraries

## ── MIGRATION RULES ─────────────────────────────────────────────

See `supabase/CLAUDE.md` for full migration rules.

When creating a new migration:
1. Use format: `supabase migration new description_of_change`
2. Always use `IF NOT EXISTS` / `IF EXISTS` guards
3. Always wrap RLS policy creation in `DO $$ BEGIN IF NOT EXISTS... END $$` blocks
4. Test locally with `supabase db push` before declaring done

## ── END OF SESSION PROTOCOL ────────────────────────────────────

Before ending ANY session, update `.agent/handoff.md` with:
- What was worked on (specific files changed)
- Current state (working / broken / incomplete)
- Exact next step for next session
- Any decisions made and why
- Any files that should NOT be touched

## ── SCOPED RULE FILES ───────────────────────────────────────────

- UI & Components → `frontend/CLAUDE.md`
- Backend/Server → `server/CLAUDE.md`
- Database/RLS → `supabase/CLAUDE.md`
- Agent memory → `.agent/architecture.md`
