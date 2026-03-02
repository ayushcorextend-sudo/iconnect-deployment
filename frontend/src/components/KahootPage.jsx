export default function KahootPage() {
  return (
    <div className="page">
      <div className="ph">
        <div className="pt">🎮 Kahoot Quiz Integration</div>
        <div className="ps">Interactive live quizzes — coming soon</div>
      </div>
      <div className="kahoot-card" style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>🎮</div>
        <div style={{ fontFamily: 'Inter,sans-serif', fontSize: 22, fontWeight: 800, marginBottom: 8 }}>Kahoot! Live Quizzes</div>
        <div style={{ fontSize: 14, color: 'rgba(255,255,255,.6)', marginBottom: 16, maxWidth: 480 }}>
          Real-time competitive quizzes for PG aspirants. Answer NEET-PG MCQs live with your batchmates and see where you rank instantly.
        </div>
        <button style={{ background: 'rgba(255,255,255,.15)', border: '1px solid rgba(255,255,255,.3)', borderRadius: 10, color: 'white', padding: '10px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
          🚧 Coming in Version 3
        </button>
      </div>
      <div className="grid3">
        {[
          { i: '🏆', t: 'Live Competitions', d: 'Real-time quiz battles with peers in your speciality' },
          { i: '📊', t: 'Instant Results', d: 'See your score and rank the moment the quiz ends' },
          { i: '📚', t: 'Subject-wise Sets', d: 'Curated NEET-PG question banks by subject' },
        ].map((f, i) => (
          <div key={i} className="card" style={{ opacity: 0.75 }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>{f.i}</div>
            <div style={{ fontFamily: 'Inter,sans-serif', fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{f.t}</div>
            <div style={{ fontSize: 12, color: '#6B7280' }}>{f.d}</div>
            <span className="bdg bg-a" style={{ marginTop: 10, display: 'inline-block' }}>Placeholder UI</span>
          </div>
        ))}
      </div>
    </div>
  );
}
