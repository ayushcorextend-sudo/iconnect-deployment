import { defaultSuggestions } from '../../mocks';

const TAG_COLORS = {
  'Weak Area':   { bg: 'rgba(239,68,68,0.25)',  color: '#FCA5A5', border: 'rgba(239,68,68,0.4)' },
  'Due Today':   { bg: 'rgba(245,158,11,0.25)', color: '#FCD34D', border: 'rgba(245,158,11,0.4)' },
  'High Yield':  { bg: 'rgba(16,185,129,0.25)', color: '#6EE7B7', border: 'rgba(16,185,129,0.4)' },
  'Quick Win':   { bg: 'rgba(59,130,246,0.25)', color: '#93C5FD', border: 'rgba(59,130,246,0.4)' },
  'Streak Risk': { bg: 'rgba(239,68,68,0.2)',   color: '#FCA5A5', border: 'rgba(239,68,68,0.35)' },
  'Trending':    { bg: 'rgba(168,85,247,0.25)', color: '#C4B5FD', border: 'rgba(168,85,247,0.4)' },
};
const DEFAULT_TAG = { bg: 'rgba(255,255,255,0.12)', color: '#E2E8F0', border: 'rgba(255,255,255,0.25)' };

function SuggestionRow({ s, onClick, compact }) {
  const tc = TAG_COLORS[s.tag] || DEFAULT_TAG;
  return (
    <div
      onClick={onClick}
      className="flex items-center gap-3 bg-white/10 rounded-xl border border-white/10 cursor-pointer transition-all duration-200 hover:bg-white/20 hover:-translate-y-px"
      style={{ padding: compact ? '10px 14px' : '11px 14px' }}
    >
      <div className="w-9 h-9 rounded-lg shrink-0 bg-white/15 flex items-center justify-center text-xl border border-white/20">
        {s.icon || s.emoji || '📚'}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-bold text-white truncate mb-0.5">{s.title}</div>
        <div className="text-xs text-white/60 truncate">{s.reason}</div>
      </div>
      {s.tag && (
        <div
          className="px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap shrink-0 tracking-wide"
          style={{ background: tc.bg, color: tc.color, border: `1px solid ${tc.border}` }}
        >
          {s.tag}
        </div>
      )}
      {s.pages && (
        <div className="text-xs text-white/50 shrink-0">#{s._idx + 1} pick</div>
      )}
    </div>
  );
}

export default function ForYouWidget({ aiForYou, recommendations, refreshForYou, openChatBotDoubt, setPage }) {
  return (
    <div
      className="rounded-2xl p-5 mb-5 text-white"
      style={{
        background: 'linear-gradient(135deg, #1E40AF 0%, #4F46E5 60%, #7C3AED 100%)',
        boxShadow: '0 8px 32px rgba(79,70,229,0.25)',
      }}
    >
      {/* Header */}
      <div className="flex justify-between items-start mb-4 flex-wrap gap-2.5">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl shrink-0 bg-white/20 flex items-center justify-center text-lg">✨</div>
          <div>
            <div className="font-extrabold text-base mb-0.5 flex items-center gap-2">
              For You
              <span className="text-[10px] font-semibold bg-white/20 px-2 py-0.5 rounded-full tracking-wide border border-white/30">
                AI POWERED
              </span>
            </div>
            <div className="text-xs text-white/65">Personalised just for you · updates on every login</div>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={refreshForYou}
            disabled={aiForYou.loading}
            title="Refresh suggestions"
            className="bg-white/10 text-white border border-white/25 rounded-lg px-2.5 py-1.5 text-sm cursor-pointer transition-colors duration-200 hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >🔄</button>
          <button
            onClick={() => { if (openChatBotDoubt) openChatBotDoubt(); }}
            className="bg-white/15 text-white border border-white/30 rounded-lg px-4 py-1.5 text-xs font-semibold cursor-pointer transition-colors duration-200 hover:bg-white/25 flex items-center gap-1.5 backdrop-blur-sm"
          >
            🤖 Ask AI
          </button>
        </div>
      </div>

      {/* AI-generated suggestions */}
      {aiForYou.loading ? (
        <div className="flex flex-col gap-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white/10 rounded-xl p-3 flex items-center gap-3 animate-pulse">
              <div className="w-9 h-9 rounded-lg bg-white/10 shrink-0" />
              <div className="flex-1">
                <div className="h-2.5 bg-white/10 rounded w-[70%] mb-1.5" />
                <div className="h-2 bg-white/10 rounded w-[50%]" />
              </div>
              <div className="w-12 h-5 rounded-full bg-white/10" />
            </div>
          ))}
          <div className="text-center text-xs text-white/50 mt-1">✨ AI is personalising your suggestions…</div>
        </div>
      ) : aiForYou.items.length > 0 ? (
        <div className="flex flex-col gap-2">
          {aiForYou.items.map((s, i) => (
            <SuggestionRow key={i} s={s} onClick={() => setPage(s.action || 'ebooks')} />
          ))}
        </div>
      ) : recommendations.length === 0 ? (
        <div className="flex flex-col gap-2">
          {defaultSuggestions.map((s, i) => (
            <SuggestionRow key={i} s={s} onClick={() => setPage(s.action || 'ebooks')} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {recommendations.map((r, i) => (
            <SuggestionRow
              key={r.id}
              s={{ ...r, reason: `${r.subject} · ${r.pages || '—'} pages`, _idx: i }}
              onClick={() => setPage('ebooks')}
              compact
            />
          ))}
        </div>
      )}

      {/* Bottom: unread content picks */}
      {!aiForYou.loading && recommendations.length > 0 && aiForYou.items.length > 0 && (
        <div className="mt-3.5 pt-3 border-t border-white/10">
          <div className="text-xs font-bold text-white/50 mb-2 tracking-wide">ALSO UNREAD FOR YOU</div>
          <div className="flex gap-2 flex-wrap">
            {recommendations.map(r => (
              <div
                key={r.id}
                onClick={() => setPage('ebooks')}
                className="flex items-center gap-1.5 bg-white/10 rounded-lg px-2.5 py-1.5 cursor-pointer border border-white/10 transition-colors duration-150 hover:bg-white/20 text-xs text-white/85"
              >
                <span className="text-sm">{r.emoji || '📖'}</span>
                <span className="overflow-hidden text-ellipsis whitespace-nowrap max-w-[140px]">{r.title}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
