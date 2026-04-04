import { useState, useEffect, useRef } from 'react';
import { getDiaryEntry, upsertDiaryEntry } from '../../lib/supabase';
import { trackActivity } from '../../lib/trackActivity';
import { supabase } from '../../lib/supabase';
import { Z } from '../../styles/zIndex';
import { useSubmit } from '../../hooks/useSubmit';

const MOODS = [
  { key: 'great', emoji: '😄', label: 'Great' },
  { key: 'good',  emoji: '😊', label: 'Good' },
  { key: 'okay',  emoji: '😐', label: 'Okay' },
  { key: 'bad',   emoji: '😟', label: 'Bad' },
  { key: 'awful', emoji: '😢', label: 'Awful' },
];

const ACTIVITY_LABELS = {
  quiz_attempted: ['📝', 'Attempted a quiz'],
  quiz_passed: ['✅', 'Passed a quiz'],
  quiz_complete: ['✅', 'Completed a reading quiz'],
  article_read: ['📖', 'Read an article'],
  note_viewed: ['📄', 'Viewed notes'],
  document_downloaded: ['⬇️', 'Downloaded'],
  webinar_attended: ['🎥', 'Attended webinar'],
  daily_login: ['🔑', 'Daily login'],
  clinical_case_logged: ['🏥', 'Logged clinical case'],
  study_plan_completed: ['🗓', 'Study task done'],
  spaced_rep_reviewed: ['🧠', 'Flashcard review'],
  exam_set_completed: ['📝', 'Completed exam set'],
  doubt_asked: ['❓', 'Asked a doubt'],
  diary_entry: ['📒', 'Diary entry'],
};

function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

export default function DiaryPanel({ date, userId, onClose, addToast, onDiarySaved }) {
  const [loading, setLoading] = useState(true);
  const [mood, setMood] = useState(null);
  const [notes, setNotes] = useState('');
  const [studyHours, setStudyHours] = useState(0);
  const [goalsMet, setGoalsMet] = useState(false);
  const [dayLogs, setDayLogs] = useState([]);
  const [isNew, setIsNew] = useState(true);
  const debounceRef = useRef(null);
  const { submit, isSubmitting: saving } = useSubmit({
    onError: (e) => addToast?.('error', 'Could not save diary: ' + e.message),
  });

  useEffect(() => {
    if (!date || !userId) return;
    load();
  }, [date, userId]);

  async function load() {
    setLoading(true);
    try {
      const [{ data: diaryData }, logsRes] = await Promise.all([
        getDiaryEntry(userId, date),
        supabase.from('activity_logs')
          .select('activity_type, score_delta, created_at')
          .eq('user_id', userId)
          .gte('created_at', date + 'T00:00:00')
          .lt('created_at', date + 'T23:59:59')
          .order('created_at', { ascending: false }),
      ]);
      if (diaryData) {
        setMood(diaryData.mood || null);
        setNotes(diaryData.personal_notes || '');
        setStudyHours(diaryData.study_hours || 0);
        setGoalsMet(diaryData.goals_met || false);
        setIsNew(false);
      } else {
        setMood(null); setNotes(''); setStudyHours(0); setGoalsMet(false); setIsNew(true);
      }
      setDayLogs(logsRes.data || []);
    } catch (e) { console.warn('DiaryPanel: failed to load diary entry:', e.message); }
    setLoading(false);
  }

  async function saveDiary(updates) {
    if (!userId || !date) return;
    await submit(async () => {
      const { error } = await upsertDiaryEntry(userId, date, {
        mood: updates.mood ?? mood,
        personal_notes: updates.notes ?? notes,
        study_hours: updates.studyHours ?? studyHours,
        goals_met: updates.goalsMet ?? goalsMet,
      });
      if (error) throw error;
      if (isNew) {
        setIsNew(false);
        trackActivity('diary_entry', date);
        onDiarySaved?.(date);
      }
    });
  }

  function handleNotesChange(val) {
    setNotes(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => saveDiary({ notes: val }), 1000);
  }

  function handleMoodSelect(key) {
    setMood(key);
    saveDiary({ mood: key });
  }

  function handleHoursChange(val) {
    const h = Math.min(24, Math.max(0, Number(val)));
    setStudyHours(h);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => saveDiary({ studyHours: h }), 800);
  }

  function handleGoalsToggle() {
    const next = !goalsMet;
    setGoalsMet(next);
    saveDiary({ goalsMet: next });
  }

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: Z.diary - 10, backdropFilter: 'blur(2px)' }}
      />
      {/* Panel */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, width: '100%', maxWidth: 420,
        background: 'var(--surf)', zIndex: Z.diary, boxShadow: '-8px 0 32px rgba(0,0,0,0.12)',
        display: 'flex', flexDirection: 'column', animation: 'slideInRight .25s ease-out',
        paddingRight: 'env(safe-area-inset-right, 0px)',
      }}>
        {/* Header */}
        <div style={{ padding: '16px 18px', borderBottom: '1px solid #F3F4F6', display: 'flex', alignItems: 'flex-start', gap: 10, minWidth: 0 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: '#111827' }}>📒 Daily Diary</div>
            <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2 }}>{formatDate(date)}</div>
          </div>
          {saving && <div style={{ fontSize: 10, color: '#9CA3AF', paddingTop: 6 }}>Saving…</div>}
          <button onClick={onClose} aria-label="Close diary" style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#9CA3AF', lineHeight: 1, paddingTop: 2 }}>✕</button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {loading ? (
            <>
              {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 60, borderRadius: 10 }} />)}
            </>
          ) : (
            <>
              {/* Mood */}
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 8 }}>How was your day?</div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {MOODS.map(m => (
                    <button
                      key={m.key}
                      onClick={() => handleMoodSelect(m.key)}
                      title={m.label}
                      style={{
                        flex: 1, padding: '8px 4px', borderRadius: 10, border: '2px solid',
                        borderColor: mood === m.key ? '#6366F1' : '#F3F4F6',
                        background: mood === m.key ? '#EEF2FF' : '#F9FAFB',
                        cursor: 'pointer', fontSize: 20, transition: 'all .15s',
                        transform: mood === m.key ? 'scale(1.15)' : 'scale(1)',
                      }}
                    >
                      {m.emoji}
                    </button>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 6 }}>📝 Notes & Reflections</div>
                <textarea
                  className="input"
                  value={notes}
                  onChange={e => handleNotesChange(e.target.value)}
                  placeholder="What did you study? Any key takeaways?"
                  rows={4}
                  style={{ resize: 'vertical', fontFamily: 'inherit', width: '100%', fontSize: 13 }}
                />
              </div>

              {/* Study hours + Goals met */}
              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 6 }}>⏱ Study Hours</div>
                  <input
                    type="number" min={0} max={24} step={0.5}
                    className="input"
                    value={studyHours}
                    onChange={e => handleHoursChange(e.target.value)}
                    style={{ width: '100%' }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 6 }}>🎯 Goals Met?</div>
                  <button
                    onClick={handleGoalsToggle}
                    style={{
                      width: '100%', padding: '9px 0', borderRadius: 8, border: '2px solid',
                      borderColor: goalsMet ? '#10B981' : '#E5E7EB',
                      background: goalsMet ? '#F0FDF4' : '#F9FAFB',
                      color: goalsMet ? '#16A34A' : '#9CA3AF',
                      fontWeight: 700, fontSize: 13, cursor: 'pointer', transition: 'all .15s',
                    }}
                  >
                    {goalsMet ? '✅ Yes!' : '○ Not yet'}
                  </button>
                </div>
              </div>

              {/* Day's activity log */}
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 8 }}>
                  📊 Activity Log ({dayLogs.length})
                </div>
                {dayLogs.length === 0 ? (
                  <div style={{ fontSize: 12, color: '#D1D5DB', textAlign: 'center', padding: '12px 0', fontStyle: 'italic' }}>
                    No activity logged on this day.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                    {dayLogs.map((log, i) => {
                      const [icon, label] = ACTIVITY_LABELS[log.activity_type] || ['📌', log.activity_type.replace(/_/g, ' ')];
                      const t = new Date(log.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
                      return (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#F9FAFB', borderRadius: 8, padding: '7px 10px' }}>
                          <span style={{ fontSize: 16 }}>{icon}</span>
                          <div style={{ flex: 1, fontSize: 12, color: '#374151' }}>{label}</div>
                          <div style={{ fontSize: 10, color: '#9CA3AF' }}>{t}</div>
                          {log.score_delta > 0 && (
                            <span style={{ fontSize: 10, fontWeight: 700, color: '#10B981', background: '#F0FDF4', padding: '1px 6px', borderRadius: 99 }}>+{log.score_delta}</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to   { transform: translateX(0); }
        }
      `}</style>
    </>
  );
}
