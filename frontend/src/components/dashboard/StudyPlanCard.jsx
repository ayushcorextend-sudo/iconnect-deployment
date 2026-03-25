import AIResponseBox from '../AIResponseBox';
import { generateStudyPlan } from '../../lib/aiService';

export default function StudyPlanCard({ dashLoading, studyPlan, setStudyPlan, mySpeciality, booksRead, myQuizPts, myScore, setPage, activePlan }) {
  if (dashLoading) return null;

  // If there's a structured active plan in DB, show task progress
  if (activePlan?.plan) {
    const tasks = (activePlan.plan || []).flatMap((day, dayIdx) =>
      (day.tasks || []).map((task, taskIdx) => ({ dayIdx, taskIdx, task, day: day.day }))
    );
    const completedMap = activePlan.completed_tasks || {};
    const completedCount = tasks.filter(({ dayIdx, taskIdx }) => completedMap[`${dayIdx}-${taskIdx}`]).length;
    const totalCount = tasks.length;
    const nextTask = tasks.find(({ dayIdx, taskIdx }) => !completedMap[`${dayIdx}-${taskIdx}`]);

    return (
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="ch" style={{ marginBottom: 12 }}>
          <div className="ct">🗓 AI Study Plan</div>
          <button
            className="btn btn-sm"
            style={{ background: 'linear-gradient(135deg,#4F46E5,#7C3AED)', color: '#fff', border: 'none', cursor: 'pointer' }}
            onClick={() => setPage('study-plan')}
          >
            Open Plan →
          </button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 12 }}>
          <div style={{ flex: 1 }}>
            <div style={{ height: 8, background: '#E5E7EB', borderRadius: 99, overflow: 'hidden' }}>
              <div style={{
                height: 8, borderRadius: 99,
                background: 'linear-gradient(90deg,#4F46E5,#7C3AED)',
                width: `${totalCount > 0 ? (completedCount / totalCount) * 100 : 0}%`,
                transition: 'width .4s ease',
              }} />
            </div>
          </div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#4F46E5', whiteSpace: 'nowrap' }}>
            {completedCount}/{totalCount} tasks
          </div>
        </div>
        {nextTask ? (
          <div style={{ fontSize: 12, color: '#6B7280', background: '#F9FAFB', borderRadius: 8, padding: '8px 12px' }}>
            <span style={{ fontWeight: 700, color: '#374151' }}>Next: </span>
            {nextTask.task.subject} — {nextTask.task.activity}
            <span style={{ color: '#9CA3AF', marginLeft: 6 }}>({nextTask.day})</span>
          </div>
        ) : (
          <div style={{ fontSize: 12, color: '#10B981', fontWeight: 700, textAlign: 'center', padding: '6px 0' }}>
            🎉 All tasks complete for this week!
          </div>
        )}
      </div>
    );
  }

  // Legacy: AI text plan
  const handleGenerate = async () => {
    setStudyPlan({ loading: true, text: null, error: null });
    const { text, error } = await generateStudyPlan(mySpeciality, booksRead, myQuizPts, myScore);
    setStudyPlan({ loading: false, text, error });
  };

  return (
    <div className="card" style={{ marginBottom: 20 }}>
      <div className="ch" style={{ marginBottom: 12 }}>
        <div className="ct">🗓 AI Study Plan</div>
        {!studyPlan.loading && (
          <button
            className="btn btn-sm"
            style={{ background: 'linear-gradient(135deg,#4F46E5,#7C3AED)', color: '#fff', border: 'none', cursor: 'pointer' }}
            onClick={handleGenerate}
          >
            {studyPlan.text ? '↺ Regenerate' : '✨ Generate Plan'}
          </button>
        )}
      </div>
      {!studyPlan.loading && !studyPlan.text && !studyPlan.error && (
        <div style={{ textAlign: 'center', padding: '24px 16px' }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>📋</div>
          <div style={{ fontWeight: 700, fontSize: 14, color: '#111827', marginBottom: 4 }}>No active study plan</div>
          <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 14 }}>
            Create a personalised study plan to track your weekly progress
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={() => setPage('study-plan')}
              style={{ background: '#4F46E5', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 20px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
            >
              Create Study Plan
            </button>
            <button
              onClick={handleGenerate}
              style={{ background: 'none', border: '1.5px solid #E5E7EB', borderRadius: 8, padding: '8px 16px', fontSize: 12, fontWeight: 600, color: '#6366F1', cursor: 'pointer' }}
            >
              ✨ Quick AI Plan
            </button>
          </div>
        </div>
      )}
      <AIResponseBox
        loading={studyPlan.loading}
        error={studyPlan.error}
        text={studyPlan.text}
        label="7-Day Study Plan"
        onRetry={handleGenerate}
      />
      {studyPlan.text && (
        <div style={{ marginTop: 12, textAlign: 'right' }}>
          <button
            onClick={() => setPage('study-plan')}
            style={{ background: 'none', border: 'none', color: '#6366F1', fontSize: 12, cursor: 'pointer', fontWeight: 600, textDecoration: 'underline' }}
          >
            📋 Open full Study Plan Engine →
          </button>
        </div>
      )}
    </div>
  );
}
