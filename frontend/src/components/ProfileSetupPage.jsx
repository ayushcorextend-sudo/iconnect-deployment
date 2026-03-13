import { useState } from 'react';
import { STATES, SPECIALITIES, PROG_YEARS, DISTRICTS_BY_STATE, getZone, ZONE_CONFIG } from '../data/constants';
import { createProfileForOAuthUser, supabase, uploadVerificationCertificate } from '../lib/supabase';
import ProfileCompletionPage from './ProfileCompletionPage';

// Min 8 chars, uppercase, lowercase, digit, special character
const PW_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z\d]).{8,}$/;
const MCI_REGEX = /^[A-Z]{1,5}-\d{4}-\d{4,6}$/;
const STEPS = ['Personal', 'Professional', 'Verification'];

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

export default function ProfileSetupPage({ userId, email, onComplete, addToast }) {
  const now = new Date().getFullYear();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [certFile, setCertFile] = useState(null);
  const [certUrl, setCertUrl] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [form, setForm] = useState({
    // Step 1: Personal (+ password since Google handles email)
    name: '', phone: '', homeState: '', district: '', hometown: '', zone: '',
    password: '', confirmPassword: '',
    // Step 2: Professional
    program: 'MD', speciality: '', college: '', place_of_study: '', joining: '',
    // Step 3: Verification
    mciNumber: '', neetRank: '',
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const duration = PROG_YEARS[form.program] || 3;
  const passoutYear = form.joining ? parseInt(form.joining) + duration : null;
  const curYr = form.joining ? now - parseInt(form.joining) + 1 : null;
  const curYrLabel = !curYr ? '—'
    : curYr <= 0 ? 'Not started'
    : curYr === 1 ? '1st Year'
    : curYr === 2 ? '2nd Year'
    : curYr === 3 ? '3rd Year'
    : 'Completed';

  const pwError = form.password && !PW_REGEX.test(form.password)
    ? 'Min 8 chars, uppercase, lowercase, number & special char (!@#$ etc.)'
    : '';

  const nextStep = () => {
    setError('');
    if (step === 1) {
      if (!form.name.trim()) { setError('Full name is required'); return; }
      if (!form.phone.trim()) { setError('Phone number is required'); return; }
      if (!form.homeState) { setError('Home State is required'); return; }
      if (!form.district) { setError('District is required'); return; }
      if (!form.hometown.trim()) { setError('Hometown is required'); return; }
      if (!form.password) { setError('Please set a password for your account'); return; }
      if (!PW_REGEX.test(form.password)) { setError('Password must be 8+ chars with uppercase, lowercase, number, and special character.'); return; }
      if (form.password !== form.confirmPassword) { setError('Passwords do not match'); return; }
    }
    if (step === 2) {
      if (!form.speciality || !form.college.trim() || !form.place_of_study.trim() || !form.joining) {
        setError('All professional fields are required');
        return;
      }
    }
    setStep(s => s + 1);
  };

  const handleCertFile = (file) => {
    if (!file) return;
    const ext = file.name.split('.').pop().toLowerCase();
    if (!['pdf', 'jpg', 'jpeg', 'png'].includes(ext)) {
      setError('Only PDF, JPG, or PNG files are accepted'); return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('File must be under 10 MB'); return;
    }
    setError('');
    setCertFile(file);
  };

  const handleSubmit = async () => {
    setError('');
    if (!form.mciNumber.trim()) { setError('MCI/NMC number is required'); return; }
    if (!MCI_REGEX.test(form.mciNumber.trim())) {
      setError('MCI/NMC format: STATE-YEAR-NUMBER (e.g. MH-2024-123456)');
      return;
    }
    setLoading(true);
    try {
      await createProfileForOAuthUser(userId, email, {
        ...form,
        passout_year: passoutYear,
      });
      await supabase.auth.updateUser({ password: form.password });
      if (certFile) {
        try {
          const { url } = await uploadVerificationCertificate(userId, certFile);
          setCertUrl(url);
        } catch {
          addToast?.('warning', 'Certificate upload failed — you can re-submit later.');
        }
      }
      addToast?.('success', 'Profile saved! Your registration is under review.');
      setDone(true);
    } catch (err) {
      setError(err.message || 'Failed to save profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <ProfileCompletionPage
        name={form.name}
        email={email}
        mciNumber={form.mciNumber}
        college={form.college}
        speciality={form.speciality}
        phone={form.phone}
        state={form.homeState}
        certificateUrl={certUrl}
        verified={false}
      />
    );
  }

  const pct = Math.round((step / STEPS.length) * 100);

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
          <h2 style={{ marginBottom: 4 }}>Complete Your Profile</h2>
          <p style={{ marginBottom: 16, color: '#6B7280', fontSize: 13 }}>
            Google account: <strong>{email}</strong>
          </p>

          {/* Progress indicator */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#111827' }}>
                Step {step} of {STEPS.length} — {STEPS[step - 1]} Details
              </span>
              <span style={{ fontSize: 11, color: '#6B7280' }}>{pct}%</span>
            </div>
            <div style={{ height: 5, background: '#E5E7EB', borderRadius: 99, overflow: 'hidden', marginBottom: 14 }}>
              <div style={{ height: '100%', width: `${pct}%`, background: '#2563EB', borderRadius: 99, transition: 'width .4s ease' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 0 }}>
              {STEPS.map((l, i) => (
                <div key={l} style={{ display: 'flex', alignItems: 'center' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: '50%',
                      background: i + 1 <= step ? '#2563EB' : '#F3F4F6',
                      color: i + 1 <= step ? '#fff' : '#9CA3AF',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: 700, fontSize: 12,
                      boxShadow: i + 1 === step ? '0 0 0 3px rgba(37,99,235,0.18)' : 'none',
                      transition: 'all .2s',
                    }}>
                      {i + 1 < step ? '✓' : i + 1}
                    </div>
                    <span style={{ fontSize: 10, fontWeight: 600, color: i + 1 === step ? '#111827' : '#9CA3AF' }}>{l}</span>
                  </div>
                  {i < STEPS.length - 1 && (
                    <div style={{ width: 32, height: 2, background: i + 1 < step ? '#2563EB' : '#E5E7EB', borderRadius: 99, margin: '0 6px', marginBottom: 14, transition: 'background .3s' }} />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* ── Step 1: Personal Info ── */}
          {step === 1 && (
            <>
              <div className="login-field">
                <label>Full Name (with title) *</label>
                <input className="login-input" placeholder="Dr. First Last" value={form.name} onChange={e => set('name', e.target.value)} />
              </div>
              <div className="login-field">
                <label>Phone Number *</label>
                <input className="login-input" type="tel" placeholder="+91 98765 43210" value={form.phone} onChange={e => set('phone', e.target.value)} />
              </div>
              <div className="login-field">
                <label>Home State *</label>
                <select className="login-input" style={{ cursor: 'pointer' }} value={form.homeState} onChange={e => {
                  const s = e.target.value;
                  setForm(f => ({ ...f, homeState: s, district: '', zone: getZone(s) || '' }));
                }}>
                  <option value="">Select state…</option>
                  {STATES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="login-field">
                <label>Hometown *</label>
                <input className="login-input" placeholder="City / Town" value={form.hometown} onChange={e => set('hometown', e.target.value)} />
              </div>
              {form.homeState && (
                <div className="login-field">
                  <label>District *</label>
                  <select className="login-input" style={{ cursor: 'pointer' }} value={form.district} onChange={e => set('district', e.target.value)}>
                    <option value="">Select district…</option>
                    {(DISTRICTS_BY_STATE[form.homeState] || []).map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
              )}
              {form.zone && (() => {
                const zc = ZONE_CONFIG[form.zone];
                return (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', borderRadius: 8, background: zc?.bg || '#F3F4F6', border: `1px solid ${zc?.color || '#E5E7EB'}20`, fontSize: 13 }}>
                    <span>{zc?.emoji}</span>
                    <span style={{ color: zc?.color, fontWeight: 600 }}>{form.zone} Zone</span>
                    <span style={{ color: '#9CA3AF', fontSize: 11 }}>— automatically assigned</span>
                  </div>
                );
              })()}
              <div className="login-field">
                <label>Set Password *</label>
                <div style={{ position: 'relative' }}>
                  <input
                    className="login-input" type={showPw ? 'text' : 'password'}
                    placeholder="Min 8 chars, A-Z, 0-9, !@#$"
                    value={form.password} onChange={e => set('password', e.target.value)}
                    style={{ paddingRight: 40 }}
                  />
                  <span onClick={() => setShowPw(s => !s)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', color: '#6B7280', fontSize: 14 }}>
                    {showPw ? '🙈' : '👁️'}
                  </span>
                </div>
                {pwError && <div style={{ fontSize: 11, color: '#DC2626', marginTop: 4 }}>⚠️ {pwError}</div>}
              </div>
              <div className="login-field">
                <label>Confirm Password *</label>
                <div style={{ position: 'relative' }}>
                  <input
                    className="login-input" type={showConfirmPw ? 'text' : 'password'}
                    placeholder="Re-enter password"
                    value={form.confirmPassword} onChange={e => set('confirmPassword', e.target.value)}
                    style={{ paddingRight: 40 }}
                  />
                  <span onClick={() => setShowConfirmPw(s => !s)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', color: '#6B7280', fontSize: 14 }}>
                    {showConfirmPw ? '🙈' : '👁️'}
                  </span>
                </div>
                {form.confirmPassword && form.password !== form.confirmPassword && (
                  <div style={{ fontSize: 11, color: '#DC2626', marginTop: 4 }}>⚠️ Passwords do not match</div>
                )}
              </div>
            </>
          )}

          {/* ── Step 2: Professional Info ── */}
          {step === 2 && (
            <>
              <div className="login-field">
                <label>Program Type *</label>
                <select className="login-input" style={{ cursor: 'pointer' }} value={form.program} onChange={e => { set('program', e.target.value); set('speciality', ''); }}>
                  {Object.keys(SPECIALITIES).map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div className="login-field">
                <label>Speciality *</label>
                <select className="login-input" style={{ cursor: 'pointer' }} value={form.speciality} onChange={e => set('speciality', e.target.value)}>
                  <option value="">Select speciality…</option>
                  {(SPECIALITIES[form.program] || []).map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="login-field">
                <label>Medical College / Institution *</label>
                <input className="login-input" placeholder="e.g. AIIMS New Delhi" value={form.college} onChange={e => set('college', e.target.value)} />
              </div>
              <div className="login-field">
                <label>Place of Study *</label>
                <input className="login-input" placeholder="e.g. AIIMS Delhi, CMC Vellore" value={form.place_of_study} onChange={e => set('place_of_study', e.target.value)} />
              </div>
              <div className="login-field">
                <label>Year of Joining *</label>
                <select className="login-input" style={{ cursor: 'pointer' }} value={form.joining} onChange={e => set('joining', e.target.value)}>
                  <option value="">Select year…</option>
                  {[2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026, 2027, 2028].map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
              {form.joining && (
                <div style={{ background: '#EFF6FF', borderRadius: 10, padding: '10px 14px', fontSize: 12, color: '#1D4ED8', marginBottom: 8 }}>
                  ✨ Current Year: <strong>{curYrLabel}</strong> · Passout Year: <strong>{passoutYear}</strong>
                  <div style={{ fontSize: 11, marginTop: 3 }}>📅 Access expires: {passoutYear ? passoutYear + 2 : '—'}</div>
                </div>
              )}
            </>
          )}

          {/* ── Step 3: Verification ── */}
          {step === 3 && (
            <>
              <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 12 }}>
                Your MCI/NMC number is required for identity verification. An admin will review your profile before granting access.
              </div>
              <div className="login-field">
                <label>MCI / NMC Number *</label>
                <input
                  className="login-input"
                  placeholder="e.g. MH-2024-123456"
                  value={form.mciNumber}
                  onChange={e => set('mciNumber', e.target.value.toUpperCase())}
                />
                <div style={{ fontSize: 11, color: '#6B7280', marginTop: 4 }}>Format: STATE-YEAR-NUMBER</div>
              </div>
              <div className="login-field">
                <label>NEET-PG All India Rank <span style={{ color: '#9CA3AF', fontSize: 11 }}>(optional)</span></label>
                <input className="login-input" type="number" placeholder="e.g. 142" value={form.neetRank} onChange={e => set('neetRank', e.target.value)} />
              </div>
              <div className="login-field">
                <label>
                  MCI/NMC Registration Certificate{' '}
                  <span style={{ color: '#9CA3AF', fontSize: 11 }}>(optional — PDF/JPG/PNG, max 10 MB)</span>
                </label>
                <label style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  border: `2px dashed ${certFile ? '#059669' : '#D1D5DB'}`,
                  borderRadius: 10, padding: '16px 12px', cursor: 'pointer',
                  background: certFile ? '#F0FDF4' : '#F9FAFB', transition: 'border-color .2s',
                }}>
                  <input type="file" accept=".pdf,.jpg,.jpeg,.png" style={{ display: 'none' }}
                    onChange={e => handleCertFile(e.target.files?.[0])} />
                  <span style={{ fontSize: 22, marginBottom: 4 }}>{certFile ? '✅' : '📄'}</span>
                  <span style={{ fontSize: 12, color: certFile ? '#059669' : '#6B7280', fontWeight: 600 }}>
                    {certFile ? certFile.name : 'Click to upload certificate'}
                  </span>
                  {certFile && (
                    <span style={{ fontSize: 11, color: '#6B7280', marginTop: 2 }}>
                      {(certFile.size / 1024).toFixed(0)} KB
                    </span>
                  )}
                </label>
              </div>
              <div style={{ background: '#F0FDF4', borderRadius: 10, padding: '10px 12px', fontSize: 12, color: '#166534', marginBottom: 8 }}>
                📋 <strong>Summary:</strong> {form.name} · {form.program} {form.speciality} · {form.college} · Passout: {passoutYear || '—'}
              </div>
            </>
          )}

          {error && (
            <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#DC2626', marginBottom: 10 }}>
              ⚠️ {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
            {step > 1 && (
              <button
                className="login-btn"
                style={{ flex: 1, background: '#F3F4F6', color: '#374151' }}
                onClick={() => { setError(''); setStep(s => s - 1); }}
              >
                ← Back
              </button>
            )}
            {step < STEPS.length ? (
              <button className="login-btn" style={{ flex: 1 }} onClick={nextStep}>
                Continue →
              </button>
            ) : (
              <button className="login-btn" style={{ flex: 1 }} onClick={handleSubmit} disabled={loading}>
                {loading && <Spinner />}
                {loading ? 'Saving…' : 'Complete Setup ✓'}
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
