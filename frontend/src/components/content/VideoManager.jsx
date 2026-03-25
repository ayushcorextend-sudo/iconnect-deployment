import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { SPECIALITIES } from '../../data/constants';
import ConfirmModal from '../ui/ConfirmModal';
import SignedImg from '../ui/SignedImg';

const statusCfg = {
  pending:  { label: 'Pending',  bg: '#FEF3C7', color: '#D97706' },
  approved: { label: 'Approved', bg: '#DCFCE7', color: '#15803D' },
  rejected: { label: 'Rejected', bg: '#FEE2E2', color: '#DC2626' },
};

export default function VideoManager({ userId, addToast }) {
  const [videos, setVideos]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', subject: '', description: '', video_url: '', thumbnail_url: '', duration_sec: '' });

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const load = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('video_lectures').select('*').eq('created_by', userId).order('created_at', { ascending: false });
      if (error) throw error;
      setVideos(data || []);
    } catch (e) {
      addToast('error', 'Failed to load videos: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const save = async () => {
    if (!form.title.trim())     { addToast('error', 'Title is required.'); return; }
    if (!form.subject)          { addToast('error', 'Subject is required.'); return; }
    if (!form.video_url.trim()) { addToast('error', 'Video URL is required.'); return; }
    if (userId?.startsWith('local_')) { addToast('error', 'Not available in demo mode.'); return; }
    setSaving(true);
    try {
      const { data, error } = await supabase
        .from('video_lectures')
        .insert({
          title: form.title.trim(),
          subject: form.subject,
          description: form.description,
          video_url: form.video_url.trim(),
          thumbnail_url: form.thumbnail_url.trim() || null,
          duration_sec: form.duration_sec ? parseInt(form.duration_sec) : null,
          status: 'pending',
          created_by: userId,
        })
        .select().single();
      if (error) throw error;
      setVideos(prev => [data, ...prev]);
      setShowForm(false);
      setForm({ title: '', subject: '', description: '', video_url: '', thumbnail_url: '', duration_sec: '' });
      addToast('success', 'Video submitted for approval!');
    } catch (e) {
      addToast('error', 'Save failed: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  const deleteVideo = async (id) => {
    try {
      const { error } = await supabase.from('video_lectures').delete().eq('id', id);
      if (error) throw error;
      setVideos(prev => prev.filter(v => v.id !== id));
      addToast('success', 'Deleted.');
    } catch (e) {
      addToast('error', 'Delete failed: ' + e.message);
    }
  };

  const fmtDuration = (sec) => {
    if (!sec) return '—';
    const m = Math.floor(sec / 60), s = sec % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ fontWeight: 700, fontSize: 15 }}>My Videos ({videos.length})</div>
        <button className="btn btn-p btn-sm" onClick={() => setShowForm(v => !v)}>
          {showForm ? 'Cancel' : '+ Add Video'}
        </button>
      </div>

      {showForm && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div style={{ fontWeight: 600, marginBottom: 12 }}>Add Video Lecture</div>
          <div className="fg">
            <label className="fl">Title <span className="req">*</span></label>
            <input className="fi-in" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Lecture title…" />
          </div>
          <div className="fg">
            <label className="fl">Subject <span className="req">*</span></label>
            <select className="fi-sel" value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}>
              <option value="">Select subject…</option>
              {Object.entries(SPECIALITIES).map(([prog, subs]) => (
                <optgroup key={prog} label={prog}>
                  {subs.map(s => <option key={s} value={s}>{s}</option>)}
                </optgroup>
              ))}
            </select>
          </div>
          <div className="fg">
            <label className="fl">Video URL <span className="req">*</span></label>
            <input className="fi-in" value={form.video_url} onChange={e => setForm(f => ({ ...f, video_url: e.target.value }))}
              placeholder="YouTube or Vimeo URL…" type="url" />
          </div>
          <div className="fg">
            <label className="fl">Thumbnail URL (optional)</label>
            <input className="fi-in" value={form.thumbnail_url} onChange={e => setForm(f => ({ ...f, thumbnail_url: e.target.value }))}
              placeholder="https://…" type="url" />
          </div>
          <div className="fg">
            <label className="fl">Duration (seconds)</label>
            <input className="fi-in" type="number" min={1} value={form.duration_sec}
              onChange={e => setForm(f => ({ ...f, duration_sec: e.target.value }))} style={{ width: 120 }} placeholder="e.g. 3600" />
          </div>
          <div className="fg">
            <label className="fl">Description</label>
            <textarea className="fi-ta" rows={2} value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Optional description…" />
          </div>
          <button className="btn btn-p btn-sm" onClick={save} disabled={saving}>
            {saving ? 'Saving…' : 'Submit for Approval'}
          </button>
        </div>
      )}

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
          <div style={{ width: 24, height: 24, borderRadius: '50%', border: '3px solid #E5E7EB', borderTopColor: '#2563EB', animation: 'spin 0.8s linear infinite' }} />
        </div>
      ) : videos.length === 0 ? (
        <div className="empty">
          <div className="empty-ic">🎬</div>
          <div className="empty-t">No videos yet</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {videos.map(v => {
            const sc = statusCfg[v.status] || { label: v.status, bg: '#F3F4F6', color: '#6B7280' };
            return (
              <div key={v.id} className="card" style={{ display: 'flex', gap: 14, alignItems: 'center', padding: 14 }}>
                <div style={{ width: 56, height: 40, borderRadius: 6, background: '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0, overflow: 'hidden' }}>
                  {v.thumbnail_url
                    ? <SignedImg src={v.thumbnail_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} fallback={<span>🎥</span>} />
                    : '🎥'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{v.title}</div>
                  <div style={{ fontSize: 12, color: '#6B7280' }}>{v.subject} · {fmtDuration(v.duration_sec)}</div>
                  {v.status === 'rejected' && v.rejection_note && (
                    <div style={{ marginTop: 4, fontSize: 12, color: '#DC2626' }}>❌ {v.rejection_note}</div>
                  )}
                </div>
                <span style={{ padding: '3px 10px', borderRadius: 12, fontSize: 11, fontWeight: 700, background: sc.bg, color: sc.color, flexShrink: 0 }}>{sc.label}</span>
                {v.status !== 'approved' && (
                  <button onClick={() => setPendingDeleteId(v.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, padding: 4 }}>🗑️</button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {pendingDeleteId && (
        <ConfirmModal
          message="Delete this video? This cannot be undone."
          confirmLabel="Delete Video"
          onConfirm={() => { const id = pendingDeleteId; setPendingDeleteId(null); deleteVideo(id); }}
          onCancel={() => setPendingDeleteId(null)}
        />
      )}
    </div>
  );
}
