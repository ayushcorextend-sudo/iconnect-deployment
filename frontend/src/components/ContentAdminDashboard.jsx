import { useState, useMemo } from 'react';
import { supabase, fetchMyArtifacts, updateArtifact, deleteArtifact } from '../lib/supabase';
import { SPECIALITIES } from '../data/constants';
import QuizBuilder from './quiz/QuizBuilder';
import VideoManager from './content/VideoManager';
import FlashcardMaker from './content/FlashcardMaker';
import DoubtBoard from './content/DoubtBoard';
import KahootScheduler from './arena/KahootScheduler';

const SIDEBAR_TABS = [
  { key: 'ebooks',      icon: '📚', label: 'E-Library' },
  { key: 'quizzes',     icon: '📝', label: 'Quiz Builder' },
  { key: 'videos',      icon: '🎥', label: 'Video Manager' },
  { key: 'flashcards',  icon: '🃏', label: 'Flashcard Maker' },
  { key: 'kahoot',      icon: '🎮', label: 'Kahoot Scheduler' },
  { key: 'doubts',      icon: '💬', label: 'Doubt Resolution' },
];

const statusCfg = {
  pending:  { label: 'Pending',  bg: '#FEF3C7', color: '#D97706' },
  approved: { label: 'Live',     bg: '#DCFCE7', color: '#15803D' },
  rejected: { label: 'Rejected', bg: '#FEE2E2', color: '#DC2626' },
  archived: { label: 'Archived', bg: '#F3F4F6', color: '#6B7280' },
};

export default function ContentAdminDashboard({ userId, userName, role, setPage, addToast }) {
  const [activeTab, setActiveTab]   = useState('ebooks');
  const [myArtifacts, setMyArtifacts] = useState(null);  // null = not loaded yet
  const [libLoading, setLibLoading] = useState(false);
  const [libFilter, setLibFilter]   = useState('all');
  const [editTarget, setEditTarget] = useState(null);
  const [editForm, setEditForm]     = useState({ title: '', subject: '', description: '' });
  const [saving, setSaving]         = useState(false);

  // Load e-library on first visit to that tab
  const loadLibrary = async () => {
    if (myArtifacts !== null) return;  // already loaded
    setLibLoading(true);
    try {
      const data = await fetchMyArtifacts(userId);
      setMyArtifacts(data || []);
    } catch (e) {
      addToast('error', 'Failed to load library: ' + e.message);
    } finally {
      setLibLoading(false);
    }
  };

  const switchTab = (key) => {
    setActiveTab(key);
    if (key === 'ebooks') loadLibrary();
  };

  const stats = useMemo(() => {
    const arts = myArtifacts || [];
    return {
      total:    arts.length,
      pending:  arts.filter(a => a.status === 'pending').length,
      approved: arts.filter(a => a.status === 'approved').length,
      rejected: arts.filter(a => a.status === 'rejected').length,
    };
  }, [myArtifacts]);

  const filtered = useMemo(() => {
    const arts = myArtifacts || [];
    if (libFilter === 'pending')  return arts.filter(a => a.status === 'pending');
    if (libFilter === 'approved') return arts.filter(a => a.status === 'approved');
    if (libFilter === 'rejected') return arts.filter(a => a.status === 'rejected');
    return arts;
  }, [myArtifacts, libFilter]);

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
        ...(editTarget.status === 'rejected' ? { status: 'pending', rejection_reason: null } : {}),
      };
      await updateArtifact(editTarget.id, updates);
      setMyArtifacts(prev => (prev || []).map(a => a.id === editTarget.id ? { ...a, ...updates } : a));
      setEditTarget(null);
      addToast('success', editTarget.status === 'rejected' ? 'Re-submitted for approval!' : 'Updated.');
    } catch (e) {
      addToast('error', 'Update failed: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    const item = (myArtifacts || []).find(a => a.id === id);
    if (item?.status === 'approved') { addToast('error', 'Cannot delete approved content. Ask Super Admin.'); return; }
    if (!confirm(`Delete "${item?.title || 'this item'}"?`)) return;
    try {
      await deleteArtifact(id);
      setMyArtifacts(prev => (prev || []).filter(a => a.id !== id));
      addToast('success', 'Deleted.');
    } catch (e) {
      addToast('error', 'Delete failed: ' + e.message);
    }
  };

  return (
    <div className="page">
      <div className="ph">
        <div className="pt">Content Dashboard</div>
        <div className="ps">Manage all content channels — e-books, quizzes, videos, flashcards, and doubts</div>
      </div>

      {/* Layout: sidebar + main */}
      <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>

        {/* Sidebar */}
        <div style={{ width: 200, flexShrink: 0 }}>
          <div className="card" style={{ padding: '8px 0' }}>
            {SIDEBAR_TABS.map(t => (
              <button
                key={t.key}
                onClick={() => switchTab(t.key)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  width: '100%', padding: '11px 16px', border: 'none', cursor: 'pointer',
                  background: activeTab === t.key ? '#EFF6FF' : 'transparent',
                  color: activeTab === t.key ? '#1D4ED8' : '#374151',
                  fontWeight: activeTab === t.key ? 700 : 400,
                  fontSize: 14, borderRadius: 0,
                  borderLeft: activeTab === t.key ? '3px solid #2563EB' : '3px solid transparent',
                }}
              >
                <span>{t.icon}</span> {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Main content */}
        <div style={{ flex: 1, minWidth: 0 }}>

          {/* ── E-LIBRARY ─────────────────────────────────────── */}
          {activeTab === 'ebooks' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div style={{ fontWeight: 700, fontSize: 15 }}>E-Library</div>
                <button className="btn btn-p btn-sm" onClick={() => setPage('upload')}>📤 Upload E-Book</button>
              </div>

              <div className="sg4" style={{ marginBottom: 16 }}>
                {[
                  { l: 'Total', v: stats.total,    c: 'sky' },
                  { l: 'Pending', v: stats.pending,  c: 'amber' },
                  { l: 'Live',    v: stats.approved, c: 'teal' },
                  { l: 'Rejected', v: stats.rejected, c: 'rose' },
                ].map((s, i) => (
                  <div key={i} className={`stat ${s.c}`}>
                    <div className="stat-v">{s.v}</div>
                    <div className="stat-l">{s.l}</div>
                  </div>
                ))}
              </div>

              <div className="tabs" style={{ marginBottom: 14 }}>
                {[['all', `All (${stats.total})`], ['pending', `Pending (${stats.pending})`], ['approved', `Live (${stats.approved})`], ['rejected', `Rejected (${stats.rejected})`]].map(([k, l]) => (
                  <button key={k} className={`tab ${libFilter === k ? 'act' : ''}`} onClick={() => setLibFilter(k)}>{l}</button>
                ))}
              </div>

              {libLoading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
                  <div style={{ width: 24, height: 24, borderRadius: '50%', border: '3px solid #E5E7EB', borderTopColor: '#2563EB', animation: 'spin 0.8s linear infinite' }} />
                </div>
              ) : (filtered.length === 0 ? (
                <div className="empty">
                  <div className="empty-ic">📭</div>
                  <div className="empty-t">{libFilter === 'all' ? 'No uploads yet' : `No ${libFilter} items`}</div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {filtered.map(a => {
                    const sc = statusCfg[a.status] || { label: a.status, bg: '#F3F4F6', color: '#6B7280' };
                    return (
                      <div key={a.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: 14 }}>
                        <div style={{ width: 48, height: 62, borderRadius: 6, overflow: 'hidden', background: '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 22, border: '1px solid #E5E7EB' }}>
                          {a.thumbnail_url ? <img src={a.thumbnail_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (a.emoji || '📄')}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 700, fontSize: 14 }}>{a.title}</div>
                          <div style={{ fontSize: 12, color: '#6B7280' }}>{a.subject || '—'} · {a.size || '—'}</div>
                          {a.status === 'rejected' && a.rejection_reason && (
                            <div style={{ marginTop: 4, padding: '4px 8px', borderRadius: 6, background: '#FEF2F2', fontSize: 12, color: '#DC2626' }}>
                              <strong>Rejected:</strong> {a.rejection_reason}
                            </div>
                          )}
                        </div>
                        <span style={{ padding: '3px 10px', borderRadius: 12, fontSize: 11, fontWeight: 700, background: sc.bg, color: sc.color, flexShrink: 0 }}>{sc.label}</span>
                        {(a.status === 'pending' || a.status === 'rejected') && (
                          <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                            <button onClick={() => openEdit(a)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, padding: 4 }}>✏️</button>
                            <button onClick={() => handleDelete(a.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, padding: 4 }}>🗑️</button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          )}

          {/* ── QUIZ BUILDER ──────────────────────────────────── */}
          {activeTab === 'quizzes' && <QuizBuilder userId={userId} addToast={addToast} />}

          {/* ── VIDEO MANAGER ─────────────────────────────────── */}
          {activeTab === 'videos' && <VideoManager userId={userId} addToast={addToast} />}

          {/* ── FLASHCARD MAKER ───────────────────────────────── */}
          {activeTab === 'flashcards' && <FlashcardMaker userId={userId} addToast={addToast} />}

          {/* ── DOUBT BOARD ───────────────────────────────────── */}
          {activeTab === 'kahoot' && <KahootScheduler userId={userId} addToast={addToast} />}

          {/* ── DOUBT BOARD ───────────────────────────────────── */}
          {activeTab === 'doubts' && <DoubtBoard userId={userId} role={role} addToast={addToast} />}
        </div>
      </div>

      {/* Edit / Re-submit modal */}
      {editTarget && (
        <div className="overlay" onClick={() => setEditTarget(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="mh">
              <div className="mt">{editTarget.status === 'rejected' ? '✏️ Edit & Re-submit' : '✏️ Edit Artifact'}</div>
              <button className="mc" onClick={() => setEditTarget(null)}>×</button>
            </div>
            <div className="mb">
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
                <label className="fl">Category</label>
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
    </div>
  );
}
