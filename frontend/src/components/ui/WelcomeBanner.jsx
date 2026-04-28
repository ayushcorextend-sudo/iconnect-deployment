/**
 * WelcomeBanner.jsx
 *
 * First-login welcome modal for iCONNECT. Uses the single composed banner
 * image exported from Lovable — no individual asset composition needed.
 *
 * Gating: localStorage key `iconnect_welcome_seen_v2`.
 * Mounted from App.jsx alongside PWAInstallBanner.
 */
import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { Z } from '../../styles/zIndex';

import bannerImg from '../../assets/welcome/iconnect-welcome-banner.png';

const SEEN_KEY = 'iconnect_welcome_seen_v2';

function hasSeenWelcome() {
  try { return !!localStorage.getItem(SEEN_KEY); } catch { return false; }
}

function markSeen() {
  try { localStorage.setItem(SEEN_KEY, '1'); } catch { /* noop */ }
}

const ANIM_CSS = `
@keyframes wb-overlay-in { from { opacity: 0; } to { opacity: 1; } }
@keyframes wb-card-in { from { opacity: 0; transform: translateY(18px) scale(0.96); } to { opacity: 1; transform: none; } }
.wb-overlay { animation: wb-overlay-in 0.4s ease both; }
.wb-card    { animation: wb-card-in 0.55s cubic-bezier(0.16, 1, 0.3, 1) both; }
`;

export default function WelcomeBanner({ onDismiss }) {
  const [open, setOpen] = useState(() => !hasSeenWelcome());

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') handleDismiss(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const handleDismiss = () => {
    markSeen();
    setOpen(false);
    onDismiss?.();
  };

  if (!open) return null;

  return (
    <>
      <style>{ANIM_CSS}</style>
      <div
        className="wb-overlay"
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(2, 6, 23, 0.78)',
          backdropFilter: 'blur(6px)',
          WebkitBackdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px',
          overflowY: 'auto',
          zIndex: Z.loginBanner,
        }}
        role="dialog"
        aria-modal="true"
        aria-label="Welcome to iConnect"
        onClick={(e) => { if (e.target === e.currentTarget) handleDismiss(); }}
      >
        <div
          className="wb-card"
          style={{
            position: 'relative',
            width: '100%',
            maxWidth: '380px',
            borderRadius: '24px',
            overflow: 'hidden',
            boxShadow: '0 30px 80px rgba(0, 20, 80, 0.55)',
          }}
        >
          {/* Close button */}
          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Close welcome"
            style={{
              position: 'absolute',
              top: '12px',
              right: '12px',
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: 'rgba(0, 0, 0, 0.4)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              zIndex: 10,
              transition: 'background 0.15s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(0, 0, 0, 0.6)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(0, 0, 0, 0.4)'; }}
          >
            <X size={16} />
          </button>

          {/* The full composed banner image from Lovable */}
          <img
            src={bannerImg}
            alt="Welcome to iCONNECT — An educational initiative by ICON LIFE SCIENCES"
            style={{
              width: '100%',
              height: 'auto',
              display: 'block',
            }}
          />

          {/* Clickable overlay on the "Start Learning" button area in the image */}
          <button
            type="button"
            onClick={handleDismiss}
            style={{
              position: 'absolute',
              bottom: '11.5%',
              left: '50%',
              transform: 'translateX(-50%)',
              width: '55%',
              height: '5.5%',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              zIndex: 10,
              borderRadius: '50px',
            }}
            aria-label="Start Learning"
          />
        </div>
      </div>
    </>
  );
}
