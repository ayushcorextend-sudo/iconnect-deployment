import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { idempotentInsert } from '../../lib/idempotency';
import { trackActivity, startTimer, stopTimer } from '../../lib/trackActivity';
import { QuizQuestionSchema } from '../../schemas/question';

export default function QuizPlayer({ quizId, userId, addToast, onBack }) {
  const [quiz, setQuiz]           = useState(null);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [phase, setPhase]         = useState('intro');   // 'intro' | 'playing' | 'review'

  // Playing state
  const [current, setCurrent]   = useState(0);
  const [answers, setAnswers]   = useState({});    // { questionId: chosenKey }
  const [timeLeft, setTimeLeft] = useState(0);
  const timerRef                = useRef(null);

  // QUIZ-1: ref always holds the latest answers — timer closure reads this, not stale state
  const answersRef  = useRef({});
  // QUIZ-2: track the 350ms auto-advance timeout + mounted state
  const advanceRef  = useRef(null);
  const isMountedRef = useRef(true);

  // Results
  const [score, setScore]     = useState(0);
  const [saving, setSaving]   = useState(false);
  const [startedAt]           = useState(new Date().toISOString());

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (advanceRef.current) clearTimeout(advanceRef.current);
    };
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        // QUIZ-4: .single() throws if quiz not found — caught below and shown as error
        const { data: qz, error: e1 } = await supabase.from('quizzes').select('*').eq('id', quizId).single();
        if (e1) throw e1;
        const { data: qs, error: e2 } = await supabase
          .from('quiz_questions').select('*').eq('quiz_id', quizId).order('sort_order');
        if (e2) throw e2;
        if (!qs || qs.length === 0) throw new Error('This quiz has no questions yet.');
        // BUG-X: filter out malformed questions so they can't crash the renderer.
        // Any question that fails schema validation is skipped with a console warning.
        const validQuestions = qs.filter(q => {
          const result = QuizQuestionSchema.safeParse(q);
          if (!result.success) {
            console.warn('[QuizPlayer] Malformed question skipped:', q.id, result.error.errors[0]?.message);
          }
          return result.success;
        });
        if (validQuestions.length === 0) throw new Error('This quiz has no valid questions. Please report this to your admin.');
        setQuiz(qz);
        setQuestions(validQuestions);
        setTimeLeft(qz.time_limit_sec || 600);
      } catch (e) {
        addToast('error', 'Failed to load quiz: ' + e.message);
        // QUIZ-4: navigate back so user isn't stuck on a broken quiz screen
        if (isMountedRef.current) onBack?.();
      } finally {
        if (isMountedRef.current) setLoading(false);
      }
    })();
  }, [quizId]); // eslint-disable-line react-hooks/exhaustive-deps

  const finish = useCallback(async (finalAnswers) => {
    clearInterval(timerRef.current);

    // QUIZ-3: surface error instead of silent return
    if (!quiz || !questions.length) {
      addToast('error', 'Quiz data could not be loaded. Please try again.');
      onBack?.();
      return;
    }

    const correct = questions.filter(q => finalAnswers[q.id] === q.correct_key).length;
    if (isMountedRef.current) {
      setScore(correct);
      setPhase('review');
    }

    setSaving(true);
    try {
      const { error, isDuplicate } = await idempotentInsert('quiz_attempt', {
        quiz_id: quizId,
        user_id: userId,
        answers: finalAnswers,
        score: correct,
        total: questions.length,
        started_at: startedAt,
        finished_at: new Date().toISOString(),
      }, { table: 'quiz_attempts' });
      if (isDuplicate) { addToast('info', 'Quiz already submitted.'); return; }
      if (error) throw error;
      const duration = stopTimer('quiz_attempt', quizId);
      const pct = Math.round((correct / questions.length) * 100);
      trackActivity('quiz_complete', quizId, duration);
      if (pct >= 60) trackActivity('quiz_passed', quizId);
      else trackActivity('quiz_attempted', quizId);
    } catch (e) {
      addToast('error', 'Could not save attempt: ' + e.message);
    } finally {
      if (isMountedRef.current) setSaving(false);
    }
  }, [quiz, questions, quizId, userId, startedAt, addToast, onBack]);

  // Countdown timer
  useEffect(() => {
    if (phase !== 'playing') return;
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          // QUIZ-1: read from ref — always current, never stale closure
          finish(answersRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [phase, finish]);

  const answer = (key) => {
    const q = questions[current];
    const next = { ...answers, [q.id]: key };
    // QUIZ-1: keep ref in sync with state
    answersRef.current = next;
    setAnswers(next);
    // QUIZ-2: track timeout so it can be cleared on unmount
    if (advanceRef.current) clearTimeout(advanceRef.current);
    advanceRef.current = setTimeout(() => {
      if (!isMountedRef.current) return;
      if (current < questions.length - 1) {
        setCurrent(c => c + 1);
      } else {
        finish(next);
      }
    }, 350);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
        <div style={{ width: 28, height: 28, borderRadius: '50%', border: '3px solid #E5E7EB', borderTopColor: '#2563EB', animation: 'spin 0.8s linear infinite' }} />
      </div>
    );
  }

  if (!quiz) {
    return (
      <div className="empty">
        <div className="empty-ic">❓</div>
        <div className="empty-t">Quiz not found</div>
        <button className="btn btn-s btn-sm" onClick={onBack} style={{ marginTop: 12 }}>Go Back</button>
      </div>
    );
  }

  const fmt = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  const timerColor = timeLeft < 60 ? '#EF4444' : timeLeft < 180 ? '#F59E0B' : '#10B981';

  // ── INTRO ────────────────────────────────────────────────────
  if (phase === 'intro') {
    return (
      <div className="card" style={{ maxWidth: 520, margin: '0 auto', textAlign: 'center', padding: 32 }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>📋</div>
        <div style={{ fontWeight: 800, fontSize: 20, marginBottom: 6 }}>{quiz.title}</div>
        <div style={{ color: '#6B7280', marginBottom: 4 }}>{quiz.subject}</div>
        {quiz.description && <div style={{ fontSize: 13, color: '#9CA3AF', marginBottom: 16 }}>{quiz.description}</div>}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 24, marginBottom: 24, fontSize: 14, color: '#374151' }}>
          <span>📝 {questions.length} questions</span>
          <span>⏱ {Math.floor(quiz.time_limit_sec / 60)} minutes</span>
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          <button className="btn btn-p" onClick={() => { startTimer('quiz_attempt', quizId); setPhase('playing'); }}>Start Quiz</button>
          <button className="btn btn-s" onClick={onBack}>Cancel</button>
        </div>
      </div>
    );
  }

  // ── PLAYING ──────────────────────────────────────────────────
  if (phase === 'playing') {
    const q = questions[current];
    const chosen = answers[q.id];
    return (
      <div style={{ maxWidth: 600, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ fontWeight: 600, color: '#6B7280', fontSize: 13 }}>
            Question {current + 1} / {questions.length}
          </div>
          <div style={{ fontWeight: 700, fontSize: 16, color: timerColor }}>⏱ {fmt(timeLeft)}</div>
        </div>
        {/* Progress bar */}
        <div style={{ height: 4, background: '#E5E7EB', borderRadius: 4, marginBottom: 20 }}>
          <div style={{ height: 4, borderRadius: 4, background: '#4F46E5', width: `${((current + 1) / questions.length) * 100}%`, transition: 'width .3s' }} />
        </div>

        <div className="card" style={{ padding: 24, marginBottom: 16 }}>
          <div style={{ fontWeight: 600, fontSize: 16, lineHeight: 1.5 }}>{q.stem}</div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {q.options.map(opt => (
            <button
              key={opt.label}
              onClick={() => !chosen && answer(opt.label)}
              disabled={!!chosen}
              style={{
                display: 'flex', alignItems: 'center', gap: 14,
                padding: '14px 18px', borderRadius: 10, border: '2px solid',
                cursor: chosen ? 'default' : 'pointer', textAlign: 'left', fontSize: 14,
                background: chosen === opt.label ? '#EFF6FF' : '#fff',
                borderColor: chosen === opt.label ? '#2563EB' : '#E5E7EB',
                fontWeight: chosen === opt.label ? 700 : 400,
                transition: 'all .15s',
              }}
            >
              <span style={{
                width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: chosen === opt.label ? '#2563EB' : '#F3F4F6',
                color: chosen === opt.label ? '#fff' : '#6B7280',
                fontWeight: 700, fontSize: 13,
              }}>
                {opt.label}
              </span>
              {opt.text}
            </button>
          ))}
        </div>

        <div style={{ marginTop: 20, display: 'flex', gap: 10 }}>
          {current < questions.length - 1 ? (
            <button className="btn btn-s btn-sm" onClick={() => setCurrent(c => c + 1)}>Skip →</button>
          ) : (
            // QUIZ-1: use answersRef.current so Submit always has latest answers
            <button className="btn btn-p btn-sm" onClick={() => finish(answersRef.current)}>Submit Quiz</button>
          )}
        </div>
      </div>
    );
  }

  // ── REVIEW ───────────────────────────────────────────────────
  const pct = Math.round((score / questions.length) * 100);
  const pass = pct >= 60;
  return (
    <div style={{ maxWidth: 600, margin: '0 auto' }}>
      <div className="card" style={{ textAlign: 'center', padding: 28, marginBottom: 20 }}>
        <div style={{ fontSize: 48, marginBottom: 8 }}>{pass ? '🎉' : '📚'}</div>
        <div style={{ fontWeight: 800, fontSize: 22, marginBottom: 4 }}>{pass ? 'Well done!' : 'Keep Practising'}</div>
        <div style={{ fontSize: 36, fontWeight: 800, color: pass ? '#10B981' : '#EF4444', marginBottom: 4 }}>
          {score}/{questions.length}
        </div>
        <div style={{ color: '#6B7280', marginBottom: 8 }}>{pct}% correct</div>
        {saving && <div style={{ fontSize: 12, color: '#9CA3AF' }}>Saving result…</div>}
        <button className="btn btn-p" onClick={onBack} style={{ marginTop: 16 }}>Done</button>
      </div>

      <div style={{ fontWeight: 700, marginBottom: 12 }}>Review Answers</div>
      {questions.map((q, i) => {
        const chosen = answers[q.id];
        const correct = q.correct_key;
        const isRight = chosen === correct;
        return (
          <div key={q.id} className="card" style={{ marginBottom: 10, borderLeft: `4px solid ${isRight ? '#10B981' : '#EF4444'}` }}>
            <div style={{ fontWeight: 600, marginBottom: 8, fontSize: 14 }}>{i + 1}. {q.stem}</div>
            {q.options.map(opt => {
              let bg = 'transparent'; let color = '#374151';
              if (opt.label === correct) { bg = '#DCFCE7'; color = '#15803D'; }
              if (opt.label === chosen && !isRight) { bg = '#FEE2E2'; color = '#DC2626'; }
              return (
                <div key={opt.label} style={{ padding: '5px 10px', borderRadius: 6, background: bg, color, fontSize: 13, marginBottom: 3, fontWeight: (opt.label === correct || opt.label === chosen) ? 700 : 400 }}>
                  {opt.label}. {opt.text}
                  {opt.label === correct && ' ✓'}
                  {opt.label === chosen && !isRight && ' ✗'}
                </div>
              );
            })}
            {q.explanation && (
              <div style={{ marginTop: 8, padding: '8px 10px', background: '#EFF6FF', borderRadius: 6, fontSize: 13, color: '#1E40AF' }}>
                💡 {q.explanation}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
