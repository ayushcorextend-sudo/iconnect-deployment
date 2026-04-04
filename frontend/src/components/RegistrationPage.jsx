import { useState } from 'react';
import { STATES, DISTRICTS_BY_STATE, SPECIALITIES, PROG_YEARS, getZone, ZONE_CONFIG } from '../data/constants';
import { registerUser, uploadVerificationCertificate } from '../lib/supabase';
import ProfileCompletionPage from './ProfileCompletionPage';

const PW_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z\d]).{8,}$/;
const MCI_REGEX = /^[A-Z]{1,5}-\d{4}-\d{4,6}$/;
const STEPS = ['Basic Info', 'Personal', 'Professional', 'Verification'];
const MAX_CERT_MB = 10;

const MD_SPECIALITIES = ['General Medicine', 'Pediatrics', 'Psychiatry', 'Radiology', 'Dermatology', 'Pathology', 'Microbiology', 'Biochemistry', 'Pharmacology', 'Community Medicine', 'Anaesthesiology', 'Emergency Medicine', 'Others'];
const MS_SPECIALITIES = ['General Surgery', 'Orthopaedics', 'ENT', 'Ophthalmology', 'Obstetrics & Gynaecology', 'Urology', 'Others'];
const DM_SPECIALITIES = SPECIALITIES.DM || [];
const MCH_SPECIALITIES = SPECIALITIES.MCh || [];
const DNB_SPECIALITIES = SPECIALITIES.DNB || [];

const YEAR_OPTIONS = Array.from({ length: 15 }, (_, i) => 2018 + i);

function Spinner() {
  return (
    <span style={{
      display: 'inline-block', width: 14, height: 14,
      border: '2px solid rgba(255,255,255,0.4)',
      borderTop: '2px solid #fff', borderRadius: '50%',
      animation: 'spin 0.7s linear infinite',
      verticalAlign: 'middle', marginRight: 6,
    }} />
  );
}

const INITIAL_FORM = {
  // Step 1 — Basic Info
  name: '', email: '', phone: '', password: '', confirmPassword: '',
  // Step 2 — Personal Info
  homeState: '', district: '', hometown: '', dob: '', zone: '',
  // Step 3 — Professional Info
  program: 'MBBS',
  // MBBS
  mbbs_college: '', mbbs_place: '', mbbs_year_passing: '',
  // MD
  md_speciality: '', md_college: '', md_place: '', md_year: '',
  md_super_spec: '', // '' | 'DM' | 'Fellowship'
  dm_speciality: '',
  fellowship_name: '', fellowship_institution: '', fellowship_duration: '',
  // MS
  ms_speciality: '', ms_college: '', ms_place: '', ms_year: '',
  ms_super_spec: '', // '' | 'MCh' | 'DNB'
  mch_speciality: '', mch_college: '', mch_place: '', mch_year: '',
  dnb_speciality: '', dnb_college: '', dnb_place: '', dnb_year: '',
  // Step 4 — Verification
  mciNumber: '', neetRank: '',
};

const getRequiredFields = (f) => {
  const base = {
    name: 'Full Name', email: 'Email', phone: 'Phone Number',
    password: 'Password', confirmPassword: 'Confirm Password',
    homeState: 'Home State', hometown: 'Hometown', dob: 'Date of Birth',
    mciNumber: 'MCI / NMC Number',
  };
  if (f.program === 'MBBS') {
    return { ...base, mbbs_college: 'College', mbbs_place: 'Place', mbbs_year_passing: 'Year of Passing' };
  }
  if (f.program === 'MD') {
    const out = { ...base, md_speciality: 'Specialization', md_college: 'College', md_place: 'Place', md_year: 'Year' };
    if (f.md_super_spec === 'DM') out.dm_speciality = 'DM Specialization';
    if (f.md_super_spec === 'Fellowship') {
      out.fellowship_name = 'Fellowship Name';
      out.fellowship_institution = 'Institution';
      out.fellowship_duration = 'Duration';
    }
    return out;
  }
  if (f.program === 'MS') {
    const out = { ...base, ms_speciality: 'Specialization', ms_college: 'College', ms_place: 'Place', ms_year: 'Year' };
    if (f.ms_super_spec === 'MCh') {
      out.mch_speciality = 'MCh Specialization';
      out.mch_college = 'MCh College'; out.mch_place = 'MCh Place'; out.mch_year = 'MCh Year';
    }
    if (f.ms_super_spec === 'DNB') {
      out.dnb_speciality = 'DNB Specialization';
      out.dnb_college = 'DNB College'; out.dnb_place = 'DNB Place'; out.dnb_year = 'DNB Year';
    }
    return out;
  }
  return base;
};

const buildProfilePayload = (form) => {
  const base = {
    name: form.name.trim(),
    phone: form.phone.trim(),
    mci_number: form.mciNumber.trim(),
    program: form.program,
    state: form.homeState,
    district: form.district,
    zone: form.zone || getZone(form.homeState) || null,
    hometown: form.hometown.trim(),
    dob: form.dob || null,
    neet_rank: form.neetRank ? Number(form.neetRank) : null,
  };

  if (form.program === 'MBBS') {
    return {
      ...base,
      speciality: 'MBBS',
      college: form.mbbs_college.trim(),
      place_of_study: form.mbbs_place.trim(),
      passout_year: Number(form.mbbs_year_passing),
      joining_year: Number(form.mbbs_year_passing) - 5,
    };
  }

  if (form.program === 'MD') {
    const p = {
      ...base,
      speciality: form.md_speciality,
      college: form.md_college.trim(),
      place_of_study: form.md_place.trim(),
      joining_year: Number(form.md_year),
      passout_year: Number(form.md_year) + (PROG_YEARS.MD || 3),
    };
    if (form.md_super_spec === 'DM') {
      p.super_spec_type = 'DM';
      p.super_speciality = form.dm_speciality;
    } else if (form.md_super_spec === 'Fellowship') {
      p.super_spec_type = 'Fellowship';
      p.fellowship_name = form.fellowship_name.trim();
      p.fellowship_institution = form.fellowship_institution.trim();
      p.fellowship_duration = form.fellowship_duration.trim();
    }
    return p;
  }

  if (form.program === 'MS') {
    const p = {
      ...base,
      speciality: form.ms_speciality,
      college: form.ms_college.trim(),
      place_of_study: form.ms_place.trim(),
      joining_year: Number(form.ms_year),
      passout_year: Number(form.ms_year) + (PROG_YEARS.MS || 3),
    };
    if (form.ms_super_spec === 'MCh') {
      p.super_spec_type = 'MCh';
      p.super_speciality = form.mch_speciality;
      p.super_college = form.mch_college.trim();
      p.super_place = form.mch_place.trim();
      p.super_year = Number(form.mch_year);
    } else if (form.ms_super_spec === 'DNB') {
      p.super_spec_type = 'DNB';
      p.super_speciality = form.dnb_speciality;
      p.super_college = form.dnb_college.trim();
      p.super_place = form.dnb_place.trim();
      p.super_year = Number(form.dnb_year);
    }
    return p;
  }

  return base;
};

export default function RegistrationPage({ addToast, setPage, onRegisterSuccess }) {
  const now = new Date().getFullYear();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [doneData, setDoneData] = useState(null);
  const [error, setError] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [certFile, setCertFile] = useState(null);
  const [touched, setTouched] = useState({});
  const [form, setForm] = useState(INITIAL_FORM);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const touch = (k) => setTouched(t => ({ ...t, [k]: true }));

  const requiredFields = getRequiredFields(form);
  const totalRequired = Object.keys(requiredFields).length;
  const pct = Math.round(
    Object.keys(requiredFields).filter(k => form[k]?.toString().trim()).length / totalRequired * 100
  );

  const isErr = (k) => touched[k] && !form[k]?.toString().trim();

  const fieldStyle = (k) => ({
    width: '100%', padding: '10px 14px',
    border: `1px solid ${isErr(k) ? '#EF4444' : '#E5E7EB'}`,
    borderRadius: 8, fontSize: 14, fontFamily: 'inherit', outline: 'none',
    background: '#fff', transition: 'border-color 0.15s',
    boxShadow: isErr(k) ? '0 0 0 3px rgba(239,68,68,0.1)' : 'none',
  });
  const selectStyle = (k) => ({ ...fieldStyle(k), cursor: 'pointer' });
  const InlineErr = ({ field }) => isErr(field)
    ? <div style={{ fontSize: 11, color: '#EF4444', marginTop: 3 }}>⚠️ {requiredFields[field] || field} is required</div>
    : null;

  const pwError = form.password && !PW_REGEX.test(form.password)
    ? 'Min 8 chars, uppercase, lowercase, number & special char'
    : '';

  // Auto-calc for MD / MS year banner
  const joiningYear = form.program === 'MD' ? Number(form.md_year)
    : form.program === 'MS' ? Number(form.ms_year) : null;
  const duration = PROG_YEARS[form.program] || 3;
  const passoutYear = joiningYear ? joiningYear + duration : null;
  const curYrNum = joiningYear ? now - joiningYear + 1 : null;
  const curYrLabel = !curYrNum ? '—'
    : curYrNum <= 0 ? 'Not started'
    : curYrNum === 1 ? '1st Year'
    : curYrNum === 2 ? '2nd Year'
    : curYrNum === 3 ? '3rd Year'
    : 'Completed';

  const nextStep = () => {
    setError('');
    if (step === 1) {
      if (!form.name.trim()) { setError('Full name is required'); return; }
      if (!form.email.trim()) { setError('Email is required'); return; }
      if (!form.phone.trim()) { setError('Phone number is required'); return; }
      if (!form.password) { setError('Password is required'); return; }
      if (!PW_REGEX.test(form.password)) {
        setError('Password must be 8+ chars with uppercase, lowercase, number, and special character.');
        return;
      }
      if (form.password !== form.confirmPassword) { setError('Passwords do not match'); return; }
    }
    if (step === 2) {
      if (!form.homeState) { setError('Home State is required'); return; }
      if (!form.hometown.trim()) { setError('Hometown is required'); return; }
      if (!form.dob) { setError('Date of Birth is required'); return; }
    }
    if (step === 3) {
      if (form.program === 'MBBS') {
        if (!form.mbbs_college.trim() || !form.mbbs_place.trim() || !form.mbbs_year_passing) {
          setError('College, Place, and Year of Passing are required for MBBS');
          return;
        }
      } else if (form.program === 'MD') {
        if (!form.md_speciality) { setError('Specialization is required'); return; }
        if (!form.md_college.trim() || !form.md_place.trim() || !form.md_year) {
          setError('College, Place, and Year are required'); return;
        }
        if (form.md_super_spec === 'DM' && !form.dm_speciality) {
          setError('DM Specialization is required'); return;
        }
        if (form.md_super_spec === 'Fellowship') {
          if (!form.fellowship_name.trim() || !form.fellowship_institution.trim() || !form.fellowship_duration.trim()) {
            setError('All Fellowship fields are required'); return;
          }
        }
      } else if (form.program === 'MS') {
        if (!form.ms_speciality) { setError('Specialization is required'); return; }
        if (!form.ms_college.trim() || !form.ms_place.trim() || !form.ms_year) {
          setError('College, Place, and Year are required'); return;
        }
        if (form.ms_super_spec === 'MCh') {
          if (!form.mch_speciality || !form.mch_college.trim() || !form.mch_place.trim() || !form.mch_year) {
            setError('All MCh fields are required'); return;
          }
        }
        if (form.ms_super_spec === 'DNB') {
          if (!form.dnb_speciality || !form.dnb_college.trim() || !form.dnb_place.trim() || !form.dnb_year) {
            setError('All DNB fields are required'); return;
          }
        }
      }
    }
    setStep(s => s + 1);
  };

  const handleCertFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ext = file.name.split('.').pop().toLowerCase();
    if (!['pdf', 'jpg', 'jpeg', 'png'].includes(ext)) {
      setError('Only PDF, JPG, or PNG files are accepted.'); return;
    }
    if (file.size > MAX_CERT_MB * 1024 * 1024) {
      setError(`File too large. Maximum size is ${MAX_CERT_MB}MB.`); return;
    }
    setError('');
    setCertFile(file);
  };

  const handleSubmit = async () => {
    if (loading) return; // prevent double-submit race between click and state update
    setError('');
    if (!form.mciNumber.trim()) { setError('MCI/NMC number is required'); return; }
    if (!MCI_REGEX.test(form.mciNumber.trim())) {
      setError('MCI/NMC format: STATE-YEAR-NUMBER (e.g. MH-2024-123456)'); return;
    }
    setLoading(true);
    let certUrl = null;
    try {
      const profile = buildProfilePayload(form);
      const result = await registerUser(form.email.trim().toLowerCase(), form.password, profile);

      if (certFile && result.userId) {
        try {
          const { url } = await uploadVerificationCertificate(result.userId, certFile);
          certUrl = url;
        } catch (certErr) {
          console.warn('[RegistrationPage] Certificate upload failed:', certErr.message);
          addToast('warn', 'Registration successful! Certificate upload failed — you can re-upload from your profile.');
        }
      }

      if (onRegisterSuccess) {
        onRegisterSuccess({
          id: result.userId,
          name: form.name, email: form.email,
          role: 'PG Aspirant', mci: form.mciNumber,
          hometown: form.hometown, state: form.homeState,
          district: form.district, speciality: profile.speciality,
          college: profile.college, status: 'pending', verified: false, score: 0,
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

  if (done) {
    const profile = buildProfilePayload(form);
    return (
      <ProfileCompletionPage
        name={form.name}
        email={form.email}
        mciNumber={form.mciNumber}
        college={profile.college}
        speciality={profile.speciality}
        phone={form.phone}
        state={form.homeState}
        certificateUrl={doneData?.certUrl}
        verified={false}
      />
    );
  }

  return (
    <div className="page">
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <div className="ph">
        <div className="pt">📋 New Registration</div>
        <div className="ps">PG Doctor Onboarding — All fields marked <span style={{ color: '#EF4444' }}>*</span> are mandatory</div>
      </div>

      {/* Step progress */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>
            Step {step} of {STEPS.length} — {STEPS[step - 1]}
          </span>
          <span style={{ fontSize: 12, color: pct === 100 ? '#059669' : '#6B7280', fontWeight: pct === 100 ? 700 : 400 }}>
            {pct === 100 ? '✅ ' : ''}Profile: {pct}%
          </span>
        </div>
        <div style={{ height: 6, background: '#E5E7EB', borderRadius: 99, overflow: 'hidden', marginBottom: 16 }}>
          <div style={{
            height: '100%', width: `${pct}%`,
            background: pct === 100 ? '#10B981' : '#2563EB',
            borderRadius: 99, transition: 'width .4s ease',
          }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0 }}>
          {STEPS.map((label, i) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center' }}>
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
                <span style={{ fontSize: 10, fontWeight: 600, color: i + 1 === step ? '#111827' : '#9CA3AF', whiteSpace: 'nowrap' }}>
                  {label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div style={{
                  width: 28, height: 2,
                  background: i + 1 < step ? '#2563EB' : '#E5E7EB',
                  borderRadius: 99, margin: '0 4px', marginBottom: 14,
                  transition: 'background .3s',
                }} />
              )}
            </div>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: 640 }}>

        {/* ── Step 1: Basic Info ── */}
        {step === 1 && (
          <div className="card fi">
            <div className="ct" style={{ marginBottom: 16 }}>👤 Basic Information</div>

            <div className="fg">
              <label className="fl">Full Name <span style={{ color: '#EF4444' }}>*</span></label>
              <input
                style={fieldStyle('name')} placeholder="Dr. First Last"
                value={form.name}
                onChange={e => set('name', e.target.value)}
                onBlur={() => touch('name')}
              />
              <InlineErr field="name" />
            </div>

            <div className="fg">
              <label className="fl">Email Address <span style={{ color: '#EF4444' }}>*</span></label>
              <input
                style={fieldStyle('email')} type="email" autoComplete="email"
                placeholder="you@hospital.in"
                value={form.email}
                onChange={e => set('email', e.target.value)}
                onBlur={() => touch('email')}
              />
              <InlineErr field="email" />
            </div>

            <div className="fg">
              <label className="fl">Mobile Number <span style={{ color: '#EF4444' }}>*</span></label>
              <input
                style={fieldStyle('phone')} type="tel" placeholder="+91 98765 43210"
                value={form.phone}
                onChange={e => set('phone', e.target.value)}
                onBlur={() => touch('phone')}
              />
              <InlineErr field="phone" />
            </div>

            <div className="fg">
              <label className="fl">Password <span style={{ color: '#EF4444' }}>*</span></label>
              <div style={{ position: 'relative' }}>
                <input
                  style={{ ...fieldStyle('password'), paddingRight: 40 }}
                  type={showPw ? 'text' : 'password'} autoComplete="new-password"
                  placeholder="Min 8 chars, A-Z, 0-9, !@#$"
                  value={form.password}
                  onChange={e => set('password', e.target.value)}
                  onBlur={() => touch('password')}
                />
                <span onClick={() => setShowPw(s => !s)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', color: '#6B7280', fontSize: 14 }}>
                  {showPw ? '🙈' : '👁️'}
                </span>
              </div>
              {form.password && (() => {
                const s = form.password;
                let score = 0;
                if (s.length >= 8) score++;
                if (/[A-Z]/.test(s)) score++;
                if (/[0-9]/.test(s)) score++;
                if (/[^a-zA-Z0-9]/.test(s)) score++;
                const labels = ['', 'Weak', 'Fair', 'Good', 'Strong'];
                const colors = ['', '#EF4444', '#F59E0B', '#3B82F6', '#10B981'];
                return (
                  <div style={{ marginTop: 6 }}>
                    <div style={{ display: 'flex', gap: 3, marginBottom: 3 }}>
                      {[1,2,3,4].map(i => (
                        <div key={i} style={{ flex: 1, height: 3, borderRadius: 99, background: i <= score ? colors[score] : '#E5E7EB', transition: 'background 0.2s' }} />
                      ))}
                    </div>
                    <div style={{ fontSize: 11, color: colors[score], fontWeight: 600 }}>{labels[score]}</div>
                  </div>
                );
              })()}
              {pwError && <div style={{ fontSize: 11, color: '#DC2626', marginTop: 4 }}>⚠️ {pwError}</div>}
            </div>

            <div className="fg">
              <label className="fl">Confirm Password <span style={{ color: '#EF4444' }}>*</span></label>
              <div style={{ position: 'relative' }}>
                <input
                  style={{ ...fieldStyle('confirmPassword'), paddingRight: 40 }}
                  type={showConfirmPw ? 'text' : 'password'} autoComplete="new-password"
                  placeholder="Re-enter password"
                  value={form.confirmPassword}
                  onChange={e => set('confirmPassword', e.target.value)}
                  onBlur={() => touch('confirmPassword')}
                />
                <span onClick={() => setShowConfirmPw(s => !s)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', color: '#6B7280', fontSize: 14 }}>
                  {showConfirmPw ? '🙈' : '👁️'}
                </span>
              </div>
              {touched.confirmPassword && form.confirmPassword && form.password !== form.confirmPassword && (
                <div style={{ fontSize: 11, color: '#DC2626', marginTop: 4 }}>⚠️ Passwords do not match</div>
              )}
            </div>
          </div>
        )}

        {/* ── Step 2: Personal Info ── */}
        {step === 2 && (
          <div className="card fi">
            <div className="ct" style={{ marginBottom: 16 }}>🏠 Personal Information</div>

            <div className="fg">
              <label className="fl">Date of Birth <span style={{ color: '#EF4444' }}>*</span></label>
              <input
                style={fieldStyle('dob')} type="date"
                max={new Date(new Date().setFullYear(new Date().getFullYear() - 18)).toISOString().split('T')[0]}
                value={form.dob}
                onChange={e => set('dob', e.target.value)}
                onBlur={() => touch('dob')}
              />
              <InlineErr field="dob" />
            </div>

            <div className="fg2">
              <div className="fg">
                <label className="fl">Home State <span style={{ color: '#EF4444' }}>*</span></label>
                <select
                  style={selectStyle('homeState')}
                  value={form.homeState}
                  onChange={e => {
                    const s = e.target.value;
                    setForm(f => ({ ...f, homeState: s, district: '', zone: getZone(s) || '' }));
                  }}
                  onBlur={() => touch('homeState')}
                >
                  <option value="">Select state…</option>
                  {STATES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <InlineErr field="homeState" />
              </div>

              <div className="fg">
                <label className="fl">Hometown <span style={{ color: '#EF4444' }}>*</span></label>
                <input
                  style={fieldStyle('hometown')} placeholder="City / Town"
                  value={form.hometown}
                  onChange={e => set('hometown', e.target.value)}
                  onBlur={() => touch('hometown')}
                />
                <InlineErr field="hometown" />
              </div>
            </div>

            {form.homeState && (
              <div className="fg">
                <label className="fl">District</label>
                <select
                  style={selectStyle('district')}
                  value={form.district}
                  onChange={e => set('district', e.target.value)}
                >
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
                  <span style={{ color: '#9CA3AF', fontSize: 11 }}>— auto-assigned from state</span>
                </div>
              );
            })()}
          </div>
        )}

        {/* ── Step 3: Professional Info ── */}
        {step === 3 && (
          <div className="card fi">
            <div className="ct" style={{ marginBottom: 16 }}>🎓 Professional Information</div>

            {/* Program Type Selector */}
            <div className="fg">
              <label className="fl">Program Type <span style={{ color: '#EF4444' }}>*</span></label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {['MBBS', 'MD', 'MS'].map(prog => (
                  <button
                    key={prog}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, program: prog }))}
                    style={{
                      padding: '9px 24px', borderRadius: 8, fontSize: 14, fontWeight: 600,
                      border: `2px solid ${form.program === prog ? '#2563EB' : '#E5E7EB'}`,
                      background: form.program === prog ? '#EFF6FF' : '#FAFAFA',
                      color: form.program === prog ? '#1D4ED8' : '#6B7280',
                      cursor: 'pointer', transition: 'all 0.15s',
                      boxShadow: form.program === prog ? '0 0 0 3px rgba(37,99,235,0.12)' : 'none',
                    }}
                  >
                    {prog}
                    {prog === 'MBBS' && form.program === 'MBBS' && (
                      <span style={{ marginLeft: 6, fontSize: 10, background: '#2563EB', color: '#fff', borderRadius: 4, padding: '1px 5px' }}>DEFAULT</span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* ── MBBS Fields ── */}
            {form.program === 'MBBS' && (
              <>
                <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#166534', marginBottom: 4 }}>
                  🩺 MBBS Program selected — enter your graduation details below
                </div>
                <div className="fg">
                  <label className="fl">College / University Name <span style={{ color: '#EF4444' }}>*</span></label>
                  <input
                    style={fieldStyle('mbbs_college')} placeholder="e.g. AIIMS Delhi"
                    value={form.mbbs_college}
                    onChange={e => set('mbbs_college', e.target.value)}
                    onBlur={() => touch('mbbs_college')}
                  />
                  <InlineErr field="mbbs_college" />
                </div>
                <div className="fg">
                  <label className="fl">Place <span style={{ color: '#EF4444' }}>*</span></label>
                  <input
                    style={fieldStyle('mbbs_place')} placeholder="e.g. New Delhi"
                    value={form.mbbs_place}
                    onChange={e => set('mbbs_place', e.target.value)}
                    onBlur={() => touch('mbbs_place')}
                  />
                  <InlineErr field="mbbs_place" />
                </div>
                <div className="fg">
                  <label className="fl">Year of Passing <span style={{ color: '#EF4444' }}>*</span></label>
                  <select
                    style={selectStyle('mbbs_year_passing')}
                    value={form.mbbs_year_passing}
                    onChange={e => set('mbbs_year_passing', e.target.value)}
                    onBlur={() => touch('mbbs_year_passing')}
                  >
                    <option value="">Select year…</option>
                    {YEAR_OPTIONS.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                  <InlineErr field="mbbs_year_passing" />
                </div>
              </>
            )}

            {/* ── MD Fields ── */}
            {form.program === 'MD' && (
              <>
                <div className="fg">
                  <label className="fl">Specialization <span style={{ color: '#EF4444' }}>*</span></label>
                  <select
                    style={selectStyle('md_speciality')}
                    value={form.md_speciality}
                    onChange={e => set('md_speciality', e.target.value)}
                    onBlur={() => touch('md_speciality')}
                  >
                    <option value="">Select specialization…</option>
                    {MD_SPECIALITIES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <InlineErr field="md_speciality" />
                </div>

                <div className="fg">
                  <label className="fl">College / University Name <span style={{ color: '#EF4444' }}>*</span></label>
                  <input
                    style={fieldStyle('md_college')} placeholder="e.g. AIIMS Delhi"
                    value={form.md_college}
                    onChange={e => set('md_college', e.target.value)}
                    onBlur={() => touch('md_college')}
                  />
                  <InlineErr field="md_college" />
                </div>

                <div className="fg2">
                  <div className="fg">
                    <label className="fl">Place <span style={{ color: '#EF4444' }}>*</span></label>
                    <input
                      style={fieldStyle('md_place')} placeholder="e.g. New Delhi"
                      value={form.md_place}
                      onChange={e => set('md_place', e.target.value)}
                      onBlur={() => touch('md_place')}
                    />
                    <InlineErr field="md_place" />
                  </div>
                  <div className="fg">
                    <label className="fl">Year of Joining <span style={{ color: '#EF4444' }}>*</span></label>
                    <select
                      style={selectStyle('md_year')}
                      value={form.md_year}
                      onChange={e => set('md_year', e.target.value)}
                      onBlur={() => touch('md_year')}
                    >
                      <option value="">Select year…</option>
                      {YEAR_OPTIONS.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                    <InlineErr field="md_year" />
                  </div>
                </div>

                {form.md_year && (
                  <div style={{ background: '#EFF6FF', borderRadius: 10, padding: '12px 14px', marginTop: 2 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#1D4ED8', marginBottom: 6 }}>✨ Auto-calculated</div>
                    <div style={{ display: 'flex', gap: 16, fontSize: 13 }}>
                      <div><span style={{ color: '#6B7280' }}>Current Year: </span><strong>{curYrLabel}</strong></div>
                      <div><span style={{ color: '#6B7280' }}>Expected Passout: </span><strong>{passoutYear || '—'}</strong></div>
                    </div>
                  </div>
                )}

                {/* Super Specialization — MD */}
                <div className="fg" style={{ marginTop: 8 }}>
                  <label className="fl">
                    Super Specialization
                    <span style={{ color: '#9CA3AF', fontSize: 11, fontWeight: 400, marginLeft: 6 }}>(Optional)</span>
                  </label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {['', 'DM', 'Fellowship'].map(opt => (
                      <button
                        key={opt || 'none'}
                        type="button"
                        onClick={() => set('md_super_spec', opt)}
                        style={{
                          padding: '7px 16px', borderRadius: 8, fontSize: 13, fontWeight: 500,
                          border: `2px solid ${form.md_super_spec === opt ? '#7C3AED' : '#E5E7EB'}`,
                          background: form.md_super_spec === opt ? '#F5F3FF' : '#FAFAFA',
                          color: form.md_super_spec === opt ? '#6D28D9' : '#6B7280',
                          cursor: 'pointer', transition: 'all 0.15s',
                        }}
                      >
                        {opt === '' ? 'None' : opt}
                      </button>
                    ))}
                  </div>
                </div>

                {/* DM sub-fields */}
                {form.md_super_spec === 'DM' && (
                  <div style={{ background: '#FAF5FF', border: '1px solid #E9D5FF', borderRadius: 10, padding: '14px', marginTop: 4 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#6D28D9', marginBottom: 10 }}>DM Details</div>
                    <div className="fg">
                      <label className="fl">DM Specialization <span style={{ color: '#EF4444' }}>*</span></label>
                      <select
                        style={selectStyle('dm_speciality')}
                        value={form.dm_speciality}
                        onChange={e => set('dm_speciality', e.target.value)}
                        onBlur={() => touch('dm_speciality')}
                      >
                        <option value="">Select DM specialization…</option>
                        {DM_SPECIALITIES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                      <InlineErr field="dm_speciality" />
                    </div>
                  </div>
                )}

                {/* Fellowship sub-fields */}
                {form.md_super_spec === 'Fellowship' && (
                  <div style={{ background: '#FFF7ED', border: '1px solid #FED7AA', borderRadius: 10, padding: '14px', marginTop: 4 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#C2410C', marginBottom: 10 }}>Fellowship Details</div>
                    <div className="fg">
                      <label className="fl">Fellowship Name <span style={{ color: '#EF4444' }}>*</span></label>
                      <input
                        style={fieldStyle('fellowship_name')} placeholder="e.g. Interventional Cardiology"
                        value={form.fellowship_name}
                        onChange={e => set('fellowship_name', e.target.value)}
                        onBlur={() => touch('fellowship_name')}
                      />
                      <InlineErr field="fellowship_name" />
                    </div>
                    <div className="fg">
                      <label className="fl">Institution <span style={{ color: '#EF4444' }}>*</span></label>
                      <input
                        style={fieldStyle('fellowship_institution')} placeholder="e.g. AIIMS Delhi"
                        value={form.fellowship_institution}
                        onChange={e => set('fellowship_institution', e.target.value)}
                        onBlur={() => touch('fellowship_institution')}
                      />
                      <InlineErr field="fellowship_institution" />
                    </div>
                    <div className="fg">
                      <label className="fl">Duration <span style={{ color: '#EF4444' }}>*</span></label>
                      <input
                        style={fieldStyle('fellowship_duration')} placeholder="e.g. 1 year"
                        value={form.fellowship_duration}
                        onChange={e => set('fellowship_duration', e.target.value)}
                        onBlur={() => touch('fellowship_duration')}
                      />
                      <InlineErr field="fellowship_duration" />
                    </div>
                  </div>
                )}
              </>
            )}

            {/* ── MS Fields ── */}
            {form.program === 'MS' && (
              <>
                <div className="fg">
                  <label className="fl">Specialization <span style={{ color: '#EF4444' }}>*</span></label>
                  <select
                    style={selectStyle('ms_speciality')}
                    value={form.ms_speciality}
                    onChange={e => set('ms_speciality', e.target.value)}
                    onBlur={() => touch('ms_speciality')}
                  >
                    <option value="">Select specialization…</option>
                    {MS_SPECIALITIES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <InlineErr field="ms_speciality" />
                </div>

                <div className="fg">
                  <label className="fl">College / University Name <span style={{ color: '#EF4444' }}>*</span></label>
                  <input
                    style={fieldStyle('ms_college')} placeholder="e.g. CMC Vellore"
                    value={form.ms_college}
                    onChange={e => set('ms_college', e.target.value)}
                    onBlur={() => touch('ms_college')}
                  />
                  <InlineErr field="ms_college" />
                </div>

                <div className="fg2">
                  <div className="fg">
                    <label className="fl">Place <span style={{ color: '#EF4444' }}>*</span></label>
                    <input
                      style={fieldStyle('ms_place')} placeholder="e.g. Vellore"
                      value={form.ms_place}
                      onChange={e => set('ms_place', e.target.value)}
                      onBlur={() => touch('ms_place')}
                    />
                    <InlineErr field="ms_place" />
                  </div>
                  <div className="fg">
                    <label className="fl">Year of Joining <span style={{ color: '#EF4444' }}>*</span></label>
                    <select
                      style={selectStyle('ms_year')}
                      value={form.ms_year}
                      onChange={e => set('ms_year', e.target.value)}
                      onBlur={() => touch('ms_year')}
                    >
                      <option value="">Select year…</option>
                      {YEAR_OPTIONS.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                    <InlineErr field="ms_year" />
                  </div>
                </div>

                {form.ms_year && (
                  <div style={{ background: '#EFF6FF', borderRadius: 10, padding: '12px 14px', marginTop: 2 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#1D4ED8', marginBottom: 6 }}>✨ Auto-calculated</div>
                    <div style={{ display: 'flex', gap: 16, fontSize: 13 }}>
                      <div><span style={{ color: '#6B7280' }}>Current Year: </span><strong>{curYrLabel}</strong></div>
                      <div><span style={{ color: '#6B7280' }}>Expected Passout: </span><strong>{passoutYear || '—'}</strong></div>
                    </div>
                  </div>
                )}

                {/* Super Specialization — MS */}
                <div className="fg" style={{ marginTop: 8 }}>
                  <label className="fl">
                    Super Specialization
                    <span style={{ color: '#9CA3AF', fontSize: 11, fontWeight: 400, marginLeft: 6 }}>(Optional)</span>
                  </label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {['', 'MCh', 'DNB'].map(opt => (
                      <button
                        key={opt || 'none'}
                        type="button"
                        onClick={() => set('ms_super_spec', opt)}
                        style={{
                          padding: '7px 16px', borderRadius: 8, fontSize: 13, fontWeight: 500,
                          border: `2px solid ${form.ms_super_spec === opt ? '#7C3AED' : '#E5E7EB'}`,
                          background: form.ms_super_spec === opt ? '#F5F3FF' : '#FAFAFA',
                          color: form.ms_super_spec === opt ? '#6D28D9' : '#6B7280',
                          cursor: 'pointer', transition: 'all 0.15s',
                        }}
                      >
                        {opt === '' ? 'None' : opt}
                      </button>
                    ))}
                  </div>
                </div>

                {/* MCh sub-fields */}
                {form.ms_super_spec === 'MCh' && (
                  <div style={{ background: '#FAF5FF', border: '1px solid #E9D5FF', borderRadius: 10, padding: '14px', marginTop: 4 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#6D28D9', marginBottom: 10 }}>MCh Details</div>
                    <div className="fg">
                      <label className="fl">MCh Specialization <span style={{ color: '#EF4444' }}>*</span></label>
                      <select
                        style={selectStyle('mch_speciality')}
                        value={form.mch_speciality}
                        onChange={e => set('mch_speciality', e.target.value)}
                        onBlur={() => touch('mch_speciality')}
                      >
                        <option value="">Select MCh specialization…</option>
                        {MCH_SPECIALITIES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                      <InlineErr field="mch_speciality" />
                    </div>
                    <div className="fg">
                      <label className="fl">College <span style={{ color: '#EF4444' }}>*</span></label>
                      <input
                        style={fieldStyle('mch_college')} placeholder="College name"
                        value={form.mch_college}
                        onChange={e => set('mch_college', e.target.value)}
                        onBlur={() => touch('mch_college')}
                      />
                      <InlineErr field="mch_college" />
                    </div>
                    <div className="fg2">
                      <div className="fg">
                        <label className="fl">Place <span style={{ color: '#EF4444' }}>*</span></label>
                        <input
                          style={fieldStyle('mch_place')} placeholder="City"
                          value={form.mch_place}
                          onChange={e => set('mch_place', e.target.value)}
                          onBlur={() => touch('mch_place')}
                        />
                        <InlineErr field="mch_place" />
                      </div>
                      <div className="fg">
                        <label className="fl">Year <span style={{ color: '#EF4444' }}>*</span></label>
                        <select
                          style={selectStyle('mch_year')}
                          value={form.mch_year}
                          onChange={e => set('mch_year', e.target.value)}
                          onBlur={() => touch('mch_year')}
                        >
                          <option value="">Select year…</option>
                          {YEAR_OPTIONS.map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                        <InlineErr field="mch_year" />
                      </div>
                    </div>
                  </div>
                )}

                {/* DNB sub-fields */}
                {form.ms_super_spec === 'DNB' && (
                  <div style={{ background: '#FAF5FF', border: '1px solid #E9D5FF', borderRadius: 10, padding: '14px', marginTop: 4 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#6D28D9', marginBottom: 10 }}>DNB Details</div>
                    <div className="fg">
                      <label className="fl">DNB Specialization <span style={{ color: '#EF4444' }}>*</span></label>
                      <select
                        style={selectStyle('dnb_speciality')}
                        value={form.dnb_speciality}
                        onChange={e => set('dnb_speciality', e.target.value)}
                        onBlur={() => touch('dnb_speciality')}
                      >
                        <option value="">Select DNB specialization…</option>
                        {DNB_SPECIALITIES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                      <InlineErr field="dnb_speciality" />
                    </div>
                    <div className="fg">
                      <label className="fl">College <span style={{ color: '#EF4444' }}>*</span></label>
                      <input
                        style={fieldStyle('dnb_college')} placeholder="College name"
                        value={form.dnb_college}
                        onChange={e => set('dnb_college', e.target.value)}
                        onBlur={() => touch('dnb_college')}
                      />
                      <InlineErr field="dnb_college" />
                    </div>
                    <div className="fg2">
                      <div className="fg">
                        <label className="fl">Place <span style={{ color: '#EF4444' }}>*</span></label>
                        <input
                          style={fieldStyle('dnb_place')} placeholder="City"
                          value={form.dnb_place}
                          onChange={e => set('dnb_place', e.target.value)}
                          onBlur={() => touch('dnb_place')}
                        />
                        <InlineErr field="dnb_place" />
                      </div>
                      <div className="fg">
                        <label className="fl">Year <span style={{ color: '#EF4444' }}>*</span></label>
                        <select
                          style={selectStyle('dnb_year')}
                          value={form.dnb_year}
                          onChange={e => set('dnb_year', e.target.value)}
                          onBlur={() => touch('dnb_year')}
                        >
                          <option value="">Select year…</option>
                          {YEAR_OPTIONS.map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                        <InlineErr field="dnb_year" />
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ── Step 4: Verification ── */}
        {step === 4 && (
          <div className="card fi">
            <div className="ct" style={{ marginBottom: 8 }}>🪪 MCI / NMC Verification</div>
            <div style={{ fontSize: 13, color: '#6B7280', marginBottom: 16, lineHeight: 1.6 }}>
              Your MCI/NMC registration number is required for identity verification. An admin will review your profile before granting access.
            </div>

            {/* Profile completion check */}
            <div style={{
              background: pct === 100 ? '#F0FDF4' : '#FFFBEB',
              border: `1px solid ${pct === 100 ? '#BBF7D0' : '#FDE68A'}`,
              borderRadius: 10, padding: '12px 14px', marginBottom: 16,
            }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: pct === 100 ? '#166534' : '#92400E', marginBottom: 6 }}>
                {pct === 100 ? '✅ Profile Complete' : `⚠️ Profile ${pct}% Complete`}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {[
                  { label: 'Basic Info', ok: !!(form.name && form.email && form.phone && form.password) },
                  { label: 'Personal Info', ok: !!(form.homeState && form.hometown && form.dob) },
                  { label: 'Professional Info', ok: form.program === 'MBBS'
                    ? !!(form.mbbs_college && form.mbbs_place && form.mbbs_year_passing)
                    : form.program === 'MD'
                      ? !!(form.md_speciality && form.md_college && form.md_place && form.md_year)
                      : !!(form.ms_speciality && form.ms_college && form.ms_place && form.ms_year)
                  },
                  { label: 'MCI Number', ok: !!(form.mciNumber && MCI_REGEX.test(form.mciNumber)) },
                ].map(({ label, ok }) => (
                  <span key={label} style={{
                    fontSize: 11, padding: '2px 8px', borderRadius: 99, fontWeight: 600,
                    background: ok ? '#D1FAE5' : '#FEE2E2',
                    color: ok ? '#065F46' : '#991B1B',
                  }}>
                    {ok ? '✓' : '○'} {label}
                  </span>
                ))}
              </div>
            </div>

            <div className="fg">
              <label className="fl">MCI / NMC Number <span style={{ color: '#EF4444' }}>*</span></label>
              <input
                style={fieldStyle('mciNumber')}
                placeholder="e.g. MH-2024-123456"
                value={form.mciNumber}
                onChange={e => set('mciNumber', e.target.value.toUpperCase())}
                onBlur={() => touch('mciNumber')}
              />
              <div style={{ fontSize: 11, color: '#6B7280', marginTop: 4 }}>
                Format: STATE-YEAR-NUMBER (e.g. MH-2024-123456)
              </div>
              <InlineErr field="mciNumber" />
            </div>

            {/* Certificate upload */}
            <div className="fg" style={{ marginTop: 8 }}>
              <label className="fl">
                MCI/NMC Certificate{' '}
                <span style={{ color: '#9CA3AF', fontSize: 11, fontWeight: 400 }}>(optional but recommended)</span>
              </label>
              <div
                style={{
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
              <label className="fl">
                NEET-PG All India Rank{' '}
                <span style={{ color: '#9CA3AF', fontSize: 11, fontWeight: 400 }}>(optional)</span>
              </label>
              <input
                className="fi-in" type="number" placeholder="e.g. 142"
                value={form.neetRank}
                onChange={e => set('neetRank', e.target.value)}
              />
            </div>

            {/* Summary */}
            {form.name && (
              <div style={{ background: '#F8FAFC', borderRadius: 10, padding: '12px 14px', fontSize: 12, color: '#374151', marginTop: 8, lineHeight: 1.7 }}>
                <div style={{ fontWeight: 700, marginBottom: 4 }}>📋 Registration Summary</div>
                <div>👤 {form.name} · {form.email}</div>
                <div>🎓 {form.program}{form.md_speciality ? ` — ${form.md_speciality}` : form.ms_speciality ? ` — ${form.ms_speciality}` : ''}</div>
                <div>🏛️ {form.mbbs_college || form.md_college || form.ms_college || '—'}</div>
                <div>📅 {form.program === 'MBBS' ? `Passed: ${form.mbbs_year_passing || '—'}` : `Joined: ${form.md_year || form.ms_year || '—'} · Passout: ${passoutYear || '—'}`}</div>
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
            : (
              <button
                className="btn btn-p"
                onClick={handleSubmit}
                disabled={loading}
                style={loading ? { opacity: 0.7, cursor: 'not-allowed' } : {}}
              >
                {loading && <Spinner />}
                {loading ? 'Submitting…' : 'Submit Registration ✓'}
              </button>
            )
          }
        </div>
      </div>
    </div>
  );
}
