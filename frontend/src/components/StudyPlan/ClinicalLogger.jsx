import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { trackActivity } from '../../lib/trackActivity';

const DIFFICULTIES = ['easy', 'medium', 'hard'];
const DIFF_COLORS = { easy: '#10B981', medium: '#F59E0B', hard: '#EF4444' };

const BLANK = { case_title: '', speciality: '', learning_points: '', difficulty: 'medium' };

export default function ClinicalLogger({ userId, addToast }) {
  const [form, setForm] = useState(BLANK);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState(null);

  useEffect(() => { if (userId) fetchLogs(); }, [userId]);

  async function fetchLogs() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('clinical_logs')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      setLogs(data || []);
    } catch (e) {
      addToast?.('error', 'Could not load clinical logs.');
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.case_title.trim()) { addToast?.('error', 'Case title is required.'); return; }
    setSaving(true);
    try {
      const { data: inserted, error } = await supabase.from('clinical_logs').insert({
        user_id: userId,
        case_title: form.case_title.trim(),
        speciality: form.speciality.trim(),
        learning_points: form.learning_points.trim(),
        difficulty: form.difficulty,
      }).select('id').single();
      if (error) throw error;
      addToast?.('success', 'Case logged!');
      setForm(BLANK);
      await fetchLogs();
      trackActivity('clinical_case_logged', inserted?.id || '');
    } catch (e) {
      addToast?.('error', 'Failed to save: ' + e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    try {
      await supabase.from('clinical_logs').delete().eq('id', id).eq('user_id', userId);
      setLogs(prev => prev.filter(l => l.id !== id));
      addToast?.('success', 'Log deleted.');
    } catch (_) {
      addToast?.('error', 'Delete failed.');
    }
  }

  const relTime = ts => {
    if (!ts) return '';
    const diff = Date.now() - new Date(ts);
    const d = Math.floor(diff / 86400000);
    if (d === 0) return 'Today';
    if (d === 1) return 'Yesterday';
    return `${d}d ago`;
  };

  return (
    <div>
      {/* Log form */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="ch" style={{ marginBottom: 14 }}>
          <div className="ct">📋 Log a Clinical Case</div>
        </div>
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <input
              className="input"
              placeholder="Case title (e.g. 45yo with acute chest pain)"
              value={form.case_title}
              onChange={e => setForm(f => ({ ...f, case_title: e.target.value }))}
              maxLength={120}
              required
            />
            <input
              className="input"
              placeholder="Speciality (e.g. Cardiology)"
              value={form.speciality}
              onChange={e => setForm(f => ({ ...f, speciality: e.target.value }))}
              maxLength={60}
            />
            <textarea
              className="input"
              placeholder="Key learnings from this case..."
              value={form.learning_points}
              onChange={e => setForm(f => ({ ...f, learning_points: e.target.value }))}
              rows={3}
              style={{ resize: 'vertical', fontFamily: 'inherit' }}
            />
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: '#6B7280', fontWeight: 600 }}>Difficulty:</span>
              {DIFFICULTIES.map(d => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, difficulty: d }))}
                  style={{
                    padding: '4px 12px', borderRadius: 99, fontSize: 12, fontWeight: 600,
                    cursor: 'pointer', border: '2px solid',
                    borderColor: form.difficulty === d ? DIFF_COLORS[d] : '#E5E7EB',
                    background: form.difficulty === d ? DIFF_COLORS[d] + '18' : 'transparent',
                    color: form.difficulty === d ? DIFF_COLORS[d] : '#9CA3AF',
                    transition: 'all .15s',
                  }}
                >
                  {d.charAt(0).toUpperCase() + d.slice(1)}
                </button>
              ))}
              <button
                type="submit"
                disabled={saving}
                className="btn btn-p"
                style={{ marginLeft: 'auto', padding: '6px 18px', fontSize: 13 }}
              >
                {saving ? 'Saving…' : '+ Log Case'}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Recent logs */}
      <div className="card">
        <div className="ch" style={{ marginBottom: 12 }}>
          <div className="ct">📁 Recent Cases ({logs.length})</div>
        </div>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[1, 2, 3].map(i => (
              <div key={i} className="skeleton" style={{ height: 52, borderRadius: 10 }} />
            ))}
          </div>
        ) : logs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px 0', color: '#9CA3AF', fontSize: 13 }}>
            No cases logged yet. Start building your clinical log above!
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {logs.map(log => (
              <div
                key={log.id}
                style={{
                  border: '1px solid #F3F4F6', borderRadius: 10,
                  overflow: 'hidden',
                  borderLeftWidth: 3,
                  borderLeftColor: DIFF_COLORS[log.difficulty] || '#D1D5DB',
                }}
              >
                <div
                  onClick={() => setExpanded(expanded === log.id ? null : log.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 12px', cursor: 'pointer',
                    background: expanded === log.id ? '#F9FAFB' : '#fff',
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {log.case_title}
                    </div>
                    <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>
                      {log.speciality && <span style={{ marginRight: 8 }}>🏥 {log.speciality}</span>}
                      {relTime(log.created_at)}
                    </div>
                  </div>
                  <span style={{
                    padding: '2px 8px', borderRadius: 99, fontSize: 10, fontWeight: 700,
                    background: DIFF_COLORS[log.difficulty] + '18',
                    color: DIFF_COLORS[log.difficulty],
                  }}>
                    {log.difficulty}
                  </span>
                  <span style={{ color: '#D1D5DB', fontSize: 14 }}>{expanded === log.id ? '▲' : '▼'}</span>
                </div>
                {expanded === log.id && (
                  <div style={{ padding: '10px 12px', borderTop: '1px solid #F3F4F6', background: '#FAFAFA' }}>
                    <p style={{ fontSize: 12, color: '#374151', margin: 0, whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                      {log.key_learnings || <em style={{ color: '#9CA3AF' }}>No learnings noted.</em>}
                    </p>
                    <button
                      onClick={() => handleDelete(log.id)}
                      style={{ marginTop: 8, background: 'none', border: 'none', color: '#EF4444', fontSize: 11, cursor: 'pointer', padding: 0 }}
                    >
                      🗑 Delete
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
