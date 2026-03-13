import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';

const QUESTION_TIMEOUT = 15;  // match student timer
const OPTION_COLORS = { A: '#EF4444', B: '#2563EB', C: '#10B981', D: '#F59E0B' };

export default function LiveArenaHost({ userId, addToast }) {
  const [phase, setPhase]         = useState('setup');  // 'setup' | 'waiting' | 'playing' | 'finished'
  const [quizzes, setQuizzes]     = useState([]);
  const [selectedQuiz, setSelectedQuiz] = useState('');
  const [arena, setArena]         = useState(null);
  const [questions, setQuestions] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [currentQ, setCurrentQ]  = useState(0);
  const [timeLeft, setTimeLeft]  = useState(QUESTION_TIMEOUT);
  const [answers, setAnswers]    = useState([]);   // arena_answers rows for current question
  const [creating, setCreating]  = useState(false);
  const timerRef  = useRef(null);
  const subRef    = useRef(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('quizzes').select('id, title, subject').eq('status', 'approved');
      setQuizzes(data || []);
    })();
    return () => {
      if (subRef.current) supabase.removeChannel(subRef.current);
      clearInterval(timerRef.current);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const generatePin = () => Math.floor(100000 + Math.random() * 900000).toString();

  const createArena = async () => {
    if (!selectedQuiz) { addToast('error', 'Select a quiz first.'); return; }
    if (userId?.startsWith('local_')) { addToast('error', 'Not available in demo mode.'); return; }
    setCreating(true);
    try {
      const { data: qs, error: qsErr } = await supabase
        .from('quiz_questions').select('*').eq('quiz_id', selectedQuiz).order('sort_order');
      if (qsErr) throw qsErr;
      if (!qs?.length) { addToast('error', 'This quiz has no questions.'); return; }

      const { data: ar, error: arErr } = await supabase
        .from('live_arenas')
        .insert({ quiz_id: selectedQuiz, host_id: userId, pin: generatePin(), status: 'waiting', current_q: 0 })
        .select().single();
      if (arErr) throw arErr;

      setArena(ar);
      setQuestions(qs);
      setPhase('waiting');
      subscribeToArena(ar.id, qs);
    } catch (e) {
      addToast('error', 'Could not create arena: ' + e.message);
    } finally {
      setCreating(false);
    }
  };

  const subscribeToArena = (arenaId, qs) => {
    subRef.current = supabase
      .channel('arena-host-' + arenaId)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'arena_participants', filter: `arena_id=eq.${arenaId}` },
        () => loadParticipants(arenaId))
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'arena_answers', filter: `arena_id=eq.${arenaId}` },
        (payload) => {
          setAnswers(prev => [...prev, payload.new]);
        })
      .subscribe();
  };

  const loadParticipants = async (arenaId) => {
    const { data } = await supabase.from('arena_participants').select('*').eq('arena_id', arenaId).order('score', { ascending: false });
    setParticipants(data || []);
  };

  const reloadParticipants = async (arenaId) => {
    const { data } = await supabase.from('arena_participants').select('*').eq('arena_id', arenaId).order('score', { ascending: false });
    setParticipants(data || []);
  };

  const startGame = async () => {
    if (!arena || participants.length === 0) { addToast('error', 'Wait for at least 1 participant.'); return; }
    const { error } = await supabase.from('live_arenas').update({ status: 'active', current_q: 0, question_started_at: new Date().toISOString() }).eq('id', arena.id);
    if (error) { addToast('error', error.message); return; }
    setArena(prev => ({ ...prev, status: 'active', current_q: 0 }));
    setCurrentQ(0);
    setAnswers([]);
    setPhase('playing');
    startTimer();
  };

  const startTimer = () => {
    clearInterval(timerRef.current);
    setTimeLeft(QUESTION_TIMEOUT);
    let remaining = QUESTION_TIMEOUT;
    timerRef.current = setInterval(() => {
      remaining -= 1;
      setTimeLeft(remaining);
      if (remaining <= 0) clearInterval(timerRef.current);
    }, 1000);
  };

  const nextQuestion = async () => {
    clearInterval(timerRef.current);
    await reloadParticipants(arena.id);

    if (currentQ >= questions.length - 1) {
      await supabase.from('live_arenas').update({ status: 'finished' }).eq('id', arena.id);
      setPhase('finished');
      return;
    }
    const nextQ = currentQ + 1;
    setCurrentQ(nextQ);
    setAnswers([]);
    await supabase.from('live_arenas').update({ current_q: nextQ, question_started_at: new Date().toISOString() }).eq('id', arena.id);
    startTimer();
  };

  const endArena = async () => {
    clearInterval(timerRef.current);
    if (arena) await supabase.from('live_arenas').update({ status: 'finished' }).eq('id', arena.id);
    if (arena) await reloadParticipants(arena.id);
    setPhase('finished');
  };

  // ── BUILD ANSWER BAR CHART DATA ───────────────────────────────
  const buildBarData = (currentQuestionIdx) => {
    const q = questions[currentQuestionIdx];
    if (!q) return [];
    const opts = q.options || [];
    const qAnswers = answers.filter(a => a.question_id === q.id);
    return opts.map(opt => {
      const count = qAnswers.filter(a => a.chosen_key === opt.label).length;
      const pct = qAnswers.length > 0 ? Math.round((count / qAnswers.length) * 100) : 0;
      return { label: opt.label, text: opt.text, count, pct, isCorrect: opt.label === q.correct_key };
    });
  };

  // ── SETUP ────────────────────────────────────────────────────
  if (phase === 'setup') {
    return (
      <div>
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 16 }}>🏟️ Host a Live Arena</div>
        <div className="card" style={{ maxWidth: 480 }}>
          <div className="fg">
            <label className="fl">Select Approved Quiz</label>
            <select className="fi-sel" value={selectedQuiz} onChange={e => setSelectedQuiz(e.target.value)}>
              <option value="">Choose a quiz…</option>
              {quizzes.map(q => <option key={q.id} value={q.id}>{q.title} — {q.subject}</option>)}
            </select>
          </div>
          <button className="btn btn-p" onClick={createArena} disabled={creating || !selectedQuiz}>
            {creating ? 'Creating…' : 'Create Arena & Get PIN'}
          </button>
        </div>
      </div>
    );
  }

  // ── WAITING ROOM ─────────────────────────────────────────────
  if (phase === 'waiting') {
    return (
      <div>
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 16 }}>Waiting Room</div>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 20 }}>
          <div className="card" style={{ textAlign: 'center', padding: 24, flex: '1 1 200px' }}>
            <div style={{ fontSize: 13, color: '#6B7280', marginBottom: 4 }}>Join PIN</div>
            <div style={{ fontSize: 40, fontWeight: 900, letterSpacing: 4, color: '#4F46E5' }}>{arena?.pin}</div>
            <div style={{ fontSize: 12, color: '#9CA3AF' }}>Share this 6-digit code with students</div>
          </div>
          <div className="card" style={{ flex: '2 1 300px' }}>
            <div style={{ fontWeight: 700, marginBottom: 10 }}>Participants ({participants.length})</div>
            {participants.length === 0 ? (
              <div style={{ color: '#9CA3AF', fontSize: 13 }}>Waiting for students to join…</div>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {participants.map(p => (
                  <span key={p.id} style={{ background: '#EFF6FF', color: '#1D4ED8', padding: '4px 12px', borderRadius: 20, fontSize: 13, fontWeight: 600 }}>
                    {p.display_name}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
        <button className="btn btn-p" onClick={startGame} disabled={participants.length === 0}>
          Start Game ({participants.length} joined)
        </button>
      </div>
    );
  }

  // ── PLAYING ──────────────────────────────────────────────────
  if (phase === 'playing') {
    const q = questions[currentQ];
    const barData = buildBarData(currentQ);
    const qAnswers = answers.filter(a => a.question_id === q?.id);
    const answeredCount = qAnswers.length;
    const timerColor = timeLeft <= 5 ? '#EF4444' : timeLeft <= 10 ? '#F59E0B' : '#10B981';
    return (
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ fontWeight: 700, fontSize: 15 }}>Question {currentQ + 1} / {questions.length}</div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <div style={{ fontWeight: 800, color: timerColor, fontSize: 24 }}>⏱ {timeLeft}s</div>
            <button className="btn btn-d btn-sm" onClick={endArena}>End Arena</button>
          </div>
        </div>

        {/* Question */}
        <div className="card" style={{ marginBottom: 16, padding: 24, borderLeft: '4px solid #4F46E5' }}>
          <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 16 }}>{q?.stem}</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {q?.options?.map(opt => (
              <div key={opt.label} style={{
                padding: '12px 16px', borderRadius: 10,
                background: OPTION_COLORS[opt.label] + '22',
                border: `2px solid ${OPTION_COLORS[opt.label]}44`,
                fontWeight: 600, fontSize: 14,
              }}>
                <span style={{ color: OPTION_COLORS[opt.label], fontWeight: 800, marginRight: 6 }}>{opt.label}.</span>
                {opt.text}
              </div>
            ))}
          </div>
        </div>

        {/* Answer distribution bar chart */}
        <div className="card" style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ fontWeight: 700, fontSize: 14 }}>📊 Live Answer Distribution</div>
            <div style={{ fontSize: 13, color: '#6B7280' }}>{answeredCount} / {participants.length} answered</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {barData.map(d => (
              <div key={d.label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: 6, flexShrink: 0,
                  background: OPTION_COLORS[d.label],
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', fontWeight: 800, fontSize: 13,
                }}>
                  {d.label}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ height: 28, background: '#F3F4F6', borderRadius: 6, overflow: 'hidden', position: 'relative' }}>
                    <div style={{
                      position: 'absolute', left: 0, top: 0, bottom: 0,
                      width: `${d.pct}%`,
                      background: d.isCorrect ? '#10B981' : OPTION_COLORS[d.label],
                      borderRadius: 6,
                      transition: 'width .5s ease',
                      opacity: 0.8,
                    }} />
                    <div style={{ position: 'absolute', left: 10, top: 0, bottom: 0, display: 'flex', alignItems: 'center', fontSize: 12, fontWeight: 600, color: '#374151', zIndex: 1 }}>
                      {d.text}
                    </div>
                  </div>
                </div>
                <div style={{ width: 40, textAlign: 'right', fontWeight: 700, fontSize: 13 }}>
                  {d.count} {d.isCorrect && <span style={{ color: '#10B981' }}>✓</span>}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 16, flexWrap: 'wrap' }}>
          <button className="btn btn-p btn-sm" onClick={nextQuestion}>
            {currentQ >= questions.length - 1 ? 'Finish Arena' : 'Next Question →'}
          </button>
        </div>

        {/* Live leaderboard */}
        <div className="card">
          <div style={{ fontWeight: 700, marginBottom: 10 }}>Live Leaderboard</div>
          {[...participants].sort((a, b) => b.score - a.score).slice(0, 5).map((p, i) => (
            <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', borderBottom: '1px solid #F3F4F6' }}>
              <span style={{ width: 24, fontWeight: 700, color: i === 0 ? '#F59E0B' : '#6B7280' }}>#{i + 1}</span>
              <span style={{ flex: 1, fontSize: 14 }}>{p.display_name}</span>
              <span style={{ fontWeight: 700, color: '#4F46E5' }}>{p.score} pts</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── FINISHED ─────────────────────────────────────────────────
  const sorted = [...participants].sort((a, b) => b.score - a.score);
  return (
    <div>
      <div style={{ fontWeight: 700, fontSize: 20, marginBottom: 20, textAlign: 'center' }}>🏁 Arena Finished!</div>
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ fontWeight: 700, marginBottom: 12 }}>Final Leaderboard</div>
        {sorted.map((p, i) => (
          <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid #F3F4F6' }}>
            <span style={{ fontSize: i === 0 ? 24 : 16, width: 30, textAlign: 'center' }}>
              {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
            </span>
            <span style={{ flex: 1, fontWeight: i < 3 ? 700 : 400 }}>{p.display_name}</span>
            <span style={{ fontWeight: 700, color: '#4F46E5' }}>{p.score} pts</span>
          </div>
        ))}
        {sorted.length === 0 && <div style={{ color: '#9CA3AF', fontSize: 13 }}>No participants.</div>}
      </div>
      <button className="btn btn-p" onClick={() => { setPhase('setup'); setArena(null); setParticipants([]); setAnswers([]); setCurrentQ(0); }}>
        New Arena
      </button>
    </div>
  );
}
