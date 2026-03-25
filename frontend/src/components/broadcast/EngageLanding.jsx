import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

/* ═══════════════════════════════════════════════════
   ENGAGE LANDING — cool two-card CTA screen
   ═══════════════════════════════════════════════════ */
export default function EngageLanding({ onSelectDoctors, onSelectCAs, darkMode }) {
  const dm = darkMode;
  const [hovered, setHovered] = useState(null);
  const [stats, setStats]     = useState({ doctors: null, cas: null });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [docRes, caRes] = await Promise.all([
          supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'doctor').eq('status', 'active'),
          supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'contentadmin'),
        ]);
        setStats({ doctors: docRes.count ?? 0, cas: caRes.count ?? 0 });
      } catch (_) {
        setStats({ doctors: 0, cas: 0 });
      }
    };
    fetchStats();
  }, []);

  return (
    <>
      <style>{`
        @keyframes engage-float-1 { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
        @keyframes engage-float-2 { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
        @keyframes engage-glow    { 0%,100%{opacity:0.5} 50%{opacity:1} }
        .engage-float-1 { animation: engage-float-1 4s ease-in-out infinite; }
        .engage-float-2 { animation: engage-float-2 4.5s ease-in-out 0.5s infinite; }
      `}</style>
      <div style={{
        minHeight: 'calc(100vh - 80px)',
        background: dm
          ? 'radial-gradient(ellipse at 30% 40%, #1E3A5F 0%, #0F172A 60%)'
          : 'radial-gradient(ellipse at 30% 40%, #DBEAFE 0%, #F8FAFC 60%)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: 40,
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Background orbs */}
        <div style={{
          position: 'absolute', width: 400, height: 400, borderRadius: '50%', top: -100, right: -100,
          background: dm
            ? 'radial-gradient(circle, rgba(124,58,237,0.15) 0%, transparent 70%)'
            : 'radial-gradient(circle, rgba(124,58,237,0.08) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', width: 300, height: 300, borderRadius: '50%', bottom: -50, left: -50,
          background: dm
            ? 'radial-gradient(circle, rgba(37,99,235,0.15) 0%, transparent 70%)'
            : 'radial-gradient(circle, rgba(37,99,235,0.08) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 56, position: 'relative', zIndex: 1 }}>
          <div className="engage-float-1" style={{ fontSize: 56, marginBottom: 18, display: 'inline-block' }}>⚡</div>
          <div style={{
            fontSize: 42, fontWeight: 900, letterSpacing: '-1px',
            background: 'linear-gradient(135deg, #2563EB 0%, #7C3AED 100%)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            marginBottom: 14, lineHeight: 1.1,
          }}>
            Engage Engine
          </div>
          <div style={{
            fontSize: 16, color: dm ? '#94A3B8' : '#6B7280',
            maxWidth: 460, lineHeight: 1.65, margin: '0 auto',
          }}>
            Send targeted broadcasts, push calendar events, and engage your community with surgical precision.
          </div>
        </div>

        {/* Cards */}
        <div style={{
          display: 'flex', gap: 28, flexWrap: 'wrap', justifyContent: 'center',
          maxWidth: 820, width: '100%', position: 'relative', zIndex: 1,
        }}>

          {/* DOCTORS card */}
          <div
            onClick={onSelectDoctors}
            onMouseEnter={() => setHovered('doctors')}
            onMouseLeave={() => setHovered(null)}
            style={{
              width: 360, padding: 36, borderRadius: 28, cursor: 'pointer',
              background: hovered === 'doctors'
                ? 'linear-gradient(145deg, #1D4ED8, #2563EB, #1E40AF)'
                : (dm ? 'linear-gradient(145deg, #1E293B, #1E3A5F)' : 'linear-gradient(145deg, #EFF6FF, #DBEAFE)'),
              border: `2px solid ${hovered === 'doctors' ? '#3B82F6' : (dm ? '#1E3A5F' : '#BFDBFE')}`,
              transform: hovered === 'doctors' ? 'translateY(-8px) scale(1.01)' : 'translateY(0) scale(1)',
              transition: 'all 0.35s cubic-bezier(0.34,1.56,0.64,1)',
              boxShadow: hovered === 'doctors'
                ? '0 24px 60px rgba(37,99,235,0.45)'
                : (dm ? '0 4px 20px rgba(0,0,0,0.3)' : '0 4px 20px rgba(37,99,235,0.1)'),
            }}
          >
            <div className="engage-float-1" style={{ fontSize: 56, marginBottom: 18, display: 'inline-block' }}>👨‍⚕️</div>
            <div style={{
              fontSize: 24, fontWeight: 900, marginBottom: 10, lineHeight: 1.2,
              color: hovered === 'doctors' ? '#fff' : (dm ? '#F1F5F9' : '#1E40AF'),
            }}>
              Engage with Doctors
            </div>
            <div style={{
              fontSize: 14, lineHeight: 1.7, marginBottom: 24,
              color: hovered === 'doctors' ? 'rgba(255,255,255,0.82)' : (dm ? '#94A3B8' : '#3B82F6'),
            }}>
              Target doctors by speciality, college, state, zone, or performance. Push calendar events and send precision broadcasts.
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{
                padding: '8px 16px', borderRadius: 99, fontWeight: 700, fontSize: 13,
                background: hovered === 'doctors' ? 'rgba(255,255,255,0.2)' : (dm ? '#1E3A5F' : '#DBEAFE'),
                color: hovered === 'doctors' ? '#fff' : (dm ? '#93C5FD' : '#2563EB'),
              }}>
                👨‍⚕️ {stats.doctors !== null ? stats.doctors : '…'} active doctors
              </div>
              <div style={{
                width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: hovered === 'doctors' ? 'rgba(255,255,255,0.2)' : (dm ? '#1E3A5F' : '#DBEAFE'),
                color: hovered === 'doctors' ? '#fff' : (dm ? '#93C5FD' : '#2563EB'),
                fontSize: 16, fontWeight: 700,
                transform: hovered === 'doctors' ? 'translateX(4px)' : 'none',
                transition: 'transform 0.3s ease',
              }}>→</div>
            </div>
          </div>

          {/* CONTENT ADMINS card */}
          <div
            onClick={onSelectCAs}
            onMouseEnter={() => setHovered('cas')}
            onMouseLeave={() => setHovered(null)}
            style={{
              width: 360, padding: 36, borderRadius: 28, cursor: 'pointer',
              background: hovered === 'cas'
                ? 'linear-gradient(145deg, #6D28D9, #7C3AED, #5B21B6)'
                : (dm ? 'linear-gradient(145deg, #1E293B, #1A0F2E)' : 'linear-gradient(145deg, #F5F3FF, #EDE9FE)'),
              border: `2px solid ${hovered === 'cas' ? '#8B5CF6' : (dm ? '#2E1065' : '#C4B5FD')}`,
              transform: hovered === 'cas' ? 'translateY(-8px) scale(1.01)' : 'translateY(0) scale(1)',
              transition: 'all 0.35s cubic-bezier(0.34,1.56,0.64,1)',
              boxShadow: hovered === 'cas'
                ? '0 24px 60px rgba(124,58,237,0.45)'
                : (dm ? '0 4px 20px rgba(0,0,0,0.3)' : '0 4px 20px rgba(124,58,237,0.1)'),
            }}
          >
            <div className="engage-float-2" style={{ fontSize: 56, marginBottom: 18, display: 'inline-block' }}>🎓</div>
            <div style={{
              fontSize: 24, fontWeight: 900, marginBottom: 10, lineHeight: 1.2,
              color: hovered === 'cas' ? '#fff' : (dm ? '#F1F5F9' : '#5B21B6'),
            }}>
              Engage with Content Admins
            </div>
            <div style={{
              fontSize: 14, lineHeight: 1.7, marginBottom: 24,
              color: hovered === 'cas' ? 'rgba(255,255,255,0.82)' : (dm ? '#94A3B8' : '#7C3AED'),
            }}>
              Reach your content creators. Filter by upload volume, approval status, and activity level. Keep the team aligned.
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{
                padding: '8px 16px', borderRadius: 99, fontWeight: 700, fontSize: 13,
                background: hovered === 'cas' ? 'rgba(255,255,255,0.2)' : (dm ? '#2E1065' : '#EDE9FE'),
                color: hovered === 'cas' ? '#fff' : (dm ? '#C4B5FD' : '#7C3AED'),
              }}>
                🎓 {stats.cas !== null ? stats.cas : '…'} content admins
              </div>
              <div style={{
                width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: hovered === 'cas' ? 'rgba(255,255,255,0.2)' : (dm ? '#2E1065' : '#EDE9FE'),
                color: hovered === 'cas' ? '#fff' : (dm ? '#C4B5FD' : '#7C3AED'),
                fontSize: 16, fontWeight: 700,
                transform: hovered === 'cas' ? 'translateX(4px)' : 'none',
                transition: 'transform 0.3s ease',
              }}>→</div>
            </div>
          </div>
        </div>

        <div style={{ marginTop: 44, fontSize: 12, color: dm ? '#475569' : '#9CA3AF', textAlign: 'center', position: 'relative', zIndex: 1 }}>
          💡 Select a target group to begin composing your broadcast
        </div>
      </div>
    </>
  );
}
