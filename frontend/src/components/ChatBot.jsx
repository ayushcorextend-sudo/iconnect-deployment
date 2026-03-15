import { useState, useRef, useEffect } from 'react';
import { askDoubtBuster } from '../lib/aiService';
import { Sparkles, X, Send, Brain, MessageCircle } from 'lucide-react';

const RATE_LIMIT = 20;
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
  if (data.count >= RATE_LIMIT) return { allowed: false, remaining: 0 };
  const newCount = data.count + 1;
  localStorage.setItem(RL_KEY, JSON.stringify({ date: today, count: newCount }));
  return { allowed: true, remaining: RATE_LIMIT - newCount };
}

const SUPABASE_URL = 'https://kzxsyeznpudomeqxbnvp.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt6eHN5ZXpucHVkb21lcXhibnZwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIzMjQ1NjEsImV4cCI6MjA4NzkwMDU2MX0.4w2UkRl3rxq2WOiQDmY4aMPGUhQ_5V4W8hridmGmy9o';

const SYSTEM_PROMPT = `You are iConnect Assistant, a helpful AI powered by Google Gemini, embedded in the iConnect medical education platform for PG medical aspirants in India (NEET-PG / AIIMS PG).

Your role:
- Answer questions about medical topics relevant to PG exam preparation (NEET-PG, AIIMS, DNB)
- Help users understand clinical concepts, pharmacology, pathology, surgery, and other PG-relevant subjects
- Provide study tips and exam strategies for Indian PG medical entrance exams
- Assist with understanding e-books, activity scores, and platform features

Keep responses concise (under 300 words unless asked for detail). Use bullet points for lists. Always include a disclaimer for clinical queries that real patient care requires consultation with a qualified physician.`;

const QUICK_ACTIONS = [
  { icon: <Sparkles size={13} />, label: 'Suggest topics', prompt: 'Suggest important topics I should study for NEET-PG based on my specialization.' },
  { icon: <Brain size={13} />, label: 'What should I read next?', prompt: 'What should I read next to improve my exam preparation?' },
  { icon: <MessageCircle size={13} />, label: 'Review my research activity', prompt: 'Give me tips on how to make the most of my research and reading activity on iConnect.' },
  { icon: <Brain size={13} />, label: 'Organize my notes', prompt: 'How should I organize my notes and highlights for effective revision?' },
];

export default function ChatBot({ chatBotMode = null, setChatBotMode }) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState('chat');
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [doubtInput, setDoubtInput] = useState('');
  const [doubtResult, setDoubtResult] = useState({ loading: false, text: null, error: null });
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [messages, open]);

  useEffect(() => {
    if (!chatBotMode) return;
    setOpen(true);
    setMode(chatBotMode);
    if (setChatBotMode) setChatBotMode(null);
  }, [chatBotMode]);

  // Lock body scroll when panel open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  const sendMessage = async (text) => {
    const textToSend = (text || input).trim();
    if (!textToSend || loading) return;

    const rl = checkAndIncrementRateLimit();
    if (!rl.allowed) {
      setError('Daily limit of 20 questions reached. Try again tomorrow.');
      return;
    }

    setInput('');
    setError('');
    const userMsg = { role: 'user', content: textToSend };
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
  const hasMessages = messages.length > 0;

  return (
    <>
      {/* ── Floating trigger button ── */}
      <button
        onClick={() => setOpen(o => !o)}
        className="chatbot-fab"
        title="iConnect AI Assistant"
      >
        {open
          ? <X size={20} />
          : <Sparkles size={22} />
        }
      </button>

      {/* ── Backdrop blur overlay ── */}
      {open && (
        <div className="chatbot-backdrop" onClick={() => setOpen(false)} />
      )}

      {/* ── Right-side drawer panel ── */}
      <div className={`chatbot-drawer ${open ? 'chatbot-drawer-open' : ''}`}>

        {/* Header */}
        <div className="chatbot-header">
          <div className="chatbot-header-icon">
            <Sparkles size={18} />
          </div>
          <div className="chatbot-header-text">
            <div className="chatbot-header-title">iConnect Assistant</div>
            <div className="chatbot-header-sub">AI-powered academic guidance</div>
          </div>
          <button className="chatbot-close-btn" onClick={() => setOpen(false)}>
            <X size={18} />
          </button>
        </div>

        {/* Mode Tabs */}
        <div className="chatbot-tabs">
          {[['chat', '💬 Chat'], ['doubt', '🧠 Doubt Buster']].map(([k, l]) => (
            <button
              key={k}
              onClick={() => setMode(k)}
              className={`chatbot-tab ${mode === k ? 'active' : ''}`}
            >
              {l}
            </button>
          ))}
        </div>

        {/* ── CHAT MODE ── */}
        {mode === 'chat' && (
          <>
            {/* Messages area */}
            <div className="chatbot-messages">
              {!hasMessages ? (
                /* Welcome state */
                <div className="chatbot-welcome">
                  <div className="chatbot-welcome-bubble">
                    <p>Welcome. I can help you discover relevant content, suggest learning actions, and support your research productivity. Select an option below or describe what you need.</p>
                  </div>
                </div>
              ) : (
                messages.map((msg, i) => (
                  <div key={i} className={`chatbot-msg-row ${msg.role === 'user' ? 'user' : 'assistant'}`}>
                    {msg.role === 'assistant' && (
                      <div className="chatbot-msg-avatar">
                        <Sparkles size={12} />
                      </div>
                    )}
                    <div className={`chatbot-bubble ${msg.role === 'user' ? 'user-bubble' : 'assistant-bubble'}`}>
                      {msg.content}
                    </div>
                  </div>
                ))
              )}

              {/* Loading dots */}
              {loading && (
                <div className="chatbot-msg-row assistant">
                  <div className="chatbot-msg-avatar">
                    <Sparkles size={12} />
                  </div>
                  <div className="chatbot-bubble assistant-bubble chatbot-typing">
                    <span /><span /><span />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Actions (only if no messages yet) */}
            {!hasMessages && (
              <div className="chatbot-quick-actions">
                <div className="chatbot-quick-label">QUICK ACTIONS</div>
                <div className="chatbot-quick-grid">
                  {QUICK_ACTIONS.map((qa, i) => (
                    <button
                      key={i}
                      className="chatbot-quick-btn"
                      onClick={() => sendMessage(qa.prompt)}
                      disabled={loading}
                    >
                      {qa.icon}
                      <span>{qa.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="chatbot-error">⚠️ {error}</div>
            )}

            {/* Input */}
            <div className="chatbot-input-area">
              <input
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                placeholder="Ask about topics, research, or what to explore next"
                disabled={loading || remaining <= 0}
                className="chatbot-input"
              />
              <button
                onClick={() => sendMessage()}
                disabled={loading || !input.trim() || remaining <= 0}
                className="chatbot-send-btn"
              >
                <Send size={16} />
              </button>
            </div>

            {/* Footer disclaimer */}
            <div className="chatbot-footer">
              <div className="chatbot-footer-dot" />
              <span>AI-generated suggestions are for academic guidance only. No personal data shared.</span>
            </div>
          </>
        )}

        {/* ── DOUBT BUSTER MODE ── */}
        {mode === 'doubt' && (
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
              onClick={handleDoubtBuster}
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
                <button
                  onClick={() => { setDoubtResult({ loading: false, text: null, error: null }); setDoubtInput(''); }}
                  className="chatbot-doubt-reset"
                >
                  ↺ Ask another
                </button>
              </div>
            )}

            <div className="chatbot-footer" style={{ marginTop: 'auto' }}>
              <div className="chatbot-footer-dot" />
              <span>AI-generated suggestions are for academic guidance only. No personal data shared.</span>
            </div>
          </div>
        )}
      </div>

      <style>{`
        /* ── FAB ── */
        .chatbot-fab {
          position: fixed; bottom: 28px; right: 28px; z-index: 1001;
          width: 52px; height: 52px; border-radius: 50%;
          background: linear-gradient(135deg, #4F46E5, #7C3AED);
          border: none; cursor: pointer; color: #fff;
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 4px 20px rgba(79,70,229,0.4);
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .chatbot-fab:hover { transform: scale(1.08); box-shadow: 0 6px 28px rgba(79,70,229,0.5); }
        .chatbot-fab:active { transform: scale(0.96); }

        /* ── Backdrop ── */
        .chatbot-backdrop {
          position: fixed; inset: 0; z-index: 1000;
          background: rgba(15,23,42,0.45);
          backdrop-filter: blur(6px);
          -webkit-backdrop-filter: blur(6px);
          animation: fadeIn 0.2s ease;
        }

        /* ── Drawer ── */
        .chatbot-drawer {
          position: fixed; top: 0; right: 0; bottom: 0; z-index: 1002;
          width: 420px; max-width: 100vw;
          background: #fff; box-shadow: -4px 0 40px rgba(0,0,0,0.15);
          display: flex; flex-direction: column;
          transform: translateX(100%);
          transition: transform 0.35s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .chatbot-drawer-open { transform: translateX(0); }

        [data-theme="dark"] .chatbot-drawer { background: #1E293B; }

        /* ── Header ── */
        .chatbot-header {
          display: flex; align-items: center; gap: 12px;
          padding: 18px 20px; border-bottom: 1px solid #E2E8F0;
          background: #fff; flex-shrink: 0;
        }
        [data-theme="dark"] .chatbot-header { background: #1E293B; border-color: #334155; }

        .chatbot-header-icon {
          width: 40px; height: 40px; border-radius: 12px;
          background: linear-gradient(135deg, #4F46E5, #7C3AED);
          display: flex; align-items: center; justify-content: center;
          color: #fff; flex-shrink: 0;
        }
        .chatbot-header-text { flex: 1; }
        .chatbot-header-title { font-size: 15px; font-weight: 700; color: #0F172A; letter-spacing: -0.01em; }
        [data-theme="dark"] .chatbot-header-title { color: #F1F5F9; }
        .chatbot-header-sub { font-size: 12px; color: #64748B; margin-top: 1px; }

        .chatbot-close-btn {
          width: 34px; height: 34px; border-radius: 8px;
          border: 1px solid #E2E8F0; background: #fff;
          color: #64748B; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          transition: all 0.15s;
        }
        .chatbot-close-btn:hover { background: #F8FAFC; color: #0F172A; }
        [data-theme="dark"] .chatbot-close-btn { background: #1E293B; border-color: #334155; color: #94A3B8; }
        [data-theme="dark"] .chatbot-close-btn:hover { background: #334155; color: #F1F5F9; }

        /* ── Tabs ── */
        .chatbot-tabs {
          display: flex; border-bottom: 1px solid #E2E8F0; flex-shrink: 0;
        }
        [data-theme="dark"] .chatbot-tabs { border-color: #334155; }
        .chatbot-tab {
          flex: 1; padding: 11px 0; font-size: 13px; font-weight: 500;
          color: #94A3B8; background: none; border: none;
          border-bottom: 2px solid transparent; margin-bottom: -1px;
          cursor: pointer; transition: all 0.15s; font-family: inherit;
        }
        .chatbot-tab.active { color: #4F46E5; border-bottom-color: #4F46E5; font-weight: 600; }
        [data-theme="dark"] .chatbot-tab.active { color: #818CF8; border-bottom-color: #818CF8; }

        /* ── Messages ── */
        .chatbot-messages {
          flex: 1; overflow-y: auto; padding: 20px 16px;
          display: flex; flex-direction: column; gap: 14px;
          background: #F8FAFC;
        }
        [data-theme="dark"] .chatbot-messages { background: #0F172A; }

        /* Welcome state */
        .chatbot-welcome { display: flex; justify-content: flex-start; }
        .chatbot-welcome-bubble {
          background: #fff; border: 1px solid #E2E8F0;
          border-radius: 4px 16px 16px 16px; padding: 14px 16px;
          font-size: 14px; color: #334155; line-height: 1.6;
          max-width: 90%; box-shadow: 0 1px 4px rgba(0,0,0,.04);
        }
        [data-theme="dark"] .chatbot-welcome-bubble { background: #1E293B; border-color: #334155; color: #CBD5E1; }

        /* Message rows */
        .chatbot-msg-row {
          display: flex; align-items: flex-end; gap: 8px;
        }
        .chatbot-msg-row.user { justify-content: flex-end; }
        .chatbot-msg-row.assistant { justify-content: flex-start; }

        .chatbot-msg-avatar {
          width: 28px; height: 28px; border-radius: 8px; flex-shrink: 0;
          background: linear-gradient(135deg, #4F46E5, #7C3AED);
          display: flex; align-items: center; justify-content: center; color: #fff;
        }

        .chatbot-bubble {
          max-width: 80%; padding: 11px 14px; font-size: 13.5px;
          line-height: 1.55; white-space: pre-wrap;
        }
        .user-bubble {
          background: linear-gradient(135deg, #4F46E5, #3730A3);
          color: #fff; border-radius: 16px 16px 4px 16px;
        }
        .assistant-bubble {
          background: #fff; color: #1E293B; border: 1px solid #E2E8F0;
          border-radius: 4px 16px 16px 16px;
          box-shadow: 0 1px 3px rgba(0,0,0,.04);
        }
        [data-theme="dark"] .assistant-bubble { background: #1E293B; border-color: #334155; color: #E2E8F0; }

        /* Typing animation */
        .chatbot-typing { display: flex !important; align-items: center; gap: 4px; padding: 12px 14px !important; }
        .chatbot-typing span {
          width: 7px; height: 7px; border-radius: 50%; background: #94A3B8; display: block;
          animation: typingBounce 1s infinite ease-in-out;
        }
        .chatbot-typing span:nth-child(2) { animation-delay: 0.15s; }
        .chatbot-typing span:nth-child(3) { animation-delay: 0.3s; }
        @keyframes typingBounce {
          0%, 100% { transform: translateY(0); opacity: 0.5; }
          50% { transform: translateY(-5px); opacity: 1; }
        }

        /* ── Quick Actions ── */
        .chatbot-quick-actions {
          padding: 12px 16px 0; flex-shrink: 0; background: #F8FAFC;
        }
        [data-theme="dark"] .chatbot-quick-actions { background: #0F172A; }
        .chatbot-quick-label {
          font-size: 10.5px; font-weight: 600; letter-spacing: 0.07em;
          color: #94A3B8; margin-bottom: 10px;
        }
        .chatbot-quick-grid {
          display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 12px;
        }
        .chatbot-quick-btn {
          display: flex; align-items: center; gap: 7px;
          padding: 10px 12px; border-radius: 10px; font-size: 12.5px;
          font-weight: 500; cursor: pointer; transition: all 0.15s;
          background: #fff; color: #374151; border: 1px solid #E2E8F0;
          font-family: inherit; text-align: left;
        }
        .chatbot-quick-btn:hover { background: #EEF2FF; border-color: #C7D2FE; color: #4F46E5; }
        .chatbot-quick-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        [data-theme="dark"] .chatbot-quick-btn { background: #1E293B; border-color: #334155; color: #CBD5E1; }
        [data-theme="dark"] .chatbot-quick-btn:hover { background: rgba(79,70,229,0.15); border-color: rgba(79,70,229,0.3); color: #818CF8; }

        /* ── Error ── */
        .chatbot-error {
          margin: 0 16px; padding: 8px 12px;
          background: #FEF2F2; color: #DC2626; font-size: 12px;
          border-radius: 8px; border: 1px solid #FECACA; flex-shrink: 0;
        }

        /* ── Input Area ── */
        .chatbot-input-area {
          display: flex; align-items: center; gap: 8px;
          padding: 12px 16px; border-top: 1px solid #E2E8F0;
          background: #fff; flex-shrink: 0;
        }
        [data-theme="dark"] .chatbot-input-area { background: #1E293B; border-color: #334155; }
        .chatbot-input {
          flex: 1; border: 1px solid #E2E8F0; border-radius: 12px;
          padding: 10px 14px; font-size: 13px; outline: none;
          font-family: inherit; background: #F8FAFC; color: #0F172A;
          transition: all 0.15s;
        }
        .chatbot-input:focus { border-color: #4F46E5; box-shadow: 0 0 0 3px rgba(79,70,229,.1); background: #fff; }
        [data-theme="dark"] .chatbot-input { background: #0F172A; border-color: #334155; color: #E2E8F0; }
        [data-theme="dark"] .chatbot-input:focus { background: #0F172A; }
        .chatbot-send-btn {
          width: 40px; height: 40px; border-radius: 12px; flex-shrink: 0;
          background: linear-gradient(135deg, #4F46E5, #3730A3);
          border: none; cursor: pointer; color: #fff;
          display: flex; align-items: center; justify-content: center;
          transition: all 0.15s;
        }
        .chatbot-send-btn:hover { opacity: 0.9; transform: scale(1.05); }
        .chatbot-send-btn:disabled { background: #E2E8F0; color: #94A3B8; cursor: not-allowed; transform: none; }

        /* ── Footer ── */
        .chatbot-footer {
          display: flex; align-items: center; gap: 6px;
          padding: 8px 16px 14px; font-size: 11px; color: #94A3B8;
          background: #fff; flex-shrink: 0; line-height: 1.4;
        }
        [data-theme="dark"] .chatbot-footer { background: #1E293B; color: #64748B; }
        .chatbot-footer-dot {
          width: 6px; height: 6px; border-radius: 50%; background: #10B981;
          flex-shrink: 0; box-shadow: 0 0 0 2px rgba(16,185,129,0.2);
        }

        /* ── Doubt Panel ── */
        .chatbot-doubt-panel {
          flex: 1; overflow-y: auto; padding: 20px 16px;
          display: flex; flex-direction: column; gap: 12px;
          background: #F8FAFC;
        }
        [data-theme="dark"] .chatbot-doubt-panel { background: #0F172A; }
        .chatbot-doubt-desc { font-size: 13px; color: #64748B; line-height: 1.6; }
        [data-theme="dark"] .chatbot-doubt-desc { color: #94A3B8; }
        .chatbot-doubt-input {
          width: 100%; padding: 10px 12px; border-radius: 10px;
          border: 1px solid #E2E8F0; font-size: 13px; resize: vertical;
          font-family: inherit; outline: none; background: #fff;
          color: #0F172A; transition: border-color 0.15s;
        }
        .chatbot-doubt-input:focus { border-color: #4F46E5; box-shadow: 0 0 0 3px rgba(79,70,229,.1); }
        [data-theme="dark"] .chatbot-doubt-input { background: #1E293B; border-color: #334155; color: #E2E8F0; }
        .chatbot-doubt-btn {
          padding: 10px; border-radius: 10px;
          background: linear-gradient(135deg, #4F46E5, #7C3AED);
          color: #fff; border: none; font-weight: 600; font-size: 13px;
          cursor: pointer; transition: opacity 0.15s; font-family: inherit;
        }
        .chatbot-doubt-btn.disabled { background: #E2E8F0; color: #9CA3AF; cursor: not-allowed; }
        .chatbot-doubt-skeleton { display: flex; flex-direction: column; }
        .chatbot-doubt-result {
          background: linear-gradient(135deg, #EEF2FF, #F0FDF4);
          border-radius: 12px; padding: 14px 16px; border: 1px solid #C7D2FE;
        }
        [data-theme="dark"] .chatbot-doubt-result { background: rgba(79,70,229,0.1); border-color: rgba(79,70,229,0.3); }
        .chatbot-doubt-result-label { font-size: 11px; font-weight: 700; color: #4F46E5; margin-bottom: 8px; }
        .chatbot-doubt-result-text { font-size: 13px; color: #1E293B; line-height: 1.7; white-space: pre-wrap; }
        [data-theme="dark"] .chatbot-doubt-result-text { color: #E2E8F0; }
        .chatbot-doubt-reset {
          margin-top: 10px; font-size: 11px; color: #64748B; background: none;
          border: none; cursor: pointer; padding: 0; font-family: inherit;
        }
        .chatbot-doubt-reset:hover { color: #4F46E5; }

        /* ── Mobile ── */
        @media (max-width: 480px) {
          .chatbot-drawer { width: 100vw; }
          .chatbot-fab { bottom: 20px; right: 16px; }
        }
      `}</style>
    </>
  );
}
