import { useState, useEffect } from 'react'
import { Download, X, Share, PlusSquare } from 'lucide-react'
import usePWAInstall from '../../hooks/usePWAInstall'

const DISMISSED_KEY = 'pwa-banner-dismissed'
const DISMISS_DAYS = 7 // re-show after 7 days

function wasDismissedRecently() {
  try {
    const ts = localStorage.getItem(DISMISSED_KEY)
    if (!ts) return false
    const diff = Date.now() - Number(ts)
    return diff < DISMISS_DAYS * 24 * 60 * 60 * 1000
  } catch { return false }
}

/**
 * PWAInstallBanner — slides up from bottom on first visit.
 *
 * Android/Desktop Chrome: shows "Install App" button that triggers native prompt.
 * iOS Safari: shows step-by-step "Add to Home Screen" guide.
 * Already installed / dismissed recently: hidden.
 */
export default function PWAInstallBanner() {
  const { isInstallable, showIOSGuide, isInstalled, promptInstall } = usePWAInstall()
  const [visible, setVisible] = useState(false)
  const [iosExpanded, setIosExpanded] = useState(false)

  useEffect(() => {
    // Don't show if installed, dismissed recently, or nothing to show
    if (isInstalled) return
    if (wasDismissedRecently()) return
    if (!isInstallable && !showIOSGuide) return

    // Delay appearance so user isn't hit immediately on load
    const timer = setTimeout(() => setVisible(true), 3000)
    return () => clearTimeout(timer)
  }, [isInstallable, showIOSGuide, isInstalled])

  const dismiss = () => {
    setVisible(false)
    try { localStorage.setItem(DISMISSED_KEY, String(Date.now())) } catch {}
  }

  const handleInstall = async () => {
    const outcome = await promptInstall()
    if (outcome === 'accepted') {
      setVisible(false)
    }
  }

  if (!visible) return null

  return (
    <div className="pwa-install-banner pwa-banner-animate-in">
      <button className="pwa-banner-close" onClick={dismiss} aria-label="Dismiss">
        <X size={16} />
      </button>

      {/* ── Native install (Android / Desktop Chrome) ── */}
      {isInstallable && (
        <div className="pwa-banner-content">
          <div className="pwa-banner-icon">
            <Download size={22} />
          </div>
          <div className="pwa-banner-text">
            <strong>Install iConnect</strong>
            <span>Get the full app experience — faster, offline access, and home screen launch.</span>
          </div>
          <button className="pwa-banner-action" onClick={handleInstall}>
            Install
          </button>
        </div>
      )}

      {/* ── iOS Safari guide ── */}
      {!isInstallable && showIOSGuide && (
        <div className="pwa-banner-content pwa-banner-ios">
          <div className="pwa-banner-icon">
            <Download size={22} />
          </div>
          <div className="pwa-banner-text">
            <strong>Install iConnect</strong>
            {!iosExpanded ? (
              <span>
                Add to your Home Screen for the full app experience.{' '}
                <button className="pwa-ios-how" onClick={() => setIosExpanded(true)}>
                  How?
                </button>
              </span>
            ) : (
              <div className="pwa-ios-steps">
                <div className="pwa-ios-step">
                  <Share size={16} />
                  <span>Tap the <strong>Share</strong> button in Safari</span>
                </div>
                <div className="pwa-ios-step">
                  <PlusSquare size={16} />
                  <span>Scroll down, tap <strong>Add to Home Screen</strong></span>
                </div>
                <div className="pwa-ios-step">
                  <Download size={16} />
                  <span>Tap <strong>Add</strong> — done!</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
