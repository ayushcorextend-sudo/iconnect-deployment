import { useState, useEffect } from 'react';
import { Z } from '../styles/zIndex';

function Spinner() {
  return (
    <span style={{
      display: 'inline-block', width: 14, height: 14,
      border: '2px solid rgba(255,255,255,0.4)',
      borderTop: '2px solid #fff',
      borderRadius: '50%',
      animation: 'spin 0.7s linear infinite',
      verticalAlign: 'middle', marginRight: 6,
    }} />
  );
}

export default function AdminLoginModal({ email, label, onClose, onLogin }) {
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const handleSubmit = async () => {
    if (!password) { setError('Please enter the password'); return; }
    setLoading(true);
    setError('');
    try {
      await onLogin(email, password);
    } catch (err) {
      setError(err.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* Full-viewport overlay */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: Z.chatOverlay,
          background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 16,
        }}
      >
        <div
          onClick={e => e.stopPropagation()}
          style={{
            background: '#fff', borderRadius: 20, padding: '36px 32px',
            width: '100%', maxWidth: 400,
            boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
          }}
        >
          {/* Amber lock icon */}
          <div style={{ textAlign: 'center', marginBottom: 20 }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: 64, height: 64, borderRadius: '50%',
              background: 'linear-gradient(135deg,#F59E0B,#D97706)',
              fontSize: 28, boxShadow: '0 4px 16px rgba(245,158,11,0.4)',
            }}>
              🔒
            </div>
            <div style={{ marginTop: 14, fontWeight: 700, fontSize: 18, color: '#111827' }}>
              {label}
            </div>
            <div style={{ marginTop: 4, fontSize: 13, color: '#6B7280' }}>
              {email}
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPw ? 'text' : 'password'}
                autoComplete="current-password"
                autoFocus
                value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                disabled={loading}
                placeholder="Enter admin password"
                style={{
                  width: '100%', boxSizing: 'border-box',
                  border: error ? '1px solid #FECACA' : '1px solid #D1D5DB',
                  borderRadius: 10, padding: '10px 38px 10px 14px',
                  fontSize: 14, outline: 'none', color: '#111827',
                  background: loading ? '#F9FAFB' : '#fff',
                }}
              />
              <span
                onClick={() => setShowPw(s => !s)}
                style={{
                  position: 'absolute', right: 12, top: '50%',
                  transform: 'translateY(-50%)',
                  cursor: 'pointer', color: '#6B7280', fontSize: 14, userSelect: 'none',
                }}
              >
                {showPw ? '🙈' : '👁️'}
              </span>
            </div>
          </div>

          {error && (
            <div style={{
              background: '#FEF2F2', border: '1px solid #FECACA',
              borderRadius: 8, padding: '10px 14px',
              fontSize: 13, color: '#DC2626', marginBottom: 14,
            }}>
              ⚠️ {error}
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={loading}
            style={{
              width: '100%', padding: '12px 0', borderRadius: 12, border: 'none',
              background: loading ? '#9CA3AF' : 'linear-gradient(135deg,#F59E0B,#D97706)',
              color: '#fff', fontWeight: 700, fontSize: 15,
              cursor: loading ? 'default' : 'pointer',
              boxShadow: '0 4px 14px rgba(245,158,11,0.35)',
              transition: 'opacity .15s',
            }}
          >
            {loading && <Spinner />}
            {loading ? 'Signing in…' : 'Sign In'}
          </button>

          <button
            onClick={onClose}
            style={{
              display: 'block', width: '100%', marginTop: 12,
              background: 'none', border: 'none',
              color: '#6B7280', fontSize: 13, cursor: 'pointer', padding: 8,
            }}
          >
            ← Back
          </button>
        </div>
      </div>
    </>
  );
}
