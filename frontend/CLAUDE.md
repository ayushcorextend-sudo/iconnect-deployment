# iConnect Frontend — UI & Component Rules
# ════════════════════════════════════════════════════════════════
# Scoped to: frontend/src/
# Read alongside: root CLAUDE.md
# ════════════════════════════════════════════════════════════════

## ── DESIGN TOKEN SYSTEM ─────────────────────────────────────────

Tokens live in `src/styles/tokens.js`. Before writing ANY className, check if a token exists.

**Never use raw Tailwind values when a token covers it.**

Token categories that MUST come from tokens.js:
- Colors (brand, surface, text, border, status)
- Spacing scale
- Border radius
- Shadow levels
- Font sizes and weights
- Transition durations

Z-index values MUST come from `src/styles/zIndex.js` — never use arbitrary z-index numbers.

## ── COMPONENT ARCHITECTURE ──────────────────────────────────────

### Folder structure rules
```
components/
├── ui/              ← Primitive components (no business logic)
│   ├── ConfirmModal.jsx
│   ├── AppErrorBoundary.jsx
│   ├── OfflineIndicator.jsx
│   ├── PageTransition.jsx
│   ├── SignedImg.jsx
│   └── Skeleton.jsx
├── [Feature]/       ← Feature folders (business logic allowed)
│   └── ComponentName.jsx
└── ComponentName.jsx ← Top-level page components
```

### Rules
- `ui/` components are PURE — no Supabase calls, no store reads, props only
- Feature components own their data fetching via `src/lib/supabase.js`
- Page components (e.g. `DoctorDashboard.jsx`) orchestrate, they don't fetch
- NEVER put a Supabase call inside a component — it goes in `src/lib/supabase.js`

## ── EXISTING UI PRIMITIVES ──────────────────────────────────────

Before building anything, check if it exists:

| Need | Use |
|------|-----|
| Confirmation dialog | `ui/ConfirmModal.jsx` |
| Error boundary | `ui/AppErrorBoundary.jsx` |
| Loading skeleton | `ui/Skeleton.jsx` |
| Signed image (Supabase storage) | `ui/SignedImg.jsx` |
| Page transition | `ui/PageTransition.jsx` |
| Offline banner | `ui/OfflineIndicator.jsx` |

NEVER rebuild these. If they need new props, extend them.

## ── ANIMATION RULES ─────────────────────────────────────────────

- Framer Motion for ALL interactive animations
- No raw CSS `transition` or `animation` for interactive elements
- Page transitions → use `ui/PageTransition.jsx` wrapper
- Loading states → use `ui/Skeleton.jsx`, NOT spinning divs
- Motion values must come from tokens.js duration scale

Approved Framer Motion patterns:
```jsx
// Fade in
initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}

// Slide up
initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}

// Scale on press
whileTap={{ scale: 0.97 }}
```

NEVER use `transition-all` — it causes layout jank. Be specific.

## ── STATE MANAGEMENT RULES ──────────────────────────────────────

### The 6 Stores — know them before adding state

| Store | Purpose | Key state |
|-------|---------|-----------|
| `useAuthStore` | Auth state mirror | user, role, session |
| `useAppStore` | Global app state | theme, sidebar, notifications |
| `useChatStore` | AI chatbot state | messages, isOpen, context |
| `useOfflineStore` | Offline queue | pendingActions, isOnline |
| `useReaderStore` | PDF reader state | currentPage, zoom, notes |
| `useTenantStore` | Multi-tenant | tenantId, config, features |

Before adding state anywhere, ask:
1. Does this belong in an existing store?
2. Is it truly global, or can it be local component state?
3. Does it need to persist across routes?

Local component state (`useState`) is preferred for UI-only state.

## ── ROLE-BASED RENDERING ────────────────────────────────────────

Roles: `superadmin` > `contentadmin` > `doctor`

Pattern for role-gated UI:
```jsx
const { authRole } = useAuth()

// Correct
if (authRole !== 'superadmin') return null

// Wrong — never check localStorage for roles
if (localStorage.getItem('role') !== 'superadmin') return null
```

## ── OFFLINE SUPPORT RULES ───────────────────────────────────────

iConnect has offline support via `useOfflineStore` and `src/lib/offlineSync.js`.

- All data fetches MUST have a localStorage cache fallback
- Pattern is already established in `supabase.js` — follow it
- NEVER assume the user is online
- Use `useOfflineStore.isOnline` to gate write operations

## ── ERROR HANDLING RULES ────────────────────────────────────────

Every async operation needs three states: loading, success, error.

```jsx
// Required pattern
const [loading, setLoading] = useState(false)
const [error, setError] = useState(null)

const handleAction = async () => {
  setLoading(true)
  setError(null)
  try {
    await someAction()
  } catch (err) {
    setError(err.message)
  } finally {
    setLoading(false)
  }
}
```

- Errors shown to users must be human-readable — never raw Supabase error messages
- Network errors → "Connection failed. Please check your internet."
- Auth errors → "Session expired. Please log in again."
- Unknown errors → "Something went wrong. Please try again."

## ── ICONS ───────────────────────────────────────────────────────

Lucide React ONLY. Already installed.

```jsx
import { ChevronDown, User, Settings } from 'lucide-react'
```

NEVER import from heroicons, react-icons, or any other icon library.

## ── DASHBOARD WIDGET RULES ──────────────────────────────────────

Dashboard widgets live in `components/dashboard/`. Each widget:
- Is a self-contained component
- Receives data via props from `DoctorDashboard.jsx`
- Has its own loading skeleton state
- NEVER fetches data directly — parent fetches and passes down

## ── PERFORMANCE RULES ───────────────────────────────────────────

- Large lists MUST use `@tanstack/react-virtual` (already installed)
- Images from Supabase Storage MUST use `ui/SignedImg.jsx`
- Heavy components should be lazy-loaded: `const Comp = lazy(() => import('./Comp'))`
- NEVER put data fetching in `useEffect` without a cleanup or abort controller for long operations
