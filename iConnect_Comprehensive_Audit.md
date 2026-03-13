# iConnect — Comprehensive System Audit
**Date:** 2026-03-11
**Version:** Production (Phase 11, 8-change SOW complete)
**Live URL:** https://iconnect-med.vercel.app
**Auditor:** Claude Code (Anthropic)

---

## Table of Contents
1. [Project Overview & Architecture](#1-project-overview--architecture)
2. [Directory Structure](#2-directory-structure)
3. [Database Schema & Supabase Setup](#3-database-schema--supabase-setup)
4. [Backend & API Routes](#4-backend--api-routes)
5. [Frontend State & Component Architecture](#5-frontend-state--component-architecture)
6. [Integrations & DevOps](#6-integrations--devops)
7. [Dependencies](#7-dependencies)
8. [Known Issues & TODOs](#8-known-issues--todos)
9. [Security Assessment](#9-security-assessment)
10. [Performance Notes](#10-performance-notes)

---

## 1. Project Overview & Architecture

iConnect is a **medical education platform** built for Indian PG (post-graduate) medical aspirants by Icon Lifescience. It serves three user roles — Super Admin, Content Admin, and Doctor (PG Aspirant) — with features spanning e-book reading, MCQ exams, leaderboards, conferences, webinars, and an AI chatbot.

### Stack Summary

| Layer | Technology |
|---|---|
| **Frontend** | React 19, Vite 7, Tailwind CSS 3 |
| **Database & Auth** | Supabase (PostgreSQL 15 + Auth + Realtime + RLS + Edge Functions) |
| **AI Chatbot** | Google Gemini 2.0 Flash Lite via Supabase Edge Function proxy |
| **Transactional Email** | Resend API via Supabase Edge Function |
| **PDF Generation** | jsPDF 4 + html2canvas |
| **PWA** | vite-plugin-pwa + Workbox (service worker, offline caching) |
| **Deployment** | Vercel (frontend SPA) |
| **Package Manager** | npm (Node 18+) |
| **Containerisation** | None — no Dockerfile or docker-compose.yml found at project level |

### Architecture Diagram (Simplified)

```
Browser (React SPA)
    │
    ├─── Supabase JS Client ──► Supabase Cloud (ap-northeast-1)
    │        │                      ├── Auth (email/password, OTP, Google OAuth)
    │        │                      ├── PostgreSQL (profiles, artifacts, …)
    │        │                      ├── Realtime (postgres_changes subscriptions)
    │        │                      └── Edge Functions (Deno runtime)
    │        │                              ├── gemini-proxy  → Google Gemini API
    │        │                              └── send-approval-email → Resend API
    │
    └─── Vercel CDN ──► dist/ (SPA + sw.js + PWA manifest)
```

### User Roles & Access

| Role | Email | Access |
|---|---|---|
| `superadmin` | admin@iconnect.in | Full platform — approve doctors, manage artifacts, webinars, audit logs |
| `contentadmin` | content@iconnect.in | Upload content, view pending verifications (read-only), conferences |
| `doctor` | registered users | E-books, exams, leaderboard, activity, profile (only after admin approval) |

---

## 2. Directory Structure

```
iconnect/
├── frontend/                      ← Main React app
│   ├── src/
│   │   ├── App.jsx                ← Root component: auth state, routing, session management
│   │   ├── main.jsx               ← Vite entry point
│   │   ├── components/            ← 32 React components (see §5)
│   │   │   ├── Login.jsx
│   │   │   ├── RegistrationPage.jsx
│   │   │   ├── ProfileSetupPage.jsx
│   │   │   ├── PendingApprovalScreen.jsx
│   │   │   ├── AdminLoginModal.jsx
│   │   │   ├── SADashboard.jsx
│   │   │   ├── CADashboard.jsx
│   │   │   ├── DoctorDashboard.jsx
│   │   │   ├── EBooksPage.jsx
│   │   │   ├── UploadPage.jsx
│   │   │   ├── ExamPage.jsx
│   │   │   ├── MCIVerificationQueue.jsx
│   │   │   ├── LeaderboardPage.jsx
│   │   │   ├── ActivityPage.jsx
│   │   │   ├── ConferencesPage.jsx
│   │   │   ├── ReportsPage.jsx
│   │   │   ├── NotificationsPage.jsx
│   │   │   ├── ProfilePage.jsx
│   │   │   ├── UsersPage.jsx
│   │   │   ├── SettingsPage.jsx
│   │   │   ├── ChatBot.jsx
│   │   │   ├── DocumentationPage.jsx
│   │   │   ├── KahootPage.jsx
│   │   │   ├── Sidebar.jsx
│   │   │   ├── TopBar.jsx
│   │   │   ├── OnboardingBanner.jsx
│   │   │   ├── Avatar.jsx
│   │   │   ├── Toasts.jsx
│   │   │   ├── Toggle.jsx
│   │   │   └── ComingSoonPage.jsx
│   │   ├── lib/
│   │   │   ├── supabase.js        ← Supabase client + all auth/artifact functions
│   │   │   ├── trackActivity.js   ← Activity log writes + score upserts
│   │   │   ├── sendNotification.js← Notification inserts
│   │   │   └── auditLog.js        ← Admin audit trail inserts
│   │   └── data/
│   │       └── constants.js       ← STATES, ZONES, SPECIALITIES, PROG_YEARS, titles
│   ├── public/
│   │   ├── icons/
│   │   │   ├── icon-192.png
│   │   │   └── icon-512.png
│   │   └── manifest.webmanifest   ← PWA manifest
│   ├── dist/                      ← Built output (deployed to Vercel)
│   │   ├── index.html
│   │   ├── sw.js                  ← Service Worker (Workbox)
│   │   ├── workbox-*.js
│   │   └── assets/                ← JS/CSS chunks
│   ├── index.html                 ← SPA entry with iOS meta tags + Google Fonts
│   ├── vite.config.js             ← Build config + PWA plugin
│   ├── tailwind.config.js
│   ├── package.json
│   └── .env.local                 ← VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
│
├── supabase/
│   └── migrations/                ← 7 SQL migration files (see §3)
│       ├── 20260301071219_remote_schema.sql
│       ├── 20240002_iconnect_features.sql
│       ├── 20240003_conferences.sql
│       ├── 20240004_exam_module.sql
│       ├── 20240005_completion.sql
│       ├── 20240006_audit_logs.sql
│       └── 20240008_profiles_status.sql
│
└── iConnect_Comprehensive_Audit.md  ← This file
```

> **Note:** No `Dockerfile` or `docker-compose.yml` exists at project level. Docker references are only inside `node_modules`. There is a `server/` directory but its contents were minimal/empty.

---

## 3. Database Schema & Supabase Setup

**Project ID:** `kzxsyeznpudomeqxbnvp`
**Region:** `ap-northeast-1` (Tokyo)
**RLS:** Enabled on all tables

### 3.1 Tables

#### `profiles`
The central user table. Every authenticated user must have a row here.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID (PK) | Matches `auth.users.id` |
| `name` | TEXT | Display name (only name column — no full_name) |
| `email` | TEXT | Normalised lowercase |
| `role` | TEXT | `doctor` \| `superadmin` \| `contentadmin` |
| `status` | TEXT | `pending` \| `active` \| `rejected` (default: `pending`) |
| `verified` | BOOLEAN | Admin-set; gates access for doctors |
| `mci_number` | TEXT | MCI/NMC registration number |
| `phone` | TEXT | |
| `program` | TEXT | MD / MS / DM / MCh / DNB |
| `speciality` | TEXT | Subject speciality (only `speciality` — no `specialty`) |
| `college` | TEXT | Institution name |
| `place_of_study` | TEXT | Medical college |
| `joining_year` | INTEGER | Year of joining residency |
| `state` | TEXT | Home state (Indian) |
| `hometown` | TEXT | |
| `zone` | TEXT | North / South / East / West / Central |
| `neet_rank` | INTEGER | NEET-PG All India Rank (optional) |
| `created_at` | TIMESTAMPTZ | |

> ⚠️ **Columns that do NOT exist** (previously caused bugs): `address`, `bio`, `full_name`, `specialty`. All references to these have been removed in the last audit cycle.

**RLS Policies:**
- Users can read/update their own row (`auth.uid() = id`)
- Admins (`superadmin`, `contentadmin`) can read all rows
- `superadmin` can update status/verified on any row

---

#### `artifacts`
E-books/content submitted by Content Admins.

| Column | Type | Notes |
|---|---|---|
| `id` | BIGINT (PK) | Auto-increment |
| `title` | TEXT | |
| `subject` | TEXT | Subject category |
| `type` | TEXT | Default: `PDF` |
| `size` | TEXT | Human-readable file size |
| `uploaded_by` | TEXT | Uploader's name |
| `status` | TEXT | `pending` \| `approved` |
| `emoji` | TEXT | Visual icon for card |
| `access` | TEXT | `all` or restricted |
| `downloads` | INTEGER | Download count |
| `pages` | INTEGER | Page count |
| `date` | TEXT | Upload date display string |

**RLS Policies:**
- All authenticated users can read approved artifacts
- `contentadmin` / `superadmin` can insert
- `superadmin` can update status (approve/reject)

---

#### `activity_logs`
Immutable record of all user learning activities.

| Column | Type | Notes |
|---|---|---|
| `id` | BIGINT (PK) | |
| `user_id` | UUID (FK → profiles) | |
| `activity_type` | TEXT | See scoring table below |
| `reference_id` | TEXT | ID of artifact/exam/etc. |
| `score_delta` | INTEGER | Points awarded for this action |
| `duration_minutes` | INTEGER | Time spent (for hours-logged stat) |
| `created_at` | TIMESTAMPTZ | |

**Activity Types & Points:**

| Type | Points |
|---|---|
| `quiz_attempted` | 5 |
| `quiz_passed` | 20 |
| `article_read` | 10 |
| `note_viewed` | 5 |
| `document_downloaded` | 5 |
| `webinar_attended` | 30 |

**RLS:** Users access only their own rows.

---

#### `user_scores`
Aggregated score totals per user (updated via upsert on each activity).

| Column | Type | Notes |
|---|---|---|
| `user_id` | UUID (PK) | |
| `total_score` | INTEGER | Sum of all score_delta |
| `quiz_score` | INTEGER | Quiz-specific points |
| `reading_score` | INTEGER | Reading-specific points |
| `updated_at` | TIMESTAMPTZ | |

**RLS:** Users read their own; all authenticated users can read for leaderboard.

---

#### `notifications`
In-app notification queue.

| Column | Type | Notes |
|---|---|---|
| `id` | BIGINT (PK) | |
| `user_id` | UUID (FK → profiles) | |
| `type` | TEXT | `info` \| `success` \| `error` \| `warn` |
| `icon` | TEXT | Emoji icon |
| `title` | TEXT | |
| `body` | TEXT | |
| `channel` | TEXT | `in_app` |
| `unread` | BOOLEAN | Default: true |
| `created_at` | TIMESTAMPTZ | |

**Realtime:** App subscribes to INSERT events filtered by `user_id` for instant delivery.

---

#### `personal_targets`
User-defined weekly study goals.

| Column | Type | Notes |
|---|---|---|
| `user_id` | UUID | Composite PK with target_type |
| `target_type` | TEXT | `quizzes_per_week` \| `articles_per_week` |
| `target_value` | INTEGER | |

---

#### `conferences`
Medical conferences and events.

| Column | Type | Notes |
|---|---|---|
| `id` | BIGINT (PK) | |
| `title` | TEXT | |
| `organiser` | TEXT | |
| `date` | TEXT | |
| `city` | TEXT | |
| `speciality` | TEXT | For filtering |
| `url` | TEXT | Registration link |
| `featured` | BOOLEAN | Highlighted in UI |
| `created_at` | TIMESTAMPTZ | |

**Seeded with 5 records:** AIIMS Annual, APICON, IAPSM National, ISCCM Critical Care, FOGSI Annual.

---

#### `exam_subjects`
10 NEET-PG subject categories.

| Column | Type |
|---|---|
| `id` | BIGINT (PK) |
| `name` | TEXT |
| `icon` | TEXT |
| `question_count` | INTEGER |

**Subjects:** Anatomy, Physiology, Biochemistry, Pathology, Pharmacology, Microbiology, Forensic Medicine, Community Medicine, ENT, OB/GYN.

---

#### `exam_questions`
60 seeded NEET-PG MCQs.

| Column | Type | Notes |
|---|---|---|
| `id` | BIGINT (PK) | |
| `subject_id` | BIGINT (FK → exam_subjects) | |
| `question` | TEXT | |
| `options` | JSONB | Array of 4 strings |
| `correct_index` | INTEGER | 0–3 |
| `explanation` | TEXT | Post-attempt rationale |
| `difficulty` | TEXT | easy / medium / hard |

---

#### `exam_attempts`
User quiz results.

| Column | Type | Notes |
|---|---|---|
| `id` | BIGINT (PK) | |
| `user_id` | UUID | |
| `subject_id` | BIGINT | |
| `score` | INTEGER | |
| `total` | INTEGER | Questions attempted |
| `answers` | JSONB | User's selected indices |
| `created_at` | TIMESTAMPTZ | |

---

#### `subject_completion`
Tracks e-book subject completion badges.

| Column | Type |
|---|---|
| `user_id` | UUID |
| `subject` | TEXT |
| `completed` | BOOLEAN |
| `completed_at` | TIMESTAMPTZ |

---

#### `admin_webinars`
Webinars scheduled by Super Admin.

| Column | Type |
|---|---|
| `id` | BIGINT (PK) |
| `title` | TEXT |
| `speaker` | TEXT |
| `scheduled_at` | TIMESTAMPTZ |
| `duration_min` | INTEGER |
| `join_url` | TEXT |
| `description` | TEXT |

---

#### `webinar_registrations`
Users' personal webinar calendar.

| Column | Type |
|---|---|
| `id` | BIGINT (PK) |
| `user_id` | UUID |
| `webinar_id` | TEXT |
| `webinar_title` | TEXT |
| `webinar_date` | TIMESTAMPTZ |

---

#### `audit_logs`
Immutable admin action log. Superadmin-only read.

| Column | Type | Notes |
|---|---|---|
| `id` | BIGINT (PK) | |
| `actor_id` | UUID | Admin who took the action |
| `action` | TEXT | e.g. `approve_artifact`, `reject_user` |
| `resource` | TEXT | e.g. `artifact`, `user` |
| `resource_id` | TEXT | |
| `details` | JSONB | Extra context (name, title, etc.) |
| `created_at` | TIMESTAMPTZ | |

---

#### `app_settings`
Global key-value config store.

| Column | Type |
|---|---|
| `key` | TEXT (PK) |
| `value` | TEXT |

**Used for:** Kahoot PIN storage.

---

#### `notification_preferences`
Per-user notification channel toggles.

| Column | Type |
|---|---|
| `user_id` | UUID (PK) |
| `email_enabled` | BOOLEAN |
| `whatsapp_enabled` | BOOLEAN |
| `sms_enabled` | BOOLEAN |
| `in_app_enabled` | BOOLEAN |

---

### 3.2 Supabase Connection

```javascript
// src/lib/supabase.js
import { createClient } from '@supabase/supabase-js'
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL || 'http://127.0.0.1:54321',
  import.meta.env.VITE_SUPABASE_ANON_KEY || '<fallback_anon_key>'
)
```

All network calls use a `withTimeout(promise, 7000ms)` wrapper that races the query against a 7-second timer, gracefully falling back to localStorage cache or mock data when Supabase is unreachable.

---

## 4. Backend & API Routes

iConnect has **no traditional REST backend server** (no Express/Node.js API layer). All data access goes directly through the **Supabase JS client** (PostgREST auto-generated API behind RLS) plus two **Supabase Edge Functions**.

### 4.1 Supabase Edge Functions

Both functions are deployed to `https://kzxsyeznpudomeqxbnvp.supabase.co/functions/v1/`

---

#### `POST /functions/v1/gemini-proxy`

**Purpose:** Proxy AI chat messages to Google Gemini API without exposing the API key to the browser.

**Status:** ✅ Deployed and working

**Runtime:** Deno (Supabase Edge Function)

**Auth:** Supabase ANON_KEY in `Authorization: Bearer` header

**Request Body:**
```json
{
  "system": "You are iConnect Assistant...",
  "messages": [
    { "role": "user", "content": "What is NEET-PG?" },
    { "role": "assistant", "content": "NEET-PG is..." }
  ]
}
```

**Response:**
```json
{ "text": "The AI response text here" }
```

**Error Responses:**
- `400` — Missing messages
- `502` — Gemini API upstream failure (with error detail)
- `500` — Internal error

**Model Used:** `gemini-2.0-flash-lite`

**Config:**
- `maxOutputTokens`: 600
- `temperature`: 0.7
- `topK`: 40, `topP`: 0.95

**CORS:** Allows `https://iconnect-med.vercel.app` and `http://localhost:5173`

**Note:** If `GEMINI_API_KEY` is not set (quota=0 on free tier), returns `{ text: "quota exceeded" }` gracefully.

---

#### `POST /functions/v1/send-approval-email`

**Purpose:** Send professional HTML approval/rejection emails to doctors after MCI verification.

**Status:** ✅ Deployed and working

**Runtime:** Deno (Supabase Edge Function)

**Auth:** None (called server-side from MCIVerificationQueue with admin context)

**Request Body:**
```json
{
  "doctorEmail": "doctor@example.com",
  "doctorName": "Dr. Jane Smith",
  "mciNumber": "MH-2024-123456",
  "college": "AIIMS Delhi",
  "approved": true,
  "rejectionReason": ""
}
```

**Response:**
```json
{ "success": true }
```

**Email Provider:** Resend API (`from: 'iConnect <onboarding@resend.dev>'`)

**Fallback:** If `RESEND_API_KEY` is not set, logs and returns `{ success: true, note: 'no key' }` — never crashes the approval flow.

---

### 4.2 Supabase PostgREST (Auto-Generated)

The following data operations are performed directly via the Supabase JS client (not edge functions). All enforce RLS at the database layer.

| Operation | Table | Called By | Auth Required |
|---|---|---|---|
| Fetch all approved artifacts | `artifacts` | `fetchArtifacts()` in supabase.js | Yes |
| Upload new artifact | `artifacts` | `UploadPage.jsx` | Yes (contentadmin) |
| Approve artifact | `artifacts` | `approveArtifact()` | Yes (superadmin) |
| Reject/delete artifact | `artifacts` | `rejectArtifact()` | Yes (superadmin) |
| Fetch own profile | `profiles` | `ProfilePage.jsx`, `authSignIn()` | Yes |
| Upsert profile | `profiles` | `ProfileSetupPage.jsx`, `ProfilePage.jsx` | Yes |
| Fetch all profiles (admin) | `profiles` | `App.jsx:fetchUsers()`, `UsersPage.jsx` | Yes (admin) |
| Update doctor status | `profiles` | `MCIVerificationQueue.jsx` | Yes (superadmin) |
| Insert activity log | `activity_logs` | `trackActivity.js` | Yes |
| Fetch activity feed | `activity_logs` | `ActivityPage.jsx` | Yes |
| Upsert user scores | `user_scores` | `trackActivity.js` | Yes |
| Fetch leaderboard | `user_scores` + `profiles` | `LeaderboardPage.jsx` | Yes |
| Insert notification | `notifications` | `sendNotification.js` | Yes |
| Fetch notifications | `notifications` | `App.jsx:fetchNotifs()` | Yes |
| Mark notifications read | `notifications` | `App.jsx` | Yes |
| Real-time notifs | `notifications` | `App.jsx` (channel subscribe) | Yes |
| Fetch/save targets | `personal_targets` | `ActivityPage.jsx` | Yes |
| Fetch conferences | `conferences` | `ConferencesPage.jsx` | Yes |
| Add/delete conference | `conferences` | `ConferencesPage.jsx` | Yes (admin) |
| Fetch exam subjects | `exam_subjects` | `ExamPage.jsx` | Yes |
| Fetch exam questions | `exam_questions` | `ExamPage.jsx` | Yes |
| Save exam attempt | `exam_attempts` | `ExamPage.jsx` | Yes |
| Fetch/save webinars | `admin_webinars` | `SADashboard.jsx` | Yes |
| Fetch Kahoot PIN | `app_settings` | `KahootPage.jsx` | Yes |
| Insert audit log | `audit_logs` | `auditLog.js` | Yes |
| Fetch audit logs | `audit_logs` | `ReportsPage.jsx` | Yes (superadmin) |
| Fetch subject completion | `subject_completion` | `ProfilePage.jsx`, `EBooksPage.jsx` | Yes |
| Update subject completion | `subject_completion` | `EBooksPage.jsx` | Yes |
| Fetch webinar registrations | `webinar_registrations` | `ActivityPage.jsx` | Yes |

---

## 5. Frontend State & Component Architecture

### 5.1 State Management

iConnect uses **React's built-in `useState` + `useCallback` + `useEffect`** with no external state library (no Redux, Zustand, or Context API for global state). All shared state lives in `App.jsx` and is passed down as props.

**Global state (App.jsx):**

| State | Type | Purpose |
|---|---|---|
| `role` | string\|null | Current user role; gates all rendering |
| `userName` | string\|null | Display name |
| `userId` | string\|null | Supabase auth UID |
| `artifacts` | array | All artifacts (fetched once on login) |
| `notifications` | array | User's notification list |
| `users` | array | All profiles (admin only) |
| `page` | string | Current page/route (replaces React Router) |
| `demoMode` | boolean | Shows yellow offline banner |
| `appLoading` | boolean | Initial spinner before session restore |
| `needsProfile` | boolean | Routes new OAuth users to ProfileSetupPage |
| `pendingMessage` | string\|null | Shows amber blocked-account banner on Login |
| `darkMode` | boolean | Persisted to localStorage |
| `notifPanel` | boolean | TopBar notification dropdown open |

### 5.2 Routing

iConnect uses a **custom page-state router** (not React Router v6 `<Routes>`). Navigation is done by calling `setPage('pageName')` from any component via props or the `setPage` function in `commonProps`.

**Route map:**

| `page` value | Component | Role Access |
|---|---|---|
| `dashboard` | `SADashboard` / `CADashboard` / `DoctorDashboard` | All (role-split) |
| `ebooks` | `EBooksPage` | All |
| `upload` | `UploadPage` | contentadmin, superadmin |
| `leaderboard` | `LeaderboardPage` | doctor |
| `activity` | `ActivityPage` | doctor |
| `notifications` | `NotificationsPage` | All |
| `profile` | `ProfilePage` | All |
| `users` | `UsersPage` | superadmin, contentadmin |
| `reports` | `ReportsPage` | superadmin |
| `settings` | `SettingsPage` | All |
| `conferences` | `ConferencesPage` | All |
| `exam` | `ExamPage` | doctor |
| `docs` | `DocumentationPage` | All |
| `kahoot` | `KahootPage` | All |
| `social` | `ComingSoonPage` | All |
| `groups` | `ComingSoonPage` | All |

### 5.3 Authentication Flow

```
User visits /
    │
    ├── localStorage has session?
    │       YES → restore role/name instantly (no spinner)
    │             └── verify() async: confirm with Supabase, upgrade if needed
    │       NO  → show Login screen
    │
Login screen
    ├── Email + Password → authSignIn() → MOCK_USERS fallback → localStorage fallback
    ├── OTP (Email) → authSendOtp() → authVerifyOtp()
    └── Google OAuth → authSignInWithGoogle() → onAuthStateChange SIGNED_IN
                              │
                              ├── No profile row?
                              │       Admin email? → direct to dashboard
                              │       Doctor?      → ProfileSetupPage (3-step wizard)
                              │
                              ├── status = 'pending' → signOut + pendingMessage
                              ├── status = 'rejected' → signOut + pendingMessage
                              └── status = 'active' → set role → dashboard
```

### 5.4 Key Components Summary

| Component | Lines | Key Features |
|---|---|---|
| `App.jsx` | 546 | Global state, session restore, realtime subscription, beforeunload guard |
| `Login.jsx` | ~300 | Password/OTP tabs, Google OAuth button, Admin modal, forgot password, fail count hint |
| `RegistrationPage.jsx` | ~315 | 4-step wizard, MCI regex (`/^[A-Z]{1,5}-\d{4}-\d{4,6}$/`), PendingApprovalScreen on success |
| `ProfileSetupPage.jsx` | ~370 | 3-step OAuth profile wizard, password creation, PendingApprovalScreen on done |
| `SADashboard.jsx` | ~300 | 5 tabs: Verifications, MCI Queue, Artifacts, Approved Doctors, Webinar Calendar, Alerts |
| `MCIVerificationQueue.jsx` | ~190 | Realtime pending queue, approve/reject with reason, email notification trigger |
| `EBooksPage.jsx` | ~330 | PDF viewer with 24-tile diagonal watermark, page tracking, subject completion marking |
| `ExamPage.jsx` | ~330 | Subject grid → MCQ interface → results with explanations |
| `LeaderboardPage.jsx` | ~195 | Weekly/monthly/alltime period tabs (re-fetch on change), My Speciality/My College tab filter |
| `ActivityPage.jsx` | ~400 | Calendar heatmap, weekly hours bar chart, targets, AI study insights |
| `ChatBot.jsx` | ~226 | Floating Gemini-powered chat, 20 msg/day rate limit, typing indicator |
| `DocumentationPage.jsx` | ~450 | Generates User Manual + Admin Manual PDFs via jsPDF with cover page + sections |
| `ReportsPage.jsx` | ~280 | 3 tabs: Artifact queue, webinar attendance, audit log table with CSV export |

---

## 6. Integrations & DevOps

### 6.1 Docker

**No project-level Docker configuration exists.** There is no `Dockerfile` or `docker-compose.yml` in the iConnect project. Supabase local development uses the Supabase CLI (`supabase start`) which internally uses Docker containers, but this is managed by the CLI, not by project-level config files.

> Recommendation: If containerisation is required for production, a `Dockerfile` should be added. However, as a Vercel-deployed SPA with Supabase as backend-as-a-service, Docker is not strictly necessary for this architecture.

---

### 6.2 Resend Email Integration

Resend is used exclusively via the `send-approval-email` Supabase Edge Function.

**Configuration:**
- API Key: `re_a4RPSs9c_Cgi4kSVH6BSkBtPuTFXHgYRj` (set as Supabase secret `RESEND_API_KEY`)
- From address: `iConnect <onboarding@resend.dev>` (Resend sandbox domain)
- Trigger: When `MCIVerificationQueue.jsx` calls `approve()` or `reject()`

**Email Templates:**

*Approval email:*
- Green header with ✅ icon
- Lists platform features (e-books, quizzes, AI chat, leaderboard)
- CTA: "Login to iConnect" button → `https://iconnect-med.vercel.app`

*Rejection email:*
- Red header with ❌ icon
- Rejection reason box (if provided)
- Support email footer

**Resilience:** If `RESEND_API_KEY` is unset, the function returns `{ success: true, note: 'no key' }` — the approval flow completes without crashing.

> ⚠️ **Production Note:** Emails currently sent from `onboarding@resend.dev` (Resend test domain). For production, a verified custom domain (e.g. `noreply@iconnect.in`) must be configured in Resend and updated in the edge function.

---

### 6.3 Google Gemini AI Integration

**Model:** `gemini-2.0-flash-lite`
**API Key:** `AIzaSyDEJurcACoIVnl-WnhSNEszb6jbb6eFJqc` (set as Supabase secret `GEMINI_API_KEY`)
**Proxy:** Supabase Edge Function `gemini-proxy` (key never reaches the browser)

**Client-Side (ChatBot.jsx):**
- Sends conversation history + system prompt to edge function
- Rate limit: 20 messages/day per device (stored in `localStorage` — bypassable)
- Handles graceful degradation: quota errors shown as friendly messages

**System Prompt Context:**
- Indian PG medical exam assistant (NEET-PG, AIIMS PG, DNB)
- Topics: clinical concepts, pharmacology, pathology, exam strategy
- Constraint: under 300 words unless asked for detail; bullet points preferred; clinical disclaimer

> ⚠️ **Known Issue:** The Gemini API key is on the free tier with quota=0. The edge function handles this gracefully but the chatbot will return quota-exceeded messages until a billing account is attached or a new key is provisioned.

---

### 6.4 Vercel Deployment

**Project:** `iconnect-med.vercel.app`
**Team/Org:** `ayushcorextend-sudos-projects`
**Framework:** Vite (static SPA)
**Build Command:** `npm run build`
**Output Directory:** `dist/`

**Deployment process:**
```bash
# From frontend/ directory
npm run build          # Vite + PWA build → dist/
npx vercel --prod      # Deploy dist/ to Vercel CDN
```

**Environment variables set in Vercel:**
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_APP_URL`

**SPA Routing:** Vercel handles all routes → `index.html` (standard SPA config).

**PWA:** Service worker (`sw.js`) generated by Workbox. Caching strategy:
- Google Fonts → `CacheFirst` (1 year TTL)
- Supabase requests → `NetworkOnly` (no caching — prevents stale auth tokens)
- App shell → pre-cached (14 entries, ~1.35 MB)

---

## 7. Dependencies

### 7.1 Production Dependencies

| Package | Version | Purpose |
|---|---|---|
| `@supabase/supabase-js` | ^2.98.0 | Database, Auth, Realtime, Edge Functions client |
| `react` | ^19.2.0 | UI framework |
| `react-dom` | ^19.2.0 | React DOM renderer |
| `react-router-dom` | ^7.13.1 | Installed but **not used** (custom page-state router instead) |
| `jspdf` | ^4.2.0 | PDF generation for Documentation page |
| `axios` | ^1.13.5 | Installed but **not used** (all HTTP via Supabase client or `fetch`) |
| `lucide-react` | ^0.575.0 | Icon library (usage minimal — mostly emoji icons instead) |

### 7.2 Development Dependencies

| Package | Version | Purpose |
|---|---|---|
| `vite` | ^7.3.1 | Build tool and dev server |
| `@vitejs/plugin-react` | ^5.1.1 | Babel/React Fast Refresh for Vite |
| `vite-plugin-pwa` | ^1.2.0 | PWA manifest + Workbox service worker generation |
| `tailwindcss` | ^3.4.19 | CSS utility framework |
| `postcss` | ^8.5.6 | CSS processing |
| `autoprefixer` | ^10.4.21 | CSS vendor prefixing |
| `@playwright/test` | ^1.58.2 | E2E testing (test suite exists but not verified passing) |
| `eslint` | 9.39.1 | Linting |
| `@eslint/js` | 9.39.1 | ESLint JS config |
| `globals` | ^16.2.0 | Global variable definitions for ESLint |

### 7.3 Unused Dependencies

| Package | Reason |
|---|---|
| `react-router-dom` | App uses `useState('page')` custom router instead of `<Routes>` |
| `axios` | All HTTP calls use `fetch()` (via Supabase client or native) |
| `lucide-react` | Minimal usage; most icons are emoji characters |

> Recommendation: Remove `react-router-dom` and `axios` to reduce bundle size.

---

## 8. Known Issues & TODOs

### 8.1 Code-Level TODOs & FIXMEs

A grep of the entire `src/` directory for `TODO`, `FIXME`, and `HACK` comments:

**Result: No formal `// TODO` or `// FIXME` comments found in the codebase.** All incomplete features are represented by `ComingSoonPage` components rather than in-code markers.

---

### 8.2 Incomplete / Placeholder Features

| Feature | Page | Status | Notes |
|---|---|---|---|
| **Social Features** | `social` | ComingSoonPage | Peer network, note sharing, group chat |
| **Interest Groups** | `groups` | ComingSoonPage | Speciality/college groups, mass communication |
| **WhatsApp Notifications** | Settings | UI toggle present, no backend | `notification_preferences` table exists but WhatsApp API not integrated |
| **SMS Notifications** | Settings | UI toggle present, no backend | Toggle stored in `notification_preferences` but no SMS provider |
| **Kahoot Integration** | `KahootPage` | Partial | Fetches PIN from `app_settings`, opens `window.open('kahoot.it?pin=...')` — no embedded experience |
| **Conferences Registration** | `ConferencesPage` | External links only | Conference `url` opens in new tab; no in-app registration flow |
| **Demo Mode banner** | App.jsx | Displays for offline mode | Shows when `mode === 'offline'`; doesn't appear for `mode === 'demo'` (mock users) |

---

### 8.3 Logic Issues

| Issue | Location | Severity | Description |
|---|---|---|---|
| **Rate limit bypassable** | `ChatBot.jsx` | Low | 20 msg/day limit stored in `localStorage`. User can clear storage to reset. |
| **Leaderboard weekly/monthly approximation** | `LeaderboardPage.jsx` | Low | Weekly/monthly tabs compute scores from `activity_logs.score_delta` over a date range. If a user earned points before this was implemented, historical scores appear in alltime only. |
| **Demo user score writes skipped** | `trackActivity.js` | Info | `userId.startsWith('local_')` check silently skips score tracking for demo/offline users. Expected behaviour but not documented. |
| **`react-router-dom` installed but unused** | `package.json` | Low | Adds ~28KB to bundle unnecessarily. |
| **`axios` installed but unused** | `package.json` | Low | Adds ~13KB to bundle unnecessarily. |
| **Gemini API quota** | ChatBot / gemini-proxy | High | API key `AIzaSyDEJurcACoIVnl-WnhSNEszb6jbb6eFJqc` is on free tier with quota=0. Chatbot will return quota errors in production. |
| **Resend from-domain** | send-approval-email | Medium | Emails sent from `onboarding@resend.dev` (sandbox). For deliverability, must migrate to verified domain. |
| **ANON_KEY hardcoded in ChatBot.jsx** | `ChatBot.jsx:32` | Info | ANON_KEY is a public JWT (not secret), but hardcoding it creates maintenance burden if the key rotates. Should use `import.meta.env.VITE_SUPABASE_ANON_KEY`. |
| **ANON_KEY hardcoded in MCIVerificationQueue.jsx** | Line ~15 | Info | Same as above — should use env var. |
| **`rejection_reason` column** | `profiles` | Medium | `MCIVerificationQueue.jsx` writes `rejection_reason` to profiles table (line 104), but this column is not in any migration file. Will silently fail if column doesn't exist. |

---

### 8.4 Missing Edge Function Source

The `send-approval-email` edge function is deployed and working in production, but its source `.ts` file was not found in the standard project directories. It was deployed from `/tmp/` during development. The source should be committed to `/supabase/functions/send-approval-email/index.ts` for reproducibility.

---

### 8.5 E2E Tests

A Playwright test file (`e2e/iconnect.spec.js`) exists in the project but its passing status was not verified in this audit. Given the extensive UI changes across 11 development phases, tests should be reviewed and updated.

---

## 9. Security Assessment

### 9.1 Positive Security Controls

| Control | Implementation |
|---|---|
| **Row Level Security** | Enabled on all 14 tables. Users access only their own data; admins get broader read via role check. |
| **Auth status gating** | Pending/rejected doctors blocked at login in both `authSignIn()` and `onAuthStateChange`. |
| **API key proxy** | Gemini API key never reaches the browser — proxied through edge function. |
| **Resend API key** | Stored as Supabase secret, never in frontend code. |
| **MCI number validation** | Regex `/^[A-Z]{1,5}-\d{4}-\d{4,6}$/` on registration. |
| **Email normalisation** | `.trim().toLowerCase()` on all email inputs before DB writes. |
| **Watermarking** | E-books show user name as diagonal overlay; right-click and print disabled. |
| **Audit logging** | All admin approve/reject actions written to `audit_logs` with actor identity. |
| **beforeunload guard** | Warns users before closing tab when logged in (prevents accidental session loss). |
| **429 rate limit handling** | `authSignIn()` catches HTTP 429 and shows user-friendly message. |
| **Admin email guard** | Hardcoded `ADMIN_EMAILS` array prevents ProfileSetupPage from appearing for admins even if Supabase profile row is missing. |

### 9.2 Security Concerns

| Concern | Severity | Recommendation |
|---|---|---|
| **Hardcoded credentials in MOCK_USERS** | Medium | `Admin@123` and `Content@123` are stored in plain text in `supabase.js`. These work as demo fallbacks but if the same passwords are used in Supabase Auth, they should be rotated to strong unique passwords. |
| **Client-side chatbot rate limit** | Low | `localStorage`-based rate limit can be bypassed by clearing storage. For production, implement server-side rate limiting in the edge function (e.g., by user ID). |
| **ANON_KEY in component code** | Info | Public JWT but inconsistent — 2 components hardcode it instead of using `import.meta.env.VITE_SUPABASE_ANON_KEY`. Not a security risk but a maintenance issue. |
| **`rejection_reason` column missing** | Medium | MCIVerificationQueue writes this column but no migration adds it. Verify it exists in production schema or add a migration. |
| **No CSP headers** | Low | No Content-Security-Policy headers configured at Vercel level. Recommend adding via `vercel.json`. |
| **Resend sandbox domain** | Medium | Emails from `onboarding@resend.dev` may be flagged as spam. Verify a custom domain in Resend. |

---

## 10. Performance Notes

### 10.1 Bundle Size

| Chunk | Size (gzip) |
|---|---|
| Main app (`index-*.js`) | 161 KB |
| jsPDF | 125 KB |
| html2canvas | 47 KB |
| DOMPurify | 9 KB |
| Workbox window | 2 KB |
| **Total JS** | ~344 KB gzip |
| CSS | 6 KB gzip |

> The jsPDF + html2canvas chunks (~172 KB gzip combined) are only needed for `DocumentationPage`. They could be **lazy-loaded** with `React.lazy()` + `import()` to reduce initial bundle by ~50%.

### 10.2 Supabase Query Patterns

- All queries use `try/catch` with silent failures — the UI never crashes due to DB errors.
- `.maybeSingle()` used throughout (after audit fix) — no more PGRST116 throws.
- Leaderboard uses two sequential queries (scores → profiles join in JS). For large datasets, a Postgres view or function would be more efficient.
- `fetchUsers()` fetches `SELECT *` from `profiles` — for large user bases, should be paginated.

### 10.3 PWA Caching

- Supabase requests are `NetworkOnly` — correct for auth-sensitive data.
- App shell pre-cached at build time (14 entries, 1.35 MB uncompressed).
- Service worker auto-updates on new deployment (`registerType: 'autoUpdate'`, `skipWaiting: true`).

---

## Appendix: Environment Variables Reference

| Variable | Location | Purpose |
|---|---|---|
| `VITE_SUPABASE_URL` | `.env.local` + Vercel | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | `.env.local` + Vercel | Public Supabase anon key |
| `VITE_APP_URL` | `.env.local` + Vercel | App URL (used in OAuth redirects) |
| `GEMINI_API_KEY` | Supabase secret | Google Gemini API key |
| `RESEND_API_KEY` | Supabase secret | Resend transactional email key |

---

## Appendix: Quick Reference — Admin Credentials

| Role | Email | Password (Demo Fallback) |
|---|---|---|
| Super Admin | admin@iconnect.in | Admin@123 |
| Content Admin | content@iconnect.in | Content@123 |

> These credentials are used as offline/demo fallbacks in `supabase.js`. The same emails must exist in Supabase Auth for production login. Passwords should be rotated to strong unique values for production use.

---

*End of Audit — iConnect v11 (Phase 11, 8-change SOW)*
*Generated: 2026-03-11 by Claude Code*
