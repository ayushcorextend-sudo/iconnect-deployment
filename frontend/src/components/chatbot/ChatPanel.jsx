import { useRef } from 'react';
import { Sparkles, Send } from 'lucide-react';
import { QUICK_ACTIONS } from './chatbotConstants';

export default function ChatPanel({ messages, loading, error, input, setInput, onSend, remaining }) {
  const messagesEndRef = useRef(null);
  const hasMessages = messages.length > 0;

  return (
    <>
      {/* Messages area */}
      <div className="chatbot-messages">
        {!hasMessages ? (
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
                onClick={() => onSend(qa.prompt)}
                disabled={loading}
              >
                {qa.icon}
                <span>{qa.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {error && <div className="chatbot-error">⚠️ {error}</div>}

      {/* Input */}
      <div className="chatbot-input-area">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && onSend()}
          placeholder="Ask about topics, research, or what to explore next"
          disabled={loading || remaining <= 0}
          className="chatbot-input"
        />
        <button
          onClick={() => onSend()}
          disabled={loading || !input.trim() || remaining <= 0}
          className="chatbot-send-btn"
          aria-label="Send message"
        >
          <Send size={16} />
        </button>
      </div>

      <div className="chatbot-footer">
        <div className="chatbot-footer-dot" />
        <span>AI-generated suggestions are for academic guidance only. No personal data shared.</span>
      </div>
    </>
  );
}
