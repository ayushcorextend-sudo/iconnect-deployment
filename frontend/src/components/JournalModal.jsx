/**
 * JournalModal — unified diary + activity detail panel.
 *
 * Replaces both DayDetailPanel (Dashboard) and DiaryPanel (Activity page).
 * All Supabase queries go through lib/supabase.js helpers — no raw calls here.
 *
 * Props:
 *   date     {string}   'YYYY-MM-DD' — the day to view/edit
 *   userId   {string}   Supabase user ID
 *   onClose  {()=>void} Called when the modal should close
 *   addToast {fn}       Optional (type, msg) toast emitter
 *   onSave   {fn}       Optional (date, payload) — called after each persist
 *   mode     {string}   'modal' (centered overlay) | 'panel' (slide-in from right)
 */
import { useState, useEffect, useRef } from 'react';
import {
  getDiaryEntry,
  upsertDiaryEntry,
  getActivityLogsForDay,
  getContentProgressForDay,
} from '../lib/supabase';
import { trackActivity } from '../lib/trackActivity';
import { useAppStore } from '../stores/useAppStore';
import { Z } from '../styles/zIndex';

const MOODS = [
  { key: 'great', emoji: '😄', label: 'Great' },
  { key: 'good',  emoji: '😊', label: 'Good' },
  { key: 'okay',  emoji: '😐', label: 'Okay' },
  { key: 'bad',   emoji: '😟', label: 'Bad' },
  { key: 'awful', emoji: '😢', label: 'Awful' },
];

const ACT_ICONS = {
  quiz_complete: '📝', quiz_passed: '✅', quiz_attempted: '📋',
  article_read: '📖', exam_complete: '🎓', spaced_rep_reviewed: '🧠',
  clinical_case_logged: '🏥', study_session: '📚', daily_login: '🔑',
  note_viewed: '📄', webinar_attended: '🎥', diary_entry: '📒',
  doubt_asked: '❓', exam_set_completed: '🎓', study_plan_completed: '🗓',
};

const fmtDate = (d) => new Date(d + 'T00:00:00').toLocaleDateString('en-IN', {
  weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
});
const relTime = (d) => new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

export default function JournalModal({ date, userId, onClose, addToast, onSave, mode = 'modal' }) {
  const setDiaryCache = useAppStore(s => s.setDiaryCache);

  const [loading,    setLoading]    = useState(true);
  const [saving,     setSaving]     = useState(false);
  const [isNew,      setIsNew]      = useState(true);
  const [mood,       setMood]       = useState(null);
  const [notes,      setNotes]      = useState('');
  const [studyHours, setStudyHours] = useState(0);
  const [goalsMet,   setGoalsMet]   = useState(false);
  const [actLogs,    setActLogs]    = useState([]);
  const [content,    setContent]    = useState([]);

  const debounceRef = useRef(null);

  useEffect(() => {
    if (!date || !userId) return;
    load();
    return () => clearTimeout(debounceRef.current);
  }, [date, userId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function load() {
    setLoading(true);
    try {
      const [{ data: diary }, { data: logs }, { data: prog }] = await Promise.all([
        getDiaryEntry(userId, date),
        getActivityLogsForDay(userId, date),
        getContentProgressForDay(userId, date),
      ]);

      if (diary) {
        setMood(diary.mood || null);
        setNotes(diary.personal_notes || '');
        setStudyHours(diary.study_hours || 0);
        setGoalsMet(diary.goals_met || false);
        setIsNew(false);
      } else {
        setMood(null); setNotes(''); setStudyHours(0); setGoalsMet(false); setIsNew(true);
      }
      setActLogs(logs || []);
      setContent(prog || []);
    } catch (_) {
      addToast?.('error', 'Could not load diary entry.');
    }
    setLoading(false);
  }

  async function persist(updates) {
    if (!userId || !date) return;
    setSaving(true);
    const payload = {
      mood:           updates.mood       ?? mood,
      personal_notes: updates.notes      ?? notes,
      study_hours:    updates.studyHours ?? studyHours,
      goals_met:      updates.goalsMet   ?? goalsMet,
    };
    try {
      const { error } = await upsertDiaryEntry(userId, date, payload);
      if (error) throw error;
      // Write to Zustand global cache — enables cross-page heatmap sync
      setDiaryCache(date, payload);
      if (isNew) {
        setIsNew(false);
        trackActivity('diary_entry', date);
      }
      onSave?.(date, payload);
    } catch (e) {
      addToast?.('error', 'Could not save diary: ' + e.message);
    }
    setSaving(false);
  }

  function handleMoodSelect(key) {
    setMood(key);
    persist({ mood: key });
  }
  function handleNotesChange(val) {
    setNotes(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => persist({ notes: val }), 1000);
  }
  function handleHoursChange(val) {
    const h = Math.min(24, Math.max(0, Number(val)));
    setStudyHours(h);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => persist({ studyHours: h }), 800);
  }
  function handleGoalsToggle() {
    const next = !goalsMet;
    setGoalsMet(next);
    persist({ goalsMet: next });
  }

  // ── Shared inner content (identical in both modes) ──────────────────────
  const Header = (
    <div className="flex items-start gap-2.5 px-4 py-3.5 border-b border-gray-100 shrink-0">
      <div className="flex-1 min-w-0">
        <div className="text-sm font-extrabold text-gray-900">📒 Daily Journal</div>
        <div className="text-xs text-gray-400 mt-0.5 truncate">{fmtDate(date)}</div>
      </div>
      {saving && <span className="text-xs text-gray-400 pt-1.5 shrink-0">Saving…</span>}
      <button
        onClick={onClose}
        className="bg-gray-100 border-0 rounded-lg w-8 h-8 cursor-pointer text-sm text-gray-500 hover:bg-gray-200 transition-colors shrink-0 flex items-center justify-center"
        aria-label="Close"
      >✕</button>
    </div>
  );

  const Body = (
    <div className="flex-1 overflow-y-auto px-4 py-4">
      {loading ? (
        <div className="flex justify-center py-10">
          <div className="w-8 h-8 rounded-full border-4 border-gray-200 border-t-indigo-600 animate-spin" />
        </div>
      ) : (
        <div className="flex flex-col gap-4">

          {/* ── Mood picker ── */}
          <div>
            <div className="text-xs font-bold text-gray-700 mb-2">How was your day?</div>
            <div className="flex gap-1.5">
              {MOODS.map(m => (
                <button
                  key={m.key}
                  onClick={() => handleMoodSelect(m.key)}
                  title={m.label}
                  className={`flex-1 py-2 rounded-xl border-2 text-xl cursor-pointer transition-all duration-150 ${
                    mood === m.key
                      ? 'border-indigo-500 bg-indigo-50 scale-110'
                      : 'border-gray-100 bg-gray-50 hover:border-gray-200'
                  }`}
                >{m.emoji}</button>
              ))}
            </div>
          </div>

          {/* ── Notes ── */}
          <div>
            <div className="text-xs font-bold text-gray-700 mb-1.5">📝 Notes & Reflections</div>
            <textarea
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm resize-y outline-none bg-white leading-relaxed focus:border-indigo-400 transition-colors box-border"
              value={notes}
              onChange={e => handleNotesChange(e.target.value)}
              placeholder="What did you study? Any key takeaways?"
              rows={4}
            />
          </div>

          {/* ── Study hours + Goals ── */}
          <div className="flex gap-3">
            <div className="flex-1">
              <div className="text-xs font-bold text-gray-700 mb-1.5">⏱ Study Hours</div>
              <input
                type="number" min={0} max={24} step={0.5}
                value={studyHours}
                onChange={e => handleHoursChange(e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-indigo-400 transition-colors"
              />
            </div>
            <div className="flex-1">
              <div className="text-xs font-bold text-gray-700 mb-1.5">🎯 Goals Met?</div>
              <button
                onClick={handleGoalsToggle}
                className={`w-full py-2 rounded-xl border-2 text-sm font-bold cursor-pointer transition-all duration-150 ${
                  goalsMet
                    ? 'border-emerald-400 bg-emerald-50 text-emerald-700'
                    : 'border-gray-200 bg-gray-50 text-gray-400 hover:border-gray-300'
                }`}
              >{goalsMet ? '✅ Yes!' : '○ Not yet'}</button>
            </div>
          </div>

          {/* ── Activity log ── */}
          {actLogs.length > 0 && (
            <div>
              <div className="text-xs font-bold text-gray-400 tracking-wide mb-2">
                ACTIVITY LOG ({actLogs.length})
              </div>
              <div className="flex flex-col gap-1.5">
                {actLogs.map((log, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-gray-50 border border-gray-100"
                  >
                    <div className="text-lg w-7 text-center shrink-0">
                      {ACT_ICONS[log.activity_type] || '📌'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-gray-900 capitalize">
                        {log.activity_type.replace(/_/g, ' ')}
                      </div>
                      {log.duration_minutes > 0 && (
                        <div className="text-xs text-gray-500">{log.duration_minutes} min</div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {log.score_delta > 0 && (
                        <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full">
                          +{log.score_delta}
                        </span>
                      )}
                      <div className="text-xs text-gray-400">{relTime(log.created_at)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Content progress ── */}
          {content.length > 0 && (
            <div>
              <div className="text-xs font-bold text-gray-400 tracking-wide mb-2">CONTENT PROGRESS</div>
              {content.map((c, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl mb-1.5 bg-emerald-50 border border-emerald-100"
                >
                  <div className="text-base shrink-0">{c.content_type === 'video' ? '🎬' : '📄'}</div>
                  <div className="flex-1">
                    <div className="h-1 bg-gray-200 rounded overflow-hidden">
                      <div
                        className="h-1 rounded bg-emerald-500 transition-all duration-300"
                        style={{ width: `${c.progress_pct || 0}%` }}
                      />
                    </div>
                  </div>
                  <div className="text-xs text-emerald-600 font-semibold shrink-0">
                    {c.progress_pct || 0}%
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── Empty activity state ── */}
          {actLogs.length === 0 && (
            <div className="text-center py-3 text-sm text-gray-400 italic">
              No activities logged on this day.
            </div>
          )}

        </div>
      )}
    </div>
  );

  // ── Panel mode (slide-in from right — Activity page) ───────────────────
  if (mode === 'panel') {
    return (
      <>
        <div
          onClick={onClose}
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.3)',
            zIndex: Z.diary - 10,
            backdropFilter: 'blur(2px)',
          }}
        />
        <div
          style={{
            position: 'fixed', top: 0, right: 0, bottom: 0,
            width: '100%', maxWidth: 420,
            background: '#fff',
            zIndex: Z.diary,
            boxShadow: '-8px 0 32px rgba(0,0,0,0.12)',
            display: 'flex', flexDirection: 'column',
            animation: 'jm-slideIn .25s ease-out',
          }}
        >
          {Header}
          {Body}
        </div>
        <style>{`
          @keyframes jm-slideIn {
            from { transform: translateX(100%); }
            to   { transform: translateX(0); }
          }
        `}</style>
      </>
    );
  }

  // ── Modal mode (centered overlay — Dashboard calendar) ─────────────────
  return (
    <div
      className="fixed inset-0 flex items-center justify-center"
      style={{ zIndex: Z.diary, background: 'rgba(0,0,0,0.4)' }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        className="bg-white rounded-2xl w-full overflow-hidden flex flex-col mx-4"
        style={{ maxWidth: 480, maxHeight: '85vh', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}
      >
        {Header}
        {Body}
      </div>
    </div>
  );
}
