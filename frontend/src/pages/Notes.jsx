/**
 * Notes.jsx — Centralized Notes page (Hidden Release).
 *
 * URL deep-link params:
 *   ?tab=my|ai           Active tab (default: my)
 *   ?subject=Cardiology  Drill into a subject
 *   ?book=<artifactId>   Drill into a specific book (requires subject)
 *   ?id=<noteId>         Highlight a specific note (auto-selects its subject + book)
 *
 * Hierarchy: Subject → Book → Notes
 * Access: navigate to /notes (no visible sidebar link — hidden release)
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  StickyNote, Sparkles, Trash2, Star, BookOpen,
  ChevronRight, ArrowLeft, Search, X, Plus, Check,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  getUserNotesHierarchy,
  getSmartNotesHierarchy,
  createNote,
  updateNote,
  deleteNote,
  toggleSmartNoteStar,
  deleteSmartNote,
  buildHierarchy,
} from '../lib/supabase/notes';

// ── URL helpers ────────────────────────────────────────────────────────────

function useNoteParams() {
  const location = useLocation();
  const navigate = useNavigate();
  const params = new URLSearchParams(location.search);

  const setParams = useCallback((updates, replace = false) => {
    const next = new URLSearchParams(location.search);
    Object.entries(updates).forEach(([k, v]) => {
      if (v == null) next.delete(k);
      else next.set(k, v);
    });
    navigate({ pathname: '/notes', search: next.toString() }, { replace });
  }, [location.search, navigate]);

  return {
    tab:     params.get('tab')     || 'my',
    subject: params.get('subject') || null,
    book:    params.get('book')    || null,
    noteId:  params.get('id')      || null,
    setParams,
  };
}

// ── Sub-components ─────────────────────────────────────────────────────────

function Breadcrumb({ tab, subject, book, bookTitle, onTabChange, onSubjectClick, onHomeClick }) {
  return (
    <nav style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#6B7280', flexWrap: 'wrap', marginBottom: 20 }}>
      <button
        onClick={onHomeClick}
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: subject ? '#4F46E5' : '#111827', fontWeight: 700, padding: 0, fontSize: 13 }}
      >
        {tab === 'my' ? 'My Notes' : 'AI Notes'}
      </button>
      {subject && (
        <>
          <ChevronRight size={14} style={{ flexShrink: 0 }} />
          <button
            onClick={() => onSubjectClick(subject)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: book ? '#4F46E5' : '#111827', fontWeight: book ? 600 : 700, padding: 0, fontSize: 13 }}
          >
            {subject}
          </button>
        </>
      )}
      {book && bookTitle && (
        <>
          <ChevronRight size={14} style={{ flexShrink: 0 }} />
          <span style={{ color: '#111827', fontWeight: 700, fontSize: 13 }}>{bookTitle}</span>
        </>
      )}
    </nav>
  );
}

function SubjectCard({ subject, totalNotes, onClick }) {
  const colors = subjectColor(subject);
  return (
    <button
      onClick={onClick}
      style={{
        background: colors.bg, border: `1.5px solid ${colors.border}`,
        borderRadius: 14, padding: '18px 20px', cursor: 'pointer',
        textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 8,
        transition: 'box-shadow 0.15s, transform 0.12s',
      }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.1)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'none'; }}
    >
      <div style={{ fontSize: 26 }}>{colors.emoji}</div>
      <div style={{ fontSize: 14, fontWeight: 700, color: colors.text }}>{subject}</div>
      <div style={{ fontSize: 12, color: colors.sub }}>{totalNotes} note{totalNotes !== 1 ? 's' : ''}</div>
    </button>
  );
}

function BookCard({ book, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: '#FAFAFA', border: '1.5px solid #E5E7EB',
        borderRadius: 12, padding: '16px 18px', cursor: 'pointer',
        textAlign: 'left', display: 'flex', alignItems: 'center', gap: 14,
        transition: 'box-shadow 0.15s',
      }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 2px 10px rgba(0,0,0,0.08)'; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; }}
    >
      <div style={{ width: 44, height: 44, borderRadius: 10, background: 'linear-gradient(135deg,#EEF2FF,#E0E7FF)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <BookOpen size={20} style={{ color: '#4F46E5' }} />
      </div>
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {book.title}
        </div>
        <div style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>
          {book.notes.length} note{book.notes.length !== 1 ? 's' : ''}
        </div>
      </div>
      <ChevronRight size={16} style={{ color: '#9CA3AF', flexShrink: 0 }} />
    </button>
  );
}

function UserNoteCard({ note, isHighlighted, onDelete, onUpdate }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(note.note_content || '');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const date = note.created_at ? new Date(note.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '';

  const handleSave = async () => {
    if (!draft.trim()) return;
    setSaving(true);
    const ok = await updateNote(note.id, draft.trim());
    setSaving(false);
    if (ok) { onUpdate(note.id, draft.trim()); setEditing(false); }
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this note?')) return;
    setDeleting(true);
    await onDelete(note.id);
  };

  return (
    <div
      id={`note-${note.id}`}
      style={{
        background: isHighlighted ? '#EEF2FF' : '#FAFAFA',
        border: `1.5px solid ${isHighlighted ? '#A5B4FC' : '#E5E7EB'}`,
        borderRadius: 12, padding: '14px 16px',
        display: 'flex', flexDirection: 'column', gap: 10,
        transition: 'border-color 0.3s, background 0.3s',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 11, color: '#9CA3AF', flex: 1 }}>{date}</span>
        {!editing && (
          <button
            onClick={() => { setEditing(true); setDraft(note.note_content || ''); }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: '#6B7280', padding: '2px 6px', borderRadius: 4 }}
          >
            Edit
          </button>
        )}
        <button
          onClick={handleDelete}
          disabled={deleting}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: '#9CA3AF', borderRadius: 4 }}
          title="Delete note"
        >
          <Trash2 size={13} />
        </button>
      </div>

      {note.highlight_text && (
        <blockquote style={{ margin: 0, borderLeft: '3px solid #C7D2FE', paddingLeft: 10, fontSize: 12, color: '#6B7280', fontStyle: 'italic' }}>
          {note.highlight_text.length > 200 ? note.highlight_text.slice(0, 200) + '…' : note.highlight_text}
          {note.page_number && <span style={{ marginLeft: 6, fontSize: 10, color: '#9CA3AF' }}>p.{note.page_number}</span>}
        </blockquote>
      )}

      {editing ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <textarea
            autoFocus
            value={draft}
            onChange={e => setDraft(e.target.value)}
            rows={4}
            style={{ width: '100%', border: '1.5px solid #A5B4FC', borderRadius: 8, padding: '8px 10px', fontSize: 13, resize: 'vertical', boxSizing: 'border-box', outline: 'none', fontFamily: 'inherit' }}
          />
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={handleSave}
              disabled={saving || !draft.trim()}
              style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 14px', background: '#4F46E5', color: '#fff', border: 'none', borderRadius: 7, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}
            >
              <Check size={13} /> {saving ? 'Saving…' : 'Save'}
            </button>
            <button
              onClick={() => setEditing(false)}
              style={{ padding: '6px 12px', background: '#F3F4F6', color: '#374151', border: 'none', borderRadius: 7, cursor: 'pointer', fontSize: 12 }}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <p style={{ margin: 0, fontSize: 13, color: '#374151', lineHeight: 1.65, whiteSpace: 'pre-wrap' }}>
          {note.note_content}
        </p>
      )}
    </div>
  );
}

function SmartNoteCard({ note, isHighlighted, onStar, onDelete }) {
  const [starring, setStarring] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const date = note.created_at ? new Date(note.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '';

  const handleStar = async () => {
    setStarring(true);
    const ok = await toggleSmartNoteStar(note.id, !note.is_starred);
    if (ok) onStar(note.id, !note.is_starred);
    setStarring(false);
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this AI note?')) return;
    setDeleting(true);
    await onDelete(note.id);
  };

  return (
    <div
      id={`note-${note.id}`}
      style={{
        background: isHighlighted ? '#FEFCE8' : (note.is_starred ? '#FEFCE8' : '#FAFAFA'),
        border: `1.5px solid ${isHighlighted ? '#FDE68A' : (note.is_starred ? '#FDE68A' : '#E5E7EB')}`,
        borderRadius: 12, padding: '14px 16px',
        display: 'flex', flexDirection: 'column', gap: 10,
        transition: 'border-color 0.3s, background 0.3s',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Sparkles size={13} style={{ color: '#7C3AED', flexShrink: 0 }} />
        <span style={{ fontSize: 11, color: '#9CA3AF', flex: 1 }}>{date}</span>
        <button
          onClick={handleStar}
          disabled={starring}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: note.is_starred ? '#F59E0B' : '#9CA3AF', borderRadius: 4 }}
          title={note.is_starred ? 'Unstar' : 'Star'}
        >
          <Star size={13} fill={note.is_starred ? '#F59E0B' : 'none'} />
        </button>
        <button
          onClick={handleDelete}
          disabled={deleting}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: '#9CA3AF', borderRadius: 4 }}
          title="Delete"
        >
          <Trash2 size={13} />
        </button>
      </div>
      {note.original_text && (
        <blockquote style={{ margin: 0, borderLeft: '3px solid #DDD6FE', paddingLeft: 10, fontSize: 12, color: '#6B7280', fontStyle: 'italic' }}>
          {note.original_text.length > 200 ? note.original_text.slice(0, 200) + '…' : note.original_text}
        </blockquote>
      )}
      <p style={{ margin: 0, fontSize: 13, color: '#374151', lineHeight: 1.65 }}>{note.ai_summary}</p>
    </div>
  );
}

function NewNoteComposer({ onSave, books }) {
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState('');
  const [selectedBook, setSelectedBook] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!content.trim() || !selectedBook) return;
    setSaving(true);
    const note = await onSave(selectedBook, content.trim());
    setSaving(false);
    if (note) { setContent(''); setSelectedBook(''); setOpen(false); }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', background: '#4F46E5', color: '#fff', border: 'none', borderRadius: 9, cursor: 'pointer', fontSize: 13, fontWeight: 600, marginBottom: 20 }}
      >
        <Plus size={15} /> New Note
      </button>
    );
  }

  return (
    <div style={{ background: '#F5F3FF', border: '1.5px solid #C4B5FD', borderRadius: 12, padding: '16px', marginBottom: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#4F46E5' }}>New Note</span>
        <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: '#9CA3AF' }}>
          <X size={15} />
        </button>
      </div>
      <select
        value={selectedBook}
        onChange={e => setSelectedBook(e.target.value)}
        style={{ border: '1.5px solid #C4B5FD', borderRadius: 8, padding: '7px 10px', fontSize: 13, background: '#fff', outline: 'none' }}
      >
        <option value="">Select book…</option>
        {books.map(b => (
          <option key={b.artifactId} value={b.artifactId}>{b.title}</option>
        ))}
      </select>
      <textarea
        autoFocus
        value={content}
        onChange={e => setContent(e.target.value)}
        placeholder="Write your note…"
        rows={4}
        style={{ border: '1.5px solid #C4B5FD', borderRadius: 8, padding: '8px 10px', fontSize: 13, resize: 'vertical', outline: 'none', fontFamily: 'inherit' }}
      />
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={handleSave}
          disabled={saving || !content.trim() || !selectedBook}
          style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 16px', background: '#4F46E5', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600, opacity: (!content.trim() || !selectedBook) ? 0.5 : 1 }}
        >
          <Check size={13} /> {saving ? 'Saving…' : 'Save Note'}
        </button>
        <button
          onClick={() => setOpen(false)}
          style={{ padding: '7px 14px', background: '#EDE9FE', color: '#5B21B6', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13 }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

function EmptyHierarchy({ level, tab }) {
  const messages = {
    subjects: {
      my: { icon: <StickyNote size={40} />, title: 'No notes yet', sub: 'Open an e-book and add notes to see them organised here.' },
      ai: { icon: <Sparkles size={40} />, title: 'No AI notes yet', sub: 'Use Smart Notes in the PDF reader to generate AI summaries.' },
    },
    books: {
      my: { icon: <BookOpen size={40} />, title: 'No books in this subject', sub: 'Notes from books in this subject will appear here.' },
      ai: { icon: <BookOpen size={40} />, title: 'No books in this subject', sub: 'AI notes from books in this subject will appear here.' },
    },
    notes: {
      my: { icon: <StickyNote size={40} />, title: 'No notes for this book', sub: 'Highlight text while reading this book to create notes.' },
      ai: { icon: <Sparkles size={40} />, title: 'No AI notes for this book', sub: 'Generate AI summaries while reading this book.' },
    },
  };
  const m = messages[level]?.[tab] || messages.subjects.my;
  return (
    <div style={{ textAlign: 'center', padding: '60px 20px', color: '#9CA3AF' }}>
      <div style={{ opacity: 0.4, marginBottom: 12 }}>{m.icon}</div>
      <div style={{ fontSize: 15, fontWeight: 600, color: '#374151' }}>{m.title}</div>
      <div style={{ fontSize: 13, marginTop: 4 }}>{m.sub}</div>
    </div>
  );
}

// ── Colour mapping for subjects ────────────────────────────────────────────

const SUBJECT_PALETTES = [
  { bg: '#EFF6FF', border: '#BFDBFE', text: '#1D4ED8', sub: '#3B82F6', emoji: '❤️' }, // Cardiology
  { bg: '#F0FDF4', border: '#BBF7D0', text: '#15803D', sub: '#22C55E', emoji: '🫁' }, // Pulmonology
  { bg: '#FDF4FF', border: '#E9D5FF', text: '#7E22CE', sub: '#A855F7', emoji: '🧠' }, // Neurology
  { bg: '#FFFBEB', border: '#FDE68A', text: '#92400E', sub: '#F59E0B', emoji: '📚' }, // Default
  { bg: '#FFF1F2', border: '#FECDD3', text: '#9F1239', sub: '#F43F5E', emoji: '💉' },
  { bg: '#F0FDFA', border: '#99F6E4', text: '#134E4A', sub: '#14B8A6', emoji: '🦷' },
  { bg: '#FEF9C3', border: '#FEF08A', text: '#713F12', sub: '#CA8A04', emoji: '🩺' },
];

function subjectColor(subject) {
  // Deterministic colour from subject name
  let hash = 0;
  for (let i = 0; i < (subject || '').length; i++) hash = subject.charCodeAt(i) + ((hash << 5) - hash);
  return SUBJECT_PALETTES[Math.abs(hash) % SUBJECT_PALETTES.length];
}

// ── Main page component ────────────────────────────────────────────────────

export default function NotesPage() {
  const { user } = useAuth();
  const userId = user?.id;
  const { tab, subject, book, noteId, setParams } = useNoteParams();

  const [myNotes, setMyNotes]   = useState([]);
  const [aiNotes, setAiNotes]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);
  const [search, setSearch]     = useState('');

  const myHierarchy = buildHierarchy(myNotes);
  const aiHierarchy = buildHierarchy(aiNotes);
  const hierarchy   = tab === 'my' ? myHierarchy : aiHierarchy;

  // ── Load ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    Promise.all([getUserNotesHierarchy(userId), getSmartNotesHierarchy(userId)])
      .then(([my, ai]) => { setMyNotes(my); setAiNotes(ai); })
      .catch(() => setError('Failed to load notes. Please try again.'))
      .finally(() => setLoading(false));
  }, [userId]);

  // ── Scroll to highlighted note ─────────────────────────────────────────
  useEffect(() => {
    if (!noteId || loading) return;
    const el = document.getElementById(`note-${noteId}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [noteId, loading, book]);

  // ── Auto-select subject+book when ?id= is given ────────────────────────
  useEffect(() => {
    if (!noteId || loading || (subject && book)) return;
    const allNotes = tab === 'my' ? myNotes : aiNotes;
    const found = allNotes.find(n => n.id === noteId);
    if (found) {
      setParams({
        tab,
        subject: found.artifacts?.subject || 'Uncategorised',
        book: found.artifacts?.id || null,
        id: noteId,
      }, true);
    }
  }, [noteId, loading, myNotes, aiNotes]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Mutations ──────────────────────────────────────────────────────────
  const handleCreateNote = async (artifactId, content) => {
    const note = await createNote(userId, artifactId, content);
    if (note) setMyNotes(prev => [note, ...prev]);
    return note;
  };

  const handleUpdateNote = (noteId, newContent) => {
    setMyNotes(prev => prev.map(n => n.id === noteId ? { ...n, note_content: newContent } : n));
  };

  const handleDeleteMyNote = async (id) => {
    await deleteNote(id);
    setMyNotes(prev => prev.filter(n => n.id !== id));
  };

  const handleStarAiNote = (id, isStarred) => {
    setAiNotes(prev => prev.map(n => n.id === id ? { ...n, is_starred: isStarred } : n));
  };

  const handleDeleteAiNote = async (id) => {
    await deleteSmartNote(id);
    setAiNotes(prev => prev.filter(n => n.id !== id));
  };

  // ── Derived view data ──────────────────────────────────────────────────
  const activeSubject = subject ? hierarchy.find(s => s.subject === subject) : null;
  const activeBook    = (activeSubject && book)
    ? activeSubject.books.find(b => b.artifactId === book)
    : null;

  // All books flat list (for the new note composer's book selector)
  const allBooks = [...new Map(
    (tab === 'my' ? myNotes : aiNotes)
      .filter(n => n.artifacts?.id)
      .map(n => [n.artifacts.id, { artifactId: n.artifacts.id, title: n.artifacts.title || 'Unknown' }])
  ).values()].sort((a, b) => a.title.localeCompare(b.title));

  // Filter notes at the book level by search query
  const visibleNotes = activeBook
    ? activeBook.notes.filter(n => {
        if (!search) return true;
        const q = search.toLowerCase();
        return (
          (n.note_content || '').toLowerCase().includes(q) ||
          (n.highlight_text || '').toLowerCase().includes(q) ||
          (n.ai_summary || '').toLowerCase().includes(q)
        );
      })
    : [];

  // ── Navigation helpers ─────────────────────────────────────────────────
  const goHome    = () => setParams({ tab, subject: null, book: null, id: null });
  const goSubject = (s) => setParams({ tab, subject: s, book: null, id: null });
  const goBook    = (s, b) => setParams({ tab, subject: s, book: b, id: null });

  const switchTab = (t) => setParams({ tab: t, subject: null, book: null, id: null });

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div style={{ padding: '24px 20px', maxWidth: 800, margin: '0 auto' }}>

      {/* ── Header ──────────────────────────────────────────────── */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          {(subject || book) && (
            <button
              onClick={book ? () => goSubject(subject) : goHome}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px 6px', borderRadius: 6, color: '#6B7280', display: 'flex', alignItems: 'center' }}
              title="Back"
            >
              <ArrowLeft size={18} />
            </button>
          )}
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#111827', margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
            <StickyNote size={22} style={{ color: '#6366F1' }} />
            Notes
          </h1>
        </div>
        <p style={{ fontSize: 13, color: '#6B7280', margin: '0 0 0 32px' }}>
          All your reading notes and AI summaries, organised by subject and book.
        </p>
      </div>

      {/* ── Tabs ──────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 4, background: '#F3F4F6', borderRadius: 10, padding: 4, marginBottom: 20, width: 'fit-content' }}>
        {[
          { k: 'my', l: 'My Notes', icon: StickyNote, count: myNotes.length },
          { k: 'ai', l: 'AI Notes', icon: Sparkles,   count: aiNotes.length },
        ].map(({ k, l, icon: Icon, count }) => (
          <button
            key={k}
            onClick={() => switchTab(k)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '7px 16px', borderRadius: 7, border: 'none', cursor: 'pointer',
              fontSize: 13, fontWeight: 600,
              background: tab === k ? '#fff' : 'transparent',
              color: tab === k ? '#4F46E5' : '#6B7280',
              boxShadow: tab === k ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
              transition: 'all 0.15s',
            }}
          >
            <Icon size={14} />
            {l}
            <span style={{
              fontSize: 11, borderRadius: 10, padding: '1px 7px', fontWeight: 700,
              background: tab === k ? '#EEF2FF' : '#E5E7EB',
              color: tab === k ? '#4F46E5' : '#9CA3AF',
            }}>
              {count}
            </span>
          </button>
        ))}
      </div>

      {/* ── Breadcrumb ───────────────────────────────────────────── */}
      {(subject || book) && (
        <Breadcrumb
          tab={tab}
          subject={subject}
          book={book}
          bookTitle={activeBook?.title}
          onTabChange={switchTab}
          onSubjectClick={goSubject}
          onHomeClick={goHome}
        />
      )}

      {/* ── Loading / Error ──────────────────────────────────────── */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[1, 2, 3].map(i => (
            <div key={i} style={{ height: 90, background: '#F3F4F6', borderRadius: 12, animation: 'pulse 1.5s ease-in-out infinite' }} />
          ))}
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-300 rounded-xl px-4 py-3 text-red-700 text-sm">{error}</div>
      ) : (

        /* ── Level 0: Subject grid ──────────────────────────────── */
        !subject ? (
          <>
            {tab === 'my' && (
              <NewNoteComposer onSave={handleCreateNote} books={allBooks} />
            )}
            {hierarchy.length === 0 ? (
              <EmptyHierarchy level="subjects" tab={tab} />
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 14 }}>
                {hierarchy.map(s => (
                  <SubjectCard
                    key={s.subject}
                    subject={s.subject}
                    totalNotes={s.totalNotes}
                    onClick={() => goSubject(s.subject)}
                  />
                ))}
              </div>
            )}
          </>

        /* ── Level 1: Books in subject ──────────────────────────── */
        ) : !book ? (
          <>
            {activeSubject?.books.length === 0 ? (
              <EmptyHierarchy level="books" tab={tab} />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {(activeSubject?.books || []).map(b => (
                  <BookCard
                    key={b.artifactId}
                    book={b}
                    onClick={() => goBook(subject, b.artifactId)}
                  />
                ))}
              </div>
            )}
          </>

        /* ── Level 2: Notes in book ─────────────────────────────── */
        ) : (
          <>
            {/* Search bar */}
            {activeBook && activeBook.notes.length > 2 && (
              <div style={{ position: 'relative', marginBottom: 16 }}>
                <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search notes…"
                  style={{ width: '100%', border: '1.5px solid #E5E7EB', borderRadius: 9, padding: '9px 12px 9px 36px', fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
                />
                {search && (
                  <button onClick={() => setSearch('')} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF' }}>
                    <X size={14} />
                  </button>
                )}
              </div>
            )}

            {!activeBook || visibleNotes.length === 0 ? (
              <EmptyHierarchy level="notes" tab={tab} />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {tab === 'my'
                  ? visibleNotes.map(n => (
                      <UserNoteCard
                        key={n.id}
                        note={n}
                        isHighlighted={n.id === noteId}
                        onDelete={handleDeleteMyNote}
                        onUpdate={handleUpdateNote}
                      />
                    ))
                  : visibleNotes.map(n => (
                      <SmartNoteCard
                        key={n.id}
                        note={n}
                        isHighlighted={n.id === noteId}
                        onStar={handleStarAiNote}
                        onDelete={handleDeleteAiNote}
                      />
                    ))
                }
              </div>
            )}
          </>
        )
      )}
    </div>
  );
}
