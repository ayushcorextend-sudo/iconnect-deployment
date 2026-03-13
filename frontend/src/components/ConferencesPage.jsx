import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const SPECIALITIES = ['All', 'Internal Medicine', 'Preventive & Social Medicine', 'Critical Care / Anesthesia', 'Obstetrics & Gynaecology', 'Surgery', 'Paediatrics', 'Psychiatry', 'Radiology', 'Orthopaedics'];

const fmt = (d) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

const isPast = (d) => new Date(d) < new Date();

export default function ConferencesPage({ role, addToast }) {
  const [conferences, setConferences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterSpec, setFilterSpec] = useState('All');
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: '', organizer: '', location: '', start_date: '', end_date: '',
    speciality: 'All', description: '', website_url: '', registration_url: '', is_featured: false,
  });

  const isAdmin = role === 'superadmin' || role === 'contentadmin';

  useEffect(() => {
    supabase.from('conferences').select('*').order('start_date', { ascending: true })
      .then(({ data }) => { if (data?.length) setConferences(data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const visible = conferences.filter(c => {
    if (filterSpec !== 'All' && c.speciality !== 'All' && c.speciality !== filterSpec) return false;
    if (search && !c.title.toLowerCase().includes(search.toLowerCase()) &&
        !c.organizer.toLowerCase().includes(search.toLowerCase()) &&
        !c.location.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const upcoming = visible.filter(c => !isPast(c.end_date));
  const past = visible.filter(c => isPast(c.end_date));

  const handleAdd = async () => {
    if (!form.title || !form.organizer || !form.location || !form.start_date || !form.end_date) {
      addToast('error', 'Title, organizer, location, and dates are required.');
      return;
    }
    setSaving(true);
    try {
      const { data, error } = await supabase.from('conferences').insert([form]).select().single();
      if (error) throw error;
      setConferences(prev => [...prev, data]);
      addToast('success', 'Conference added!');
      setShowAdd(false);
      setForm({ title: '', organizer: '', location: '', start_date: '', end_date: '', speciality: 'All', description: '', website_url: '', registration_url: '', is_featured: false });
    } catch (e) {
      // Offline fallback — add locally
      setConferences(prev => [...prev, { ...form, id: `local_${Date.now()}` }]);
      addToast('success', 'Conference added (offline).');
      setShowAdd(false);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    setConferences(prev => prev.filter(c => c.id !== id));
    try { await supabase.from('conferences').delete().eq('id', id); } catch (_) {}
    addToast('success', 'Conference removed.');
  };

  const ConferenceCard = ({ c }) => {
    const past_ = isPast(c.end_date);
    return (
      <div style={{
        background: '#fff', borderRadius: 16, padding: '20px 24px',
        border: `1px solid ${c.is_featured ? '#C7D2FE' : '#E5E7EB'}`,
        boxShadow: c.is_featured ? '0 4px 20px rgba(79,70,229,0.08)' : '0 1px 4px rgba(0,0,0,0.04)',
        opacity: past_ ? 0.65 : 1, position: 'relative', overflow: 'hidden',
      }}>
        {c.is_featured && !past_ && (
          <div style={{ position: 'absolute', top: 0, right: 0, background: 'linear-gradient(135deg,#4F46E5,#7C3AED)', color: '#fff', fontSize: 10, fontWeight: 700, padding: '4px 12px', borderBottomLeftRadius: 10, letterSpacing: 0.5 }}>
            FEATURED
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 15, color: '#111827', marginBottom: 4 }}>{c.title}</div>
            <div style={{ fontSize: 13, color: '#6B7280', marginBottom: 6 }}>🏛️ {c.organizer} &nbsp;·&nbsp; 📍 {c.location}</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
              <span style={{ background: '#EFF6FF', color: '#1D4ED8', borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 600 }}>
                📅 {fmt(c.start_date)} – {fmt(c.end_date)}
              </span>
              <span style={{ background: '#F3F4F6', color: '#374151', borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 600 }}>
                {c.speciality}
              </span>
              {past_ && <span style={{ background: '#FEE2E2', color: '#DC2626', borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 600 }}>Concluded</span>}
            </div>
            {c.description && (
              <div style={{ fontSize: 13, color: '#6B7280', lineHeight: 1.5 }}>{c.description}</div>
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 120 }}>
            {c.website_url && (
              <a href={c.website_url} target="_blank" rel="noreferrer" style={{ display: 'block', textAlign: 'center', background: '#EFF6FF', color: '#1D4ED8', borderRadius: 8, padding: '7px 14px', fontSize: 12, fontWeight: 600, textDecoration: 'none' }}>
                🌐 Website
              </a>
            )}
            {c.registration_url && !past_ && (
              <a href={c.registration_url} target="_blank" rel="noreferrer" style={{ display: 'block', textAlign: 'center', background: 'linear-gradient(135deg,#4F46E5,#3730A3)', color: '#fff', borderRadius: 8, padding: '7px 14px', fontSize: 12, fontWeight: 600, textDecoration: 'none' }}>
                ✍️ Register
              </a>
            )}
            {isAdmin && (
              <button onClick={() => handleDelete(c.id)} style={{ background: '#FEE2E2', color: '#DC2626', border: 'none', borderRadius: 8, padding: '7px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                🗑 Remove
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="page">
      <div className="ph-row ph">
        <div>
          <div className="pt">🏥 Medical Conferences</div>
          <div className="ps">Upcoming CME events & national conferences in India</div>
        </div>
        {isAdmin && (
          <button className="btn btn-p" onClick={() => setShowAdd(s => !s)}>
            {showAdd ? '✕ Cancel' : '+ Add Conference'}
          </button>
        )}
      </div>

      {/* Add form */}
      {showAdd && (
        <div className="card" style={{ marginBottom: 24 }}>
          <div className="ct" style={{ marginBottom: 14 }}>+ New Conference</div>
          <div className="fg">
            <label className="fl">Title *</label>
            <input className="fi-in" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="Conference name" />
          </div>
          <div className="fg2">
            <div className="fg">
              <label className="fl">Organizer *</label>
              <input className="fi-in" value={form.organizer} onChange={e => setForm(p => ({ ...p, organizer: e.target.value }))} placeholder="e.g. AIIMS Delhi" />
            </div>
            <div className="fg">
              <label className="fl">Location *</label>
              <input className="fi-in" value={form.location} onChange={e => setForm(p => ({ ...p, location: e.target.value }))} placeholder="City, State" />
            </div>
          </div>
          <div className="fg2">
            <div className="fg">
              <label className="fl">Start Date *</label>
              <input className="fi-in" type="date" value={form.start_date} onChange={e => setForm(p => ({ ...p, start_date: e.target.value }))} />
            </div>
            <div className="fg">
              <label className="fl">End Date *</label>
              <input className="fi-in" type="date" value={form.end_date} onChange={e => setForm(p => ({ ...p, end_date: e.target.value }))} />
            </div>
          </div>
          <div className="fg2">
            <div className="fg">
              <label className="fl">Speciality</label>
              <select className="fi-sel" value={form.speciality} onChange={e => setForm(p => ({ ...p, speciality: e.target.value }))}>
                {SPECIALITIES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div className="fg" style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 20 }}>
              <input type="checkbox" id="feat" checked={form.is_featured} onChange={e => setForm(p => ({ ...p, is_featured: e.target.checked }))} />
              <label htmlFor="feat" style={{ fontSize: 13, fontWeight: 500 }}>Mark as Featured</label>
            </div>
          </div>
          <div className="fg">
            <label className="fl">Description</label>
            <textarea className="fi-ta" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Brief description of the conference..." />
          </div>
          <div className="fg2">
            <div className="fg">
              <label className="fl">Website URL</label>
              <input className="fi-in" type="url" value={form.website_url} onChange={e => setForm(p => ({ ...p, website_url: e.target.value }))} placeholder="https://..." />
            </div>
            <div className="fg">
              <label className="fl">Registration URL</label>
              <input className="fi-in" type="url" value={form.registration_url} onChange={e => setForm(p => ({ ...p, registration_url: e.target.value }))} placeholder="https://..." />
            </div>
          </div>
          <button className="btn btn-p" onClick={handleAdd} disabled={saving} style={{ marginTop: 8 }}>
            {saving ? 'Saving…' : 'Save Conference'}
          </button>
        </div>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <div className="search-bar" style={{ flex: 1, minWidth: 200 }}>
          <span>🔍</span>
          <input placeholder="Search conferences…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select
          value={filterSpec}
          onChange={e => setFilterSpec(e.target.value)}
          style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #E5E7EB', fontSize: 13, background: '#fff' }}
        >
          {SPECIALITIES.map(s => <option key={s}>{s}</option>)}
        </select>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', border: '3px solid #E5E7EB', borderTopColor: '#4F46E5', animation: 'spin 0.8s linear infinite' }} />
        </div>
      ) : (
        <>
          {upcoming.length > 0 && (
            <>
              <div style={{ fontWeight: 700, fontSize: 14, color: '#374151', marginBottom: 12 }}>
                📅 Upcoming ({upcoming.length})
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 28 }}>
                {upcoming.map(c => <ConferenceCard key={c.id} c={c} />)}
              </div>
            </>
          )}
          {past.length > 0 && (
            <>
              <div style={{ fontWeight: 700, fontSize: 14, color: '#9CA3AF', marginBottom: 12 }}>
                🕰 Past Conferences ({past.length})
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {past.map(c => <ConferenceCard key={c.id} c={c} />)}
              </div>
            </>
          )}
          {visible.length === 0 && (
            <div className="empty">
              <div className="empty-ic">🏥</div>
              <div className="empty-t">No conferences found</div>
              <div className="empty-s">{search ? 'Try a different search term.' : 'No conferences listed yet.'}</div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
