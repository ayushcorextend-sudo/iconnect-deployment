import { useState } from 'react';
import { STATES, SPECIALITIES, PROG_YEARS, DISTRICTS_BY_STATE, getZone, ZONE_CONFIG } from '../data/constants';
import { registerUser, uploadVerificationCertificate } from '../lib/supabase';
import ProfileCompletionPage from './ProfileCompletionPage';

const PW_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z\d]).{8,}$/;
const MCI_REGEX = /^[A-Z]{1,5}-\d{4}-\d{4,6}$/;
const STEPS = ['Account', 'Personal', 'Professional', 'Verification'];
const MAX_CERT_MB = 10;

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

export default function RegistrationPage({ addToast, setPage, onRegisterSuccess }) {
  const now = new Date().getFullYear();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [doneData, setDoneData] = useState(null);
  const [error, setError] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [certFile, setCertFile] = useState(null); // File object for certificate
  const [form, setForm] = useState({
    // Step 1
    email: '', password: '', confirmPassword: '',
    // Step 2
    name: '', phone: '', homeState: '', district: '', hometown: '', zone: '',
    // Step 3
    program: 'MD', speciality: '', college: '', place_of_study: '', joining: '',
    // Step 4
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
      if (!form.email.trim()) { setError('Email is required'); return; }
      if (!form.password) { setError('Password is required'); return; }
      if (!PW_REGEX.test(form.password)) { setError('Password must be 8+ chars with uppercase, lowercase, number, and special character.'); return; }
      if (form.password !== form.confirmPassword) { setError('Passwords do not match'); return; }
    }
    if (step === 2) {
      if (!form.name.trim()) { setError('Full name is required'); return; }
      if (!form.phone.trim()) { setError('Phone number is required'); return; }
      if (!form.homeState) { setError('Home State is required'); return; }
      if (!form.district) { setError('District is required'); return; }
      if (!form.hometown.trim()) { setError('Hometown is required'); return; }
    }
    if (step === 3) {
      if (!form.speciality || !form.college.trim() || !form.place_of_study.trim() || !form.joining) {
        setError('All professional fields are required');
        return;
      }
    }
    setStep(s => s + 1);
  };

  const handleCertFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ext = file.name.split('.').pop().toLowerCase();
    if (!['pdf', 'jpg', 'jpeg', 'png'].includes(ext)) {
      setError('Only PDF, JPG, or PNG files are accepted.');
      return;
    }
    if (file.size > MAX_CERT_MB * 1024 * 1024) {
      setError(`File too large. Maximum size is ${MAX_CERT_MB}MB.`);
      return;
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
    let certUrl = null;
    try {
      const result = await registerUser(form.email.trim().toLowerCase(), form.password, {
        name: form.name.trim(),
        mci_number: form.mciNumber.trim(),
        phone: form.phone.trim(),
        program: form.program,
        speciality: form.speciality,
        college: form.college.trim(),
        place_of_study: form.place_of_study.trim(),
        joining_year: Number(form.joining),
        passout_year: passoutYear,
        state: form.homeState,
        district: form.district,
        zone: form.zone || getZone(form.homeState) || null,
        hometown: form.hometown.trim(),
        neet_rank: form.neetRank ? Number(form.neetRank) : null,
      });

      // Upload certificate if provided and we have a real userId
      if (certFile && result.userId) {
        try {
          const { url } = await uploadVerificationCertificate(result.userId, certFile);
          certUrl = url;
        } catch (certErr) {
          // Certificate upload failure is non-fatal — registration already succeeded
          console.warn('[RegistrationPage] Certificate upload failed:', certErr.message);
          addToast('warn', 'Registration successful! Certificate upload failed — you can re-upload from your profile.');
        }
      }

      if (onRegisterSuccess) {
        onRegisterSuccess({
          id: result.userId || `local_${Date.now()}`,
          name: form.name, email: form.email,
          role: 'PG Aspirant', mci: form.mciNumber,
          hometown: form.hometown, state: form.homeState,
          district: form.district, speciality: form.speciality,
          college: form.college, status: 'pending', verified: false, score: 0,
        });
      }

      if (result.requiresEmailVerification) {
        addToast('success', 'Account created! Please check your email to verify your account before logging in.');
      }

      setDoneData({ certUrl });
      setDone(true);
    } catch (err) {
      addToast('error', err.message || 'Registration failed. Please try again.');
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (done) return (
    <ProfileCompletionPage
      name={form.name}
      email={form.email}
      mciNumber={form.mciNumber}
      college={form.college}
      speciality={form.speciality}
      phone={form.phone}
      state={form.homeState}
      certificateUrl={doneData?.certUrl}
      verified={false}
    />
  );

  const pct = Math.round((step / STEPS.length) * 100);

  return (
    <div className="page">
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <div className="ph">
        <div className="pt">📋 New Registration</div>
        <div className="ps">PG Aspirant Onboarding — All fields marked * are mandatory</div>
      </div>

      {/* Progress indicator */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>
            Step {step} of {STEPS.length} — {STEPS[step - 1]} Details
          </span>
          <span style={{ fontSize: 12, color: '#6B7280' }}>Profile Completeness: {pct}%</span>
        </div>
        <div style={{ height: 6, background: '#E5E7EB', borderRadius: 99, overflow: 'hidden', marginBottom: 16 }}>
          <div style={{ height: '100%', width: `${pct}%`, background: '#2563EB', borderRadius: 99, transition: 'width .4s ease' }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0 }}>
          {STEPS.map((l, i) => (
            <div key={l} style={{ display: 'flex', alignItems: 'center' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
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
                <span style={{ fontSize: 10, fontWeight: 600, color: i + 1 === step ? '#111827' : '#9CA3AF', whiteSpace: 'nowrap' }}>{l}</span>
              </div>
              {i < STEPS.length - 1 && (
                <div style={{ width: 28, height: 2, background: i + 1 < step ? '#2563EB' : '#E5E7EB', borderRadius: 99, margin: '0 4px', marginBottom: 14, transition: 'background .3s' }} />
              )}
            </div>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: 640 }}>

        {/* ── Step 1: Account Details ── */}
        {step === 1 && (
          <div className="card fi">
            <div className="ct" style={{ marginBottom: 16 }}>🔐 Account Details</div>
            <div className="fg">
              <label className="fl">Email Address <span className="req">*</span></label>
              <input className="fi-in" type="email" autoComplete="email" placeholder="you@hospital.in"
                value={form.email} onChange={e => set('email', e.target.value)} />
            </div>
            <div className="fg">
              <label className="fl">Password <span className="req">*</span></label>
              <div style={{ position: 'relative' }}>
                <input className="fi-in" type={showPw ? 'text' : 'password'} autoComplete="new-password"
                  placeholder="Min 8 chars, A-Z, 0-9, !@#$"
                  value={form.password} onChange={e => set('password', e.target.value)} style={{ paddingRight: 40 }} />
                <span onClick={() => setShowPw(s => !s)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', color: '#6B7280', fontSize: 14 }}>
                  {showPw ? '🙈' : '👁️'}
                </span>
              </div>
              {pwError && <div style={{ fontSize: 11, color: '#DC2626', marginTop: 4 }}>⚠️ {pwError}</div>}
            </div>
            <div className="fg">
              <label className="fl">Confirm Password <span className="req">*</span></label>
              <div style={{ position: 'relative' }}>
                <input className="fi-in" type={showConfirmPw ? 'text' : 'password'} autoComplete="new-password"
                  placeholder="Re-enter password"
                  value={form.confirmPassword} onChange={e => set('confirmPassword', e.target.value)} style={{ paddingRight: 40 }} />
                <span onClick={() => setShowConfirmPw(s => !s)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', color: '#6B7280', fontSize: 14 }}>
                  {showConfirmPw ? '🙈' : '👁️'}
                </span>
              </div>
              {form.confirmPassword && form.password !== form.confirmPassword && (
                <div style={{ fontSize: 11, color: '#DC2626', marginTop: 4 }}>⚠️ Passwords do not match</div>
              )}
            </div>
          </div>
        )}

        {/* ── Step 2: Personal Info ── */}
        {step === 2 && (
          <div className="card fi">
            <div className="ct" style={{ marginBottom: 16 }}>👤 Personal Info</div>
            <div className="fg">
              <label className="fl">Full Name (with title) <span className="req">*</span></label>
              <input className="fi-in" placeholder="Dr. First Last" value={form.name} onChange={e => set('name', e.target.value)} />
            </div>
            <div className="fg">
              <label className="fl">Phone Number <span className="req">*</span></label>
              <input className="fi-in" type="tel" placeholder="+91 98765 43210" value={form.phone} onChange={e => set('phone', e.target.value)} />
            </div>
            <div className="fg2">
              <div className="fg">
                <label className="fl">Home State <span className="req">*</span></label>
                <select className="fi-sel" value={form.homeState} onChange={e => {
                  const s = e.target.value;
                  setForm(f => ({ ...f, homeState: s, district: '', zone: getZone(s) || '' }));
                }}>
                  <option value="">Select state…</option>
                  {STATES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="fg">
                <label className="fl">Hometown <span className="req">*</span></label>
                <input className="fi-in" placeholder="City / Town" value={form.hometown} onChange={e => set('hometown', e.target.value)} />
              </div>
            </div>
            {form.homeState && (
              <div className="fg">
                <label className="fl">District <span className="req">*</span></label>
                <select className="fi-sel" value={form.district} onChange={e => set('district', e.target.value)}>
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
                  <span style={{ color: '#9CA3AF', fontSize: 11 }}>— automatically assigned from your state</span>
                </div>
              );
            })()}
          </div>
        )}

        {/* ── Step 3: Professional Info ── */}
        {step === 3 && (
          <div className="card fi">
            <div className="ct" style={{ marginBottom: 16 }}>🎓 Professional Info</div>
            <div className="fg2">
              <div className="fg">
                <label className="fl">Program Type <span className="req">*</span></label>
                <select className="fi-sel" value={form.program} onChange={e => { set('program', e.target.value); set('speciality', ''); }}>
                  {Object.keys(SPECIALITIES).map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div className="fg">
                <label className="fl">Speciality <span className="req">*</span></label>
                <select className="fi-sel" value={form.speciality} onChange={e => set('speciality', e.target.value)}>
                  <option value="">Select…</option>
                  {(SPECIALITIES[form.program] || []).map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div className="fg">
              <label className="fl">College / Institution <span className="req">*</span></label>
              <input className="fi-in" placeholder="e.g. AIIMS Delhi" value={form.college} onChange={e => set('college', e.target.value)} />
            </div>
            <div className="fg">
              <label className="fl">Place of Study <span className="req">*</span></label>
              <input className="fi-in" placeholder="e.g. AIIMS Delhi, CMC Vellore" value={form.place_of_study} onChange={e => set('place_of_study', e.target.value)} />
            </div>
            <div className="fg">
              <label className="fl">Year of Joining <span className="req">*</span></label>
              <select className="fi-sel" value={form.joining} onChange={e => set('joining', e.target.value)}>
                <option value="">Select year…</option>
                {[2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026, 2027, 2028].map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
            {form.joining && (
              <div style={{ background: '#EFF6FF', borderRadius: 12, padding: 14, marginTop: 4 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#1D4ED8', marginBottom: 8 }}>✨ Auto-calculated</div>
                <div className="fg2" style={{ gap: 10 }}>
                  <div>
                    <label className="fl">Current Year</label>
                    <input className="fi-in auto" value={curYrLabel} readOnly />
                  </div>
                  <div>
                    <label className="fl">Expected Passout</label>
                    <input className="fi-in auto" value={passoutYear || '—'} readOnly />
                  </div>
                </div>
                <div style={{ fontSize: 11, color: '#1D4ED8', marginTop: 4 }}>
                  📅 {form.program} duration: {duration} years · Access expires: {passoutYear ? passoutYear + 2 : '—'}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Step 4: MCI / NMC Verification ── */}
        {step === 4 && (
          <div className="card fi">
            <div className="ct" style={{ marginBottom: 8 }}>🪪 MCI / NMC Verification</div>
            <div style={{ fontSize: 13, color: '#6B7280', marginBottom: 16, lineHeight: 1.6 }}>
              Your MCI/NMC registration number is required for identity verification. An admin will review your profile before granting access.
            </div>

            <div className="fg">
              <label className="fl">MCI / NMC Number <span className="req">*</span></label>
              <input
                className="fi-in"
                placeholder="e.g. MH-2024-123456"
                value={form.mciNumber}
                onChange={e => set('mciNumber', e.target.value.toUpperCase())}
              />
              <div style={{ fontSize: 11, color: '#6B7280', marginTop: 4 }}>Format: STATE-YEAR-NUMBER (e.g. MH-2024-123456)</div>
            </div>

            {/* Certificate upload */}
            <div className="fg" style={{ marginTop: 8 }}>
              <label className="fl">
                MCI/NMC Certificate{' '}
                <span style={{ color: '#9CA3AF', fontSize: 11, fontWeight: 400 }}>(optional but recommended)</span>
              </label>
              <div style={{
                border: `2px dashed ${certFile ? '#059669' : '#D1D5DB'}`,
                borderRadius: 10, padding: '20px 16px', textAlign: 'center',
                background: certFile ? '#F0FDF4' : '#FAFAFA',
                transition: 'all .2s', cursor: 'pointer',
              }}
                onClick={() => document.getElementById('cert-upload-input').click()}
              >
                {certFile ? (
                  <div>
                    <div style={{ fontSize: 28, marginBottom: 4 }}>✅</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#065F46' }}>{certFile.name}</div>
                    <div style={{ fontSize: 11, color: '#6B7280', marginTop: 2 }}>
                      {(certFile.size / 1024 / 1024).toFixed(2)} MB
                    </div>
                    <button
                      type="button"
                      onClick={e => { e.stopPropagation(); setCertFile(null); }}
                      style={{ marginTop: 8, fontSize: 11, color: '#DC2626', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                    >
                      ✕ Remove
                    </button>
                  </div>
                ) : (
                  <div>
                    <div style={{ fontSize: 32, marginBottom: 8 }}>📄</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>Click to upload certificate</div>
                    <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 4 }}>PDF, JPG, PNG — max {MAX_CERT_MB}MB</div>
                  </div>
                )}
              </div>
              <input
                id="cert-upload-input"
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                style={{ display: 'none' }}
                onChange={handleCertFile}
              />
            </div>

            <div className="fg" style={{ marginTop: 8 }}>
              <label className="fl">NEET-PG All India Rank <span style={{ color: '#9CA3AF', fontSize: 11 }}>(optional)</span></label>
              <input className="fi-in" type="number" placeholder="e.g. 142" value={form.neetRank} onChange={e => set('neetRank', e.target.value)} />
            </div>

            {(form.name || form.email) && (
              <div style={{ background: '#F0FDF4', borderRadius: 10, padding: '12px 14px', fontSize: 12, color: '#166534', marginTop: 8 }}>
                📋 <strong>Summary:</strong> {form.name} · {form.email} · {form.program} {form.speciality} · {form.college} · Passout: {passoutYear || '—'}
              </div>
            )}
          </div>
        )}

        {error && (
          <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 6, padding: '10px 14px', marginBottom: 12, color: '#DC2626', fontSize: 13 }}>
            ⚠️ {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, justifyContent: 'space-between', marginTop: 16 }}>
          {step > 1
            ? <button className="btn btn-s" onClick={() => { setError(''); setStep(s => s - 1); }}>← Back</button>
            : <button className="btn btn-s" onClick={() => setPage?.('login')}>← Login</button>
          }
          {step < STEPS.length
            ? <button className="btn btn-p" onClick={nextStep}>Continue →</button>
            : <button className="btn btn-p" onClick={handleSubmit} disabled={loading}>
                {loading && <Spinner />}
                {loading ? 'Submitting…' : 'Submit Registration ✓'}
              </button>
          }
        </div>
      </div>
    </div>
  );
}
