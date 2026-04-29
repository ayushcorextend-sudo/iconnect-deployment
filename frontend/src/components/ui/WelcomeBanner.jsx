/**
 * WelcomeBanner.jsx
 *
 * First-login immersive welcome for iCONNECT.
 * Single-image canvas with invisible interactive hotspots laid over each
 * specialty pill, learning icon, and the Start Learning CTA. Adds
 * cursor-driven 3D parallax tilt, a reactive light nimbus, sparkle
 * particles and one-time pulse cues so users discover the hotspots.
 *
 * Gating: localStorage key `iconnect_welcome_seen_v3`.
 * Mounted from App.jsx alongside PWAInstallBanner.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { Z } from '../../styles/zIndex';

import bannerImg from '../../assets/welcome/iconnect-welcome-v3.webp';

const SEEN_KEY = 'iconnect_welcome_seen_v3';

function hasSeenWelcome() {
  try { return !!localStorage.getItem(SEEN_KEY); } catch { return false; }
}

function markSeen() {
  try { localStorage.setItem(SEEN_KEY, '1'); } catch { /* noop */ }
}

// All coords are % of the card (banner image is 1628x2624, aspect 0.62).
// Tuned visually against the source render.
const HOTSPOTS = [
  { id: 'stethoscope', label: 'Clinical Library',  page: 'ebooks',    glow: '#7dd3fc', shape: 'circle', top: 28.0, left: 14.5, w: 14, h: 7.5,  pulse: 0.0 },
  { id: 'psychiatry',  label: 'Psychiatry track',  page: 'learn',     glow: '#fb923c', shape: 'pill',   top: 22.5, left: 58.0, w: 28, h: 4.0,  pulse: 0.4 },
  { id: 'book',        label: 'E-Library',         page: 'ebooks',    glow: '#93c5fd', shape: 'circle', top: 27.5, left: 78.0, w: 14, h: 7.5,  pulse: 0.6 },
  { id: 'neurology',   label: 'Neurology track',   page: 'learn',     glow: '#fb923c', shape: 'pill',   top: 37.5, left: 73.5, w: 24, h: 4.0,  pulse: 0.8 },
  { id: 'tablet',      label: 'Live Arena',        page: 'arena-student', glow: '#a5b4fc', shape: 'rect',  top: 44.0, left: 11.0, w: 18, h: 12.0, pulse: 1.0 },
  { id: 'neurosurg',   label: 'Neurosurgery track', page: 'learn',    glow: '#fb923c', shape: 'pill',   top: 52.0, left: 30.0, w: 27, h: 4.0,  pulse: 1.2 },
  { id: 'microscope',  label: 'Practice MCQs',     page: 'exam',      glow: '#86efac', shape: 'circle', top: 51.5, left: 78.0, w: 14, h: 7.5,  pulse: 1.4 },
  { id: 'cta',         label: 'Begin your journey', page: '__dismiss__', glow: '#f97316', shape: 'pill', top: 81.5, left: 22.0, w: 56, h: 4.5, pulse: 1.6, primary: true },
  { id: 'learn',       label: 'Learn',             page: 'learn',     glow: '#c7d2fe', shape: 'rect',   top: 90.5, left: 22.0, w: 14, h: 7.0,  pulse: 1.8 },
  { id: 'grow',        label: 'Grow',              page: 'activity',  glow: '#c7d2fe', shape: 'rect',   top: 90.5, left: 43.0, w: 14, h: 7.0,  pulse: 2.0 },
  { id: 'excel',       label: 'Excel',             page: 'leaderboard', glow: '#c7d2fe', shape: 'rect', top: 90.5, left: 64.0, w: 14, h: 7.0,  pulse: 2.2 },
];

const ANIM_CSS = `
@keyframes wb-overlay-in { from { opacity: 0; } to { opacity: 1; } }
@keyframes wb-card-in    { from { opacity: 0; transform: translateY(24px) scale(0.94); } to { opacity: 1; transform: translateY(0) scale(1); } }
@keyframes wb-pulse      { 0% { transform: scale(0.9); opacity: 0; } 35% { opacity: 0.85; } 100% { transform: scale(2.4); opacity: 0; } }
@keyframes wb-glow-idle  { 0%,100% { opacity: 0.0; } 50% { opacity: 0.45; } }
@keyframes wb-shimmer    { 0% { transform: translateY(-110%) skewY(-12deg); opacity: 0; } 18% { opacity: 0.7; } 70% { transform: translateY(160%) skewY(-12deg); opacity: 0; } 100% { opacity: 0; } }
@keyframes wb-spark      { 0%,100% { transform: translateY(0) scale(0.6); opacity: 0; } 35% { opacity: 1; } 70% { transform: translateY(-22px) scale(1.05); opacity: 0.8; } }
@keyframes wb-tooltip-in { from { opacity: 0; transform: translate(-50%, 4px); } to { opacity: 1; transform: translate(-50%, 0); } }

.wb-overlay { animation: wb-overlay-in 0.45s ease both; }
.wb-card    { animation: wb-card-in 0.65s cubic-bezier(0.16, 1, 0.3, 1) both; will-change: transform; }
.wb-shimmer { animation: wb-shimmer 1.4s ease-out 0.5s both; }
.wb-spark   { animation: wb-spark 4.4s ease-in-out infinite; }
.wb-pulse-ring { animation: wb-pulse 1.4s ease-out 1 both; }
.wb-tooltip { animation: wb-tooltip-in 0.18s ease-out both; }
.wb-hot { transition: transform 0.25s cubic-bezier(0.2, 0.8, 0.2, 1), filter 0.25s; }
.wb-hot:hover { transform: scale(1.07); filter: brightness(1.15); }
.wb-hot:active { transform: scale(0.96); }
.wb-hot:focus-visible { outline: 2px solid #fde68a; outline-offset: 4px; }

@media (prefers-reduced-motion: reduce) {
  .wb-card, .wb-overlay, .wb-shimmer, .wb-spark, .wb-pulse-ring { animation: none !important; }
  .wb-hot { transition: none !important; }
}
`;

const SPARKS = [
  { left: 12, top: 18, delay: 0.0,  size: 3 },
  { left: 88, top: 22, delay: 0.6,  size: 4 },
  { left: 22, top: 35, delay: 1.2,  size: 2 },
  { left: 72, top: 47, delay: 1.8,  size: 3 },
  { left: 40, top: 60, delay: 2.4,  size: 4 },
  { left: 60, top: 70, delay: 3.0,  size: 2 },
  { left: 10, top: 78, delay: 3.6,  size: 3 },
  { left: 92, top: 85, delay: 4.2,  size: 4 },
  { left: 50, top: 12, delay: 0.9,  size: 2 },
  { left: 80, top: 62, delay: 1.5,  size: 3 },
  { left: 18, top: 55, delay: 2.1,  size: 2 },
  { left: 65, top: 30, delay: 2.7,  size: 3 },
];

function buildClipPath(shape) {
  if (shape === 'circle') return 'circle(50% at 50% 50%)';
  if (shape === 'pill')   return 'inset(0 round 9999px)';
  return 'inset(0 round 14px)';
}

export default function WelcomeBanner({ onNavigate }) {
  const [open, setOpen] = useState(() => !hasSeenWelcome());
  const [hoveredId, setHoveredId] = useState(null);
  const [tilt, setTilt] = useState({ rx: 0, ry: 0 });
  const [nimbus, setNimbus] = useState({ x: 50, y: 40, on: false });
  const cardRef = useRef(null);
  const reduceMotion = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  }, []);

  // Lock body scroll while open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  // Escape closes
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') handleDismiss(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleDismiss = (targetPage) => {
    markSeen();
    setOpen(false);
    if (targetPage && targetPage !== '__dismiss__') {
      onNavigate?.(targetPage);
    }
  };

  const handleHotspotClick = (hot) => {
    if (hot.page === '__dismiss__') return handleDismiss();
    handleDismiss(hot.page);
  };

  const handleMouseMove = (e) => {
    if (reduceMotion) return;
    const el = cardRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;   // 0..1
    const y = (e.clientY - rect.top)  / rect.height;  // 0..1
    // Soft parallax: ±6deg X, ±5deg Y, dampened toward edges
    const ry = (x - 0.5) * 6;   // left/right tilt around Y
    const rx = (0.5 - y) * 5;   // up/down tilt around X
    setTilt({ rx, ry });
    setNimbus({ x: x * 100, y: y * 100, on: true });
  };

  const handleMouseLeave = () => {
    setTilt({ rx: 0, ry: 0 });
    setNimbus((n) => ({ ...n, on: false }));
    setHoveredId(null);
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
          background: 'radial-gradient(ellipse at 50% 30%, rgba(20, 30, 80, 0.85) 0%, rgba(2, 6, 23, 0.94) 70%)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '12px',
          overflowY: 'auto',
          zIndex: Z.loginBanner,
          perspective: '1600px',
        }}
        role="dialog"
        aria-modal="true"
        aria-label="Welcome to iCONNECT"
        onClick={(e) => { if (e.target === e.currentTarget) handleDismiss(); }}
      >
        <div
          ref={cardRef}
          className="wb-card"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          style={{
            position: 'relative',
            width: 'min(92vw, calc(92vh * 0.62))',
            aspectRatio: '1628 / 2624',
            maxHeight: '94vh',
            borderRadius: '28px',
            overflow: 'hidden',
            boxShadow: '0 40px 110px rgba(0, 20, 80, 0.6), 0 0 80px rgba(60, 120, 255, 0.18)',
            transform: `rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg)`,
            transformStyle: 'preserve-3d',
            transition: 'transform 0.18s ease-out',
            isolation: 'isolate',
          }}
        >
          {/* Banner image */}
          <img
            src={bannerImg}
            alt="Welcome to iCONNECT — an ICON LIFE SCIENCES initiative"
            draggable={false}
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              userSelect: 'none',
              WebkitUserSelect: 'none',
              pointerEvents: 'none',
            }}
          />

          {/* Cursor-following nimbus (subtle reactive light) */}
          <div
            aria-hidden
            style={{
              position: 'absolute',
              inset: 0,
              pointerEvents: 'none',
              background: nimbus.on
                ? `radial-gradient(420px circle at ${nimbus.x}% ${nimbus.y}%, rgba(255, 240, 200, 0.18), transparent 55%)`
                : 'transparent',
              mixBlendMode: 'screen',
              transition: 'background 0.12s linear',
              transform: 'translateZ(20px)',
            }}
          />

          {/* Sparkle particle layer */}
          <div
            aria-hidden
            style={{ position: 'absolute', inset: 0, pointerEvents: 'none', transform: 'translateZ(30px)' }}
          >
            {SPARKS.map((s, i) => (
              <span
                key={i}
                className="wb-spark"
                style={{
                  position: 'absolute',
                  left: `${s.left}%`,
                  top: `${s.top}%`,
                  width: s.size,
                  height: s.size,
                  borderRadius: '50%',
                  background: 'white',
                  boxShadow: '0 0 10px 2px rgba(255, 220, 160, 0.85), 0 0 22px 4px rgba(255, 180, 100, 0.45)',
                  animationDelay: `${s.delay}s`,
                  opacity: 0,
                }}
              />
            ))}
          </div>

          {/* Holographic intro shimmer (one-shot) */}
          <div
            aria-hidden
            className="wb-shimmer"
            style={{
              position: 'absolute',
              inset: '-20% -10%',
              background: 'linear-gradient(180deg, transparent 0%, rgba(255,255,255,0.0) 35%, rgba(180,220,255,0.18) 50%, rgba(255,255,255,0.0) 65%, transparent 100%)',
              pointerEvents: 'none',
              mixBlendMode: 'screen',
              transform: 'translateZ(35px)',
            }}
          />

          {/* Invisible interactive hotspots */}
          {HOTSPOTS.map((hot) => {
            const isHover = hoveredId === hot.id;
            const clip = buildClipPath(hot.shape);
            return (
              <button
                key={hot.id}
                type="button"
                className="wb-hot"
                onClick={() => handleHotspotClick(hot)}
                onMouseEnter={() => setHoveredId(hot.id)}
                onMouseLeave={() => setHoveredId((cur) => (cur === hot.id ? null : cur))}
                onFocus={() => setHoveredId(hot.id)}
                onBlur={() => setHoveredId((cur) => (cur === hot.id ? null : cur))}
                aria-label={hot.label}
                style={{
                  position: 'absolute',
                  top: `${hot.top}%`,
                  left: `${hot.left}%`,
                  width: `${hot.w}%`,
                  height: `${hot.h}%`,
                  background: 'transparent',
                  border: 'none',
                  padding: 0,
                  cursor: 'pointer',
                  transform: 'translateZ(45px)',
                  zIndex: 5,
                }}
              >
                {/* Idle attract pulse — single ring per hotspot, staggered */}
                {!reduceMotion && (
                  <span
                    aria-hidden
                    className="wb-pulse-ring"
                    style={{
                      position: 'absolute',
                      inset: 0,
                      borderRadius: hot.shape === 'circle' ? '50%' : (hot.shape === 'pill' ? '9999px' : '14px'),
                      boxShadow: `0 0 0 2px ${hot.glow}88`,
                      animationDelay: `${1.0 + hot.pulse}s`,
                      pointerEvents: 'none',
                    }}
                  />
                )}

                {/* Hover glow fill */}
                <span
                  aria-hidden
                  style={{
                    position: 'absolute',
                    inset: 0,
                    clipPath: clip,
                    WebkitClipPath: clip,
                    background: isHover
                      ? `radial-gradient(circle at 50% 50%, ${hot.glow}55 0%, ${hot.glow}11 55%, transparent 80%)`
                      : 'transparent',
                    boxShadow: isHover ? `inset 0 0 24px ${hot.glow}66, 0 0 30px ${hot.glow}55` : 'none',
                    transition: 'box-shadow 0.2s ease, background 0.2s ease',
                    pointerEvents: 'none',
                  }}
                />

                {/* Tooltip — appears above hotspot on hover */}
                {isHover && (
                  <span
                    className="wb-tooltip"
                    aria-hidden
                    style={{
                      position: 'absolute',
                      bottom: 'calc(100% + 8px)',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      whiteSpace: 'nowrap',
                      padding: '6px 12px',
                      borderRadius: '999px',
                      background: 'rgba(8, 12, 32, 0.92)',
                      border: `1px solid ${hot.glow}66`,
                      color: '#fff',
                      fontSize: '11.5px',
                      fontWeight: 600,
                      letterSpacing: '0.4px',
                      fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
                      boxShadow: `0 6px 20px rgba(0,0,0,0.5), 0 0 18px ${hot.glow}55`,
                      pointerEvents: 'none',
                      zIndex: 6,
                    }}
                  >
                    {hot.label}
                  </span>
                )}
              </button>
            );
          })}

          {/* Close (X) button */}
          <button
            type="button"
            onClick={() => handleDismiss()}
            aria-label="Close welcome"
            style={{
              position: 'absolute',
              top: '14px',
              right: '14px',
              width: '34px',
              height: '34px',
              borderRadius: '50%',
              background: 'rgba(0, 0, 0, 0.45)',
              border: '1px solid rgba(255, 255, 255, 0.18)',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              zIndex: 10,
              transform: 'translateZ(60px)',
              transition: 'background 0.15s, transform 0.15s',
              backdropFilter: 'blur(4px)',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(0, 0, 0, 0.7)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(0, 0, 0, 0.45)'; }}
          >
            <X size={16} />
          </button>

          {/* Subtle inner border for premium feel */}
          <div
            aria-hidden
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: '28px',
              border: '1px solid rgba(180, 210, 255, 0.18)',
              pointerEvents: 'none',
              boxShadow: 'inset 0 0 80px rgba(20, 60, 160, 0.18)',
              transform: 'translateZ(50px)',
            }}
          />
        </div>
      </div>
    </>
  );
}
