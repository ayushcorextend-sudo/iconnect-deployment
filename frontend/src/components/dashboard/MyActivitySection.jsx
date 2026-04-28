import { memo } from 'react';
import ActivityDots, { ACTIVITY_ICON, ACTIVITY_LABEL, relTime } from './ActivityDots';

function MyActivitySection({
  dashLoading,
  myScore, booksRead, hoursStudied, myQuizPts, myReadPts,
  weekActivity, recentActivities,
  setPage,
}) {
  const scoreMax = Math.max(myScore, 1);
  const quizPct = Math.round((myQuizPts / scoreMax) * 100);
  const readPct = Math.round((myReadPts / scoreMax) * 100);

  if (dashLoading) {
    return (
      <div className="card animate-pulse" style={{ marginBottom: 20 }}>
        <div style={{ height: 18, background: 'var(--border)', borderRadius: 6, width: '35%', marginBottom: 20 }} />
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
          {[1,2,3,4].map(i => (
            <div key={i} style={{ flex: '1 1 120px', height: 62, background: 'var(--light)', borderRadius: 10 }} />
          ))}
        </div>
        <div style={{ height: 8, background: 'var(--light)', borderRadius: 99, marginBottom: 16 }} />
        <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end', height: 40 }}>
          {[32,48,24,40,56,20,44].map((h, i) => (
            <div key={i} style={{ flex: 1, height: h, background: 'var(--light)', borderRadius: 4 }} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="ch" style={{ marginBottom: 16 }}>
          <div className="ct">📊 My Activity</div>
          <button className="btn btn-s btn-sm" onClick={() => setPage('activity')}>View Details →</button>
        </div>

        {/* Stats row */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
          {[
            { label: 'Total Points', value: myScore.toLocaleString(), icon: '⭐', color: '#2563EB', bg: '#EFF6FF' },
            { label: 'Books Read', value: booksRead, icon: '📖', color: '#059669', bg: '#ECFDF5' },
            { label: 'Hours Studied', value: `${hoursStudied}h`, icon: '⏱', color: '#7C3AED', bg: '#F5F3FF' },
            { label: 'Quiz Points', value: myQuizPts.toLocaleString(), icon: '🎯', color: '#D97706', bg: '#FFFBEB' },
          ].map(s => (
            <div key={s.label} style={{
              flex: '1 1 120px',
              background: s.bg,
              borderRadius: 10,
              padding: '12px 14px',
              display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <span style={{ fontSize: 22 }}>{s.icon}</span>
              <div>
                <div style={{ fontSize: 18, fontWeight: 800, color: s.color, lineHeight: 1.1 }}>{s.value}</div>
                <div style={{ fontSize: 11, color: '#6B7280', marginTop: 2 }}>{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Score breakdown bar */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>Score Breakdown</span>
            <span style={{ fontSize: 12, color: '#6B7280' }}>{myScore.toLocaleString()} pts total</span>
          </div>
          <div style={{ height: 8, background: 'var(--light)', borderRadius: 99, overflow: 'hidden', display: 'flex' }}>
            <div style={{ width: `${quizPct}%`, background: '#2563EB', transition: 'width .5s' }} />
            <div style={{ width: `${readPct}%`, background: '#7C3AED', transition: 'width .5s' }} />
          </div>
          <div style={{ display: 'flex', gap: 16, marginTop: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#6B7280' }}>
              <div style={{ width: 10, height: 10, background: '#2563EB', borderRadius: 2 }} />
              Quiz: <strong style={{ color: '#374151' }}>{myQuizPts.toLocaleString()} pts</strong>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#6B7280' }}>
              <div style={{ width: 10, height: 10, background: '#7C3AED', borderRadius: 2 }} />
              Reading: <strong style={{ color: '#374151' }}>{myReadPts.toLocaleString()} pts</strong>
            </div>
          </div>
        </div>

        {/* 7-day activity chart */}
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 10 }}>Last 7 Days Activity</div>
          <ActivityDots days={weekActivity} />
        </div>
      </div>

      {/* Recent Activity */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="ch" style={{ marginBottom: 12 }}>
          <div className="ct">⚡ Recent Activity</div>
        </div>
        {recentActivities.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#9CA3AF', padding: '12px 0', fontSize: 13 }}>
            No activity yet — start reading or taking quizzes!
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {recentActivities.map((a, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '9px 0',
                borderBottom: i < recentActivities.length - 1 ? '1px solid #F3F4F6' : 'none',
              }}>
                <span style={{ fontSize: 18, flexShrink: 0, width: 26, textAlign: 'center' }}>
                  {ACTIVITY_ICON[a.activity_type] || '📋'}
                </span>
                <div style={{ flex: 1, fontSize: 12, fontWeight: 500, color: '#374151' }}>
                  {ACTIVITY_LABEL[a.activity_type] || (a.activity_type?.replace(/_/g, ' ') ?? 'Unknown activity')}
                </div>
                <div style={{ fontSize: 11, color: '#9CA3AF', flexShrink: 0 }}>{relTime(a.created_at)}</div>
              </div>
            ))}
          </div>
        )}
        <div style={{ display: 'flex', gap: 10, marginTop: 14, paddingTop: 14, borderTop: '1px solid #F3F4F6', flexWrap: 'wrap' }}>
          <button className="btn btn-p btn-sm" style={{ flex: '1 1 120px' }} onClick={() => setPage('ebooks')}>📖 Continue Reading →</button>
          <button className="btn btn-s btn-sm" style={{ flex: '1 1 120px' }} onClick={() => setPage('leaderboard')}>🏆 Leaderboard →</button>
          <button className="btn btn-s btn-sm" style={{ flex: '1 1 120px' }} onClick={() => setPage('activity')}>📊 Activity History →</button>
        </div>
      </div>
    </>
  );
}

export default memo(MyActivitySection);
