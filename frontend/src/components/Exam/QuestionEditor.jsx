import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import ConfirmModal from '../ui/ConfirmModal';

const EMPTY_Q = { question: '', option_a: '', option_b: '', option_c: '', option_d: '', correct: 'A', difficulty: 'medium', explanation: '', source: 'NEET-PG' };
const DIFFICULTIES = ['easy', 'medium', 'hard'];
const OPTS = ['A', 'B', 'C', 'D'];

export default function QuestionEditor({ subject, onBack, addToast }) {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);   // null | 'add' | question object
  const [form, setForm] = useState(EMPTY_Q);
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(1);
  const [pendingDelete, setPendingDelete] = useState(null);
  const PAGE_SIZE = 15;

  useEffect(() => { load(); }, [subject.id]);

  async function load() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('exam_questions')
        .select('id, question, correct, difficulty, source, explanation, option_a, option_b, option_c, option_d')
        .eq('subject_id', subject.id)
        .order('id');
      if (error) throw error;
      setQuestions(data || []);
    } catch (e) {
      addToast('error', 'Could not load questions: ' + e.message);
    } finally {
      setLoading(false);
    }
  }

  function openAdd() { setForm(EMPTY_Q); setModal('add'); }
  function openEdit(q) { setForm({ ...q }); setModal(q); }

  async function handleSave() {
    if (!form.question.trim() || !form.option_a.trim() || !form.option_b.trim() || !form.option_c.trim() || !form.option_d.trim()) {
      addToast('error', 'Question text and all 4 options are required.'); return;
    }
    setSaving(true);
    try {
      const payload = { ...form, subject_id: subject.id };
      if (modal === 'add') {
        const { data, error } = await supabase.from('exam_questions').insert([payload]).select().single();
        if (error) throw error;
        setQuestions(prev => [...prev, data]);
        addToast('success', 'Question added.');
      } else {
        const { error } = await supabase.from('exam_questions').update(payload).eq('id', modal.id);
        if (error) throw error;
        setQuestions(prev => prev.map(q => q.id === modal.id ? { ...q, ...payload } : q));
        addToast('success', 'Question updated.');
      }
      setModal(null);
    } catch (e) {
      addToast('error', 'Save failed: ' + e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(q) {
    try {
      const { error } = await supabase.from('exam_questions').delete().eq('id', q.id);
      if (error) throw error;
      setQuestions(prev => prev.filter(x => x.id !== q.id));
      addToast('success', 'Deleted.');
    } catch (e) {
      addToast('error', 'Delete failed: ' + e.message);
    }
  }

  const paged = questions.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const totalPages = Math.ceil(questions.length / PAGE_SIZE);

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <button className="btn btn-s btn-sm" onClick={onBack}>← Back</button>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 800, fontSize: 16 }}>{subject.icon} {subject.name}</div>
          <div style={{ fontSize: 12, color: '#9CA3AF' }}>{questions.length} questions</div>
        </div>
        <button className="btn btn-p btn-sm" onClick={openAdd}>+ Add Question</button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
          <div style={{ width: 28, height: 28, borderRadius: '50%', border: '3px solid #E5E7EB', borderTopColor: '#4F46E5', animation: 'spin 0.8s linear infinite' }} />
        </div>
      ) : questions.length === 0 ? (
        <div className="empty">
          <div className="empty-ic">📭</div>
          <div className="empty-t">No questions yet</div>
          <div className="empty-s">Add the first MCQ question for this subject.</div>
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
            {paged.map((q, i) => {
              const globalN = (page - 1) * PAGE_SIZE + i + 1;
              const diffColor = { easy: '#10B981', medium: '#F59E0B', hard: '#EF4444' }[q.difficulty] || '#6B7280';
              return (
                <div key={q.id} className="card" style={{ padding: '12px 14px', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <div style={{ minWidth: 28, height: 28, borderRadius: '50%', background: '#EEF2FF', color: '#4F46E5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>{globalN}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#111827', marginBottom: 4, lineHeight: 1.4 }}>{q.question}</div>
                    <div style={{ fontSize: 11, color: '#6B7280' }}>
                      Correct: <strong>{q.correct}</strong> ·
                      <span style={{ color: diffColor, marginLeft: 4 }}>{q.difficulty}</span>
                      {q.source && <span style={{ marginLeft: 4 }}>· {q.source}</span>}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                    <button onClick={() => openEdit(q)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 15, padding: 4 }}>✏️</button>
                    <button onClick={() => setPendingDelete(q)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 15, padding: 4 }}>🗑️</button>
                  </div>
                </div>
              );
            })}
          </div>

          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: 8 }}>
              <button className="btn btn-s btn-sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
              <span style={{ padding: '6px 12px', fontSize: 13, color: '#6B7280' }}>{page} / {totalPages}</span>
              <button className="btn btn-s btn-sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next →</button>
            </div>
          )}
        </>
      )}

      {/* Add / Edit Modal */}
      {modal && (
        <div className="overlay" onClick={() => setModal(null)}>
          <div className="modal" style={{ maxWidth: 560, width: '95vw' }} onClick={e => e.stopPropagation()}>
            <div className="mh">
              <div className="mt">{modal === 'add' ? '➕ Add Question' : '✏️ Edit Question'}</div>
              <button className="mc" onClick={() => setModal(null)}>×</button>
            </div>
            <div className="mb" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
              <div className="fg">
                <label className="fl">Question <span className="req">*</span></label>
                <textarea className="fi-ta" rows={3} value={form.question} onChange={e => setForm(f => ({ ...f, question: e.target.value }))} placeholder="Enter MCQ question text…" />
              </div>
              {OPTS.map(opt => (
                <div key={opt} className="fg">
                  <label className="fl">Option {opt} {form.correct === opt && <span style={{ color: '#10B981' }}>✓ Correct</span>}</label>
                  <input className="fi-in" value={form[`option_${opt.toLowerCase()}`]} onChange={e => setForm(f => ({ ...f, [`option_${opt.toLowerCase()}`]: e.target.value }))} placeholder={`Option ${opt}`} />
                </div>
              ))}
              <div className="fg">
                <label className="fl">Correct Answer <span className="req">*</span></label>
                <select className="fi-sel" value={form.correct} onChange={e => setForm(f => ({ ...f, correct: e.target.value }))}>
                  {OPTS.map(o => <option key={o} value={o}>Option {o}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <div className="fg" style={{ flex: 1 }}>
                  <label className="fl">Difficulty</label>
                  <select className="fi-sel" value={form.difficulty} onChange={e => setForm(f => ({ ...f, difficulty: e.target.value }))}>
                    {DIFFICULTIES.map(d => <option key={d} value={d}>{d.charAt(0).toUpperCase() + d.slice(1)}</option>)}
                  </select>
                </div>
                <div className="fg" style={{ flex: 1 }}>
                  <label className="fl">Source</label>
                  <input className="fi-in" value={form.source} onChange={e => setForm(f => ({ ...f, source: e.target.value }))} placeholder="e.g. NEET-PG 2023" />
                </div>
              </div>
              <div className="fg">
                <label className="fl">Explanation (optional)</label>
                <textarea className="fi-ta" rows={2} value={form.explanation} onChange={e => setForm(f => ({ ...f, explanation: e.target.value }))} placeholder="Brief explanation for the correct answer…" />
              </div>
            </div>
            <div className="mf">
              <button className="btn btn-p btn-sm" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving…' : modal === 'add' ? 'Add Question' : 'Save Changes'}
              </button>
              <button className="btn btn-s btn-sm" onClick={() => setModal(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {pendingDelete && (
        <ConfirmModal
          message="Delete this question? This cannot be undone."
          confirmLabel="Delete Question"
          onConfirm={() => { const q = pendingDelete; setPendingDelete(null); handleDelete(q); }}
          onCancel={() => setPendingDelete(null)}
        />
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
