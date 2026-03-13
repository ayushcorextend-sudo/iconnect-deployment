/**
 * AIResponseBox — reusable display component for AI-generated responses.
 * Shows loading skeleton, error state, or formatted AI text.
 *
 * Props:
 *   loading  : bool
 *   error    : string | null
 *   text     : string | null  (the AI response)
 *   label    : string         (header label, e.g. "✨ AI Explanation")
 *   onRetry  : function       (optional — shows retry button on error)
 */
export default function AIResponseBox({ loading, error, text, label = '✨ AI Response', onRetry }) {
  if (!loading && !error && !text) return null;

  return (
    <div style={{
      marginTop: 12,
      borderRadius: 12,
      border: '1.5px solid #C7D2FE',
      background: 'linear-gradient(135deg, #EEF2FF, #F0FDF4)',
      overflow: 'hidden',
    }}>
      {/* Header strip */}
      <div style={{
        background: 'linear-gradient(135deg, #4F46E5, #7C3AED)',
        padding: '8px 14px',
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <span style={{ fontSize: 14 }}>✨</span>
        <span style={{ color: '#fff', fontWeight: 700, fontSize: 12 }}>{label}</span>
        <span style={{ marginLeft: 'auto', fontSize: 10, color: 'rgba(255,255,255,0.55)' }}>
          Powered by Gemini
        </span>
      </div>

      <div style={{ padding: '12px 14px' }}>
        {loading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[80, 60, 70, 45].map((w, i) => (
              <div
                key={i}
                className="animate-pulse"
                style={{ height: 10, borderRadius: 99, background: '#C7D2FE', width: `${w}%` }}
              />
            ))}
            <div style={{ fontSize: 11, color: '#6B7280', marginTop: 4 }}>Generating response…</div>
          </div>
        )}

        {!loading && error && (
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
            <span style={{ fontSize: 18 }}>⚠️</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, color: '#DC2626', fontWeight: 600, marginBottom: 4 }}>
                Could not load AI response
              </div>
              <div style={{ fontSize: 12, color: '#6B7280' }}>{error}</div>
              {onRetry && (
                <button
                  onClick={onRetry}
                  style={{
                    marginTop: 8, padding: '5px 12px',
                    background: '#EFF6FF', color: '#2563EB',
                    border: '1px solid #BFDBFE', borderRadius: 8,
                    fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  }}
                >
                  ↺ Retry
                </button>
              )}
            </div>
          </div>
        )}

        {!loading && !error && text && (
          <div style={{ fontSize: 13, color: '#1E1B4B', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
            {text}
          </div>
        )}
      </div>
    </div>
  );
}
