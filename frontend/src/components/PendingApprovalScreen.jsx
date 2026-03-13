import { supabase } from '../lib/supabase';

export default function PendingApprovalScreen({ name, email, mciNumber, college }) {
  const handleBackToLogin = async () => {
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  return (
    <>
      <style>{`
        @keyframes pulse { 0%,100%{transform:scale(1);opacity:1} 50%{transform:scale(1.12);opacity:0.75} }
        @keyframes dotPulse { 0%,100%{opacity:1} 50%{opacity:0.3} }
      `}</style>
      <div className="login-bg">
        <div style={{
          background: '#fff', borderRadius: 20, padding: '40px',
          maxWidth: 480, width: '100%', margin: '0 auto',
          boxShadow: '0 20px 60px rgba(0,0,0,0.12)',
        }}>
          <div style={{ textAlign: 'center', marginBottom: 20 }}>
            <span style={{ fontSize: 64, display: 'inline-block', animation: 'pulse 2s ease-in-out infinite' }}>⏳</span>
          </div>

          <h2 style={{ textAlign: 'center', color: '#1E1B4B', fontWeight: 800, fontSize: 22, margin: '0 0 8px' }}>
            Registration Submitted!
          </h2>
          <p style={{ textAlign: 'center', color: '#6B7280', fontSize: 15, margin: '0 0 16px' }}>
            Thank you, <strong style={{ color: '#111827' }}>{name}</strong>!
          </p>
          <p style={{ fontSize: 13, color: '#374151', lineHeight: 1.7, marginBottom: 24, textAlign: 'center' }}>
            Your details have been submitted for review by the iConnect admin team.
            You will receive an email at <strong>{email}</strong> once your account
            is approved. This usually takes 24–48 hours.
          </p>

          {/* Info cards */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
            {[
              { icon: '📋', label: 'MCI Number', value: mciNumber || '—' },
              { icon: '🏥', label: 'College', value: college || '—' },
              { icon: '📧', label: 'Email', value: email || '—' },
            ].map(item => (
              <div key={item.label} style={{
                flex: 1, background: '#F8FAFC', borderRadius: 12,
                padding: '14px 8px', textAlign: 'center',
                border: '1px solid #E5E7EB',
              }}>
                <div style={{ fontSize: 22, marginBottom: 6 }}>{item.icon}</div>
                <div style={{ fontSize: 10, color: '#9CA3AF', fontWeight: 700, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  {item.label}
                </div>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#111827', wordBreak: 'break-all', lineHeight: 1.4 }}>
                  {item.value}
                </div>
              </div>
            ))}
          </div>

          {/* Pulsing status */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: 8, marginBottom: 28, padding: '10px 16px',
            background: '#FFFBEB', borderRadius: 10, border: '1px solid #FDE68A',
          }}>
            <div style={{
              width: 10, height: 10, borderRadius: '50%',
              background: '#F59E0B', animation: 'dotPulse 1.5s ease-in-out infinite',
            }} />
            <span style={{ fontSize: 13, fontWeight: 600, color: '#92400E' }}>Pending Review</span>
          </div>

          <button
            onClick={handleBackToLogin}
            style={{
              width: '100%', padding: '13px 0', borderRadius: 10,
              background: '#1E1B4B', color: '#fff', border: 'none',
              fontWeight: 700, fontSize: 14, cursor: 'pointer', marginBottom: 16,
            }}
          >
            ← Back to Login
          </button>

          <p style={{ textAlign: 'center', fontSize: 12, color: '#9CA3AF', margin: 0 }}>
            Questions? Contact{' '}
            <a href="mailto:support@iconnect.in" style={{ color: '#2563EB', textDecoration: 'none' }}>
              support@iconnect.in
            </a>
          </p>
        </div>
      </div>
    </>
  );
}
