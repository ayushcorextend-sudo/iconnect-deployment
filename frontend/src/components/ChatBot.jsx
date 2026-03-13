import { useState, useRef, useEffect } from 'react';
import { askDoubtBuster } from '../lib/aiService';

const RATE_LIMIT = 20; // max messages per day
const RL_KEY = 'iconnect_chatbot_usage';

function getRateLimitData() {
  try {
    const raw = localStorage.getItem(RL_KEY);
    if (!raw) return { date: '', count: 0 };
    return JSON.parse(raw);
  } catch (_) {
    return { date: '', count: 0 };
  }
}

function checkAndIncrementRateLimit() {
  const today = new Date().toISOString().split('T')[0];
  const data = getRateLimitData();
  if (data.date !== today) {
    localStorage.setItem(RL_KEY, JSON.stringify({ date: today, count: 1 }));
    return { allowed: true, remaining: RATE_LIMIT - 1 };
  }
  if (data.count >= RATE_LIMIT) {
    return { allowed: false, remaining: 0 };
  }
  const newCount = data.count + 1;
  localStorage.setItem(RL_KEY, JSON.stringify({ date: today, count: newCount }));
  return { allowed: true, remaining: RATE_LIMIT - newCount };
}

const SUPABASE_URL = 'https://kzxsyeznpudomeqxbnvp.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt6eHN5ZXpucHVkb21lcXhibnZwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIzMjQ1NjEsImV4cCI6MjA4NzkwMDU2MX0.4w2UkRl3rxq2WOiQDmY4aMPGUhQ_5V4W8hridmGmy9o'

const SYSTEM_PROMPT = `You are iConnect Assistant, a helpful AI powered by Google Gemini, embedded in the iConnect medical education platform for PG medical aspirants in India (NEET-PG / AIIMS PG).

Your role:
- Answer questions about medical topics relevant to PG exam preparation (NEET-PG, AIIMS, DNB)
- Help users understand clinical concepts, pharmacology, pathology, surgery, and other PG-relevant subjects
- Provide study tips and exam strategies for Indian PG medical entrance exams
- Assist with understanding e-books, activity scores, and platform features

Keep responses concise (under 300 words unless asked for detail). Use bullet points for lists. Always include a disclaimer for clinical queries that real patient care requires consultation with a qualified physician.`;

export default function ChatBot() {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState('chat'); // 'chat' | 'doubt'
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Hi! I\'m iConnect Assistant. Ask me anything about NEET-PG, medical concepts, or how to use this platform. You have up to 20 questions per day.' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [doubtInput, setDoubtInput] = useState('');
  const [doubtResult, setDoubtResult] = useState({ loading: false, text: null, error: null });
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (open) messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, open]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const rl = checkAndIncrementRateLimit();
    if (!rl.allowed) {
      setError('Daily limit of 20 questions reached. Try again tomorrow.');
      return;
    }

    setInput('');
    setError('');
    const userMsg = { role: 'user', content: text };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setLoading(true);

    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/gemini-proxy`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          system: SYSTEM_PROMPT,
          messages: newMessages.map(m => ({ role: m.role, content: m.content })),
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || `API error ${response.status}`);
      }

      const data = await response.json();
      const assistantText = data.text || 'Sorry, I couldn\'t generate a response.';
      setMessages(prev => [...prev, { role: 'assistant', content: assistantText }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: `⚠️ ${err.message || 'Request failed. Please try again.'}` }]);
    } finally {
      setLoading(false);
    }
  };

  const handleDoubtBuster = async () => {
    const q = doubtInput.trim();
    if (!q || doubtResult.loading) return;
    setDoubtResult({ loading: true, text: null, error: null });
    const { text, error } = await askDoubtBuster(q);
    setDoubtResult({ loading: false, text, error });
  };

  const { count: todayCount } = getRateLimitData();
  const remaining = RATE_LIMIT - (todayCount || 0);

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 999,
          width: 52, height: 52, borderRadius: '50%',
          background: 'linear-gradient(135deg,#4F46E5,#7C3AED)',
          border: 'none', cursor: 'pointer', fontSize: 22,
          boxShadow: '0 4px 20px rgba(79,70,229,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'transform .15s',
        }}
        onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.1)'}
        onMouseLeave={e => e.currentTarget.style.transform = ''}
        title="iConnect AI Assistant"
      >
        {open ? '✕' : '🤖'}
      </button>

      {/* Chat panel */}
      {open && (
        <div style={{
          position: 'fixed', bottom: 88, right: 24, zIndex: 998,
          width: 360, maxHeight: 520, borderRadius: 20,
          background: '#fff', boxShadow: '0 8px 40px rgba(0,0,0,0.18)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
          border: '1px solid #E5E7EB',
        }}>
          {/* Header */}
          <div style={{
            background: 'linear-gradient(135deg,#1E1B4B,#3730A3)',
            padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#F59E0B', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>🤖</div>
            <div style={{ flex: 1 }}>
              <div style={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>iConnect Assistant</div>
              <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11 }}>{remaining} questions remaining today</div>
            </div>
            <button
              onClick={() => setOpen(false)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.6)', fontSize: 18, lineHeight: 1 }}
            >×</button>
          </div>

          {/* Mode toggle */}
          <div style={{ display: 'flex', borderBottom: '1px solid #F3F4F6' }}>
            {[['chat', '💬 Chat'], ['doubt', '🧠 Doubt Buster']].map(([k, l]) => (
              <button
                key={k}
                onClick={() => setMode(k)}
                style={{
                  flex: 1, padding: '8px 0', fontSize: 12, fontWeight: mode === k ? 700 : 500,
                  color: mode === k ? '#4F46E5' : '#9CA3AF',
                  background: 'none', border: 'none', borderBottom: mode === k ? '2px solid #4F46E5' : '2px solid transparent',
                  cursor: 'pointer', transition: 'all .15s',
                }}
              >
                {l}
              </button>
            ))}
          </div>

          {/* Doubt Buster panel */}
          {mode === 'doubt' && (
            <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ fontSize: 12, color: '#6B7280', lineHeight: 1.6 }}>
                Type any NEET-PG doubt and get a <strong>deep, structured explanation</strong> with mnemonics and exam traps.
              </div>
              <textarea
                value={doubtInput}
                onChange={e => setDoubtInput(e.target.value)}
                placeholder="e.g. Why is warfarin contraindicated in pregnancy?"
                rows={3}
                disabled={doubtResult.loading}
                style={{
                  width: '100%', padding: '8px 10px', borderRadius: 10,
                  border: '1.5px solid #E5E7EB', fontSize: 13, resize: 'vertical',
                  fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
                  background: doubtResult.loading ? '#F9FAFB' : '#fff',
                }}
              />
              <button
                onClick={handleDoubtBuster}
                disabled={!doubtInput.trim() || doubtResult.loading}
                style={{
                  padding: '8px', borderRadius: 10,
                  background: !doubtInput.trim() || doubtResult.loading ? '#E5E7EB' : 'linear-gradient(135deg,#4F46E5,#7C3AED)',
                  color: !doubtInput.trim() || doubtResult.loading ? '#9CA3AF' : '#fff',
                  border: 'none', fontWeight: 700, fontSize: 13, cursor: !doubtInput.trim() || doubtResult.loading ? 'not-allowed' : 'pointer',
                }}
              >
                {doubtResult.loading ? '🧠 Thinking…' : '🧠 Bust This Doubt'}
              </button>
              {doubtResult.loading && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {[80, 60, 75, 50].map((w, i) => (
                    <div key={i} className="animate-pulse" style={{ height: 9, borderRadius: 99, background: '#E5E7EB', width: `${w}%` }} />
                  ))}
                </div>
              )}
              {!doubtResult.loading && doubtResult.error && (
                <div style={{ fontSize: 12, color: '#DC2626', background: '#FEF2F2', borderRadius: 8, padding: '8px 12px' }}>
                  ⚠️ {doubtResult.error}
                </div>
              )}
              {!doubtResult.loading && doubtResult.text && (
                <div style={{ background: 'linear-gradient(135deg,#EEF2FF,#F0FDF4)', borderRadius: 12, padding: '12px 14px', border: '1px solid #C7D2FE' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#4F46E5', marginBottom: 8 }}>✨ Doubt Buster — Powered by Gemini</div>
                  <div style={{ fontSize: 13, color: '#1E1B4B', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{doubtResult.text}</div>
                  <button
                    onClick={() => { setDoubtResult({ loading: false, text: null, error: null }); setDoubtInput(''); }}
                    style={{ marginTop: 10, fontSize: 11, color: '#6B7280', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                  >
                    ↺ Ask another
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Messages */}
          {mode === 'chat' && (
            <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              {messages.map((msg, i) => (
                <div key={i} style={{
                  display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                }}>
                  <div style={{
                    maxWidth: '82%', borderRadius: msg.role === 'user' ? '14px 14px 2px 14px' : '14px 14px 14px 2px',
                    padding: '10px 14px', fontSize: 13, lineHeight: 1.5,
                    background: msg.role === 'user' ? 'linear-gradient(135deg,#4F46E5,#3730A3)' : '#F3F4F6',
                    color: msg.role === 'user' ? '#fff' : '#111827',
                    whiteSpace: 'pre-wrap',
                  }}>
                    {msg.content}
                  </div>
                </div>
              ))}
              {loading && (
                <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                  <div style={{ background: '#F3F4F6', borderRadius: '14px 14px 14px 2px', padding: '10px 14px', display: 'flex', gap: 4 }}>
                    {[0, 1, 2].map(i => (
                      <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: '#9CA3AF', animation: `bounce 1s ${i * 0.2}s infinite` }} />
                    ))}
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}

          {/* Chat mode: error + input */}
          {mode === 'chat' && <>
            {error && (
              <div style={{ background: '#FEF2F2', color: '#DC2626', fontSize: 12, padding: '8px 16px', borderTop: '1px solid #FECACA' }}>
                ⚠️ {error}
              </div>
            )}
            <div style={{ borderTop: '1px solid #F3F4F6', padding: '10px 12px', display: 'flex', gap: 8 }}>
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                placeholder="Ask about NEET-PG, medical topics…"
                disabled={loading || remaining <= 0}
                style={{
                  flex: 1, border: '1px solid #E5E7EB', borderRadius: 10,
                  padding: '8px 12px', fontSize: 13, outline: 'none',
                  background: remaining <= 0 ? '#F9FAFB' : '#fff',
                }}
              />
              <button
                onClick={sendMessage}
                disabled={loading || !input.trim() || remaining <= 0}
                style={{
                  width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                  background: loading || !input.trim() || remaining <= 0 ? '#E5E7EB' : 'linear-gradient(135deg,#4F46E5,#3730A3)',
                  border: 'none', cursor: loading || remaining <= 0 ? 'default' : 'pointer',
                  color: '#fff', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                ↑
              </button>
            </div>
          </>}

          <div style={{ textAlign: 'center', fontSize: 10, color: '#9CA3AF', padding: '4px 0 6px', borderTop: '1px solid #F3F4F6' }}>
            Powered by Google Gemini
          </div>

          <style>{`
            @keyframes bounce {
              0%, 100% { transform: translateY(0); }
              50% { transform: translateY(-4px); }
            }
          `}</style>
        </div>
      )}
    </>
  );
}
