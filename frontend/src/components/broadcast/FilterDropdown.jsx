import { useEffect, useRef } from 'react';

/* ═══════════════════════════════════════════════════
   DROPDOWN FILTER PILL — for top filter bar
   ═══════════════════════════════════════════════════ */
export default function FilterDropdown({ id, label, icon, options, selected, onToggle, activeId, setActiveId, dm, border, textP, textS, accent, countFor }) {
  const isOpen = activeId === id;
  const hasActive = selected.length > 0;
  const btnRef = useRef(null);
  const panelRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => {
      if (btnRef.current?.contains(e.target) || panelRef.current?.contains(e.target)) return;
      setActiveId(null);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen, setActiveId]);

  return (
    <div style={{ position: 'relative', flexShrink: 0 }}>
      <button
        ref={btnRef}
        onClick={() => setActiveId(isOpen ? null : id)}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '7px 14px', borderRadius: 99, border: 'none', cursor: 'pointer',
          fontSize: 12, fontWeight: hasActive ? 700 : 600, whiteSpace: 'nowrap',
          background: hasActive
            ? (dm ? accent + '22' : '#DBEAFE')
            : (dm ? '#1E293B' : '#F3F4F6'),
          color: hasActive ? accent : textS,
          outline: hasActive ? `2px solid ${accent}` : `1px solid ${border}`,
          transition: 'all 0.2s',
        }}
      >
        {icon} {label}
        {hasActive && (
          <span style={{
            background: accent, color: '#fff',
            borderRadius: '50%', width: 18, height: 18,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 10, fontWeight: 800,
          }}>
            {selected.length}
          </span>
        )}
        <span style={{ fontSize: 9, opacity: 0.7, marginLeft: 2 }}>{isOpen ? '▲' : '▼'}</span>
      </button>

      {isOpen && (
        <div
          ref={panelRef}
          style={{
            position: 'absolute', top: 'calc(100% + 8px)', left: 0, zIndex: 200,
            minWidth: 220, maxWidth: 280, maxHeight: 280, overflowY: 'auto',
            background: dm ? '#1E293B' : '#fff',
            border: `1px solid ${border}`,
            borderRadius: 14,
            boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
            padding: '8px 0',
          }}
        >
          {options.length === 0 ? (
            <div style={{ padding: '10px 16px', fontSize: 12, color: textS }}>No options</div>
          ) : options.map(val => {
            const isChecked = selected.includes(val);
            const cnt = countFor ? countFor(val) : null;
            return (
              <label
                key={val}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '8px 16px', cursor: 'pointer',
                  background: isChecked ? (dm ? accent + '18' : '#EFF6FF') : 'transparent',
                  transition: 'background 0.15s',
                }}
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => onToggle(val)}
                  style={{ width: 15, height: 15, accentColor: accent, cursor: 'pointer' }}
                />
                <span style={{
                  flex: 1, fontSize: 12, fontWeight: isChecked ? 700 : 400,
                  color: isChecked ? (dm ? '#93C5FD' : accent) : textP,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {val}
                </span>
                {cnt !== null && (
                  <span style={{
                    fontSize: 10, color: textS,
                    background: dm ? '#334155' : '#F3F4F6',
                    padding: '1px 7px', borderRadius: 8, flexShrink: 0,
                  }}>
                    {cnt}
                  </span>
                )}
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}
