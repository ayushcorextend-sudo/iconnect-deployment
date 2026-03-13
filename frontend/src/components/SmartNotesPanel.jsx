import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { generateSmartNote } from '../lib/aiService';

/**
 * SmartNotesPanel — slide-out panel for AI-compressed study notes.
 * Opened from EBooksPage via a "📝 Smart Notes" button in the PDF toolbar.
 */
export default function SmartNotesPanel({ onClose, currentArtifact }) {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [userId, setUserId] = useState(null);

  // Create-mode state
  const [creating, setCreating] = useState(false);
  const [originalText, setOriginalText] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [draft, setDraft] = useState(null); // { note, mnemonic, tags, error }

  useEffect(() => {
    async function init() {
      try {
        const { data: authData } = await supabase.auth.getUser();
        const uid = authData?.user?.id;
        if (!uid) { setLoading(false); return; }
        setUserId(uid);
        await fetchNotes(uid);
      } catch (_) {
        setLoading(false);
      }
    }
    init();
  }, []);

  const fetchNotes = async (uid) => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('smart_notes')
        .select('*')
        .eq('user_id', uid)
        .order('created_at', { ascending: false });
      setNotes(data || []);
    } catch (_) {}
    setLoading(false);
  };

  const handleGenerate = async () => {
    if (!originalText.trim()) return;
    setAiLoading(true);
    setDraft(null);
    const result = await generateSmartNote(
      originalText,
      currentArtifact?.subject || 'Medicine',
    );
    setDraft(result);
    setAiLoading(false);
  };

  const handleSave = async () => {
    if (!userId || !draft || draft.error) return;
    try {
      const { data, error } = await supabase.from('smart_notes').insert([{
        user_id: userId,
        artifact_id: currentArtifact?.id || null,
        subject: currentArtifact?.subject || null,
        original_text: originalText.trim(),
        ai_note: draft.note,
        ai_mnemonic: draft.mnemonic,
        tags: draft.tags || [],
        is_starred: false,
      }]).select().single();
      if (!error && data) {
        setNotes(prev => [data, ...prev]);
        setCreating(false);
        setOriginalText('');
        setDraft(null);
      }
    } catch (_) {}
  };

  const handleStar = async (note) => {
    const newVal = !note.is_starred;
    setNotes(prev => prev.map(n => n.id === note.id ? { ...n, is_starred: newVal } : n));
    try {
      await supabase.from('smart_notes').update({ is_starred: newVal }).eq('id', note.id);
    } catch (_) {
      setNotes(prev => prev.map(n => n.id === note.id ? { ...n, is_starred: !newVal } : n));
    }
  };

  const handleDelete = async (id) => {
    setNotes(prev => prev.filter(n => n.id !== id));
    try {
      await supabase.from('smart_notes').delete().eq('id', id);
    } catch (_) {}
  };

  const filteredNotes = notes.filter(n => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      n.ai_note?.toLowerCase().includes(q) ||
      n.original_text?.toLowerCase().includes(q) ||
      n.subject?.toLowerCase().includes(q) ||
      n.tags?.some(t => t.toLowerCase().includes(q))
    );
  });

  return (
    <div style={{
      position: 'fixed', top: 0, right: 0, height: '100vh', width: 380,
      background: '#fff', borderLeft: '1px solid #E5E7EB',
      boxShadow: '-6px 0 32px rgba(0,0,0,0.16)',
      zIndex: 400, display: 'flex', flexDirection: 'column',
      fontFamily: 'Inter, sans-serif',
    }}>
      {/* Header */}
      <div style={{
        padding: '14px 16px', borderBottom: '1px solid #E5E7EB',
        background: 'linear-gradient(135deg,#1E1B4B,#3730A3)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div>
          <div style={{ color: '#fff', fontWeight: 800, fontSize: 14 }}>✨ Smart Notes</div>
          <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: 11, marginTop: 2 }}>
            AI-compressed study notes · {notes.length} saved
          </div>
        </div>
        <button
          onClick={onClose}
          style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', fontSize: 13 }}
        >
          ✕
        </button>
      </div>

      {/* Search */}
      <div style={{ padding: '10px 14px', borderBottom: '1px solid #F3F4F6' }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search notes, tags, subjects…"
          style={{
            width: '100%', padding: '7px 12px', borderRadius: 8,
            border: '1.5px solid #E5E7EB', fontSize: 13,
            fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
          }}
          onFocus={e => e.target.style.borderColor = '#4F46E5'}
          onBlur={e => e.target.style.borderColor = '#E5E7EB'}
        />
      </div>

      {/* Create section */}
      <div style={{ padding: '10px 14px', borderBottom: '1px solid #F3F4F6' }}>
        {!creating ? (
          <button
            onClick={() => setCreating(true)}
            style={{
              width: '100%', padding: '8px', borderRadius: 9,
              background: 'linear-gradient(135deg,#4F46E5,#7C3AED)',
              color: '#fff', border: 'none', fontWeight: 700, fontSize: 13, cursor: 'pointer',
            }}
          >
            + Create Smart Note
          </button>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ fontSize: 12, color: '#6B7280' }}>
              Paste text from your reading. AI will compress it into a note + mnemonic.
            </div>
            <textarea
              value={originalText}
              onChange={e => setOriginalText(e.target.value)}
              placeholder="Paste key passage or write your notes here…"
              rows={4}
              style={{
                width: '100%', padding: '8px 10px', borderRadius: 8,
                border: '1.5px solid #E5E7EB', fontSize: 13, resize: 'vertical',
                fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
              }}
            />
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={handleGenerate}
                disabled={!originalText.trim() || aiLoading}
                style={{
                  flex: 1, padding: '8px', borderRadius: 8, border: 'none',
                  background: !originalText.trim() || aiLoading ? '#E5E7EB' : 'linear-gradient(135deg,#4F46E5,#7C3AED)',
                  color: !originalText.trim() || aiLoading ? '#9CA3AF' : '#fff',
                  fontWeight: 700, fontSize: 12,
                  cursor: !originalText.trim() || aiLoading ? 'not-allowed' : 'pointer',
                }}
              >
                {aiLoading ? '🧠 Compressing…' : '✨ Generate'}
              </button>
              <button
                onClick={() => { setCreating(false); setOriginalText(''); setDraft(null); }}
                style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #E5E7EB', background: '#fff', fontSize: 12, cursor: 'pointer', color: '#6B7280' }}
              >
                Cancel
              </button>
            </div>

            {draft && !draft.error && (
              <div style={{ background: 'linear-gradient(135deg,#EEF2FF,#F0FDF4)', borderRadius: 10, padding: '12px 14px', border: '1px solid #C7D2FE' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#4F46E5', marginBottom: 6 }}>✨ AI Compressed Note</div>
                <div style={{ fontSize: 13, color: '#1E1B4B', lineHeight: 1.6, whiteSpace: 'pre-wrap', marginBottom: 8 }}>{draft.note}</div>
                {draft.mnemonic && (
                  <div style={{ fontSize: 12, color: '#7C3AED', background: '#EDE9FE', borderRadius: 6, padding: '6px 10px', marginBottom: 8 }}>
                    🧠 <strong>Mnemonic:</strong> {draft.mnemonic}
                  </div>
                )}
                {draft.tags?.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
                    {draft.tags.map(t => (
                      <span key={t} style={{ fontSize: 10, background: '#EEF2FF', color: '#4F46E5', borderRadius: 99, padding: '2px 8px', fontWeight: 600 }}>
                        #{t}
                      </span>
                    ))}
                  </div>
                )}
                <button
                  onClick={handleSave}
                  style={{
                    width: '100%', padding: '8px', borderRadius: 8, border: 'none',
                    background: '#10B981', color: '#fff', fontWeight: 700, fontSize: 12, cursor: 'pointer',
                  }}
                >
                  💾 Save Note
                </button>
              </div>
            )}
            {draft?.error && (
              <div style={{ fontSize: 12, color: '#DC2626', background: '#FEF2F2', borderRadius: 8, padding: '8px 12px' }}>
                ⚠️ {draft.error}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Notes list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', color: '#9CA3AF', fontSize: 13, paddingTop: 24 }}>Loading notes…</div>
        ) : filteredNotes.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#9CA3AF', fontSize: 13, paddingTop: 24 }}>
            {search ? 'No notes match your search.' : 'No smart notes yet. Paste text above to create your first one!'}
          </div>
        ) : (
          filteredNotes.map(note => (
            <div key={note.id} style={{
              marginBottom: 12, padding: '12px 14px',
              background: note.is_starred ? '#FFFBEB' : '#F9FAFB',
              borderRadius: 10,
              border: note.is_starred ? '1.5px solid #FDE68A' : '1px solid #E5E7EB',
            }}>
              {/* Tags */}
              {note.tags?.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 6 }}>
                  {note.tags.map(t => (
                    <span key={t} style={{ fontSize: 10, background: '#EEF2FF', color: '#4F46E5', borderRadius: 99, padding: '1px 7px', fontWeight: 600 }}>
                      #{t}
                    </span>
                  ))}
                </div>
              )}

              {/* AI note */}
              {note.ai_note ? (
                <div style={{ fontSize: 13, color: '#1E1B4B', lineHeight: 1.6, whiteSpace: 'pre-wrap', marginBottom: 6 }}>
                  {note.ai_note}
                </div>
              ) : (
                <div style={{ fontSize: 13, color: '#374151', lineHeight: 1.6, marginBottom: 6 }}>
                  {note.original_text?.slice(0, 200)}{note.original_text?.length > 200 ? '…' : ''}
                </div>
              )}

              {/* Mnemonic */}
              {note.ai_mnemonic && (
                <div style={{ fontSize: 11, color: '#7C3AED', background: '#EDE9FE', borderRadius: 6, padding: '5px 9px', marginBottom: 6 }}>
                  🧠 {note.ai_mnemonic}
                </div>
              )}

              {/* Footer */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                <span style={{ fontSize: 10, color: '#9CA3AF' }}>
                  {note.subject || '—'} · {new Date(note.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                </span>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    onClick={() => handleStar(note)}
                    title={note.is_starred ? 'Unstar' : 'Star this note'}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 15, lineHeight: 1 }}
                  >
                    {note.is_starred ? '⭐' : '☆'}
                  </button>
                  <button
                    onClick={() => handleDelete(note.id)}
                    title="Delete note"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: '#EF4444', lineHeight: 1 }}
                  >
                    🗑
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
