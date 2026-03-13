import { useState, useEffect } from 'react';
import Avatar from './Avatar';
import { STATES, SPECIALITIES, PROG_YEARS, DISTRICTS_BY_STATE } from '../data/constants';
import { supabase } from '../lib/supabase';

const ROLE_LABELS = {
  superadmin:   { label: 'Super Admin',   icon: '🛡️', color: '#7C3AED', bg: '#F5F3FF' },
  contentadmin: { label: 'Content Admin', icon: '📚', color: '#0369A1', bg: '#E0F2FE' },
};

export default function ProfilePage({ addToast }) {
  const now = new Date().getFullYear();
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState(null);
  const [role, setRole] = useState('doctor');
  const [form, setForm] = useState({
    name: '', email: '', phone: '',
    program: 'MD', speciality: '', college: '',
    joining: '', hometown: '', homeState: '',
    district: '', neet_rank: '',
    verified: false,
  });
  // Doctor stats
  const [stats, setStats] = useState({ rank: null, score: 0, books: 0 });
  const [completedSubjects, setCompletedSubjects] = useState([]);
  // Admin stats
  const [adminStats, setAdminStats] = useState({ total: 0, approved: 0, pending: 0 });

  const isAdmin = role === 'superadmin' || role === 'contentadmin';

  useEffect(() => {
    async function loadProfile() {
      try {
        const { data: authData } = await supabase.auth.getUser();
        if (!authData?.user) { setLoading(false); return; }
        const uid = authData.user.id;
        setUserId(uid);

        const { data: profile } = await supabase
          .from('profiles').select('*').eq('id', uid).maybeSingle();

        const userRole = profile?.role || 'doctor';
        setRole(userRole);
        const admin = userRole === 'superadmin' || userRole === 'contentadmin';

        if (profile) {
          setForm({
            name: profile.name || '',
            email: profile.email || authData.user.email || '',
            phone: profile.phone || '',
            program: profile.program || 'MD',
            speciality: profile.speciality || '',
            college: profile.college || profile.place_of_study || '',
            joining: profile.joining_year || '',
            hometown: profile.hometown || '',
            homeState: profile.state || '',
            district: profile.district || '',
            neet_rank: profile.neet_rank || '',
            verified: profile.verified || false,
          });
        } else {
          setForm(f => ({ ...f, email: authData.user.email || '' }));
        }

        if (admin) {
          // Load admin-specific stats from artifacts table
          try {
            let baseQuery = supabase.from('artifacts').select('id', { count: 'exact', head: true });
            let approvedQ = supabase.from('artifacts').select('id', { count: 'exact', head: true }).eq('status', 'approved');
            let pendingQ  = supabase.from('artifacts').select('id', { count: 'exact', head: true }).eq('status', 'pending');

            // Content admin: only their own uploads
            if (userRole === 'contentadmin') {
              baseQuery   = baseQuery.eq('uploaded_by_id', uid);
              approvedQ   = approvedQ.eq('uploaded_by_id', uid);
              pendingQ    = pendingQ.eq('uploaded_by_id', uid);
            }

            const [totRes, appRes, pendRes] = await Promise.all([baseQuery, approvedQ, pendingQ]);
            setAdminStats({
              total:    totRes.count  || 0,
              approved: appRes.count  || 0,
              pending:  pendRes.count || 0,
            });
          } catch (_) {}

        } else {
          // Load doctor-specific stats
          supabase.from('subject_completion')
            .select('subject, completed_at').eq('user_id', uid).eq('completed', true)
            .order('completed_at', { ascending: false })
            .then(({ data: rows }) => { if (rows?.length) setCompletedSubjects(rows); })
            .catch(() => {});

          try {
            const { data: scoreRow } = await supabase
              .from('user_scores').select('total_score').eq('user_id', uid).maybeSingle();
            const { count: booksCount } = await supabase
              .from('activity_logs').select('id', { count: 'exact', head: true })
              .eq('user_id', uid).eq('activity_type', 'article_read');
            const score = scoreRow?.total_score || 0;
            let rank = null;
            if (score > 0) {
              const { count: higherCount } = await supabase
                .from('user_scores').select('user_id', { count: 'exact', head: true })
                .gt('total_score', score);
              rank = (higherCount || 0) + 1;
            }
            setStats({ rank, score, books: booksCount || 0 });
          } catch (_) {}
        }

      } catch (e) {
        console.warn('Profile load failed:', e.message);
      } finally {
        setLoading(false);
      }
    }
    loadProfile();
  }, []);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const joiningNum   = parseInt(form.joining) || 0;
  const duration     = PROG_YEARS[form.program] || 3;
  const completion   = joiningNum ? joiningNum + duration : '—';
  const curYr        = joiningNum ? now - joiningNum + 1 : null;
  const curYrLabel   = !curYr ? '—' : curYr <= 0 ? 'Not started yet' : curYr === 1 ? '1st Year' : curYr === 2 ? '2nd Year' : curYr === 3 ? '3rd Year' : 'Completed';

  // Completeness check is only meaningful for doctors
  const complete = isAdmin || !!(form.name && form.phone && form.hometown && form.homeState && form.speciality && form.college && form.joining && form.program);

  const save = async () => {
    if (!form.hometown || !form.homeState) { addToast('error', 'Hometown and Home State are mandatory!'); return; }
    setSaving(true);
    try {
      const base = {
        id: userId,
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        hometown: form.hometown.trim(),
        state: form.homeState,
        district: form.district,
      };
      // Only persist academic fields for doctors
      const payload = isAdmin ? base : {
        ...base,
        program: form.program,
        speciality: form.speciality,
        college: form.college.trim(),
        joining_year: joiningNum || null,
        neet_rank: form.neet_rank || null,
      };
      const { error } = await supabase.from('profiles').upsert(payload, { onConflict: 'id' });
      if (error) throw error;
      setEditing(false);
      addToast('success', 'Profile saved!');
    } catch (e) {
      addToast('error', e.message || 'Could not save profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="page" style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
      <div style={{ width: 36, height: 36, borderRadius: '50%', border: '3px solid #E5E7EB', borderTopColor: '#2563EB', animation: 'spin 0.8s linear infinite' }} />
    </div>
  );

  const roleMeta = ROLE_LABELS[role];

  return (
    <div className="page">
      {/* ── Hero ───────────────────────────────────────────────── */}
      <div className="prof-hero">
        <Avatar name={form.name || form.email} size={78} style={{ border: '3px solid rgba(37,99,235,.4)', flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: 'Inter,sans-serif', fontSize: 21, fontWeight: 800 }}>{form.name || 'Your Profile'}</div>

          {isAdmin ? (
            <>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,.5)', marginTop: 2 }}>
                {roleMeta.icon} {roleMeta.label} · iConnect Platform
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                <div className="prof-badge" style={{ background: roleMeta.bg, color: roleMeta.color, borderColor: roleMeta.color + '40' }}>
                  {roleMeta.icon} {roleMeta.label}
                </div>
              </div>
            </>
          ) : (
            <>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,.5)', marginTop: 2 }}>{form.speciality || '—'} · {form.program} · {curYrLabel}</div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,.5)' }}>{form.college || '—'}</div>
              <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                {form.verified
                  ? <div className="prof-badge">✅ Verified Doctor</div>
                  : <div className="prof-badge verify-pend">⚠️ Complete profile to get verified</div>
                }
                {form.neet_rank && <div className="prof-badge">🏆 NEET-PG AIR {form.neet_rank}</div>}
              </div>
            </>
          )}
        </div>
        <button className="btn btn-s btn-sm" style={{ alignSelf: 'flex-start' }} onClick={() => editing ? save() : setEditing(true)} disabled={saving}>
          {saving ? '⏳ Saving…' : editing ? '💾 Save' : '✏️ Edit Profile'}
        </button>
      </div>

      {/* Incomplete banner — doctors only */}
      {!isAdmin && !complete && (
        <div style={{ background: '#FFFBEB', border: '1px solid rgba(255,179,71,.3)', borderRadius: 12, padding: '12px 16px', fontSize: 13, color: '#92400E', marginBottom: 16 }}>
          ⚠️ <strong>Profile incomplete.</strong> Fill all required fields to unlock verification. Mandatory: Name, Phone, Hometown, Home State, Speciality, College.
        </div>
      )}

      {/* ── Info Cards ─────────────────────────────────────────── */}
      <div className={isAdmin ? '' : 'grid2'}>
        {/* Personal Information — always shown */}
        <div className="card">
          <div className="ct" style={{ marginBottom: 14 }}>👤 Personal Information</div>
          {editing ? (
            <>
              <div className="fg"><label className="fl">Full Name <span className="req">*</span></label><input className="fi-in" value={form.name} onChange={e => set('name', e.target.value)} /></div>
              <div className="fg"><label className="fl">Email Address</label><input className="fi-in" value={form.email} readOnly style={{ background: '#F9FAFB', color: '#6B7280' }} /></div>
              <div className="fg"><label className="fl">Phone <span className="req">*</span></label><input className="fi-in" value={form.phone} onChange={e => set('phone', e.target.value)} /></div>
              <div className="fg2">
                <div className="fg"><label className="fl">Hometown <span className="req">*</span></label><input className="fi-in" placeholder="Mandatory" value={form.hometown} onChange={e => set('hometown', e.target.value)} /></div>
                <div className="fg">
                  <label className="fl">Home State <span className="req">*</span></label>
                  <select className="fi-sel" value={form.homeState} onChange={e => { set('homeState', e.target.value); set('district', ''); }}>
                    <option value="">Select state…</option>
                    {STATES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              {form.homeState && (
                <div className="fg">
                  <label className="fl">District</label>
                  <select className="fi-sel" value={form.district} onChange={e => set('district', e.target.value)}>
                    <option value="">Select district…</option>
                    {(DISTRICTS_BY_STATE[form.homeState] || []).map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
              )}
            </>
          ) : (
            <>
              {[
                ['📧 Email',      form.email      || '—'],
                ['📞 Phone',      form.phone      || 'Not provided'],
                ['🏡 Hometown',   form.hometown   || 'Not provided'],
                ['📍 Home State', form.homeState  || 'Not provided'],
                ['🏘 District',   form.district   || '—'],
              ].map(([l, v]) => (
                <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #F9FAFB' }}>
                  <span style={{ fontSize: 13, color: '#6B7280' }}>{l}</span>
                  <span style={{ fontSize: 13, fontWeight: 500, color: v === 'Not provided' ? '#92400E' : '#111827' }}>{v}</span>
                </div>
              ))}
            </>
          )}
        </div>

        {/* Academic Information — doctors only */}
        {!isAdmin && (
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
                  <select className="fi-sel" value={form.joining} onChange={e => set('joining', e.target.value)}>
                    <option value="">Select year…</option>
                    {[2020, 2021, 2022, 2023, 2024, 2025].map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
                <div className="fg2">
                  <div className="fg"><label className="fl">Current Year (auto)</label><input className="fi-in auto" value={curYrLabel} readOnly /><div className="form-note">✨ Auto-calculated</div></div>
                  <div className="fg"><label className="fl">Expected Completion (auto)</label><input className="fi-in auto" value={completion} readOnly /><div className="form-note">✨ {form.program} = {duration} years</div></div>
                </div>
                <div className="fg"><label className="fl">NEET-PG Rank</label><input className="fi-in" type="number" value={form.neet_rank || ''} onChange={e => set('neet_rank', e.target.value)} /></div>
              </>
            ) : (
              <>
                {[
                  ['🏥 College',             form.college   || '—'],
                  ['📚 Program',             form.program   || '—'],
                  ['🩺 Speciality',          form.speciality || '—'],
                  ['📅 Year of Joining',     form.joining   || '—'],
                  ['📌 Current Year',        form.joining ? curYrLabel + ' ✨' : '—'],
                  ['🎓 Expected Completion', form.joining ? completion + ' ✨' : '—'],
                  ['🏆 NEET-PG Rank',        form.neet_rank ? 'AIR ' + form.neet_rank : '—'],
                ].map(([l, v]) => (
                  <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #F9FAFB' }}>
                    <span style={{ fontSize: 13, color: '#6B7280' }}>{l}</span>
                    <span style={{ fontSize: 13, fontWeight: 500, color: String(v).includes('✨') ? '#1D4ED8' : '#111827' }}>{v}</span>
                  </div>
                ))}
              </>
            )}
          </div>
        )}
      </div>

      {/* Verification steps — doctors only */}
      {!isAdmin && (
        <div className="card mt4">
          <div className="ct" style={{ marginBottom: 14 }}>🔐 Profile Verification Steps</div>
          {[
            { label: 'Personal details filled',          done: !!(form.name && form.phone && form.email) },
            { label: 'Hometown & Home State provided',   done: !!(form.hometown && form.homeState) },
            { label: 'Academic information complete',    done: !!(form.college && form.program && form.speciality && form.joining) },
            { label: 'All mandatory fields verified',    done: !!complete },
            { label: 'Admin approval',                   done: !!form.verified },
          ].map((s, i) => (
            <div key={i} className={`vstep ${s.done ? 'done' : complete && i === 4 ? 'pend' : 'miss'}`}>
              <div className="vstep-ic">{s.done ? '✅' : complete && i === 4 ? '⏳' : '○'}</div>
              <div style={{ fontSize: 13, fontWeight: 500, color: s.done ? '#1D4ED8' : complete && i === 4 ? '#92400E' : '#6B7280' }}>{s.label}</div>
            </div>
          ))}
          {form.joining && (
            <div style={{ marginTop: 12, padding: '10px 12px', background: '#F9FAFB', borderRadius: 10, fontSize: 12, color: '#6B7280' }}>
              ⏰ Platform access: 2 years from passing out year ({completion}). Access expires: <strong>{typeof completion === 'number' ? completion + 2 : '—'}</strong>.
            </div>
          )}
        </div>
      )}

      {/* Completion badges — doctors only */}
      {!isAdmin && completedSubjects.length > 0 && (
        <div className="card mt4">
          <div className="ct" style={{ marginBottom: 14 }}>🏅 Completion Badges</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            {completedSubjects.map(cs => (
              <div key={cs.subject} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                background: 'linear-gradient(135deg,#EFF6FF,#EDE9FE)',
                border: '1px solid #C7D2FE', borderRadius: 12, padding: '8px 14px',
              }}>
                <span style={{ fontSize: 18 }}>🏅</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#1D4ED8' }}>{cs.subject}</div>
                  <div style={{ fontSize: 10, color: '#6B7280' }}>
                    Completed {cs.completed_at ? new Date(cs.completed_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : ''}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Stats ──────────────────────────────────────────────── */}
      <div className="card mt4">
        <div className="ct" style={{ marginBottom: 14 }}>📊 {isAdmin ? 'Content Stats' : 'My Stats'}</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14 }}>
          {(isAdmin ? [
            ['📤', role === 'superadmin' ? 'Total Content' : 'My Uploads', adminStats.total],
            ['✅', 'Approved',                                              adminStats.approved],
            ['⏳', 'Pending Review',                                        adminStats.pending],
          ] : [
            ['🏆', 'Rank',       stats.rank ? `#${stats.rank}` : '—'],
            ['⭐', 'Score',      stats.score.toLocaleString()],
            ['📚', 'Books Read', stats.books],
          ]).map(([ic, label, val]) => (
            <div key={label} style={{ textAlign: 'center', background: '#F9FAFB', borderRadius: 12, padding: 14 }}>
              <div style={{ fontSize: 26 }}>{ic}</div>
              <div style={{ fontFamily: 'Inter,sans-serif', fontSize: 18, fontWeight: 800, color: '#2563EB', margin: '5px 0 2px' }}>{val}</div>
              <div style={{ fontSize: 11, color: '#6B7280', fontWeight: 600 }}>{label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
