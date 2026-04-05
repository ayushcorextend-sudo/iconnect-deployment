import { useState, useEffect, memo } from 'react';
import { supabase } from '../../lib/supabase';
import { trackActivity } from '../../lib/trackActivity';
import Avatar from '../Avatar';

const fmtDt = (d) => {
  if (!d) return '—';
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return '—';
  return dt.toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
};

function WebinarLeaderboardRow({
  nextWebinar,
  currentUserId,
  reminderPopover, setReminderPopover,
  reminderLeadMins, setReminderLeadMins,
  reminderChannels, setReminderChannels,
  reminderSaving, handleSetReminder,
  myRank, myScore, myQuizPts, myReadPts,
  miniLB, setPage,
}) {
  const [isInterested, setIsInterested] = useState(false);
  const [intSaving, setIntSaving] = useState(false);

  useEffect(() => {
    if (!currentUserId || !nextWebinar?.id) return;
    supabase.from('webinar_registrations')
      .select('id')
      .eq('user_id', currentUserId)
      .eq('webinar_id', nextWebinar.id)
      .maybeSingle()
      .then(({ data }) => setIsInterested(!!data));
  }, [currentUserId, nextWebinar?.id]);

  async function toggleInterested() {
    if (!currentUserId || !nextWebinar?.id || intSaving) return;
    setIntSaving(true);
    try {
      if (isInterested) {
        await supabase.from('webinar_registrations')
          .delete()
          .eq('user_id', currentUserId)
          .eq('webinar_id', nextWebinar.id);
        setIsInterested(false);
      } else {
        await supabase.from('webinar_registrations')
          .upsert({ user_id: currentUserId, webinar_id: nextWebinar.id }, { onConflict: 'user_id,webinar_id', ignoreDuplicates: true });
        setIsInterested(true);
        trackActivity('webinar_interested', nextWebinar.id);
      }
    } catch (e) { console.warn('WebinarLeaderboardRow: failed to toggle webinar interest:', e.message); }
    setIntSaving(false);
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginBottom: 20 }}>

      {/* Upcoming Webinar */}
      <div className="card" style={{ margin: 0 }}>
        <div className="ch" style={{ marginBottom: 14 }}>
          <div className="ct">📅 Upcoming Webinar</div>
        </div>
        {nextWebinar ? (
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)', marginBottom: 6 }}>
              {nextWebinar.title}
            </div>
            {nextWebinar.speaker && (
              <div style={{ fontSize: 13, color: '#6B7280', marginBottom: 8 }}>
                🎤 {nextWebinar.speaker}
              </div>
            )}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: '#EFF6FF', borderRadius: 8, padding: '8px 12px', marginBottom: 10,
            }}>
              <span style={{ fontSize: 16 }}>🗓</span>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#1D4ED8' }}>{fmtDt(nextWebinar.scheduled_at)}</div>
                <div style={{ fontSize: 11, color: '#6B7280' }}>Duration: {nextWebinar.duration_min || 60} min</div>
              </div>
            </div>
            {nextWebinar.description && (
              <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 10 }}>{nextWebinar.description}</div>
            )}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <button
                onClick={toggleInterested}
                disabled={intSaving}
                style={{
                  padding: '8px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                  cursor: intSaving ? 'not-allowed' : 'pointer',
                  background: isInterested ? '#ECFDF5' : '#F5F3FF',
                  border: isInterested ? '1px solid #6EE7B7' : '1px solid #DDD6FE',
                  color: isInterested ? '#065F46' : '#5B21B6',
                  opacity: intSaving ? 0.7 : 1,
                }}
              >
                {intSaving ? '…' : isInterested ? '✅ Interested' : '🙋 I\'m Interested'}
              </button>
              {nextWebinar.join_url ? (
                <a
                  href={nextWebinar.join_url}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    display: 'inline-block',
                    background: 'linear-gradient(135deg,#4F46E5,#3730A3)',
                    color: '#fff', borderRadius: 8, padding: '8px 16px',
                    fontSize: 12, fontWeight: 600, textDecoration: 'none',
                  }}
                >
                  🚀 Join Webinar
                </a>
              ) : (
                <div style={{ fontSize: 12, color: '#9CA3AF' }}>Join link coming soon</div>
              )}
              <button
                onClick={() => setReminderPopover(p => !p)}
                style={{
                  padding: '8px 14px', borderRadius: 8,
                  background: reminderPopover ? '#F3F4F6' : '#FFFBEB',
                  border: '1px solid #FDE68A', fontSize: 12, fontWeight: 600,
                  cursor: 'pointer', color: '#92400E',
                }}
              >
                🔔 Remind Me
              </button>
            </div>
            {reminderPopover && (
              <div style={{
                marginTop: 12, background: 'var(--surf)', borderRadius: 10,
                border: '1px solid #E5E7EB', padding: '12px 14px',
              }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 8 }}>
                  Set a reminder
                </div>
                {/* Lead time */}
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
                  {[15, 60, 1440].map(mins => (
                    <button
                      key={mins}
                      onClick={() => setReminderLeadMins(mins)}
                      style={{
                        padding: '5px 12px', borderRadius: 8, fontSize: 11, fontWeight: 600,
                        border: reminderLeadMins === mins ? '2px solid #4F46E5' : '1.5px solid #E5E7EB',
                        background: reminderLeadMins === mins ? '#EEF2FF' : '#fff',
                        color: reminderLeadMins === mins ? '#4F46E5' : '#374151',
                        cursor: 'pointer',
                      }}
                    >
                      {mins === 15 ? '15 min' : mins === 60 ? '1 hour' : '1 day'} before
                    </button>
                  ))}
                </div>
                {/* Channels */}
                <div style={{ fontSize: 11, color: '#6B7280', marginBottom: 6 }}>Notify via:</div>
                <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                  {[['in_app', '🔔 In-App'], ['email', '📧 Email']].map(([ch, label]) => {
                    const active = reminderChannels.includes(ch);
                    return (
                      <label key={ch} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={active}
                          onChange={() => setReminderChannels(prev =>
                            active ? prev.filter(c => c !== ch) : [...prev, ch]
                          )}
                        />
                        {label}
                      </label>
                    );
                  })}
                </div>
                <button
                  onClick={handleSetReminder}
                  disabled={reminderSaving || reminderChannels.length === 0}
                  style={{
                    width: '100%', padding: '8px', borderRadius: 8, border: 'none',
                    background: reminderSaving || reminderChannels.length === 0 ? '#E5E7EB' : 'linear-gradient(135deg,#4F46E5,#7C3AED)',
                    color: reminderSaving || reminderChannels.length === 0 ? '#9CA3AF' : '#fff',
                    fontWeight: 700, fontSize: 12,
                    cursor: reminderSaving || reminderChannels.length === 0 ? 'not-allowed' : 'pointer',
                  }}
                >
                  {reminderSaving ? 'Saving…' : '✓ Save Reminder'}
                </button>
              </div>
            )}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ fontSize: 40, marginBottom: 10 }}>📅</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 4 }}>No upcoming webinars</div>
            <div style={{ fontSize: 12, color: '#9CA3AF' }}>Check back soon — admin will schedule sessions here</div>
          </div>
        )}
      </div>

      {/* Leaderboard Rank — Flamboyant Edition */}
      <div style={{
        margin: 0, borderRadius: 16, overflow: 'hidden',
        boxShadow: myRank === 1 ? '0 8px 32px rgba(234,179,8,0.35), 0 2px 8px rgba(0,0,0,0.1)' : '0 4px 20px rgba(79,70,229,0.18)',
        border: myRank === 1 ? '1.5px solid rgba(234,179,8,0.4)' : '1.5px solid rgba(79,70,229,0.2)',
      }}>
        {/* Header banner */}
        <div style={{
          background: myRank === 1
            ? 'linear-gradient(135deg, #78350F 0%, #D97706 40%, #FCD34D 70%, #F59E0B 100%)'
            : myRank === 2
            ? 'linear-gradient(135deg, #374151 0%, #6B7280 50%, #9CA3AF 100%)'
            : myRank === 3
            ? 'linear-gradient(135deg, #7C2D12 0%, #C2410C 50%, #FB923C 100%)'
            : 'linear-gradient(135deg, #1E40AF 0%, #4F46E5 60%, #7C3AED 100%)',
          padding: '18px 16px 14px', position: 'relative', overflow: 'hidden',
        }}>
          {/* Sparkle decorations */}
          {myRank && myRank <= 3 && (
            <>
              <div style={{ position: 'absolute', top: 6, right: 12, fontSize: 22, opacity: 0.5, transform: 'rotate(15deg)' }}>✨</div>
              <div style={{ position: 'absolute', top: 20, right: 36, fontSize: 14, opacity: 0.4, transform: 'rotate(-10deg)' }}>⭐</div>
              <div style={{ position: 'absolute', bottom: 8, left: 14, fontSize: 16, opacity: 0.3 }}>🌟</div>
            </>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.75)', letterSpacing: '1px', marginBottom: 6, textTransform: 'uppercase' }}>Your Rank</div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
                <div style={{
                  fontSize: 52, fontWeight: 900, color: '#fff', lineHeight: 1,
                  textShadow: myRank === 1 ? '0 2px 12px rgba(0,0,0,0.3), 0 0 20px rgba(255,215,0,0.6)' : '0 2px 8px rgba(0,0,0,0.3)',
                  letterSpacing: '-2px',
                }}>
                  {myRank ? `#${myRank}` : '—'}
                </div>
                {myRank && myRank <= 3 && (
                  <div style={{ fontSize: 32, marginBottom: 6 }}>
                    {myRank === 1 ? '🥇' : myRank === 2 ? '🥈' : '🥉'}
                  </div>
                )}
                {myRank === 1 && (
                  <div style={{ fontSize: 28, marginBottom: 4 }}>👑</div>
                )}
              </div>
            </div>
            <button
              onClick={() => setPage('leaderboard')}
              style={{
                background: 'rgba(255,255,255,0.2)', color: '#fff', border: '1px solid rgba(255,255,255,0.35)',
                borderRadius: 8, padding: '6px 12px', fontSize: 11, fontWeight: 700, cursor: 'pointer',
                backdropFilter: 'blur(4px)', whiteSpace: 'nowrap',
              }}
            >Full Board →</button>
          </div>
          <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
            <div style={{ background: 'rgba(255,255,255,0.18)', borderRadius: 8, padding: '5px 12px' }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: '#fff' }}>{myScore.toLocaleString()}</div>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>TOTAL PTS</div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.18)', borderRadius: 8, padding: '5px 12px' }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: '#fff' }}>{myQuizPts.toLocaleString()}</div>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>QUIZ PTS</div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.18)', borderRadius: 8, padding: '5px 12px' }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: '#fff' }}>{myReadPts.toLocaleString()}</div>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>READ PTS</div>
            </div>
          </div>
        </div>

        {/* Mini top-3 leaderboard */}
        <div style={{ background: 'var(--surf)', padding: '12px 14px' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#9CA3AF', letterSpacing: '0.5px', marginBottom: 8 }}>TOP PERFORMERS</div>
          {miniLB.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '8px 0', color: '#9CA3AF', fontSize: 13 }}>
              No rankings yet. Start earning points!
            </div>
          ) : (
            miniLB.slice(0, 3).map((l, i) => (
              <div key={l.id} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '7px 8px', marginBottom: 4,
                borderRadius: 8,
                background: l.isMe
                  ? 'linear-gradient(135deg, rgba(79,70,229,0.08), rgba(124,58,237,0.06))'
                  : i === 0 ? 'rgba(234,179,8,0.06)' : '#F9FAFB',
                border: l.isMe ? '1.5px solid rgba(79,70,229,0.2)' : '1px solid #F3F4F6',
              }}>
                <div style={{ width: 22, fontSize: 14, textAlign: 'center' }}>
                  {['🥇', '🥈', '🥉'][i]}
                </div>
                <Avatar name={l.name} size={26} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: l.isMe ? 700 : 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: l.isMe ? '#4F46E5' : '#111827' }}>
                    {l.name}{l.isMe ? ' ← You' : ''}
                  </div>
                  <div style={{ fontSize: 10, color: '#9CA3AF' }}>{l.speciality}</div>
                </div>
                <div style={{
                  fontSize: 12, fontWeight: 800, flexShrink: 0,
                  color: i === 0 ? '#D97706' : i === 1 ? '#6B7280' : '#C2410C',
                  background: i === 0 ? 'rgba(234,179,8,0.12)' : i === 1 ? 'rgba(107,114,128,0.1)' : 'rgba(194,65,12,0.1)',
                  borderRadius: 6, padding: '2px 8px',
                }}>
                  {l.score.toLocaleString()}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default memo(WebinarLeaderboardRow);
