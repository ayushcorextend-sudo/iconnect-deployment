import { useState } from 'react';

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAY_LABELS_SHORT = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

export default function MonthlyCalendar({ activityByDate = {}, onDateClick, selectedDate }) {
  const [viewDate, setViewDate] = useState(() => new Date());
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDow = (firstDay.getDay() + 6) % 7; // Mon=0

  const cells = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= lastDay.getDate(); d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const today = new Date();
  const isThisMonth = today.getFullYear() === year && today.getMonth() === month;
  const COLORS = ['transparent', '#BFDBFE', '#93C5FD', '#3B82F6', '#1D4ED8'];

  const totalThisMonth = Object.entries(activityByDate)
    .filter(([k]) => k.startsWith(`${year}-${String(month + 1).padStart(2, '0')}`))
    .reduce((sum, [, v]) => sum + v, 0);

  return (
    <div>
      {/* Nav */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <button
          onClick={() => setViewDate(new Date(year, month - 1, 1))}
          style={{ background: 'none', border: '1px solid #E5E7EB', borderRadius: 6, width: 28, height: 28, cursor: 'pointer', fontSize: 13, color: '#6B7280', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >‹</button>
        <div style={{ fontWeight: 700, fontSize: 13, color: '#111827' }}>{MONTH_NAMES[month]} {year}</div>
        <button
          onClick={() => setViewDate(new Date(year, month + 1, 1))}
          disabled={isThisMonth}
          style={{ background: 'none', border: '1px solid #E5E7EB', borderRadius: 6, width: 28, height: 28, cursor: isThisMonth ? 'not-allowed' : 'pointer', fontSize: 13, color: isThisMonth ? '#D1D5DB' : '#6B7280', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >›</button>
      </div>

      {/* Day labels */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 4 }}>
        {DAY_LABELS_SHORT.map(d => (
          <div key={d} style={{ textAlign: 'center', fontSize: 9, color: '#9CA3AF', fontWeight: 700, padding: '2px 0' }}>{d}</div>
        ))}
      </div>

      {/* Date cells */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3 }}>
        {cells.map((d, i) => {
          if (d === null) return <div key={`e-${i}`} style={{ aspectRatio: '1' }} />;
          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
          const count = activityByDate[dateStr] || 0;
          const isToday = isThisMonth && d === today.getDate();
          const isSelected = selectedDate === dateStr;
          const intensity = count === 0 ? 0 : Math.min(4, Math.ceil(count / 1.5));
          const clickable = !!onDateClick;
          return (
            <div
              key={d}
              title={count > 0 ? `${count} activit${count !== 1 ? 'ies' : 'y'}` : dateStr}
              onClick={() => onDateClick && onDateClick(dateStr)}
              style={{
                aspectRatio: '1',
                borderRadius: 5,
                background: isSelected ? '#7C3AED' : isToday ? '#2563EB' : count > 0 ? COLORS[intensity] : '#F9FAFB',
                border: isSelected ? '2px solid #6D28D9' : isToday ? '2px solid #1D4ED8' : count > 0 ? '1px solid rgba(37,99,235,0.15)' : '1px solid #F3F4F6',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 10, fontWeight: (isToday || isSelected) ? 800 : 500,
                color: (isToday || isSelected) ? '#fff' : intensity >= 3 ? '#1E3A8A' : '#374151',
                transition: 'transform .1s, background .1s',
                cursor: clickable ? 'pointer' : 'default',
                position: 'relative',
              }}
            >
              {d}
              {count > 0 && !isToday && (
                <div style={{
                  position: 'absolute', bottom: 2, left: '50%', transform: 'translateX(-50%)',
                  width: 4, height: 4, borderRadius: '50%', background: '#2563EB',
                }} />
              )}
            </div>
          );
        })}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ fontSize: 9, color: '#9CA3AF' }}>Less</span>
          {COLORS.slice(1).map((c, i) => <div key={i} style={{ width: 9, height: 9, background: c, borderRadius: 2, border: '1px solid rgba(37,99,235,0.15)' }} />)}
          <span style={{ fontSize: 9, color: '#9CA3AF' }}>More</span>
        </div>
        <span style={{ fontSize: 10, color: '#9CA3AF' }}>{totalThisMonth} activities this month</span>
      </div>
    </div>
  );
}
