import { useState, useEffect, useRef } from 'react';
import { authSignIn, authSignInWithGoogle, authSendOtp, authVerifyOtp, supabase } from '../lib/supabase';
import { Z } from '../styles/zIndex';
import { useTenantStore } from '../stores/useTenantStore';

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

const GOOGLE_ICON = (
  <svg width="18" height="18" viewBox="0 0 48 48">
    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.36-8.16 2.36-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
    <path fill="none" d="M0 0h48v48H0z"/>
  </svg>
);

// Mode config
const MODE = {
  doctor:       { heading: 'Doctor Login',          sub: 'Enter your MCI/NMC credentials',       color: '#4F46E5', bg: '#EEF2FF', border: '#C7D2FE', icon: '🩺' },
  superadmin:   { heading: 'Super Admin Portal',     sub: 'Super Admin credentials required',      color: '#D97706', bg: '#FFFBEB', border: '#FDE68A', icon: '🛡️' },
  contentadmin: { heading: 'Content Admin Portal',   sub: 'Content Admin credentials required',    color: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE', icon: '📚' },
};

export default function Login({ onLogin, onRegister, pendingMessage, onDismissPendingMessage, addToast }) {
  const tenant = useTenantStore(s => s.tenant);

  // Auth mode: 'doctor' | 'superadmin' | 'contentadmin'
  const [authMode, setAuthMode] = useState('doctor');

  const [tab, setTab] = useState('password');

  // Password tab
  const [mci, setMci] = useState('');
  const [pw, setPw] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(null);

  // Forgot password
  const [forgotPw, setForgotPw] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetSent, setResetSent] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState('');

  // OTP tab
  const [otpEmail, setOtpEmail] = useState('');
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [otpSent, setOtpSent] = useState(false);
  const [otpTimer, setOtpTimer] = useState(0);
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState('');
  const otpRefs = [useRef(), useRef(), useRef(), useRef(), useRef(), useRef()];

  // BUG-T: localStorage-based OTP rate limiting removed — it was client-side only
  // and trivially bypassed via DevTools. Real rate limiting is enforced server-side
  // by Supabase Auth config (RATE_LIMIT_EMAIL_SENT) and/or Cloudflare WAF.
  // See: src/docs/OTP_RATE_LIMIT_SPEC.md
  // The 60-second resend cooldown below (otpTimer) is UX convenience only, not security.

  useEffect(() => {
    if (otpTimer > 0) {
      const t = setTimeout(() => setOtpTimer(s => s - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [otpTimer]);

  // Switch mode — clear errors + reset form state
  const switchMode = (mode) => {
    setAuthMode(mode);
    setError('');
    setForgotPw(false);
    setMci('');
    setPw('');
    // Admin modes don't support Google/OTP — force password tab
    if (mode !== 'doctor') setTab('password');
  };

  const handleGoogleLogin = async () => {
    setLoading('google');
    setError('');
    try {
      await authSignInWithGoogle();
    } catch (err) {
      setError(err.message || 'Google sign-in failed. Please try again.');
      setLoading(null);
    }
  };

  // ── SECURE LOGIN HANDLER ────────────────────────────────────────────────────
  const handleLogin = async (emailOverride, passwordOverride, key = 'main') => {
    let email = emailOverride || mci.trim();
    let pass  = passwordOverride || pw;
    if (!email) { setError('Please enter your email or MCI number'); return; }
    if (!pass)  { setError('Please enter your password'); return; }

    setLoading(key);
    setError('');

    try {
      // ── Phase A + B: Authenticate + fetch role (via authSignIn) ────────────
      const result = await authSignIn(email, pass);

      // ── Phase C: SECURITY GATE ─────────────────────────────────────────────
      if (authMode === 'superadmin' && result.role !== 'superadmin') {
        await supabase.auth.signOut();
        const msg = 'Access Denied: You are not authorized as a Super Admin.';
        setError(msg);
        if (addToast) addToast('error', msg);
        return;
      }

      if (authMode === 'contentadmin' && result.role !== 'contentadmin') {
        await supabase.auth.signOut();
        const msg = 'Access Denied: You do not have Content Admin permissions.';
        setError(msg);
        if (addToast) addToast('error', msg);
        return;
      }

      // ── Phase D: Smart routing — pass authMode so App.jsx can set initial page
      onLogin({ ...result, authMode });

    } catch (err) {
      setError(err.message || 'Login failed. Please try again.');
    } finally {
      setLoading(null);
    }
  };

  const handleSendReset = async () => {
    if (!resetEmail.trim()) { setResetError('Please enter your email address'); return; }
    setResetLoading(true);
    setResetError('');
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail.trim(), {
        redirectTo: window.location.origin,
      });
      if (error) throw error;
      setResetSent(true);
    } catch (err) {
      setResetError(err.message || 'Failed to send reset email. Please try again.');
    } finally {
      setResetLoading(false);
    }
  };

  const handleSendOtp = async () => {
    if (!otpEmail.trim()) { setOtpError('Please enter your email address'); return; }
    setOtpLoading(true);
    setOtpError('');
    try {
      await authSendOtp(otpEmail.trim());
      setOtpSent(true);
      setOtpTimer(60); // UX cooldown only — prevents accidental double-sends
      setOtpDigits(['', '', '', '', '', '']);
    } catch (err) {
      setOtpError(err.message || 'Failed to send OTP. Please try again.');
    } finally {
      setOtpLoading(false);
    }
  };

  const handleOtpDigitChange = async (idx, val) => {
    const digit = val.replace(/\D/g, '').slice(-1);
    const next = [...otpDigits];
    next[idx] = digit;
    setOtpDigits(next);
    if (digit && idx < 5) otpRefs[idx + 1].current?.focus();
    if (next.every(d => d !== '')) {
      const code = next.join('');
      setOtpLoading(true);
      setOtpError('');
      try {
        const result = await authVerifyOtp(otpEmail.trim(), code);
        onLogin(result);
      } catch (err) {
        setOtpError(err.message || 'Invalid or expired code. Please try again.');
        setOtpDigits(['', '', '', '', '', '']);
        otpRefs[0].current?.focus();
      } finally {
        setOtpLoading(false);
      }
    }
  };

  const handleOtpKeyDown = (idx, e) => {
    if (e.key === 'Backspace' && !otpDigits[idx] && idx > 0) {
      otpRefs[idx - 1].current?.focus();
    }
  };

  const tabStyle = (t) => ({
    flex: 1, padding: '8px 0', borderRadius: 8, border: 'none', cursor: 'pointer',
    fontWeight: 500, fontSize: 13,
    background: tab === t ? (authMode === 'doctor' ? '#4F46E5' : MODE[authMode].color) : '#F3F4F6',
    color: tab === t ? '#fff' : '#6B7280',
    transition: 'all 0.15s',
  });

  const m = MODE[authMode];

  return (
    <>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* Pending/rejected message banner */}
      {pendingMessage && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: Z.loginBanner,
          background: '#FEF3C7', color: '#92400E',
          textAlign: 'center', padding: '12px 20px',
          fontSize: 13, fontWeight: 500,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
        }}>
          ⚠️ {pendingMessage}
          <button
            onClick={onDismissPendingMessage}
            style={{ background: 'none', border: 'none', color: '#92400E', cursor: 'pointer', fontWeight: 700, fontSize: 16, lineHeight: 1 }}
          >
            ✕
          </button>
        </div>
      )}

      <div className="login-bg" style={{ paddingTop: pendingMessage ? 48 : 0 }}>
        <div className="login-logo-wrap">
          {tenant?.logo_url ? (
            <img src={tenant.logo_url} alt={tenant.name} style={{ width: 56, height: 56, borderRadius: 14, objectFit: 'cover', marginBottom: 8 }} />
          ) : (
            <div className="logo-icon">🏥</div>
          )}
          <div className="logo-text">{tenant?.name || 'iConnect'}</div>
          <div className="logo-sub">
            {tenant?.name && tenant.name !== 'iConnect'
              ? `Powered by iConnect · Medical Education Platform`
              : 'Icon Lifescience Medical Education Platform'}
          </div>
        </div>

        <div className="login-card">

          {/* ── Dynamic heading ── */}
          <h2 style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
            <span>{m.icon}</span>
            <span>{m.heading}</span>
          </h2>
          <p style={{ textAlign: 'center', marginBottom: authMode !== 'doctor' ? 0 : undefined }}>{m.sub}</p>

          {/* ── Admin mode indicator banner ── */}
          {authMode !== 'doctor' && (
            <div style={{
              margin: '10px 0 16px',
              padding: '10px 14px',
              background: m.bg,
              border: `1px solid ${m.border}`,
              borderRadius: 10,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 16 }}>{m.icon}</span>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: m.color }}>
                    {authMode === 'superadmin' ? 'Super Admin Access' : 'Content Admin Access'}
                  </div>
                  <div style={{ fontSize: 11, color: '#6B7280', marginTop: 1 }}>
                    Role verification is enforced on login
                  </div>
                </div>
              </div>
              <button
                onClick={() => switchMode('doctor')}
                style={{
                  background: 'none', border: `1px solid ${m.border}`,
                  borderRadius: 6, padding: '3px 8px', fontSize: 11,
                  color: m.color, cursor: 'pointer', whiteSpace: 'nowrap', fontWeight: 600,
                }}
              >
                ← Back
              </button>
            </div>
          )}

          {/* ── Tab bar (doctor only — admins always use password) ── */}
          {authMode === 'doctor' && (
            <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
              <button style={tabStyle('password')} onClick={() => { setTab('password'); setError(''); setForgotPw(false); }}>Password</button>
              <button style={tabStyle('google')} onClick={() => { setTab('google'); setError(''); setForgotPw(false); }}>Google</button>
            </div>
          )}

          {/* ── PASSWORD TAB (or admin form — always password) ── */}
          {(tab === 'password' || authMode !== 'doctor') && !forgotPw && (
            <>
              <div className="login-field">
                <label>
                  {authMode === 'doctor'
                    ? <>MCI / NMC Number <span style={{ fontWeight: 400, color: '#9CA3AF' }}>(or email)</span></>
                    : 'Email Address'}
                </label>
                <input
                  className="login-input"
                  type="email"
                  autoComplete="email"
                  placeholder={authMode === 'doctor' ? 'MCI-2024-78432 or your@email.com' : 'admin@example.com'}
                  value={mci}
                  onChange={e => setMci(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleLogin()}
                  disabled={loading === 'main'}
                />
              </div>

              <div className="login-field">
                <label>Password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    className="login-input"
                    type={showPw ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="Enter password"
                    value={pw}
                    onChange={e => setPw(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleLogin()}
                    disabled={loading === 'main'}
                    style={{ paddingRight: 38 }}
                  />
                  <span
                    style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', color: '#6B7280', fontSize: 14 }}
                    onClick={() => setShowPw(s => !s)}
                  >
                    {showPw ? '🙈' : '👁️'}
                  </span>
                </div>
                {authMode === 'doctor' && (
                  <div style={{ textAlign: 'right', marginTop: 4 }}>
                    <span
                      onClick={() => { setForgotPw(true); setResetEmail(mci.includes('@') ? mci : ''); setResetSent(false); setResetError(''); }}
                      style={{ fontSize: 12, color: '#2563EB', cursor: 'pointer', fontWeight: 500 }}
                    >
                      Forgot password?
                    </span>
                  </div>
                )}
              </div>

              {error && (
                <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#DC2626', marginBottom: 10 }}>
                  ⚠️ {error}
                </div>
              )}

              <button
                className="login-btn"
                onClick={() => handleLogin()}
                disabled={loading === 'main'}
                style={authMode !== 'doctor' ? { background: `linear-gradient(135deg, ${m.color}, ${m.color}cc)` } : {}}
              >
                {loading === 'main' && <Spinner />}
                {loading === 'main'
                  ? 'Verifying…'
                  : authMode === 'superadmin' ? '🛡️ Sign in as Super Admin'
                  : authMode === 'contentadmin' ? '📚 Sign in as Content Admin'
                  : 'Login'}
              </button>

              {authMode === 'doctor' && (
                <p style={{ textAlign: 'center', fontSize: 13, color: '#6B7280', marginTop: 12 }}>
                  New User?{' '}
                  <span style={{ color: '#2563EB', cursor: 'pointer', fontWeight: 500 }} onClick={onRegister}>Register here</span>
                </p>
              )}
            </>
          )}

          {/* ── FORGOT PASSWORD VIEW ── */}
          {tab === 'password' && forgotPw && (
            <>
              {!resetSent ? (
                <>
                  <div style={{ marginBottom: 16, fontSize: 14, color: '#374151', fontWeight: 500 }}>
                    Reset your password
                  </div>
                  <div className="login-field">
                    <label>Email Address</label>
                    <input
                      className="login-input"
                      type="email"
                      placeholder="your@email.com"
                      value={resetEmail}
                      onChange={e => setResetEmail(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleSendReset()}
                      autoFocus
                    />
                  </div>
                  {resetError && (
                    <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#DC2626', marginBottom: 10 }}>
                      ⚠️ {resetError}
                    </div>
                  )}
                  <button className="login-btn" onClick={handleSendReset} disabled={resetLoading}>
                    {resetLoading && <Spinner />}
                    {resetLoading ? 'Sending…' : 'Send Reset Link'}
                  </button>
                  <p style={{ textAlign: 'center', marginTop: 12 }}>
                    <span
                      onClick={() => setForgotPw(false)}
                      style={{ fontSize: 13, color: '#2563EB', cursor: 'pointer', fontWeight: 500 }}
                    >
                      ← Back to Login
                    </span>
                  </p>
                </>
              ) : (
                <>
                  <div style={{ textAlign: 'center', padding: '20px 0' }}>
                    <div style={{ fontSize: 48, marginBottom: 12 }}>📬</div>
                    <div style={{ fontWeight: 700, color: '#111827', fontSize: 15, marginBottom: 8 }}>Reset link sent!</div>
                    <div style={{ fontSize: 13, color: '#6B7280', marginBottom: 20, lineHeight: 1.6 }}>
                      Check your inbox at <strong>{resetEmail}</strong> for the password reset link.
                    </div>
                    <span
                      onClick={() => { setForgotPw(false); setResetSent(false); }}
                      style={{ fontSize: 13, color: '#2563EB', cursor: 'pointer', fontWeight: 500 }}
                    >
                      ← Back to Login
                    </span>
                  </div>
                </>
              )}
            </>
          )}

          {/* ── GOOGLE TAB ── */}
          {tab === 'google' && authMode === 'doctor' && (
            <>
              <button
                onClick={handleGoogleLogin}
                disabled={loading === 'google'}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  gap: 10, padding: '12px 16px', borderRadius: 10, border: '1px solid #E5E7EB',
                  background: '#fff', cursor: 'pointer', fontSize: 14, fontWeight: 500, color: '#374151',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.06)', marginBottom: 8,
                }}
              >
                {loading === 'google' ? <Spinner /> : GOOGLE_ICON}
                {loading === 'google' ? 'Redirecting…' : 'Continue with Google'}
              </button>
              <p style={{ textAlign: 'center', fontSize: 12, color: '#9CA3AF', marginTop: 4, marginBottom: 12 }}>
                You'll complete your profile after signing in
              </p>
              {error && (
                <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#DC2626', marginBottom: 10 }}>
                  ⚠️ {error}
                </div>
              )}
            </>
          )}

          {/* ── ADMIN ACCESS SECTION ── */}
          {authMode === 'doctor' && !forgotPw && (
            <>
              {/* Divider */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '20px 0 16px' }}>
                <div style={{ flex: 1, height: 1, background: '#E5E7EB' }} />
                <span style={{ fontSize: 11, fontWeight: 600, color: '#9CA3AF', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                  Admin Access
                </span>
                <div style={{ flex: 1, height: 1, background: '#E5E7EB' }} />
              </div>

              {/* Admin buttons */}
              <div style={{ display: 'flex', gap: 10 }}>
                {/* Super Admin button */}
                <button
                  onClick={() => switchMode('superadmin')}
                  style={{
                    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                    padding: '11px 14px', borderRadius: 10, border: '1px solid #FDE68A',
                    background: 'linear-gradient(135deg, #FFFBEB, #FEF3C7)',
                    cursor: 'pointer', fontSize: 13, fontWeight: 700, color: '#92400E',
                    transition: 'all 0.15s', boxShadow: '0 1px 4px rgba(217,119,6,0.15)',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'linear-gradient(135deg,#FDE68A,#FCD34D)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'linear-gradient(135deg, #FFFBEB, #FEF3C7)'; e.currentTarget.style.transform = 'translateY(0)'; }}
                >
                  🛡️ Super Admin
                </button>

                {/* Content Admin button */}
                <button
                  onClick={() => switchMode('contentadmin')}
                  style={{
                    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                    padding: '11px 14px', borderRadius: 10, border: '1px solid #BFDBFE',
                    background: 'linear-gradient(135deg, #EFF6FF, #DBEAFE)',
                    cursor: 'pointer', fontSize: 13, fontWeight: 700, color: '#1E40AF',
                    transition: 'all 0.15s', boxShadow: '0 1px 4px rgba(37,99,235,0.12)',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'linear-gradient(135deg,#BFDBFE,#93C5FD)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'linear-gradient(135deg, #EFF6FF, #DBEAFE)'; e.currentTarget.style.transform = 'translateY(0)'; }}
                >
                  📚 Content Admin
                </button>
              </div>
            </>
          )}

        </div>
      </div>
    </>
  );
}
