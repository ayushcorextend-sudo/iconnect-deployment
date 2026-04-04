import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { SPECIALITIES } from '../../data/constants';
import ConfirmModal from '../ui/ConfirmModal';

const statusCfg = {
  pending:  { label: 'Pending',  bg: '#FEF3C7', color: '#D97706' },
  approved: { label: 'Approved', bg: '#DCFCE7', color: '#15803D' },
  rejected: { label: 'Rejected', bg: '#FEE2E2', color: '#DC2626' },
};

const blankCard = () => ({ _id: Math.random().toString(36).slice(2), front: '', back: '' });

export default function FlashcardMaker({ userId, addToast }) {
  const [view, setView]     = useState('list');   // 'list' | 'create'
  const [decks, setDecks]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState(null);

  const [deckTitle, setDeckTitle]         = useState('');
  const [deckSubject, setDeckSubject]     = useState('');
  const [deckDesc, setDeckDesc]           = useState('');
  const [cards, setCards]                 = useState([blankCard(), blankCard()]);

  useEffect(() => { loadDecks(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const loadDecks = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('flashcard_decks').select('id, title, subject, status, created_at').eq('created_by', userId).order('created_at', { ascending: false });
      if (error) throw error;
      setDecks(data || []);
    } catch (e) {
      addToast('error', 'Failed to load decks: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const deleteDeck = async (id) => {
    try {
      const { error } = await supabase.from('flashcard_decks').delete().eq('id', id);
      if (error) throw error;
      setDecks(prev => prev.filter(d => d.id !== id));
      addToast('success', 'Deck deleted.');
    } catch (e) {
      addToast('error', 'Delete failed: ' + e.message);
    }
  };

  const addCard = () => setCards(prev => [...prev, blankCard()]);
  const removeCard = (idx) => setCards(prev => prev.filter((_, i) => i !== idx));
  const updateCard = (idx, field, val) =>
    setCards(prev => prev.map((c, i) => i === idx ? { ...c, [field]: val } : c));

  const saveDeck = async () => {
    if (!deckTitle.trim()) { addToast('error', 'Deck title is required.'); return; }
    if (!deckSubject)      { addToast('error', 'Subject is required.'); return; }
    if (cards.some(c => !c.front.trim() || !c.back.trim())) {
      addToast('error', 'All card fronts and backs must be filled in.'); return;
    }
    if (userId?.startsWith('local_')) { addToast('error', 'Not available in demo mode.'); return; }
    setSaving(true);
    try {
      const { data: deck, error: dErr } = await supabase
        .from('flashcard_decks')
        .insert({ title: deckTitle.trim(), subject: deckSubject, description: deckDesc, status: 'pending', created_by: userId })
        .select('id').single();
      if (dErr) throw dErr;

      const rows = cards.map((c, i) => ({ deck_id: deck.id, sort_order: i, front: c.front.trim(), back: c.back.trim() }));
      const { error: cErr } = await supabase.from('flashcards').insert(rows);
      if (cErr) throw cErr;

      addToast('success', 'Deck submitted for approval!');
      setDeckTitle(''); setDeckSubject(''); setDeckDesc(''); setCards([blankCard(), blankCard()]);
      await loadDecks();
      setView('list');
    } catch (e) {
      addToast('error', 'Save failed: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  if (view === 'list') {
    return (
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ fontWeight: 700, fontSize: 15 }}>My Decks ({decks.length})</div>
          <button className="btn btn-p btn-sm" onClick={() => setView('create')}>+ New Deck</button>
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
            <div style={{ width: 24, height: 24, borderRadius: '50%', border: '3px solid #E5E7EB', borderTopColor: '#2563EB', animation: 'spin 0.8s linear infinite' }} />
          </div>
        ) : decks.length === 0 ? (
          <div className="empty">
            <div className="empty-ic">🃏</div>
            <div className="empty-t">No decks yet</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {decks.map(d => {
              const sc = statusCfg[d.status] || { label: d.status, bg: '#F3F4F6', color: '#6B7280' };
              return (
                <div key={d.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 14 }}>
                  <div style={{ fontSize: 28 }}>🃏</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{d.title}</div>
                    <div style={{ fontSize: 12, color: '#6B7280' }}>{d.subject}</div>
                  </div>
                  <span style={{ padding: '3px 10px', borderRadius: 12, fontSize: 11, fontWeight: 700, background: sc.bg, color: sc.color }}>{sc.label}</span>
                  {d.status !== 'approved' && (
                    <button aria-label="Delete flashcard" onClick={() => setPendingDeleteId(d.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, padding: 4 }}>🗑️</button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // CREATE VIEW
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <button className="btn btn-s btn-sm" onClick={() => setView('list')}>← Back</button>
        <div style={{ fontWeight: 700, fontSize: 15 }}>Create Flashcard Deck</div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="fg">
          <label className="fl">Deck Title <span className="req">*</span></label>
          <input className="fi-in" value={deckTitle} onChange={e => setDeckTitle(e.target.value)} placeholder="e.g. Pharmacology High-Yield" />
        </div>
        <div className="fg">
          <label className="fl">Subject <span className="req">*</span></label>
          <select className="fi-sel" value={deckSubject} onChange={e => setDeckSubject(e.target.value)}>
            <option value="">Select subject…</option>
            {Object.entries(SPECIALITIES).map(([prog, subs]) => (
              <optgroup key={prog} label={prog}>
                {subs.map(s => <option key={s} value={s}>{s}</option>)}
              </optgroup>
            ))}
          </select>
        </div>
        <div className="fg">
          <label className="fl">Description (optional)</label>
          <textarea className="fi-ta" rows={2} value={deckDesc} onChange={e => setDeckDesc(e.target.value)} />
        </div>
      </div>

      <div style={{ fontWeight: 700, marginBottom: 10 }}>Cards ({cards.length})</div>
      {cards.map((card, idx) => (
        <div key={card._id} className="card" style={{ marginBottom: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <div style={{ fontWeight: 600, fontSize: 13, color: '#6B7280' }}>Card {idx + 1}</div>
            {cards.length > 1 && (
              <button onClick={() => removeCard(idx)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#EF4444', fontSize: 13 }}>Remove</button>
            )}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div className="fg" style={{ margin: 0 }}>
              <label className="fl">Front <span className="req">*</span></label>
              <textarea className="fi-ta" rows={3} value={card.front} onChange={e => updateCard(idx, 'front', e.target.value)} placeholder="Question / term…" />
            </div>
            <div className="fg" style={{ margin: 0 }}>
              <label className="fl">Back <span className="req">*</span></label>
              <textarea className="fi-ta" rows={3} value={card.back} onChange={e => updateCard(idx, 'back', e.target.value)} placeholder="Answer / definition…" />
            </div>
          </div>
        </div>
      ))}

      <button className="btn btn-s btn-sm" onClick={addCard} style={{ marginBottom: 20 }}>+ Add Card</button>
      <div style={{ display: 'flex', gap: 10 }}>
        <button className="btn btn-p btn-sm" onClick={saveDeck} disabled={saving}>
          {saving ? 'Saving…' : 'Submit for Approval'}
        </button>
        <button className="btn btn-s btn-sm" onClick={() => setView('list')}>Cancel</button>
      </div>

      {pendingDeleteId && (
        <ConfirmModal
          message="Delete this flashcard deck? This cannot be undone."
          confirmLabel="Delete Deck"
          onConfirm={() => { const id = pendingDeleteId; setPendingDeleteId(null); deleteDeck(id); }}
          onCancel={() => setPendingDeleteId(null)}
        />
      )}
    </div>
  );
}
