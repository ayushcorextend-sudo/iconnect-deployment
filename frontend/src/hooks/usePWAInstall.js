import { useState, useEffect } from 'react'

/**
 * Captures the browser's beforeinstallprompt event and exposes a
 * promptInstall() trigger. isInstallable is false once the app is
 * installed or the event never fires (e.g. already installed, not eligible).
 */
export default function usePWAInstall() {
  const [installEvent, setInstallEvent] = useState(null)
  const [isInstalled, setIsInstalled] = useState(false)

  useEffect(() => {
    // Already running as a standalone PWA — nothing to prompt
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true)
      return
    }

    const handleBeforeInstall = (e) => {
      e.preventDefault()        // stop the default mini-infobar
      setInstallEvent(e)
    }

    const handleAppInstalled = () => {
      setInstallEvent(null)     // hide button immediately after install
      setIsInstalled(true)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstall)
    window.addEventListener('appinstalled', handleAppInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  const promptInstall = async () => {
    if (!installEvent) return
    installEvent.prompt()
    const { outcome } = await installEvent.userChoice
    if (outcome === 'accepted') {
      setInstallEvent(null)   // hide button — install in progress
    }
  }

  return {
    isInstallable: !!installEvent && !isInstalled,
    promptInstall,
  }
}
