import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

const fmtDt = (d) => d ? new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

export default function WebinarCalendarTab({ addToast }) {
  const [webinars, setWebinars] = useState([]);
  const [wForm, setWForm] = useState({ title: '', speaker: '', scheduled_at: '', duration_min: 60, join_url: '', description: '' });
  const [showWForm, setShowWForm] = useState(false);
  const [savingW, setSavingW] = useState(false);
  const [fetchError, setFetchError] = useState(null);

  useEffect(() => {
    supabase.from('admin_webinars').select('*').order('scheduled_at').then(({ data, error }) => {
      if (error) { setFetchError('Failed to load webinars. Please refresh.'); return; }
      if (data?.length) setWebinars(data);
    }).catch((e) => {
      setFetchError('Failed to load webinars. Please refresh.');
      console.warn('WebinarCalendarTab: fetch error:', e.message);
    });
  }, []);

  const handleAddWebinar = async () => {
    if (!wForm.title || !wForm.scheduled_at) { addToast('error', 'Title and date are required.'); return; }
    setSavingW(true);
    try {
      const { data, error } = await supabase.from('admin_webinars').insert([wForm]).select().single();
      if (error) throw error;
      setWebinars(prev => [...prev, data]);
      addToast('success', 'Webinar scheduled!');
      setShowWForm(false);
      setWForm({ title: '', speaker: '', scheduled_at: '', duration_min: 60, join_url: '', description: '' });
    } catch (e) {
      console.warn('WebinarCalendarTab: failed to add webinar:', e.message);
      addToast('error', 'Failed to schedule webinar. Please try again.');
    } finally {
      setSavingW(false);
    }
  };

  const handleDeleteWebinar = async (id) => {
    setWebinars(prev => prev.filter(w => w.id !== id));
    try { await supabase.from('admin_webinars').delete().eq('id', id); } catch (e) { console.warn('WebinarCalendarTab: failed to delete webinar:', e.message); }
  };

  return (
    <div>
      {fetchError && (
        <div role="alert" style={{ marginBottom: 14, padding: '10px 14px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, color: '#DC2626', fontSize: 13 }}>
          {fetchError}
        </div>
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: '#374151' }}>Scheduled Webinars ({webinars.length})</div>
        <button className="btn btn-p btn-sm" onClick={() => setShowWForm(s => !s)}>
          {showWForm ? '✕ Cancel' : '+ Schedule Webinar'}
        </button>
      </div>

      {showWForm && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="fg"><label className="fl">Title *</label><input className="fi-in" value={wForm.title} onChange={e => setWForm(p => ({ ...p, title: e.target.value }))} placeholder="Webinar title" /></div>
          <div className="fg2">
            <div className="fg"><label className="fl">Speaker</label><input className="fi-in" value={wForm.speaker} onChange={e => setWForm(p => ({ ...p, speaker: e.target.value }))} placeholder="Dr. Name, Designation" /></div>
            <div className="fg"><label className="fl">Duration (min)</label><input className="fi-in" type="number" value={wForm.duration_min} onChange={e => setWForm(p => ({ ...p, duration_min: parseInt(e.target.value) }))} /></div>
          </div>
          <div className="fg"><label className="fl">Date & Time *</label><input className="fi-in" type="datetime-local" value={wForm.scheduled_at} onChange={e => setWForm(p => ({ ...p, scheduled_at: e.target.value }))} /></div>
          <div className="fg"><label className="fl">Join URL</label><input className="fi-in" type="url" value={wForm.join_url} onChange={e => setWForm(p => ({ ...p, join_url: e.target.value }))} placeholder="https://zoom.us/..." /></div>
          <div className="fg"><label className="fl">Description</label><textarea className="fi-ta" value={wForm.description} onChange={e => setWForm(p => ({ ...p, description: e.target.value }))} placeholder="Brief description..." /></div>
          <button className="btn btn-p btn-sm" onClick={handleAddWebinar} disabled={savingW}>{savingW ? 'Saving…' : 'Save Webinar'}</button>
        </div>
      )}

      {webinars.length === 0
        ? <div className="empty"><div className="empty-ic">📅</div><div className="empty-t">No webinars scheduled</div></div>
        : webinars.map(w => {
          const isPast = new Date(w.scheduled_at) < new Date();
          return (
            <div key={w.id} className="card" style={{ marginBottom: 10, padding: '16px 20px', opacity: isPast ? 0.65 : 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{w.title}</div>
                  {w.speaker && <div style={{ fontSize: 13, color: '#6B7280', marginBottom: 4 }}>🎤 {w.speaker}</div>}
                  <div style={{ fontSize: 12, color: '#6B7280' }}>
                    📅 {fmtDt(w.scheduled_at)} · ⏱ {w.duration_min} min
                  </div>
                  {w.description && <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 4 }}>{w.description}</div>}
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {w.join_url && !isPast && (
                    <a href={w.join_url} target="_blank" rel="noreferrer" style={{ background: 'linear-gradient(135deg,#4F46E5,#3730A3)', color: '#fff', borderRadius: 8, padding: '6px 12px', fontSize: 12, fontWeight: 600, textDecoration: 'none' }}>
                      🚀 Join
                    </a>
                  )}
                  <button onClick={() => handleDeleteWebinar(w.id)} style={{ background: '#FEE2E2', color: '#DC2626', border: 'none', borderRadius: 8, padding: '6px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>🗑</button>
                </div>
              </div>
            </div>
          );
        })
      }
    </div>
  );
}
