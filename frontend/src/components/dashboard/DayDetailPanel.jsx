import { useState, useEffect } from 'react';
import { supabase, getDiaryEntry, upsertDiaryEntry } from '../../lib/supabase';
import { Z } from '../../styles/zIndex';

const relTime = (d) => {
  if (!d) return '';
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return '';
  return dt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
};

const ACT_ICONS = {
  quiz_complete: '📝', quiz_passed: '✅', quiz_attempted: '📋',
  article_read: '📖', exam_complete: '🎓', spaced_rep_reviewed: '🧠',
  clinical_case_logged: '🏥', study_session: '📚',
};

export default function DayDetailPanel({ date, userId, onClose, refreshDashboard }) {
  const [loading, setLoading]       = useState(true);
  const [saving, setSaving]         = useState(false);
  const [actLogs, setActLogs]       = useState([]);
  const [diary, setDiary]           = useState(null);
  const [contentState, setContent]  = useState([]);

  // Edit mode
  const [error, setError]           = useState(null);
  const [editMode, setEditMode]     = useState(false);
  const [editNotes, setEditNotes]   = useState('');
  const [editHours, setEditHours]   = useState('');
  const [editGoals, setEditGoals]   = useState(false);

  useEffect(() => {
    if (!date || !userId) return;
    load();
  }, [date, userId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function load() {
    setLoading(true);
    const dayStart = `${date}T00:00:00`;
    const dayEnd   = `${date}T23:59:59`;
    try {
      const [actRes, { data: d }, contentRes] = await Promise.all([
        supabase.from('activity_logs')
          .select('activity_type, duration_minutes, created_at')
          .eq('user_id', userId)
          .gte('created_at', dayStart)
          .lte('created_at', dayEnd)
          .order('created_at', { ascending: true })
          .limit(50),
        getDiaryEntry(userId, date),
        supabase.from('user_content_state')
          .select('content_type, progress_pct, updated_at')
          .eq('user_id', userId)
          .gte('updated_at', dayStart)
          .lte('updated_at', dayEnd)
          .order('updated_at', { ascending: false })
          .limit(10),
      ]);
      setActLogs(actRes.data || []);
      setDiary(d);
      setContent(contentRes.data || []);
      // Pre-populate edit fields
      setEditNotes(d?.personal_notes || '');
      setEditHours(d?.study_hours?.toString() || '');
      setEditGoals(d?.goals_met || false);
    } catch (err) {
      console.warn('[DayDetailPanel] load failed:', err.message);
      setError('Could not load day details. Please try again.');
    }
    setLoading(false);
  }

  async function saveDiary() {
    if (!userId || !date) return;
    setSaving(true);
    try {
      const { error: saveErr } = await upsertDiaryEntry(userId, date, {
        mood: diary?.mood ?? null,
        personal_notes: editNotes,
        study_hours: parseFloat(editHours) || 0,
        goals_met: editGoals,
      });
      if (saveErr) throw saveErr;
      setEditMode(false);
      await load();
      refreshDashboard?.();
    } catch (err) {
      console.warn('[DayDetailPanel] save failed:', err.message);
    }
    setSaving(false);
  }

  function enterEdit() {
    setEditNotes(diary?.personal_notes || '');
    setEditHours(diary?.study_hours?.toString() || '');
    setEditGoals(diary?.goals_met || false);
    setEditMode(true);
  }

  const fmtDate = (d) => {
    if (!d) return '—';
    const dt = new Date(d + 'T00:00:00');
    if (isNaN(dt.getTime())) return '—';
    return dt.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  };

  return (
    <div
      className="fixed inset-0 flex items-center justify-center"
      style={{ zIndex: Z.diary, background: 'rgba(0,0,0,0.4)' }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        className="bg-white rounded-2xl w-full max-h-[85vh] overflow-hidden flex flex-col mx-4"
        style={{ maxWidth: 480, boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <div className="font-extrabold text-sm text-gray-900">📅 {fmtDate(date)}</div>
            <div className="text-xs text-gray-400 mt-0.5">
              {actLogs.length} activit{actLogs.length !== 1 ? 'ies' : 'y'}
              {diary?.study_hours ? ` · ${diary.study_hours}h studied` : ''}
            </div>
          </div>
          <button
            onClick={onClose}
            className="bg-gray-100 border-0 rounded-lg w-8 h-8 cursor-pointer text-sm text-gray-500 hover:bg-gray-200 transition-colors"
          >✕</button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {loading ? (
            <div className="flex justify-center py-10">
              <div className="w-7 h-7 rounded-full border-[3px] border-gray-200 border-t-indigo-600 animate-spin" />
            </div>
          ) : error ? (
            <div className="text-center py-8 px-4">
              <div className="text-3xl mb-2.5">⚠️</div>
              <div className="text-sm text-red-600 mb-3.5">{error}</div>
              <button
                onClick={() => { setError(null); load(); }}
                className="bg-indigo-600 text-white border-0 rounded-lg px-4 py-2 text-xs font-semibold cursor-pointer hover:bg-indigo-700 transition-colors"
              >Retry</button>
            </div>
          ) : (
            <>
              {/* Diary section */}
              {editMode ? (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 mb-3.5">
                  <div className="text-xs font-bold text-amber-800 mb-2.5">📔 Edit Diary Entry</div>
                  <textarea
                    value={editNotes}
                    onChange={e => setEditNotes(e.target.value)}
                    rows={4}
                    placeholder="How did your study session go today?"
                    autoFocus
                    className="w-full rounded-lg border border-amber-200 px-2.5 py-2 text-sm resize-y outline-none box-border bg-yellow-50 font-[inherit] leading-relaxed"
                  />
                  <div className="flex gap-3 mt-2.5 items-center flex-wrap">
                    <div className="flex items-center gap-1.5">
                      <label className="text-xs text-amber-900 font-semibold">⏱ Hours studied:</label>
                      <input
                        type="number"
                        min="0"
                        max="24"
                        step="0.5"
                        value={editHours}
                        onChange={e => setEditHours(e.target.value)}
                        className="w-16 rounded-md border border-amber-200 px-2 py-1 text-sm outline-none bg-yellow-50"
                      />
                    </div>
                    <label className="flex items-center gap-1.5 text-xs text-amber-900 font-semibold cursor-pointer">
                      <input type="checkbox" checked={editGoals} onChange={e => setEditGoals(e.target.checked)} />
                      Goals met today
                    </label>
                  </div>
                  <div className="flex gap-2 mt-3 justify-end">
                    <button
                      onClick={() => setEditMode(false)}
                      className="px-3.5 py-1.5 rounded-lg border border-gray-200 bg-white text-xs font-semibold cursor-pointer text-gray-700 hover:bg-gray-50 transition-colors"
                    >Cancel</button>
                    <button
                      onClick={saveDiary}
                      disabled={saving}
                      className={`px-4 py-1.5 rounded-lg border-0 text-xs font-bold cursor-pointer transition-colors ${saving ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}
                    >{saving ? 'Saving…' : '✓ Save'}</button>
                  </div>
                </div>
              ) : diary?.personal_notes ? (
                <div className="bg-amber-50 border border-amber-200 rounded-xl px-3.5 py-3 mb-3.5">
                  <div className="flex items-center justify-between mb-1">
                    <div className="text-xs font-bold text-amber-800">📔 Diary Note</div>
                    <button
                      onClick={enterEdit}
                      className="bg-transparent border-0 cursor-pointer text-sm text-amber-700 px-1 hover:text-amber-900 transition-colors"
                      title="Edit diary entry"
                    >✏️</button>
                  </div>
                  <div className="text-sm text-amber-900 leading-relaxed">{diary.personal_notes}</div>
                  {diary.study_hours > 0 && (
                    <div className="mt-1.5 text-xs text-amber-800">⏱ {diary.study_hours}h studied</div>
                  )}
                  {diary.goals_met && (
                    <div className="mt-1 text-xs text-emerald-800 font-semibold">✅ Goals met today</div>
                  )}
                </div>
              ) : (
                <div className="mb-3.5">
                  <button
                    onClick={enterEdit}
                    className="w-full py-3 rounded-xl border-2 border-dashed border-amber-200 bg-amber-50 text-amber-700 text-sm font-semibold cursor-pointer flex items-center justify-center gap-1.5 hover:bg-amber-100 transition-colors"
                  >
                    📔 Add diary entry for this day
                  </button>
                </div>
              )}

              {/* Activity list */}
              {actLogs.length === 0 ? (
                <div className="text-center py-6 text-gray-400 text-sm">
                  No activities logged on this day.
                </div>
              ) : (
                <>
                  <div className="text-xs font-bold text-gray-400 tracking-wide mb-2">ACTIVITY LOG</div>
                  {actLogs.map((log, i) => (
                    <div key={i} className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl mb-1.5 bg-gray-50 border border-gray-100">
                      <div className="text-lg w-7 text-center shrink-0">
                        {ACT_ICONS[log.activity_type] || '📌'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-gray-900 capitalize">
                          {log.activity_type?.replace(/_/g, ' ') ?? 'Unknown activity'}
                        </div>
                        {log.duration_minutes > 0 && (
                          <div className="text-xs text-gray-500">{log.duration_minutes} min</div>
                        )}
                      </div>
                      <div className="text-xs text-gray-400 shrink-0">
                        {relTime(log.created_at)}
                      </div>
                    </div>
                  ))}
                </>
              )}

              {/* Content progress */}
              {contentState.length > 0 && (
                <div className="mt-3.5">
                  <div className="text-xs font-bold text-gray-400 tracking-wide mb-2">CONTENT PROGRESS</div>
                  {contentState.map((c, i) => (
                    <div key={i} className="flex items-center gap-2.5 px-3 py-2 rounded-xl mb-1.5 bg-green-50 border border-green-100">
                      <div className="text-base">{c.content_type === 'video' ? '🎬' : '📄'}</div>
                      <div className="flex-1">
                        <div className="h-1 bg-gray-200 rounded overflow-hidden">
                          <div
                            className="h-1 rounded bg-emerald-500 transition-all duration-300"
                            style={{ width: `${c.progress_pct || 0}%` }}
                          />
                        </div>
                      </div>
                      <div className="text-xs text-emerald-600 font-semibold">{c.progress_pct || 0}%</div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
