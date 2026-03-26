import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { getPredictiveAlerts, analyzeKnowledgeGap } from '../../lib/aiService';
import AIResponseBox from '../AIResponseBox';

export default function AIInsightsTab({ users, approved }) {
  const [aiAlerts, setAiAlerts] = useState({ loading: false, text: null, error: null });
  const [aiGap, setAiGap] = useState({ loading: false, text: null, error: null });
  const [subjectScoreMap, setSubjectScoreMap] = useState({});

  const activeCount  = useMemo(() => users.filter(u => u.status === 'active').length, [users]);
  const pendingCount = useMemo(() => users.filter(u => u.status === 'pending').length, [users]);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase
          .from('exam_attempts')
          .select('score, total, exams(subject)')
          .limit(500);
        if (!data?.length) return;
        const bySubject = {};
        data.forEach(a => {
          const subj = a.exams?.subject;
          if (!subj || !a.total) return;
          if (!bySubject[subj]) bySubject[subj] = { sum: 0, count: 0 };
          bySubject[subj].sum += Math.round((a.score / a.total) * 100);
          bySubject[subj].count += 1;
        });
        const result = {};
        Object.entries(bySubject).forEach(([subj, { sum, count }]) => {
          result[subj] = Math.round(sum / count);
        });
        setSubjectScoreMap(result);
      } catch (e) { console.warn('AIInsightsTab: failed to load subject scores:', e.message); }
    })();
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Predictive Engagement Alerts */}
      <div className="card">
        <div className="ch" style={{ marginBottom: 12 }}>
          <div className="ct">🚨 Predictive Engagement Alerts</div>
          <button
            className="btn btn-sm"
            style={{ background: 'linear-gradient(135deg,#4F46E5,#7C3AED)', color: '#fff', border: 'none', cursor: 'pointer' }}
            disabled={aiAlerts.loading}
            onClick={async () => {
              setAiAlerts({ loading: true, text: null, error: null });
              const { text, error } = await getPredictiveAlerts({
                totalUsers: activeCount,
                avgScore: 0,
                inactiveUsers: Math.round(activeCount * 0.3),
                pendingVerifications: pendingCount,
                topSubject: 'Internal Medicine',
              });
              setAiAlerts({ loading: false, text, error });
            }}
          >
            {aiAlerts.loading ? '…' : aiAlerts.text ? '↺ Refresh' : '✨ Analyse'}
          </button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10, marginBottom: 12 }}>
          {[
            { label: 'Total Users', value: users.length, color: '#2563EB', bg: '#EFF6FF' },
            { label: 'Active', value: activeCount, color: '#059669', bg: '#ECFDF5' },
            { label: 'Pending', value: pendingCount, color: '#D97706', bg: '#FFFBEB' },
            { label: 'E-Books', value: approved.length, color: '#7C3AED', bg: '#F5F3FF' },
          ].map(s => (
            <div key={s.label} style={{ background: s.bg, borderRadius: 10, padding: '10px 14px', textAlign: 'center' }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 11, color: '#6B7280', marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>
        <AIResponseBox
          loading={aiAlerts.loading}
          error={aiAlerts.error}
          text={aiAlerts.text}
          label="Engagement Alerts"
          onRetry={async () => {
            setAiAlerts({ loading: true, text: null, error: null });
            const { text, error } = await getPredictiveAlerts({ totalUsers: activeCount, avgScore: 0, inactiveUsers: 0, pendingVerifications: pendingCount, topSubject: 'Internal Medicine' });
            setAiAlerts({ loading: false, text, error });
          }}
        />
        {!aiAlerts.loading && !aiAlerts.text && !aiAlerts.error && (
          <div style={{ textAlign: 'center', color: '#9CA3AF', fontSize: 13, padding: '12px 0' }}>
            Click <strong>✨ Analyse</strong> to generate AI-powered engagement recommendations.
          </div>
        )}
      </div>

      {/* Knowledge Gap Analysis */}
      <div className="card">
        <div className="ch" style={{ marginBottom: 12 }}>
          <div className="ct">🧠 Knowledge Gap Analysis</div>
          <button
            className="btn btn-sm"
            style={{ background: 'linear-gradient(135deg,#059669,#0D9488)', color: '#fff', border: 'none', cursor: 'pointer' }}
            disabled={aiGap.loading}
            onClick={async () => {
              setAiGap({ loading: true, text: null, error: null });
              // Build subject scores from approved artifacts as proxy
              const subjectCounts = {};
              approved.forEach(a => {
                if (a.subject) subjectCounts[a.subject] = (subjectCounts[a.subject] || 0) + 1;
              });
              const subjectScores = Object.entries(subjectCounts).map(([subject, count]) => ({
                subject,
                avgScore: subjectScoreMap[subject] ?? 50,
                attempts: count * 3,
              })).slice(0, 8);
              const { text, error } = await analyzeKnowledgeGap(subjectScores.length ? subjectScores : [{ subject: 'No data yet', avgScore: 0, attempts: 0 }]);
              setAiGap({ loading: false, text, error });
            }}
          >
            {aiGap.loading ? '…' : aiGap.text ? '↺ Refresh' : '✨ Analyse'}
          </button>
        </div>
        <AIResponseBox
          loading={aiGap.loading}
          error={aiGap.error}
          text={aiGap.text}
          label="Knowledge Gap Report"
          onRetry={async () => {
            setAiGap({ loading: true, text: null, error: null });
            const { text, error } = await analyzeKnowledgeGap([{ subject: 'General', avgScore: 50, attempts: 10 }]);
            setAiGap({ loading: false, text, error });
          }}
        />
        {!aiGap.loading && !aiGap.text && !aiGap.error && (
          <div style={{ textAlign: 'center', color: '#9CA3AF', fontSize: 13, padding: '12px 0' }}>
            Click <strong>✨ Analyse</strong> to identify platform-wide knowledge gaps from content data.
          </div>
        )}
      </div>
    </div>
  );
}
