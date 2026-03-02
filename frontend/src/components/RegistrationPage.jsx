import { useState, Fragment } from 'react';
import { STATES, SPECIALITIES, PROG_YEARS, getZone } from '../data/constants';
import { registerUser } from '../lib/supabase';

export default function RegistrationPage({ addToast, setPage, onRegisterSuccess }) {
  const now = new Date().getFullYear();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    name: '', email: '', password: '', confirmPassword: '',
    phone: '', mciNumber: '',
    program: 'MD', speciality: '',
    college: '', joining: 2024,
    hometown: '', homeState: '', neetRank: '', address: '',
  });

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const duration = PROG_YEARS[form.program] || 3;
  const completion = form.joining ? parseInt(form.joining) + duration : '—';
  const curYr = form.joining ? now - parseInt(form.joining) + 1 : null;
  const curYrLabel = !curYr ? '—' : curYr <= 0 ? 'Not started' : curYr === 1 ? '1st Year' : curYr === 2 ? '2nd Year' : curYr === 3 ? '3rd Year' : 'Completed';

  const nextStep = () => {
    setError('');
    if (step === 1) {
      if (!form.name || !form.email || !form.password || !form.phone) {
        addToast('error', 'Name, email, phone, and password are mandatory.');
        return;
      }
      if (form.password.length < 6) {
        addToast('error', 'Password must be at least 6 characters.');
        return;
      }
      if (form.password !== form.confirmPassword) {
        addToast('error', 'Passwords do not match.');
        return;
      }
    }
    if (step === 2 && (!form.program || !form.speciality || !form.college || !form.joining)) {
      addToast('error', 'All academic fields are mandatory.');
      return;
    }
    if (step === 3 && (!form.hometown || !form.homeState)) {
      addToast('error', 'Hometown and Home State are mandatory.');
      return;
    }
    setStep(s => s + 1);
  };

  const handleSubmit = async () => {
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await registerUser(form.email, form.password, {
        name: form.name,
        mci_number: form.mciNumber || '',
        phone: form.phone,
        program: form.program,
        speciality: form.speciality,
        college: form.college,
        joining_year: Number(form.joining),
        state: form.homeState,
        hometown: form.hometown,
        zone: getZone(form.homeState),
        neet_rank: form.neetRank || '',
      });
      // Notify App.jsx so the new user appears in UsersPage and SADashboard
      if (onRegisterSuccess) {
        onRegisterSuccess({
          id: `local_${Date.now()}`,
          name: form.name,
          email: form.email,
          role: 'PG Aspirant',
          mci: form.mciNumber || '—',
          hometown: form.hometown,
          state: form.homeState,
          zone: getZone(form.homeState),
          speciality: form.speciality,
          college: form.college,
          status: 'pending',
          verified: false,
          score: 0,
          date: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
        });
      }
      setSuccess(true);
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const steps = ['Personal', 'Academic', 'Location', 'Review'];

  // Success screen
  if (success) return (
    <div className="page">
      <div style={{ maxWidth: 540 }}>
        <div style={{
          background: '#DCFCE7', border: '1px solid #86EFAC',
          borderRadius: 8, padding: '20px 24px', textAlign: 'center',
        }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>✅</div>
          <div style={{ fontWeight: 700, color: '#166534', fontSize: 16, marginBottom: 8 }}>
            Registration Successful!
          </div>
          <div style={{ color: '#166534', fontSize: 14, marginBottom: 16 }}>
            Your account has been created. You can now log in.
          </div>
          <button className="btn btn-p" onClick={() => setPage('login')}>
            Go to Login
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="page">
      <div className="ph">
        <div className="pt">📋 New Registration</div>
        <div className="ps">PG Aspirant Onboarding — All fields marked * are mandatory</div>
      </div>

      {/* Step progress indicator */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, alignItems: 'center' }}>
        {steps.map((s, i) => (
          <Fragment key={s}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: i + 1 <= step ? '#2563EB' : '#F9FAFB', color: i + 1 <= step ? '#fff' : '#6B7280', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter,sans-serif', fontWeight: 700, fontSize: 12, transition: 'all .2s' }}>
                {i + 1 < step ? '✓' : i + 1}
              </div>
              <span style={{ fontSize: 12, fontWeight: 600, color: i + 1 === step ? '#111827' : '#6B7280' }}>{s}</span>
            </div>
            {i < steps.length - 1 && <div style={{ flex: 1, height: 2, background: i + 1 < step ? '#2563EB' : '#E5E7EB', borderRadius: 99, transition: 'background .3s' }} />}
          </Fragment>
        ))}
      </div>

      <div style={{ maxWidth: 640 }}>

        {/* ── STEP 1: Personal Details ── */}
        {step === 1 && (
          <div className="card fi">
            <div className="ct" style={{ marginBottom: 16 }}>👤 Personal Details</div>
            <div className="fg">
              <label className="fl">Full Name (with title) <span className="req">*</span></label>
              <input className="fi-in" placeholder="Dr. First Last" value={form.name} onChange={e => set('name', e.target.value)} />
            </div>
            <div className="fg2">
              <div className="fg">
                <label className="fl">Email Address <span className="req">*</span></label>
                <input className="fi-in" type="email" placeholder="you@hospital.in" value={form.email} onChange={e => set('email', e.target.value)} />
              </div>
              <div className="fg">
                <label className="fl">Phone Number <span className="req">*</span></label>
                <input className="fi-in" placeholder="+91 98765 43210" value={form.phone} onChange={e => set('phone', e.target.value)} />
              </div>
            </div>
            <div className="fg2">
              <div className="fg">
                <label className="fl">Password <span className="req">*</span></label>
                <input className="fi-in" type="password" placeholder="Min 6 characters" value={form.password} onChange={e => set('password', e.target.value)} />
              </div>
              <div className="fg">
                <label className="fl">Confirm Password <span className="req">*</span></label>
                <input className="fi-in" type="password" placeholder="Re-enter password" value={form.confirmPassword} onChange={e => set('confirmPassword', e.target.value)} />
              </div>
            </div>
            <div className="fg2">
              <div className="fg">
                <label className="fl">MCI / NMC Number</label>
                <input className="fi-in" placeholder="e.g. MCI-2024-78432" value={form.mciNumber} onChange={e => set('mciNumber', e.target.value)} />
              </div>
              <div className="fg">
                <label className="fl">NEET-PG All India Rank</label>
                <input className="fi-in" type="number" placeholder="e.g. 142" value={form.neetRank} onChange={e => set('neetRank', e.target.value)} />
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 2: Academic Details ── */}
        {step === 2 && (
          <div className="card fi">
            <div className="ct" style={{ marginBottom: 16 }}>🎓 Academic Details</div>
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
              <label className="fl">Year of Joining <span className="req">*</span></label>
              <select className="fi-sel" value={form.joining} onChange={e => set('joining', parseInt(e.target.value))}>
                {[2019, 2020, 2021, 2022, 2023, 2024, 2025].map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <div style={{ background: '#EFF6FF', borderRadius: 12, padding: '14px', marginTop: 4 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#1D4ED8', marginBottom: 8 }}>✨ Auto-calculated from Year of Joining</div>
              <div className="fg2" style={{ gap: 10 }}>
                <div><label className="fl">Current Academic Year</label><input className="fi-in auto" value={curYrLabel} readOnly /></div>
                <div><label className="fl">Expected Completion</label><input className="fi-in auto" value={completion} readOnly /></div>
              </div>
              <div style={{ fontSize: 11, color: '#1D4ED8', marginTop: 4 }}>📅 {form.program} duration: {duration} years · Access expires: {completion !== '—' ? parseInt(completion) + 2 : '—'}</div>
            </div>
          </div>
        )}

        {/* ── STEP 3: Location Details ── */}
        {step === 3 && (
          <div className="card fi">
            <div className="ct" style={{ marginBottom: 4 }}>📍 Location Details</div>
            <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 14 }}>Hometown and Home State are mandatory for zone allocation and regional reporting.</div>
            <div className="fg2">
              <div className="fg">
                <label className="fl">Hometown <span className="req">*</span></label>
                <input className="fi-in" placeholder="City / Town" value={form.hometown} onChange={e => set('hometown', e.target.value)} />
              </div>
              <div className="fg">
                <label className="fl">Home State <span className="req">*</span></label>
                <select className="fi-sel" value={form.homeState} onChange={e => set('homeState', e.target.value)}>
                  <option value="">Select state…</option>
                  {STATES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
            {form.homeState && (
              <div style={{ background: '#EFF6FF', borderRadius: 10, padding: '10px 14px', fontSize: 12, color: '#1D4ED8', marginBottom: 12 }}>
                ✨ Zone auto-assigned: <strong>{getZone(form.homeState)}</strong>
              </div>
            )}
            <div className="fg">
              <label className="fl">Current Address (optional)</label>
              <textarea className="fi-ta" placeholder="Optional — Current city / hospital address" value={form.address} onChange={e => set('address', e.target.value)} />
            </div>
            <div style={{ background: '#FFFBEB', borderRadius: 10, padding: '10px 14px', fontSize: 12, color: '#92400E' }}>
              ⏰ <strong>Access Policy:</strong> Platform access is available for 2 years after your passing out year ({completion}). Access will expire in {completion !== '—' ? parseInt(completion) + 2 : 'N/A'}.
            </div>
          </div>
        )}

        {/* ── STEP 4: Review & Submit ── */}
        {step === 4 && (
          <div className="card fi">
            <div className="ct" style={{ marginBottom: 14 }}>📋 Review & Submit</div>
            {[
              ['Name', form.name], ['Email', form.email], ['Phone', form.phone],
              ['MCI Number', form.mciNumber], ['Program', form.program],
              ['Speciality', form.speciality], ['College', form.college],
              ['Year of Joining', form.joining], ['Current Year', curYrLabel],
              ['Expected Completion', completion], ['Hometown', form.hometown],
              ['Home State', form.homeState], ['Zone', getZone(form.homeState)],
            ].map(([l, v]) => (
              <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #F9FAFB' }}>
                <span style={{ fontSize: 13, color: '#6B7280' }}>{l}</span>
                <span style={{ fontSize: 13, fontWeight: 600 }}>{v || '—'}</span>
              </div>
            ))}
            <div style={{ marginTop: 14, background: '#F9FAFB', borderRadius: 10, padding: '12px', fontSize: 12, color: '#6B7280' }}>
              By submitting, you agree that profile verification will begin only after all details are reviewed by the Admin.
            </div>
          </div>
        )}

        {/* Red error banner above the nav buttons */}
        {error && (
          <div style={{
            background: '#FEF2F2', border: '1px solid #FECACA',
            borderRadius: 6, padding: '10px 14px', marginBottom: 12,
            color: '#DC2626', fontSize: 13,
          }}>
            ⚠️ {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, justifyContent: 'space-between', marginTop: 16 }}>
          {step > 1 ? <button className="btn btn-s" onClick={() => setStep(s => s - 1)}>← Back</button> : <div />}
          {step < 4
            ? <button className="btn btn-p" onClick={nextStep}>Continue →</button>
            : <button className="btn btn-p" onClick={handleSubmit} disabled={loading}>
                {loading ? 'Submitting…' : 'Submit Registration ✓'}
              </button>
          }
        </div>
      </div>
    </div>
  );
}
