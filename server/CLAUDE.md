# iConnect Server — Express Backend Rules
# ════════════════════════════════════════════════════════════════
# Scoped to: server/
# Read alongside: root CLAUDE.md
# ════════════════════════════════════════════════════════════════

## ── SERVER ROLE ─────────────────────────────────────────────────

The Express server (server/) is a SECONDARY backend.
Most business logic runs client-side via Supabase.
The server handles: file uploads, legacy routes, server-side utilities.

When deciding where logic goes:
- Data queries → Supabase client in `frontend/src/lib/supabase.js`
- File processing → Express server
- Sensitive operations (scoring, approvals) → Supabase Edge Functions
- Server should NOT duplicate what Supabase RLS already enforces

## ── SERVER STRUCTURE ────────────────────────────────────────────

```
server/
├── config/
│   ├── db.js        ← Database connection config
│   └── jwt.js       ← JWT config
├── middleware/
│   ├── auth.js      ← JWT verification middleware
│   └── errorHandler.js ← Global error handler
├── models/
│   ├── Activity.js
│   ├── Ebook.js
│   ├── Notification.js
│   ├── Settings.js
│   └── User.js
├── routes/
│   ├── activity.js
│   ├── auth.js
│   ├── ebooks.js
│   ├── notifications.js
│   ├── reports.js
│   ├── settings.js
│   └── users.js
├── utils/
│   ├── helpers.js
│   └── upload.js    ← Multer file upload config
└── index.js         ← Entry point
```

## ── HARD RULES ──────────────────────────────────────────────────

- NEVER log request bodies that contain user PII
- NEVER log passwords, tokens, or session data
- All routes MUST go through `middleware/auth.js` unless explicitly public
- File uploads go through `utils/upload.js` — NEVER write custom multer config inline
- NEVER store uploaded files permanently in `server/uploads/` — this is a temp directory
- Error responses MUST use `middleware/errorHandler.js` — no inline `res.status(500).send(err)`

## ── ROUTE PATTERNS ──────────────────────────────────────────────

Standard route pattern:
```js
// routes/example.js
import { Router } from 'express'
import { errorHandler } from '../middleware/errorHandler.js'

const router = Router()

router.get('/', auth, async (req, res, next) => {
  try {
    // logic here
    res.json({ data })
  } catch (err) {
    next(err) // Always pass to error handler
  }
})

export default router
```

NEVER use `res.send(err)` or `res.json({ error: err })` directly — use `next(err)`.

## ── SECURITY RULES ──────────────────────────────────────────────

- JWT verification happens in `middleware/auth.js` — NEVER inline JWT verification
- NEVER trust `req.body.role` — role must come from the verified JWT payload
- NEVER trust `req.body.userId` for sensitive operations — use `req.user.id` from auth middleware
- Rate limiting is critical — check if route already has rate limiting before adding endpoints
- CORS is configured in `index.js` — NEVER override it per-route
