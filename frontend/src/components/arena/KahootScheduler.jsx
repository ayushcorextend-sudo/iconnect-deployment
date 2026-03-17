import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import ConfirmModal from '../ui/ConfirmModal';

const fmt = (iso) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
};

const statusCfg = {
  waiting:  { label: 'Scheduled', bg: '#EFF6FF', color: '#2563EB' },
  active:   { label: 'Live Now',  bg: '#DCFCE7', color: '#15803D' },
  finished: { label: 'Finished',  bg: '#F3F4F6', color: '#6B7280' },
};

const genPin = () => Math.floor(100000 + Math.random() * 900000).toString();

export default function KahootScheduler({ userId, addToast }) {
  const [arenas, setArenas]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [pendingCancelId, setPendingCancelId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [quizzes, setQuizzes] = useState([]);

  const [form, setForm] = useState({
    quiz_id: '',
    scheduled_at: '',
    pin: genPin(),
  });

  useEffect(() => { loadAll(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const loadAll = async () => {
    setLoading(true);
    try {
      const [{ data: ar }, { data: qz }] = await Promise.all([
        supabase.from('live_arenas').select('*, quizzes(title, subject)').eq('host_id', userId).order('scheduled_at', { ascending: false }),
        supabase.from('quizzes').select('id, title, subject').eq('status', 'approved'),
      ]);
      setArenas(ar || []);
      setQuizzes(qz || []);
    } catch (e) {
      addToast('error', 'Failed to load: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!form.quiz_id)       { addToast('error', 'Select a quiz.'); return; }
    if (!form.scheduled_at)  { addToast('error', 'Set a scheduled date/time.'); return; }
    if (userId?.startsWith('local_')) { addToast('error', 'Not in demo mode.'); return; }

    setSaving(true);
    try {
      const { data, error } = await supabase
        .from('live_arenas')
        .insert({
          quiz_id: form.quiz_id,
          host_id: userId,
          pin: form.pin,
          status: 'waiting',
          current_q: 0,
          scheduled_at: new Date(form.scheduled_at).toISOString(),
        })
        .select('*, quizzes(title, subject)')
        .single();
      if (error) throw error;
      setArenas(prev => [data, ...prev]);
      setShowForm(false);
      setForm({ quiz_id: '', scheduled_at: '', pin: genPin() });
      addToast('success', `Arena scheduled! PIN: ${data.pin}`);
    } catch (e) {
      addToast('error', 'Create failed: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  const cancelArena = async (id) => {
    try {
      const { error } = await supabase.from('live_arenas').update({ status: 'finished' }).eq('id', id);
      if (error) throw error;
      setArenas(prev => prev.map(a => a.id === id ? { ...a, status: 'finished' } : a));
      addToast('success', 'Arena cancelled.');
    } catch (e) {
      addToast('error', 'Failed: ' + e.message);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ fontWeight: 700, fontSize: 15 }}>Kahoot Scheduler</div>
        <button className="btn btn-p btn-sm" onClick={() => { setShowForm(v => !v); setForm(f => ({ ...f, pin: genPin() })); }}>
          {showForm ? 'Cancel' : '+ Schedule Arena'}
        </button>
      </div>

      {showForm && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div style={{ fontWeight: 600, marginBottom: 14 }}>New Live Arena Session</div>

          <div className="fg">
            <label className="fl">Approved Quiz <span className="req">*</span></label>
            <select className="fi-sel" value={form.quiz_id} onChange={e => setForm(f => ({ ...f, quiz_id: e.target.value }))}>
              <option value="">Select quiz…</option>
              {quizzes.map(q => <option key={q.id} value={q.id}>{q.title} — {q.subject}</option>)}
            </select>
            {quizzes.length === 0 && (
              <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 4 }}>No approved quizzes yet. Approve quizzes in the SA dashboard first.</div>
            )}
          </div>

          <div className="fg">
            <label className="fl">Scheduled Date & Time <span className="req">*</span></label>
            <input className="fi-in" type="datetime-local" value={form.scheduled_at}
              onChange={e => setForm(f => ({ ...f, scheduled_at: e.target.value }))} />
          </div>

          <div className="fg">
            <label className="fl">Session PIN (auto-generated)</label>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input className="fi-in" value={form.pin} readOnly
                style={{ letterSpacing: 6, fontSize: 20, fontWeight: 700, width: 140 }} />
              <button className="btn btn-s btn-sm" onClick={() => setForm(f => ({ ...f, pin: genPin() }))}>
                🔄 Regenerate
              </button>
            </div>
          </div>

          <button className="btn btn-p btn-sm" onClick={handleCreate} disabled={saving}>
            {saving ? 'Scheduling…' : '📅 Schedule Arena'}
          </button>
        </div>
      )}

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
          <div style={{ width: 24, height: 24, borderRadius: '50%', border: '3px solid #E5E7EB', borderTopColor: '#2563EB', animation: 'spin 0.8s linear infinite' }} />
        </div>
      ) : arenas.length === 0 ? (
        <div className="empty">
          <div className="empty-ic">📅</div>
          <div className="empty-t">No arena sessions yet</div>
          <div className="empty-s">Schedule a session to share with your students.</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {arenas.map(a => {
            const sc = statusCfg[a.status] || statusCfg.waiting;
            return (
              <div key={a.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: 14 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{a.quizzes?.title || 'Arena'}</div>
                    <span style={{ padding: '2px 8px', borderRadius: 10, fontSize: 10, fontWeight: 700, background: sc.bg, color: sc.color }}>{sc.label}</span>
                  </div>
                  <div style={{ fontSize: 12, color: '#6B7280' }}>
                    📅 {fmt(a.scheduled_at)} &nbsp;·&nbsp;
                    PIN: <strong style={{ letterSpacing: 2 }}>{a.pin}</strong>
                  </div>
                  <div style={{ fontSize: 11, color: '#9CA3AF' }}>{a.quizzes?.subject}</div>
                </div>
                {a.status === 'waiting' && (
                  <button onClick={() => setPendingCancelId(a.id)} className="btn btn-d btn-sm" style={{ flexShrink: 0 }}>
                    Cancel
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {pendingCancelId && (
        <ConfirmModal
          message="Cancel this arena session? Participants will not be able to join."
          confirmLabel="Cancel Session"
          onConfirm={() => { const id = pendingCancelId; setPendingCancelId(null); cancelArena(id); }}
          onCancel={() => setPendingCancelId(null)}
        />
      )}
    </div>
  );
}
