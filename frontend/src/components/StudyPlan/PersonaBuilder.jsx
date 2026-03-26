import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { SPECIALITIES } from '../../data/constants';

const ALL_SUBJECTS = [...new Set(Object.values(SPECIALITIES).flat())].sort();

const LEARNING_STYLES = [
  { key: 'visual',      label: 'Visual',      emoji: '👁' },
  { key: 'auditory',    label: 'Auditory',    emoji: '🎧' },
  { key: 'kinesthetic', label: 'Kinesthetic', emoji: '🤲' },
  { key: 'reading',     label: 'Reading',     emoji: '📖' },
];

const PEAK_HOURS = [
  { key: 'morning',   label: 'Morning',   emoji: '🌅' },
  { key: 'afternoon', label: 'Afternoon', emoji: '☀️' },
  { key: 'evening',   label: 'Evening',   emoji: '🌆' },
  { key: 'night',     label: 'Night',     emoji: '🌙' },
];

const BLANK = {
  learning_style: 'visual',
  peak_hours: 'morning',
  weekly_goal_hours: 20,
  weak_subjects: [],
  strong_subjects: [],
  exam_date: '',
};

export default function PersonaBuilder({ userId, addToast }) {
  const [form, setForm] = useState(BLANK);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!userId) return;
    async function load() {
      try {
        const { data } = await supabase
          .from('user_study_persona')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle();
        if (data) {
          setForm({
            learning_style: data.learning_style || 'visual',
            peak_hours: data.peak_hours || 'morning',
            weekly_goal_hours: data.weekly_goal_hours || 20,
            weak_subjects: data.weak_subjects || [],
            strong_subjects: data.strong_subjects || [],
            exam_date: data.exam_date || '',
          });
          setSaved(true);
        }
      } catch (e) { console.warn('PersonaBuilder: failed to load study persona:', e.message); }
      setLoading(false);
    }
    load();
  }, [userId]);

  function toggleSubject(list, key, subject) {
    const current = form[list];
    const other = list === 'weak_subjects' ? 'strong_subjects' : 'weak_subjects';
    // Remove from other list if present
    const cleanOther = form[other].filter(s => s !== subject);
    if (current.includes(subject)) {
      setForm(f => ({ ...f, [list]: current.filter(s => s !== subject), [other]: cleanOther }));
    } else {
      if (current.length >= 5) { addToast?.('info', 'Max 5 subjects per category.'); return; }
      setForm(f => ({ ...f, [list]: [...current, subject], [other]: cleanOther }));
    }
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        user_id: userId,
        learning_style: form.learning_style,
        peak_hours: form.peak_hours,
        weekly_goal_hours: Number(form.weekly_goal_hours) || 20,
        weak_subjects: form.weak_subjects,
        strong_subjects: form.strong_subjects,
        exam_date: form.exam_date || null,
        updated_at: new Date().toISOString(),
      };
      const { error } = await supabase
        .from('user_study_persona')
        .upsert(payload, { onConflict: 'user_id' });
      if (error) throw error;
      setSaved(true);
      addToast?.('success', 'Study persona saved!');
    } catch (e) {
      addToast?.('error', 'Save failed: ' + e.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 64, borderRadius: 12 }} />)}
    </div>
  );

  return (
    <form onSubmit={handleSave}>
      {saved && (
        <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 10, padding: '10px 14px', marginBottom: 14, fontSize: 12, color: '#15803D', fontWeight: 600 }}>
          ✅ Persona saved — AI will use this to personalise your study plan.
        </div>
      )}

      {/* Learning style */}
      <div className="card" style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#111827', marginBottom: 10 }}>🧠 Learning Style</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {LEARNING_STYLES.map(s => (
            <button
              key={s.key} type="button"
              onClick={() => setForm(f => ({ ...f, learning_style: s.key }))}
              style={{
                padding: '8px 16px', borderRadius: 10, fontSize: 13, fontWeight: 600,
                cursor: 'pointer', border: '2px solid',
                borderColor: form.learning_style === s.key ? '#6366F1' : '#E5E7EB',
                background: form.learning_style === s.key ? '#EEF2FF' : '#fff',
                color: form.learning_style === s.key ? '#4F46E5' : '#6B7280',
                transition: 'all .15s',
              }}
            >
              {s.emoji} {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Peak hours */}
      <div className="card" style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#111827', marginBottom: 10 }}>⏰ Peak Study Hours</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {PEAK_HOURS.map(h => (
            <button
              key={h.key} type="button"
              onClick={() => setForm(f => ({ ...f, peak_hours: h.key }))}
              style={{
                padding: '8px 16px', borderRadius: 10, fontSize: 13, fontWeight: 600,
                cursor: 'pointer', border: '2px solid',
                borderColor: form.peak_hours === h.key ? '#6366F1' : '#E5E7EB',
                background: form.peak_hours === h.key ? '#EEF2FF' : '#fff',
                color: form.peak_hours === h.key ? '#4F46E5' : '#6B7280',
                transition: 'all .15s',
              }}
            >
              {h.emoji} {h.label}
            </button>
          ))}
        </div>
      </div>

      {/* Weekly goal + exam date */}
      <div className="card" style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 140px' }}>
            <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 6 }}>
              🎯 Weekly Goal (hours)
            </label>
            <input
              type="number" min={1} max={100} className="input"
              value={form.weekly_goal_hours}
              onChange={e => setForm(f => ({ ...f, weekly_goal_hours: e.target.value }))}
              style={{ width: '100%' }}
            />
          </div>
          <div style={{ flex: '1 1 140px' }}>
            <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 6 }}>
              📅 Exam Date (optional)
            </label>
            <input
              type="date" className="input"
              value={form.exam_date}
              onChange={e => setForm(f => ({ ...f, exam_date: e.target.value }))}
              style={{ width: '100%' }}
            />
          </div>
        </div>
      </div>

      {/* Subject tagging */}
      <div className="card" style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#111827', marginBottom: 4 }}>📚 Tag Your Subjects</div>
        <div style={{ fontSize: 11, color: '#9CA3AF', marginBottom: 10 }}>Click once = Weak Area (red) · Click again = Strong (green) · Click again = remove</div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {ALL_SUBJECTS.slice(0, 30).map(sub => {
            const isWeak = form.weak_subjects.includes(sub);
            const isStrong = form.strong_subjects.includes(sub);
            return (
              <button
                key={sub} type="button"
                onClick={() => {
                  if (!isWeak && !isStrong) toggleSubject('weak_subjects', null, sub);
                  else if (isWeak) toggleSubject('strong_subjects', null, sub);
                  else setForm(f => ({ ...f, strong_subjects: f.strong_subjects.filter(s => s !== sub) }));
                }}
                style={{
                  padding: '4px 10px', borderRadius: 99, fontSize: 11, fontWeight: 600,
                  cursor: 'pointer', border: '1.5px solid',
                  borderColor: isWeak ? '#EF4444' : isStrong ? '#10B981' : '#E5E7EB',
                  background: isWeak ? '#FEF2F2' : isStrong ? '#F0FDF4' : '#F9FAFB',
                  color: isWeak ? '#DC2626' : isStrong ? '#16A34A' : '#9CA3AF',
                  transition: 'all .12s',
                }}
              >
                {sub}
              </button>
            );
          })}
        </div>
        <div style={{ display: 'flex', gap: 16, marginTop: 10, fontSize: 11 }}>
          <span style={{ color: '#DC2626' }}>🔴 Weak: {form.weak_subjects.length}/5</span>
          <span style={{ color: '#16A34A' }}>🟢 Strong: {form.strong_subjects.length}/5</span>
        </div>
      </div>

      <button
        type="submit"
        disabled={saving}
        className="btn btn-p"
        style={{ width: '100%', padding: '12px', fontSize: 14, fontWeight: 700 }}
      >
        {saving ? 'Saving…' : '💾 Save My Persona'}
      </button>
    </form>
  );
}
