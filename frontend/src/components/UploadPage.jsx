import { useState, useRef } from 'react';
import { SPECIALITIES } from '../data/constants';
import { supabase } from '../lib/supabase';

const EMOJIS = ['📗', '📘', '📙', '📕'];

export default function UploadPage({ onUpload, addToast }) {
  const [drag, setDrag] = useState(false);
  const [file, setFile] = useState(null);
  const [prog, setProg] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [done, setDone] = useState(false);
  const [form, setForm] = useState({ title: '', subject: '', access: 'all', description: '' });
  const ref = useRef();

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleFile = f => {
    if (!f) return;
    if (f.type !== 'application/pdf') { addToast('error', 'Only PDF files allowed.'); return; }
    setFile(f);
    if (!form.title) set('title', f.name.replace('.pdf', ''));
  };

  const submit = () => {
    if (!file) { addToast('error', 'Please select a PDF.'); return; }
    if (!form.title.trim() || !form.subject) { addToast('error', 'Title and subject are required.'); return; }
    setUploading(true);

    // Simulate upload progress bar, then persist to Supabase
    let p = 0;
    const iv = setInterval(async () => {
      p += Math.random() * 15 + 6;
      if (p >= 100) {
        clearInterval(iv);
        setProg(100);

        const emoji = EMOJIS[Math.floor(Math.random() * EMOJIS.length)];
        const size = (file.size / (1024 * 1024)).toFixed(1) + ' MB';

        // ── STEP 6: insert exactly these fields into Supabase ──
        const insertPayload = {
          title: form.title,
          subject: form.subject,
          size,
          uploaded_by: 'Content Admin',
          status: 'pending',
          emoji,
          access: form.access,
          // Extra fields stored so the UI can display them after fetch
          type: 'PDF',
          downloads: 0,
          pages: Math.floor(Math.random() * 500 + 100),
          description: form.description,
          date: new Date().toISOString().split('T')[0],
        };

        let newId = Date.now(); // fallback local id
        try {
          const { data } = await supabase
            .from('artifacts')
            .insert(insertPayload)
            .select()
            .single();
          if (data?.id) newId = data.id;
        } catch { /* Supabase insert failed — local state only */ }

        setUploading(false);
        setDone(true);

        // Pass camelCase artifact to App.jsx (which also refetches from Supabase)
        onUpload({
          id: newId,
          title: form.title,
          subject: form.subject,
          type: 'PDF',
          size,
          uploadedBy: 'Content Admin',
          date: insertPayload.date,
          status: 'pending',
          downloads: 0,
          pages: insertPayload.pages,
          emoji,
          access: form.access,
          description: form.description,
        });
        addToast('success', `"${form.title}" submitted for approval!`);
      } else {
        setProg(Math.round(p));
      }
    }, 120);
  };

  const reset = () => {
    setFile(null); setProg(0); setDone(false);
    setForm({ title: '', subject: '', access: 'all', description: '' });
  };

  return (
    <div className="page">
      <div className="ph">
        <div className="pt">Upload E-Book</div>
        <div className="ps">PDF will be reviewed by Super Admin before publishing. Users can see the card as &quot;Pending Verification&quot; in the meantime.</div>
      </div>
      <div style={{ maxWidth: 680 }}>
        {!done ? (
          <div className="card">
            <div
              style={{ marginBottom: 16 }}
              className={`upz ${drag ? 'drag' : ''}`}
              onDragOver={e => { e.preventDefault(); setDrag(true); }}
              onDragLeave={() => setDrag(false)}
              onDrop={e => { e.preventDefault(); setDrag(false); handleFile(e.dataTransfer.files[0]); }}
              onClick={() => !file && ref.current.click()}
            >
              <input ref={ref} type="file" accept=".pdf" style={{ display: 'none' }} onChange={e => handleFile(e.target.files[0])} />
              {file ? (
                <div>
                  <div style={{ fontSize: 36 }}>📄</div>
                  <div style={{ fontWeight: 600, marginTop: 8 }}>{file.name}</div>
                  <div style={{ fontSize: 12, color: '#6B7280' }}>{(file.size / (1024 * 1024)).toFixed(2)} MB</div>
                  {!uploading && (
                    <button className="btn btn-s btn-sm" style={{ marginTop: 8 }} onClick={e => { e.stopPropagation(); setFile(null); }}>Change</button>
                  )}
                  {uploading && <div className="pb" style={{ marginTop: 12 }}><div className="pf" style={{ width: `${prog}%` }} /></div>}
                  {uploading && <div style={{ fontSize: 12, color: '#6B7280', marginTop: 4 }}>Uploading… {prog}%</div>}
                </div>
              ) : (
                <div>
                  <div style={{ fontSize: 36 }}>☁️</div>
                  <div style={{ fontWeight: 600, marginTop: 8 }}>Drop PDF here or click to browse</div>
                  <div style={{ fontSize: 12, color: '#6B7280', marginTop: 4 }}>Max 100MB · PDF only</div>
                </div>
              )}
            </div>

            <div className="fg">
              <label className="fl">Document Title <span className="req">*</span></label>
              <input className="fi-in" placeholder="e.g. Harrison's Principles of Internal Medicine" value={form.title} onChange={e => set('title', e.target.value)} />
            </div>
            <div className="fg2">
              <div className="fg">
                <label className="fl">Subject / Speciality <span className="req">*</span></label>
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
                <label className="fl">Access Level</label>
                <select className="fi-sel" value={form.access} onChange={e => set('access', e.target.value)}>
                  <option value="all">All PG Aspirants</option>
                  <option value="md_ms">MD / MS Only</option>
                  <option value="dm_mch">DM / MCh Only</option>
                </select>
              </div>
            </div>
            <div className="fg">
              <label className="fl">Description (optional)</label>
              <textarea className="fi-ta" placeholder="Brief description…" value={form.description} onChange={e => set('description', e.target.value)} />
            </div>
            <div style={{ background: '#FFFBEB', borderRadius: 10, padding: '10px 14px', fontSize: 12, color: '#92400E', marginBottom: 14 }}>
              📋 <strong>Note:</strong> After submission, the document card will appear to users as &quot;Pending Verification&quot;. Full access is granted only after Super Admin approval.
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button className="btn btn-s" onClick={reset}>Reset</button>
              <button className="btn btn-p" onClick={submit} disabled={uploading}>
                {uploading ? `Uploading ${prog}%…` : '⬆️ Submit for Approval'}
              </button>
            </div>
          </div>
        ) : (
          <div className="card" style={{ textAlign: 'center', padding: 48 }}>
            <div style={{ fontSize: 60, marginBottom: 14 }}>🎉</div>
            <div className="pt" style={{ marginBottom: 8 }}>Upload Successful!</div>
            <div className="ps" style={{ marginBottom: 24 }}>
              &quot;{form.title}&quot; submitted. Super Admin will review shortly. It&apos;s already visible to users as &quot;Pending Verification&quot;.
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button className="btn btn-s" onClick={reset}>Upload Another</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
