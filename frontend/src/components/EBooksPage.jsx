import { useState, useEffect, useRef, useMemo } from 'react';
import { supabase, getUserContentStates, toggleBookmark, updateReadingProgress, getNotes, saveNote, deleteNote } from '../lib/supabase';
import { trackActivity } from '../lib/trackActivity';
import ReadingQuizModal from './ReadingQuizModal';
import SmartNotesPanel from './SmartNotesPanel';

const today = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });


export default function EBooksPage({ artifacts = [], role, onApprove, onReject, addToast }) {
  const [viewMode, setVM] = useState('grid');
  // Doctors only see approved content — no tab switching needed
  const [tab, setTab] = useState(role === 'doctor' ? 'approved' : 'all');
  const [showReadingQuiz, setShowReadingQuiz] = useState(false);
  const [showSmartNotes, setShowSmartNotes] = useState(false);
  const [viewer, setViewer] = useState(null);
  const [zoom, setZoom] = useState(100);
  const [pg, setPg] = useState(1);
  const [fullscreen, setFS] = useState(false);
  const [localArtifacts, setLocalArtifacts] = useState(artifacts);
  const [wmName, setWmName] = useState('iConnect User');

  // Content state: userId + map of artifact states
  const [currentUserId, setCurrentUserId] = useState(null);
  const [contentStates, setContentStates] = useState({});

  // Debounce ref for progress saves
  const progressDebounceRef = useRef(null);

  // Notes panel state
  const [showNotes, setShowNotes] = useState(false);
  const [notes, setNotes] = useState([]);
  const [noteText, setNoteText] = useState('');
  const [notesSaving, setNotesSaving] = useState(false);

  const [libLoading, setLibLoading] = useState(true);

  // ── Phase 1: Advanced filter state ───────────────────────────
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('All');
  const [showOnlyBookmarked, setShowOnlyBookmarked] = useState(false);
  const [sortBy, setSortBy] = useState('newest');

  // Keep localArtifacts in sync when props change
  useEffect(() => setLocalArtifacts(artifacts), [artifacts]);

  // Fetch user + content states on mount
  useEffect(() => {
    async function init() {
      try {
        const { data: authData } = await supabase.auth.getUser();
        const user = authData?.user;
        if (!user) return;
        setCurrentUserId(user.id);
        const name = user.user_metadata?.name || user.email || 'iConnect User';
        setWmName(name);
        const states = await getUserContentStates(user.id);
        setContentStates(states);
      } catch (_) {
      } finally {
        setLibLoading(false);
      }
    }
    init();
  }, []);

  // Mark subject complete: on last page (paginated) or on open (iframe/no-preview)
  useEffect(() => {
    if (!viewer) return;
    if (viewer.file_url || pg === (viewer.pages || 0)) {
      markSubjectComplete(viewer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pg, viewer]);

  // Debounced reading progress save
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
      } catch (_) {}
    }, 2000);
    return () => { if (progressDebounceRef.current) clearTimeout(progressDebounceRef.current); };
  }, [pg, viewer, currentUserId]);

  // ── Phase 1: Derived state with useMemo ──────────────────────

  // Unique subjects derived from live artifact list
  const uniqueSubjects = useMemo(
    () => [...new Set(localArtifacts.map(a => a.subject).filter(Boolean))].sort(),
    [localArtifacts]
  );

  // Main filtered list — computed only when its inputs change, not on every keystroke re-render
  const filteredArtifacts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const result = localArtifacts.filter(a => {
      // Always hide archived artifacts
      if (a.status === 'archived') return false;
      // Tab filter
      if (role === 'doctor' && tab === 'approved' && a.status !== 'approved') return false;
      if (tab === 'pending' && a.status !== 'pending') return false;
      if (tab === 'approved' && a.status !== 'approved') return false;
      // Title search (case-insensitive)
      if (q && !a.title.toLowerCase().includes(q)) return false;
      // Subject filter
      if (selectedSubject !== 'All' && a.subject !== selectedSubject) return false;
      // Bookmark-only filter
      if (showOnlyBookmarked && !contentStates[String(a.id)]?.isBookmarked) return false;
      return true;
    });
    if (sortBy === 'downloads') return [...result].sort((a, b) => (b.downloads || 0) - (a.downloads || 0));
    if (sortBy === 'az') return [...result].sort((a, b) => a.title.localeCompare(b.title));
    return [...result].sort((a, b) => (b.id || 0) - (a.id || 0)); // newest first
  }, [localArtifacts, tab, role, searchQuery, selectedSubject, showOnlyBookmarked, contentStates, sortBy]);

  // Number of active filters (for reset indicator)
  const activeFilterCount = (searchQuery ? 1 : 0) + (selectedSubject !== 'All' ? 1 : 0) + (showOnlyBookmarked ? 1 : 0) + (sortBy !== 'newest' ? 1 : 0);

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedSubject('All');
    setShowOnlyBookmarked(false);
    setSortBy('newest');
  };

  // ── Handlers ─────────────────────────────────────────────────

  const handleRead = async (item) => {
    // TODO: Notify uploader when their content is accessed.
    // `uploaded_by` is currently a display-name string, not a user_id.
    // Add an `uploader_id` column to artifacts to enable push notifications here.
    const savedPage = contentStates[String(item.id)]?.currentPage || 1;
    setViewer(item);
    setPg(Math.min(savedPage, item.pages || 1));
    setZoom(100);
    await trackActivity('article_read', item.id);
  };

  const handleClose = async () => {
    if (viewer && currentUserId) {
      if (progressDebounceRef.current) clearTimeout(progressDebounceRef.current);
      try { await updateReadingProgress(currentUserId, viewer.id, pg); } catch (_) {}
    }
    setViewer(null);
    setFS(false);
  };

  const markSubjectComplete = async (item) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await supabase.from('subject_completion').upsert([{
        user_id: user.id,
        subject: item.subject,
        completed: true,
        progress: 100,
        completed_at: new Date().toISOString(),
      }], { onConflict: 'user_id,subject' });
    } catch (_) {}
  };

  useEffect(() => {
    if (!showNotes || !viewer || !currentUserId) return;
    getNotes(currentUserId, viewer.id).then(setNotes);
  }, [showNotes, viewer, currentUserId]);

  const handleSaveNote = async () => {
    if (!noteText.trim() || !currentUserId || !viewer) return;
    setNotesSaving(true);
    const saved = await saveNote(currentUserId, viewer.id, noteText.trim());
    if (saved) {
      setNotes(prev => [saved, ...prev]);
      setNoteText('');
    }
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
    } catch (_) {
      setContentStates(prev => ({ ...prev, [key]: { ...prev[key], isBookmarked: !newVal } }));
      addToast('error', 'Could not update bookmark');
    }
  };

  // ─────────────────────────────────────────────────────────────
  // PDF READER VIEW
  // ─────────────────────────────────────────────────────────────
  if (viewer) {
    const isBookmarked = contentStates[String(viewer.id)]?.isBookmarked || false;
    return (
      <div className="page" style={fullscreen ? { position: 'fixed', inset: 0, zIndex: 150, background: '#525659', margin: 0, padding: 0 } : {}}>
        {!fullscreen && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <button className="btn btn-s btn-sm" onClick={handleClose}>← Back</button>
            <div>
              <div style={{ fontFamily: 'Inter,sans-serif', fontWeight: 700, fontSize: 16 }}>{viewer.emoji} {viewer.title}</div>
              <div style={{ fontSize: 12, color: '#6B7280' }}>{viewer.subject} · {viewer.pages} pages</div>
            </div>
          </div>
        )}
        <div className="pdf-v" style={fullscreen ? { borderRadius: 0, height: '100vh' } : {}}>
          <div className="pdf-tb">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {!viewer.file_url && (
                <>
                  <button className="pdf-btn" disabled={pg <= 1} onClick={() => setPg(p => p - 1)}>◀ Prev</button>
                  <span style={{ color: 'rgba(255,255,255,.6)', fontSize: 12 }}>Page {pg} of {viewer.pages || '?'}</span>
                  <button className="pdf-btn" disabled={pg >= (viewer.pages || 1)} onClick={() => setPg(p => p + 1)}>Next ▶</button>
                </>
              )}
            </div>
            <span style={{ color: 'rgba(255,255,255,.55)', fontSize: 12, fontFamily: 'Inter,sans-serif' }}>{viewer.title}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <button
                className="pdf-btn"
                onClick={() => setShowNotes(s => !s)}
                title="My Notes"
                style={{ background: showNotes ? 'rgba(124,58,237,0.4)' : undefined, color: showNotes ? '#C4B5FD' : undefined }}
              >
                📝 Notes
              </button>
              {role === 'doctor' && (
                <button
                  className="pdf-btn"
                  onClick={() => setShowReadingQuiz(true)}
                  title="Mark as Completed — take a short quiz"
                  style={{ background: 'rgba(16,185,129,0.25)', color: '#6EE7B7' }}
                >
                  ✅ Done?
                </button>
              )}
              <button
                className="pdf-btn"
                onClick={() => setShowSmartNotes(s => !s)}
                title="Smart Notes — AI-compressed study notes"
                style={{ background: showSmartNotes ? 'rgba(124,58,237,0.4)' : undefined, color: showSmartNotes ? '#C4B5FD' : undefined }}
              >
                ✨ Notes
              </button>
              <button
                className="pdf-btn"
                onClick={handleBookmark}
                title={isBookmarked ? 'Remove bookmark' : 'Bookmark this book'}
                style={{
                  background: isBookmarked ? 'rgba(37,99,235,0.4)' : undefined,
                  color: isBookmarked ? '#93C5FD' : undefined,
                  fontWeight: 600,
                }}
              >
                🔖 {isBookmarked ? 'Saved' : 'Bookmark'}
              </button>
              <button className="pdf-btn" onClick={() => setZoom(z => Math.max(50, z - 25))}>−</button>
              <span style={{ color: 'rgba(255,255,255,.6)', fontSize: 12, minWidth: 38, textAlign: 'center' }}>{zoom}%</span>
              <button className="pdf-btn" onClick={() => setZoom(z => Math.min(250, z + 25))}>+</button>
              <button className="pdf-btn" onClick={() => setZoom(100)}>Reset</button>
              <button className="pdf-btn" onClick={() => setFS(f => !f)}>{fullscreen ? '⤡' : '⤢'}</button>
              {fullscreen && <button className="pdf-btn" onClick={handleClose}>✕ Close</button>}
            </div>
          </div>
          <div
            className="pdf-page-area"
            onContextMenu={e => e.preventDefault()}
            style={{ position: 'relative', userSelect: 'none', WebkitUserSelect: 'none' }}
          >
            <div style={{
              position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden',
              display: 'flex', flexWrap: 'wrap', alignContent: 'flex-start', zIndex: 10,
            }}>
              {Array.from({ length: 24 }).map((_, i) => (
                <div key={i} style={{
                  opacity: 0.08, transform: 'rotate(-30deg)', fontSize: 13, fontWeight: 700,
                  color: '#1E1B4B', padding: '28px 16px', whiteSpace: 'nowrap', userSelect: 'none',
                }}>
                  {wmName} · {today} · iConnect — Icon Lifesciences
                </div>
              ))}
            </div>
            {viewer.file_url ? (
              <iframe
                src={viewer.file_url}
                style={{
                  width: `${zoom}%`, minWidth: '100%', height: '72vh',
                  border: 'none', display: 'block',
                }}
                title={viewer.title}
              />
            ) : (
              <div className="pdf-page" style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                justifyContent: 'center', minHeight: 320, color: '#9CA3AF', gap: 14,
              }}>
                <div style={{ fontSize: 52 }}>📄</div>
                <div style={{ fontSize: 15, fontWeight: 600, color: '#374151' }}>Preview not available</div>
                <div style={{ fontSize: 13, textAlign: 'center', maxWidth: 340, lineHeight: 1.6, color: '#6B7280' }}>
                  This e-book was uploaded before file storage was configured.<br />
                  Contact your administrator for direct access to this resource.
                </div>
                {viewer.pages && (
                  <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 4 }}>
                    Page {pg} of {viewer.pages}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Smart Notes Panel */}
        {showSmartNotes && (
          <SmartNotesPanel
            onClose={() => setShowSmartNotes(false)}
            currentArtifact={viewer}
          />
        )}

        {/* Reading Quiz Modal */}
        {showReadingQuiz && viewer && (
          <ReadingQuizModal
            artifact={viewer}
            onClose={() => setShowReadingQuiz(false)}
            onComplete={({ score, total, pts }) => {
              setShowReadingQuiz(false);
              if (addToast) addToast('success', `✅ ${score}/${total} correct · +${pts} pts earned!`);
            }}
          />
        )}

        {/* Notes side-panel */}
        {showNotes && (
          <div style={{
            position: 'fixed', top: 0, right: 0, height: '100vh', width: 320,
            background: 'var(--white)', borderLeft: '1px solid var(--border)',
            boxShadow: '-4px 0 24px rgba(0,0,0,0.14)',
            zIndex: 200, display: 'flex', flexDirection: 'column',
            fontFamily: 'Inter, sans-serif',
          }}>
            <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#F9FAFB' }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>📝 My Notes</div>
              <button onClick={() => setShowNotes(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: '#6B7280', lineHeight: 1 }}>×</button>
            </div>
            <div style={{ padding: 14, borderBottom: '1px solid var(--border)' }}>
              <textarea
                value={noteText}
                onChange={e => setNoteText(e.target.value)}
                placeholder="Write a note for this book…"
                rows={4}
                style={{
                  width: '100%', padding: '8px 10px', borderRadius: 8,
                  border: '1px solid var(--border)', fontSize: 13, resize: 'vertical',
                  fontFamily: 'inherit', color: 'var(--text)', background: 'var(--white)',
                  boxSizing: 'border-box', outline: 'none',
                }}
              />
              <button
                onClick={handleSaveNote}
                disabled={notesSaving || !noteText.trim()}
                style={{
                  marginTop: 8, width: '100%', padding: '8px',
                  background: '#7C3AED', color: '#fff', border: 'none', borderRadius: 8,
                  fontSize: 13, fontWeight: 600,
                  cursor: notesSaving || !noteText.trim() ? 'not-allowed' : 'pointer',
                  opacity: notesSaving || !noteText.trim() ? 0.55 : 1,
                  transition: 'opacity .15s',
                }}
              >
                {notesSaving ? 'Saving…' : '💾 Save Note'}
              </button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: 14 }}>
              {notes.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#9CA3AF', fontSize: 13, paddingTop: 24 }}>
                  No notes yet for this book.
                </div>
              ) : notes.map(n => (
                <div key={n.id} style={{
                  background: '#FFFBEB', borderRadius: 8, padding: '10px 12px',
                  marginBottom: 10, border: '1px solid #FDE68A',
                }}>
                  <div style={{ fontSize: 13, color: '#374151', lineHeight: 1.5, wordBreak: 'break-word' }}>
                    {n.note_content}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                    <span style={{ fontSize: 11, color: '#9CA3AF' }}>
                      {new Date(n.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                    <button
                      onClick={() => handleDeleteNote(n.id)}
                      title="Delete note"
                      style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 15, color: '#EF4444', lineHeight: 1 }}
                    >🗑</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // LIBRARY VIEW
  // ─────────────────────────────────────────────────────────────
  return (
    <div className="page">
      {/* Page header — view toggles only, search lives in filter bar */}
      <div className="ph-row ph">
        <div>
          <div className="pt">📚 E-Book Library</div>
          <div className="ps">
            {filteredArtifacts.length} of {localArtifacts.length} document{localArtifacts.length !== 1 ? 's' : ''}
            {activeFilterCount > 0 && <span style={{ color: '#7C3AED', fontWeight: 600 }}> · {activeFilterCount} filter{activeFilterCount > 1 ? 's' : ''} active</span>}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className={`btn btn-sm ${viewMode === 'grid' ? 'btn-p' : 'btn-s'}`} onClick={() => setVM('grid')}>⊞</button>
          <button className={`btn btn-sm ${viewMode === 'list' ? 'btn-p' : 'btn-s'}`} onClick={() => setVM('list')}>☰</button>
        </div>
      </div>

      {/* Tabs only visible to admins — doctors always see approved content */}
      {role !== 'doctor' && (
        <div className="tabs">
          {[['all', 'All'], ['approved', 'Approved'], ['pending', 'Pending']].map(([k, l]) => (
            <button key={k} className={`tab ${tab === k ? 'act' : ''}`} onClick={() => setTab(k)}>{l}</button>
          ))}
        </div>
      )}

      {/* ── Phase 2: Search & Filter Bar ── */}
      <div style={{
        display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center',
        marginBottom: 16, padding: '12px 14px',
        background: 'var(--surf)', borderRadius: 12,
        border: '1px solid var(--border)',
      }}>
        {/* Search input with clear button */}
        <div style={{ position: 'relative', flex: '1 1 200px', minWidth: 180 }}>
          <span style={{
            position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)',
            fontSize: 14, pointerEvents: 'none', color: '#9CA3AF',
          }}>🔍</span>
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search by title…"
            style={{
              width: '100%', padding: '8px 32px 8px 32px',
              border: '1.5px solid var(--border)', borderRadius: 8, fontSize: 13,
              background: 'var(--white)', color: 'var(--text)',
              outline: 'none', boxSizing: 'border-box',
              transition: 'border-color .15s',
            }}
            onFocus={e => e.target.style.borderColor = '#2563EB'}
            onBlur={e => e.target.style.borderColor = 'var(--border)'}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              style={{
                position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: 13, color: '#9CA3AF', lineHeight: 1, padding: 2,
              }}
              title="Clear search"
            >✕</button>
          )}
        </div>

        {/* Subject dropdown */}
        <select
          value={selectedSubject}
          onChange={e => setSelectedSubject(e.target.value)}
          style={{
            padding: '8px 12px', border: '1.5px solid var(--border)', borderRadius: 8,
            fontSize: 13, background: 'var(--white)', color: 'var(--text)',
            cursor: 'pointer', minWidth: 150, outline: 'none',
          }}
        >
          <option value="All">All Subjects</option>
          {uniqueSubjects.map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>

        {/* Sort dropdown */}
        <select
          value={sortBy}
          onChange={e => setSortBy(e.target.value)}
          style={{
            padding: '8px 12px', border: '1.5px solid var(--border)', borderRadius: 8,
            fontSize: 13, background: 'var(--white)', color: 'var(--text)',
            cursor: 'pointer', minWidth: 140, outline: 'none',
          }}
        >
          <option value="newest">Newest First</option>
          <option value="downloads">Most Downloaded</option>
          <option value="az">A–Z</option>
        </select>

        {/* Bookmarked-only pill toggle */}
        <button
          onClick={() => setShowOnlyBookmarked(b => !b)}
          style={{
            padding: '8px 16px', borderRadius: 99,
            border: showOnlyBookmarked ? 'none' : '1.5px solid var(--border)',
            background: showOnlyBookmarked ? '#7C3AED' : 'var(--white)',
            color: showOnlyBookmarked ? '#fff' : 'var(--muted)',
            fontSize: 13, fontWeight: 600, cursor: 'pointer',
            transition: 'background .15s, color .15s, border .15s',
            whiteSpace: 'nowrap',
          }}
        >
          🔖 Bookmarked Only
        </button>

        {/* Reset — shown only when a filter is active */}
        {activeFilterCount > 0 && (
          <button
            onClick={resetFilters}
            style={{
              padding: '8px 12px', borderRadius: 8,
              border: '1px solid #FCA5A5', background: '#FFF1F1',
              color: '#DC2626', fontSize: 12, fontWeight: 600, cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            ✕ Reset
          </button>
        )}
      </div>

      {role === 'doctor' && localArtifacts.filter(a => a.status === 'pending').length > 0 && tab !== 'approved' && (
        <div style={{ background: '#FFFBEB', border: '1px solid rgba(255,179,71,.3)', borderRadius: 12, padding: '10px 16px', fontSize: 13, color: '#92400E', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          ⏳ <strong>{localArtifacts.filter(a => a.status === 'pending').length} new book{localArtifacts.filter(a => a.status === 'pending').length > 1 ? 's' : ''}</strong> are being verified by Admin. You can see them below — interaction unlocks after approval.
        </div>
      )}

      {/* ── Phase 3: Grid / list rendering over filteredArtifacts ── */}
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
                  {isBookmarked && (
                    <span style={{ position: 'absolute', bottom: 6, right: 8, fontSize: 16 }} title="Bookmarked">🔖</span>
                  )}
                </div>
                <div className="ec-body">
                  <div className="ec-title">{a.title}</div>
                  <div className="ec-meta">{a.subject} · {a.pages} pages</div>
                  {/* Uploader attribution — super admin only */}
                  {role === 'superadmin' && a.uploadedBy && a.uploadedBy !== 'Unknown' && (
                    <div style={{ marginTop: 5, display: 'flex', alignItems: 'center', gap: 5 }}>
                      <div style={{ width: 3, height: 13, borderRadius: 99, background: '#818CF8', flexShrink: 0 }} />
                      <span style={{ fontSize: 10, color: '#6B7280' }}>
                        Uploaded by <strong style={{ color: '#4F46E5', fontWeight: 700 }}>{a.uploadedBy}</strong>
                      </span>
                    </div>
                  )}
                  {a.status === 'approved' && savedPage > 1 && (
                    <div style={{ marginTop: 4 }}>
                      <span style={{ fontSize: 10, fontWeight: 600, color: '#2563EB', background: '#EFF6FF', borderRadius: 99, padding: '2px 8px' }}>
                        ▶ Resume p.{savedPage}
                      </span>
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
                  <th>Title</th><th>Subject</th><th>Access</th><th>Status</th>{role === 'superadmin' && <th>Uploaded By</th>}<th>Progress</th><th>Action</th>
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
                          : <span style={{ fontSize: 11, color: '#9CA3AF' }}>—</span>
                        }
                      </td>
                      <td>
                        {a.status === 'approved'
                          ? <button className="btn btn-p btn-sm" onClick={() => handleRead(a)}>
                              {savedPage > 1 ? 'Resume' : 'Read'}
                            </button>
                          : role === 'superadmin'
                            ? <div style={{ display: 'flex', gap: 4 }}>
                                <button className="btn btn-p btn-sm" onClick={() => { onApprove(a.id); addToast('success', 'Approved!'); }}>✅</button>
                                <button className="btn btn-d btn-sm" onClick={() => { onReject(a.id); addToast('error', 'Rejected'); }}>✗</button>
                              </div>
                            : <span style={{ fontSize: 11, color: '#6B7280' }}>Pending Verification</span>
                        }
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Skeleton grid while loading ── */}
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

      {/* ── Phase 3: Empty states ── */}
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
            <button
              className="btn btn-p btn-sm"
              onClick={resetFilters}
              style={{ marginTop: 14 }}
            >
              ↺ Reset All Filters
            </button>
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
