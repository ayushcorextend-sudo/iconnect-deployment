import { useState } from 'react';

const demoPages = [
  { h: 'Chapter 1: Introduction', b: 'This comprehensive medical textbook covers core principles required for postgraduate medical examinations. Content is organized for rapid review and deep understanding across all major specialities.' },
  { h: 'Chapter 2: Pathophysiology', b: 'Understanding pathophysiology is essential for clinical reasoning. Each condition is described with underlying mechanism, clinical presentation, diagnostic criteria, and evidence-based management.' },
  { h: 'Chapter 3: Clinical Application', b: "Case-based learning enhances retention. Common clinical scenarios with detailed explanations of diagnostic and therapeutic approaches aligned with current NEET-PG guidelines." },
  { h: 'Chapter 4: High-Yield MCQs', b: "Previous years' questions from AIIMS, PGI, NEET-PG, and other major national PG entrance exams with detailed answer explanations for each option." },
];

export default function EBooksPage({ artifacts = [], role, onApprove, onReject, addToast }) {
  const [viewMode, setVM] = useState('grid');
  const [tab, setTab] = useState('all');
  const [search, setSearch] = useState('');
  const [viewer, setViewer] = useState(null);
  const [zoom, setZoom] = useState(100);
  const [pg, setPg] = useState(1);
  const [fullscreen, setFS] = useState(false);

  const visible = artifacts.filter(a => {
    if (role === 'doctor' && tab === 'approved' && a.status !== 'approved') return false;
    if (tab === 'pending' && a.status !== 'pending') return false;
    if (tab === 'approved' && a.status !== 'approved') return false;
    if (search && !a.title.toLowerCase().includes(search.toLowerCase()) && !a.subject.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  if (viewer) return (
    <div className="page" style={fullscreen ? { position: 'fixed', inset: 0, zIndex: 150, background: '#525659', margin: 0, padding: 0 } : {}}>
      {!fullscreen && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <button className="btn btn-s btn-sm" onClick={() => setViewer(null)}>← Back</button>
          <div>
            <div style={{ fontFamily: 'Inter,sans-serif', fontWeight: 700, fontSize: 16 }}>{viewer.emoji} {viewer.title}</div>
            <div style={{ fontSize: 12, color: '#6B7280' }}>{viewer.subject} · {viewer.pages} pages</div>
          </div>
        </div>
      )}
      <div className="pdf-v" style={fullscreen ? { borderRadius: 0, height: '100vh' } : {}}>
        <div className="pdf-tb">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button className="pdf-btn" disabled={pg <= 1} onClick={() => setPg(p => p - 1)}>◀ Prev</button>
            <span style={{ color: 'rgba(255,255,255,.6)', fontSize: 12 }}>Page {pg} of {demoPages.length}</span>
            <button className="pdf-btn" disabled={pg >= demoPages.length} onClick={() => setPg(p => p + 1)}>Next ▶</button>
          </div>
          <span style={{ color: 'rgba(255,255,255,.55)', fontSize: 12, fontFamily: 'Inter,sans-serif' }}>{viewer.title}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button className="pdf-btn" onClick={() => setZoom(z => Math.max(50, z - 25))}>−</button>
            <span style={{ color: 'rgba(255,255,255,.6)', fontSize: 12, minWidth: 38, textAlign: 'center' }}>{zoom}%</span>
            <button className="pdf-btn" onClick={() => setZoom(z => Math.min(250, z + 25))}>+</button>
            <button className="pdf-btn" onClick={() => setZoom(100)}>Reset</button>
            <button className="pdf-btn" onClick={() => setFS(f => !f)}>{fullscreen ? '⤡' : '⤢'}</button>
            {fullscreen && <button className="pdf-btn" onClick={() => { setFS(false); setViewer(null); }}>✕ Close</button>}
          </div>
        </div>
        <div className="pdf-page-area">
          <div className="pdf-page" style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top center' }}>
            <h2>{demoPages[pg - 1].h}</h2>
            <p>{demoPages[pg - 1].b}</p>
            <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Proin nibh nisl condimentum id venenatis a condimentum vitae sapien pellentesque habitant morbi.</p>
            <p>Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim.</p>
            <p style={{ fontSize: 12, color: '#999', marginTop: 20, borderTop: '1px solid #eee', paddingTop: 10 }}>Page {pg} · {viewer.title} · iConnect Medical Library</p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="page">
      <div className="ph-row ph">
        <div>
          <div className="pt">📚 E-Book Library</div>
          <div className="ps">{visible.length} document{visible.length !== 1 ? 's' : ''}</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <div className="search-bar">
            <span>🔍</span>
            <input placeholder="Search books…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <button className={`btn btn-sm ${viewMode === 'grid' ? 'btn-p' : 'btn-s'}`} onClick={() => setVM('grid')}>⊞</button>
          <button className={`btn btn-sm ${viewMode === 'list' ? 'btn-p' : 'btn-s'}`} onClick={() => setVM('list')}>☰</button>
        </div>
      </div>

      <div className="tabs">
        {[['all', 'All'], ['approved', 'Approved'], ['pending', 'Pending']].map(([k, l]) => (
          <button key={k} className={`tab ${tab === k ? 'act' : ''}`} onClick={() => setTab(k)}>{l}</button>
        ))}
      </div>

      {role === 'doctor' && artifacts.filter(a => a.status === 'pending').length > 0 && tab !== 'approved' && (
        <div style={{ background: '#FFFBEB', border: '1px solid rgba(255,179,71,.3)', borderRadius: 12, padding: '10px 16px', fontSize: 13, color: '#92400E', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          ⏳ <strong>{artifacts.filter(a => a.status === 'pending').length} new book{artifacts.filter(a => a.status === 'pending').length > 1 ? 's' : ''}</strong> are being verified by Admin. You can see them below — interaction unlocks after approval.
        </div>
      )}

      {viewMode === 'grid' ? (
        <div className="eg">
          {visible.map(a => (
            <div key={a.id} className="ec" onClick={() => { if (a.status === 'approved') { setViewer(a); setPg(1); setZoom(100); } }}>
              <div className="ec-cover" style={{ background: a.status === 'pending' ? '#F3F4F6' : 'linear-gradient(135deg,#EFF6FF,#F3F4F6)' }}>
                <span>{a.emoji}</span>
                {a.status === 'pending' && <span className="bdg bg-a" style={{ position: 'absolute', top: 8, right: 8 }}>⏳ Pending Verification</span>}
                {a.access !== 'all' && <span className="bdg bg-v" style={{ position: 'absolute', top: 8, left: 8, fontSize: 9 }}>{a.access === 'md_ms' ? 'MD/MS' : 'DM/MCh'}</span>}
              </div>
              <div className="ec-body">
                <div className="ec-title">{a.title}</div>
                <div className="ec-meta">{a.subject} · {a.pages} pages</div>
                <div style={{ marginTop: 6 }}>
                  <span className={`bdg ${a.status === 'approved' ? 'bg-g' : 'bg-a'}`}>{a.status === 'approved' ? 'Available' : 'Pending Verification'}</span>
                </div>
              </div>
              <div className="ec-foot">
                <span style={{ fontSize: 11, color: '#6B7280' }}>⬇️ {a.downloads.toLocaleString()}</span>
                {role === 'superadmin' && a.status === 'pending' ? (
                  <div style={{ display: 'flex', gap: 4 }} onClick={e => e.stopPropagation()}>
                    <button className="btn btn-p btn-sm" onClick={() => { onApprove(a.id); addToast('success', 'Approved!'); }}>✅</button>
                    <button className="btn btn-d btn-sm" onClick={() => { onReject(a.id); addToast('error', 'Rejected'); }}>✗</button>
                  </div>
                ) : a.status === 'approved' ? (
                  <button className="btn btn-p btn-sm">Read →</button>
                ) : (
                  <span style={{ fontSize: 11, color: '#6B7280' }}>Locked</span>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card">
          <div className="tw">
            <table>
              <thead>
                <tr>
                  <th>Title</th><th>Subject</th><th>Access</th><th>Status</th><th>Downloads</th><th>Action</th>
                </tr>
              </thead>
              <tbody>
                {visible.map(a => (
                  <tr key={a.id}>
                    <td><div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><span style={{ fontSize: 18 }}>{a.emoji}</span><span style={{ fontWeight: 600, fontSize: 13 }}>{a.title}</span></div></td>
                    <td><span className="bdg bg-v">{a.subject}</span></td>
                    <td><span className="bdg bg-s">{a.access === 'md_ms' ? 'MD/MS Only' : a.access === 'dm_mch' ? 'DM/MCh' : 'All'}</span></td>
                    <td><span className={`bdg ${a.status === 'approved' ? 'bg-g' : 'bg-a'}`}>{a.status === 'approved' ? '✅ Approved' : '⏳ Pending Verification'}</span></td>
                    <td>{a.downloads.toLocaleString()}</td>
                    <td>
                      {a.status === 'approved'
                        ? <button className="btn btn-p btn-sm" onClick={() => { setViewer(a); setPg(1); setZoom(100); }}>Read</button>
                        : role === 'superadmin'
                          ? <div style={{ display: 'flex', gap: 4 }}>
                            <button className="btn btn-p btn-sm" onClick={() => { onApprove(a.id); addToast('success', 'Approved!'); }}>✅</button>
                            <button className="btn btn-d btn-sm" onClick={() => { onReject(a.id); addToast('error', 'Rejected'); }}>✗</button>
                          </div>
                          : <span style={{ fontSize: 11, color: '#6B7280' }}>Pending Verification</span>
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {visible.length === 0 && (
        <div className="empty">
          <div className="empty-ic">📭</div>
          <div className="empty-t">No books found</div>
          <div className="empty-s">{search ? 'Try a different term.' : 'No e-books here yet.'}</div>
        </div>
      )}
    </div>
  );
}
