import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import QuestionEditor from './QuestionEditor';
import ConfirmModal from '../ui/ConfirmModal';

const EMPTY_SUBJECT = { name: '', icon: '📝', difficulty: 'mixed' };
const DIFFICULTIES = ['easy', 'medium', 'hard', 'mixed'];
const PRESET_ICONS = ['📝', '🫀', '🧠', '🦷', '👁️', '🦴', '💊', '🔬', '🩺', '🏥', '🧬', '🫁', '🩻', '🧪', '💉'];

export default function ExamManager({ userId, addToast }) {
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);    // null | 'add' | subject object
  const [form, setForm] = useState(EMPTY_SUBJECT);
  const [saving, setSaving] = useState(false);
  const [editingSubject, setEditingSubject] = useState(null);  // open QuestionEditor
  const [pendingDelete, setPendingDelete] = useState(null);    // { subject }

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('exam_subjects')
        .select('*')
        .order('id');
      if (error) throw error;
      setSubjects(data || []);
    } catch (e) {
      addToast('error', 'Could not load exam subjects: ' + e.message);
    } finally {
      setLoading(false);
    }
  }

  function openAdd() { setForm(EMPTY_SUBJECT); setModal('add'); }
  function openEdit(s) { setForm({ name: s.name, icon: s.icon || '📝', difficulty: s.difficulty || 'mixed' }); setModal(s); }

  async function handleSave() {
    if (!form.name.trim()) { addToast('error', 'Subject name is required.'); return; }
    setSaving(true);
    try {
      const payload = { name: form.name.trim(), icon: form.icon, difficulty: form.difficulty };
      if (modal === 'add') {
        const { data, error } = await supabase.from('exam_subjects').insert([payload]).select().single();
        if (error) throw error;
        setSubjects(prev => [...prev, data]);
        addToast('success', 'Subject created.');
      } else {
        const { error } = await supabase.from('exam_subjects').update(payload).eq('id', modal.id);
        if (error) throw error;
        setSubjects(prev => prev.map(s => s.id === modal.id ? { ...s, ...payload } : s));
        addToast('success', 'Subject updated.');
      }
      setModal(null);
    } catch (e) {
      addToast('error', 'Save failed: ' + e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(s) {
    try {
      const { error } = await supabase.from('exam_subjects').delete().eq('id', s.id);
      if (error) throw error;
      setSubjects(prev => prev.filter(x => x.id !== s.id));
      addToast('success', 'Subject deleted.');
    } catch (e) {
      addToast('error', 'Delete failed: ' + e.message);
    }
  }

  // QuestionEditor drilldown
  if (editingSubject) return (
    <QuestionEditor
      subject={editingSubject}
      onBack={() => { setEditingSubject(null); load(); }}
      addToast={addToast}
    />
  );

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <div style={{ fontWeight: 800, fontSize: 16 }}>📋 Exam Manager</div>
          <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2 }}>Manage exam subjects and MCQ question banks</div>
        </div>
        <button className="btn btn-p btn-sm" onClick={openAdd}>+ New Subject</button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
          <div style={{ width: 28, height: 28, borderRadius: '50%', border: '3px solid #E5E7EB', borderTopColor: '#4F46E5', animation: 'spin 0.8s linear infinite' }} />
        </div>
      ) : subjects.length === 0 ? (
        <div className="empty">
          <div className="empty-ic">📭</div>
          <div className="empty-t">No exam subjects yet</div>
          <div className="empty-s">Create a subject to start adding MCQ questions.</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14 }}>
          {subjects.map(s => {
            const diffColor = { easy: '#10B981', medium: '#F59E0B', hard: '#EF4444', mixed: '#6366F1' }[s.difficulty] || '#6B7280';
            return (
              <div key={s.id} className="card" style={{ padding: '16px 16px 14px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 12 }}>
                  <div style={{ fontSize: 32, lineHeight: 1 }}>{s.icon || '📝'}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: '#111827' }}>{s.name}</div>
                    <div style={{ display: 'flex', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 10, fontWeight: 700, color: diffColor, background: `${diffColor}18`, padding: '1px 6px', borderRadius: 6 }}>
                        {s.difficulty || 'mixed'}
                      </span>
                      <span style={{ fontSize: 10, color: '#9CA3AF' }}>
                        {s.question_count ?? '—'} Qs
                      </span>
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    className="btn btn-p btn-sm"
                    style={{ flex: 1, fontSize: 11 }}
                    onClick={() => setEditingSubject(s)}
                  >
                    📝 Questions
                  </button>
                  <button aria-label="Edit exam set" onClick={() => openEdit(s)} style={{ background: 'none', border: '1px solid #E5E7EB', borderRadius: 8, cursor: 'pointer', padding: '6px 8px', fontSize: 14 }}>✏️</button>
                  <button aria-label="Delete exam set" onClick={() => setPendingDelete(s)} style={{ background: 'none', border: '1px solid #FEE2E2', borderRadius: 8, cursor: 'pointer', padding: '6px 8px', fontSize: 14 }}>🗑️</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Modal */}
      {modal && (
        <div className="overlay" onClick={() => setModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="mh">
              <div className="mt">{modal === 'add' ? '➕ New Exam Subject' : '✏️ Edit Subject'}</div>
              <button aria-label="Close" className="mc" onClick={() => setModal(null)}>×</button>
            </div>
            <div className="mb">
              <div className="fg">
                <label className="fl">Subject Name <span className="req">*</span></label>
                <input className="fi-in" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Pharmacology" />
              </div>
              <div className="fg">
                <label className="fl">Icon</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                  {PRESET_ICONS.map(ic => (
                    <button
                      key={ic}
                      onClick={() => setForm(f => ({ ...f, icon: ic }))}
                      style={{
                        width: 36, height: 36, borderRadius: 8, fontSize: 18, cursor: 'pointer',
                        border: '2px solid', borderColor: form.icon === ic ? '#4F46E5' : '#E5E7EB',
                        background: form.icon === ic ? '#EEF2FF' : '#F9FAFB',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}
                    >
                      {ic}
                    </button>
                  ))}
                </div>
              </div>
              <div className="fg">
                <label className="fl">Difficulty Level</label>
                <select className="fi-sel" value={form.difficulty} onChange={e => setForm(f => ({ ...f, difficulty: e.target.value }))}>
                  {DIFFICULTIES.map(d => <option key={d} value={d}>{d.charAt(0).toUpperCase() + d.slice(1)}</option>)}
                </select>
              </div>
            </div>
            <div className="mf">
              <button className="btn btn-p btn-sm" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving…' : modal === 'add' ? 'Create Subject' : 'Save Changes'}
              </button>
              <button className="btn btn-s btn-sm" onClick={() => setModal(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {pendingDelete && (
        <ConfirmModal
          message={`Delete "${pendingDelete.name}"? All questions in this subject will also be deleted.`}
          confirmLabel="Delete Subject"
          onConfirm={() => { const s = pendingDelete; setPendingDelete(null); handleDelete(s); }}
          onCancel={() => setPendingDelete(null)}
        />
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
