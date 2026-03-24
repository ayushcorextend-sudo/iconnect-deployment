import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { sendNotification } from '../../lib/sendNotification';

export default function ArtifactsTab({ pending, onApprove, onReject, addToast, setLocalArtifacts, artifacts, openMenu, setOpenMenu, handlePreview, handleEditOpen, setPendingDeleteId }) {
  const [rejectPending, setRejectPending] = useState(null); // { id, title }
  const [rejectReason, setRejectReason]   = useState('');

  async function submitReject() {
    if (!rejectPending) return;
    const { id, title } = rejectPending;
    const finalReason = rejectReason.trim() || 'No reason provided.';
    setRejectPending(null);
    setRejectReason('');
    const a = artifacts.find(x => x.id === id);
    await onReject(id, finalReason);
    addToast('error', 'Rejected');
    setLocalArtifacts(prev => prev.map(x => x.id === id ? { ...x, status: 'rejected', rejection_reason: finalReason } : x));
    try {
      if (a?.uploaded_by_id) {
        sendNotification(a.uploaded_by_id, 'E-Book Rejected', `Your upload "${title}" was rejected. Reason: ${finalReason}`, 'error', '❌', 'in_app');
      }
    } catch (_) {}
  }

  return (
    <div>
      {pending.length === 0
        ? <div className="empty"><div className="empty-ic">✅</div><div className="empty-t">All caught up!</div></div>
        : pending.map(a => (
          <div key={a.id} className="card" style={{ marginBottom: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{a.emoji} {a.title}</div>
              <div style={{ fontSize: 12, color: '#6B7280' }}>{a.subject} · {a.size} · by {a.uploadedBy}</div>
            </div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
              <button className="btn btn-s btn-sm" onClick={() => handlePreview(a)}>👁 Preview</button>
              <button className="btn btn-p btn-sm" onClick={async () => {
                onApprove(a.id);
                addToast('success', 'Approved!');
                setLocalArtifacts(prev => prev.map(x => x.id === a.id ? { ...x, status: 'approved', rejection_reason: null } : x));
                try {
                  // Notify the uploader
                  if (a.uploaded_by_id) {
                    sendNotification(a.uploaded_by_id, 'E-Book Approved! 🎉', `Your upload "${a.title}" has been approved and is now live.`, 'success', '✅', 'in_app');
                  }
                  // Batch notify all active doctors
                  const { data: doctors } = await supabase.from('profiles').select('id').eq('role', 'doctor').eq('status', 'active');
                  if (doctors?.length) {
                    await supabase.from('notifications').insert(
                      doctors.map(d => ({
                        user_id: d.id,
                        title: 'New E-book',
                        body: `"${a.title}" is now available in the library.`,
                        type: 'info', icon: '📚', channel: 'in_app', unread: true,
                      }))
                    );
                  }
                } catch (_) {}
                try {
                  await supabase.functions.invoke('generate-embeddings', { body: { artifact_id: a.id } });
                } catch (e) { console.warn('Embeddings generation failed:', e.message); }
              }}>✅ Approve</button>
              <button className="btn btn-d btn-sm" onClick={() => { setRejectPending({ id: a.id, title: a.title }); setRejectReason(''); }}>✗ Reject</button>
              <div style={{ position: 'relative' }}>
                <button
                  className="btn btn-s btn-sm"
                  style={{ fontWeight: 700, letterSpacing: 1 }}
                  onClick={() => setOpenMenu(openMenu === a.id ? null : a.id)}
                >
                  ⋮
                </button>
                {openMenu === a.id && (
                  <div style={{ position: 'absolute', right: 0, top: '100%', marginTop: 4, background: '#fff', borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.12)', zIndex: 100, minWidth: 130, padding: 4, border: '1px solid #E5E7EB' }}>
                    <button
                      onClick={() => handleEditOpen(a)}
                      style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 14px', fontSize: 13, background: 'none', border: 'none', cursor: 'pointer', borderRadius: 6 }}
                    >
                      ✏️ Edit
                    </button>
                    <button
                      onClick={() => setPendingDeleteId(a.id)}
                      style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 14px', fontSize: 13, background: 'none', border: 'none', cursor: 'pointer', color: '#DC2626', borderRadius: 6 }}
                    >
                      🗑 Delete
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))
      }
      {rejectPending && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 600, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setRejectPending(null)}
        >
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 16, padding: 24, width: '100%', maxWidth: 400, margin: '0 16px', boxShadow: '0 16px 48px rgba(0,0,0,0.2)' }}>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}>✗ Reject "{rejectPending.title}"</div>
            <div style={{ fontSize: 13, color: '#6B7280', marginBottom: 12 }}>Provide a reason (shown to Content Admin):</div>
            <textarea
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              rows={3}
              placeholder="e.g. Incorrect information, needs revision…"
              style={{ width: '100%', borderRadius: 8, border: '1.5px solid #E5E7EB', padding: '8px 10px', fontSize: 13, resize: 'vertical', outline: 'none', boxSizing: 'border-box' }}
              autoFocus
            />
            <div style={{ display: 'flex', gap: 8, marginTop: 14, justifyContent: 'flex-end' }}>
              <button className="btn btn-s btn-sm" onClick={() => setRejectPending(null)}>Cancel</button>
              <button
                className="btn btn-d btn-sm"
                onClick={submitReject}
              >✗ Reject</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
