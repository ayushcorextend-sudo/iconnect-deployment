export const ACTIVITY_ICON = {
  quiz_attempted: '📝', quiz_passed: '🏆', article_read: '📖',
  note_viewed: '📋', document_downloaded: '📥', webinar_attended: '🎥', daily_login: '👋',
};
export const ACTIVITY_LABEL = {
  quiz_attempted: 'Attempted a quiz', quiz_passed: 'Passed a quiz',
  article_read: 'Read an article', note_viewed: 'Viewed notes',
  document_downloaded: 'Downloaded a document', webinar_attended: 'Attended a webinar',
  daily_login: 'Logged in',
};

export function relTime(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  if (isNaN(d.getTime())) return '';
  const s = Math.floor((Date.now() - d) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return Math.floor(s / 60) + 'm ago';
  if (s < 86400) return Math.floor(s / 3600) + 'h ago';
  if (s < 172800) return 'Yesterday';
  return Math.floor(s / 86400) + 'd ago';
}

// 7-day mini activity heatmap dots
export default function ActivityDots({ days }) {
  const labels = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  const maxVal = Math.max(...days, 1);
  return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end' }}>
      {labels.map((l, i) => {
        const count = days[i] || 0;
        const barHeight = count === 0 ? 8 : Math.max(12, Math.round((count / maxVal) * 48));
        return (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            {count > 0 && <span style={{ fontSize: 9, fontWeight: 700, color: '#2563EB' }}>{count}</span>}
            <div style={{
              width: 28, borderRadius: 4,
              height: barHeight,
              background: count > 0 ? '#2563EB' : '#E5E7EB',
              transition: 'height .3s',
            }} />
            <span style={{ fontSize: 9, color: '#9CA3AF', fontWeight: 600 }}>{l}</span>
          </div>
        );
      })}
    </div>
  );
}
