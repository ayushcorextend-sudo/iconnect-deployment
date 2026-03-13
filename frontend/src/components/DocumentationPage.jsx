export default function DocumentationPage() {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', minHeight: '60vh',
      color: '#6B7280',
    }}>
      <svg style={{ width: 64, height: 64, marginBottom: 16, opacity: 0.4 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
      <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8, color: '#374151' }}>
        Documentation
      </h2>
      <p style={{ fontSize: 14, opacity: 0.7 }}>Coming soon</p>
    </div>
  );
}
