import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

// ── Helpers ──────────────────────────────────────────────────
const OPTION_KEYS = ['A', 'B', 'C', 'D'];

async function fanOutNotification(supabaseClient, title, body, icon = '🔔') {
  try {
    const { data: doctors } = await supabaseClient
      .from('profiles')
      .select('id')
      .eq('role', 'doctor')
      .eq('status', 'active');

    if (!doctors?.length) return;

    const rows = doctors.map(d => ({
      user_id: d.id,
      title,
      body,
      type: 'info',
      icon,
      channel: 'in_app',
      is_read: false,
    }));

    // Insert in batches of 100
    for (let i = 0; i < rows.length; i += 100) {
      await supabaseClient.from('notifications').insert(rows.slice(i, i + 100));
    }
  } catch (e) {
    console.warn('[fanOutNotification] failed:', e.message);
  }
}

// ── Main Component ────────────────────────────────────────────
export default function SuperAdminApprovals({ addToast }) {
  const { user } = useAuth();
  const [items, setItems]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [reviewItem, setReviewItem] = useState(null);    // item being reviewed
  const [reviewData, setReviewData] = useState(null);    // full loaded data for modal
  const [reviewLoading, setReviewLoading] = useState(false);
  const [approving, setApproving] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [rejectNote, setRejectNote] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);

  useEffect(() => { loadItems(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const loadItems = async () => {
    setLoading(true);
    try {
      const [{ data: qz }, { data: vd }, { data: fd }] = await Promise.all([
        supabase.from('quizzes').select('id, title, subject, created_at, created_by, status, description, time_limit_sec').eq('status', 'pending'),
        supabase.from('video_lectures').select('id, title, subject, created_at, created_by, status, description, video_url, thumbnail_url, duration_sec').eq('status', 'pending'),
        supabase.from('flashcard_decks').select('id, title, subject, created_at, created_by, status, description').eq('status', 'pending'),
      ]);
      const all = [
        ...(qz || []).map(r => ({ ...r, _type: 'quiz',      _icon: '📝', _typeLabel: 'Quiz' })),
        ...(vd || []).map(r => ({ ...r, _type: 'video',     _icon: '🎥', _typeLabel: 'Video Lecture' })),
        ...(fd || []).map(r => ({ ...r, _type: 'flashcard', _icon: '🃏', _typeLabel: 'Flashcard Deck' })),
      ].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
      setItems(all);
    } catch (e) {
      addToast('error', 'Failed to load approvals: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  // ── Open review modal, load full data ────────────────────────
  const openReview = async (item) => {
    setReviewItem(item);
    setShowRejectForm(false);
    setRejectNote('');
    setReviewLoading(true);

    try {
      if (item._type === 'quiz') {
        const { data: qs, error } = await supabase
          .from('quiz_questions')
          .select('*')
          .eq('quiz_id', item.id)
          .order('sort_order');
        if (error) throw error;
        setReviewData({
          ...item,
          questions: (qs || []).map(q => ({
            id: q.id,
            stem: q.stem,
            options: q.options || OPTION_KEYS.map(k => ({ label: k, text: '' })),
            correctKey: q.correct_key,
            explanation: q.explanation || '',
            sort_order: q.sort_order,
          })),
        });
      } else if (item._type === 'flashcard') {
        const { data: cards, error } = await supabase
          .from('flashcards')
          .select('*')
          .eq('deck_id', item.id)
          .order('sort_order');
        if (error) throw error;
        setReviewData({ ...item, cards: cards || [] });
      } else {
        setReviewData({ ...item });
      }
    } catch (e) {
      addToast('error', 'Failed to load content: ' + e.message);
      setReviewItem(null);
    } finally {
      setReviewLoading(false);
    }
  };

  const closeModal = () => { setReviewItem(null); setReviewData(null); setShowRejectForm(false); };

  // ── Update helpers for editable modal fields ─────────────────
  const patchReview = (patch) => setReviewData(prev => ({ ...prev, ...patch }));

  const patchQuestion = (idx, patch) =>
    setReviewData(prev => ({
      ...prev,
      questions: prev.questions.map((q, i) => i === idx ? { ...q, ...patch } : q),
    }));

  const patchOption = (qIdx, label, text) =>
    setReviewData(prev => ({
      ...prev,
      questions: prev.questions.map((q, i) => i !== qIdx ? q : {
        ...q,
        options: q.options.map(o => o.label === label ? { ...o, text } : o),
      }),
    }));

  const patchCard = (idx, field, val) =>
    setReviewData(prev => ({
      ...prev,
      cards: prev.cards.map((c, i) => i === idx ? { ...c, [field]: val } : c),
    }));

  // ── Approve ──────────────────────────────────────────────────
  const handleApprove = async () => {
    if (!reviewData) return;
    setApproving(true);
    const approvedBy = user?.id;

    try {
      if (reviewData._type === 'quiz') {
        // Save edits to quiz
        const { error: qzErr } = await supabase
          .from('quizzes')
          .update({
            title: reviewData.title,
            subject: reviewData.subject,
            description: reviewData.description,
            time_limit_sec: reviewData.time_limit_sec,
            status: 'approved',
            approved_by: approvedBy,
          })
          .eq('id', reviewData.id);
        if (qzErr) throw qzErr;

        // Save edited questions
        for (const q of reviewData.questions) {
          await supabase.from('quiz_questions').update({
            stem: q.stem,
            options: q.options,
            correct_key: q.correctKey,
            explanation: q.explanation,
          }).eq('id', q.id);
        }

        await fanOutNotification(
          supabase,
          '📝 New Quiz Available!',
          `The quiz "${reviewData.title}" (${reviewData.subject}) is now live. Test yourself!`,
          '📝',
        );

      } else if (reviewData._type === 'video') {
        const { error } = await supabase
          .from('video_lectures')
          .update({
            title: reviewData.title,
            subject: reviewData.subject,
            description: reviewData.description,
            video_url: reviewData.video_url,
            thumbnail_url: reviewData.thumbnail_url,
            duration_sec: reviewData.duration_sec,
            status: 'approved',
            approved_by: approvedBy,
          })
          .eq('id', reviewData.id);
        if (error) throw error;

        await fanOutNotification(
          supabase,
          '🎥 New Video Lecture!',
          `"${reviewData.title}" on ${reviewData.subject} is now available in the Learn Hub.`,
          '🎥',
        );

      } else if (reviewData._type === 'flashcard') {
        const { error: dErr } = await supabase
          .from('flashcard_decks')
          .update({
            title: reviewData.title,
            subject: reviewData.subject,
            description: reviewData.description,
            status: 'approved',
            approved_by: approvedBy,
          })
          .eq('id', reviewData.id);
        if (dErr) throw dErr;

        // Save edited cards
        for (const c of reviewData.cards) {
          await supabase.from('flashcards').update({ front: c.front, back: c.back }).eq('id', c.id);
        }

        await fanOutNotification(
          supabase,
          '🃏 New Flashcard Deck!',
          `"${reviewData.title}" (${reviewData.subject}) is now available. Start studying!`,
          '🃏',
        );
      }

      setItems(prev => prev.filter(i => i.id !== reviewData.id));
      addToast('success', `"${reviewData.title}" approved and doctors notified!`);
      closeModal();
    } catch (e) {
      addToast('error', 'Approve failed: ' + e.message);
    } finally {
      setApproving(false);
    }
  };

  // ── Reject ───────────────────────────────────────────────────
  const handleReject = async () => {
    if (!reviewData) return;
    setRejecting(true);
    const tbl = reviewData._type === 'quiz' ? 'quizzes'
              : reviewData._type === 'video' ? 'video_lectures'
              : 'flashcard_decks';
    try {
      const { error } = await supabase
        .from(tbl)
        .update({ status: 'rejected', rejection_note: rejectNote.trim() || null })
        .eq('id', reviewData.id);
      if (error) throw error;
      setItems(prev => prev.filter(i => i.id !== reviewData.id));
      addToast('success', `"${reviewData.title}" rejected.`);
      closeModal();
    } catch (e) {
      addToast('error', 'Reject failed: ' + e.message);
    } finally {
      setRejecting(false);
    }
  };

  // ── Render ───────────────────────────────────────────────────
  return (
    <div>
      <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 16 }}>
        Content Approvals Queue ({items.length} pending)
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
          <div style={{ width: 24, height: 24, borderRadius: '50%', border: '3px solid #E5E7EB', borderTopColor: '#2563EB', animation: 'spin 0.8s linear infinite' }} />
        </div>
      ) : items.length === 0 ? (
        <div className="empty">
          <div className="empty-ic">✅</div>
          <div className="empty-t">All clear!</div>
          <div className="empty-s">No content pending review.</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {items.map(item => (
            <div key={item.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: 14 }}>
              <div style={{ fontSize: 28, flexShrink: 0 }}>{item._icon}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{item.title}</div>
                <div style={{ fontSize: 12, color: '#6B7280' }}>
                  <span style={{ padding: '2px 8px', borderRadius: 10, background: '#F3F4F6', fontSize: 11, fontWeight: 600, marginRight: 6 }}>{item._typeLabel}</span>
                  {item.subject} · {new Date(item.created_at).toLocaleDateString('en-IN')}
                </div>
              </div>
              <button className="btn btn-p btn-sm" onClick={() => openReview(item)} style={{ flexShrink: 0 }}>
                🔍 Review
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ── REVIEW / EDIT MODAL ─────────────────────────────── */}
      {reviewItem && (
        <div className="overlay" onClick={closeModal}>
          <div
            className="modal"
            onClick={e => e.stopPropagation()}
            style={{ maxWidth: 680, maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
          >
            <div className="mh">
              <div className="mt">{reviewItem._icon} Review & Edit — {reviewItem._typeLabel}</div>
              <button className="mc" onClick={closeModal}>×</button>
            </div>

            {reviewLoading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', border: '3px solid #E5E7EB', borderTopColor: '#2563EB', animation: 'spin 0.8s linear infinite' }} />
              </div>
            ) : reviewData && (
              <div className="mb" style={{ flex: 1, overflowY: 'auto' }}>

                {/* Common header fields */}
                <div className="fg">
                  <label className="fl">Title <span className="req">*</span></label>
                  <input className="fi-in" value={reviewData.title}
                    onChange={e => patchReview({ title: e.target.value })} />
                </div>
                <div className="fg">
                  <label className="fl">Subject</label>
                  <input className="fi-in" value={reviewData.subject || ''}
                    onChange={e => patchReview({ subject: e.target.value })} />
                </div>
                <div className="fg">
                  <label className="fl">Description</label>
                  <textarea className="fi-ta" rows={2} value={reviewData.description || ''}
                    onChange={e => patchReview({ description: e.target.value })} />
                </div>

                {/* ── QUIZ: questions ── */}
                {reviewData._type === 'quiz' && reviewData.questions?.length > 0 && (
                  <div>
                    <div style={{ fontWeight: 700, margin: '16px 0 10px', borderTop: '1px solid #E5E7EB', paddingTop: 14 }}>
                      Questions ({reviewData.questions.length})
                    </div>
                    {reviewData.questions.map((q, qi) => (
                      <div key={q.id || qi} style={{ background: '#F9FAFB', borderRadius: 10, padding: 14, marginBottom: 12, border: '1px solid #E5E7EB' }}>
                        <div style={{ fontWeight: 600, color: '#6B7280', fontSize: 12, marginBottom: 6 }}>Q{qi + 1}</div>
                        <div className="fg" style={{ margin: '0 0 10px' }}>
                          <label className="fl">Question stem</label>
                          <textarea className="fi-ta" rows={2} value={q.stem}
                            onChange={e => patchQuestion(qi, { stem: e.target.value })} />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
                          {q.options.map(opt => (
                            <div key={opt.label} className="fg" style={{ margin: 0 }}>
                              <label className="fl" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <input type="radio" name={`correct-${qi}`} value={opt.label} checked={q.correctKey === opt.label}
                                  onChange={() => patchQuestion(qi, { correctKey: opt.label })} />
                                {opt.label}
                              </label>
                              <input className="fi-in" value={opt.text}
                                onChange={e => patchOption(qi, opt.label, e.target.value)} />
                            </div>
                          ))}
                        </div>
                        <div className="fg" style={{ margin: 0 }}>
                          <label className="fl">Explanation</label>
                          <input className="fi-in" value={q.explanation}
                            onChange={e => patchQuestion(qi, { explanation: e.target.value })} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* ── VIDEO: URL fields ── */}
                {reviewData._type === 'video' && (
                  <>
                    <div className="fg">
                      <label className="fl">Video URL</label>
                      <input className="fi-in" type="url" value={reviewData.video_url || ''}
                        onChange={e => patchReview({ video_url: e.target.value })} />
                    </div>
                    <div className="fg">
                      <label className="fl">Thumbnail URL</label>
                      <input className="fi-in" type="url" value={reviewData.thumbnail_url || ''}
                        onChange={e => patchReview({ thumbnail_url: e.target.value })} />
                    </div>
                    <div className="fg">
                      <label className="fl">Duration (seconds)</label>
                      <input className="fi-in" type="number" value={reviewData.duration_sec || ''}
                        onChange={e => patchReview({ duration_sec: Number(e.target.value) || null })} style={{ width: 120 }} />
                    </div>
                  </>
                )}

                {/* ── FLASHCARD: cards ── */}
                {reviewData._type === 'flashcard' && reviewData.cards?.length > 0 && (
                  <div>
                    <div style={{ fontWeight: 700, margin: '16px 0 10px', borderTop: '1px solid #E5E7EB', paddingTop: 14 }}>
                      Cards ({reviewData.cards.length})
                    </div>
                    {reviewData.cards.map((c, ci) => (
                      <div key={c.id || ci} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10, background: '#F9FAFB', borderRadius: 10, padding: 12, border: '1px solid #E5E7EB' }}>
                        <div className="fg" style={{ margin: 0 }}>
                          <label className="fl">Card {ci + 1} Front</label>
                          <textarea className="fi-ta" rows={2} value={c.front}
                            onChange={e => patchCard(ci, 'front', e.target.value)} />
                        </div>
                        <div className="fg" style={{ margin: 0 }}>
                          <label className="fl">Card {ci + 1} Back</label>
                          <textarea className="fi-ta" rows={2} value={c.back}
                            onChange={e => patchCard(ci, 'back', e.target.value)} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Reject form */}
                {showRejectForm && (
                  <div style={{ marginTop: 16, padding: 14, background: '#FEF2F2', borderRadius: 10, border: '1px solid #FECACA' }}>
                    <div style={{ fontWeight: 600, color: '#DC2626', marginBottom: 8 }}>Rejection Note</div>
                    <textarea className="fi-ta" rows={3} value={rejectNote}
                      onChange={e => setRejectNote(e.target.value)}
                      placeholder="Explain why this is being rejected (visible to the Content Admin)…" />
                  </div>
                )}
              </div>
            )}

            <div className="mf" style={{ borderTop: '1px solid #E5E7EB' }}>
              {!showRejectForm ? (
                <>
                  <button className="btn btn-p btn-sm" onClick={handleApprove} disabled={approving || reviewLoading}>
                    {approving ? 'Approving…' : '✅ Approve & Notify Doctors'}
                  </button>
                  <button className="btn btn-d btn-sm" onClick={() => setShowRejectForm(true)} disabled={approving}>
                    ✗ Reject
                  </button>
                  <button className="btn btn-s btn-sm" onClick={closeModal}>Cancel</button>
                </>
              ) : (
                <>
                  <button className="btn btn-d btn-sm" onClick={handleReject} disabled={rejecting}>
                    {rejecting ? 'Rejecting…' : 'Confirm Reject'}
                  </button>
                  <button className="btn btn-s btn-sm" onClick={() => setShowRejectForm(false)}>Back</button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
