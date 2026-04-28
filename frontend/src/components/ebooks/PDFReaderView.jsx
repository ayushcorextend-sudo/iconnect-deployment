import ReadingQuizModal from '../ReadingQuizModal';
import SmartNotesPanel from '../SmartNotesPanel';
import { useSignedUrl } from '../../hooks/useSignedUrl';
import { Z } from '../../styles/zIndex';

const today = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

export default function PDFReaderView({
  viewer, pg, setPg, zoom, handleZoom, fullscreen, setFS,
  showNotes, setShowNotes, notes, noteText, setNoteText, notesSaving,
  handleSaveNote, handleDeleteNote, showSmartNotes, setShowSmartNotes,
  showReadingQuiz, setShowReadingQuiz, handleClose, handleBookmark,
  wmName, role, isBookmarked, addToast,
}) {
  // Resolve signed URL for the PDF iframe (Flaw #12: no raw storage URLs)
  const signedFileUrl = useSignedUrl(viewer?.file_url);

  return (
    <div className="page" style={fullscreen ? { position: 'fixed', inset: 0, zIndex: Z.readingModal, background: '#525659', margin: 0, padding: 0 } : {}}>
      {!fullscreen && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <button className="btn btn-s btn-sm" onClick={handleClose}>← Back</button>
          <div>
            <div style={{ fontFamily: 'Inter,sans-serif', fontWeight: 700, fontSize: 16 }}>{viewer.emoji} {viewer.title}</div>
            <div style={{ fontSize: 12, color: '#6B7280' }}>{viewer.subject} · {viewer.pages} pages</div>
          </div>
        </div>
      )}

      {viewer.pages > 1 && (
        <div style={{ height: 3, background: '#E5E7EB', borderRadius: 0, marginBottom: 0, overflow: 'hidden' }}>
          <div style={{
            height: '100%',
            width: `${Math.min(100, Math.round((pg / viewer.pages) * 100))}%`,
            background: 'linear-gradient(90deg, #4F46E5, #7C3AED)',
            transition: 'width .3s ease',
          }} />
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
            <button aria-label="Zoom out" className="pdf-btn" onClick={() => handleZoom(zoom - 25)}>−</button>
            <span style={{ color: 'rgba(255,255,255,.6)', fontSize: 12, minWidth: 38, textAlign: 'center' }}>{zoom}%</span>
            <button aria-label="Zoom in" className="pdf-btn" onClick={() => handleZoom(zoom + 25)}>+</button>
            <button className="pdf-btn" onClick={() => handleZoom(100)}>Reset</button>
            <button aria-label={fullscreen ? 'Exit fullscreen' : 'Enter fullscreen'} className="pdf-btn" onClick={() => setFS(f => !f)}>{fullscreen ? '⤡' : '⤢'}</button>
            {fullscreen && <button className="pdf-btn" onClick={handleClose}>✕ Close</button>}
          </div>
        </div>

        <div
          className="pdf-page-area"
          onContextMenu={e => e.preventDefault()}
          style={{ position: 'relative', userSelect: 'none', WebkitUserSelect: 'none' }}
        >
          {/* Watermark tiles */}
          <div style={{
            position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden',
            display: 'flex', flexWrap: 'wrap', alignContent: 'flex-start', zIndex: Z.local,
          }}>
            {Array.from({ length: 24 }).map((_, i) => (
              <div key={i} style={{
                opacity: 0.08, transform: 'rotate(-30deg)', fontSize: 13, fontWeight: 700,
                color: '#1E1B4B', padding: '28px 16px', whiteSpace: 'nowrap', userSelect: 'none',
              }}>
                {wmName} · {today} · iConnect — ICON LIFE SCIENCES
              </div>
            ))}
          </div>

          {viewer.file_url ? (
            <iframe
              src={signedFileUrl || ''}
              style={{ width: `${zoom}%`, minWidth: '100%', height: '72vh', border: 'none', display: 'block' }}
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
        <SmartNotesPanel onClose={() => setShowSmartNotes(false)} currentArtifact={viewer} />
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
        <div className="pdf-notes-panel-mobile" style={{
          position: 'fixed', top: 0, right: 0, height: '100vh', width: 320,
          background: 'var(--white)', borderLeft: '1px solid var(--border)',
          boxShadow: '-4px 0 24px rgba(0,0,0,0.14)',
          zIndex: Z.modal, display: 'flex', flexDirection: 'column',
          fontFamily: 'Inter, sans-serif',
        }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#F9FAFB' }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>📝 My Notes</div>
            <button aria-label="Close notes" onClick={() => setShowNotes(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: '#6B7280', lineHeight: 1 }}>×</button>
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
