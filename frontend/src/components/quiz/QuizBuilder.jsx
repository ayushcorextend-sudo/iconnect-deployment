import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { SPECIALITIES } from '../../data/constants';
import ConfirmModal from '../ui/ConfirmModal';
import { QuizQuestionInsertSchema } from '../../schemas/question';
import { useSubmit } from '../../hooks/useSubmit';

const OPTION_KEYS = ['A', 'B', 'C', 'D'];

const blankQuestion = () => ({
  _id: Math.random().toString(36).slice(2),
  stem: '',
  options: OPTION_KEYS.map(k => ({ label: k, text: '' })),
  correctKey: 'A',
  explanation: '',
});

export default function QuizBuilder({ userId, addToast }) {
  const [view, setView]       = useState('list');   // 'list' | 'create' | 'edit'
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [title, setTitle]             = useState('');
  const [subject, setSubject]         = useState('');
  const [description, setDescription] = useState('');
  const [timeLimitSec, setTimeLimitSec] = useState(600);
  const [questions, setQuestions]     = useState([blankQuestion()]);
  const [pendingDeleteId, setPendingDeleteId] = useState(null);
  const { submit: submitQuiz, isSubmitting: saving } = useSubmit({
    onError: (e) => addToast('error', 'Save failed: ' + e.message),
  });
  const [editQuizId, setEditQuizId]   = useState(null);

  useEffect(() => { loadQuizzes(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const loadQuizzes = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('quizzes')
        .select('id, title, subject, status, time_limit_sec, created_at')
        .eq('created_by', userId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setQuizzes(data || []);
    } catch (e) {
      addToast('error', 'Failed to load quizzes: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setTitle(''); setSubject(''); setDescription('');
    setTimeLimitSec(600); setQuestions([blankQuestion()]);
    setEditQuizId(null);
  };

  const openCreate = () => { resetForm(); setView('create'); };

  const openEdit = async (quiz) => {
    try {
      const { data: qs, error } = await supabase
        .from('quiz_questions')
        .select('*')
        .eq('quiz_id', quiz.id)
        .order('sort_order');
      if (error) throw error;
      setTitle(quiz.title);
      setSubject(quiz.subject);
      setDescription('');
      setTimeLimitSec(quiz.time_limit_sec || 600);
      setEditQuizId(quiz.id);
      setQuestions(
        (qs || []).map(q => ({
          _id: q.id,
          stem: q.stem,
          options: q.options || OPTION_KEYS.map(k => ({ label: k, text: '' })),
          correctKey: q.correct_key,
          explanation: q.explanation || '',
        }))
      );
      setView('edit');
    } catch (e) {
      addToast('error', 'Failed to load quiz questions: ' + e.message);
    }
  };

  const deleteQuiz = async (id) => {
    try {
      const { error } = await supabase.from('quizzes').delete().eq('id', id);
      if (error) throw error;
      setQuizzes(prev => prev.filter(q => q.id !== id));
      addToast('success', 'Quiz deleted.');
    } catch (e) {
      addToast('error', 'Delete failed: ' + e.message);
    }
  };

  const addQuestion = () => setQuestions(prev => [...prev, blankQuestion()]);
  const removeQuestion = (idx) => setQuestions(prev => prev.filter((_, i) => i !== idx));

  const updateQuestion = (idx, patch) =>
    setQuestions(prev => prev.map((q, i) => i === idx ? { ...q, ...patch } : q));

  const updateOption = (qIdx, optLabel, text) =>
    setQuestions(prev => prev.map((q, i) => {
      if (i !== qIdx) return q;
      return { ...q, options: q.options.map(o => o.label === optLabel ? { ...o, text } : o) };
    }));

  const save = (asDraft = false) => {
    if (!title.trim())  { addToast('error', 'Quiz title is required.'); return; }
    if (!subject)       { addToast('error', 'Subject is required.'); return; }
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.stem.trim()) { addToast('error', `Question ${i + 1} is empty.`); return; }
      if (q.options.some(o => !o.text.trim())) { addToast('error', `All 4 options required for question ${i + 1}.`); return; }
    }
    if (userId?.startsWith('local_')) { addToast('error', 'Cannot save in demo mode.'); return; }

    // BUG-X: validate every question against the canonical schema before any DB write.
    const questionRows = questions.map((q, i) => ({
      quiz_id: editQuizId || '__placeholder__',
      sort_order: i,
      stem: q.stem.trim(),
      options: q.options,
      correct_key: q.correctKey,
      explanation: q.explanation || undefined,
    }));
    for (let i = 0; i < questionRows.length; i++) {
      const result = QuizQuestionInsertSchema.safeParse(questionRows[i]);
      if (!result.success) {
        addToast('error', `Question ${i + 1}: ${result.error.errors[0]?.message || 'Validation failed'}`);
        return;
      }
    }

    submitQuiz(async () => {
      const status = asDraft ? 'draft' : 'pending';

      if (editQuizId) {
        const { error: qzErr } = await supabase.from('quizzes')
          .update({ title: title.trim(), subject, description, time_limit_sec: timeLimitSec, status })
          .eq('id', editQuizId);
        if (qzErr) throw qzErr;

        await supabase.from('quiz_questions').delete().eq('quiz_id', editQuizId);
        const rows = questionRows.map(r => ({ ...r, quiz_id: editQuizId }));
        const { error: qqErr } = await supabase.from('quiz_questions').insert(rows);
        if (qqErr) throw qqErr;
      } else {
        const { data: qz, error: qzErr } = await supabase
          .from('quizzes')
          .insert({ title: title.trim(), subject, description, time_limit_sec: timeLimitSec, status, created_by: userId })
          .select('id').single();
        if (qzErr) throw qzErr;

        const rows = questionRows.map(r => ({ ...r, quiz_id: qz.id }));
        const { error: qqErr } = await supabase.from('quiz_questions').insert(rows);
        if (qqErr) throw qqErr;
      }

      addToast('success', asDraft ? 'Draft saved.' : 'Quiz submitted for approval!');
      await loadQuizzes();
      resetForm();
      setView('list');
    });
  };

  const statusCfg = {
    draft:    { label: 'Draft',    bg: '#F3F4F6', color: '#6B7280' },
    pending:  { label: 'Pending',  bg: '#FEF3C7', color: '#D97706' },
    approved: { label: 'Approved', bg: '#DCFCE7', color: '#15803D' },
    rejected: { label: 'Rejected', bg: '#FEE2E2', color: '#DC2626' },
  };

  // ── LIST VIEW ────────────────────────────────────────────────
  if (view === 'list') {
    return (
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ fontWeight: 700, fontSize: 15 }}>My Quizzes ({quizzes.length})</div>
          <button className="btn btn-p btn-sm" onClick={openCreate}>+ New Quiz</button>
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
            <div style={{ width: 24, height: 24, borderRadius: '50%', border: '3px solid #E5E7EB', borderTopColor: '#2563EB', animation: 'spin 0.8s linear infinite' }} />
          </div>
        ) : quizzes.length === 0 ? (
          <div className="empty">
            <div className="empty-ic">📝</div>
            <div className="empty-t">No quizzes yet</div>
            <div className="empty-s">Create your first quiz to get started.</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {quizzes.map(q => {
              const sc = statusCfg[q.status] || { label: q.status, bg: '#F3F4F6', color: '#6B7280' };
              return (
                <div key={q.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 14 }}>
                  <div style={{ fontSize: 28 }}>📋</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{q.title}</div>
                    <div style={{ fontSize: 12, color: '#6B7280' }}>{q.subject} · {Math.floor(q.time_limit_sec / 60)} min</div>
                  </div>
                  <span style={{ padding: '3px 10px', borderRadius: 12, fontSize: 11, fontWeight: 700, background: sc.bg, color: sc.color }}>
                    {sc.label}
                  </span>
                  {(q.status === 'draft' || q.status === 'rejected') && (
                    <button onClick={() => openEdit(q)} aria-label="Edit quiz" style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, padding: 4 }}>✏️</button>
                  )}
                  {q.status !== 'approved' && (
                    <button onClick={() => setPendingDeleteId(q.id)} aria-label="Delete quiz" style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, padding: 4 }}>🗑️</button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ── CREATE / EDIT FORM ───────────────────────────────────────
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <button className="btn btn-s btn-sm" onClick={() => { resetForm(); setView('list'); }}>← Back</button>
        <div style={{ fontWeight: 700, fontSize: 15 }}>{view === 'edit' ? 'Edit Quiz' : 'Create Quiz'}</div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ fontWeight: 600, marginBottom: 12 }}>Quiz Details</div>
        <div className="fg">
          <label className="fl">Title <span className="req">*</span></label>
          <input className="fi-in" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Cardiology Rapid Fire" />
        </div>
        <div className="fg">
          <label className="fl">Subject <span className="req">*</span></label>
          <select className="fi-sel" value={subject} onChange={e => setSubject(e.target.value)}>
            <option value="">Select subject…</option>
            {Object.entries(SPECIALITIES).map(([prog, subs]) => (
              <optgroup key={prog} label={prog}>
                {subs.map(s => <option key={s} value={s}>{s}</option>)}
              </optgroup>
            ))}
          </select>
        </div>
        <div className="fg">
          <label className="fl">Description</label>
          <textarea className="fi-ta" value={description} onChange={e => setDescription(e.target.value)} rows={2} placeholder="Optional quiz description…" />
        </div>
        <div className="fg">
          <label className="fl">Time Limit (minutes)</label>
          <input className="fi-in" type="number" min={1} max={120} value={Math.floor(timeLimitSec / 60)}
            onChange={e => setTimeLimitSec(Number(e.target.value) * 60)} style={{ width: 100 }} />
        </div>
      </div>

      {questions.map((q, idx) => (
        <div key={q._id} className="card" style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div style={{ fontWeight: 600 }}>Question {idx + 1}</div>
            {questions.length > 1 && (
              <button onClick={() => removeQuestion(idx)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#EF4444', fontSize: 13, fontWeight: 600 }}>Remove</button>
            )}
          </div>
          <div className="fg">
            <label className="fl">Stem <span className="req">*</span></label>
            <textarea className="fi-ta" rows={2} value={q.stem}
              onChange={e => updateQuestion(idx, { stem: e.target.value })} placeholder="Question text…" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
            {q.options.map(opt => (
              <div key={opt.label} className="fg" style={{ margin: 0 }}>
                <label className="fl">Option {opt.label} <span className="req">*</span></label>
                <input className="fi-in" value={opt.text}
                  onChange={e => updateOption(idx, opt.label, e.target.value)} placeholder={`Option ${opt.label}…`} />
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <div className="fg" style={{ margin: 0 }}>
              <label className="fl">Correct Answer</label>
              <select className="fi-sel" value={q.correctKey} onChange={e => updateQuestion(idx, { correctKey: e.target.value })} style={{ width: 80 }}>
                {OPTION_KEYS.map(k => <option key={k} value={k}>{k}</option>)}
              </select>
            </div>
            <div className="fg" style={{ flex: 1, margin: 0 }}>
              <label className="fl">Explanation (optional)</label>
              <input className="fi-in" value={q.explanation}
                onChange={e => updateQuestion(idx, { explanation: e.target.value })} placeholder="Why is this the correct answer?" />
            </div>
          </div>
        </div>
      ))}

      <button className="btn btn-s btn-sm" onClick={addQuestion} style={{ marginBottom: 20 }}>+ Add Question</button>

      <div style={{ display: 'flex', gap: 10 }}>
        <button className="btn btn-p btn-sm" onClick={() => save(false)} disabled={saving}>
          {saving ? 'Saving…' : 'Submit for Approval'}
        </button>
        <button className="btn btn-s btn-sm" onClick={() => save(true)} disabled={saving}>
          Save Draft
        </button>
        <button className="btn btn-s btn-sm" onClick={() => { resetForm(); setView('list'); }}>Cancel</button>
      </div>

      {pendingDeleteId && (
        <ConfirmModal
          message="Delete this quiz? This cannot be undone."
          confirmLabel="Delete Quiz"
          onConfirm={() => { const id = pendingDeleteId; setPendingDeleteId(null); deleteQuiz(id); }}
          onCancel={() => setPendingDeleteId(null)}
        />
      )}
    </div>
  );
}
