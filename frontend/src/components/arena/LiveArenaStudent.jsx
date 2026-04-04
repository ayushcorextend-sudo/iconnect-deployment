import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { idempotentInsert } from '../../lib/idempotency';

const QUESTION_TIMEOUT = 15; // seconds — per SOW spec

export default function LiveArenaStudent({ userId, addToast }) {
  const [phase, setPhase]           = useState('join');   // 'join' | 'waiting' | 'playing' | 'answered' | 'finished'
  const [pin, setPin]               = useState('');
  const [displayName, setDisplayName] = useState('');
  const [joining, setJoining]       = useState(false);

  const [arena, setArena]           = useState(null);
  const [participant, setParticipant] = useState(null);
  const [questions, setQuestions]   = useState([]);
  const [currentQ, setCurrentQ]     = useState(0);
  const [timeLeft, setTimeLeft]     = useState(QUESTION_TIMEOUT);
  const [chosen, setChosen]         = useState(null);
  const [score, setScore]           = useState(0);
  const [lastCorrect, setLastCorrect] = useState(null);
  const [lastPoints, setLastPoints]   = useState(0);
  const [totalParticipants, setTotalParticipants] = useState(0);

  const timerRef     = useRef(null);
  const subRef       = useRef(null);
  const timeLeftRef  = useRef(QUESTION_TIMEOUT);  // mirror for use inside intervals

  useEffect(() => () => {
    if (subRef.current) supabase.removeChannel(subRef.current);
    clearInterval(timerRef.current);
  }, []);

  const joinArena = async () => {
    if (!pin.trim() || pin.length !== 6) { addToast('error', 'Enter a 6-digit PIN.'); return; }
    if (!displayName.trim()) { addToast('error', 'Enter your display name.'); return; }
    if (userId?.startsWith('local_')) { addToast('error', 'Not available in demo mode.'); return; }
    setJoining(true);
    try {
      const { data: ar, error: arErr } = await supabase
        .from('live_arenas').select('*').eq('pin', pin.trim()).in('status', ['waiting', 'active']).maybeSingle();
      if (arErr) throw arErr;
      if (!ar) { addToast('error', 'Arena not found or already finished.'); return; }

      const { data: qs, error: qsErr } = await supabase
        .from('quiz_questions').select('*').eq('quiz_id', ar.quiz_id).order('sort_order');
      if (qsErr) throw qsErr;

      const { data: p, error: pErr } = await supabase
        .from('arena_participants')
        .upsert({ arena_id: ar.id, user_id: userId, display_name: displayName.trim() }, { onConflict: 'arena_id,user_id', ignoreDuplicates: false })
        .select().single();
      if (pErr) throw pErr;

      setArena(ar);
      setQuestions(qs || []);
      setParticipant(p);

      // If arena already active, go directly to playing
      if (ar.status === 'active') {
        setCurrentQ(ar.current_q || 0);
        setPhase('playing');
        startTimer(ar.question_started_at);
      } else {
        setPhase('waiting');
      }

      subscribeArena(ar.id, qs || []);
    } catch (e) {
      addToast('error', 'Failed to join: ' + e.message);
    } finally {
      setJoining(false);
    }
  };

  const subscribeArena = (arenaId, qs) => {
    if (subRef.current) { supabase.removeChannel(subRef.current); subRef.current = null; }
    subRef.current = supabase
      .channel('arena-student-' + arenaId)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'live_arenas', filter: `id=eq.${arenaId}` },
        payload => handleArenaUpdate(payload.new, qs))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'arena_participants', filter: `arena_id=eq.${arenaId}` },
        () => loadCount(arenaId))
      .subscribe();
  };

  const loadCount = async (arenaId) => {
    const { count } = await supabase.from('arena_participants').select('id', { count: 'exact', head: true }).eq('arena_id', arenaId);
    setTotalParticipants(count || 0);
  };

  const handleArenaUpdate = (updated, qs) => {
    setArena(updated);
    if (updated.status === 'finished') {
      clearInterval(timerRef.current);
      setPhase('finished');
      return;
    }
    if (updated.status === 'active') {
      setCurrentQ(updated.current_q || 0);
      setChosen(null);
      setLastCorrect(null);
      setLastPoints(0);
      setPhase('playing');
      startTimer(updated.question_started_at);
    }
  };

  const startTimer = (questionStartedAt) => {
    clearInterval(timerRef.current);
    const elapsed = questionStartedAt
      ? Math.floor((Date.now() - new Date(questionStartedAt)) / 1000)
      : 0;
    const remaining = Math.max(0, QUESTION_TIMEOUT - elapsed);
    setTimeLeft(remaining);
    timeLeftRef.current = remaining;

    timerRef.current = setInterval(() => {
      timeLeftRef.current = Math.max(0, timeLeftRef.current - 1);
      setTimeLeft(timeLeftRef.current);
      if (timeLeftRef.current <= 0) clearInterval(timerRef.current);
    }, 1000);
  };

  const submitAnswer = async (key) => {
    if (chosen || !participant || !arena || !questions[currentQ]) return;
    clearInterval(timerRef.current);
    setChosen(key);

    const q = questions[currentQ];
    const isCorrect = key === q.correct_key;

    // SOW scoring: points = Math.floor(1000 * (time_left / 15))
    const points = isCorrect ? Math.floor(1000 * (timeLeftRef.current / QUESTION_TIMEOUT)) : 0;

    setLastCorrect(isCorrect);
    setLastPoints(points);
    const newScore = score + points;
    setScore(newScore);

    try {
      const { isDuplicate } = await idempotentInsert('arena_answer', {
        arena_id: arena.id,
        participant_id: participant.id,
        question_id: q.id,
        question_index: currentQ,
        chosen_key: key,
        is_correct: isCorrect,
        points_awarded: points,
      }, { table: 'arena_answers' });
      if (isDuplicate) return; // answer already recorded
      await supabase.from('arena_participants').update({ score: newScore }).eq('id', participant.id);
    } catch (e) {
      addToast('error', 'Answer submit error: ' + e.message);
    }
    setPhase('answered');
  };

  const OPTION_COLORS = ['#EF4444', '#2563EB', '#10B981', '#F59E0B'];

  // ── JOIN FORM ────────────────────────────────────────────────
  if (phase === 'join') {
    return (
      <div className="page">
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 16 }}>🏟️ Join Live Arena</div>
        <div className="card" style={{ maxWidth: 360 }}>
          <div className="fg">
            <label className="fl">6-Digit PIN</label>
            <input className="fi-in" maxLength={6} value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, ''))}
              placeholder="Enter arena PIN…" style={{ letterSpacing: 6, fontSize: 20, fontWeight: 700 }} />
          </div>
          <div className="fg">
            <label className="fl">Your Display Name</label>
            <input className="fi-in" maxLength={30} value={displayName} onChange={e => setDisplayName(e.target.value)}
              placeholder="How you'll appear on the leaderboard" />
          </div>
          <button className="btn btn-p" onClick={joinArena} disabled={joining}>
            {joining ? 'Joining…' : 'Join Arena →'}
          </button>
        </div>
      </div>
    );
  }

  // ── WAITING ──────────────────────────────────────────────────
  if (phase === 'waiting') {
    return (
      <div className="card" style={{ textAlign: 'center', padding: 48, maxWidth: 400, margin: '0 auto' }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>⏳</div>
        <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 6 }}>You're in!</div>
        <div style={{ color: '#6B7280', marginBottom: 4 }}>Playing as <strong>{displayName}</strong></div>
        <div style={{ color: '#9CA3AF', fontSize: 13, marginBottom: 20 }}>{totalParticipants} participant{totalParticipants !== 1 ? 's' : ''} joined</div>
        <div style={{ color: '#6B7280', fontSize: 13 }}>Waiting for the host to start the game…</div>
        <div style={{ width: 32, height: 32, borderRadius: '50%', border: '3px solid #E5E7EB', borderTopColor: '#4F46E5', animation: 'spin 0.8s linear infinite', margin: '20px auto 0' }} />
      </div>
    );
  }

  // ── PLAYING ──────────────────────────────────────────────────
  if (phase === 'playing') {
    const q = questions[currentQ];
    const pct = (timeLeft / QUESTION_TIMEOUT) * 100;
    const timerColor = timeLeft <= 5 ? '#EF4444' : timeLeft <= 10 ? '#F59E0B' : '#10B981';
    return (
      <div style={{ maxWidth: 520, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ fontSize: 13, color: '#6B7280' }}>Question {currentQ + 1}/{questions.length}</div>
          <div style={{ fontWeight: 800, color: timerColor, fontSize: 28 }}>{timeLeft}</div>
        </div>

        {/* Timer bar */}
        <div style={{ height: 6, background: '#E5E7EB', borderRadius: 4, marginBottom: 20 }}>
          <div style={{
            height: 6, borderRadius: 4,
            background: `linear-gradient(90deg, ${timerColor}, ${timerColor}88)`,
            width: `${pct}%`,
            transition: 'width 1s linear',
          }} />
        </div>

        <div className="card" style={{ padding: 24, marginBottom: 16, borderLeft: '4px solid #4F46E5' }}>
          <div style={{ fontWeight: 700, fontSize: 17, lineHeight: 1.5 }}>{q?.stem}</div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {q?.options?.map((opt, oi) => (
            <button
              key={opt.label}
              onClick={() => submitAnswer(opt.label)}
              disabled={!!chosen}
              style={{
                padding: '18px 14px', borderRadius: 12, border: 'none',
                cursor: chosen ? 'default' : 'pointer',
                fontWeight: 700, fontSize: 15, textAlign: 'left',
                background: OPTION_COLORS[oi],
                color: '#fff', transition: 'opacity .2s, transform .1s',
                opacity: chosen && chosen !== opt.label ? 0.45 : 1,
                transform: 'scale(1)',
                boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
              }}
            >
              <span style={{ display: 'block', fontSize: 11, opacity: 0.8, marginBottom: 4 }}>{opt.label}</span>
              {opt.text}
            </button>
          ))}
        </div>

        <div style={{ marginTop: 16, textAlign: 'center', fontSize: 14, color: '#6B7280' }}>
          Score: <strong style={{ color: '#4F46E5', fontSize: 16 }}>{score} pts</strong>
        </div>
      </div>
    );
  }

  // ── ANSWERED ─────────────────────────────────────────────────
  if (phase === 'answered') {
    return (
      <div className="card" style={{ textAlign: 'center', padding: 48, maxWidth: 400, margin: '0 auto' }}>
        <div style={{ fontSize: 64, marginBottom: 12 }}>{lastCorrect ? '✅' : '❌'}</div>
        <div style={{ fontWeight: 800, fontSize: 22, marginBottom: 4 }}>{lastCorrect ? 'Correct!' : 'Wrong!'}</div>
        {lastCorrect && (
          <div style={{ fontWeight: 800, fontSize: 32, color: '#4F46E5', marginBottom: 4 }}>+{lastPoints} pts</div>
        )}
        <div style={{ color: '#6B7280', marginBottom: 16 }}>Total: <strong>{score} pts</strong></div>
        <div style={{ color: '#9CA3AF', fontSize: 13 }}>Waiting for next question…</div>
        <div style={{ width: 28, height: 28, borderRadius: '50%', border: '3px solid #E5E7EB', borderTopColor: '#4F46E5', animation: 'spin 0.8s linear infinite', margin: '16px auto 0' }} />
      </div>
    );
  }

  // ── FINISHED ─────────────────────────────────────────────────
  return (
    <div className="card" style={{ textAlign: 'center', padding: 40, maxWidth: 400, margin: '0 auto' }}>
      <div style={{ fontSize: 48, marginBottom: 12 }}>🏁</div>
      <div style={{ fontWeight: 800, fontSize: 22, marginBottom: 6 }}>Game Over!</div>
      <div style={{ fontSize: 36, fontWeight: 800, color: '#4F46E5', marginBottom: 4 }}>{score} pts</div>
      <div style={{ color: '#6B7280', marginBottom: 20 }}>Final score as {displayName}</div>
      <button className="btn btn-p" onClick={() => { setPhase('join'); setPin(''); setScore(0); setArena(null); setChosen(null); }}>
        Play Again
      </button>
    </div>
  );
}
