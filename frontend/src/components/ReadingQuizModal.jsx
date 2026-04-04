import { useState, useEffect } from 'react';
import { generateReadingQuiz } from '../lib/aiService';
import { supabase } from '../lib/supabase';
import { trackActivity } from '../lib/trackActivity';
import { Z } from '../styles/zIndex';
import { useAuth } from '../context/AuthContext';

/**
 * ReadingQuizModal — Proof of Learning
 * Shown when a doctor clicks "Mark as Completed" on a book.
 * 3 AI-generated MCQs → score → save to reading_progress → award points.
 */
export default function ReadingQuizModal({ artifact, onClose, onComplete }) {
  const { user } = useAuth();
  const [phase, setPhase] = useState('loading'); // loading | quiz | result | error
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({}); // { [index]: 'A'|'B'|'C'|'D' }
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const { questions: qs, error } = await generateReadingQuiz(
        artifact.title,
        artifact.subject,
      );
      if (cancelled) return;
      if (error || !qs) {
        setErrorMsg(error || 'Quiz generation failed.');
        setPhase('error');
      } else {
        setQuestions(qs);
        setPhase('quiz');
      }
    }
    load();
    return () => { cancelled = true; };
  }, [artifact]);

  const handleSubmit = async () => {
    let correct = 0;
    questions.forEach((q, i) => {
      if (answers[i] === q.answer) correct++;
    });
    const total = questions.length;
    const pts = correct * 10;
    setScore(correct);
    setSubmitted(true);
    setPhase('result');

    // Save to reading_progress and award points
    setSaving(true);
    try {
      if (user?.id) {
        await supabase.from('reading_progress').upsert([{
          user_id: user.id,
          artifact_id: artifact.id,
          subject: artifact.subject,
          quiz_score: correct,
          quiz_total: total,
          points_awarded: pts,
          completed_at: new Date().toISOString(),
        }], { onConflict: 'user_id,artifact_id' });

        if (pts > 0) {
          await trackActivity('quiz_complete', artifact.id);
        }

        // Award points via user_scores upsert
        if (pts > 0) {
          await supabase.rpc('increment_user_score', { p_user_id: user.id, p_points: pts }).catch(() => {});
        }
      }
    } catch (e) { console.warn('ReadingQuizModal: failed to save reading progress:', e.message); }
    setSaving(false);

    if (onComplete) onComplete({ score: correct, total, pts });
  };

  const allAnswered = questions.length > 0 && Object.keys(answers).length === questions.length;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: Z.readingModal,
      background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 16, fontFamily: 'Inter, sans-serif',
    }}>
      <div style={{
        background: '#fff', borderRadius: 20, width: '100%', maxWidth: 520,
        maxHeight: '90vh', overflowY: 'auto',
        boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
      }}>
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg,#1E1B4B,#3730A3)',
          borderRadius: '20px 20px 0 0', padding: '18px 22px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ color: '#fff', fontWeight: 800, fontSize: 15 }}>
              ✅ Proof of Learning
            </div>
            <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, marginTop: 2 }}>
              {artifact.emoji} {artifact.title} · {artifact.subject}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', fontSize: 13 }}
          >
            ✕ Close
          </button>
        </div>

        <div style={{ padding: '20px 22px' }}>

          {/* Loading */}
          {phase === 'loading' && (
            <div style={{ textAlign: 'center', padding: '32px 0' }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>🧠</div>
              <div style={{ fontWeight: 700, fontSize: 15, color: '#1E1B4B' }}>
                Generating your quiz…
              </div>
              <div style={{ fontSize: 13, color: '#6B7280', marginTop: 6 }}>
                AI is crafting 3 NEET-PG MCQs based on this book
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 20 }}>
                {[70, 50, 60].map((w, i) => (
                  <div key={i} className="animate-pulse" style={{
                    height: 10, borderRadius: 99, background: '#E5E7EB', width: `${w}%`, margin: '0 auto',
                  }} />
                ))}
              </div>
            </div>
          )}

          {/* Error */}
          {phase === 'error' && (
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>⚠️</div>
              <div style={{ fontWeight: 700, fontSize: 14, color: '#DC2626' }}>Quiz generation failed</div>
              <div style={{ fontSize: 13, color: '#6B7280', marginTop: 6 }}>{errorMsg}</div>
              <button
                onClick={onClose}
                style={{ marginTop: 16, padding: '8px 20px', background: '#4F46E5', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer' }}
              >
                Close
              </button>
            </div>
          )}

          {/* Quiz */}
          {phase === 'quiz' && (
            <>
              <div style={{ fontSize: 13, color: '#6B7280', marginBottom: 16 }}>
                Answer all 3 questions to mark this book as completed and earn points.
              </div>
              {questions.map((q, i) => (
                <div key={i} style={{
                  marginBottom: 20, padding: '14px 16px',
                  background: '#F9FAFB', borderRadius: 12,
                  border: '1.5px solid #E5E7EB',
                }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: '#1E1B4B', marginBottom: 10 }}>
                    Q{i + 1}. {q.q}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {q.options.map(opt => {
                      const selected = answers[i] === opt.k;
                      return (
                        <button
                          key={opt.k}
                          onClick={() => setAnswers(prev => ({ ...prev, [i]: opt.k }))}
                          style={{
                            textAlign: 'left', padding: '9px 14px', borderRadius: 9,
                            border: selected ? '2px solid #4F46E5' : '1.5px solid #E5E7EB',
                            background: selected ? '#EEF2FF' : '#fff',
                            color: selected ? '#3730A3' : '#374151',
                            fontWeight: selected ? 700 : 400,
                            fontSize: 13, cursor: 'pointer', transition: 'all .12s',
                          }}
                        >
                          <span style={{ fontWeight: 700, marginRight: 8 }}>{opt.k}.</span>
                          {opt.v}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
              <button
                onClick={handleSubmit}
                disabled={!allAnswered || saving}
                style={{
                  width: '100%', padding: '11px', borderRadius: 10, border: 'none',
                  background: allAnswered ? 'linear-gradient(135deg,#4F46E5,#7C3AED)' : '#E5E7EB',
                  color: allAnswered ? '#fff' : '#9CA3AF',
                  fontWeight: 700, fontSize: 14, cursor: allAnswered ? 'pointer' : 'not-allowed',
                }}
              >
                Submit Answers →
              </button>
            </>
          )}

          {/* Result */}
          {phase === 'result' && (
            <div style={{ textAlign: 'center', padding: '8px 0 16px' }}>
              <div style={{ fontSize: 48, marginBottom: 8 }}>
                {score === questions.length ? '🏆' : score >= 2 ? '🎉' : '📚'}
              </div>
              <div style={{ fontWeight: 800, fontSize: 18, color: '#1E1B4B' }}>
                {score}/{questions.length} correct
              </div>
              <div style={{ fontSize: 13, color: '#6B7280', marginTop: 4 }}>
                {score * 10} points awarded
              </div>
              {saving && (
                <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 8 }}>Saving progress…</div>
              )}

              {/* Review */}
              <div style={{ marginTop: 20, textAlign: 'left' }}>
                {questions.map((q, i) => {
                  const isCorrect = answers[i] === q.answer;
                  return (
                    <div key={i} style={{
                      marginBottom: 14, padding: '12px 14px',
                      background: isCorrect ? '#F0FDF4' : '#FEF2F2',
                      borderRadius: 10, border: `1.5px solid ${isCorrect ? '#BBF7D0' : '#FECACA'}`,
                    }}>
                      <div style={{ fontWeight: 700, fontSize: 13, color: '#111' }}>
                        {isCorrect ? '✅' : '❌'} Q{i + 1}. {q.q}
                      </div>
                      <div style={{ fontSize: 12, color: '#374151', marginTop: 4 }}>
                        Your answer: <strong>{answers[i]}</strong> · Correct: <strong>{q.answer}</strong>
                      </div>
                      {!isCorrect && q.explanation && (
                        <div style={{ fontSize: 12, color: '#6B7280', marginTop: 6, lineHeight: 1.5 }}>
                          💡 {q.explanation}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <button
                onClick={onClose}
                style={{
                  marginTop: 8, padding: '10px 28px', borderRadius: 10, border: 'none',
                  background: 'linear-gradient(135deg,#4F46E5,#7C3AED)',
                  color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer',
                }}
              >
                Done ✓
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
