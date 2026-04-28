// Clickable 90-day activity heatmap with diary dot indicators
import { useRef, useState, useEffect } from 'react';

const MONTH_LABELS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const DAY_LABELS = ['S','M','T','W','T','F','S'];

function getColor(count) {
  if (!count || count === 0) return 'var(--hm-empty, #E5E7EB)';
  if (count === 1) return '#BBF7D0';
  if (count <= 3) return '#4ADE80';
  if (count <= 6) return '#22C55E';
  return '#15803D';
}

export default function ActivityHeatmapClickable({ data, diaryDates = new Set(), onSelectDate, selectedDate }) {
  const containerRef = useRef(null);
  const [cellSize, setCellSize] = useState(14);

  // Build 90 days oldest→newest
  const days = [];
  const now = new Date();
  for (let i = 89; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    const iso = d.toISOString().split('T')[0];
    days.push({ iso, count: data[iso] || 0 });
  }

  // Pad to full week columns
  const firstDow = new Date(days[0].iso).getDay();
  const padded = [...Array(firstDow).fill(null), ...days];
  const weeks = [];
  for (let i = 0; i < padded.length; i += 7) weeks.push(padded.slice(i, i + 7));

  // Compute optimal cell size from container width
  useEffect(() => {
    if (!containerRef.current) return;
    const compute = () => {
      const w = containerRef.current?.offsetWidth ?? 280;
      const dayLabelWidth = 20;
      const gap = 3;
      const cols = weeks.length || 13;
      const available = w - dayLabelWidth - (cols - 1) * gap;
      const computed = Math.floor(available / cols);
      setCellSize(Math.max(12, Math.min(20, computed)));
    };
    compute();
    const ro = new ResizeObserver(compute);
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [weeks.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const gap = 3;
  const todayIso = now.toISOString().split('T')[0];

  return (
    <div ref={containerRef} style={{ width: '100%' }}>
      {/* Month label row */}
      <div style={{ display: 'flex', gap, marginBottom: 4, paddingLeft: cellSize + 4 }}>
        {weeks.map((week, wi) => {
          const monthDay = week.find(d => d && d.iso.endsWith('-01'));
          const label = monthDay ? MONTH_LABELS[parseInt(monthDay.iso.split('-')[1], 10) - 1] : '';
          return (
            <div key={wi} style={{ width: cellSize, fontSize: Math.max(8, cellSize * 0.6), color: '#9CA3AF', textAlign: 'center', overflow: 'hidden' }}>{label}</div>
          );
        })}
      </div>

      <div style={{ display: 'flex', gap }}>
        {/* Day labels */}
        <div style={{ display: 'flex', flexDirection: 'column', gap, marginRight: 2 }}>
          {DAY_LABELS.map((d, i) => (
            <div key={i} style={{ height: cellSize, fontSize: Math.max(8, cellSize * 0.65), color: '#9CA3AF', lineHeight: `${cellSize}px`, width: cellSize, textAlign: 'center' }}>
              {i % 2 === 1 ? d : ''}
            </div>
          ))}
        </div>

        {/* Grid */}
        {weeks.map((week, wi) => (
          <div key={wi} style={{ display: 'flex', flexDirection: 'column', gap }}>
            {week.map((day, di) => {
              if (!day) return <div key={di} style={{ width: cellSize, height: cellSize }} />;
              const isSelected = day.iso === selectedDate;
              const hasDiary = diaryDates.has(day.iso);
              const isToday = day.iso === todayIso;
              return (
                <div
                  key={di}
                  title={`${day.iso}: ${day.count} activit${day.count !== 1 ? 'ies' : 'y'}${hasDiary ? ' · diary' : ''}`}
                  onClick={() => onSelectDate?.(day.iso)}
                  style={{
                    width: cellSize, height: cellSize, borderRadius: Math.max(2, cellSize * 0.2),
                    background: getColor(day.count),
                    cursor: 'pointer', position: 'relative',
                    outline: isSelected ? '2px solid #4F46E5' : isToday ? '1.5px solid #94A3B8' : 'none',
                    outlineOffset: isSelected ? 1 : 0,
                    transition: 'transform .1s, box-shadow .1s',
                    transform: isSelected ? 'scale(1.25)' : 'scale(1)',
                    boxShadow: isSelected ? '0 2px 8px rgba(79,70,229,0.3)' : 'none',
                  }}
                >
                  {hasDiary && (
                    <div style={{
                      position: 'absolute', top: '50%', left: '50%',
                      transform: 'translate(-50%, -50%)',
                      width: Math.max(4, cellSize * 0.38), height: Math.max(4, cellSize * 0.38),
                      borderRadius: '50%', background: '#6366F1',
                      border: '1.5px solid #fff', boxShadow: '0 0 0 1px #4338CA',
                      pointerEvents: 'none',
                    }} />
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 12, fontSize: 11, color: '#9CA3AF', flexWrap: 'wrap' }}>
        <span>Less</span>
        {['#E5E7EB','#BBF7D0','#4ADE80','#22C55E','#15803D'].map(c => (
          <div key={c} style={{ width: 11, height: 11, borderRadius: 2, background: c }} />
        ))}
        <span>More</span>
        <span style={{ marginLeft: 8, marginRight: 2 }}>·</span>
        <div style={{ width: 9, height: 9, borderRadius: '50%', background: '#6366F1', border: '1.5px solid #4338CA' }} />
        <span>Diary</span>
      </div>
    </div>
  );
}
