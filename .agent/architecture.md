# iConnect — Living Architecture Map
# ════════════════════════════════════════════════════════════════
# Updated: 2026-03-24
# This file is the single source of truth for codebase knowledge.
# Update this file whenever a module changes significantly.
# ════════════════════════════════════════════════════════════════

## ── USER ROLES & FLOWS ──────────────────────────────────────────

```
superadmin
  └── SADashboard.jsx
      ├── AIInsightsTab.jsx      — AI analytics
      ├── ArtifactsTab.jsx       — Content management
      ├── DoctorApprovalsTab.jsx — Approve/reject doctors
      ├── ManageAdminsTab.jsx    — Manage content admins
      ├── ReportsTab.jsx         — Analytics reports
      └── WebinarCalendarTab.jsx — Webinar scheduling

contentadmin (CA)
  └── CADashboard.jsx
      └── ContentAdminDashboard.jsx — Upload & manage artifacts
          ├── ContentAdminNotificationCenter.jsx
          └── ContentAdminEngageView.jsx

doctor
  └── DoctorDashboard.jsx
      ├── dashboard/ widgets     — Activity, goals, content
      ├── StudyPlan/             — Spaced repetition, weekly planner
      ├── EBooksPage.jsx         — PDF library
      ├── ExamPage.jsx           — Exam taking
      ├── LeaderboardPage.jsx    — Rankings
      ├── BroadcastPage.jsx      — Notifications/engage
      └── ActivityPage.jsx       — Heatmap, diary
```

## ── AUTH FLOW ───────────────────────────────────────────────────

```
Login options:
1. OTP (email) → authSendOtp() → authVerifyOtp() → profile check → role route
2. Google OAuth → authSignInWithGoogle() → redirect → profile check → role route
3. Password → authSignIn() → profile check → role route

New user flow:
Registration → RegistrationPage.jsx → ProfileSetupPage.jsx → PendingApprovalScreen.jsx
             → [SA approves in DoctorApprovalsTab] → Doctor gets access

Auth state chain:
supabase.auth → AuthContext.jsx (session, user, isAuthLoading)
              → useAuthStore.js (role, authRole)
              → setAuthRole() called after profile fetch
```

## ── DATA FLOW ───────────────────────────────────────────────────

```
All DB reads/writes:
Component → frontend/src/lib/supabase.js → Supabase DB (with RLS)

Sensitive operations:
Component → supabase/functions/[name] → DB (with service role)
  - submit-exam (prevents score manipulation)
  - send-*-email (keeps SMTP config server-side)

AI features:
Component → supabase/functions/gemini-proxy → Gemini API
Component → supabase/functions/generate-embeddings → pgvector
Component → supabase/functions/query-embedding → semantic search
```

## ── MODULE MAP ──────────────────────────────────────────────────

### Core Libraries (frontend/src/lib/)

| File | Purpose | Key exports |
|------|---------|-------------|
| `supabase.js` | ALL Supabase interactions | 40+ functions, auth + data |
| `auditLog.js` | Audit trail logging | `logAction()` |
| `aiService.js` | AI/Gemini integration | AI chat functions |
| `semanticSearch.js` | pgvector search | `searchContent()` |
| `tenantResolver.js` | Multi-tenant resolution | `resolveTenant()` |
| `offlineSync.js` | Offline queue sync | `syncPendingActions()` |
| `dataCache.js` | Local cache layer | Cache read/write |
| `idempotency.js` | Prevent duplicate ops | `withIdempotency()` |
| `sm2.js` | Spaced repetition algorithm | SM-2 implementation |
| `traceHeaders.js` | Sentry trace headers | `getTraceHeaders()` |
| `schemas.js` | Zod validation schemas | Form validation |
| `blobManager.js` | Blob URL management | Memory cleanup |
| `signedUrl.js` | Supabase Storage signed URLs | `getSignedUrl()` |
| `notificationDispatcher.js` | Push notifications | `dispatch()` |

### Zustand Stores (frontend/src/stores/)

| Store | State | Actions |
|-------|-------|---------|
| `useAuthStore` | user, role, isLoading | setUser, setRole, clearAuth |
| `useAppStore` | theme, sidebar open, toasts | setTheme, addToast |
| `useChatStore` | messages, isOpen, context | addMessage, toggleChat |
| `useOfflineStore` | pendingActions, isOnline | addPendingAction, sync |
| `useReaderStore` | currentPage, zoom, notes | setPage, setZoom |
| `useTenantStore` | tenantId, config, features | setTenant, getFeature |

### Feature Modules

#### Arena (Live Quiz)
- `arena/KahootScheduler.jsx` — SA schedules live quiz
- `arena/LiveArenaHost.jsx` — SA hosts live session
- `arena/LiveArenaStudent.jsx` — Doctor participates
- Uses Supabase Realtime for live sync

#### Content/Artifacts
- `content/LearnHub.jsx` — Main content browser
- `content/VideoManager.jsx` — Video content management
- `content/FlashcardMaker.jsx` / `FlashcardPlayer.jsx` — Flashcard system
- `ebooks/PDFReaderView.jsx` — PDF reader (uses `useReaderStore`)
- CA uploads via `ContentAdminDashboard.jsx` → `insertArtifact()` → `uploadToStorage()`

#### Study Plan
- `StudyPlan/SpacedRepetition.jsx` — SM-2 algorithm via `sm2.js`
- `StudyPlan/WeeklyPlanner.jsx` — Weekly schedule
- `StudyPlan/PersonaBuilder.jsx` — Learning profile
- `StudyPlan/ClinicalLogger.jsx` — Clinical case logging

#### Exam System
- `Exam/ExamManager.jsx` — Create/manage exams (SA/CA)
- `Exam/QuestionEditor.jsx` — Question CRUD
- `ExamPage.jsx` — Doctor takes exam
- Scoring via `supabase/functions/submit-exam` (server-side, tamper-proof)

#### AI Features
- `chatbot/ChatPanel.jsx` — Main AI chat interface
- `chatbot/DoubtBusterPanel.jsx` — Subject-specific doubt resolution
- `SmartNotesPanel.jsx` — AI-generated notes with star/bookmark
- `CaseSimulator.jsx` — Clinical case simulation
- All AI calls proxied via `gemini-proxy` edge function

## ── MULTI-TENANCY ───────────────────────────────────────────────

iConnect supports multiple medical institutions as tenants.
- Tenant resolved via `tenantResolver.js` on app load
- Stored in `useTenantStore`
- DB tables with `tenant_id` are filtered automatically
- Features can be enabled/disabled per tenant via `useTenantStore.getFeature()`

## ── KNOWN TECHNICAL DEBT ────────────────────────────────────────

These are known issues — do NOT "fix" without discussing first:

1. `frontend/src/migrations/` — Legacy manual migration files. These are reference-only.
   They document schema intent but are NOT run by the CLI. Do not delete, do not run.

2. `.bak` files — Backup copies of files before major refactors. Do not delete.
   Files: `App.jsx.bak`, `BroadcastPage.jsx.bak`, `DoctorDashboard.jsx.bak`,
   `Login.jsx.bak`, `RegistrationPage.jsx.bak`, `Sidebar.jsx.bak`, `TopBar.jsx.bak`

3. `server/` — Express backend is partially redundant with Supabase.
   Some routes may be unused. Do not refactor without audit.

4. Dual auth systems — Password auth + OTP auth + Google OAuth all coexist.
   The `authSignIn` function handles password, `authSendOtp`/`authVerifyOtp` handles OTP.

5. `supabase.js` is 400+ lines — it needs to be split into modules eventually.
   Current sections: AUTH, ARTIFACTS, USER CONTENT STATE. Split when adding new sections.

## ── DEPLOYMENT ──────────────────────────────────────────────────

```
Frontend: Vercel
  - Auto-deploys on push to main
  - Manual: npm run deploy:prod (from frontend/)
  - Full ship: npm run ship (pushes git + deploys)

Database: Supabase hosted
  - Push migrations: supabase db push
  - Edge functions: supabase functions deploy [name]

Environment variables:
  - frontend/.env.local — Vite env vars (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)
  - server/.env — Express env vars
  - Supabase secrets — for edge functions (set via dashboard or CLI)
```

## ── CHANGELOG ───────────────────────────────────────────────────

### 2026-03-24
- Cleaned up migration history — resolved 20260313/20260314 naming conflicts
- Pushed 20260324000000 (registration professional fields) to remote
- Pushed 20260324000001 (smart_notes is_starred patch) to remote
- Migration history now fully in sync (local = remote for all 23 migrations)
- Created CLAUDE.md hierarchy (./, frontend/, supabase/, server/)
- Created .agent/ folder structure
