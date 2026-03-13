import { supabase } from '../lib/supabase';

function calculateCompletion(profile) {
  const checks = [
    { done: true,                                   weight: 10 }, // Account always done
    { done: !!profile.name,                         weight: 10 },
    { done: !!profile.phone,                        weight: 10 },
    { done: !!profile.state,                        weight: 5  },
    { done: !!profile.speciality,                   weight: 15 },
    { done: !!profile.college,                      weight: 10 },
    { done: !!profile.mciNumber,                    weight: 15 },
    { done: !!profile.certificateUrl,               weight: 10 },
    { done: profile.verified === true,              weight: 15 },
  ];
  const total  = checks.reduce((s, c) => s + c.weight, 0);
  const filled = checks.reduce((s, c) => s + (c.done ? c.weight : 0), 0);
  return Math.round((filled / total) * 100);
}

// Circular SVG progress ring
function Ring({ pct }) {
  const r = 52;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - pct / 100);
  const color = pct >= 80 ? '#059669' : pct >= 50 ? '#D97706' : '#2563EB';
  return (
    <svg width={128} height={128} viewBox="0 0 128 128">
      <circle cx={64} cy={64} r={r} fill="none" stroke="#F3F4F6" strokeWidth={10} />
      <circle
        cx={64} cy={64} r={r} fill="none" stroke={color} strokeWidth={10}
        strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        transform="rotate(-90 64 64)"
        style={{ transition: 'stroke-dashoffset 0.8s ease' }}
      />
      <text x={64} y={60} textAnchor="middle" fontSize={22} fontWeight="800" fill={color}>{pct}%</text>
      <text x={64} y={78} textAnchor="middle" fontSize={11} fill="#6B7280">complete</text>
    </svg>
  );
}

export default function ProfileCompletionPage({
  name, email, mciNumber, college, speciality,
  phone, state, certificateUrl, verified = false,
  rejectionReason,
}) {
  const handleBackToLogin = async () => {
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  const profile = { name, phone, state, speciality, college, mciNumber, certificateUrl, verified };
  const pct = calculateCompletion(profile);

  const checks = [
    { label: 'Account Created',        done: true,             icon: '🔐' },
    { label: `Name: ${name || '—'}`,   done: !!name,           icon: '👤' },
    { label: 'Phone Number',           done: !!phone,          icon: '📱' },
    { label: 'Home State',             done: !!state,          icon: '📍' },
    { label: `Speciality: ${speciality || '—'}`, done: !!speciality, icon: '🩺' },
    { label: `College: ${college || '—'}`,       done: !!college,    icon: '🏥' },
    { label: `MCI/NMC: ${mciNumber || '—'}`,     done: !!mciNumber,  icon: '🪪' },
    { label: 'Certificate Uploaded',   done: !!certificateUrl, icon: '📄' },
    { label: 'Admin Verification',     done: verified,         icon: '✅' },
  ];

  const verificationStatus = verified
    ? { label: 'Verified ✓', color: '#059669', bg: '#D1FAE5', border: '#6EE7B7' }
    : rejectionReason
      ? { label: 'Rejected', color: '#DC2626', bg: '#FEF2F2', border: '#FECACA' }
      : { label: 'Pending Review', color: '#92400E', bg: '#FFFBEB', border: '#FDE68A' };

  return (
    <>
      <style>{`
        @keyframes pulse { 0%,100%{transform:scale(1);opacity:1} 50%{transform:scale(1.08);opacity:0.8} }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
      <div className="login-bg" style={{ padding: '24px 16px' }}>
        <div style={{
          background: '#fff', borderRadius: 20, padding: '36px 32px',
          maxWidth: 520, width: '100%', margin: '0 auto',
          boxShadow: '0 20px 60px rgba(0,0,0,0.12)',
        }}>
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <div style={{ marginBottom: 16 }}>
              <Ring pct={pct} />
            </div>
            <h2 style={{ color: '#1E1B4B', fontWeight: 800, fontSize: 20, margin: '0 0 6px' }}>
              {verified ? '🎉 Profile Complete!' : 'Registration Submitted!'}
            </h2>
            {name && (
              <p style={{ color: '#6B7280', fontSize: 14, margin: '0 0 4px' }}>
                Thank you, <strong style={{ color: '#111827' }}>{name}</strong>
              </p>
            )}
            <p style={{ color: '#9CA3AF', fontSize: 12, margin: 0 }}>{email}</p>
          </div>

          {/* Verification status badge */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: 8, marginBottom: 20, padding: '10px 16px',
            background: verificationStatus.bg, borderRadius: 10,
            border: `1px solid ${verificationStatus.border}`,
          }}>
            <div style={{
              width: 10, height: 10, borderRadius: '50%',
              background: verificationStatus.color,
              animation: !verified && !rejectionReason ? 'pulse 1.5s ease-in-out infinite' : 'none',
            }} />
            <span style={{ fontSize: 13, fontWeight: 700, color: verificationStatus.color }}>
              {verificationStatus.label}
            </span>
          </div>

          {/* Rejection reason */}
          {rejectionReason && (
            <div style={{
              background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10,
              padding: '12px 14px', marginBottom: 16, fontSize: 13, color: '#DC2626',
            }}>
              <strong>Reason:</strong> {rejectionReason}
              <div style={{ marginTop: 6, fontSize: 12, color: '#6B7280' }}>
                Please contact support@iconnect.in to re-submit your verification.
              </div>
            </div>
          )}

          {/* Pending message */}
          {!verified && !rejectionReason && (
            <p style={{ fontSize: 13, color: '#374151', lineHeight: 1.7, marginBottom: 20, textAlign: 'center' }}>
              Your details have been submitted for review. You will receive an email at{' '}
              <strong>{email}</strong> once approved. This usually takes <strong>24–48 hours</strong>.
            </p>
          )}

          {/* Checklist */}
          <div style={{
            background: '#F9FAFB', borderRadius: 12, padding: '16px',
            marginBottom: 20,
          }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 12 }}>
              Profile Checklist
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {checks.map((c, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  fontSize: 13, color: c.done ? '#374151' : '#9CA3AF',
                }}>
                  <span style={{ fontSize: 16, width: 22, textAlign: 'center' }}>
                    {c.done ? '✅' : c.icon}
                  </span>
                  <span style={{ textDecoration: c.done ? 'none' : 'none', flex: 1 }}>
                    {c.label}
                  </span>
                  {!c.done && (
                    <span style={{
                      fontSize: 10, color: '#D97706', background: '#FFFBEB',
                      border: '1px solid #FDE68A', borderRadius: 99, padding: '1px 7px',
                    }}>
                      {i === 8 ? 'Pending review' : 'Missing'}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* CTA */}
          <button
            onClick={handleBackToLogin}
            style={{
              width: '100%', padding: '13px 0', borderRadius: 10,
              background: '#1E1B4B', color: '#fff', border: 'none',
              fontWeight: 700, fontSize: 14, cursor: 'pointer', marginBottom: 12,
            }}
          >
            ← Back to Login
          </button>
          <p style={{ textAlign: 'center', fontSize: 12, color: '#9CA3AF', margin: 0 }}>
            Questions?{' '}
            <a href="mailto:support@iconnect.in" style={{ color: '#2563EB', textDecoration: 'none' }}>
              support@iconnect.in
            </a>
          </p>
        </div>
      </div>
    </>
  );
}
