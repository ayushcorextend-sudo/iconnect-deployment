import { useState, useEffect } from 'react';
import { StickyNote, Sparkles, Trash2, Star, BookOpen } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getAllUserNotes, deleteNote, getSmartNotes, toggleSmartNoteStar, deleteSmartNote } from '../lib/supabase';

const TABS = [
  { k: 'my', l: 'My Notes', icon: StickyNote },
  { k: 'ai', l: 'AI Notes', icon: Sparkles },
];

function EmptyState({ tab }) {
  return (
    <div style={{ textAlign: 'center', padding: '60px 20px', color: '#9CA3AF' }}>
      {tab === 'my'
        ? <><StickyNote size={40} style={{ marginBottom: 12, opacity: 0.4 }} /><div style={{ fontSize: 15, fontWeight: 600 }}>No notes yet</div><div style={{ fontSize: 13, marginTop: 4 }}>Open an e-book and highlight text to create notes.</div></>
        : <><Sparkles size={40} style={{ marginBottom: 12, opacity: 0.4 }} /><div style={{ fontSize: 15, fontWeight: 600 }}>No AI notes yet</div><div style={{ fontSize: 13, marginTop: 4 }}>Use the Smart Notes button in the PDF reader to generate AI summaries.</div></>
      }
    </div>
  );
}

function MyNoteCard({ note, onDelete }) {
  const [deleting, setDeleting] = useState(false);
  const date = note.created_at ? new Date(note.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '';

  const handleDelete = async () => {
    if (!confirm('Delete this note?')) return;
    setDeleting(true);
    await onDelete(note.id);
  };

  return (
    <div style={{ background: '#FAFAFA', border: '1px solid #E5E7EB', borderRadius: 10, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <BookOpen size={14} style={{ color: '#6366F1', flexShrink: 0 }} />
        <span style={{ fontSize: 12, fontWeight: 600, color: '#6366F1', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {note.artifacts?.title || 'Unknown Book'}
        </span>
        {note.page_number && (
          <span style={{ fontSize: 11, color: '#9CA3AF', background: '#F3F4F6', borderRadius: 4, padding: '1px 6px' }}>p.{note.page_number}</span>
        )}
        <span style={{ fontSize: 11, color: '#9CA3AF' }}>{date}</span>
        <button
          onClick={handleDelete}
          disabled={deleting}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: '#9CA3AF', borderRadius: 4 }}
          title="Delete note"
        >
          <Trash2 size={14} />
        </button>
      </div>
      {note.highlight_text && (
        <blockquote style={{ margin: 0, borderLeft: '3px solid #E5E7EB', paddingLeft: 10, fontSize: 12, color: '#6B7280', fontStyle: 'italic' }}>
          {note.highlight_text}
        </blockquote>
      )}
      <p style={{ margin: 0, fontSize: 13, color: '#374151', lineHeight: 1.6 }}>{note.note_content}</p>
    </div>
  );
}

function AINotesCard({ note, onStar, onDelete }) {
  const [starring, setStarring] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const date = note.created_at ? new Date(note.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '';

  const handleStar = async () => {
    setStarring(true);
    await onStar(note.id, !note.is_starred);
    setStarring(false);
  };

  const handleDelete = async () => {
    if (!confirm('Delete this AI note?')) return;
    setDeleting(true);
    await onDelete(note.id);
  };

  return (
    <div style={{ background: note.is_starred ? '#FEFCE8' : '#FAFAFA', border: `1px solid ${note.is_starred ? '#FDE68A' : '#E5E7EB'}`, borderRadius: 10, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Sparkles size={14} style={{ color: '#7C3AED', flexShrink: 0 }} />
        <span style={{ fontSize: 12, fontWeight: 600, color: '#7C3AED', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {note.artifacts?.title || 'AI Summary'}
        </span>
        <span style={{ fontSize: 11, color: '#9CA3AF' }}>{date}</span>
        <button
          onClick={handleStar}
          disabled={starring}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: note.is_starred ? '#F59E0B' : '#9CA3AF', borderRadius: 4 }}
          title={note.is_starred ? 'Unstar' : 'Star'}
        >
          <Star size={14} fill={note.is_starred ? '#F59E0B' : 'none'} />
        </button>
        <button
          onClick={handleDelete}
          disabled={deleting}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: '#9CA3AF', borderRadius: 4 }}
          title="Delete note"
        >
          <Trash2 size={14} />
        </button>
      </div>
      {note.original_text && (
        <blockquote style={{ margin: 0, borderLeft: '3px solid #DDD6FE', paddingLeft: 10, fontSize: 12, color: '#6B7280', fontStyle: 'italic' }}>
          {note.original_text.length > 160 ? note.original_text.slice(0, 160) + '…' : note.original_text}
        </blockquote>
      )}
      <p style={{ margin: 0, fontSize: 13, color: '#374151', lineHeight: 1.6 }}>{note.ai_summary}</p>
    </div>
  );
}

export default function NotesPage() {
  const { userId } = useAuth();
  const [tab, setTab] = useState('my');
  const [myNotes, setMyNotes] = useState([]);
  const [aiNotes, setAiNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    Promise.all([getAllUserNotes(userId), getSmartNotes(userId)])
      .then(([my, ai]) => { setMyNotes(my); setAiNotes(ai); })
      .catch(() => setError('Failed to load notes. Please try again.'))
      .finally(() => setLoading(false));
  }, [userId]);

  const handleDeleteMyNote = async (noteId) => {
    const ok = await deleteNote(noteId);
    if (ok) setMyNotes(prev => prev.filter(n => n.id !== noteId));
  };

  const handleStarAiNote = async (noteId, isStarred) => {
    const ok = await toggleSmartNoteStar(noteId, isStarred);
    if (ok) setAiNotes(prev => prev.map(n => n.id === noteId ? { ...n, is_starred: isStarred } : n));
  };

  const handleDeleteAiNote = async (noteId) => {
    const ok = await deleteSmartNote(noteId);
    if (ok) setAiNotes(prev => prev.filter(n => n.id !== noteId));
  };

  return (
    <div style={{ padding: '24px 20px', maxWidth: 760, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#111827', margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
          <StickyNote size={22} style={{ color: '#6366F1' }} /> Notes
        </h1>
        <p style={{ fontSize: 13, color: '#6B7280', margin: '4px 0 0' }}>All your reading notes and AI-generated summaries in one place.</p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, background: '#F3F4F6', borderRadius: 10, padding: 4, marginBottom: 20, width: 'fit-content' }}>
        {TABS.map(({ k, l, icon: Icon }) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '7px 16px', borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600,
              background: tab === k ? '#fff' : 'transparent',
              color: tab === k ? '#4F46E5' : '#6B7280',
              boxShadow: tab === k ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
              transition: 'all 0.15s',
            }}
          >
            <Icon size={14} />
            {l}
            <span style={{ fontSize: 11, background: tab === k ? '#EEF2FF' : '#E5E7EB', color: tab === k ? '#4F46E5' : '#9CA3AF', borderRadius: 10, padding: '1px 7px', fontWeight: 700 }}>
              {k === 'my' ? myNotes.length : aiNotes.length}
            </span>
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[1, 2, 3].map(i => (
            <div key={i} style={{ height: 90, background: '#F3F4F6', borderRadius: 10, animation: 'pulse 1.5s infinite' }} />
          ))}
        </div>
      ) : error ? (
        <div style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: 10, padding: '14px 16px', color: '#DC2626', fontSize: 13 }}>{error}</div>
      ) : tab === 'my' ? (
        myNotes.length === 0 ? <EmptyState tab="my" /> : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {myNotes.map(n => <MyNoteCard key={n.id} note={n} onDelete={handleDeleteMyNote} />)}
          </div>
        )
      ) : (
        aiNotes.length === 0 ? <EmptyState tab="ai" /> : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {aiNotes.map(n => <AINotesCard key={n.id} note={n} onStar={handleStarAiNote} onDelete={handleDeleteAiNote} />)}
          </div>
        )
      )}
    </div>
  );
}
