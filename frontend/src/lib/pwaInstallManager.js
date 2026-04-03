/**
 * PWA Install Manager — Global Singleton
 * ────────────────────────────────────────
 * Captures the `beforeinstallprompt` event as early as possible
 * (even before React mounts) and exposes it to any component.
 *
 * Why a singleton?
 *   - `beforeinstallprompt` fires ONCE. If React hasn't mounted yet, it's lost.
 *   - Multiple components (Sidebar, TopBar, Banner) need the same event.
 *   - A module-level listener guarantees capture regardless of React lifecycle.
 */

let deferredPrompt = null
let isInstalled = false
const listeners = new Set()

// ── Detect if already installed ──────────────────────────────
function checkInstalled() {
  // Standalone mode (Android PWA, desktop PWA)
  if (window.matchMedia('(display-mode: standalone)').matches) return true
  // iOS standalone
  if (navigator.standalone === true) return true
  return false
}

isInstalled = checkInstalled()

// ── Capture the event at module load time (before React) ─────
if (!isInstalled) {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    deferredPrompt = e
    notify()
  })
}

window.addEventListener('appinstalled', () => {
  deferredPrompt = null
  isInstalled = true
  notify()
})

// ── Notify all subscribers when state changes ────────────────
function notify() {
  listeners.forEach((fn) => {
    try { fn(getState()) } catch (_) { /* swallow */ }
  })
}

// ── Public API ───────────────────────────────────────────────

/** Current snapshot of install state */
function getState() {
  return {
    /** true when the browser supports install AND user hasn't installed yet */
    canPrompt: !!deferredPrompt && !isInstalled,
    /** true when running as installed PWA */
    isInstalled,
    /** true on iOS Safari (no beforeinstallprompt — needs manual A2HS) */
    isIOS: /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream,
    /** true on iOS Safari that hasn't installed yet */
    showIOSGuide: /iPad|iPhone|iPod/.test(navigator.userAgent)
      && !window.MSStream
      && !isInstalled
      && !navigator.standalone,
  }
}

/** Trigger the browser install prompt */
async function promptInstall() {
  if (!deferredPrompt) return 'no-prompt'
  deferredPrompt.prompt()
  const { outcome } = await deferredPrompt.userChoice
  if (outcome === 'accepted') {
    deferredPrompt = null
    notify()
  }
  return outcome // 'accepted' | 'dismissed'
}

/** Subscribe to state changes. Returns unsubscribe fn. */
function subscribe(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export { getState, promptInstall, subscribe }
