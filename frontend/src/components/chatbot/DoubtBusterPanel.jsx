export default function DoubtBusterPanel({ doubtInput, setDoubtInput, doubtResult, onSubmit, onReset }) {
  return (
    <div className="chatbot-doubt-panel">
      <p className="chatbot-doubt-desc">
        Type any NEET-PG doubt and get a <strong>deep, structured explanation</strong> with mnemonics and exam traps.
      </p>
      <textarea
        value={doubtInput}
        onChange={e => setDoubtInput(e.target.value)}
        placeholder="e.g. Why is warfarin contraindicated in pregnancy?"
        rows={3}
        disabled={doubtResult.loading}
        className="chatbot-doubt-input"
      />
      <button
        onClick={onSubmit}
        disabled={!doubtInput.trim() || doubtResult.loading}
        className={`chatbot-doubt-btn ${!doubtInput.trim() || doubtResult.loading ? 'disabled' : ''}`}
      >
        {doubtResult.loading ? '🧠 Thinking…' : '🧠 Bust This Doubt'}
      </button>

      {doubtResult.loading && (
        <div className="chatbot-doubt-skeleton">
          {[80, 60, 75, 50].map((w, i) => (
            <div key={i} className="skeleton-shimmer" style={{ height: 9, width: `${w}%`, marginBottom: 6 }} />
          ))}
        </div>
      )}

      {!doubtResult.loading && doubtResult.error && (
        <div className="chatbot-error">⚠️ {doubtResult.error}</div>
      )}

      {!doubtResult.loading && doubtResult.text && (
        <div className="chatbot-doubt-result">
          <div className="chatbot-doubt-result-label">✨ Doubt Buster — Powered by Gemini</div>
          <div className="chatbot-doubt-result-text">{doubtResult.text}</div>
          <button onClick={onReset} className="chatbot-doubt-reset">
            ↺ Ask another
          </button>
        </div>
      )}

      <div className="chatbot-footer" style={{ marginTop: 'auto' }}>
        <div className="chatbot-footer-dot" />
        <span>AI-generated suggestions are for academic guidance only. No personal data shared.</span>
      </div>
    </div>
  );
}
