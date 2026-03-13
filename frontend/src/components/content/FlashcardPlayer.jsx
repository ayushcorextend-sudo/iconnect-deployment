import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

export default function FlashcardPlayer({ deckId, addToast, onBack }) {
  const [deck, setDeck]       = useState(null);
  const [cards, setCards]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [current, setCurrent] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [known, setKnown]     = useState(new Set());    // card indices marked "Know it"
  const [phase, setPhase]     = useState('play');        // 'play' | 'summary'

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const { data: d, error: e1 } = await supabase.from('flashcard_decks').select('*').eq('id', deckId).single();
        if (e1) throw e1;
        const { data: cs, error: e2 } = await supabase.from('flashcards').select('*').eq('deck_id', deckId).order('sort_order');
        if (e2) throw e2;
        setDeck(d);
        setCards(cs || []);
      } catch (e) {
        addToast('error', 'Failed to load deck: ' + e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [deckId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
        <div style={{ width: 28, height: 28, borderRadius: '50%', border: '3px solid #E5E7EB', borderTopColor: '#2563EB', animation: 'spin 0.8s linear infinite' }} />
      </div>
    );
  }

  if (!deck || !cards.length) {
    return (
      <div className="empty">
        <div className="empty-ic">🃏</div>
        <div className="empty-t">Deck not found or empty</div>
        <button className="btn btn-s btn-sm" onClick={onBack} style={{ marginTop: 12 }}>Back</button>
      </div>
    );
  }

  if (phase === 'summary') {
    return (
      <div style={{ maxWidth: 480, margin: '0 auto', textAlign: 'center' }}>
        <div className="card" style={{ padding: 32 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🎓</div>
          <div style={{ fontWeight: 800, fontSize: 20, marginBottom: 8 }}>Session Complete!</div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 32, marginBottom: 24 }}>
            <div>
              <div style={{ fontSize: 28, fontWeight: 800, color: '#10B981' }}>{known.size}</div>
              <div style={{ fontSize: 13, color: '#6B7280' }}>Know it</div>
            </div>
            <div>
              <div style={{ fontSize: 28, fontWeight: 800, color: '#EF4444' }}>{cards.length - known.size}</div>
              <div style={{ fontSize: 13, color: '#6B7280' }}>Still learning</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
            <button className="btn btn-p" onClick={() => { setCurrent(0); setFlipped(false); setKnown(new Set()); setPhase('play'); }}>
              Review Again
            </button>
            <button className="btn btn-s" onClick={onBack}>Done</button>
          </div>
        </div>
      </div>
    );
  }

  const card = cards[current];
  const progress = `${current + 1} / ${cards.length}`;

  const goNext = (markKnown) => {
    if (markKnown) setKnown(prev => new Set([...prev, current]));
    setFlipped(false);
    if (current >= cards.length - 1) {
      setPhase('summary');
    } else {
      // Small delay to let flip reset visually
      setTimeout(() => setCurrent(c => c + 1), 150);
    }
  };

  return (
    <div style={{ maxWidth: 540, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <button className="btn btn-s btn-sm" onClick={onBack}>← Back</button>
        <div style={{ fontWeight: 600, fontSize: 13, color: '#6B7280' }}>{deck.title} · {progress}</div>
        <div style={{ fontSize: 13, color: '#10B981', fontWeight: 600 }}>{known.size} known</div>
      </div>

      {/* Progress bar */}
      <div style={{ height: 4, background: '#E5E7EB', borderRadius: 4, marginBottom: 24 }}>
        <div style={{ height: 4, borderRadius: 4, background: '#4F46E5', width: `${((current + 1) / cards.length) * 100}%`, transition: 'width .3s' }} />
      </div>

      {/* Flip card */}
      <div
        onClick={() => setFlipped(f => !f)}
        style={{
          cursor: 'pointer', perspective: 1000, marginBottom: 24,
          height: 220, userSelect: 'none',
        }}
      >
        <div style={{
          position: 'relative', width: '100%', height: '100%',
          transformStyle: 'preserve-3d',
          transition: 'transform 0.45s ease',
          transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
        }}>
          {/* Front */}
          <div style={{
            position: 'absolute', inset: 0, backfaceVisibility: 'hidden',
            background: '#fff', border: '2px solid #E5E7EB', borderRadius: 16,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            padding: 28, boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
          }}>
            <div style={{ fontSize: 11, color: '#9CA3AF', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 }}>Front — tap to flip</div>
            <div style={{ fontWeight: 700, fontSize: 18, textAlign: 'center', lineHeight: 1.5 }}>{card.front}</div>
          </div>
          {/* Back */}
          <div style={{
            position: 'absolute', inset: 0, backfaceVisibility: 'hidden',
            background: '#EFF6FF', border: '2px solid #BFDBFE', borderRadius: 16,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            padding: 28, boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
            transform: 'rotateY(180deg)',
          }}>
            <div style={{ fontSize: 11, color: '#6B7280', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 }}>Back</div>
            <div style={{ fontWeight: 600, fontSize: 16, textAlign: 'center', lineHeight: 1.6, color: '#1E40AF' }}>{card.back}</div>
          </div>
        </div>
      </div>

      {!flipped ? (
        <div style={{ textAlign: 'center', color: '#9CA3AF', fontSize: 13 }}>Tap the card to reveal the answer</div>
      ) : (
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          <button
            onClick={() => goNext(false)}
            style={{ flex: 1, maxWidth: 180, padding: '14px', borderRadius: 10, border: '2px solid #FCA5A5', background: '#FEF2F2', color: '#DC2626', fontWeight: 700, cursor: 'pointer', fontSize: 14 }}
          >
            ❌ Still Learning
          </button>
          <button
            onClick={() => goNext(true)}
            style={{ flex: 1, maxWidth: 180, padding: '14px', borderRadius: 10, border: '2px solid #6EE7B7', background: '#ECFDF5', color: '#059669', fontWeight: 700, cursor: 'pointer', fontSize: 14 }}
          >
            ✅ Know It!
          </button>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 20 }}>
        <button onClick={() => { setCurrent(c => Math.max(0, c - 1)); setFlipped(false); }} disabled={current === 0}
          className="btn btn-s btn-sm">← Prev</button>
        <button onClick={() => goNext(false)} className="btn btn-s btn-sm">Skip →</button>
      </div>
    </div>
  );
}
