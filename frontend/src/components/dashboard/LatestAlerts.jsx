import { memo } from 'react';

function LatestAlerts({ notifications, setPage }) {
  const unread = notifications.filter(n => n.is_read === false);
  if (unread.length === 0) return null;
  return (
    <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 12, padding: '12px 16px', marginBottom: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <div style={{ fontWeight: 700, fontSize: 13, color: '#92400E' }}>🔔 Latest Alerts</div>
        <button className="btn btn-s btn-sm" onClick={() => setPage('notifications')}>View All</button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {unread.slice(0, 3).map(n => (
          <div key={n.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '8px 10px', background: '#fff', borderRadius: 8, border: '1px solid #FDE68A' }}>
            <span style={{ fontSize: 16, flexShrink: 0 }}>{n.icon || '🔔'}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.title}</div>
              <div style={{ fontSize: 11, color: '#6B7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.body}</div>
            </div>
            <div style={{ fontSize: 10, color: '#9CA3AF', flexShrink: 0 }}>{n.time}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default memo(LatestAlerts);
