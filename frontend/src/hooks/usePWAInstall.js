import { useState, useEffect, useCallback } from 'react'
import { getState, promptInstall, subscribe } from '../lib/pwaInstallManager'

/**
 * React hook backed by the global pwaInstallManager singleton.
 *
 * Multiple components can call this hook — they all share the same
 * captured `beforeinstallprompt` event. The event is captured at
 * module-load time (before React mounts), so it's never lost.
 *
 * Returns:
 *   isInstallable  — true when native install prompt is available (Android/desktop Chrome)
 *   isIOS          — true on iOS Safari (needs manual "Add to Home Screen")
 *   showIOSGuide   — true on iOS Safari when not yet installed
 *   isInstalled    — true when running as installed PWA
 *   promptInstall  — triggers the native install dialog
 */
export default function usePWAInstall() {
  const [state, setState] = useState(getState)

  useEffect(() => {
    // Sync on mount (event may have already fired)
    setState(getState())
    return subscribe(setState)
  }, [])

  const handlePrompt = useCallback(() => promptInstall(), [])

  return {
    isInstallable: state.canPrompt,
    isIOS: state.isIOS,
    isChromeiOS: state.isChromeiOS,
    showIOSGuide: state.showIOSGuide,
    showChromeiOSGuide: state.showChromeiOSGuide,
    showFallbackInstall: state.showFallbackInstall,
    isInstalled: state.isInstalled,
    promptInstall: handlePrompt,
  }
}
