import { useState } from 'react';
import { authSignIn } from '../lib/supabase';

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

export default function Login({ onLogin, onRegister }) {
  const [mci, setMci] = useState('');
  const [pw, setPw] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  // Track which button is loading: null | 'main' | 'superadmin' | 'contentadmin'
  const [loading, setLoading] = useState(null);

  const handleLogin = async (emailOverride, passwordOverride, key = 'main') => {
    const email = emailOverride || mci.trim();
    const pass = passwordOverride || pw;
    if (!email) { setError('Please enter your email or MCI number'); return; }
    if (!pass) { setError('Please enter your password'); return; }
    setLoading(key);
    setError('');
    try {
      const result = await authSignIn(email, pass);
      onLogin(result);
    } catch (err) {
      setError(err.message || 'Login failed. Please try again.');
    } finally {
      setLoading(null);
    }
  };

  return (
    <>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <div className="login-bg">
        <div className="login-logo-wrap">
          <div className="logo-icon">🛡️</div>
          <div className="logo-text">iConnect</div>
          <div className="logo-sub">Icon Lifescience Medical Education Platform</div>
        </div>

        <div className="login-card">
          <h2>Doctor Login</h2>
          <p>Enter your MCI/NMC credentials</p>

          <div className="login-field">
            <label>MCI / NMC Registration Number</label>
            <input
              className="login-input"
              placeholder="e.g. MCI-2024-78432 or your email"
              value={mci}
              onChange={e => setMci(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
            />
          </div>

          <div className="login-field">
            <label>Password</label>
            <div style={{ position: 'relative' }}>
              <input
                className="login-input"
                type={showPw ? 'text' : 'password'}
                placeholder="Enter password"
                value={pw}
                onChange={e => setPw(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
                style={{ paddingRight: 38 }}
              />
              <span
                style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', color: '#6B7280', fontSize: 14 }}
                onClick={() => setShowPw(s => !s)}
              >
                {showPw ? '🙈' : '👁️'}
              </span>
            </div>
          </div>

          {error && (
            <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#DC2626', marginBottom: 10 }}>
              ⚠️ {error}
            </div>
          )}

          <button className="login-btn" onClick={() => handleLogin()} disabled={loading === 'main'}>
            {loading === 'main' && <Spinner />}
            {loading === 'main' ? 'Signing in…' : 'Login'}
          </button>

          <p style={{ textAlign: 'center', fontSize: 13, color: '#6B7280', marginTop: 12 }}>
            New User?{' '}
            <span style={{ color: '#2563EB', cursor: 'pointer', fontWeight: 500 }} onClick={onRegister}>Register here</span>
          </p>

          <div className="login-divider">Admin Access</div>

          <button
            className="admin-btn"
            onClick={() => handleLogin('admin@iconnect.in', 'Admin@123', 'superadmin')}
            disabled={loading === 'superadmin'}
          >
            {loading === 'superadmin' && <Spinner />}
            Login as Super Admin
          </button>
          <button
            className="admin-btn"
            onClick={() => handleLogin('content@iconnect.in', 'Content@123', 'contentadmin')}
            disabled={loading === 'contentadmin'}
          >
            {loading === 'contentadmin' && <Spinner />}
            Login as Content Admin
          </button>

          <div className="login-note">
            <span>🛡️</span>
            <span>
              This is a prototype demo. Click <strong>Login</strong> to enter as a verified doctor, or use the admin buttons to explore the admin flow.
            </span>
          </div>
        </div>
      </div>
    </>
  );
}
