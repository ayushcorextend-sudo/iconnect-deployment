import React from 'react';
import Avatar from '../Avatar';

const MEDAL_COLORS = ['#FFD700', '#C0C0C0', '#CD7F32'];

const LeaderboardRow = React.memo(function LeaderboardRow({ user, globalIdx, myRowRef }) {
  const medalColor = globalIdx < 3 ? MEDAL_COLORS[globalIdx] : '#6B7280';
  return (
    <div
      ref={myRowRef}
      className={`lb-row ${user.isMe ? 'me' : ''}`}
      style={user.isMe ? { background: 'rgba(79,70,229,0.08)', border: '1px solid #4F46E5', borderRadius: 8 } : {}}
    >
      <div className="lb-pos" style={{ color: medalColor }}>
        {globalIdx + 1}
      </div>
      <Avatar name={user.name} size={34} />
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 600 }}>
          {user.name}{user.isMe ? ' (You)' : ''}
        </div>
        <div style={{ fontSize: 11, color: '#6B7280' }}>{user.college} · {user.speciality}</div>
        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
          {[['🟢', user.quizPts], ['🟣', user.readPts]].map(([c, v]) => (
            <span key={c} style={{ fontSize: 10, color: '#6B7280' }}>{c} {(v || 0).toLocaleString()}</span>
          ))}
        </div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div style={{ fontFamily: 'Inter,sans-serif', fontSize: 15, fontWeight: 800, color: '#2563EB' }}>
          {user.score.toLocaleString()}
        </div>
        <div style={{ fontSize: 10, color: '#6B7280' }}>pts</div>
      </div>
    </div>
  );
});

export default LeaderboardRow;
