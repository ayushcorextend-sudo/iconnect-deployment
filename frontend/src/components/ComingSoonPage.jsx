export default function ComingSoonPage({ title, icon, desc, features }) {
  return (
    <div className="page">
      <div className="ph">
        <div className="pt">{icon} {title}</div>
        <div className="ps">Coming in a future version</div>
      </div>
      <div className="coming-soon-banner">
        <div style={{ fontSize: 56, marginBottom: 12 }}>{icon}</div>
        <div style={{ fontFamily: 'Inter,sans-serif', fontSize: 22, fontWeight: 800, marginBottom: 8 }}>{title}</div>
        <div style={{ fontSize: 14, color: 'rgba(255,255,255,.55)', maxWidth: 440, margin: '0 auto' }}>{desc}</div>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(255,179,71,.15)', border: '1px solid rgba(255,179,71,.3)', borderRadius: 99, padding: '6px 16px', marginTop: 14, fontSize: 12, color: '#F59E0B', fontWeight: 700 }}>
          🚧 Planned for Version 3
        </div>
      </div>
      <div className="grid2">
        {features.map((f, i) => (
          <div key={i} className="card" style={{ opacity: 0.7 }}>
            <div style={{ fontSize: 26, marginBottom: 8 }}>{f.i}</div>
            <div style={{ fontFamily: 'Inter,sans-serif', fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{f.t}</div>
            <div style={{ fontSize: 12, color: '#6B7280' }}>{f.d}</div>
            <div style={{ marginTop: 10 }}><span className="bdg bg-a">Placeholder</span></div>
          </div>
        ))}
      </div>
    </div>
  );
}
