# THE NEURO-AESTHETIC IMPLEMENTATION BIBLE
## iConnect Office — "Site of the Year" Execution Prompts for Sonnet

> **HOW TO USE THIS DOCUMENT:**
> Each section below is a self-contained **Master Prompt** for Claude 3.5 Sonnet on the CLI.
> Copy ONE prompt at a time into your terminal session. Each prompt is designed to be
> executed independently, in order. After each, verify the output before proceeding.
>
> **Prerequisite:** The MASTER_BLUEPRINT.md must be executed first (Phases 1-6).
> This document is the VISUAL & INTERACTION layer that sits on top of that functional foundation.

---

# ══════════════════════════════════════════════════════════════════
# PROMPT 0 — THE GLOBAL PREMIUM ENGINE
# (Execute this FIRST — it builds the shared foundation)
# ══════════════════════════════════════════════════════════════════

Sonnet, your task is to build the **Global Scalable Luxury Engine** for the iConnect medical education platform. This is a centralized system of premium UI primitives and global effects that ALL 20+ pages will consume. You are forbidden from building one-off animations in individual pages. Everything flows through this engine.

## 0A — The Design System File

Create `src/styles/premiumDesignSystem.js`. This is the single source of truth for ALL animation physics, color tokens, and transition curves in the entire app.

```javascript
// ─── SPRING PHYSICS ────────────────────────────────────────────
// Named after feel, not function. Every spring in the app uses one of these.
export const SPRINGS = {
  // Heavy, satisfying settle — for modals, cards assembling, score reveals
  HEAVY:    { type: "spring", stiffness: 120, damping: 14, mass: 1.2 },
  // Snappy response — for buttons, toggles, small interactive elements
  SNAPPY:   { type: "spring", stiffness: 400, damping: 25, mass: 0.5 },
  // Gentle drift — for background elements, parallax, ambient motion
  DRIFT:    { type: "spring", stiffness: 50, damping: 20, mass: 2.0 },
  // Punchy bounce — for notifications, score drops, celebration moments
  BOUNCE:   { type: "spring", stiffness: 600, damping: 15, mass: 0.8 },
  // Silk smooth — for layout transitions, panel slides, container resizes
  SILK:     { type: "spring", stiffness: 170, damping: 26, mass: 1.0 },
  // Magnetic pull — for hover proximity effects
  MAGNETIC: { type: "spring", stiffness: 250, damping: 18, mass: 0.3 },
};

// ─── CUBIC BEZIER CURVES ──────────────────────────────────────
// For CSS transitions where spring physics don't apply
export const CURVES = {
  APPLE_EASE:       'cubic-bezier(0.25, 0.46, 0.45, 0.94)',   // macOS default
  EXPO_OUT:         'cubic-bezier(0.16, 1, 0.3, 1)',           // aggressive decel
  EXPO_IN_OUT:      'cubic-bezier(0.87, 0, 0.13, 1)',          // dramatic in-out
  CIRC_OUT:         'cubic-bezier(0, 0.55, 0.45, 1)',          // fast start, gentle stop
  BACK_OUT:         'cubic-bezier(0.34, 1.56, 0.64, 1)',       // slight overshoot
  SMOOTH_STEP:      'cubic-bezier(0.4, 0, 0.2, 1)',            // Material default
};

// ─── STAGGER CONFIGS ──────────────────────────────────────────
export const STAGGER = {
  FAST:   { staggerChildren: 0.04 },  // rapid-fire list items
  MEDIUM: { staggerChildren: 0.08 },  // card grids, nav items
  SLOW:   { staggerChildren: 0.15 },  // hero sections, feature reveals
  WAVE:   { staggerChildren: 0.06, staggerDirection: 1 }, // left-to-right wave
};

// ─── COLOR SYSTEM ─────────────────────────────────────────────
// "Spatial Glassmorphism + Tactical Medical" palette
export const COLORS = {
  // Core surface layers (dark mode default, light mode via data-theme)
  VOID:           '#050508',    // deepest background
  GRID:           '#0A0A12',    // grid background
  SURFACE_0:      '#0D0D18',    // base surface
  SURFACE_1:      '#141422',    // raised surface
  SURFACE_2:      '#1A1A2E',    // card surface
  GLASS:          'rgba(20, 20, 34, 0.6)',   // glass panel fill
  GLASS_BORDER:   'rgba(255, 255, 255, 0.06)', // glass edge

  // Tactical accents
  CYAN:           '#06D6A0',    // primary medical accent (teal-green)
  CYAN_GLOW:      'rgba(6, 214, 160, 0.15)',
  INDIGO:         '#7C3AED',    // secondary accent
  INDIGO_GLOW:    'rgba(124, 58, 237, 0.15)',
  ELECTRIC_BLUE:  '#3B82F6',    // data/info accent
  AMBER_WARN:     '#F59E0B',
  RED_ALERT:      '#EF4444',
  SUCCESS_GREEN:  '#10B981',

  // Gradients (CSS strings)
  CYAN_SWEEP:     'linear-gradient(135deg, #06D6A0 0%, #3B82F6 100%)',
  INDIGO_SWEEP:   'linear-gradient(135deg, #7C3AED 0%, #EC4899 100%)',
  SURFACE_GRAD:   'radial-gradient(ellipse at 20% 50%, rgba(124, 58, 237, 0.08) 0%, transparent 50%), radial-gradient(ellipse at 80% 20%, rgba(6, 214, 160, 0.06) 0%, transparent 50%)',
  HOLOGRAPHIC:    'linear-gradient(135deg, #06D6A0, #3B82F6, #7C3AED, #EC4899, #F59E0B, #06D6A0)',
};

// ─── GLASSMORPHISM PRESETS ────────────────────────────────────
export const GLASS = {
  PANEL: {
    background: 'rgba(20, 20, 34, 0.55)',
    backdropFilter: 'blur(40px) saturate(1.5)',
    WebkitBackdropFilter: 'blur(40px) saturate(1.5)',
    border: '1px solid rgba(255, 255, 255, 0.06)',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
  },
  CARD: {
    background: 'rgba(26, 26, 46, 0.7)',
    backdropFilter: 'blur(24px) saturate(1.3)',
    WebkitBackdropFilter: 'blur(24px) saturate(1.3)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    boxShadow: '0 4px 24px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.04)',
  },
  MODAL: {
    background: 'rgba(13, 13, 24, 0.85)',
    backdropFilter: 'blur(60px) saturate(1.8)',
    WebkitBackdropFilter: 'blur(60px) saturate(1.8)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    boxShadow: '0 24px 80px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.06)',
  },
  BUTTON: {
    background: 'rgba(255, 255, 255, 0.05)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
  },
};

// ─── MOTION VARIANTS (reusable across all pages) ──────────────
export const VARIANTS = {
  fadeIn: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
  },
  slideUp: {
    initial: { opacity: 0, y: 40 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 },
  },
  scaleIn: {
    initial: { opacity: 0, scale: 0.92 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.95 },
  },
  assembleFromBelow: {
    initial: { opacity: 0, y: 60, scale: 0.9, filter: 'blur(10px)' },
    animate: { opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' },
  },
  cardStagger: {
    animate: { transition: { staggerChildren: 0.08 } },
  },
};
```

**CRITICAL PERFORMANCE RULES FOR THIS FILE:**
- Every component that animates MUST apply `will-change: transform` (via style prop or className) ONLY during the animation, then remove it. Never leave `will-change` permanently set.
- All `backdrop-filter` elements must be on their own compositor layer. Add `transform: translateZ(0)` to force GPU compositing.
- Never animate `width`, `height`, `top`, `left`. Only animate `transform` and `opacity`. Use Framer Motion's `layout` prop for size changes.

---

## 0B — The Premium Component Library

Create these 4 files. Every page in the app MUST use these instead of raw divs.

### File: `src/components/ui/PremiumCard.jsx` (<120 lines)

```
Sonnet, create a PremiumCard component. Props: { children, variant, glowColor, className, onClick, hover, as }.

- variant: 'glass' (default) | 'solid' | 'outlined' | 'elevated'
- 'glass' variant applies GLASS.CARD from the design system
- On hover (when hover prop is true or truthy):
  - Scale to 1.015 using SPRINGS.SNAPPY
  - Border brightens from 0.08 to 0.15 opacity white
  - Box shadow expands: translateY(-2px) equivalent lift
  - A subtle inner glow appears at top-left corner (radial gradient of glowColor at 8% opacity)
- The card has a "shine" effect: a 200%-width linear-gradient (transparent → white at 4% → transparent) positioned off-screen left, that slides to the right on hover over 0.6s with CURVES.EXPO_OUT
- Border radius: 16px (rounded-2xl)
- Dark mode: Uses GLASS.CARD values. Light mode: bg-white/90 with blur(20px), border-slate-200
- MUST accept `as` prop to render as motion.div, motion.button, etc. Default: motion.div
- Apply transform: translateZ(0) for GPU layer promotion
```

### File: `src/components/ui/MagneticButton.jsx` (<100 lines)

```
Sonnet, create a MagneticButton component. Props: { children, variant, size, onClick, disabled, className, magnetStrength }.

- Uses useRef for the button element and tracks mouse position via onMouseMove on a PARENT wrapper div (24px padding around button for detection zone)
- When cursor enters the wrapper zone:
  - Calculate deltaX and deltaY from button center to cursor
  - Apply transform: translate(deltaX * magnetStrength, deltaY * magnetStrength) where magnetStrength defaults to 0.15 (max 6px displacement)
  - Use SPRINGS.MAGNETIC for the motion
- When cursor leaves wrapper: spring back to translate(0,0)
- On click: trigger a "ripple" effect:
  - A radial gradient circle expands from click point to 200% of button size over 0.5s
  - The gradient is the button's accent color at 20% opacity, fading to transparent
  - Use a separate absolutely-positioned div with overflow:hidden, animated via Framer Motion scale(0→2.5) + opacity(0.4→0)
- Variant colors:
  - 'primary': COLORS.CYAN background with white text
  - 'secondary': GLASS.BUTTON background with COLORS.CYAN text
  - 'danger': RED_ALERT background
  - 'ghost': transparent bg, text inherits
- Sizes: 'sm' (h-8 px-3 text-sm), 'md' (h-10 px-5 text-sm), 'lg' (h-12 px-7 text-base)
- Disabled state: opacity-50, pointer-events-none, no magnetic effect
- MUST use will-change: transform on the inner button only during hover state
```

### File: `src/components/ui/GlassModal.jsx` (<130 lines)

```
Sonnet, create a GlassModal component. Props: { isOpen, onClose, title, children, size, className }.

- Uses AnimatePresence for mount/unmount
- Backdrop: position fixed, inset-0, z-50
  - Background: rgba(0,0,0,0.6)
  - Entry animation: opacity 0→1, backdropFilter blur(0px)→blur(12px), duration 0.3s
  - When backdrop appears, the CONTENT BEHIND (the main app) should scale to 0.97 and blur(4px) — achieve this by adding a className to document.body that applies these transforms to the .shell container
- Modal panel: centered, max-width based on size ('sm'=440px, 'md'=560px, 'lg'=720px, 'xl'=900px)
  - Applies GLASS.MODAL styles
  - Entry: scale(0.9) + y(30) + opacity(0) → scale(1) + y(0) + opacity(1) using SPRINGS.HEAVY
  - Exit: scale(0.95) + y(-10) + opacity(0) using duration 0.2s
  - Border radius: 24px (rounded-3xl)
- Title bar: flex row, title on left (text-lg font-semibold text-white), X button on right
  - X button is a MagneticButton variant='ghost' with Lucide X icon
- Content area: overflow-y-auto, max-height calc(80vh - 80px), thin custom scrollbar (4px wide, glass-colored thumb)
- Close on Escape key (useEffect with keydown listener)
- Close on backdrop click (onClick on backdrop div, stopPropagation on modal panel)
- Trap focus inside modal (optional but ideal — use a simple focusTrap with first/last focusable element cycling)
```

### File: `src/components/ui/InfiniteGrid.jsx` (<60 lines)

```
Sonnet, create an InfiniteGrid background component. This renders behind ALL pages.

- Position: fixed, inset-0, z-0, pointer-events-none
- Render a CSS-only infinite grid using background-image with two overlapping linear-gradients:
  - Vertical lines: repeating-linear-gradient(90deg, rgba(255,255,255,0.02) 0px, rgba(255,255,255,0.02) 1px, transparent 1px, transparent 80px)
  - Horizontal lines: repeating-linear-gradient(0deg, rgba(255,255,255,0.02) 0px, rgba(255,255,255,0.02) 1px, transparent 1px, transparent 80px)
- The grid slowly pans diagonally: CSS animation 'gridDrift' that moves background-position from (0,0) to (80px, 80px) over 20s, linear, infinite
- Over the grid, add a radial gradient vignette: radial-gradient(ellipse at center, transparent 40%, COLORS.VOID 100%)
- Add two very soft, slowly orbiting color blobs (pure CSS):
  - Blob 1: 600px circle, COLORS.CYAN at 3% opacity, positioned top-left area, animates in a slow figure-8 (40s cycle)
  - Blob 2: 500px circle, COLORS.INDIGO at 3% opacity, positioned bottom-right area, animates counter-orbit (35s cycle)
- Use @keyframes defined in a <style> tag inside the component (keeps it self-contained)
- MUST be wrapped in React.memo — it never re-renders
- The component MUST respect data-theme: in light mode, grid lines use rgba(0,0,0,0.04) and blobs use 2% opacity
```

---

## 0C — The Liquid Page Transition

Sonnet, you must **replace** the existing `src/components/ui/PageTransition.jsx` (currently 24 lines).

Current implementation uses basic opacity + y slide. Replace with:

```
- Keep AnimatePresence mode="wait"
- New page variants:
  initial: { opacity: 0, y: 20, scale: 0.98, filter: 'blur(6px)' }
  animate: { opacity: 1, y: 0, scale: 1, filter: 'blur(0px)', transition: SPRINGS.SILK }
  exit: { opacity: 0, y: -10, scale: 0.98, filter: 'blur(4px)', transition: { duration: 0.2, ease: CURVES.EXPO_IN_OUT } }
- The exit should feel like the page is being "absorbed" back — slight scale down + blur
- The enter should feel like the page materializes from depth — unblur + scale up
- Import SPRINGS and CURVES from premiumDesignSystem.js
```

---

## 0D — Integration into App.jsx

Sonnet, modify `src/App.jsx`:

1. Import InfiniteGrid and place it as the FIRST child inside the `.shell` div (before Sidebar). It renders behind everything.
2. Add a CSS class `.shell-dimmed` that applies `transform: scale(0.97); filter: blur(4px); transition: all 0.3s;` — GlassModal will toggle this class on document.body or the .shell element when open.
3. Ensure PageTransition uses the updated version.
4. Do NOT change any routing logic, props, or state management.

**Commit after completing Prompt 0:** `feat: global premium engine — design system, glass components, infinite grid, liquid transitions`

```
═══ PROMPT 0 COMPLETE ═══
STOP HERE. Wait for Ayush to say "next".
```

---

# ══════════════════════════════════════════════════════════════════
# PROMPT 1 — THE "DRIFTING CAMERA" DASHBOARD ASSEMBLY
# (Feature 1: Doctor Dashboard login experience)
# ══════════════════════════════════════════════════════════════════

Sonnet, your task is to transform the Doctor Dashboard (`src/components/DoctorDashboard.jsx`, ~1305 lines) login experience into a cinematic "Drifting Camera" assembly sequence. The dashboard does not just "appear" — it assembles.

## 1A — The DNA Helix Background (CSS-only, no WebGL)

Create `src/components/ui/DNAHelix.jsx` (<80 lines).

This is a purely decorative, CSS-animated double helix that renders behind the dashboard content. It is NOT WebGL — it uses layered CSS animations for performance.

**Implementation:**
- A container div, position absolute, inset-0, overflow-hidden, pointer-events-none, z-0, opacity 0.12
- Inside: 12 pairs of "rungs" arranged vertically (each rung is a horizontal line connecting two circles)
- Each pair is absolutely positioned at different Y offsets (spaced ~80px apart)
- The pairs animate with different `animation-delay` values to create a wave
- CSS animation `helixSpin`: each rung's width oscillates between 40px and 160px using `scaleX`, while the circles at each end oscillate in opacity (one fades as the other brightens), simulating 3D rotation
- Duration: 6s per cycle, ease-in-out, infinite
- Stagger: each rung pair gets +0.4s delay
- Color: COLORS.CYAN at 40% opacity for circles, COLORS.INDIGO at 20% for connecting lines
- The entire helix group slowly drifts upward: `translateY(0) → translateY(-80px)` over 20s, infinite, linear
- Wrap in React.memo — it never re-renders
- Must support dark and light mode (light mode: use blue-400 and violet-300 at lower opacity)

**Camera Pull-Back Effect on DoctorDashboard Mount:**

In `DoctorDashboard.jsx`, add a one-time mount animation sequence using `useEffect` + `useState`:

```
State: dashboardReady (boolean, starts false, set true after 0.8s delay)

- Wrap the entire dashboard content in a motion.div with:
  initial: { scale: 1.08, filter: 'blur(8px)', opacity: 0 }
  animate: { scale: 1, filter: 'blur(0px)', opacity: 1 }
  transition: { duration: 1.2, ease: CURVES.EXPO_OUT }

- This creates the "camera pulling back from close-up" effect
- The DNA helix starts at scale 1.5 and animates to 1.0 simultaneously but slower (2s)
- Place <DNAHelix /> as first child inside DoctorDashboard, absolutely positioned
```

## 1B — The "For You" Card Assembly Animation

The 3 AI recommendation cards (from the MASTER_BLUEPRINT Phase 2) must have a cinematic entry.

**Each card's entry animation (staggered):**
```
Container (parent of all 3 cards):
  variants: { animate: { transition: { staggerChildren: 0.15, delayChildren: 0.6 } } }

Individual card variant:
  initial: {
    opacity: 0,
    y: 80,
    scale: 0.85,
    rotateX: 15,
    filter: 'blur(12px)',
  }
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    rotateX: 0,
    filter: 'blur(0px)',
    transition: SPRINGS.HEAVY    // stiffness: 120, damping: 14, mass: 1.2
  }
```

**Card Design Spec:**
- Use PremiumCard with variant='glass' and hover={true}
- Left accent bar: 3px wide, rounded-full, uses the card's tag color (Weak Area = AMBER, Due Today = CYAN, High Yield = INDIGO, Quick Win = SUCCESS_GREEN, Streak Risk = RED_ALERT, Trending = ELECTRIC_BLUE)
- Tag pill: top-right corner, tiny rounded-full pill with tag text, background is tag color at 15% opacity, text is tag color
- Icon: emoji rendered at 32px in a 48x48 rounded-xl container with the tag color at 10% opacity background
- Title: text-base font-semibold text-white (dark) / text-slate-800 (light)
- Reason: text-sm text-slate-400 (dark) / text-slate-500 (light), max 2 lines with line-clamp-2
- "Go →" button at bottom-right: MagneticButton variant='ghost' size='sm'
- On hover: the left accent bar height animates from 40% to 100% of the card height (SPRINGS.SNAPPY)
- Card has a very subtle perspective tilt on mousemove: track cursor within card, apply rotateX/rotateY up to ±3 degrees based on cursor position. Use the formula: `rotateY = (cursorX - cardCenterX) / cardWidth * 6` degrees (divide by width, multiply by max angle). Same for rotateX but inverted. Apply with `transform: perspective(800px) rotateX(${ry}deg) rotateY(${rx}deg)`. Reset on mouse leave with SPRINGS.SNAPPY.

## 1C — Component Splitting Rules

- `DNAHelix.jsx` — max 80 lines, pure CSS animation, React.memo
- The "For You" section should be a separate sub-component: `ForYouCards.jsx` (~120 lines), imported into DoctorDashboard
- The card tilt logic should be a custom hook: `src/hooks/useTiltEffect.js` (~30 lines)
- DoctorDashboard itself only adds the camera pull-back wrapper and imports ForYouCards

## 1D — Performance Safeguards

- DNAHelix: all animations are CSS `@keyframes`, NOT Framer Motion. CSS animations run on compositor thread.
- Card tilt: uses `onMouseMove` with `requestAnimationFrame` throttle — never update state more than once per frame
- `will-change: transform` applied to DNAHelix container and removed after 2s (one-shot mount animation)
- The camera pull-back motion.div must have `style={{ willChange: 'transform, filter' }}` during animation only — use `onAnimationComplete` callback to remove it

**Commit:** `feat: drifting camera dashboard assembly + DNA helix + For You card animations`

```
═══ PROMPT 1 COMPLETE ═══
STOP HERE. Wait for Ayush to say "next".
```

---

# ══════════════════════════════════════════════════════════════════
# PROMPT 2 — THE "LIVING PAPER" DIARY
# (Feature 2: Activity Calendar click → diary panel)
# ══════════════════════════════════════════════════════════════════

Sonnet, your task is to build the diary panel that opens when a user clicks a date on the Activity Calendar heatmap (`src/components/ActivityPage.jsx`, ~436 lines). This is NOT a basic modal. It is a "Living Paper" that unfolds in 3D.

## 2A — The Paper Unfold Animation

Create `src/components/ui/PaperUnfold.jsx` (<90 lines).

Props: `{ isOpen, onClose, children, className }`

**The 3D Unfold Sequence:**
1. Backdrop appears: fixed overlay, bg-black/40, blur(8px), fade in 0.3s
2. The "paper" div starts in a folded state and opens toward the user:
   ```
   initial: {
     opacity: 0,
     rotateX: -90,            // folded upward, edge toward user
     scaleY: 0.1,             // compressed vertically
     transformOrigin: 'top center',
     transformPerspective: 1200,
   }
   animate: {
     opacity: 1,
     rotateX: 0,              // unfolds flat
     scaleY: 1,
     transition: SPRINGS.HEAVY  // stiffness 120, damping 14, mass 1.2
   }
   exit: {
     opacity: 0,
     rotateX: -45,
     scaleY: 0.5,
     transition: { duration: 0.25, ease: CURVES.EXPO_IN_OUT }
   }
   ```
3. The paper surface styling:
   - Background: `#FEFDFB` (warm off-white) in light mode, `#1E1D1B` in dark mode
   - Box-shadow: `0 20px 60px rgba(0,0,0,0.3), 0 0 0 1px rgba(0,0,0,0.05)`
   - A subtle paper texture: use a CSS noise pattern via SVG filter or a repeating radial-gradient with tiny semi-transparent dots
   - Border-radius: 4px (paper is not super rounded)
   - Width: min(460px, 90vw), positioned fixed center or right-panel

## 2B — The Diary Content

Inside the PaperUnfold, render the diary panel content. Create `src/components/DiaryPanel.jsx` (<150 lines).

**Layout (top to bottom):**
1. **Date Header:** Large display, e.g., "Monday, March 17" — font-serif (use `font-family: 'Georgia', serif` or system serif), text-2xl, text-slate-800 dark:text-slate-200
2. **Mood Selector:** 5 emoji buttons in a row: 😄 😊 😐 😟 😢
   - Selected mood has a subtle glow ring (box-shadow: 0 0 0 3px {moodColor} at 30% opacity)
   - Mood colors: 😄=#10B981, 😊=#3B82F6, 😐=#F59E0B, 😟=#F97316, 😢=#EF4444
   - Clicking triggers a tiny scale bounce (1 → 1.3 → 1) with SPRINGS.BOUNCE
3. **Notes Textarea:**
   - Styled to look like ruled paper: `background-image: repeating-linear-gradient(transparent, transparent 31px, #E5E5E0 31px, #E5E5E0 32px)`
   - Line height: 32px (matches the ruled lines)
   - No visible border, just the ruled lines
   - Placeholder: "How was your day?" in italic serif
   - Auto-save on blur with 1s debounce (save to `calendar_diary` table)
   - **The "Ink" Effect:** When the user starts typing, the first character of each new word appears at 60% opacity and quickly fades to 100% over 0.15s — simulate this with a CSS transition on the textarea's color property triggered by an input event. (Simple version: just ensure the textarea text color transitions smoothly: `transition: color 0.15s ease`)
4. **Study Hours:** A sleek number input with +/- buttons, styled as rounded pill
5. **Goals Met Toggle:** A premium toggle switch (rounded-full, COLORS.CYAN when active, with a sliding dot that has a subtle shadow)
6. **Activity Log:** Below the diary, a scrollable list of that day's activities from `activity_logs`:
   - Each item: icon + label + relative time + score delta badge
   - Productive items: left border COLORS.SUCCESS_GREEN
   - Neutral: left border COLORS.AMBER_WARN
   - Unproductive: left border COLORS.RED_ALERT

## 2C — The Holographic Foil Edge (Productive Days)

If the selected day has `goals_met: true` AND `study_hours >= 4`, the paper gets a holographic foil border effect.

**CSS Implementation:**
```css
.paper-holographic::before {
  content: '';
  position: absolute;
  inset: -2px;
  border-radius: 6px;
  padding: 2px;
  background: linear-gradient(
    135deg,
    #06D6A0 0%,
    #3B82F6 20%,
    #7C3AED 40%,
    #EC4899 60%,
    #F59E0B 80%,
    #06D6A0 100%
  );
  background-size: 300% 300%;
  animation: holoShift 4s ease infinite;
  -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  z-index: -1;
}

@keyframes holoShift {
  0%, 100% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
}
```

This creates an animated rainbow border that looks like holographic foil. Apply class conditionally based on the day's data.

**Mouse-reactive version (bonus):** Track mouse position relative to the paper element. The `background-position` of the holographic gradient also shifts based on cursor X/Y within the element. Use a lightweight `onMouseMove` handler that updates a CSS custom property `--mouse-x` and `--mouse-y`, and reference these in the gradient: `background-position: calc(var(--mouse-x) * 100%) calc(var(--mouse-y) * 100%)`.

## 2D — Integration into ActivityPage.jsx

- Make each heatmap cell a clickable button
- On click: set `selectedDate` state, which opens PaperUnfold
- Add a small dot indicator (4px circle, COLORS.CYAN) below heatmap cells that have diary entries
- Fetch diary data for the selected month on mount (cache with key `diary_${userId}_${YYYY-MM}`)

## 2E — Component Splitting & Performance

- `PaperUnfold.jsx` — max 90 lines, the 3D animation wrapper (reusable)
- `DiaryPanel.jsx` — max 150 lines, the actual diary content
- `ActivityPage.jsx` — modifications only: add clickable cells, selectedDate state, PaperUnfold import
- `will-change: transform` on the paper div only during unfold animation, removed on `onAnimationComplete`
- The holographic foil uses CSS only (no JS animation frames)
- Diary auto-save uses `useRef` for the timeout ID to properly clear on unmount

**Commit:** `feat: living paper diary with 3D unfold + holographic foil + mood selector`

```
═══ PROMPT 2 COMPLETE ═══
STOP HERE. Wait for Ayush to say "next".
```

---

# ══════════════════════════════════════════════════════════════════
# PROMPT 3 — THE E-BOOK "HYPER-FOCUS" MODE
# (Feature 3: Reader overhaul with premium transitions)
# ══════════════════════════════════════════════════════════════════

Sonnet, your task is to overhaul the E-Book reader experience in `src/components/EBooksPage.jsx` (731 lines). The reader must transition into a "Hyper-Focus" immersive mode.

## 3A — The Focus Mode Transition

When a user opens an e-book to read, the app UI "melts away":

**Sequence (triggered when `selectedArtifact` is set to reading mode):**
1. The Sidebar animates to width: 0 (collapsed) with SPRINGS.SILK — or simply shifts off-screen
2. The TopBar fades out: opacity 1→0, y: 0→-60, duration 0.3s
3. The reader container expands to fill the entire viewport smoothly using Framer Motion's `layout` prop
4. Background transitions from SURFACE_0 to pure black (for maximum content contrast)
5. A thin (2px) progress bar appears at the very top of the screen:
   - Width: (currentPage / totalPages) * 100%
   - Color: COLORS.CYAN_SWEEP gradient
   - Transition: width changes with CURVES.APPLE_EASE, 0.3s

**Exit Focus Mode (clicking back or pressing Escape):**
- Reverse the sequence: reader shrinks, sidebar/topbar fade back in
- Use SPRINGS.SILK for the layout transition

**Implementation approach:**
- In the reader section of EBooksPage, add a `focusMode` boolean state
- When entering focus mode, set a CSS class on `.shell` (the root container) that hides sidebar/topbar
- The reader div uses `framer-motion` `layout` prop to smoothly resize
- Alternatively: reader goes `position: fixed, inset: 0, z-50` with the entry animation below:
  ```
  initial: { borderRadius: 16, inset: '80px 260px 60px 260px' } // approximate current position
  animate: { borderRadius: 0, inset: '0px 0px 0px 0px' }
  transition: SPRINGS.SILK
  ```

## 3B — The Floating Toolbar

Create `src/components/ebook/FloatingToolbar.jsx` (<100 lines).

A translucent toolbar that hovers at the bottom-center of the reader.

**Behavior:**
- Position: fixed, bottom: 24px, left: 50%, transform: translateX(-50%)
- Initially semi-transparent (opacity 0.3), full opacity on hover or when interacting
- Auto-hides after 3s of no mouse movement (fade out with CURVES.APPLE_EASE)
- Reappears on any mouse movement or keyboard input
- Apply GLASS.PANEL styling with border-radius: 9999px (pill shape)

**Toolbar Items (left to right, separated by thin 1px dividers):**
1. Page nav: `← [Page X of Y] →` with MagneticButton arrows
2. Zoom: Fit Width | Fit Page | + | - (icon buttons)
3. Bookmark: ⭐ (toggles, filled when bookmarked, with SPRINGS.BOUNCE scale animation)
4. Notes: 📝 (opens notes panel)
5. Quiz: 🧠 (triggers reading quiz)
6. Smart Notes: ✨ (generates AI note)
7. Fullscreen: ⛶ toggle

**Each icon button:** 36x36px, rounded-lg, on hover bg-white/10, active state scales to 0.9 then back to 1 with SPRINGS.SNAPPY

## 3C — The Notes Panel Push

When the Notes panel opens, it should NOT overlay the reader. It should PUSH the reader content aside.

**Implementation using Framer Motion `layout`:**
```
// Parent container: flex row
<motion.div layout style={{ display: 'flex', width: '100%', height: '100%' }}>
  <motion.div layout style={{ flex: 1 }}>  {/* Reader */}
    <PDFViewer ... />
  </motion.div>

  <AnimatePresence>
    {notesOpen && (
      <motion.div
        layout
        initial={{ width: 0, opacity: 0 }}
        animate={{ width: 360, opacity: 1 }}
        exit={{ width: 0, opacity: 0 }}
        transition={SPRINGS.SILK}
        style={{ overflow: 'hidden', borderLeft: '1px solid rgba(255,255,255,0.08)' }}
      >
        <NotesPanel ... />
      </motion.div>
    )}
  </AnimatePresence>
</motion.div>
```

The `layout` prop on both the reader and notes panel causes the reader to smoothly shrink to accommodate the notes panel. No abrupt jump.

**Notes Panel Styling:**
- GLASS.PANEL background
- Header: "Notes" + close button + "AI Generate" button
- Note list: scrollable, each note is a PremiumCard variant='outlined'
- Add note: textarea at bottom with send button
- Saved notes show relative time and first 2 lines with expand-on-click

## 3D — The Liquid Highlight (CSS-only)

When a user selects/highlights text in the PDF viewer (if the viewer supports text selection), apply a custom highlight style:

```css
/* Apply to the reader container */
.reader-container ::selection {
  background: linear-gradient(
    90deg,
    rgba(6, 214, 160, 0) 0%,
    rgba(6, 214, 160, 0.25) 5%,
    rgba(6, 214, 160, 0.3) 50%,
    rgba(6, 214, 160, 0.25) 95%,
    rgba(6, 214, 160, 0) 100%
  );
  color: inherit;
}
```

This creates a "fading edges" highlight that looks organic rather than block-shaped. If the PDF viewer doesn't support text selection natively, note this as a limitation and apply the style to any text elements that DO support selection (notes panel, etc.).

## 3E — Performance & Splitting

- `FloatingToolbar.jsx` — max 100 lines
- Notes panel push uses `layout` prop (GPU-accelerated layout animation)
- Toolbar hide/show uses `opacity` and `pointer-events` only (no layout shifts)
- Auto-hide timer uses `useRef` for the timeout, cleared on unmount
- Remember zoom level: `localStorage.setItem('iconnect_zoom_${artifactId}', zoomLevel)`

**Commit:** `feat: e-book hyper-focus mode + floating toolbar + notes panel push + liquid highlight`

```
═══ PROMPT 3 COMPLETE ═══
STOP HERE. Wait for Ayush to say "next".
```

---

# ══════════════════════════════════════════════════════════════════
# PROMPT 4 — THE AI EXAM GRADER "NEURAL SYNC"
# (Feature 4: AI grading visualization)
# ══════════════════════════════════════════════════════════════════

Sonnet, your task is to create a cinematic AI grading visualization for the Exam Results page. When the AI evaluates answers, the user sees the "brain working" — not a spinner.

## 4A — The Scanner Line Effect

Create `src/components/exam/NeuralScanEffect.jsx` (<120 lines).

Props: `{ text, keywords, onComplete, scanDuration }`

- `text`: the student's answer text (string)
- `keywords`: array of `{ word: string, type: 'correct' | 'incorrect' | 'partial' }` from AI analysis
- `scanDuration`: total scan time in ms (default 3000)

**The Visual:**
1. Render the student's text in a container with `position: relative`, font-mono, line-height 1.8
2. A "scanner line" overlay sweeps from top to bottom:
   ```css
   .scanner-line {
     position: absolute;
     left: 0;
     right: 0;
     height: 3px;
     background: linear-gradient(90deg,
       transparent 0%,
       rgba(6, 214, 160, 0.3) 20%,
       rgba(6, 214, 160, 1) 50%,
       rgba(6, 214, 160, 0.3) 80%,
       transparent 100%
     );
     box-shadow: 0 0 20px rgba(6, 214, 160, 0.4), 0 0 60px rgba(6, 214, 160, 0.1);
     z-index: 10;
   }
   ```
3. Animate the scanner line's `top` from 0 to 100% of the text container height over `scanDuration`
   - Use CSS animation with `CURVES.SMOOTH_STEP`
4. As the line passes over each keyword:
   - Calculate when the line reaches the keyword's Y position (based on line-height and word position)
   - At that moment, apply a highlight class to that word:
     - 'correct' keywords: text turns COLORS.SUCCESS_GREEN, subtle glow `text-shadow: 0 0 8px rgba(16,185,129,0.5)`
     - 'incorrect' keywords: text turns COLORS.RED_ALERT with red glow
     - 'partial' keywords: text turns COLORS.AMBER_WARN with amber glow
   - The highlight appears with a quick fade-in (0.2s)
5. Below the scanner line, text appears slightly dimmer (opacity 0.5). Above it (already scanned), text is full opacity with highlights.
6. When scan completes, call `onComplete()`

**Implementation approach:**
- Split the text into words, wrap each in a `<span>` with a data attribute for position
- Use `useRef` to measure the container height and calculate Y offsets
- Use a single `requestAnimationFrame` loop to track scanner position and trigger highlights
- Keywords matched by case-insensitive string includes

## 4B — The Score Drop (Camera Shake)

Create `src/components/exam/ScoreDrop.jsx` (<80 lines).

Props: `{ score, total, onRevealComplete }`

**The Sequence:**
1. Score starts hidden
2. After NeuralScanEffect completes, trigger the score reveal:
   - A large score number (text-7xl font-bold) scales from 3.0 to 1.0 with SPRINGS.BOUNCE
   - Simultaneously: opacity 0→1, filter blur(20px)→blur(0px)
3. When the score "lands" (animation settles), trigger Camera Shake:
   - The entire score container rapidly translates:
     ```
     Keyframes over 0.4s:
     0%:   translate(0, 0)
     10%:  translate(-4px, -2px)
     20%:  translate(3px, 4px)
     30%:  translate(-3px, -1px)
     40%:  translate(2px, 3px)
     50%:  translate(-2px, -3px)
     60%:  translate(1px, 2px)
     70%:  translate(-1px, -1px)
     80%:  translate(1px, 0)
     90%:  translate(0, 1px)
     100%: translate(0, 0)
     ```
   - Only trigger shake if score >= 70% (high score celebration)
4. Score color: >= 80% COLORS.SUCCESS_GREEN, 50-79% COLORS.AMBER_WARN, < 50% COLORS.RED_ALERT
5. Below the score: "X / Y correct" text fades in after shake settles, with SPRINGS.HEAVY
6. A circular progress ring SVG surrounds the score, animating from 0 to score% with stroke-dashoffset:
   - Ring radius: 80px, stroke-width: 6px
   - Color matches score color
   - Duration: 1.5s with CURVES.EXPO_OUT
   - Behind the colored ring: a dim track ring at 10% opacity

## 4C — Integration

These components integrate into the ExamResults page (from MASTER_BLUEPRINT Phase 5).

**Flow:**
1. User submits exam → loading state
2. AI processes answers (real or simulated delay)
3. NeuralScanEffect plays for each wrong answer's text
4. ScoreDrop reveals the final score
5. Below: detailed per-question breakdown cards

## 4D — Performance

- Scanner line animation: pure CSS `@keyframes` for the line movement
- Keyword highlighting: batched DOM updates via React state (array of highlighted indices), not individual DOM manipulation
- Camera shake: CSS `@keyframes` (NOT Framer Motion — it's too fast for spring physics)
- Score ring SVG: animated via CSS `stroke-dashoffset` transition
- `will-change: transform` on shake container only during 0.4s shake, then removed

**Commit:** `feat: neural sync exam grader — scanner line + keyword highlights + score drop + camera shake`

```
═══ PROMPT 4 COMPLETE ═══
STOP HERE. Wait for Ayush to say "next".
```

---

# ══════════════════════════════════════════════════════════════════
# PROMPT 5 — THE "MAGNETIC FLUID" NAVIGATION
# (Feature 5: Cursor effects + button physics — already built in Prompt 0's MagneticButton)
# ══════════════════════════════════════════════════════════════════

Sonnet, Prompt 0 already created the MagneticButton. This prompt extends the magnetic physics to the **Sidebar navigation** and adds the **custom cursor glow**.

## 5A — Magnetic Sidebar Items

Modify `src/components/Sidebar.jsx` (208 lines).

The `NavItem` component (currently a plain div, ~line 49-61) must gain magnetic hover behavior:

**Implementation:**
1. Wrap each NavItem in a detection zone div (padding 8px around the item)
2. On `onMouseMove` within the zone:
   - Calculate cursor distance from NavItem center
   - Apply `translateX(delta * 0.08)` and `translateY(delta * 0.05)` to the NavItem using inline style
   - Use `SPRINGS.MAGNETIC` via Framer Motion's `useMotionValue` + `useSpring`:
     ```javascript
     const x = useMotionValue(0);
     const y = useMotionValue(0);
     const springX = useSpring(x, { stiffness: 250, damping: 18, mass: 0.3 });
     const springY = useSpring(y, { stiffness: 250, damping: 18, mass: 0.3 });
     ```
3. On `onMouseLeave`: set x and y motion values to 0 (spring back)
4. The active NavItem's indicator (left border/highlight) should pulse subtly:
   - A 2px-wide bar on the left that glows with COLORS.CYAN
   - CSS animation: opacity oscillates between 0.7 and 1.0 over 2s, ease-in-out, infinite
5. Hover state (non-active items): background slides in from left as a colored bar at 5% opacity, width animating from 0% to 100% over 0.2s

## 5B — The Soft Cursor Glow

Create `src/components/ui/CursorGlow.jsx` (<50 lines).

**This is a global component rendered in App.jsx, position: fixed, pointer-events: none, z-50.**

- Tracks mouse position via `document.addEventListener('mousemove')`
- Renders a 200px circular radial gradient centered on the cursor position:
  ```
  background: radial-gradient(
    circle 100px at center,
    rgba(6, 214, 160, 0.06) 0%,
    rgba(124, 58, 237, 0.03) 40%,
    transparent 70%
  )
  ```
- The glow follows the cursor with a slight lag (use `useSpring` with stiffness: 150, damping: 15)
- This creates a soft, ambient light that follows the mouse across the entire app
- On mobile / touch devices: hide this component entirely (detect via `window.matchMedia('(hover: none)')`)
- Performance: use `transform: translate3d(x, y, 0)` for positioning (GPU-accelerated). Never use `left`/`top`.
- Wrap in React.memo. The component uses refs, not state, for position — no re-renders.

## 5C — The Haptic Ripple (SVG Displacement)

This is an ADVANCED enhancement for MagneticButton. Only implement if the SVG filter approach is performant.

**Concept:** On click, a brief pixel-distortion ripple emanates from the click point, warping the glass behind the button.

**Implementation (add to MagneticButton.jsx or as a separate HapticRipple.jsx):**
1. Define an SVG filter (rendered once, hidden):
   ```html
   <svg style={{ position: 'absolute', width: 0, height: 0 }}>
     <filter id="haptic-ripple">
       <feTurbulence type="fractalNoise" baseFrequency="0.015" numOctaves="2" result="noise" />
       <feDisplacementMap in="SourceGraphic" in2="noise" scale="0" xChannelSelector="R" yChannelSelector="G" />
     </filter>
   </svg>
   ```
2. On click, briefly apply `filter: url(#haptic-ripple)` to the button for 150ms
3. Animate the `scale` attribute of `feDisplacementMap` from 0 to 8 and back to 0 over 150ms
4. This creates a brief "reality glitch" distortion effect

**CRITICAL:** Test performance. If SVG filter animation causes frame drops, REMOVE this feature and stick with the standard ripple from Prompt 0. Use `requestAnimationFrame` to animate the filter attribute.

## 5D — Performance

- Cursor glow: only updates `transform` via ref, never triggers React re-render
- Magnetic sidebar: motion values update outside React's reconciliation cycle
- SVG filter: test on low-end devices. If > 2ms per frame, disable.
- Add `@media (prefers-reduced-motion: reduce)` queries that disable ALL animations globally (magnetic, cursor glow, page transitions revert to instant cuts)

**Commit:** `feat: magnetic sidebar + cursor glow + haptic ripple buttons`

```
═══ PROMPT 5 COMPLETE ═══
STOP HERE. Wait for Ayush to say "next".
```

---

# ══════════════════════════════════════════════════════════════════
# PROMPT 6 — MEDICAL-SPECIFIC "WOW" FEATURES
# (Features 6, 7, 8: Radiology, Virtual Ward, Flowcharts)
# ══════════════════════════════════════════════════════════════════

Sonnet, this prompt covers three advanced medical-specific modules. Since these features may not have existing pages yet, you will CREATE new page components and register them in App.jsx + Sidebar.

## 6A — The Radiology AI Lightbox

Create `src/components/medical/RadiologyViewer.jsx` (<200 lines).

**When an X-ray or lab image is opened:**

1. **Backdrop:** Full-screen, bg-black/95, fade in 0.3s
2. **Scan Line Effect:** A horizontal line sweeps top-to-bottom over the image:
   ```css
   .scan-line {
     position: absolute;
     left: 0;
     right: 0;
     height: 2px;
     background: linear-gradient(90deg,
       transparent 0%,
       rgba(6, 214, 160, 0.2) 10%,
       rgba(6, 214, 160, 0.8) 50%,
       rgba(6, 214, 160, 0.2) 90%,
       transparent 100%
     );
     box-shadow: 0 0 30px rgba(6, 214, 160, 0.3);
     animation: scanSweep 2.5s ease-in-out forwards;
   }
   @keyframes scanSweep {
     0% { top: 0%; opacity: 1; }
     100% { top: 100%; opacity: 0; }
   }
   ```
3. **Anomaly Target Lock:** When AI identifies an anomaly at coordinates (x%, y%):
   - An SVG circle ("sniper scope") appears at that position:
     - Outer ring: 60px diameter, stroke COLORS.CYAN, stroke-width 1.5, dashed stroke
     - Inner crosshairs: two short lines (horizontal + vertical) through center
     - Entry animation: scale from 3.0 to 1.0 with SPRINGS.SNAPPY, opacity 0→1
     - After settling: the outer ring pulses (scale 1.0 → 1.1 → 1.0, 2s infinite)
     - A label appears next to the target: "Potential fracture" or similar AI text, with a connecting line from ring to label
   - The "snap" on arrival: when scale hits 1.0, add a brief (100ms) ring flash (stroke-width jumps to 3 then back to 1.5)
4. **Image Controls:** Zoom, pan (via transform: translate + scale), brightness/contrast sliders
5. **Close:** MagneticButton in top-right corner

**Register in App.jsx:**
```javascript
case 'radiology': return <RadiologyViewer addToast={addToast} />;
```

## 6B — The Virtual Ward: Holographic Data Cards + Scramble Text

Create `src/components/medical/VirtualWard.jsx` (<180 lines) and `src/hooks/useScrambleText.js` (<40 lines).

**The useScrambleText Hook:**
```javascript
// Usage: const displayText = useScrambleText(targetText, { duration: 800, charset: '0123456789ABCDEF' });
// Returns a string that rapidly cycles random characters before settling on targetText

function useScrambleText(target, options = {}) {
  const { duration = 800, charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%' } = options;
  const [display, setDisplay] = useState('');
  const frameRef = useRef(null);

  useEffect(() => {
    if (!target) { setDisplay(''); return; }
    const startTime = performance.now();
    const chars = target.split('');

    function tick(now) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);

      const result = chars.map((char, i) => {
        // Each character "resolves" at a different time based on its index
        const charThreshold = i / chars.length;
        if (progress > charThreshold + 0.3) return char; // resolved
        if (char === ' ') return ' '; // preserve spaces
        return charset[Math.floor(Math.random() * charset.length)]; // scrambling
      }).join('');

      setDisplay(result);
      if (progress < 1) frameRef.current = requestAnimationFrame(tick);
    }

    frameRef.current = requestAnimationFrame(tick);
    return () => { if (frameRef.current) cancelAnimationFrame(frameRef.current); };
  }, [target, duration, charset]);

  return display;
}
```

**CRITICAL PERFORMANCE:** The scramble effect uses `requestAnimationFrame` — never `setInterval`. The hook cleans up on unmount. The charset for medical vitals should be `'0123456789.-/:'` to look like a medical monitor decoding.

**Virtual Ward Page:**
- Patient cases displayed as PremiumCard variant='glass'
- Each card has: patient avatar (placeholder circle), name, age, vitals summary
- On hover: vitals text (heart rate, BP, temperature) triggers the scramble effect:
  - Text rapidly cycles through random medical numbers before settling on actual values
  - Duration: 600ms per vital
  - Stagger: each vital starts 150ms after the previous
- Card border: left accent colored by severity (green=stable, amber=monitoring, red=critical)
- The vitals use monospace font (`font-family: 'JetBrains Mono', 'SF Mono', monospace, monospace`)

## 6C — Infinite Canvas Study Flowcharts

Create `src/components/medical/FlowchartCanvas.jsx` (<250 lines — SPLIT if exceeds 300).

**Pan & Zoom Container:**
1. A full-page container with `overflow: hidden`
2. Inside: a transform group that responds to:
   - Mouse drag → translate (pan)
   - Scroll/pinch → scale (zoom, clamped 0.3 to 3.0)
   - Use `useRef` to track: `{ x: 0, y: 0, scale: 1 }`
   - Apply via `transform: translate(${x}px, ${y}px) scale(${scale})`
   - All transform updates use `requestAnimationFrame` for smoothness
3. Zoom should target the cursor position (not center): adjust translate to keep the point under the cursor stable during zoom

**Flowchart Nodes:**
- Each node: PremiumCard variant='glass', rounded-xl
- Content: medical concept title, brief description, icon
- Draggable: implement simple drag via `onMouseDown` → `onMouseMove` → `onMouseUp`

**Animated SVG Connections:**
- Lines between nodes: SVG `<path>` elements with cubic bezier curves
- The "flowing glow" effect:
  ```css
  .flow-path {
    stroke: rgba(6, 214, 160, 0.3);
    stroke-width: 2;
    fill: none;
    stroke-dasharray: 8 12;
    animation: flowDash 1.5s linear infinite;
  }
  .flow-path-glow {
    stroke: rgba(6, 214, 160, 0.6);
    stroke-width: 4;
    fill: none;
    filter: blur(3px);
    stroke-dasharray: 8 12;
    animation: flowDash 1.5s linear infinite;
  }
  @keyframes flowDash {
    to { stroke-dashoffset: -20; }
  }
  ```
- Render TWO paths for each connection: one crisp, one blurred (the glow). The glow path sits behind.
- Direction of flow indicated by dash direction (Symptom → Diagnosis → Treatment)

**Register in App.jsx:**
```javascript
case 'flowcharts': return <FlowchartCanvas addToast={addToast} />;
```

## 6D — Performance

- RadiologyViewer: scan line is pure CSS animation, no JS
- useScrambleText: rAF-based, auto-cancels on unmount, no memory leaks
- FlowchartCanvas: all pan/zoom via transform (GPU), no layout reflows
- SVG flow paths: CSS animations on compositor thread
- All three pages: wrap in ErrorBoundary, show Skeleton while loading data

**Commit:** `feat: radiology lightbox + virtual ward scramble text + infinite flowchart canvas`

```
═══ PROMPT 6 COMPLETE ═══
STOP HERE. Wait for Ayush to say "next".
```

---

# ══════════════════════════════════════════════════════════════════
# PROMPT 7 — THE 3 "UNEXPECTED WOW" MICRO-INTERACTIONS
# (Features 9, 10, 11: Invented enhancements)
# ══════════════════════════════════════════════════════════════════

Sonnet, this final prompt adds three micro-interactions that elevate the entire app from "premium" to "unforgettable."

## 7A — Unexpected Wow #1: Physics-Based Flashcard Flick

**Location:** SpacedRepetition.jsx (from MASTER_BLUEPRINT Phase 5)

When reviewing flashcards in the Spaced Repetition module, the user doesn't click buttons. They FLICK the card.

**Implementation:**
1. The flashcard is a draggable element (Framer Motion `drag` prop, constrained to x-axis)
2. `onDragEnd`: check velocity and direction:
   - Flick RIGHT (velocity.x > 500): Card flies off-screen right with rotation, triggers "Good/Easy" rating
   - Flick LEFT (velocity.x < -500): Card flies off-screen left, triggers "Again/Hard" rating
   - If velocity is below threshold: card springs back to center with SPRINGS.BOUNCE
3. The flying-off animation:
   ```
   animate: {
     x: direction > 0 ? 600 : -600,
     rotate: direction > 0 ? 15 : -15,
     opacity: 0,
     transition: { duration: 0.4, ease: CURVES.EXPO_OUT }
   }
   ```
4. Underneath the current card, the NEXT card is visible at 95% scale and 60% opacity. As the current card is dragged, the next card scales up to 100% and fades to 100% (using `useTransform` from drag x value).
5. Visual feedback during drag:
   - Dragging right: card tints green (overlay with rgba(16,185,129,0.1))
   - Dragging left: card tints red (overlay with rgba(239,68,68,0.1))
   - The tint intensity maps to drag distance: `useTransform(x, [-200, 0, 200], [0.15, 0, 0.15])`

**Performance:** Use Framer Motion's `drag` prop with `dragConstraints={{ left: 0, right: 0 }}` (soft constraint) and `dragElastic={0.8}`. The drag updates happen on the compositor thread via motion values.

## 7B — Unexpected Wow #2: Scroll-Triggered SVG Path Drawing for Clinical Workflows

**Location:** StudyPlanPage.jsx → WeeklyPlanner.jsx

The 7-day study plan is presented as a vertical timeline. The connecting line between days is an SVG path that DRAWS ITSELF as the user scrolls.

**Implementation:**
1. Create `src/components/ui/ScrollDrawPath.jsx` (<60 lines)
2. Uses `useScroll` and `useTransform` from Framer Motion:
   ```javascript
   const containerRef = useRef(null);
   const { scrollYProgress } = useScroll({ target: containerRef, offset: ["start end", "end start"] });
   const pathLength = useTransform(scrollYProgress, [0, 1], [0, 1]);
   ```
3. Render an SVG path (vertical wavy line connecting the 7 day cards):
   ```html
   <motion.path
     d="M 20 0 C 20 80, 20 80, 20 160 S 20 240, 20 320 ..."
     stroke={COLORS.CYAN}
     strokeWidth={2}
     fill="none"
     style={{ pathLength }}
     strokeLinecap="round"
   />
   ```
4. As the user scrolls down through the weekly planner, the line progressively draws itself, connecting each day node.
5. At each day node intersection: a small circle (8px) that fills with COLORS.CYAN when the path reaches it.
6. The line has a glow trail: a second path behind it with blur(4px) and 40% opacity.

## 7C — Unexpected Wow #3: Breathing Glass Surfaces

**Location:** Global — applies to ALL PremiumCard instances

The glassmorphism cards are not static. They "breathe."

**Implementation (add to PremiumCard.jsx):**
1. Each PremiumCard has a very subtle ambient animation on its background gradient:
   ```css
   @keyframes glassBreath {
     0%, 100% {
       background: radial-gradient(
         ellipse at 30% 30%,
         rgba(6, 214, 160, 0.03) 0%,
         transparent 50%
       );
     }
     50% {
       background: radial-gradient(
         ellipse at 70% 70%,
         rgba(124, 58, 237, 0.03) 0%,
         transparent 50%
       );
     }
   }
   ```
   - Duration: 8s, ease-in-out, infinite
   - This makes the glass surface slowly shift between a warm and cool ambient light
2. The effect is achieved with a `::before` pseudo-element (absolute positioned, full size, pointer-events: none)
3. The breathing is so subtle (3% opacity max) that it's felt more than seen — it gives the surface a "living" quality
4. **CRITICAL:** This animation runs via CSS `@keyframes` on a compositor layer. It adds ZERO JavaScript overhead. Add `contain: paint` to the pseudo-element to isolate it.
5. Only apply to cards with the `breathing` prop set to true (default: true for the 'glass' variant, false for others). This allows selective opt-out if performance is a concern on low-end devices.

## 7D — Reduced Motion Respect

Add to `src/styles/premiumDesignSystem.js`:

```javascript
export const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

// Use in components:
// const prefersReduced = window.matchMedia(REDUCED_MOTION_QUERY).matches;
// If true: skip all spring animations, use instant transitions, hide cursor glow, disable magnetic effects
```

Add a global CSS rule:
```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

This ensures accessibility compliance — users who prefer reduced motion get instant, clean transitions.

**Commit:** `feat: physics flashcard flick + scroll-drawn paths + breathing glass + reduced motion support`

```
═══ PROMPT 7 COMPLETE ═══
ALL PROMPTS DONE. The Neuro-Aesthetic layer is complete.
```

---

# ══════════════════════════════════════════════════════════════════
# APPENDIX A — EXECUTION ORDER SUMMARY
# ══════════════════════════════════════════════════════════════════

Execute the MASTER_BLUEPRINT.md first (Phases 1-6 for functionality), THEN execute this document:

| Order | Prompt | What It Builds | Dependencies |
|-------|--------|----------------|-------------|
| 1st | MASTER_BLUEPRINT Phase 1-6 | All functional features | None |
| 2nd | Prompt 0 | Global Premium Engine | Must exist before all other prompts |
| 3rd | Prompt 1 | Drifting Camera Dashboard | Prompt 0 + MASTER Phase 2 (For You cards) |
| 4th | Prompt 2 | Living Paper Diary | Prompt 0 + MASTER Phase 3 (Activity Calendar) |
| 5th | Prompt 3 | E-Book Hyper-Focus | Prompt 0 + MASTER Phase 4 (Reader overhaul) |
| 6th | Prompt 4 | Neural Sync Grader | Prompt 0 + MASTER Phase 5 (Exam system) |
| 7th | Prompt 5 | Magnetic Navigation | Prompt 0 |
| 8th | Prompt 6 | Medical Wow Features | Prompt 0 |
| 9th | Prompt 7 | Unexpected Wow | Prompt 0 + MASTER Phase 5 (Spaced Rep) |

# ══════════════════════════════════════════════════════════════════
# APPENDIX B — PERFORMANCE BUDGET
# ══════════════════════════════════════════════════════════════════

| Metric | Target | Red Line |
|--------|--------|----------|
| First Contentful Paint | < 1.2s | 2.0s |
| Largest Contentful Paint | < 2.5s | 4.0s |
| Time to Interactive | < 3.5s | 5.0s |
| Total Bundle Size (gzipped) | < 350KB | 500KB |
| Animation Frame Rate | 60fps | Never below 30fps |
| Backdrop-filter elements on screen | Max 8 | Max 12 |
| CSS animation layers | GPU-composited | Never trigger layout |

**If any animation drops below 50fps on a mid-range device (2020 smartphone), it must be disabled or simplified. Performance is non-negotiable.**

---

**END OF NEURO-AESTHETIC IMPLEMENTATION BIBLE**
