/**
 * WelcomeBanner.jsx
 *
 * First-login welcome modal for iCONNECT — full ICON LIFE SCIENCES brand
 * splash with the real PNG artwork (brain centerpiece, doctor figures,
 * specialty icon bubbles). Mirrors the user-provided Hero.jsx mockup
 * exactly, wrapped as a dismissible modal overlay.
 *
 * Gating: localStorage key `iconnect_welcome_seen_v1`. Bumping the v#
 * resets it for everyone (use when copy/visuals change meaningfully).
 *
 * Animations are pure CSS keyframes injected via inline <style> — no
 * framer-motion dep (the project doesn't ship it; PWAInstallBanner
 * follows the same pattern).
 *
 * Mounted from App.jsx alongside PWAInstallBanner.
 */
import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { Z } from '../../styles/zIndex';

import BrainVisual    from '../../assets/welcome/Connected_Brain_Visual.png';
import DoctorMale     from '../../assets/welcome/Doctor_Male_Profile.png';
import DoctorFemale   from '../../assets/welcome/Doctor_Female_Profile.png';
import Microscope     from '../../assets/welcome/Microscope.png';
import KnowledgeBook  from '../../assets/welcome/Knowledge_Book.png';
import TabletDashboard from '../../assets/welcome/Tablet_Dashboard.png';

const SEEN_KEY = 'iconnect_welcome_seen_v1';

/** @returns {boolean} */
function hasSeenWelcome() {
  try { return !!localStorage.getItem(SEEN_KEY); } catch { return false; }
}

function markSeen() {
  try { localStorage.setItem(SEEN_KEY, '1'); } catch {
    // localStorage unavailable — banner will reappear next session.
  }
}

const ANIM_CSS = `
@keyframes wb-overlay-in   { from { opacity: 0; } to { opacity: 1; } }
@keyframes wb-card-in      { from { opacity: 0; transform: translateY(18px) scale(0.96); } to { opacity: 1; transform: none; } }
@keyframes wb-bubble-float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
@keyframes wb-brain-glow   { 0%, 100% { filter: drop-shadow(0 0 24px rgba(0,180,255,0.55)); } 50% { filter: drop-shadow(0 0 38px rgba(0,200,255,0.85)); } }
.wb-overlay { animation: wb-overlay-in 0.4s ease both; }
.wb-card    { animation: wb-card-in 0.55s cubic-bezier(0.16, 1, 0.3, 1) both; }
.wb-bubble  { animation: wb-bubble-float 4s ease-in-out infinite; }
.wb-brain   { animation: wb-brain-glow 4.5s ease-in-out infinite; }
`;

const styles = {
  /* full-viewport dimmed backdrop */
  overlay: {
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
  },

  /* the welcome card itself — mirrors Hero.jsx wrapper, plus rounded corners + shadow */
  card: {
    position: 'relative',
    width: '100%',
    maxWidth: '460px',
    background: 'linear-gradient(160deg, #0b0f2a 0%, #0d1540 40%, #0b1a3a 70%, #060c1f 100%)',
    borderRadius: '28px',
    border: '1px solid rgba(100, 160, 255, 0.18)',
    boxShadow: '0 30px 80px rgba(0, 20, 80, 0.55)',
    color: '#fff',
    fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    overflow: 'hidden',
    paddingBottom: '24px',
  },

  ambientGlow: {
    position: 'absolute',
    top: '24%',
    left: '50%',
    transform: 'translateX(-50%)',
    width: '520px',
    height: '520px',
    borderRadius: '50%',
    background:
      'radial-gradient(ellipse at center, rgba(0,180,255,0.22) 0%, rgba(0,100,255,0.12) 40%, transparent 70%)',
    pointerEvents: 'none',
    zIndex: 0,
  },

  closeBtn: {
    position: 'absolute',
    top: '14px',
    right: '14px',
    width: '34px',
    height: '34px',
    borderRadius: '50%',
    background: 'rgba(15, 30, 80, 0.6)',
    border: '1px solid rgba(100, 160, 255, 0.25)',
    color: 'rgba(220, 230, 255, 0.85)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    zIndex: 20,
    transition: 'background 0.15s',
  },

  /* HEADER — logo + brand + welcome text */
  header: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    paddingTop: '28px',
    zIndex: 10,
    gap: '2px',
    position: 'relative',
  },
  logoCircle: {
    width: '52px',
    height: '52px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #1a3a8f 0%, #1565c0 50%, #0d47a1 100%)',
    border: '2px solid rgba(100,160,255,0.5)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 0 18px rgba(30,100,255,0.5)',
  },
  logoIconText: {
    fontSize: '11px',
    fontWeight: 900,
    color: '#fff',
    letterSpacing: '0.5px',
    lineHeight: 1.1,
  },
  logoSubText: {
    fontSize: '6.5px',
    color: 'rgba(200,220,255,0.9)',
    letterSpacing: '0.5px',
    marginTop: '1px',
  },
  brandName: {
    fontSize: '10.5px',
    fontWeight: 700,
    color: 'rgba(200,220,255,0.85)',
    letterSpacing: '2.5px',
    marginTop: '7px',
    textTransform: 'uppercase',
  },
  welcomeText: {
    fontSize: '28px',
    fontWeight: 400,
    color: '#c8d8f8',
    letterSpacing: '1px',
    marginTop: '14px',
    lineHeight: 1,
  },
  iconnectText: {
    fontSize: '60px',
    fontWeight: 900,
    background: 'linear-gradient(90deg, #f59e0b 0%, #fb923c 40%, #f97316 70%, #ea580c 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
    letterSpacing: '2px',
    lineHeight: 1.05,
    marginTop: '2px',
    filter: 'drop-shadow(0 0 12px rgba(251,146,60,0.55))',
  },

  /* SCENE — orbit rings + brain + doctors + bubbles */
  scene: {
    position: 'relative',
    width: '100%',
    maxWidth: '460px',
    height: '420px',
    marginTop: '4px',
    zIndex: 2,
  },
  orbitOuter: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: '370px',
    height: '370px',
    borderRadius: '50%',
    border: '1px solid rgba(80,160,255,0.20)',
    pointerEvents: 'none',
  },
  orbitInner: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: '300px',
    height: '300px',
    borderRadius: '50%',
    border: '1px solid rgba(80,160,255,0.15)',
    pointerEvents: 'none',
  },
  brain: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: '240px',
    height: '240px',
    objectFit: 'contain',
    zIndex: 5,
  },
  doctorMale: {
    position: 'absolute',
    bottom: '0px',
    left: '12px',
    height: '300px',
    objectFit: 'contain',
    zIndex: 3,
    filter: 'drop-shadow(-4px 0 18px rgba(0,60,180,0.35))',
    pointerEvents: 'none',
  },
  doctorFemale: {
    position: 'absolute',
    bottom: '0px',
    right: '12px',
    height: '300px',
    objectFit: 'contain',
    zIndex: 3,
    filter: 'drop-shadow(4px 0 18px rgba(0,60,180,0.35))',
    pointerEvents: 'none',
  },

  floatBubble: {
    position: 'absolute',
    width: '58px',
    height: '58px',
    borderRadius: '50%',
    background: 'rgba(15,30,80,0.75)',
    border: '1.5px solid rgba(100,160,255,0.30)',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 8,
    boxShadow: '0 0 14px rgba(0,100,255,0.25), inset 0 0 8px rgba(0,120,255,0.10)',
  },
  bubbleImg: {
    width: '36px',
    height: '36px',
    objectFit: 'contain',
  },
  labelPill: {
    position: 'absolute',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    background: 'rgba(10,22,60,0.70)',
    border: '1px solid rgba(100,160,255,0.22)',
    borderRadius: '20px',
    padding: '4px 10px 4px 7px',
    backdropFilter: 'blur(6px)',
    WebkitBackdropFilter: 'blur(6px)',
    zIndex: 9,
  },
  labelDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    background: '#f97316',
    boxShadow: '0 0 6px #f97316',
    flexShrink: 0,
  },
  labelText: {
    fontSize: '11px',
    fontWeight: 600,
    color: '#e2e8f0',
    letterSpacing: '0.4px',
    whiteSpace: 'nowrap',
  },

  /* DESCRIPTION + CTA + FOOTER */
  descCard: {
    background: 'rgba(15,30,70,0.65)',
    border: '1px solid rgba(100,160,255,0.20)',
    borderRadius: '14px',
    padding: '16px 24px',
    maxWidth: '340px',
    margin: '12px 16px 0',
    textAlign: 'center',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    zIndex: 10,
    boxShadow: '0 4px 30px rgba(0,50,200,0.15)',
  },
  descText: {
    fontSize: '13.5px',
    lineHeight: 1.6,
    color: 'rgba(220,230,255,0.88)',
    fontWeight: 400,
    margin: 0,
  },
  ctaButton: {
    marginTop: '18px',
    padding: '15px 72px',
    background: 'linear-gradient(90deg, #f59e0b 0%, #fb923c 50%, #f97316 100%)',
    border: 'none',
    borderRadius: '50px',
    color: '#fff',
    fontSize: '17px',
    fontWeight: 700,
    letterSpacing: '0.5px',
    cursor: 'pointer',
    boxShadow: '0 4px 24px rgba(249,115,22,0.55), 0 0 40px rgba(249,115,22,0.25)',
    zIndex: 10,
    transition: 'transform 0.15s, box-shadow 0.15s',
  },
  footer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 0,
    marginTop: '22px',
    zIndex: 10,
    width: '100%',
    maxWidth: '320px',
  },
  footerItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '5px',
    flex: 1,
  },
  footerDivider: {
    width: '1px',
    height: '36px',
    background: 'rgba(100,160,255,0.25)',
    flexShrink: 0,
  },
  footerIcon: {
    fontSize: '22px',
    lineHeight: 1,
  },
  footerLabel: {
    fontSize: '12px',
    fontWeight: 600,
    color: 'rgba(200,220,255,0.80)',
    letterSpacing: '0.5px',
  },
};

/**
 * @typedef {Object} WelcomeBannerProps
 * @property {() => void} [onDismiss]
 */

/** @param {WelcomeBannerProps} props */
export default function WelcomeBanner({ onDismiss }) {
  const [open, setOpen] = useState(() => !hasSeenWelcome());

  // Lock background scroll while modal is open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  // Escape to dismiss
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') handleDismiss(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        style={{ ...styles.overlay, zIndex: Z.loginBanner }}
        role="dialog"
        aria-modal="true"
        aria-label="Welcome to iConnect"
        onClick={(e) => { if (e.target === e.currentTarget) handleDismiss(); }}
      >
        <div className="wb-card" style={styles.card}>
          <div style={styles.ambientGlow} />

          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Close welcome"
            style={styles.closeBtn}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(40, 60, 130, 0.85)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(15, 30, 80, 0.6)'; }}
          >
            <X size={16} />
          </button>

          {/* HEADER */}
          <div style={styles.header}>
            <div style={styles.logoCircle}>
              <span style={styles.logoIconText}>ICON</span>
              <span style={styles.logoSubText}>LIFE</span>
            </div>
            <span style={styles.brandName}>ICON LIFE SCIENCES</span>
            <span style={styles.welcomeText}>Welcome to</span>
            <span style={styles.iconnectText}>iCONNECT</span>
          </div>

          {/* SCENE */}
          <div style={styles.scene}>
            <div style={styles.orbitOuter} />
            <div style={styles.orbitInner} />

            {/* Brain centerpiece — slow glow pulse */}
            <img
              src={BrainVisual}
              alt="Connected Brain"
              className="wb-brain"
              style={styles.brain}
            />

            {/* Doctor figures flanking the brain */}
            <img src={DoctorMale}   alt="" style={styles.doctorMale}   aria-hidden="true" />
            <img src={DoctorFemale} alt="" style={styles.doctorFemale} aria-hidden="true" />

            {/* Microscope bubble (top-left) + Psychiatry label */}
            <div className="wb-bubble" style={{ ...styles.floatBubble, top: '46px', left: '42px' }}>
              <img src={Microscope} alt="" style={styles.bubbleImg} aria-hidden="true" />
            </div>
            <div style={{ ...styles.labelPill, top: '52px', left: '106px' }}>
              <span style={styles.labelDot} />
              <span style={styles.labelText}>Psychiatry</span>
            </div>

            {/* Book bubble (top-right) + Neurology label */}
            <div
              className="wb-bubble"
              style={{ ...styles.floatBubble, top: '46px', right: '42px', animationDelay: '0.6s' }}
            >
              <img src={KnowledgeBook} alt="" style={styles.bubbleImg} aria-hidden="true" />
            </div>
            <div style={{ ...styles.labelPill, top: '52px', right: '106px' }}>
              <span style={styles.labelDot} />
              <span style={styles.labelText}>Neurology</span>
            </div>

            {/* Tablet bubble (bottom-left) + Neurosurgery label */}
            <div
              className="wb-bubble"
              style={{ ...styles.floatBubble, bottom: '74px', left: '52px', animationDelay: '1.2s' }}
            >
              <img src={TabletDashboard} alt="" style={styles.bubbleImg} aria-hidden="true" />
            </div>
            <div style={{ ...styles.labelPill, bottom: '80px', left: '116px' }}>
              <span style={styles.labelDot} />
              <span style={styles.labelText}>Neurosurgery</span>
            </div>
          </div>

          {/* DESCRIPTION */}
          <div style={styles.descCard}>
            <p style={styles.descText}>
              An educational initiative by <strong>ICON LIFE SCIENCES</strong> — supporting
              post-graduates in Psychiatry, Neurology &amp; Neurosurgery through focused,
              clinically relevant learning.
            </p>
          </div>

          {/* CTA */}
          <button
            type="button"
            onClick={handleDismiss}
            style={styles.ctaButton}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.04)';
              e.currentTarget.style.boxShadow =
                '0 6px 30px rgba(249,115,22,0.70), 0 0 50px rgba(249,115,22,0.30)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.boxShadow =
                '0 4px 24px rgba(249,115,22,0.55), 0 0 40px rgba(249,115,22,0.25)';
            }}
          >
            Start Learning
          </button>

          {/* FOOTER */}
          <div style={styles.footer}>
            <div style={styles.footerItem}>
              <span style={styles.footerIcon}>🎓</span>
              <span style={styles.footerLabel}>Learn</span>
            </div>
            <div style={styles.footerDivider} />
            <div style={styles.footerItem}>
              <span style={styles.footerIcon}>🌱</span>
              <span style={styles.footerLabel}>Grow</span>
            </div>
            <div style={styles.footerDivider} />
            <div style={styles.footerItem}>
              <span style={styles.footerIcon}>📊</span>
              <span style={styles.footerLabel}>Excel</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
