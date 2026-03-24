import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

const relTime = (d) => {
  if (!d) return '';
  return new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
};

const ACT_ICONS = {
  quiz_complete: '📝', quiz_passed: '✅', quiz_attempted: '📋',
  article_read: '📖', exam_complete: '🎓', spaced_rep_reviewed: '🧠',
  clinical_case_logged: '🏥', study_session: '📚',
};

export default function DayDetailPanel({ date, userId, onClose }) {
  const [loading, setLoading]       = useState(true);
  const [actLogs, setActLogs]       = useState([]);
  const [diary, setDiary]           = useState(null);
  const [contentState, setContent]  = useState([]);

  useEffect(() => {
    if (!date || !userId) return;
    load();
  }, [date, userId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function load() {
    setLoading(true);
    const dayStart = `${date}T00:00:00`;
    const dayEnd   = `${date}T23:59:59`;
    try {
      const [actRes, diaryRes, contentRes] = await Promise.all([
        supabase.from('activity_logs')
          .select('activity_type, duration_minutes, created_at')
          .eq('user_id', userId)
          .gte('created_at', dayStart)
          .lte('created_at', dayEnd)
          .order('created_at', { ascending: true })
          .limit(50),
        supabase.from('calendar_diary')
          .select('personal_notes, study_hours, goals_met')
          .eq('user_id', userId)
          .eq('date', date)
          .maybeSingle(),
        supabase.from('user_content_state')
          .select('content_type, progress_pct, updated_at')
          .eq('user_id', userId)
          .gte('updated_at', dayStart)
          .lte('updated_at', dayEnd)
          .order('updated_at', { ascending: false })
          .limit(10),
      ]);
      setActLogs(actRes.data || []);
      setDiary(diaryRes.data || null);
      setContent(contentRes.data || []);
    } catch (_) {}
    setLoading(false);
  }

  const fmtDate = (d) => new Date(d + 'T00:00:00').toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 500, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#fff', borderRadius: 20, width: '100%', maxWidth: 480,
          maxHeight: '85vh', overflow: 'hidden', display: 'flex', flexDirection: 'column',
          boxShadow: '0 20px 60px rgba(0,0,0,0.25)', margin: '0 16px',
        }}
      >
        {/* Header */}
        <div style={{ padding: '18px 20px 14px', borderBottom: '1px solid #F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 15, color: '#111827' }}>📅 {fmtDate(date)}</div>
            <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2 }}>
              {actLogs.length} activit{actLogs.length !== 1 ? 'ies' : 'y'}
              {diary?.study_hours ? ` · ${diary.study_hours}h studied` : ''}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: '#F3F4F6', border: 'none', borderRadius: 8, width: 32, height: 32, cursor: 'pointer', fontSize: 15, color: '#6B7280' }}
          >✕</button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', border: '3px solid #E5E7EB', borderTopColor: '#4F46E5', animation: 'spin 0.8s linear infinite' }} />
            </div>
          ) : (
            <>
              {/* Diary note */}
              {diary?.personal_notes && (
                <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 12, padding: '12px 14px', marginBottom: 14 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#92400E', marginBottom: 4 }}>📔 Diary Note</div>
                  <div style={{ fontSize: 13, color: '#78350F', lineHeight: 1.6 }}>{diary.personal_notes}</div>
                  {diary.goals_met && (
                    <div style={{ marginTop: 6, fontSize: 11, color: '#065F46', fontWeight: 600 }}>✅ Goals met today</div>
                  )}
                </div>
              )}

              {/* Activity list */}
              {actLogs.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px 0', color: '#9CA3AF', fontSize: 13 }}>
                  No activities logged on this day.
                </div>
              ) : (
                <>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF', letterSpacing: '0.5px', marginBottom: 8 }}>ACTIVITY LOG</div>
                  {actLogs.map((log, i) => (
                    <div key={i} style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '9px 12px', borderRadius: 10, marginBottom: 6,
                      background: '#F9FAFB', border: '1px solid #F3F4F6',
                    }}>
                      <div style={{ fontSize: 18, width: 28, textAlign: 'center', flexShrink: 0 }}>
                        {ACT_ICONS[log.activity_type] || '📌'}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#111827', textTransform: 'capitalize' }}>
                          {log.activity_type.replace(/_/g, ' ')}
                        </div>
                        {log.duration_minutes > 0 && (
                          <div style={{ fontSize: 11, color: '#6B7280' }}>{log.duration_minutes} min</div>
                        )}
                      </div>
                      <div style={{ fontSize: 11, color: '#9CA3AF', flexShrink: 0 }}>
                        {relTime(log.created_at)}
                      </div>
                    </div>
                  ))}
                </>
              )}

              {/* Content progress */}
              {contentState.length > 0 && (
                <div style={{ marginTop: 14 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF', letterSpacing: '0.5px', marginBottom: 8 }}>CONTENT PROGRESS</div>
                  {contentState.map((c, i) => (
                    <div key={i} style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '8px 12px', borderRadius: 10, marginBottom: 6,
                      background: '#F0FDF4', border: '1px solid #D1FAE5',
                    }}>
                      <div style={{ fontSize: 16 }}>{c.content_type === 'video' ? '🎬' : '📄'}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ height: 4, background: '#E5E7EB', borderRadius: 4, overflow: 'hidden' }}>
                          <div style={{ height: 4, borderRadius: 4, background: '#10B981', width: `${c.progress_pct || 0}%`, transition: 'width .3s' }} />
                        </div>
                      </div>
                      <div style={{ fontSize: 11, color: '#059669', fontWeight: 600 }}>{c.progress_pct || 0}%</div>
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
