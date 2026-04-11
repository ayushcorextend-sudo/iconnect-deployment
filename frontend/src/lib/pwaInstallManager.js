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

let deferredPrompt = window.__PWA_PROMPT__ || null
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

// Detect iOS device (iPhone, iPad, iPod)
function checkIsIOS() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream
}

// Detect Chrome on iOS — uses CriOS in UA instead of Safari
// Chrome on iOS cannot install PWAs; user must switch to Safari.
function checkIsChromeiOS() {
  return checkIsIOS() && /CriOS/.test(navigator.userAgent)
}

/** Current snapshot of install state */
function getState() {
  const isIOS = checkIsIOS()
  const isChromeiOS = checkIsChromeiOS()
  const canPrompt = !!deferredPrompt && !isInstalled
  // Desktop fallback: not iOS, not installed, no native prompt available.
  // We still show an install button with manual instructions because
  // beforeinstallprompt is unreliable across browsers/sessions.
  const showFallbackInstall = !isInstalled && !isIOS && !canPrompt
  return {
    /** true when the browser supports install AND user hasn't installed yet */
    canPrompt,
    /** true when running as installed PWA */
    isInstalled,
    /** true on any iOS device */
    isIOS,
    /** true on Chrome for iOS — cannot install PWA, must use Safari */
    isChromeiOS,
    /** true on iOS Safari that hasn't installed yet (and NOT Chrome) */
    showIOSGuide: isIOS && !isChromeiOS && !isInstalled && !navigator.standalone,
    /** true on Chrome for iOS that hasn't installed yet — show "switch to Safari" */
    showChromeiOSGuide: isChromeiOS && !isInstalled,
    /** true on desktop/Android browsers where the native event hasn't fired yet */
    showFallbackInstall,
  }
}

/** Trigger the browser install prompt.
 *  Returns one of:
 *    'accepted' | 'dismissed' — native Chrome/Edge prompt fired
 *    'shared'                 — iOS Safari share sheet opened
 *    'ios-safari'             — iOS Safari without share API → caller shows popover
 *    'ios-chrome'             — Chrome on iPhone → caller shows "open in Safari"
 *    'no-prompt'              — desktop without beforeinstallprompt → caller shows tooltip
 */
async function promptInstall() {
  // 1) Native install prompt (Chrome/Edge/Brave when event fired) — ONE CLICK
  if (deferredPrompt) {
    try {
      const promptEvent = deferredPrompt;
      deferredPrompt = null; // Consume the event immediately (can only be used once)
      notify();
      
      promptEvent.prompt();
      const { outcome } = await promptEvent.userChoice;
      return outcome;
    } catch (e) {
      console.error('PWA Prompt Error:', e);
      // fall through
    }
  }

  // 2) iOS Safari — open native share sheet (Add to Home Screen lives there)
  if (checkIsIOS() && !checkIsChromeiOS()) {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Install iConnect',
          text: 'Add iConnect to your Home Screen',
          url: window.location.href,
        })
        return 'shared'
      } catch (_) { /* user cancelled — fall through to in-app popover */ }
    }
    return 'ios-safari'
  }

  // 3) Chrome on iOS — must use Safari (caller shows in-app popover)
  if (checkIsChromeiOS()) return 'ios-chrome'

  // 4) Desktop / Android browsers without the event (caller shows inline tooltip)
  return 'no-prompt'
}

/** Subscribe to state changes. Returns unsubscribe fn. */
function subscribe(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export { getState, promptInstall, subscribe }
