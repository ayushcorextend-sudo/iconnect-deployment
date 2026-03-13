import { useState } from 'react';
import { getClinicalCase } from '../lib/aiService';
import AIResponseBox from './AIResponseBox';
import { SPECIALITIES } from '../data/constants';

// Flatten all specialities into one sorted list
const ALL_SPECIALITIES = [...new Set(Object.values(SPECIALITIES).flat())].sort();

export default function CaseSimulator({ addToast }) {
  const [speciality, setSpeciality] = useState('Internal Medicine');
  const [caseState, setCaseState] = useState({ loading: false, text: null, error: null });
  const [history, setHistory] = useState([]); // last 5 cases

  const generateCase = async () => {
    setCaseState({ loading: true, text: null, error: null });
    const { text, error } = await getClinicalCase(speciality);
    if (text) {
      setHistory(prev => [{ speciality, text, ts: new Date() }, ...prev].slice(0, 5));
    }
    setCaseState({ loading: false, text, error });
  };

  return (
    <div className="page">
      <div className="ph">
        <div className="pt">🏥 Case Simulator</div>
        <div className="ps">AI-generated NEET-PG style clinical vignettes — practice with realistic cases</div>
      </div>

      {/* Controls */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ flex: '1 1 220px' }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>
              Speciality
            </label>
            <select
              value={speciality}
              onChange={e => setSpeciality(e.target.value)}
              style={{
                width: '100%', padding: '9px 12px', border: '1.5px solid #E5E7EB',
                borderRadius: 8, fontSize: 13, background: '#fff',
                color: '#111827', outline: 'none',
              }}
            >
              {ALL_SPECIALITIES.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <button
            onClick={generateCase}
            disabled={caseState.loading}
            style={{
              padding: '9px 22px',
              background: caseState.loading
                ? '#E5E7EB'
                : 'linear-gradient(135deg,#4F46E5,#7C3AED)',
              color: caseState.loading ? '#9CA3AF' : '#fff',
              border: 'none', borderRadius: 8,
              fontSize: 13, fontWeight: 700,
              cursor: caseState.loading ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', gap: 8,
              transition: 'opacity .15s',
            }}
          >
            {caseState.loading ? (
              <>
                <span style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} />
                Generating…
              </>
            ) : (
              <>🩺 Generate Case</>
            )}
          </button>
        </div>
      </div>

      {/* Current case */}
      <div style={{ marginBottom: 24 }}>
        <AIResponseBox
          loading={caseState.loading}
          error={caseState.error}
          text={caseState.text}
          label={`Clinical Case — ${speciality}`}
          onRetry={generateCase}
        />
        {!caseState.loading && !caseState.text && !caseState.error && (
          <div style={{
            textAlign: 'center', padding: '48px 24px',
            background: '#F9FAFB', borderRadius: 16, border: '2px dashed #E5E7EB',
          }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🏥</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#374151', marginBottom: 6 }}>
              Ready for a clinical challenge?
            </div>
            <div style={{ fontSize: 13, color: '#6B7280', marginBottom: 20 }}>
              Select a speciality above and click <strong>Generate Case</strong> to get a NEET-PG style vignette with MCQ.
            </div>
            <button
              onClick={generateCase}
              style={{
                padding: '10px 28px',
                background: 'linear-gradient(135deg,#4F46E5,#7C3AED)',
                color: '#fff', border: 'none', borderRadius: 10,
                fontSize: 13, fontWeight: 700, cursor: 'pointer',
              }}
            >
              🩺 Generate Case
            </button>
          </div>
        )}
      </div>

      {/* Case history */}
      {history.length > 0 && (
        <div className="card">
          <div className="ct" style={{ marginBottom: 14 }}>📋 Recent Cases</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {history.map((h, i) => (
              <div
                key={i}
                style={{
                  padding: '10px 14px', borderRadius: 10,
                  background: '#F9FAFB', border: '1px solid #F3F4F6',
                  cursor: 'pointer',
                  transition: 'background .15s',
                }}
                onClick={() => setCaseState({ loading: false, text: h.text, error: null })}
                onMouseEnter={e => e.currentTarget.style.background = '#EFF6FF'}
                onMouseLeave={e => e.currentTarget.style.background = '#F9FAFB'}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>🩺 {h.speciality}</span>
                  <span style={{ fontSize: 11, color: '#9CA3AF' }}>
                    {h.ts.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div style={{ fontSize: 12, color: '#6B7280', marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {h.text.substring(0, 100)}…
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
