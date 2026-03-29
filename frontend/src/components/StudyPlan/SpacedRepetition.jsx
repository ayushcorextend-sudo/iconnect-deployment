import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { dbRun, dbUpdate } from '../../lib/dbService';
import { trackActivity, startTimer, stopTimer } from '../../lib/trackActivity';
import { sm2 } from '../../lib/sm2';

const RATINGS = [
  { label: 'Again', q: 0, bg: '#FEE2E2', color: '#DC2626', emoji: '🔁' },
  { label: 'Hard',  q: 3, bg: '#FEF3C7', color: '#D97706', emoji: '😓' },
  { label: 'Good',  q: 4, bg: '#DBEAFE', color: '#1D4ED8', emoji: '👍' },
  { label: 'Easy',  q: 5, bg: '#DCFCE7', color: '#15803D', emoji: '⚡' },
];

export default function SpacedRepetition({ userId, addToast }) {
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [done, setDone] = useState(false);
  const [reviewed, setReviewed] = useState(0);
  const [saving, setSaving] = useState(false);
  const [totalDue, setTotalDue] = useState(0);

  useEffect(() => {
    if (!userId) return;
    load();
  }, [userId]);

  async function load() {
    setLoading(true);
    try {
      const today = new Date().toISOString().slice(0, 10);
      const q = supabase
        .from('spaced_repetition_cards')
        .select('*')
        .eq('user_id', userId)
        .lte('next_review_at', today)
        .order('next_review_at', { ascending: true })
        .limit(30);
      const { data, error: fetchErr, status } = await dbRun(q);
      if (status === 'error') throw new Error(fetchErr);
      setCards(data || []);
      setTotalDue(data?.length || 0);
      if (data?.length > 0) startTimer('spaced_rep', userId);
    } catch (e) {
      addToast?.('error', 'Could not load review cards: ' + e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleRate(quality) {
    const card = cards[idx];
    if (!card || saving) return;
    setSaving(true);

    const result = sm2(
      quality,
      card.repetitions || 0,
      card.easiness || 2.5,
      card.interval || 0
    );
    const { easeFactor: newE, interval: newI, repetitions: newR, nextReviewDate } = result;

    try {
      // SR-3: use dbUpdate (centralised error handling) instead of direct supabase.from()
      const { status } = await dbUpdate('spaced_repetition_cards', {
        easiness: newE,
        interval: newI,
        repetitions: newR,
        nextReviewAt: nextReviewDate,
        lastReviewedAt: new Date().toISOString(),
      }, { id: card.id });
      if (status === 'error') throw new Error('Failed to save review progress');

      const nextIdx = idx + 1;
      setReviewed(r => r + 1);
      setFlipped(false);

      if (nextIdx >= cards.length) {
        setDone(true);
        const duration = stopTimer('spaced_rep', userId);
        trackActivity('spaced_rep_reviewed', userId, duration || null);
      } else {
        setIdx(nextIdx);
      }
    } catch (e) {
      addToast?.('error', 'Could not save review: ' + e.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
      <div style={{ width: 32, height: 32, borderRadius: '50%', border: '3px solid #E5E7EB', borderTopColor: '#4F46E5', animation: 'spin 0.8s linear infinite' }} />
    </div>
  );

  if (done || cards.length === 0) return (
    <div style={{ textAlign: 'center', padding: '40px 20px' }}>
      <div style={{ fontSize: 56, marginBottom: 12 }}>{cards.length === 0 ? '🎉' : '✅'}</div>
      <div style={{ fontSize: 18, fontWeight: 800, color: '#111827', marginBottom: 6 }}>
        {cards.length === 0 ? 'No cards due today!' : `Session complete — ${reviewed} cards reviewed`}
      </div>
      <div style={{ fontSize: 13, color: '#9CA3AF', marginBottom: 24 }}>
        {cards.length === 0
          ? 'Complete exam subjects to build your review queue. Cards from wrong answers appear here.'
          : 'Great work! Come back tomorrow for your next review session.'}
      </div>
      {reviewed > 0 && (
        <div style={{ display: 'inline-block', padding: '8px 20px', borderRadius: 99, background: '#EEF2FF', color: '#4F46E5', fontWeight: 700, fontSize: 13 }}>
          🔥 +{reviewed * 5} XP earned
        </div>
      )}
    </div>
  );

  const card = cards[idx];
  // SR-1: guard NaN when totalDue is 0 (belt-and-suspenders alongside the early return above)
  const progress = totalDue > 0 ? Math.round((idx / totalDue) * 100) : 0;

  return (
    <div style={{ maxWidth: 560, margin: '0 auto' }}>
      {/* Progress bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <div style={{ flex: 1, height: 8, background: '#E5E7EB', borderRadius: 99, overflow: 'hidden' }}>
          <div style={{ width: `${progress}%`, height: '100%', background: 'linear-gradient(90deg,#4F46E5,#7C3AED)', borderRadius: 99, transition: 'width .4s' }} />
        </div>
        <div style={{ fontSize: 12, color: '#6B7280', minWidth: 60, textAlign: 'right' }}>
          {idx} / {totalDue} done
        </div>
      </div>

      {/* Card */}
      <div
        onClick={() => !flipped && setFlipped(true)}
        style={{
          background: '#fff', border: '1px solid #E5E7EB', borderRadius: 20,
          padding: '36px 28px', textAlign: 'center', cursor: flipped ? 'default' : 'pointer',
          boxShadow: '0 4px 20px rgba(0,0,0,0.06)', marginBottom: 16, minHeight: 180,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          position: 'relative', transition: 'box-shadow .15s',
        }}
      >
        {/* Subject badge */}
        {card.subject && (
          <div style={{
            position: 'absolute', top: 14, left: 14,
            background: '#EEF2FF', color: '#4F46E5', borderRadius: 8,
            fontSize: 11, fontWeight: 700, padding: '2px 8px',
          }}>
            {card.subject}
          </div>
        )}

        {!flipped ? (
          <>
            <div style={{ fontSize: 28, marginBottom: 12 }}>🧠</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#111827', lineHeight: 1.5, marginBottom: 16 }}>
              {card.front}
            </div>
            <div style={{ fontSize: 12, color: '#9CA3AF', background: '#F9FAFB', borderRadius: 8, padding: '6px 14px' }}>
              Tap to reveal answer
            </div>
          </>
        ) : (
          <>
            <div style={{ fontSize: 13, color: '#6B7280', marginBottom: 10, fontWeight: 600 }}>Answer</div>
            <div style={{ fontSize: 14, color: '#111827', lineHeight: 1.6, fontWeight: 500 }}>
              {card.back}
            </div>
          </>
        )}
      </div>

      {/* Rating buttons — only visible after flip */}
      {flipped && (
        <div>
          <div style={{ fontSize: 12, color: '#9CA3AF', textAlign: 'center', marginBottom: 10 }}>
            How well did you recall this?
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {RATINGS.map(r => (
              <button
                key={r.label}
                onClick={() => handleRate(r.q)}
                disabled={saving}
                style={{
                  flex: 1, padding: '10px 4px', borderRadius: 12, border: '2px solid',
                  borderColor: r.bg, background: r.bg, color: r.color,
                  fontWeight: 700, fontSize: 12, cursor: 'pointer',
                  opacity: saving ? 0.6 : 1, transition: 'transform .1s',
                }}
                onMouseEnter={e => { if (!saving) e.currentTarget.style.transform = 'scale(1.04)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = ''; }}
              >
                <div style={{ fontSize: 18 }}>{r.emoji}</div>
                <div>{r.label}</div>
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#D1D5DB', marginTop: 8, padding: '0 4px' }}>
            <span>Reviews tomorrow</span>
            <span>Reviews in days</span>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
