import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import ClinicalLogger from './ClinicalLogger';
import PersonaBuilder from './PersonaBuilder';
import WeeklyPlanner from './WeeklyPlanner';

const TABS = [
  { key: 'planner', label: '🗓 My Plan', desc: 'AI-generated 7-day schedule' },
  { key: 'logger',  label: '📋 Case Log', desc: 'Log clinical cases' },
  { key: 'persona', label: '🧠 My Persona', desc: 'Learning preferences' },
];

export default function StudyPlanPage({ userId, addToast }) {
  const [tab, setTab] = useState('planner');
  const [uid, setUid] = useState(userId || null);

  useEffect(() => {
    if (uid) return;
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user?.id) setUid(data.user.id);
    });
  }, [uid]);

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '0 0 40px' }}>
      {/* Page header */}
      <div style={{
        background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)',
        borderRadius: 16, padding: '20px 22px', marginBottom: 20, color: '#fff',
        boxShadow: '0 8px 32px rgba(79,70,229,0.2)',
      }}>
        <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>🗓 Study Plan Engine</div>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)' }}>
          Log cases · Build your learning persona · Get an AI-powered 7-day plan
        </div>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex', gap: 6, marginBottom: 20,
        background: '#F3F4F6', borderRadius: 12, padding: 4,
      }}>
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              flex: 1, padding: '9px 8px', borderRadius: 9,
              border: 'none', cursor: 'pointer',
              background: tab === t.key ? '#fff' : 'transparent',
              color: tab === t.key ? '#4F46E5' : '#6B7280',
              fontWeight: tab === t.key ? 700 : 500,
              fontSize: 12,
              boxShadow: tab === t.key ? '0 1px 6px rgba(0,0,0,0.08)' : 'none',
              transition: 'all .15s',
            }}
          >
            <div style={{ fontSize: 14 }}>{t.label.split(' ')[0]}</div>
            <div style={{ fontSize: 10, marginTop: 1 }}>{t.label.split(' ').slice(1).join(' ')}</div>
          </button>
        ))}
      </div>

      {/* Tab descriptions */}
      <div style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 16, textAlign: 'center' }}>
        {TABS.find(t => t.key === tab)?.desc}
      </div>

      {/* Tab content */}
      {uid ? (
        <>
          {tab === 'planner' && <WeeklyPlanner userId={uid} addToast={addToast} />}
          {tab === 'logger'  && <ClinicalLogger userId={uid} addToast={addToast} />}
          {tab === 'persona' && <PersonaBuilder userId={uid} addToast={addToast} />}
        </>
      ) : (
        <div className="card" style={{ textAlign: 'center', padding: '40px 20px', color: '#9CA3AF' }}>
          Loading…
        </div>
      )}
    </div>
  );
}
