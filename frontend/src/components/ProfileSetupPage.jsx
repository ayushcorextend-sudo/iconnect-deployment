import { useState } from 'react';
import {
  STATES, SPECIALITIES, PROG_YEARS, DISTRICTS_BY_STATE,
  getZone, ZONE_CONFIG, SUPER_SPEC_OPTIONS, SUPER_SPECIALITIES,
} from '../data/constants';
import { createProfileForOAuthUser, supabase, uploadVerificationCertificate } from '../lib/supabase';
import ProfileCompletionPage from './ProfileCompletionPage';

// ── Validation ────────────────────────────────────────────────
const PW_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z\d]).{8,}$/;
const MCI_REGEX = /^[A-Z]{1,5}-\d{4}-\d{4,6}$/;

// ── Steps ─────────────────────────────────────────────────────
const STEPS = [
  { key: 'basic',        label: 'Basic Info',     icon: '🔐' },
  { key: 'personal',     label: 'Personal',       icon: '👤' },
  { key: 'professional', label: 'Professional',   icon: '🩺' },
  { key: 'timeline',     label: 'Timeline',       icon: '📅' },
  { key: 'verification', label: 'Verification',   icon: '✅' },
];

// ── Year range for dropdowns ──────────────────────────────────
const NOW = new Date().getFullYear();
const JOINING_YEARS = Array.from({ length: 15 }, (_, i) => NOW - 10 + i); // 10 years back, 4 years forward

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

// ── Field wrapper for consistent styling ──────────────────────
function Field({ label, required, hint, children }) {
  return (
    <div className="login-field">
      <label>
        {label} {required && <span style={{ color: '#DC2626' }}>*</span>}
      </label>
      {children}
      {hint && <div style={{ fontSize: 11, color: '#6B7280', marginTop: 4 }}>{hint}</div>}
    </div>
  );
}

// ── Info card ──────────────────────────────────────────────────
function InfoCard({ bg, color, children }) {
  return (
    <div style={{
      background: bg, borderRadius: 10, padding: '10px 14px',
      fontSize: 12, color, marginBottom: 8, lineHeight: 1.6,
    }}>
      {children}
    </div>
  );
}

export default function ProfileSetupPage({ userId, email, onComplete, addToast }) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [certFile, setCertFile] = useState(null);
  const [certUrl, setCertUrl] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [wantsSuperSpec, setWantsSuperSpec] = useState(false);

  const [form, setForm] = useState({
    // Step 1: Basic Info (password setup)
    password: '', confirmPassword: '',
    // Step 2: Personal Info
    name: '', phone: '', dob: '', homeState: '', district: '', hometown: '', zone: '',
    // Step 3: Professional Info
    program: 'MBBS',
    speciality: '',           // MD/MS speciality
    college: '',
    place_of_study: '',
    // Super-specialization (optional for MD/MS)
    superSpecType: '',        // 'DM' | 'MCh' | 'DNB' | 'Fellowship'
    superSpeciality: '',      // chosen super-spec speciality
    superCollege: '',
    superPlace: '',
    superYear: '',
    fellowshipName: '',
    fellowshipInstitution: '',
    fellowshipDuration: '',
    // Step 4: Academic Timeline
    joining: '',
    // Step 5: Verification
    mciNumber: '', neetRank: '',
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  // ── Derived timeline values ─────────────────────────────────
  const duration = PROG_YEARS[form.program] || 3;
  const passoutYear = form.joining ? parseInt(form.joining) + duration : null;
  const curYr = form.joining ? NOW - parseInt(form.joining) + 1 : null;
  const curYrLabel = !curYr ? '—'
    : curYr <= 0 ? 'Not started yet'
    : curYr === 1 ? '1st Year'
    : curYr === 2 ? '2nd Year'
    : curYr === 3 ? '3rd Year'
    : curYr === 4 ? '4th Year'
    : curYr === 5 ? '5th Year'
    : 'Completed';

  const pwError = form.password && !PW_REGEX.test(form.password)
    ? 'Min 8 chars, uppercase, lowercase, number & special char (!@#$ etc.)'
    : '';

  // ── Programs that have speciality/super-spec ────────────────
  const hasPrimarySpeciality = form.program === 'MD' || form.program === 'MS';
  const superSpecOptions = SUPER_SPEC_OPTIONS[form.program] || [];
  const isFellowship = form.superSpecType === 'Fellowship';

  // ── Step validation ─────────────────────────────────────────
  const nextStep = () => {
    setError('');

    if (step === 1) {
      // Basic Info — password
      if (!form.password) { setError('Please set a password for your account'); return; }
      if (!PW_REGEX.test(form.password)) { setError('Password must be 8+ chars with uppercase, lowercase, number, and special character.'); return; }
      if (form.password !== form.confirmPassword) { setError('Passwords do not match'); return; }
    }

    if (step === 2) {
      // Personal Info
      if (!form.name.trim()) { setError('Full name is required'); return; }
      if (!form.phone.trim()) { setError('Phone number is required'); return; }
      if (!form.homeState) { setError('Home State is required'); return; }
      if (!form.district) { setError('District is required'); return; }
      if (!form.hometown.trim()) { setError('Hometown is required'); return; }
    }

    if (step === 3) {
      // Professional Info
      if (!form.college.trim()) { setError('College / Institution is required'); return; }
      if (!form.place_of_study.trim()) { setError('Place of study is required'); return; }
      if (hasPrimarySpeciality && !form.speciality) { setError('Speciality is required for ' + form.program); return; }
      // Super-spec validation
      if (wantsSuperSpec) {
        if (!form.superSpecType) { setError('Please select a super-specialization type'); return; }
        if (isFellowship) {
          if (!form.fellowshipName.trim()) { setError('Fellowship program name is required'); return; }
          if (!form.fellowshipInstitution.trim()) { setError('Fellowship institution is required'); return; }
        } else {
          if (!form.superSpeciality) { setError('Super-specialization speciality is required'); return; }
        }
      }
    }

    if (step === 4) {
      // Timeline
      if (!form.joining) { setError('Year of Joining is required'); return; }
    }

    setStep(s => s + 1);
  };

  // ── File handling ───────────────────────────────────────────
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

  // ── Submit ──────────────────────────────────────────────────
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
        // Super-spec fields mapped for DB
        super_spec_type: wantsSuperSpec ? form.superSpecType : null,
        super_speciality: wantsSuperSpec ? (isFellowship ? null : form.superSpeciality) : null,
        super_college: wantsSuperSpec ? form.superCollege : null,
        super_place: wantsSuperSpec ? form.superPlace : null,
        super_year: wantsSuperSpec ? form.superYear : null,
        fellowship_name: wantsSuperSpec && isFellowship ? form.fellowshipName : null,
        fellowship_institution: wantsSuperSpec && isFellowship ? form.fellowshipInstitution : null,
        fellowship_duration: wantsSuperSpec && isFellowship ? form.fellowshipDuration : null,
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

  // ── Done → show completion page ─────────────────────────────
  if (done) {
    return (
      <ProfileCompletionPage
        name={form.name}
        email={email}
        mciNumber={form.mciNumber}
        college={form.college}
        speciality={form.speciality || form.program}
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
          <div className="logo-sub">ICON LIFE SCIENCES Medical Education Platform</div>
        </div>

        <div className="login-card">
          <h2 style={{ marginBottom: 4 }}>Complete Your Profile</h2>
          <p style={{ marginBottom: 16, color: '#6B7280', fontSize: 13 }}>
            Google account: <strong>{email}</strong>
          </p>

          {/* ── Progress Stepper ── */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#111827' }}>
                Step {step} of {STEPS.length} — {STEPS[step - 1].label}
              </span>
              <span style={{ fontSize: 11, color: '#6B7280' }}>{pct}%</span>
            </div>
            <div style={{ height: 5, background: '#E5E7EB', borderRadius: 99, overflow: 'hidden', marginBottom: 14 }}>
              <div style={{ height: '100%', width: `${pct}%`, background: '#2563EB', borderRadius: 99, transition: 'width .4s ease' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 0 }}>
              {STEPS.map((s, i) => (
                <div key={s.key} style={{ display: 'flex', alignItems: 'center' }}>
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
                    <span style={{
                      fontSize: 9, fontWeight: 600,
                      color: i + 1 === step ? '#111827' : '#9CA3AF',
                      maxWidth: 52, textAlign: 'center', lineHeight: 1.2,
                    }}>
                      {s.label}
                    </span>
                  </div>
                  {i < STEPS.length - 1 && (
                    <div style={{
                      width: 20, height: 2,
                      background: i + 1 < step ? '#2563EB' : '#E5E7EB',
                      borderRadius: 99, margin: '0 3px', marginBottom: 14,
                      transition: 'background .3s',
                    }} />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════
              STEP 1: Basic Info (Password Setup)
              ═══════════════════════════════════════════════════ */}
          {step === 1 && (
            <>
              <InfoCard bg="#EFF6FF" color="#1D4ED8">
                🔐 Set a password for your iConnect account. You can use this to log in with email + password in addition to Google.
              </InfoCard>
              <Field label="Set Password" required>
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
              </Field>
              <Field label="Confirm Password" required>
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
              </Field>
            </>
          )}

          {/* ═══════════════════════════════════════════════════
              STEP 2: Personal Info
              ═══════════════════════════════════════════════════ */}
          {step === 2 && (
            <>
              <Field label="Full Name (with title)" required>
                <input className="login-input" placeholder="Dr. First Last" value={form.name} onChange={e => set('name', e.target.value)} />
              </Field>
              <Field label="Phone Number" required>
                <input className="login-input" type="tel" placeholder="+91 98765 43210" value={form.phone} onChange={e => set('phone', e.target.value)} />
              </Field>
              <Field label="Date of Birth" hint="Optional — used for age-based analytics">
                <input className="login-input" type="date" value={form.dob} onChange={e => set('dob', e.target.value)} />
              </Field>
              <Field label="Home State" required>
                <select className="login-input" style={{ cursor: 'pointer' }} value={form.homeState} onChange={e => {
                  const s = e.target.value;
                  setForm(f => ({ ...f, homeState: s, district: '', zone: getZone(s) || '' }));
                }}>
                  <option value="">Select state…</option>
                  {STATES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </Field>
              {form.homeState && (
                <Field label="District" required>
                  <select className="login-input" style={{ cursor: 'pointer' }} value={form.district} onChange={e => set('district', e.target.value)}>
                    <option value="">Select district…</option>
                    {(DISTRICTS_BY_STATE[form.homeState] || []).map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </Field>
              )}
              <Field label="Hometown" required>
                <input className="login-input" placeholder="City / Town" value={form.hometown} onChange={e => set('hometown', e.target.value)} />
              </Field>
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
            </>
          )}

          {/* ═══════════════════════════════════════════════════
              STEP 3: Professional Info (conditional fields)
              ═══════════════════════════════════════════════════ */}
          {step === 3 && (
            <>
              {/* Program Type */}
              <Field label="Program Type" required>
                <select className="login-input" style={{ cursor: 'pointer' }} value={form.program} onChange={e => {
                  const prog = e.target.value;
                  setForm(f => ({
                    ...f,
                    program: prog,
                    speciality: '',
                    superSpecType: '', superSpeciality: '',
                    superCollege: '', superPlace: '', superYear: '',
                    fellowshipName: '', fellowshipInstitution: '', fellowshipDuration: '',
                  }));
                  setWantsSuperSpec(false);
                }}>
                  {Object.keys(SPECIALITIES).map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </Field>

              {/* ── MBBS: Minimal fields ── */}
              {form.program === 'MBBS' && (
                <InfoCard bg="#F0FDF4" color="#166534">
                  📋 MBBS students only need college details. Specialization fields will appear if you select MD or MS.
                </InfoCard>
              )}

              {/* ── MD / MS: Speciality dropdown ── */}
              {hasPrimarySpeciality && (
                <Field label={`${form.program} Speciality`} required>
                  <select className="login-input" style={{ cursor: 'pointer' }} value={form.speciality} onChange={e => set('speciality', e.target.value)}>
                    <option value="">Select speciality…</option>
                    {(SPECIALITIES[form.program] || []).map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </Field>
              )}

              {/* Common fields for all programs */}
              <Field label="Medical College / Institution" required>
                <input className="login-input" placeholder="e.g. AIIMS New Delhi" value={form.college} onChange={e => set('college', e.target.value)} />
              </Field>
              <Field label="Place of Study" required>
                <input className="login-input" placeholder="e.g. New Delhi" value={form.place_of_study} onChange={e => set('place_of_study', e.target.value)} />
              </Field>

              {/* ── Super-Specialization toggle (MD/MS only) ── */}
              {hasPrimarySpeciality && superSpecOptions.length > 0 && (
                <>
                  <div style={{
                    marginTop: 8, marginBottom: 8, padding: '12px 14px',
                    background: '#FAFAFA', borderRadius: 10,
                    border: '1px solid #E5E7EB',
                  }}>
                    <label style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#374151',
                    }}>
                      <input
                        type="checkbox"
                        checked={wantsSuperSpec}
                        onChange={e => {
                          setWantsSuperSpec(e.target.checked);
                          if (!e.target.checked) {
                            setForm(f => ({
                              ...f,
                              superSpecType: '', superSpeciality: '',
                              superCollege: '', superPlace: '', superYear: '',
                              fellowshipName: '', fellowshipInstitution: '', fellowshipDuration: '',
                            }));
                          }
                        }}
                        style={{ width: 16, height: 16, accentColor: '#2563EB' }}
                      />
                      I have / am pursuing a Super-Specialization
                    </label>
                    <div style={{ fontSize: 11, color: '#6B7280', marginTop: 4, paddingLeft: 26 }}>
                      {form.program === 'MD' ? 'DM or Fellowship after MD' : 'MCh or DNB after MS'}
                    </div>
                  </div>

                  {wantsSuperSpec && (
                    <div style={{
                      padding: '14px', background: '#F5F3FF', borderRadius: 10,
                      border: '1px solid #DDD6FE', marginBottom: 4,
                    }}>
                      <Field label="Super-Specialization Type" required>
                        <select className="login-input" style={{ cursor: 'pointer' }} value={form.superSpecType} onChange={e => {
                          setForm(f => ({
                            ...f,
                            superSpecType: e.target.value,
                            superSpeciality: '', superCollege: '', superPlace: '', superYear: '',
                            fellowshipName: '', fellowshipInstitution: '', fellowshipDuration: '',
                          }));
                        }}>
                          <option value="">Select type…</option>
                          {superSpecOptions.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </Field>

                      {/* Fellowship fields */}
                      {isFellowship && (
                        <>
                          <Field label="Fellowship Program Name" required>
                            <input className="login-input" placeholder="e.g. Interventional Cardiology Fellowship" value={form.fellowshipName} onChange={e => set('fellowshipName', e.target.value)} />
                          </Field>
                          <Field label="Fellowship Institution" required>
                            <input className="login-input" placeholder="e.g. Medanta, Gurugram" value={form.fellowshipInstitution} onChange={e => set('fellowshipInstitution', e.target.value)} />
                          </Field>
                          <Field label="Fellowship Duration">
                            <select className="login-input" style={{ cursor: 'pointer' }} value={form.fellowshipDuration} onChange={e => set('fellowshipDuration', e.target.value)}>
                              <option value="">Select duration…</option>
                              <option value="6 months">6 months</option>
                              <option value="1 year">1 year</option>
                              <option value="2 years">2 years</option>
                              <option value="3 years">3 years</option>
                            </select>
                          </Field>
                        </>
                      )}

                      {/* DM / MCh / DNB fields */}
                      {form.superSpecType && !isFellowship && (
                        <>
                          <Field label={`${form.superSpecType} Speciality`} required>
                            <select className="login-input" style={{ cursor: 'pointer' }} value={form.superSpeciality} onChange={e => set('superSpeciality', e.target.value)}>
                              <option value="">Select speciality…</option>
                              {(SUPER_SPECIALITIES[form.superSpecType] || []).map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                          </Field>
                          <Field label={`${form.superSpecType} College`} hint="Leave blank if same as primary">
                            <input className="login-input" placeholder="e.g. SGPGIMS Lucknow" value={form.superCollege} onChange={e => set('superCollege', e.target.value)} />
                          </Field>
                          <Field label={`${form.superSpecType} Place`}>
                            <input className="login-input" placeholder="e.g. Lucknow" value={form.superPlace} onChange={e => set('superPlace', e.target.value)} />
                          </Field>
                          <Field label={`${form.superSpecType} Year of Joining`}>
                            <select className="login-input" style={{ cursor: 'pointer' }} value={form.superYear} onChange={e => set('superYear', e.target.value)}>
                              <option value="">Select year…</option>
                              {JOINING_YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                            </select>
                          </Field>
                        </>
                      )}
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {/* ═══════════════════════════════════════════════════
              STEP 4: Academic Timeline
              ═══════════════════════════════════════════════════ */}
          {step === 4 && (
            <>
              <InfoCard bg="#EFF6FF" color="#1D4ED8">
                📅 Your academic timeline is auto-calculated from your year of joining. This determines your current year, passout year, and platform access expiry.
              </InfoCard>

              <Field label={`Year of Joining (${form.program})`} required>
                <select className="login-input" style={{ cursor: 'pointer' }} value={form.joining} onChange={e => set('joining', e.target.value)}>
                  <option value="">Select year…</option>
                  {JOINING_YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </Field>

              {form.joining && (
                <div style={{
                  background: '#F0FDF4', borderRadius: 12, padding: '16px',
                  border: '1px solid #BBF7D0', marginBottom: 8,
                }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#166534', marginBottom: 12 }}>
                    📊 Academic Timeline
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div style={{ background: '#fff', borderRadius: 8, padding: '10px 12px', textAlign: 'center' }}>
                      <div style={{ fontSize: 11, color: '#6B7280', marginBottom: 2 }}>Program</div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: '#111827' }}>{form.program}</div>
                    </div>
                    <div style={{ background: '#fff', borderRadius: 8, padding: '10px 12px', textAlign: 'center' }}>
                      <div style={{ fontSize: 11, color: '#6B7280', marginBottom: 2 }}>Duration</div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: '#111827' }}>{duration} years</div>
                    </div>
                    <div style={{ background: '#fff', borderRadius: 8, padding: '10px 12px', textAlign: 'center' }}>
                      <div style={{ fontSize: 11, color: '#6B7280', marginBottom: 2 }}>Current Year</div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: '#2563EB' }}>{curYrLabel}</div>
                    </div>
                    <div style={{ background: '#fff', borderRadius: 8, padding: '10px 12px', textAlign: 'center' }}>
                      <div style={{ fontSize: 11, color: '#6B7280', marginBottom: 2 }}>Passout Year</div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: '#111827' }}>{passoutYear}</div>
                    </div>
                  </div>
                  <div style={{ marginTop: 10, fontSize: 12, color: '#166534', textAlign: 'center' }}>
                    🔓 Platform access valid until: <strong>{passoutYear ? passoutYear + 2 : '—'}</strong>
                  </div>
                </div>
              )}

              {/* Summary of what was filled so far */}
              <div style={{
                background: '#FAFAFA', borderRadius: 10, padding: '12px 14px',
                border: '1px solid #E5E7EB', marginTop: 4,
              }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#374151', marginBottom: 8 }}>
                  Profile Summary So Far
                </div>
                <div style={{ fontSize: 12, color: '#6B7280', lineHeight: 1.8 }}>
                  👤 {form.name || '—'} · 📱 {form.phone || '—'}<br />
                  📍 {form.hometown || '—'}, {form.district || '—'}, {form.homeState || '—'}<br />
                  🩺 {form.program}{form.speciality ? ` — ${form.speciality}` : ''} · 🏥 {form.college || '—'}
                  {wantsSuperSpec && form.superSpecType && (
                    <>
                      <br />
                      🎓 Super-spec: {form.superSpecType}
                      {form.superSpeciality ? ` — ${form.superSpeciality}` : ''}
                      {isFellowship && form.fellowshipName ? ` — ${form.fellowshipName}` : ''}
                    </>
                  )}
                </div>
              </div>
            </>
          )}

          {/* ═══════════════════════════════════════════════════
              STEP 5: Verification
              ═══════════════════════════════════════════════════ */}
          {step === 5 && (
            <>
              <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 12 }}>
                Your MCI/NMC number is required for identity verification. An admin will review your profile before granting access.
              </div>
              <Field label="MCI / NMC Number" required hint="Format: STATE-YEAR-NUMBER (e.g. MH-2024-123456)">
                <input
                  className="login-input"
                  placeholder="e.g. MH-2024-123456"
                  value={form.mciNumber}
                  onChange={e => set('mciNumber', e.target.value.toUpperCase())}
                />
              </Field>
              <Field label="NEET-PG All India Rank" hint="Optional">
                <input className="login-input" type="number" placeholder="e.g. 142" value={form.neetRank} onChange={e => set('neetRank', e.target.value)} />
              </Field>
              <Field label="MCI/NMC Registration Certificate" hint="Optional — PDF/JPG/PNG, max 10 MB">
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
              </Field>

              {/* Final summary */}
              <div style={{ background: '#F0FDF4', borderRadius: 10, padding: '10px 12px', fontSize: 12, color: '#166534', marginBottom: 8 }}>
                📋 <strong>Summary:</strong> {form.name} · {form.program}
                {form.speciality ? ` ${form.speciality}` : ''} · {form.college} · Passout: {passoutYear || '—'}
                {wantsSuperSpec && form.superSpecType ? ` · Super-spec: ${form.superSpecType}` : ''}
              </div>
            </>
          )}

          {/* ── Error display ── */}
          {error && (
            <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#DC2626', marginBottom: 10 }}>
              ⚠️ {error}
            </div>
          )}

          {/* ── Navigation buttons ── */}
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
