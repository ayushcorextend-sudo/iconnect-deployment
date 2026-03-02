import { useState } from 'react';
import Avatar from './Avatar';
import { STATES, SPECIALITIES, PROG_YEARS, getZone } from '../data/constants';

export default function ProfilePage({ addToast }) {
  const now = new Date().getFullYear();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    name: 'Dr. Sneha Verma', email: 'sneha@iconnect.in', phone: '+91 98765 43210',
    program: 'MD', speciality: 'Internal Medicine', college: 'PGIMER Chandigarh',
    joining: 2023, currentYear: '2nd Year', hometown: 'Jaipur', homeState: 'Rajasthan',
    zone: 'North', bio: 'Passionate about internal medicine. NEET-PG AIR 142. Aspiring to make a difference in patient care.',
    neetRank: 142, address: '',
  });

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const duration = PROG_YEARS[form.program] || 3;
  const completion = form.joining + duration;
  const curYr = now - form.joining + 1;
  const curYrLabel = curYr <= 0 ? 'Not started yet' : curYr === 1 ? '1st Year' : curYr === 2 ? '2nd Year' : curYr === 3 ? '3rd Year' : 'Completed';

  const complete = form.name && form.phone && form.hometown && form.homeState && form.speciality && form.college && form.joining && form.program;

  const save = () => {
    if (!form.hometown || !form.homeState) { addToast('error', 'Hometown and Home State are mandatory!'); return; }
    setEditing(false);
    addToast('success', 'Profile saved!');
  };

  return (
    <div className="page">
      <div className="prof-hero">
        <Avatar name={form.name} size={78} style={{ border: '3px solid rgba(37,99,235,.4)', flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: 'Inter,sans-serif', fontSize: 21, fontWeight: 800 }}>{form.name}</div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,.5)', marginTop: 2 }}>{form.speciality} · {form.program} · {curYrLabel}</div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,.5)' }}>{form.college}</div>
          <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
            {complete
              ? <div className="prof-badge">✅ Verified Doctor</div>
              : <div className="prof-badge verify-pend">⚠️ Complete profile to get verified</div>
            }
            {form.neetRank && <div className="prof-badge">🏆 NEET-PG AIR {form.neetRank}</div>}
          </div>
        </div>
        <button className="btn btn-s btn-sm" style={{ alignSelf: 'flex-start' }} onClick={() => editing ? save() : setEditing(true)}>
          {editing ? '💾 Save' : '✏️ Edit Profile'}
        </button>
      </div>

      {!complete && (
        <div style={{ background: '#FFFBEB', border: '1px solid rgba(255,179,71,.3)', borderRadius: 12, padding: '12px 16px', fontSize: 13, color: '#92400E', marginBottom: 16 }}>
          ⚠️ <strong>Profile incomplete.</strong> Fill all required fields to unlock verification. Mandatory: Hometown, Home State, Phone, Speciality, College.
        </div>
      )}

      <div className="grid2">
        <div className="card">
          <div className="ct" style={{ marginBottom: 14 }}>👤 Personal Information</div>
          {editing ? (
            <>
              <div className="fg"><label className="fl">Full Name <span className="req">*</span></label><input className="fi-in" value={form.name} onChange={e => set('name', e.target.value)} /></div>
              <div className="fg"><label className="fl">Email Address <span className="req">*</span></label><input className="fi-in" value={form.email} onChange={e => set('email', e.target.value)} /></div>
              <div className="fg"><label className="fl">Phone <span className="req">*</span></label><input className="fi-in" value={form.phone} onChange={e => set('phone', e.target.value)} /></div>
              <div className="fg2">
                <div className="fg"><label className="fl">Hometown <span className="req">*</span></label><input className="fi-in" placeholder="Mandatory" value={form.hometown} onChange={e => set('hometown', e.target.value)} /></div>
                <div className="fg">
                  <label className="fl">Home State <span className="req">*</span></label>
                  <select className="fi-sel" value={form.homeState} onChange={e => { set('homeState', e.target.value); set('zone', getZone(e.target.value)); }}>
                    <option value="">Select state…</option>
                    {STATES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div className="fg"><label className="fl">Zone (auto)</label><input className="fi-in auto" value={form.zone} readOnly /></div>
              <div className="fg"><label className="fl">Current Address (optional)</label><textarea className="fi-ta" placeholder="Optional" value={form.address} onChange={e => set('address', e.target.value)} /></div>
            </>
          ) : (
            <>
              {[['📧 Email', form.email], ['📞 Phone', form.phone], ['🏡 Hometown', form.hometown || 'Not set ⚠️'], ['📍 Home State', form.homeState || 'Not set ⚠️'], ['🗺 Zone', form.zone]].map(([l, v]) => (
                <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #F9FAFB' }}>
                  <span style={{ fontSize: 13, color: '#6B7280' }}>{l}</span>
                  <span style={{ fontSize: 13, fontWeight: 500, color: v.includes('⚠️') ? '#92400E' : '#111827' }}>{v}</span>
                </div>
              ))}
            </>
          )}
        </div>

        <div className="card">
          <div className="ct" style={{ marginBottom: 14 }}>🎓 Academic Information</div>
          {editing ? (
            <>
              <div className="fg"><label className="fl">College / Institution <span className="req">*</span></label><input className="fi-in" value={form.college} onChange={e => set('college', e.target.value)} /></div>
              <div className="fg2">
                <div className="fg">
                  <label className="fl">Program <span className="req">*</span></label>
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
                <label className="fl">Year of Joining <span className="req">*</span></label>
                <select className="fi-sel" value={form.joining} onChange={e => set('joining', parseInt(e.target.value))}>
                  {[2020, 2021, 2022, 2023, 2024, 2025].map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
              <div className="fg2">
                <div className="fg"><label className="fl">Current Year (auto)</label><input className="fi-in auto" value={curYrLabel} readOnly /><div className="form-note">✨ Auto-calculated</div></div>
                <div className="fg"><label className="fl">Expected Completion (auto)</label><input className="fi-in auto" value={completion} readOnly /><div className="form-note">✨ {form.program} = {duration} years</div></div>
              </div>
              <div className="fg"><label className="fl">NEET-PG Rank</label><input className="fi-in" type="number" value={form.neetRank || ''} onChange={e => set('neetRank', e.target.value)} /></div>
            </>
          ) : (
            <>
              {[['🏥 College', form.college], ['📚 Program', form.program], ['🩺 Speciality', form.speciality], ['📅 Year of Joining', form.joining], ['📌 Current Year', curYrLabel + ' ✨'], ['🎓 Expected Completion', completion + ' ✨'], ['🏆 NEET-PG Rank', 'AIR ' + form.neetRank]].map(([l, v]) => (
                <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #F9FAFB' }}>
                  <span style={{ fontSize: 13, color: '#6B7280' }}>{l}</span>
                  <span style={{ fontSize: 13, fontWeight: 500, color: String(v).includes('✨') ? '#1D4ED8' : '#111827' }}>{v}</span>
                </div>
              ))}
            </>
          )}
        </div>
      </div>

      <div className="card mt4">
        <div className="ct" style={{ marginBottom: 14 }}>🔐 Profile Verification Steps</div>
        {[
          { label: 'Personal details filled', done: !!(form.name && form.phone && form.email) },
          { label: 'Hometown & Home State provided', done: !!(form.hometown && form.homeState) },
          { label: 'Academic information complete', done: !!(form.college && form.program && form.speciality && form.joining) },
          { label: 'All mandatory fields verified', done: !!complete },
          { label: 'Admin approval', done: false },
        ].map((s, i) => (
          <div key={i} className={`vstep ${s.done ? 'done' : complete && i === 4 ? 'pend' : 'miss'}`}>
            <div className="vstep-ic">{s.done ? '✅' : complete && i === 4 ? '⏳' : '○'}</div>
            <div style={{ fontSize: 13, fontWeight: 500, color: s.done ? '#1D4ED8' : complete && i === 4 ? '#92400E' : '#6B7280' }}>{s.label}</div>
          </div>
        ))}
        <div style={{ marginTop: 12, padding: '10px 12px', background: '#F9FAFB', borderRadius: 10, fontSize: 12, color: '#6B7280' }}>
          ⏰ Platform access: 2 years from passing out year ({completion}). Access expires: <strong>{completion + 2}</strong>.
        </div>
      </div>

      <div className="card mt4">
        <div className="ct" style={{ marginBottom: 14 }}>📊 My Stats</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14 }}>
          {[['🏆', 'Rank', '#4'], ['⭐', 'Score', '8,750'], ['📚', 'Books', '14'], ['🔥', 'Streak', '7 days']].map(([i, l, v]) => (
            <div key={l} style={{ textAlign: 'center', background: '#F9FAFB', borderRadius: 12, padding: 14 }}>
              <div style={{ fontSize: 26 }}>{i}</div>
              <div style={{ fontFamily: 'Inter,sans-serif', fontSize: 18, fontWeight: 800, color: '#2563EB', margin: '5px 0 2px' }}>{v}</div>
              <div style={{ fontSize: 11, color: '#6B7280', fontWeight: 600 }}>{l}</div>
            </div>
          ))}
        </div>
        {!editing && <p style={{ marginTop: 14, fontSize: 13, color: '#6B7280', lineHeight: 1.6 }}>{form.bio}</p>}
        {editing && <div className="fg" style={{ marginTop: 14 }}><label className="fl">Bio</label><textarea className="fi-ta" value={form.bio} onChange={e => set('bio', e.target.value)} /></div>}
      </div>
    </div>
  );
}
