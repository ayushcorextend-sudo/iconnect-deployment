import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { generateContextualPlan } from '../../lib/aiService';
import { trackActivity } from '../../lib/trackActivity';

const DAY_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const DAY_SHORT = { Monday: 'MON', Tuesday: 'TUE', Wednesday: 'WED', Thursday: 'THU', Friday: 'FRI', Saturday: 'SAT', Sunday: 'SUN' };
const DAY_COLORS = ['#6366F1', '#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#3B82F6', '#14B8A6'];

export default function WeeklyPlanner({ userId, addToast }) {
  const [plan, setPlan] = useState(null);
  const [planId, setPlanId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [hasSaved, setHasSaved] = useState(false);
  const [checked, setChecked] = useState({}); // { "dayIndex-taskIndex": bool }
  const [persona, setPersona] = useState(null);
  const [recentCases, setRecentCases] = useState([]);

  // Load saved plan + persona + recent cases on mount
  useEffect(() => {
    if (!userId) return;
    async function init() {
      const [personaRes, casesRes, planRes] = await Promise.all([
        supabase.from('user_study_persona').select('*').eq('user_id', userId).maybeSingle(),
        supabase.from('clinical_logs').select('case_title').eq('user_id', userId).order('logged_at', { ascending: false }).limit(5),
        supabase.from('study_plan_history').select('*').eq('user_id', userId).eq('is_active', true).order('created_at', { ascending: false }).limit(1),
      ]);
      if (personaRes.data) setPersona(personaRes.data);
      if (casesRes.data) setRecentCases(casesRes.data.map(c => c.case_title));
      if (planRes.data?.[0]) {
        setPlan(planRes.data[0].plan);
        setPlanId(planRes.data[0].id);
        setHasSaved(true);
        const savedChecked = planRes.data[0].completed_tasks;
        if (savedChecked && typeof savedChecked === 'object' && !Array.isArray(savedChecked)) {
          setChecked(savedChecked);
        }
      }
    }
    init();
  }, [userId]);

  async function handleGenerate() {
    setLoading(true);
    try {
      const { plan: newPlan, error } = await generateContextualPlan({
        speciality: persona?.speciality || 'General Medicine',
        weakSubjects: persona?.weak_subjects || [],
        strongSubjects: persona?.strong_subjects || [],
        peakHours: persona?.peak_hours || 'morning',
        weeklyGoalHours: persona?.weekly_goal_hours || 20,
        recentCases,
        examDate: persona?.exam_date || null,
      });
      if (error || !newPlan) {
        addToast?.('error', error || 'Could not generate plan. Please try again.');
        return;
      }
      setPlan(newPlan);
      setChecked({});

      // Deactivate old plans, then save new one
      await supabase.from('study_plan_history').update({ is_active: false }).eq('user_id', userId).eq('is_active', true);
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7));
      const { data: savedPlan } = await supabase.from('study_plan_history').insert({
        user_id: userId,
        week_start: weekStart.toISOString().split('T')[0],
        plan: newPlan,
        completed_tasks: {},
        is_active: true,
        ai_generated: true,
      }).select('id').single();
      if (savedPlan) setPlanId(savedPlan.id);
      setHasSaved(true);
      addToast?.('success', '7-day plan generated and saved!');
      trackActivity('study_plan_completed');
    } catch (e) {
      addToast?.('error', 'Generate failed: ' + e.message);
    } finally {
      setLoading(false);
    }
  }

  async function toggleTask(dayIdx, taskIdx) {
    const key = `${dayIdx}-${taskIdx}`;
    const next = { ...checked, [key]: !checked[key] };
    setChecked(next);
    if (planId) {
      await supabase.from('study_plan_history').update({ completed_tasks: next }).eq('id', planId);
    }
  }

  const completedCount = Object.values(checked).filter(Boolean).length;
  const totalTasks = plan ? plan.reduce((s, d) => s + (d.tasks?.length || 0), 0) : 0;

  return (
    <div>
      {/* Header controls */}
      <div className="card" style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>🗓 Your 7-Day AI Study Plan</div>
          {persona ? (
            <div style={{ fontSize: 11, color: '#6B7280', marginTop: 2 }}>
              Personalised for {persona.peak_hours} study · {persona.weekly_goal_hours}h/week goal
            </div>
          ) : (
            <div style={{ fontSize: 11, color: '#F59E0B', marginTop: 2 }}>
              ⚠️ Set your persona first for a personalised plan.
            </div>
          )}
        </div>
        {plan && (
          <div style={{ fontSize: 12, fontWeight: 700, color: '#6366F1', background: '#EEF2FF', padding: '4px 12px', borderRadius: 99 }}>
            {completedCount}/{totalTasks} tasks ✓
          </div>
        )}
        <button
          onClick={handleGenerate}
          disabled={loading}
          className="btn btn-p"
          style={{ padding: '8px 20px', fontSize: 13 }}
        >
          {loading ? '⏳ Generating…' : hasSaved ? '↺ Regenerate Plan' : '✨ Generate Plan'}
        </button>
      </div>

      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[1, 2, 3, 4].map(i => <div key={i} className="skeleton" style={{ height: 80, borderRadius: 12 }} />)}
          <div style={{ textAlign: 'center', fontSize: 12, color: '#9CA3AF' }}>✨ AI is building your personalised plan…</div>
        </div>
      )}

      {!loading && plan && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {DAY_ORDER.map((day, dayIdx) => {
            const dayData = plan.find(d => d.day?.toLowerCase() === day.toLowerCase()) || { day, tasks: [] };
            const color = DAY_COLORS[dayIdx % DAY_COLORS.length];
            const dayChecked = (dayData.tasks || []).filter((_, ti) => checked[`${dayIdx}-${ti}`]).length;
            const allDone = dayData.tasks?.length > 0 && dayChecked === dayData.tasks.length;
            return (
              <div
                key={day}
                style={{
                  border: `1px solid ${color}22`,
                  borderRadius: 12,
                  overflow: 'hidden',
                  opacity: allDone ? 0.7 : 1,
                  transition: 'opacity .2s',
                }}
              >
                {/* Day header */}
                <div style={{
                  background: `linear-gradient(135deg, ${color}18, ${color}08)`,
                  borderBottom: `1px solid ${color}22`,
                  padding: '8px 14px',
                  display: 'flex', alignItems: 'center', gap: 10,
                }}>
                  <span style={{
                    fontSize: 10, fontWeight: 800, letterSpacing: '1px',
                    background: color, color: '#fff',
                    padding: '2px 8px', borderRadius: 6,
                  }}>
                    {DAY_SHORT[day] || day.slice(0, 3).toUpperCase()}
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#111827', flex: 1 }}>{day}</span>
                  <span style={{ fontSize: 11, color: '#9CA3AF' }}>
                    {dayChecked}/{dayData.tasks?.length || 0}
                    {allDone && ' 🎉'}
                  </span>
                </div>

                {/* Tasks */}
                <div style={{ background: '#fff', padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {(dayData.tasks || []).length === 0 ? (
                    <div style={{ fontSize: 12, color: '#D1D5DB', fontStyle: 'italic', padding: '4px 0' }}>Rest day — take a break!</div>
                  ) : (
                    (dayData.tasks || []).map((task, ti) => {
                      const isDone = !!checked[`${dayIdx}-${ti}`];
                      return (
                        <div
                          key={ti}
                          onClick={() => toggleTask(dayIdx, ti)}
                          style={{
                            display: 'flex', alignItems: 'flex-start', gap: 10,
                            padding: '7px 10px', borderRadius: 8, cursor: 'pointer',
                            background: isDone ? '#F0FDF4' : '#F9FAFB',
                            border: `1px solid ${isDone ? '#BBF7D0' : '#F3F4F6'}`,
                            transition: 'all .15s',
                          }}
                        >
                          <div style={{
                            width: 18, height: 18, borderRadius: 5, flexShrink: 0, marginTop: 1,
                            border: `2px solid ${isDone ? '#10B981' : '#D1D5DB'}`,
                            background: isDone ? '#10B981' : 'transparent',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            transition: 'all .15s',
                          }}>
                            {isDone && <span style={{ color: '#fff', fontSize: 11, lineHeight: 1 }}>✓</span>}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 12, fontWeight: 600, color: isDone ? '#6B7280' : '#111827', textDecoration: isDone ? 'line-through' : 'none' }}>
                              {task.subject}
                            </div>
                            <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 1 }}>
                              {task.activity}{task.duration_mins ? ` · ${task.duration_mins} min` : ''}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!loading && !plan && (
        <div style={{
          background: 'linear-gradient(135deg, #EEF2FF, #F5F3FF)',
          borderRadius: 16, padding: '32px 20px',
          textAlign: 'center', border: '2px dashed #C7D2FE',
        }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🗓</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#4F46E5', marginBottom: 6 }}>No plan yet</div>
          <div style={{ fontSize: 13, color: '#6B7280', marginBottom: 16 }}>
            {persona
              ? 'Click Generate Plan to create your AI-powered weekly schedule.'
              : 'Complete your Persona first, then generate a personalised plan.'}
          </div>
          <button
            onClick={handleGenerate}
            disabled={loading}
            className="btn btn-p"
            style={{ padding: '10px 24px', fontSize: 14 }}
          >
            ✨ Generate My Plan
          </button>
        </div>
      )}
    </div>
  );
}
