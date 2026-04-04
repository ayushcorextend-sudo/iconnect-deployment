import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Z } from '../../styles/zIndex';
import { TYPE_CONFIG } from './broadcastTypes';

const SA_TYPE_LABELS = {
  info:    { label: 'Information',       icon: 'ℹ️'  },
  success: { label: '🎉 Congratulations!', icon: '🎉' },
  warn:    { label: '⚠️ Warning',          icon: '⚠️'  },
  error:   { label: '🚨 Important Alert',  icon: '🚨' },
};

/* ═══════════════════════════════════════════════════
   SA MESSAGE BOX — exported, used in dashboards
   Appears as a pulsing floating icon when superadmin
   has broadcast a message. Opens as a letter modal.
   ═══════════════════════════════════════════════════ */
export function SAMessageBox({ userId, darkMode }) {
  const [messages, setMessages]     = useState([]);
  const [loading, setLoading]       = useState(true);
  const [isOpen, setIsOpen]         = useState(false);
  const [isPulsing, setIsPulsing]   = useState(true);
  const dm = darkMode;

  useEffect(() => {
    if (!userId) return;
    loadSAMessages();
  }, [userId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Stop pulse animation after 8s
  useEffect(() => {
    if (messages.length > 0) {
      const t = setTimeout(() => setIsPulsing(false), 8000);
      return () => clearTimeout(t);
    }
  }, [messages.length]);

  const loadSAMessages = async () => {
    setLoading(true);
    try {
      const { data: notifs } = await supabase
        .from('notifications')
        .select('id, title, body, type, icon, created_at, sender_id')
        .eq('user_id', userId)
        .eq('is_read', false)
        .not('sender_id', 'is', null)
        .order('created_at', { ascending: false });

      if (!notifs?.length) { setMessages([]); setLoading(false); return; }

      const senderIds = [...new Set(notifs.map(n => n.sender_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, name, role')
        .in('id', senderIds);

      const profileMap = {};
      (profiles || []).forEach(p => { profileMap[p.id] = p; });

      const saMessages = notifs
        .filter(n => profileMap[n.sender_id]?.role === 'superadmin')
        .map(n => ({
          ...n,
          senderName: profileMap[n.sender_id]?.name || 'Super Admin',
        }));

      setMessages(saMessages);
    } catch (err) {
      console.error('[SAMessageBox] Load failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await supabase.from('notifications').delete().eq('id', id);
      setMessages(prev => prev.filter(m => m.id !== id));
    } catch (err) {
      console.error('[SAMessageBox] Delete failed:', err);
    }
  };

  if (!loading && messages.length === 0) return null;

  return (
    <>
      <style>{`
        @keyframes sa-ring-pulse {
          0%   { box-shadow: 0 0 0 0 rgba(239,68,68,0.7), 0 4px 20px rgba(239,68,68,0.4); transform: scale(1); }
          50%  { box-shadow: 0 0 0 14px rgba(239,68,68,0), 0 4px 20px rgba(239,68,68,0.4); transform: scale(1.08); }
          100% { box-shadow: 0 0 0 0 rgba(239,68,68,0), 0 4px 20px rgba(239,68,68,0.4); transform: scale(1); }
        }
        @keyframes sa-float {
          0%, 100% { transform: translateY(0px); }
          50%       { transform: translateY(-5px); }
        }
        .sa-pulse-anim { animation: sa-ring-pulse 1.4s ease-in-out infinite; }
        .sa-float-anim { animation: sa-float 3s ease-in-out infinite; }
        @keyframes sa-letter-in {
          from { opacity: 0; transform: scale(0.92) translateY(16px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
        .sa-letter-modal { animation: sa-letter-in 0.3s cubic-bezier(0.34,1.56,0.64,1) forwards; }
        @media (max-width: 480px) {
          .sa-trigger { top: 68px !important; right: 8px !important; width: 42px !important; height: 42px !important; font-size: 18px !important; }
          .sa-label   { display: none !important; }
        }
      `}</style>

      {/* ── Floating trigger ── */}
      <div
        title="You have a message from the Super Admin"
        onClick={() => { setIsOpen(true); setIsPulsing(false); }}
        className={`${isPulsing ? 'sa-pulse-anim' : 'sa-float-anim'} sa-trigger`}
        style={{
          position: 'fixed',
          top: 88,
          right: 22,
          zIndex: Z.saMessageTrigger,
          cursor: 'pointer',
          width: 54,
          height: 54,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #EF4444, #DC2626)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 22,
          userSelect: 'none',
        }}
      >
        💌
        {/* Badge */}
        {messages.length > 0 && (
          <div style={{
            position: 'absolute',
            top: -5, right: -5,
            width: 22, height: 22,
            borderRadius: '50%',
            background: '#FCD34D',
            color: '#92400E',
            fontSize: 11, fontWeight: 900,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '2px solid #fff',
            boxShadow: '0 1px 6px rgba(0,0,0,0.25)',
          }}>
            {messages.length}
          </div>
        )}
      </div>
      {/* Label below */}
      <div className="sa-label" style={{
        position: 'fixed',
        top: 144, right: 10, zIndex: Z.saMessageTrigger,
        fontSize: 9, fontWeight: 800, color: '#EF4444',
        textAlign: 'center', letterSpacing: '0.5px',
        textTransform: 'uppercase', whiteSpace: 'nowrap',
        textShadow: dm ? '0 1px 4px rgba(0,0,0,0.8)' : '0 1px 3px rgba(255,255,255,0.9)',
      }}>
        SA Message
      </div>

      {/* ── Modal ── */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: Z.saMessageModal,
            background: 'rgba(0,0,0,0.65)',
            backdropFilter: 'blur(6px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '20px',
          }}
        >
          <div
            className="sa-letter-modal"
            onClick={e => e.stopPropagation()}
            style={{
              width: '100%', maxWidth: 580,
              maxHeight: '82vh',
              background: dm ? '#1E293B' : '#fff',
              borderRadius: 24,
              overflow: 'hidden',
              display: 'flex', flexDirection: 'column',
              boxShadow: '0 30px 80px rgba(0,0,0,0.45)',
            }}
          >
            {/* Header */}
            <div style={{
              padding: '20px 24px',
              background: 'linear-gradient(135deg, #1E1B4B 0%, #312E81 50%, #1E1B4B 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div>
                <div style={{ fontSize: 18, fontWeight: 900, color: '#fff', letterSpacing: '-0.3px' }}>
                  💌 Super Admin Messages
                </div>
                <div style={{ fontSize: 12, color: '#A5B4FC', marginTop: 3 }}>
                  {messages.length} message{messages.length !== 1 ? 's' : ''} · Delete all to dismiss
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                aria-label="Close messages"
                style={{
                  background: 'rgba(255,255,255,0.1)', border: 'none', color: '#E0E7FF',
                  cursor: 'pointer', borderRadius: 10, padding: '8px 12px', fontSize: 16,
                  fontWeight: 700,
                }}
              >✕</button>
            </div>

            {/* Messages */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: 18 }}>
              {messages.map(msg => {
                const tc  = TYPE_CONFIG[msg.type] || TYPE_CONFIG.info;
                const tl  = SA_TYPE_LABELS[msg.type] || SA_TYPE_LABELS.info;
                const dateStr = new Date(msg.created_at).toLocaleDateString('en-US', {
                  weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
                });
                return (
                  <div key={msg.id} style={{
                    border: `2px solid ${dm ? '#334155' : '#E5E7EB'}`,
                    borderRadius: 18,
                    overflow: 'hidden',
                    background: dm ? '#0F172A' : '#FAFAFA',
                  }}>
                    {/* Letter header */}
                    <div style={{
                      padding: '14px 18px',
                      borderBottom: `1px solid ${dm ? '#334155' : '#E5E7EB'}`,
                      background: dm ? '#1E293B' : tc.bg,
                      display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10,
                    }}>
                      <div>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: 5,
                          padding: '4px 12px', borderRadius: 99,
                          background: dm ? tc.color + '22' : '#fff',
                          color: tc.color, fontSize: 12, fontWeight: 700,
                          border: `1px solid ${dm ? tc.color + '44' : tc.border}`,
                          marginBottom: 8,
                        }}>
                          {tl.icon} {tl.label}
                        </span>
                        <div style={{ fontSize: 13, color: dm ? '#CBD5E1' : '#374151' }}>
                          From: <strong style={{ color: dm ? '#F1F5F9' : '#111827' }}>
                            {msg.senderName}
                          </strong> <span style={{ fontSize: 11, color: dm ? '#64748B' : '#9CA3AF' }}>· Super Administrator</span>
                        </div>
                        <div style={{ fontSize: 11, color: dm ? '#64748B' : '#9CA3AF', marginTop: 2 }}>
                          📅 {dateStr}
                        </div>
                      </div>
                      <button
                        onClick={() => handleDelete(msg.id)}
                        style={{
                          background: '#FEE2E2', border: 'none', color: '#DC2626',
                          cursor: 'pointer', borderRadius: 10, padding: '8px 12px',
                          fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap', flexShrink: 0,
                        }}
                      >
                        🗑 Delete
                      </button>
                    </div>

                    {/* Letter body */}
                    <div style={{ padding: '18px 20px' }}>
                      <div style={{ fontSize: 16, fontWeight: 800, color: dm ? '#F1F5F9' : '#111827', marginBottom: 10, lineHeight: 1.4 }}>
                        {msg.icon} {msg.title}
                      </div>
                      <div style={{
                        fontSize: 14, lineHeight: 1.75, color: dm ? '#CBD5E1' : '#374151',
                        whiteSpace: 'pre-wrap',
                      }}>
                        {msg.body}
                      </div>
                      <div style={{
                        marginTop: 18, paddingTop: 14,
                        borderTop: `1px dashed ${dm ? '#334155' : '#E5E7EB'}`,
                        fontSize: 12, color: dm ? '#64748B' : '#9CA3AF',
                        fontStyle: 'italic',
                      }}>
                        — {msg.senderName}, Super Administrator · iConnect Medical Platform
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
