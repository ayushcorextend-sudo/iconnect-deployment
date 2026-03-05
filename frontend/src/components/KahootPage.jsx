import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { trackActivity } from '../lib/trackActivity';

export default function KahootPage() {
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from('app_settings')
      .select('value')
      .eq('key', 'kahoot_pin')
      .maybeSingle()
      .then(({ data }) => {
        setPin(data?.value || '');
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleJoin = async () => {
    if (!pin) return;
    await trackActivity('webinar_attended', 'kahoot_' + pin);
    window.open('https://kahoot.it?pin=' + pin, '_blank');
  };

  if (loading) return (
    <div className="page">
      <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
        <div style={{ width: 32, height: 32, borderRadius: '50%', border: '3px solid #E5E7EB', borderTopColor: '#4F46E5', animation: 'spin 0.8s linear infinite' }} />
      </div>
    </div>
  );

  return (
    <div className="page">
      <div style={{ maxWidth: 520, margin: '48px auto', textAlign: 'center', padding: '0 16px' }}>
        <div style={{ fontSize: 72, marginBottom: 8 }}>🎮</div>
        <h2 style={{ fontSize: 26, fontWeight: 800, marginBottom: 4 }}>Kahoot Live Quiz</h2>
        <p style={{ color: '#6B7280', marginBottom: 32 }}>Join a live quiz session with your batch</p>

        {pin ? (
          <>
            <div style={{
              background: 'linear-gradient(135deg,#4F46E5,#7C3AED)',
              color: '#fff', borderRadius: 20, padding: '28px 40px',
              margin: '0 0 24px', boxShadow: '0 8px 32px rgba(79,70,229,0.3)',
            }}>
              <div style={{ fontSize: 12, opacity: 0.8, letterSpacing: 2, marginBottom: 6 }}>
                ACTIVE GAME PIN
              </div>
              <div style={{ fontSize: 52, fontWeight: 900, letterSpacing: 10 }}>{pin}</div>
            </div>
            <button onClick={handleJoin} style={{
              background: 'linear-gradient(135deg,#F59E0B,#D97706)',
              color: '#fff', border: 'none', borderRadius: 14,
              padding: '16px 48px', fontSize: 17, fontWeight: 700,
              cursor: 'pointer', boxShadow: '0 4px 16px rgba(245,158,11,0.4)',
            }}>
              🚀 Join Live Quiz
            </button>
            <p style={{ marginTop: 12, color: '#9CA3AF', fontSize: 13 }}>
              Opens kahoot.it in a new tab
            </p>
          </>
        ) : (
          <div style={{ padding: '48px 24px', background: '#F9FAFB', borderRadius: 16, border: '2px dashed #E5E7EB' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>⏳</div>
            <div style={{ fontWeight: 600, fontSize: 16, color: '#374151', marginBottom: 4 }}>
              No live quiz right now
            </div>
            <div style={{ color: '#9CA3AF', fontSize: 14 }}>
              Check back soon — your admin will post the PIN when a quiz goes live!
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
