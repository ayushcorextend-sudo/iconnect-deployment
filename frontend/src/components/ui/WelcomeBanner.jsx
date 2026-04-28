/**
 * WelcomeBanner.jsx
 *
 * First-login welcome modal for iCONNECT.
 * Brain image + full mission text + Start Learning CTA.
 *
 * Gating: localStorage key `iconnect_welcome_seen_v2`.
 * Mounted from App.jsx alongside PWAInstallBanner.
 */
import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { Z } from '../../styles/zIndex';

import brainImg from '../../assets/welcome/brain.png';

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
@keyframes wb-glow { 0%, 100% { filter: drop-shadow(0 0 20px rgba(0,180,255,0.5)); } 50% { filter: drop-shadow(0 0 36px rgba(0,200,255,0.8)); } }
.wb-overlay { animation: wb-overlay-in 0.4s ease both; }
.wb-card    { animation: wb-card-in 0.55s cubic-bezier(0.16, 1, 0.3, 1) both; }
.wb-brain   { animation: wb-glow 4s ease-in-out infinite; }
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
          background: 'rgba(2, 6, 23, 0.82)',
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
            maxWidth: '420px',
            maxHeight: '90vh',
            overflowY: 'auto',
            background: 'linear-gradient(165deg, #0b0f2a 0%, #0d1540 40%, #0b1a3a 70%, #060c1f 100%)',
            borderRadius: '24px',
            border: '1px solid rgba(100, 160, 255, 0.15)',
            boxShadow: '0 30px 80px rgba(0, 20, 80, 0.55)',
            color: '#fff',
            fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: '32px 28px 28px',
          }}
        >
          {/* Close button */}
          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Close welcome"
            style={{
              position: 'absolute',
              top: '14px',
              right: '14px',
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: 'rgba(0, 0, 0, 0.35)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              zIndex: 10,
              transition: 'background 0.15s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(0, 0, 0, 0.6)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(0, 0, 0, 0.35)'; }}
          >
            <X size={14} />
          </button>

          {/* Logo */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '2px',
          }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #1a3a8f 0%, #1565c0 50%, #0d47a1 100%)',
              border: '2px solid rgba(100,160,255,0.45)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 16px rgba(30,100,255,0.45)',
            }}>
              <span style={{ fontSize: '10px', fontWeight: 900, color: '#fff', lineHeight: 1.1 }}>ICON</span>
              <span style={{ fontSize: '6px', color: 'rgba(200,220,255,0.9)', letterSpacing: '0.5px' }}>LIFE</span>
            </div>
            <span style={{
              fontSize: '9.5px',
              fontWeight: 700,
              color: 'rgba(200,220,255,0.8)',
              letterSpacing: '2.5px',
              marginTop: '6px',
              textTransform: 'uppercase',
            }}>
              ICON LIFE SCIENCES
            </span>
          </div>

          {/* Welcome to iCONNECT */}
          <span style={{
            fontSize: '22px',
            fontWeight: 300,
            color: '#c8d8f8',
            letterSpacing: '1px',
            marginTop: '16px',
          }}>
            Welcome to
          </span>
          <span style={{
            fontSize: '48px',
            fontWeight: 900,
            background: 'linear-gradient(90deg, #f59e0b 0%, #fb923c 40%, #f97316 70%, #ea580c 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            letterSpacing: '2px',
            lineHeight: 1.05,
            marginTop: '0px',
            filter: 'drop-shadow(0 0 10px rgba(251,146,60,0.5))',
          }}>
            iCONNECT
          </span>

          {/* Brain image */}
          <div style={{
            width: '220px',
            height: '180px',
            marginTop: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'radial-gradient(ellipse at center, rgba(0,140,255,0.12) 0%, transparent 70%)',
            borderRadius: '50%',
          }}>
            <img
              className="wb-brain"
              src={brainImg}
              alt="Neural network brain"
              style={{
                width: '200px',
                height: 'auto',
                objectFit: 'contain',
                mixBlendMode: 'lighten',
              }}
            />
          </div>

          {/* Mission text */}
          <div style={{
            marginTop: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
            maxWidth: '360px',
          }}>
            <p style={{
              fontSize: '13.5px',
              lineHeight: 1.7,
              color: 'rgba(220,230,255,0.9)',
              margin: 0,
              textAlign: 'center',
            }}>
              An educational initiative by <strong style={{ color: '#f59e0b' }}>ICON LIFE SCIENCES</strong>, created to support post-graduates in Psychiatry, Neurology, and Neurosurgery through focused, clinically relevant learning.
            </p>

            <p style={{
              fontSize: '13px',
              lineHeight: 1.7,
              color: 'rgba(200,215,245,0.8)',
              margin: 0,
              textAlign: 'center',
            }}>
              This platform is built to complement your residency — helping you revise core concepts, strengthen clinical reasoning, and stay aligned with evolving medical practice.
            </p>

            <p style={{
              fontSize: '13px',
              lineHeight: 1.7,
              color: 'rgba(200,215,245,0.8)',
              margin: 0,
              textAlign: 'center',
            }}>
              An <strong style={{ color: '#f59e0b' }}>ICON LIFE SCIENCES</strong> initiative bringing you timely alerts on national and international conferences, webinars, CMEs, and key academic updates — all in one place.
            </p>

            <p style={{
              fontSize: '14px',
              lineHeight: 1.7,
              color: 'rgba(220,230,255,0.95)',
              margin: 0,
              textAlign: 'center',
              fontStyle: 'italic',
              marginTop: '4px',
            }}>
              We're honored to be part of your professional journey.
            </p>
          </div>

          {/* Start Learning CTA */}
          <button
            type="button"
            onClick={handleDismiss}
            style={{
              marginTop: '24px',
              padding: '14px 64px',
              background: 'linear-gradient(90deg, #f59e0b 0%, #fb923c 50%, #f97316 100%)',
              border: 'none',
              borderRadius: '50px',
              color: '#fff',
              fontSize: '16px',
              fontWeight: 700,
              letterSpacing: '0.5px',
              cursor: 'pointer',
              boxShadow: '0 4px 24px rgba(249,115,22,0.5), 0 0 40px rgba(249,115,22,0.2)',
              transition: 'transform 0.15s, box-shadow 0.15s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.04)';
              e.currentTarget.style.boxShadow = '0 6px 30px rgba(249,115,22,0.65), 0 0 50px rgba(249,115,22,0.3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.boxShadow = '0 4px 24px rgba(249,115,22,0.5), 0 0 40px rgba(249,115,22,0.2)';
            }}
          >
            Start Learning
          </button>

          {/* Footer */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 0,
            marginTop: '22px',
            width: '100%',
            maxWidth: '280px',
          }}>
            {[
              { icon: '🎓', label: 'Learn' },
              { icon: '🌱', label: 'Grow' },
              { icon: '📊', label: 'Excel' },
            ].map((item, i) => (
              <div key={item.label} style={{ display: 'contents' }}>
                {i > 0 && (
                  <div style={{
                    width: '1px',
                    height: '32px',
                    background: 'rgba(100,160,255,0.2)',
                    flexShrink: 0,
                  }} />
                )}
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '4px',
                  flex: 1,
                }}>
                  <span style={{ fontSize: '20px', lineHeight: 1 }}>{item.icon}</span>
                  <span style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    color: 'rgba(200,220,255,0.75)',
                    letterSpacing: '0.5px',
                  }}>{item.label}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
