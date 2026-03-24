import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { trackActivity, startTimer, stopTimer } from '../lib/trackActivity';
import { explainQuestion } from '../lib/aiService';
import { captureException } from '../lib/sentry';
import AIResponseBox from './AIResponseBox';

const OPTS = ['A', 'B', 'C', 'D'];

export default function ExamPage({ addToast }) {
  const [subjects, setSubjects] = useState([]);
  const [subjectsLoading, setSubjectsLoading] = useState(true);
  const [selected, setSelected] = useState(null);   // selected subject
  const [questions, setQuestions] = useState([]);
  const [loadingQ, setLoadingQ] = useState(false);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState({});        // { questionId: 'A'|'B'|'C'|'D' }
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [score, setScore] = useState(null);
  const [aiExplains, setAiExplains] = useState({}); // { [qId]: { loading, text, error } }

  useEffect(() => {
    supabase.from('exam_subjects').select('*').order('id')
      .then(({ data }) => { setSubjects(data || []); })
      .catch(() => { setSubjects([]); })
      .finally(() => setSubjectsLoading(false));
  }, []);

  const startExam = useCallback(async (subj) => {
    setSelected(subj);
    startTimer('exam_attempt', subj.id);
    setLoadingQ(true);
    setCurrent(0);
    setAnswers({});
    setSubmitted(false);
    setScore(null);
    try {
      const { data, error } = await supabase
        .from('exam_questions')
        .select('*')
        .eq('subject_id', subj.id)
        .limit(20);
      if (error) throw error;
      setQuestions(data || []);
    } catch (_) {
      setQuestions([]);
      addToast('error', 'Could not load questions. Please check your connection.');
    } finally {
      setLoadingQ(false);
    }
  }, [addToast]);

  const handleAnswer = (qid, opt) => {
    if (submitted) return;
    setAnswers(prev => ({ ...prev, [qid]: opt }));
  };

  const handleSubmit = async () => {
    if (submitting || submitted) return;
    setSubmitting(true);
    try {
      // Server-side scoring — no client-side score calculation
      const { data, error } = await supabase.functions.invoke('submit-exam', {
        body: {
          subject_id: selected.id,
          answers,  // { [questionId]: 'A'|'B'|'C'|'D' }
          idempotency_key: crypto.randomUUID(),
        }
      });
      if (error) throw error;

      if (data.isDuplicate) {
        addToast('info', 'Exam already submitted.');
        setSubmitted(true);
        return;
      }

      // Display server-authoritative results
      setScore({ correct: data.score, total: data.total });
      setSubmitted(true);

      // Track activity with duration
      const examDuration = stopTimer('exam_attempt', selected.id);
      await trackActivity(data.passed ? 'quiz_passed' : 'quiz_attempted', `exam_${selected.id}`, examDuration);
      await trackActivity('exam_set_completed', `exam_${selected.id}`, examDuration);

      // Auto-create spaced repetition cards for wrong answers (not handled by edge function)
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const wrongQs = questions.filter(q => answers[q.id] && answers[q.id] !== q.correct);
          if (wrongQs.length > 0) {
            const today = new Date().toISOString().slice(0, 10);
            const srCards = wrongQs.map(q => ({
              user_id: user.id,
              front: q.question,
              back: `Correct: ${q.correct}. ${q[`option_${q.correct.toLowerCase()}`] || ''}${q.explanation ? ' — ' + q.explanation : ''}`,
              subject: selected.name,
              difficulty: q.difficulty || 'medium',
              source_question_id: q.id,
              easiness: 2.5,
              interval: 0,
              repetitions: 0,
              next_review_at: today,
            }));
            await supabase.from('spaced_repetition_cards')
              .upsert(srCards, { onConflict: 'user_id,source_question_id', ignoreDuplicates: true });
          }
        }
      } catch (srErr) {
        // SR card creation is non-critical — log but don't block the result display
        captureException(srErr);
      }
    } catch (err) {
      captureException(err);
      addToast('error', 'Failed to submit exam. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAIExplain = async (rq) => {
    const qid = rq.id;
    setAiExplains(prev => ({ ...prev, [qid]: { loading: true, text: null, error: null } }));
    const rOpts = [{ k: 'A', v: rq.option_a }, { k: 'B', v: rq.option_b }, { k: 'C', v: rq.option_c }, { k: 'D', v: rq.option_d }];
    const { text, error } = await explainQuestion(rq.question, rOpts, rq.correct, rq.explanation);
    setAiExplains(prev => ({ ...prev, [qid]: { loading: false, text, error } }));
  };

  // ── Subject grid ────────────────────────────────────────────
  if (!selected) return (
    <div className="page">
      <div className="ph">
        <div className="pt">📝 NEET-PG Exam Prep</div>
        <div className="ps">Practice MCQs organised by subject — track your score and improve</div>
      </div>
      {subjectsLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', border: '3px solid #E5E7EB', borderTopColor: '#4F46E5', animation: 'spin 0.8s linear infinite' }} />
        </div>
      ) : subjects.length === 0 ? (
        <div className="empty">
          <div className="empty-ic">📭</div>
          <div className="empty-t">No exam subjects available yet</div>
          <div className="empty-s">Check back soon — subjects will appear once the admin adds them.</div>
        </div>
      ) : (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 16 }}>
        {subjects.map(s => (
          <div
            key={s.id}
            onClick={() => startExam(s)}
            style={{
              background: '#fff', borderRadius: 16, padding: '24px 20px', textAlign: 'center',
              border: '1px solid #E5E7EB', cursor: 'pointer',
              boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
              transition: 'box-shadow .15s, transform .15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 6px 20px rgba(79,70,229,0.12)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
            onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.04)'; e.currentTarget.style.transform = ''; }}
          >
            <div style={{ fontSize: 40, marginBottom: 10 }}>{s.icon}</div>
            <div style={{ fontWeight: 700, fontSize: 13, color: '#111827', marginBottom: 4 }}>{s.name}</div>
            <div style={{ fontSize: 11, color: '#9CA3AF' }}>{s.question_count || '—'} questions</div>
          </div>
        ))}
      </div>
      )}
    </div>
  );

  // ── Loading ──────────────────────────────────────────────────
  if (loadingQ) return (
    <div className="page">
      <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
        <div style={{ width: 36, height: 36, borderRadius: '50%', border: '3px solid #E5E7EB', borderTopColor: '#4F46E5', animation: 'spin 0.8s linear infinite' }} />
      </div>
    </div>
  );

  // ── No questions ─────────────────────────────────────────────
  if (!questions.length) return (
    <div className="page">
      <button className="btn btn-s" onClick={() => setSelected(null)} style={{ marginBottom: 16 }}>← Back</button>
      <div className="empty">
        <div className="empty-ic">📭</div>
        <div className="empty-t">No questions yet for {selected.name}</div>
        <div className="empty-s">Questions will appear after the database migration is applied.</div>
      </div>
    </div>
  );

  const q = questions[current];
  const opts = [
    { k: 'A', v: q.option_a },
    { k: 'B', v: q.option_b },
    { k: 'C', v: q.option_c },
    { k: 'D', v: q.option_d },
  ];
  const userAns = answers[q.id];

  // ── Results screen ────────────────────────────────────────────
  if (submitted && score) return (
    <div className="page">
      <div style={{ maxWidth: 600, margin: '0 auto' }}>
        <div style={{
          background: score.correct / score.total >= 0.7
            ? 'linear-gradient(135deg,#10B981,#059669)'
            : score.correct / score.total >= 0.5
              ? 'linear-gradient(135deg,#F59E0B,#D97706)'
              : 'linear-gradient(135deg,#EF4444,#DC2626)',
          borderRadius: 20, padding: '32px 40px', textAlign: 'center', color: '#fff', marginBottom: 24,
        }}>
          <div style={{ fontSize: 56, marginBottom: 4 }}>
            {score.correct / score.total >= 0.7 ? '🏆' : score.correct / score.total >= 0.5 ? '📊' : '📖'}
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>
            {score.correct} / {score.total} Correct
          </div>
          <div style={{ fontSize: 14, opacity: 0.85 }}>
            {Math.round((score.correct / score.total) * 100)}% — {selected.name}
          </div>
        </div>

        <div style={{ fontWeight: 700, fontSize: 14, color: '#374151', marginBottom: 12 }}>Review Answers</div>
        {questions.map((rq, idx) => {
          const ua = answers[rq.id];
          const correct = ua === rq.correct;
          const rOpts = [{ k: 'A', v: rq.option_a }, { k: 'B', v: rq.option_b }, { k: 'C', v: rq.option_c }, { k: 'D', v: rq.option_d }];
          return (
            <div key={rq.id} style={{ background: '#fff', borderRadius: 12, padding: 18, marginBottom: 12, border: `1px solid ${correct ? '#BBF7D0' : '#FECACA'}` }}>
              <div style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 6 }}>Q{idx + 1} · {rq.difficulty?.toUpperCase()}</div>
              <div style={{ fontWeight: 600, fontSize: 14, color: '#111827', marginBottom: 10 }}>{rq.question}</div>
              {rOpts.map(o => (
                <div key={o.k} style={{
                  padding: '6px 10px', borderRadius: 8, marginBottom: 4, fontSize: 13,
                  background: o.k === rq.correct ? '#DCFCE7'
                    : o.k === ua && !correct ? '#FEE2E2' : '#F9FAFB',
                  color: o.k === rq.correct ? '#15803D'
                    : o.k === ua && !correct ? '#DC2626' : '#374151',
                  fontWeight: o.k === rq.correct ? 600 : 400,
                }}>
                  {o.k}. {o.v} {o.k === rq.correct ? '✓' : o.k === ua && !correct ? '✗' : ''}
                </div>
              ))}
              {rq.explanation && (
                <div style={{ marginTop: 8, fontSize: 12, color: '#1D4ED8', background: '#EFF6FF', borderRadius: 8, padding: '8px 10px' }}>
                  💡 {rq.explanation}
                </div>
              )}
              {/* AI Explain button */}
              {!aiExplains[rq.id]?.text && !aiExplains[rq.id]?.loading && (
                <button
                  onClick={() => handleAIExplain(rq)}
                  style={{
                    marginTop: 10, padding: '5px 12px',
                    background: 'linear-gradient(135deg,#EDE9FE,#EFF6FF)',
                    border: '1px solid #C4B5FD', borderRadius: 8,
                    fontSize: 12, fontWeight: 600, color: '#6D28D9',
                    cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5,
                  }}
                >
                  ✨ Explain with AI
                </button>
              )}
              <AIResponseBox
                loading={aiExplains[rq.id]?.loading}
                error={aiExplains[rq.id]?.error}
                text={aiExplains[rq.id]?.text}
                label="AI Explanation"
                onRetry={() => handleAIExplain(rq)}
              />
            </div>
          );
        })}

        <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
          <button className="btn btn-s" style={{ flex: 1 }} onClick={() => setSelected(null)}>← All Subjects</button>
          <button className="btn btn-p" style={{ flex: 1 }} onClick={() => startExam(selected)}>🔄 Retake</button>
        </div>
      </div>
    </div>
  );

  // ── MCQ interface ─────────────────────────────────────────────
  const pct = Math.round(((current + 1) / questions.length) * 100);
  return (
    <div className="page">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <button className="btn btn-s btn-sm" onClick={() => setSelected(null)}>← Exit</button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 4 }}>
            {selected.icon} {selected.name} — Q{current + 1} of {questions.length}
          </div>
          <div style={{ height: 6, background: '#E5E7EB', borderRadius: 99, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${pct}%`, background: 'linear-gradient(90deg,#4F46E5,#7C3AED)', borderRadius: 99, transition: 'width .3s' }} />
          </div>
        </div>
        <div style={{ fontSize: 12, color: '#9CA3AF', minWidth: 40, textAlign: 'right' }}>{pct}%</div>
      </div>

      <div style={{ maxWidth: 680 }}>
        <div style={{ background: '#fff', borderRadius: 16, padding: '24px 28px', marginBottom: 16, border: '1px solid #E5E7EB' }}>
          <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
            <span style={{ background: '#EFF6FF', color: '#1D4ED8', borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 700 }}>{q.source || 'NEET-PG'}</span>
            <span style={{ background: '#F3F4F6', color: '#6B7280', borderRadius: 6, padding: '2px 8px', fontSize: 11 }}>{q.difficulty?.toUpperCase()}</span>
          </div>
          <div style={{ fontWeight: 600, fontSize: 15, color: '#111827', lineHeight: 1.6 }}>{q.question}</div>
        </div>

        {opts.map(o => {
          const picked = userAns === o.k;
          return (
            <div
              key={o.k}
              onClick={() => handleAnswer(q.id, o.k)}
              style={{
                background: picked ? 'linear-gradient(135deg,#EFF6FF,#EDE9FE)' : '#fff',
                border: `2px solid ${picked ? '#4F46E5' : '#E5E7EB'}`,
                borderRadius: 12, padding: '14px 18px', marginBottom: 10,
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12,
                transition: 'all .15s',
              }}
            >
              <div style={{
                width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                background: picked ? '#4F46E5' : '#F3F4F6',
                color: picked ? '#fff' : '#6B7280',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 700, fontSize: 13,
              }}>
                {o.k}
              </div>
              <span style={{ fontSize: 14, color: '#111827', fontWeight: picked ? 600 : 400 }}>{o.v}</span>
            </div>
          );
        })}

        <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
          <button className="btn btn-s" disabled={current <= 0} onClick={() => setCurrent(c => c - 1)} style={{ flex: 1 }}>← Prev</button>
          {current < questions.length - 1 ? (
            <button className="btn btn-p" onClick={() => setCurrent(c => c + 1)} style={{ flex: 1 }}>Next →</button>
          ) : (
            <button
              className="btn btn-p"
              onClick={handleSubmit}
              disabled={submitting}
              style={{ flex: 1, background: submitting ? '#9CA3AF' : 'linear-gradient(135deg,#10B981,#059669)', cursor: submitting ? 'not-allowed' : 'pointer' }}
            >
              {submitting ? 'Submitting…' : 'Submit Exam ✓'}
            </button>
          )}
        </div>
        <div style={{ textAlign: 'center', fontSize: 12, color: '#9CA3AF', marginTop: 10 }}>
          {Object.keys(answers).length} of {questions.length} answered
        </div>
      </div>
    </div>
  );
}
