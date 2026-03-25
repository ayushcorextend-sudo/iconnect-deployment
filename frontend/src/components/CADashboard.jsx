import { useState, useEffect, useMemo } from 'react';
import { fetchMyArtifacts, updateArtifact, deleteArtifact } from '../lib/supabase';
import { SPECIALITIES } from '../data/constants';
import ConfirmModal from './ui/ConfirmModal';
import SignedImg from './ui/SignedImg';

export default function CADashboard({ userId, userName, setPage, notifications = [], addToast }) {
  const [myArtifacts, setMyArtifacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [editTarget, setEditTarget] = useState(null);
  const [editForm, setEditForm] = useState({ title: '', subject: '', description: '' });
  const [saving, setSaving] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState(null);

  useEffect(() => {
    if (!userId) return;
    (async () => {
      setLoading(true);
      try {
        const data = await fetchMyArtifacts(userId);
        setMyArtifacts(data || []);
      } catch (_) {
        addToast('error', 'Failed to load your uploads.');
      } finally {
        setLoading(false);
      }
    })();
  }, [userId]); // eslint-disable-line react-hooks/exhaustive-deps

  const stats = useMemo(() => ({
    total: myArtifacts.length,
    pending: myArtifacts.filter(a => a.status === 'pending').length,
    approved: myArtifacts.filter(a => a.status === 'approved').length,
    rejected: myArtifacts.filter(a => a.status === 'rejected').length,
  }), [myArtifacts]);

  const filtered = useMemo(() => {
    if (activeTab === 'pending')  return myArtifacts.filter(a => a.status === 'pending');
    if (activeTab === 'approved') return myArtifacts.filter(a => a.status === 'approved');
    if (activeTab === 'rejected') return myArtifacts.filter(a => a.status === 'rejected');
    return myArtifacts;
  }, [myArtifacts, activeTab]);

  // Content-related alerts only (not doctor-management noise)
  const contentAlerts = (notifications || []).filter(n => {
    if (n.is_read !== false) return false;
    const t = ((n.title || '') + ' ' + (n.body || '')).toLowerCase();
    return t.includes('artifact') || t.includes('e-book') || t.includes('ebook')
      || t.includes('approved') || t.includes('rejected') || t.includes('content')
      || t.includes('upload');
  });

  const openEdit = (a) => {
    if (a.status === 'approved') { addToast('error', 'Cannot edit approved content.'); return; }
    setEditTarget(a);
    setEditForm({ title: a.title || '', subject: a.subject || '', description: a.description || '' });
  };

  const saveEdit = async () => {
    if (!editForm.title.trim()) { addToast('error', 'Title is required.'); return; }
    setSaving(true);
    try {
      const updates = {
        title: editForm.title.trim(),
        subject: editForm.subject,
        description: editForm.description,
        // Re-submit rejected items back to pending
        ...(editTarget.status === 'rejected' ? { status: 'pending', rejection_reason: null } : {}),
      };
      await updateArtifact(editTarget.id, updates);
      setMyArtifacts(prev => prev.map(a =>
        a.id === editTarget.id ? { ...a, ...updates } : a
      ));
      setEditTarget(null);
      addToast('success', editTarget.status === 'rejected' ? 'Re-submitted for approval!' : 'Updated successfully.');
    } catch (err) {
      addToast('error', 'Update failed: ' + (err.message || 'Try again'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    const item = myArtifacts.find(a => a.id === id);
    if (item?.status === 'approved') { addToast('error', 'Cannot delete approved content. Ask Super Admin.'); return; }
    try {
      await deleteArtifact(id);
      setMyArtifacts(prev => prev.filter(a => a.id !== id));
      addToast('success', 'Deleted.');
    } catch (err) {
      addToast('error', 'Delete failed: ' + (err.message || 'Try again'));
    }
  };

  const statusCfg = {
    pending:  { label: 'Pending',  bg: '#FEF3C7', color: '#D97706' },
    approved: { label: 'Live',     bg: '#DCFCE7', color: '#15803D' },
    rejected: { label: 'Rejected', bg: '#FEE2E2', color: '#DC2626' },
    archived: { label: 'Archived', bg: '#F3F4F6', color: '#6B7280' },
  };

  return (
    <div className="page">
      <div className="ph">
        <div className="pt">Content Dashboard</div>
        <div className="ps">Manage your e-book uploads and track approval status</div>
      </div>

      {/* Stats */}
      <div className="sg4" style={{ marginBottom: 20 }}>
        {[
          { l: 'Total Uploads', v: stats.total,    i: '📚', c: 'sky' },
          { l: 'Pending Approval', v: stats.pending,  i: '⏳', c: 'amber' },
          { l: 'Live Content',  v: stats.approved, i: '✅', c: 'teal' },
          { l: 'Rejected',      v: stats.rejected, i: '❌', c: 'rose' },
        ].map((s, i) => (
          <div key={i} className={`stat ${s.c} fu`} style={{ animationDelay: `${i * 0.06}s` }}>
            <div className="stat-ic">{s.i}</div>
            <div className="stat-v">{s.v}</div>
            <div className="stat-l">{s.l}</div>
          </div>
        ))}
      </div>

      {/* Content alerts banner */}
      {contentAlerts.length > 0 && (
        <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#92400E' }}>
          <strong>📣 {contentAlerts.length} content alert{contentAlerts.length > 1 ? 's' : ''}:</strong>{' '}
          {contentAlerts[0].title} — {contentAlerts[0].body}
          {contentAlerts.length > 1 && <span> (+{contentAlerts.length - 1} more)</span>}
        </div>
      )}

      {/* Upload button */}
      <div style={{ marginBottom: 16 }}>
        <button
          onClick={() => setPage('upload')}
          className="btn btn-p"
        >
          📤 Upload New E-Book
        </button>
      </div>

      {/* Filter tabs */}
      <div className="tabs" style={{ marginBottom: 16 }}>
        {[
          { key: 'all',      label: `All (${stats.total})` },
          { key: 'pending',  label: `Pending (${stats.pending})` },
          { key: 'approved', label: `Live (${stats.approved})` },
          { key: 'rejected', label: `Rejected (${stats.rejected})` },
        ].map(t => (
          <button key={t.key} className={`tab ${activeTab === t.key ? 'act' : ''}`} onClick={() => setActiveTab(t.key)}>
            {t.label}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
          <div style={{ width: 28, height: 28, borderRadius: '50%', border: '3px solid #E5E7EB', borderTopColor: '#2563EB', animation: 'spin 0.8s linear infinite' }} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty">
          <div className="empty-ic">📭</div>
          <div className="empty-t">
            {activeTab === 'all' ? 'No uploads yet' : `No ${activeTab} items`}
          </div>
          {activeTab === 'all' && (
            <div className="empty-s">Click "Upload New E-Book" to get started.</div>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map(a => {
            const sc = statusCfg[a.status] || { label: a.status, bg: '#F3F4F6', color: '#6B7280' };
            const canEdit = a.status === 'pending' || a.status === 'rejected';
            return (
              <div key={a.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: 14 }}>
                {/* Thumbnail or emoji */}
                <div style={{ width: 48, height: 62, borderRadius: 6, overflow: 'hidden', background: '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 22, border: '1px solid #E5E7EB' }}>
                  {a.thumbnail_url
                    ? <SignedImg src={a.thumbnail_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} fallback={<span>{a.emoji || '📄'}</span>} />
                    : (a.emoji || '📄')}
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: '#111827', marginBottom: 2 }}>{a.title}</div>
                  <div style={{ fontSize: 12, color: '#6B7280' }}>
                    {a.subject || 'No category'} · {a.size || '—'} · {a.date || '—'}
                  </div>
                  {/* Rejection reason */}
                  {a.status === 'rejected' && a.rejection_reason && (
                    <div style={{ marginTop: 6, padding: '5px 10px', borderRadius: 6, background: '#FEF2F2', border: '1px solid #FECACA', fontSize: 12, color: '#DC2626' }}>
                      <strong>Rejection reason:</strong> {a.rejection_reason}
                    </div>
                  )}
                </div>

                {/* Status badge */}
                <span style={{ padding: '3px 10px', borderRadius: 12, fontSize: 11, fontWeight: 700, background: sc.bg, color: sc.color, flexShrink: 0 }}>
                  {sc.label}
                </span>

                {/* Edit + Delete (pending/rejected only) */}
                {canEdit && (
                  <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                    <button onClick={() => openEdit(a)} title={a.status === 'rejected' ? 'Edit & Re-submit' : 'Edit'} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, padding: 4 }}>✏️</button>
                    <button onClick={() => setPendingDeleteId(a.id)} title="Delete" style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, padding: 4 }}>🗑️</button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Edit / Re-submit modal */}
      {editTarget && (
        <div className="overlay" onClick={() => setEditTarget(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="mh">
              <div className="mt">{editTarget.status === 'rejected' ? '✏️ Edit & Re-submit' : '✏️ Edit Artifact'}</div>
              <button className="mc" onClick={() => setEditTarget(null)}>×</button>
            </div>
            <div className="mb">
              {/* Show admin feedback at top for rejected items */}
              {editTarget.status === 'rejected' && editTarget.rejection_reason && (
                <div style={{ padding: '8px 12px', borderRadius: 8, background: '#FEF2F2', border: '1px solid #FECACA', fontSize: 13, color: '#DC2626', marginBottom: 12 }}>
                  <strong>Admin feedback:</strong> {editTarget.rejection_reason}
                </div>
              )}
              <div className="fg">
                <label className="fl">Title <span className="req">*</span></label>
                <input className="fi-in" value={editForm.title} onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))} />
              </div>
              <div className="fg">
                <label className="fl">Category <span className="req">*</span></label>
                <select className="fi-sel" value={editForm.subject} onChange={e => setEditForm(f => ({ ...f, subject: e.target.value }))}>
                  <option value="">Select category…</option>
                  {Object.entries(SPECIALITIES).map(([prog, subs]) => (
                    <optgroup key={prog} label={prog}>
                      {subs.map(s => <option key={s} value={s}>{s}</option>)}
                    </optgroup>
                  ))}
                </select>
              </div>
              <div className="fg">
                <label className="fl">Description</label>
                <textarea className="fi-ta" value={editForm.description} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))} rows={3} />
              </div>
            </div>
            <div className="mf">
              <button className="btn btn-p btn-sm" onClick={saveEdit} disabled={saving}>
                {saving ? 'Saving…' : editTarget.status === 'rejected' ? 'Re-submit for Approval' : 'Save Changes'}
              </button>
              <button className="btn btn-s btn-sm" onClick={() => setEditTarget(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {pendingDeleteId && (
        <ConfirmModal
          message={`Delete "${(myArtifacts.find(a => a.id === pendingDeleteId)?.title) || 'this item'}"? This cannot be undone.`}
          confirmLabel="Delete"
          onConfirm={() => { const id = pendingDeleteId; setPendingDeleteId(null); handleDelete(id); }}
          onCancel={() => setPendingDeleteId(null)}
        />
      )}
    </div>
  );
}
