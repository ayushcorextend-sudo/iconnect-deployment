import { useState, useEffect, useRef, useMemo } from 'react';
import { supabase, getUserContentStates, toggleBookmark, updateReadingProgress, getNotes, saveNote, deleteNote } from '../lib/supabase';
import { trackActivity, startTimer, stopTimer } from '../lib/trackActivity';
import PDFReaderView from './ebooks/PDFReaderView';
import LibraryFilterBar from './ebooks/LibraryFilterBar';
import SemanticSearch from './search/SemanticSearch';
import { useAuth } from '../context/AuthContext';

export default function EBooksPage({ artifacts = [], role, onApprove, onReject, addToast }) {
  const { user } = useAuth();
  const [viewMode, setVM] = useState('grid');
  const [tab, setTab] = useState(role === 'doctor' ? 'approved' : 'all');
  const [showReadingQuiz, setShowReadingQuiz] = useState(false);
  const [showSmartNotes, setShowSmartNotes] = useState(false);
  const [viewer, setViewer] = useState(null);
  const [zoom, setZoom] = useState(100);
  const [pg, setPg] = useState(1);
  const [fullscreen, setFS] = useState(false);
  const [localArtifacts, setLocalArtifacts] = useState(artifacts);
  const [wmName, setWmName] = useState('iConnect User');

  const [currentUserId, setCurrentUserId] = useState(null);
  const [contentStates, setContentStates] = useState({});

  const progressDebounceRef = useRef(null);

  const [showNotes, setShowNotes] = useState(false);
  const [notes, setNotes] = useState([]);
  const [noteText, setNoteText] = useState('');
  const [notesSaving, setNotesSaving] = useState(false);

  const [libLoading, setLibLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('All');
  const [showOnlyBookmarked, setShowOnlyBookmarked] = useState(false);
  const [sortBy, setSortBy] = useState('newest');

  useEffect(() => setLocalArtifacts(artifacts), [artifacts]);

  useEffect(() => {
    async function init() {
      try {
        if (!user?.id) return;
        setCurrentUserId(user.id);
        const name = user.user_metadata?.name || user.email || 'iConnect User';
        setWmName(name);
        const states = await getUserContentStates(user.id);
        setContentStates(states);
      } catch (e) {
        console.warn('EBooksPage: failed to load content states:', e.message);
      } finally {
        setLibLoading(false);
      }
    }
    init();
  }, []);

  useEffect(() => {
    if (!viewer) return;
    if (viewer.file_url || pg === (viewer.pages || 0)) markSubjectComplete(viewer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pg, viewer]);

  useEffect(() => {
    if (!viewer || !currentUserId) return;
    if (progressDebounceRef.current) clearTimeout(progressDebounceRef.current);
    progressDebounceRef.current = setTimeout(async () => {
      try {
        await updateReadingProgress(currentUserId, viewer.id, pg);
        setContentStates(prev => ({
          ...prev,
          [String(viewer.id)]: { ...prev[String(viewer.id)], currentPage: pg },
        }));
      } catch (e) { console.warn('EBooksPage: failed to update reading progress:', e.message); }
    }, 2000);
    return () => { if (progressDebounceRef.current) clearTimeout(progressDebounceRef.current); };
  }, [pg, viewer, currentUserId]);

  const uniqueSubjects = useMemo(
    () => [...new Set(localArtifacts.map(a => a.subject).filter(Boolean))].sort(),
    [localArtifacts]
  );

  const filteredArtifacts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const result = localArtifacts.filter(a => {
      if (a.status === 'archived') return false;
      if (role === 'doctor' && tab === 'approved' && a.status !== 'approved') return false;
      if (tab === 'pending' && a.status !== 'pending') return false;
      if (tab === 'approved' && a.status !== 'approved') return false;
      if (q && !a.title.toLowerCase().includes(q)) return false;
      if (selectedSubject !== 'All' && a.subject !== selectedSubject) return false;
      if (showOnlyBookmarked && !contentStates[String(a.id)]?.isBookmarked) return false;
      return true;
    });
    if (sortBy === 'downloads') return [...result].sort((a, b) => (b.downloads || 0) - (a.downloads || 0));
    if (sortBy === 'az') return [...result].sort((a, b) => a.title.localeCompare(b.title));
    return [...result].sort((a, b) => (b.id || 0) - (a.id || 0));
  }, [localArtifacts, tab, role, searchQuery, selectedSubject, showOnlyBookmarked, contentStates, sortBy]);

  const activeFilterCount = (searchQuery ? 1 : 0) + (selectedSubject !== 'All' ? 1 : 0) + (showOnlyBookmarked ? 1 : 0) + (sortBy !== 'newest' ? 1 : 0);

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedSubject('All');
    setShowOnlyBookmarked(false);
    setSortBy('newest');
  };

  const handleRead = async (item) => {
    const savedPage = contentStates[String(item.id)]?.currentPage || 1;
    setViewer(item);
    setPg(Math.min(savedPage, item.pages || 1));
    const storedZoom = localStorage.getItem(`ebook_zoom_${item.id}`);
    setZoom(storedZoom ? Number(storedZoom) : 100);
    startTimer('article_read', item.id);
  };

  const handleZoom = (newZoom) => {
    const clamped = Math.min(250, Math.max(50, newZoom));
    setZoom(clamped);
    if (viewer) localStorage.setItem(`ebook_zoom_${viewer.id}`, String(clamped));
  };

  const handleClose = async () => {
    if (viewer && currentUserId) {
      if (progressDebounceRef.current) clearTimeout(progressDebounceRef.current);
      try { await updateReadingProgress(currentUserId, viewer.id, pg); } catch (e) { console.warn('EBooksPage: handleClose failed to update progress:', e.message); }
      const duration = stopTimer('article_read', viewer.id);
      trackActivity('article_read', viewer.id, duration || null);
    }
    setViewer(null);
    setFS(false);
  };

  const markSubjectComplete = async (item) => {
    try {
      if (!user?.id) return;
      await supabase.from('subject_completion').upsert([{
        user_id: user.id, subject: item.subject,
        completed: true, progress: 100,
        completed_at: new Date().toISOString(),
      }], { onConflict: 'user_id,subject' });
    } catch (e) { console.warn('EBooksPage: failed to mark subject complete:', e.message); }
  };

  useEffect(() => {
    if (!showNotes || !viewer || !currentUserId) return;
    getNotes(currentUserId, viewer.id).then(setNotes);
  }, [showNotes, viewer, currentUserId]);

  const handleSaveNote = async () => {
    if (!noteText.trim() || !currentUserId || !viewer) return;
    setNotesSaving(true);
    const saved = await saveNote(currentUserId, viewer.id, noteText.trim());
    if (saved) { setNotes(prev => [saved, ...prev]); setNoteText(''); }
    setNotesSaving(false);
  };

  const handleDeleteNote = async (noteId) => {
    const ok = await deleteNote(noteId);
    if (ok) setNotes(prev => prev.filter(n => n.id !== noteId));
  };

  const handleBookmark = async () => {
    if (!viewer || !currentUserId) return;
    const key = String(viewer.id);
    const newVal = !(contentStates[key]?.isBookmarked || false);
    setContentStates(prev => ({ ...prev, [key]: { ...prev[key], isBookmarked: newVal } }));
    try {
      await toggleBookmark(currentUserId, viewer.id, newVal);
      addToast('success', newVal ? '🔖 Bookmarked!' : 'Bookmark removed');
    } catch (e) {
      console.warn('EBooksPage: failed to toggle bookmark:', e.message);
      setContentStates(prev => ({ ...prev, [key]: { ...prev[key], isBookmarked: !newVal } }));
      addToast('error', 'Could not update bookmark');
    }
  };

  // PDF Reader view
  if (viewer) {
    const isBookmarked = contentStates[String(viewer.id)]?.isBookmarked || false;
    return (
      <PDFReaderView
        viewer={viewer} pg={pg} setPg={setPg}
        zoom={zoom} handleZoom={handleZoom}
        fullscreen={fullscreen} setFS={setFS}
        showNotes={showNotes} setShowNotes={setShowNotes}
        notes={notes} noteText={noteText} setNoteText={setNoteText}
        notesSaving={notesSaving} handleSaveNote={handleSaveNote} handleDeleteNote={handleDeleteNote}
        showSmartNotes={showSmartNotes} setShowSmartNotes={setShowSmartNotes}
        showReadingQuiz={showReadingQuiz} setShowReadingQuiz={setShowReadingQuiz}
        handleClose={handleClose} handleBookmark={handleBookmark}
        wmName={wmName} role={role} isBookmarked={isBookmarked} addToast={addToast}
      />
    );
  }

  // Library view
  return (
    <div className="page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div className="ps" style={{ color: '#9CA3AF' }}>
          {filteredArtifacts.length} of {localArtifacts.length} document{localArtifacts.length !== 1 ? 's' : ''}
          {activeFilterCount > 0 && <span style={{ color: '#7C3AED', fontWeight: 600 }}> · {activeFilterCount} filter{activeFilterCount > 1 ? 's' : ''} active</span>}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className={`btn btn-sm ${viewMode === 'grid' ? 'btn-p' : 'btn-s'}`} onClick={() => setVM('grid')}>⊞</button>
          <button className={`btn btn-sm ${viewMode === 'list' ? 'btn-p' : 'btn-s'}`} onClick={() => setVM('list')}>☰</button>
        </div>
      </div>

      {role !== 'doctor' && (
        <div className="tabs">
          {[['all', 'All'], ['approved', 'Approved'], ['pending', 'Pending']].map(([k, l]) => (
            <button key={k} className={`tab ${tab === k ? 'act' : ''}`} onClick={() => setTab(k)}>{l}</button>
          ))}
        </div>
      )}

      {/* AI Semantic Search — shown for all roles */}
      <div style={{ marginBottom: 16 }}>
        <SemanticSearch
          onSelectArtifact={(artifactId) => {
            const art = localArtifacts.find(a => a.id === artifactId);
            if (art) setViewer(art);
          }}
        />
      </div>

      <LibraryFilterBar
        searchQuery={searchQuery} setSearchQuery={setSearchQuery}
        selectedSubject={selectedSubject} setSelectedSubject={setSelectedSubject}
        sortBy={sortBy} setSortBy={setSortBy}
        showOnlyBookmarked={showOnlyBookmarked} setShowOnlyBookmarked={setShowOnlyBookmarked}
        uniqueSubjects={uniqueSubjects}
        activeFilterCount={activeFilterCount} resetFilters={resetFilters}
      />

      {role === 'doctor' && localArtifacts.filter(a => a.status === 'pending').length > 0 && tab !== 'approved' && (
        <div style={{ background: '#FFFBEB', border: '1px solid rgba(255,179,71,.3)', borderRadius: 12, padding: '10px 16px', fontSize: 13, color: '#92400E', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          ⏳ <strong>{localArtifacts.filter(a => a.status === 'pending').length} new book{localArtifacts.filter(a => a.status === 'pending').length > 1 ? 's' : ''}</strong> are being verified by Admin.
        </div>
      )}

      {/* Grid view */}
      {viewMode === 'grid' ? (
        <div className="eg">
          {filteredArtifacts.map(a => {
            const state = contentStates[String(a.id)];
            const isBookmarked = state?.isBookmarked || false;
            const savedPage = state?.currentPage || 1;
            return (
              <div key={a.id} className="ec" onClick={() => { if (a.status === 'approved') handleRead(a); }}>
                <div className="ec-cover" style={{ background: a.status === 'pending' ? '#F3F4F6' : 'linear-gradient(135deg,#EFF6FF,#F3F4F6)', position: 'relative' }}>
                  <span>{a.emoji}</span>
                  {a.status === 'pending' && <span className="bdg bg-a" style={{ position: 'absolute', top: 8, right: 8 }}>⏳ Pending</span>}
                  {a.access !== 'all' && <span className="bdg bg-v" style={{ position: 'absolute', top: 8, left: 8, fontSize: 9 }}>{a.access === 'md_ms' ? 'MD/MS' : 'DM/MCh'}</span>}
                  {isBookmarked && <span style={{ position: 'absolute', bottom: 6, right: 8, fontSize: 16 }} title="Bookmarked">🔖</span>}
                </div>
                <div className="ec-body">
                  <div className="ec-title">{a.title}</div>
                  <div className="ec-meta">{a.subject} · {a.pages} pages</div>
                  {role === 'superadmin' && a.uploadedBy && a.uploadedBy !== 'Unknown' && (
                    <div style={{ marginTop: 5, display: 'flex', alignItems: 'center', gap: 5 }}>
                      <div style={{ width: 3, height: 13, borderRadius: 99, background: '#818CF8', flexShrink: 0 }} />
                      <span style={{ fontSize: 10, color: '#6B7280' }}>
                        Uploaded by <strong style={{ color: '#4F46E5', fontWeight: 700 }}>{a.uploadedBy}</strong>
                      </span>
                    </div>
                  )}
                  {a.status === 'approved' && a.pages > 1 && savedPage > 1 && (
                    <div style={{ marginTop: 6 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: '#9CA3AF', marginBottom: 3 }}>
                        <span>p.{savedPage} / {a.pages}</span>
                        <span>{Math.round((savedPage / a.pages) * 100)}%</span>
                      </div>
                      <div style={{ background: '#E5E7EB', borderRadius: 99, height: 4, overflow: 'hidden' }}>
                        <div style={{ background: 'linear-gradient(90deg,#4F46E5,#7C3AED)', height: '100%', width: `${Math.min(100, Math.round((savedPage / a.pages) * 100))}%`, transition: 'width .3s' }} />
                      </div>
                    </div>
                  )}
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
                    <div style={{ display: 'flex', gap: 4 }} onClick={e => e.stopPropagation()}>
                      <button className="btn btn-p btn-sm" onClick={() => handleRead(a)}>
                        {savedPage > 1 ? 'Resume →' : 'Read →'}
                      </button>
                    </div>
                  ) : (
                    <span style={{ fontSize: 11, color: '#6B7280' }}>Locked</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="card">
          <div className="tw">
            <table>
              <thead>
                <tr>
                  <th>Title</th><th>Subject</th><th>Access</th><th>Status</th>
                  {role === 'superadmin' && <th>Uploaded By</th>}
                  <th>Progress</th><th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredArtifacts.map(a => {
                  const state = contentStates[String(a.id)];
                  const savedPage = state?.currentPage || 1;
                  return (
                    <tr key={a.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 18 }}>{a.emoji}</span>
                          <span style={{ fontWeight: 600, fontSize: 13 }}>{a.title}</span>
                          {state?.isBookmarked && <span title="Bookmarked" style={{ fontSize: 13 }}>🔖</span>}
                        </div>
                      </td>
                      <td><span className="bdg bg-v">{a.subject}</span></td>
                      <td><span className="bdg bg-s">{a.access === 'md_ms' ? 'MD/MS Only' : a.access === 'dm_mch' ? 'DM/MCh' : 'All'}</span></td>
                      <td><span className={`bdg ${a.status === 'approved' ? 'bg-g' : 'bg-a'}`}>{a.status === 'approved' ? '✅ Approved' : '⏳ Pending'}</span></td>
                      {role === 'superadmin' && (
                        <td>
                          {a.uploadedBy && a.uploadedBy !== 'Unknown' ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                              <div style={{ width: 3, height: 12, borderRadius: 99, background: '#818CF8', flexShrink: 0 }} />
                              <span style={{ fontSize: 12, color: '#4F46E5', fontWeight: 600 }}>{a.uploadedBy}</span>
                            </div>
                          ) : <span style={{ fontSize: 11, color: '#9CA3AF' }}>—</span>}
                        </td>
                      )}
                      <td>
                        {a.status === 'approved' && savedPage > 1
                          ? <span style={{ fontSize: 11, color: '#2563EB', fontWeight: 600 }}>p.{savedPage}/{a.pages || '?'}</span>
                          : <span style={{ fontSize: 11, color: '#9CA3AF' }}>—</span>}
                      </td>
                      <td>
                        {a.status === 'approved'
                          ? <button className="btn btn-p btn-sm" onClick={() => handleRead(a)}>{savedPage > 1 ? 'Resume' : 'Read'}</button>
                          : role === 'superadmin'
                            ? <div style={{ display: 'flex', gap: 4 }}>
                                <button className="btn btn-p btn-sm" onClick={() => { onApprove(a.id); addToast('success', 'Approved!'); }}>✅</button>
                                <button className="btn btn-d btn-sm" onClick={() => { onReject(a.id); addToast('error', 'Rejected'); }}>✗</button>
                              </div>
                            : <span style={{ fontSize: 11, color: '#6B7280' }}>Pending Verification</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Loading skeleton */}
      {libLoading && localArtifacts.length === 0 && (
        <div className="eg">
          {[1,2,3,4,5,6].map(i => (
            <div key={i} className="ec animate-pulse" style={{ cursor: 'default' }}>
              <div className="ec-cover" style={{ background: '#F3F4F6' }} />
              <div className="ec-body">
                <div style={{ height: 14, background: '#E5E7EB', borderRadius: 4, marginBottom: 8, width: '80%' }} />
                <div style={{ height: 11, background: '#F3F4F6', borderRadius: 4, width: '55%' }} />
              </div>
              <div className="ec-foot" style={{ justifyContent: 'flex-end' }}>
                <div style={{ height: 24, width: 60, background: '#F3F4F6', borderRadius: 6 }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty states */}
      {!libLoading && filteredArtifacts.length === 0 && (
        localArtifacts.length === 0 ? (
          <div className="empty">
            <div className="empty-ic">📚</div>
            <div className="empty-t">Library is being updated</div>
            <div className="empty-s">The medical library is being updated. Check back soon!</div>
          </div>
        ) : activeFilterCount > 0 ? (
          <div className="empty">
            <div className="empty-ic">🔍</div>
            <div className="empty-t">No materials found</div>
            <div className="empty-s">No materials found matching your search criteria.</div>
            <button className="btn btn-p btn-sm" onClick={resetFilters} style={{ marginTop: 14 }}>↺ Reset All Filters</button>
          </div>
        ) : (
          <div className="empty">
            <div className="empty-ic">📭</div>
            <div className="empty-t">No books found</div>
            <div className="empty-s">No e-books in this category yet.</div>
          </div>
        )
      )}
    </div>
  );
}
