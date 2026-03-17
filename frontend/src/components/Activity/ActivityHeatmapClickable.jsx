// Clickable 90-day activity heatmap with diary dot indicators

const MONTH_LABELS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const DAY_LABELS = ['S','M','T','W','T','F','S'];

function getColor(count) {
  if (!count || count === 0) return '#F3F4F6';
  if (count === 1) return '#BBF7D0';
  if (count <= 3) return '#4ADE80';
  if (count <= 6) return '#22C55E';
  return '#15803D';
}

export default function ActivityHeatmapClickable({ data, diaryDates = new Set(), onSelectDate, selectedDate }) {
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

  const todayIso = now.toISOString().split('T')[0];

  return (
    <div style={{ overflowX: 'auto' }}>
      {/* Month label row */}
      <div style={{ display: 'flex', gap: 3, marginBottom: 4, paddingLeft: 20 }}>
        {weeks.map((week, wi) => {
          const monthDay = week.find(d => d && d.iso.endsWith('-01'));
          const label = monthDay ? MONTH_LABELS[parseInt(monthDay.iso.split('-')[1], 10) - 1] : '';
          return (
            <div key={wi} style={{ width: 12, fontSize: 8, color: '#9CA3AF', textAlign: 'center' }}>{label}</div>
          );
        })}
      </div>

      <div style={{ display: 'flex', gap: 3 }}>
        {/* Day labels */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginRight: 2 }}>
          {DAY_LABELS.map((d, i) => (
            <div key={i} style={{ height: 12, fontSize: 8, color: '#9CA3AF', lineHeight: '12px', width: 12, textAlign: 'center' }}>
              {i % 2 === 1 ? d : ''}
            </div>
          ))}
        </div>

        {/* Grid */}
        {weeks.map((week, wi) => (
          <div key={wi} style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {week.map((day, di) => {
              if (!day) return <div key={di} style={{ width: 12, height: 12 }} />;
              const isSelected = day.iso === selectedDate;
              const hasDiary = diaryDates.has(day.iso);
              const isToday = day.iso === todayIso;
              return (
                <div
                  key={di}
                  title={`${day.iso}: ${day.count} activit${day.count !== 1 ? 'ies' : 'y'}${hasDiary ? ' · diary' : ''}`}
                  onClick={() => onSelectDate?.(day.iso)}
                  style={{
                    width: 12, height: 12, borderRadius: 2,
                    background: getColor(day.count),
                    cursor: 'pointer',
                    position: 'relative',
                    outline: isSelected ? '2px solid #4F46E5' : isToday ? '1px solid #6B7280' : 'none',
                    outlineOffset: isSelected ? 1 : 0,
                    transition: 'transform .1s',
                    transform: isSelected ? 'scale(1.3)' : 'scale(1)',
                  }}
                >
                  {/* Diary dot */}
                  {hasDiary && (
                    <div style={{
                      position: 'absolute', bottom: 0, right: 0,
                      width: 4, height: 4, borderRadius: '50%',
                      background: '#6366F1', border: '1px solid #fff',
                    }} />
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 10, fontSize: 10, color: '#9CA3AF', flexWrap: 'wrap' }}>
        <span>Less</span>
        {['#F3F4F6','#BBF7D0','#4ADE80','#22C55E','#15803D'].map(c => (
          <div key={c} style={{ width: 10, height: 10, borderRadius: 2, background: c }} />
        ))}
        <span>More</span>
        <span style={{ marginLeft: 8 }}>·</span>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#6366F1' }} />
        <span>Diary</span>
      </div>
    </div>
  );
}
