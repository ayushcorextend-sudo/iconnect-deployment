import { useState, useRef, useEffect, useMemo } from 'react';
import { SPECIALITIES } from '../data/constants';
import { supabase, deleteArtifact, updateArtifact } from '../lib/supabase';

const EMOJIS = ['📗', '📘', '📙', '📕'];

export default function UploadPage({ onUpload, addToast, artifacts = [], onDelete, userId: userIdProp, userName: userNameProp }) {
  const [drag, setDrag] = useState(false);
  const [file, setFile] = useState(null);
  const [thumbnailFile, setThumbnailFile] = useState(null);
  const [thumbnailPreview, setThumbnailPreview] = useState(null);
  const [prog, setProg] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [done, setDone] = useState(false);
  const [form, setForm] = useState({ title: '', subject: '', access: 'all', description: '' });
  const [uploaderName, setUploaderName] = useState('');
  const [uploaderUserId, setUploaderUserId] = useState(null);
  const [myArtifacts, setMyArtifacts] = useState(artifacts);
  const [currentPage, setCurrentPage] = useState(1);
  const [previewItem, setPreviewItem] = useState(null);
  const [editTarget, setEditTarget] = useState(null);
  const [editForm, setEditForm] = useState({ title: '', subject: '', access: 'all', description: '' });
  const itemsPerPage = 6;
  const ref = useRef();

  useEffect(() => {
    // Use props if available (faster), otherwise query Supabase
    if (userIdProp && userNameProp) {
      setUploaderUserId(userIdProp);
      setUploaderName(userNameProp);
      return;
    }
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) {
        setUploaderUserId(data.user.id);
        supabase.from('profiles').select('name').eq('id', data.user.id).maybeSingle()
          .then(({ data: p }) => {
            setUploaderName(p?.name || data.user.email || 'Unknown');
          }).catch(() => setUploaderName(data.user.email || 'Unknown'));
      }
    });
  }, [userIdProp, userNameProp]);

  useEffect(() => { setMyArtifacts(artifacts); }, [artifacts]);

  useEffect(() => {
    const pageItems = myArtifacts.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
    if (pageItems.length === 0 && currentPage > 1) {
      setCurrentPage(Math.max(1, currentPage - 1));
    }
  }, [myArtifacts.length, currentPage]);

  const stats = useMemo(() => ({
    total: myArtifacts.length,
    approved: myArtifacts.filter(a => a.status === 'active' || a.status === 'approved').length,
    pending: myArtifacts.filter(a => a.status === 'pending').length,
    rejected: myArtifacts.filter(a => a.status === 'rejected').length,
    archived: myArtifacts.filter(a => a.status === 'archived').length,
  }), [myArtifacts]);

  const totalPages = Math.max(1, Math.ceil(myArtifacts.length / itemsPerPage));
  const paginatedArtifacts = myArtifacts.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleFile = f => {
    if (!f) return;
    if (f.type !== 'application/pdf') { addToast('error', 'Only PDF files allowed.'); return; }
    if (f.size > 50 * 1024 * 1024) { addToast('error', `File too large (${(f.size / 1024 / 1024).toFixed(1)}MB). Maximum is 50MB.`); return; }
    setFile(f);
    if (!form.title) set('title', f.name.replace('.pdf', ''));
  };

  const handleThumbnailChange = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith('image/')) { addToast('error', 'Thumbnail must be an image (JPG, PNG, WebP).'); return; }
    if (f.size > 5 * 1024 * 1024) { addToast('error', 'Thumbnail must be under 5MB.'); return; }
    setThumbnailFile(f);
    const reader = new FileReader();
    reader.onload = ev => setThumbnailPreview(ev.target.result);
    reader.readAsDataURL(f);
  };

  const submit = async () => {
    if (!file) { addToast('error', 'Please select a PDF.'); return; }
    if (!form.title.trim() || !form.subject) { addToast('error', 'Title and category are required.'); return; }

    // Resolve auth user ID at submit time (guard against race where component mounted before auth resolved)
    let authUserId = uploaderUserId;
    if (!authUserId) {
      const { data: authData } = await supabase.auth.getUser();
      authUserId = authData?.user?.id || null;
    }
    if (!authUserId) {
      addToast('error', 'Authentication error — please log out and log back in.');
      return;
    }

    setUploading(true);
    setProg(10);

    try {
      const emoji = EMOJIS[Math.floor(Math.random() * EMOJIS.length)];
      const size = (file.size / (1024 * 1024)).toFixed(1) + ' MB';
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const filePath = `${authUserId}/${Date.now()}_${safeName}`;
      const today = new Date().toISOString().split('T')[0];

      // ── STEP 1: Upload PDF to Storage (FATAL — stop on any error) ──
      setProg(30);
      const { error: storageError } = await supabase.storage
        .from('artifacts')
        .upload(filePath, file, { cacheControl: '3600', upsert: false });

      if (storageError) {
        throw new Error('Storage upload failed: ' + storageError.message);
      }

      const file_url = supabase.storage.from('artifacts').getPublicUrl(filePath).data.publicUrl;

      // ── STEP 2: Upload thumbnail (non-fatal — skip on failure) ──
      setProg(60);
      let thumbnail_url = null;
      if (thumbnailFile) {
        try {
          const thumbSafe = thumbnailFile.name.replace(/[^a-zA-Z0-9._-]/g, '_');
          const thumbPath = `${authUserId}/${Date.now()}_thumb_${thumbSafe}`;
          const { error: thumbErr } = await supabase.storage
            .from('artifacts')
            .upload(thumbPath, thumbnailFile, { cacheControl: '3600', upsert: false });
          if (!thumbErr) {
            thumbnail_url = supabase.storage.from('artifacts').getPublicUrl(thumbPath).data?.publicUrl || null;
          }
        } catch (_) { /* thumbnail is non-critical, continue */ }
      }

      // ── STEP 3: Insert DB row (FATAL — stop on any error) ──
      setProg(80);
      const insertPayload = {
        title: form.title.trim(),
        subject: form.subject,
        type: 'PDF',
        size,
        uploaded_by: uploaderName || 'Unknown',
        uploaded_by_id: authUserId,
        status: 'pending',
        emoji,
        access: form.access,
        downloads: 0,
        file_url,
        thumbnail_url,
        description: form.description || '',
        date: today,
      };

      const { data: inserted, error: dbError } = await supabase
        .from('artifacts')
        .insert(insertPayload)
        .select()
        .single();

      if (dbError) {
        throw new Error('Database insert failed: ' + dbError.message);
      }

      // ── STEP 4: Only on confirmed DB success — update UI and show toast ──
      setProg(100);
      const newArtifact = {
        ...insertPayload,
        id: inserted.id,
        uploadedBy: uploaderName || 'Unknown',
      };
      setDone(true);
      setMyArtifacts(prev => [newArtifact, ...prev]);
      setCurrentPage(1);
      onUpload(newArtifact);
      addToast('success', `"${form.title.trim()}" submitted for approval!`);

    } catch (err) {
      // Show exact error message — never silently swallow failures
      addToast('error', err.message || 'Upload failed. Please try again.');
      setProg(0);
    } finally {
      setUploading(false);
    }
  };

  const reset = () => {
    setFile(null); setThumbnailFile(null); setThumbnailPreview(null);
    setProg(0); setForm({ title: '', subject: '', access: 'all', description: '' }); setDone(false);
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this artifact? This action cannot be undone.')) return;
    setMyArtifacts(prev => prev.filter(a => a.id !== id));
    try {
      await deleteArtifact(id);
      addToast('success', 'Artifact deleted.');
      if (onDelete) onDelete(id);
    } catch (err) {
      addToast('error', 'Delete failed: ' + (err.message || 'Please try again'));
      setMyArtifacts(artifacts);
    }
  };

  const handleArchive = async (id) => {
    if (!confirm('Archive this artifact? It will be hidden from all users but not deleted.')) return;
    setMyArtifacts(prev => prev.map(a => a.id === id ? { ...a, status: 'archived' } : a));
    try {
      await updateArtifact(id, { status: 'archived' });
      addToast('success', 'Artifact archived.');
    } catch (err) {
      addToast('error', 'Archive failed: ' + (err.message || 'Try again'));
      setMyArtifacts(artifacts);
    }
  };

  const openEdit = (a) => {
    setEditTarget(a);
    setEditForm({ title: a.title || '', subject: a.subject || '', access: a.access || 'all', description: a.description || '' });
  };

  const handleEditSave = async () => {
    if (!editTarget) return;
    if (!editForm.title.trim() || !editForm.subject) { addToast('error', 'Title and subject are required.'); return; }
    setMyArtifacts(prev => prev.map(a => a.id === editTarget.id ? { ...a, ...editForm } : a));
    setEditTarget(null);
    try {
      await updateArtifact(editTarget.id, editForm);
      addToast('success', 'Artifact updated.');
    } catch (err) {
      addToast('error', 'Update failed: ' + (err.message || 'Try again'));
      setMyArtifacts(artifacts);
    }
  };

  const statusBadge = status => {
    if (status === 'active' || status === 'approved') return { label: 'Approved', bg: '#DCFCE7', color: '#15803D' };
    if (status === 'rejected') return { label: 'Rejected', bg: '#FEE2E2', color: '#DC2626' };
    if (status === 'archived') return { label: 'Archived', bg: '#F3F4F6', color: '#6B7280' };
    return { label: 'Pending', bg: '#FEF3C7', color: '#D97706' };
  };

  return (
    <div className="page">
      <div className="ph">
        <div className="pt">Content Management</div>
        <div className="ps">Upload and manage platform content artifacts</div>
      </div>

      {/* Stats Grid */}
      <div className="sg4" style={{ marginBottom: 24 }}>
        {[
          { l: 'Total Artifacts', v: stats.total, i: '📄', c: 'sky' },
          { l: 'Approved', v: stats.approved, i: '✅', c: 'teal' },
          { l: 'Pending Review', v: stats.pending, i: '⏳', c: 'amber' },
          { l: 'Rejected', v: stats.rejected, i: '❌', c: 'rose' },
          { l: 'Archived', v: stats.archived, i: '📦', c: 'sky' },
        ].map((s, i) => (
          <div key={i} className={`stat ${s.c} fu`} style={{ animationDelay: `${i * 0.06}s` }}>
            <div className="stat-ic">{s.i}</div>
            <div className="stat-v">{s.v}</div>
            <div className="stat-l">{s.l}</div>
          </div>
        ))}
      </div>

      {/* Split layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[400px_1fr] gap-6 items-start">

        {/* Left: Upload Form */}
        <div className="card">
          {!done ? (
            <>
              {/* Dropzone */}
              <div
                style={{
                  border: `2px dashed ${drag ? '#2563EB' : '#CBD5E1'}`,
                  borderRadius: 10,
                  padding: '24px 16px',
                  textAlign: 'center',
                  cursor: file ? 'default' : 'pointer',
                  background: drag ? '#EFF6FF' : '#F8FAFC',
                  marginBottom: 16,
                  transition: 'border-color .15s, background .15s',
                }}
                onDragOver={e => { e.preventDefault(); setDrag(true); }}
                onDragLeave={() => setDrag(false)}
                onDrop={e => { e.preventDefault(); setDrag(false); handleFile(e.dataTransfer.files[0]); }}
                onClick={() => !file && ref.current.click()}
              >
                <input ref={ref} type="file" accept=".pdf" style={{ display: 'none' }} onChange={e => handleFile(e.target.files[0])} />
                {file ? (
                  <div>
                    <div style={{ fontSize: 32 }}>📄</div>
                    <div style={{ fontWeight: 600, fontSize: 14, marginTop: 6 }}>{file.name}</div>
                    <div style={{ fontSize: 12, color: '#6B7280' }}>{(file.size / (1024 * 1024)).toFixed(2)} MB</div>
                    {!uploading && (
                      <button className="btn btn-s btn-sm" style={{ marginTop: 8 }} onClick={e => { e.stopPropagation(); setFile(null); }}>Change</button>
                    )}
                    {uploading && <div className="pb" style={{ marginTop: 12 }}><div className="pf" style={{ width: `${prog}%` }} /></div>}
                    {uploading && <div style={{ fontSize: 12, color: '#6B7280', marginTop: 4 }}>Uploading… {prog}%</div>}
                  </div>
                ) : (
                  <div>
                    <div style={{ fontSize: 32 }}>☁️</div>
                    <div style={{ fontWeight: 600, fontSize: 14, marginTop: 6, color: '#374151' }}>Drag & drop file here or click to browse</div>
                    <div style={{ fontSize: 12, color: '#6B7280', marginTop: 4 }}>PDF, EPUB, DOCX — Max 50MB</div>
                  </div>
                )}
              </div>

              <div className="fg">
                <label className="fl">Content Type</label>
                <select className="fi-sel" value={form.access} onChange={e => set('access', e.target.value)}>
                  <option value="all">PDF Document</option>
                  <option value="md_ms">Study Material</option>
                  <option value="dm_mch">Reference Book</option>
                </select>
              </div>

              <div className="fg">
                <label className="fl">Title <span className="req">*</span></label>
                <input className="fi-in" placeholder="e.g. Harrison's Principles of Internal Medicine" value={form.title} onChange={e => set('title', e.target.value)} />
              </div>

              <div className="fg">
                <label className="fl">Category <span className="req">*</span></label>
                <select className="fi-sel" value={form.subject} onChange={e => set('subject', e.target.value)}>
                  <option value="">Select subject…</option>
                  {Object.entries(SPECIALITIES).map(([prog, subs]) => (
                    <optgroup key={prog} label={prog}>
                      {subs.map(s => <option key={s} value={s}>{s}</option>)}
                    </optgroup>
                  ))}
                </select>
              </div>

              <div className="fg">
                <label className="fl">Description</label>
                <textarea className="fi-ta" placeholder="Brief description…" value={form.description} onChange={e => set('description', e.target.value)} />
              </div>

              <div className="fg">
                <label className="fl">Cover Image <span style={{ fontWeight: 400, color: '#9CA3AF' }}>(optional — max 5MB)</span></label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 52, height: 68, borderRadius: 6, overflow: 'hidden', background: '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0, border: '1px dashed #D1D5DB' }}>
                    {thumbnailPreview
                      ? <img src={thumbnailPreview} alt="Cover preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : '🖼️'}
                  </div>
                  <div>
                    <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleThumbnailChange} style={{ fontSize: 12 }} />
                    {thumbnailFile && (
                      <button onClick={() => { setThumbnailFile(null); setThumbnailPreview(null); }} style={{ fontSize: 12, color: '#EF4444', background: 'none', border: 'none', cursor: 'pointer', marginTop: 4, display: 'block' }}>
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <button
                style={{
                  width: '100%', background: '#2563EB', color: '#fff', border: 'none',
                  borderRadius: 8, padding: '10px 0', fontSize: 14, fontWeight: 600,
                  cursor: uploading ? 'not-allowed' : 'pointer', opacity: uploading ? 0.7 : 1,
                  marginTop: 4,
                }}
                onClick={submit}
                disabled={uploading}
              >
                {uploading ? `Uploading ${prog}%…` : 'Submit for Approval'}
              </button>
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '32px 16px' }}>
              <div style={{ fontSize: 48, marginBottom: 10 }}>🎉</div>
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}>Upload Successful!</div>
              <div style={{ fontSize: 13, color: '#6B7280', marginBottom: 20 }}>
                &quot;{form.title}&quot; submitted. Super Admin will review shortly.
              </div>
              <button className="btn btn-s" onClick={reset}>Upload Another</button>
            </div>
          )}
        </div>

        {/* Right: Recently Uploaded Artifacts */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #F1F5F9' }}>
            <div style={{ fontWeight: 700, fontSize: 14 }}>Recently Uploaded Artifacts</div>
          </div>
          {paginatedArtifacts.length === 0 ? (
            <div className="empty" style={{ padding: '40px 20px' }}>
              <div className="empty-ic">📂</div>
              <div className="empty-t">No artifacts yet</div>
              <div className="empty-s">Upload your first PDF to see it here.</div>
            </div>
          ) : (
            <>
              <div>
                {paginatedArtifacts.map(a => {
                  const badge = statusBadge(a.status);
                  return (
                    <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 20px', borderBottom: '1px solid #F1F5F9' }}>
                      <div style={{ fontSize: 24, flexShrink: 0 }}>{a.emoji || '📄'}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.title}</div>
                        <div style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>{a.subject} · {a.date}</div>
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 12, background: badge.bg, color: badge.color, flexShrink: 0 }}>
                        {badge.label}
                      </span>
                      <button
                        onClick={() => setPreviewItem(a)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: '#6B7280', flexShrink: 0, padding: '2px 4px', lineHeight: 1 }}
                        title="Preview artifact"
                      >👁️</button>
                      <button
                        onClick={() => openEdit(a)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: '#6B7280', flexShrink: 0, padding: '2px 4px', lineHeight: 1 }}
                        title="Edit artifact"
                      >✏️</button>
                      {a.status !== 'archived' && (
                        <button
                          onClick={() => handleArchive(a.id)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: '#9CA3AF', flexShrink: 0, padding: '2px 4px', lineHeight: 1 }}
                          title="Archive artifact"
                        >📦</button>
                      )}
                      <button
                        onClick={() => handleDelete(a.id)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: '#9CA3AF', flexShrink: 0, padding: '2px 4px', lineHeight: 1 }}
                        title="Delete artifact"
                      >🗑</button>
                    </div>
                  );
                })}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderTop: '1px solid #F1F5F9', fontSize: 12, color: '#6B7280' }}>
                <span>Page {currentPage} of {totalPages} ({myArtifacts.length} items)</span>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-s btn-sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>Previous</button>
                  <button className="btn btn-s btn-sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>Next</button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Edit Modal ──────────────────────────────────────────────── */}
      {editTarget && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          onClick={() => setEditTarget(null)}
        >
          <div
            style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 480, boxShadow: '0 24px 60px rgba(0,0,0,0.2)', overflow: 'hidden' }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ padding: '14px 20px', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontWeight: 700, fontSize: 15 }}>Edit Artifact</div>
              <button onClick={() => setEditTarget(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: '#9CA3AF' }}>×</button>
            </div>
            <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="fg">
                <label className="fl">Title <span className="req">*</span></label>
                <input className="fi-in" value={editForm.title} onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))} />
              </div>
              <div className="fg">
                <label className="fl">Category <span className="req">*</span></label>
                <select className="fi-sel" value={editForm.subject} onChange={e => setEditForm(f => ({ ...f, subject: e.target.value }))}>
                  <option value="">Select subject…</option>
                  {Object.entries(SPECIALITIES).map(([prog, subs]) => (
                    <optgroup key={prog} label={prog}>
                      {subs.map(s => <option key={s} value={s}>{s}</option>)}
                    </optgroup>
                  ))}
                </select>
              </div>
              <div className="fg">
                <label className="fl">Access</label>
                <select className="fi-sel" value={editForm.access} onChange={e => setEditForm(f => ({ ...f, access: e.target.value }))}>
                  <option value="all">PDF Document</option>
                  <option value="md_ms">Study Material</option>
                  <option value="dm_mch">Reference Book</option>
                </select>
              </div>
              <div className="fg">
                <label className="fl">Description</label>
                <textarea className="fi-ta" value={editForm.description} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))} />
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button className="btn btn-s btn-sm" onClick={() => setEditTarget(null)}>Cancel</button>
                <button className="btn btn-s" onClick={handleEditSave}>Save Changes</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Preview Modal ─────────────────────────────────────────── */}
      {previewItem && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          onClick={() => setPreviewItem(null)}
        >
          <div
            style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 580, maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 24px 60px rgba(0,0,0,0.25)' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{ padding: '14px 20px', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 28, flexShrink: 0 }}>{previewItem.emoji || '📄'}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{previewItem.title}</div>
                <div style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>{previewItem.subject} · Uploaded {previewItem.date}</div>
              </div>
              <button
                onClick={() => setPreviewItem(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: '#9CA3AF', lineHeight: 1, padding: 4, flexShrink: 0 }}
              >×</button>
            </div>

            {/* Body */}
            <div
              style={{ flex: 1, overflow: 'auto', padding: 20, userSelect: 'none', background: '#525659' }}
              onContextMenu={e => e.preventDefault()}
            >
              {/* Watermark overlay */}
              <div style={{ position: 'relative' }}>
                <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 1 }}>
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} style={{ opacity: 0.07, transform: 'rotate(-30deg)', fontSize: 11, fontWeight: 700, color: '#fff', padding: '22px 8px', whiteSpace: 'nowrap' }}>
                      iConnect Preview · {previewItem.title}
                    </div>
                  ))}
                </div>
                {/* Mock PDF page */}
                <div style={{ background: '#fff', borderRadius: 8, padding: '28px 32px', minHeight: 340, position: 'relative', zIndex: 2 }}>
                  <div style={{ borderBottom: '2px solid #E5E7EB', paddingBottom: 14, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: 24 }}>{previewItem.emoji || '📄'}</span>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: 16, color: '#1E40AF' }}>{previewItem.title}</div>
                      <div style={{ fontSize: 12, color: '#6B7280', marginTop: 3 }}>{previewItem.subject} · {previewItem.type || 'PDF'} · {previewItem.size || '—'}</div>
                    </div>
                  </div>
                  <p style={{ fontSize: 13, color: '#374151', lineHeight: 1.75, marginBottom: 14 }}>
                    {previewItem.description || 'This document covers comprehensive medical content for postgraduate entrance examinations. Content is structured for rapid review across all major speciality topics with evidence-based clinical guidelines.'}
                  </p>
                  <p style={{ fontSize: 13, color: '#6B7280', lineHeight: 1.75, marginBottom: 14 }}>
                    Lorem ipsum dolor sit amet, consectetur adipiscing elit. Proin nibh nisl, condimentum id venenatis a, condimentum vitae sapien pellentesque habitant morbi tristique senectus et netus.
                  </p>
                  <p style={{ fontSize: 13, color: '#6B7280', lineHeight: 1.75 }}>
                    Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident.
                  </p>
                  <div style={{ marginTop: 20, padding: '10px 14px', background: '#F0FDF4', borderRadius: 8, border: '1px solid #BBF7D0', fontSize: 12, color: '#166534' }}>
                    📋 Content preview only. Full document accessible after approval by Super Admin.
                  </div>
                  <div style={{ marginTop: 14, borderTop: '1px solid #E5E7EB', paddingTop: 10, fontSize: 11, color: '#9CA3AF', textAlign: 'center' }}>
                    Page 1 · {previewItem.title} · iConnect Medical Library
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div style={{ padding: '12px 20px', borderTop: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#F9FAFB' }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: '#6B7280' }}>Status:</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: previewItem.status === 'approved' ? '#059669' : previewItem.status === 'rejected' ? '#DC2626' : '#D97706' }}>
                  {previewItem.status === 'approved' ? '✅ Approved' : previewItem.status === 'rejected' ? '❌ Rejected' : '⏳ Pending Review'}
                </span>
              </div>
              <button className="btn btn-s btn-sm" onClick={() => setPreviewItem(null)}>Close Preview</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
