import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const DAYS  = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

// Build a map: "YYYY-MM-DD" → [event, ...]
function groupByDate(events) {
  const map = {};
  events.forEach(ev => {
    const d = ev.date;
    if (!map[d]) map[d] = [];
    map[d].push(ev);
  });
  return map;
}

// Pad a number to 2 digits
const pad = n => String(n).padStart(2, '0');

// Format ISO → "YYYY-MM-DD"
const toKey = (iso) => {
  if (!iso) return null;
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const fmtTime = (iso) => {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
};

export default function StudyCalendar({ userId, addToast }) {
  const now     = new Date();
  const [year, setYear]   = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());   // 0-indexed
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);  // "YYYY-MM-DD"

  useEffect(() => { loadEvents(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const loadEvents = async () => {
    setLoading(true);
    try {
      // Fetch upcoming arenas
      const { data: arenas, error: arErr } = await supabase
        .from('live_arenas')
        .select('id, pin, scheduled_at, status, quizzes(title, subject)')
        .in('status', ['waiting', 'active'])
        .not('scheduled_at', 'is', null)
        .order('scheduled_at');

      if (arErr) throw arErr;

      // Fetch recently approved quizzes (last 30 days + future)
      const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const { data: quizzes, error: qzErr } = await supabase
        .from('quizzes')
        .select('id, title, subject, updated_at')
        .eq('status', 'approved')
        .gte('updated_at', since)
        .order('updated_at', { ascending: false })
        .limit(20);

      if (qzErr) throw qzErr;

      // Fetch admin compulsory events
      const { data: adminEvents } = await supabase
        .from('admin_calendar_events')
        .select('*')
        .order('date');

      const evList = [
        ...(arenas || []).map(a => ({
          id: a.id,
          date: toKey(a.scheduled_at),
          time: fmtTime(a.scheduled_at),
          label: a.quizzes?.title || 'Live Arena',
          subject: a.quizzes?.subject || '',
          pin: a.pin,
          kind: 'arena',
          color: '#EF4444',
          bg: '#FEF2F2',
        })),
        ...(quizzes || []).map(q => ({
          id: q.id,
          date: toKey(q.updated_at),
          label: q.title,
          subject: q.subject,
          kind: 'quiz',
          color: '#2563EB',
          bg: '#EFF6FF',
        })),
        ...(adminEvents || []).map(e => ({
          id: `admin-${e.id}`,
          date: e.date,
          label: e.title,
          subject: e.description || '',
          kind: 'compulsory',
          color: e.color || '#8B5CF6',
          bg: (e.color || '#8B5CF6') + '18',
          isCompulsory: true,
        })),
      ].filter(e => e.date !== null);

      setEvents(evList);
    } catch (e) {
      addToast('error', 'Failed to load calendar: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  // ── Calendar grid ─────────────────────────────────────────────
  const firstDay    = new Date(year, month, 1).getDay();   // 0=Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayKey    = toKey(now.toISOString());

  const eventMap = groupByDate(events);

  const cells = [];
  // Blank cells before the 1st
  for (let i = 0; i < firstDay; i++) cells.push(null);
  // Day cells
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const prevMonth = () => {
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else setMonth(m => m - 1);
    setSelected(null);
  };
  const nextMonth = () => {
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else setMonth(m => m + 1);
    setSelected(null);
  };

  const selectedKey = selected;
  const selectedEvs = selectedKey ? (eventMap[selectedKey] || []) : [];

  return (
    <div className="page">
      <div className="ph">
        <div className="pt">📅 Study Calendar</div>
        <div className="ps">Upcoming live arenas and recently approved quizzes</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20, alignItems: 'flex-start' }}>

        {/* ── Calendar grid ─────────────────────────────────── */}
        <div className="card" style={{ padding: 20 }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <button aria-label="Previous month" onClick={prevMonth} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: '#374151', padding: '4px 8px' }}>‹</button>
            <div style={{ fontWeight: 700, fontSize: 16 }}>{MONTHS[month]} {year}</div>
            <button aria-label="Next month" onClick={nextMonth} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: '#374151', padding: '4px 8px' }}>›</button>
          </div>

          {/* Day labels */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 4 }}>
            {DAYS.map(d => (
              <div key={d} style={{ textAlign: 'center', fontWeight: 700, fontSize: 11, color: '#9CA3AF', padding: '4px 0' }}>{d}</div>
            ))}
          </div>

          {/* Day cells */}
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
              <div style={{ width: 24, height: 24, borderRadius: '50%', border: '3px solid #E5E7EB', borderTopColor: '#2563EB', animation: 'spin 0.8s linear infinite' }} />
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
              {cells.map((day, idx) => {
                if (!day) return <div key={`blank-${idx}`} />;
                const key    = `${year}-${pad(month + 1)}-${pad(day)}`;
                const dayEvs = eventMap[key] || [];
                const isToday = key === todayKey;
                const isSel   = key === selectedKey;
                const hasArena = dayEvs.some(e => e.kind === 'arena');
                const hasQuiz  = dayEvs.some(e => e.kind === 'quiz');
                const hasAdmin = dayEvs.some(e => e.kind === 'compulsory');

                return (
                  <div
                    key={key}
                    onClick={() => setSelected(isSel ? null : key)}
                    style={{
                      minHeight: 48, padding: '6px 4px', borderRadius: 8, cursor: 'pointer',
                      background: isSel ? '#4F46E5' : isToday ? '#EFF6FF' : 'transparent',
                      border: isToday ? '2px solid #2563EB' : '2px solid transparent',
                      transition: 'background .15s',
                      display: 'flex', flexDirection: 'column', alignItems: 'center',
                    }}
                    onMouseEnter={e => { if (!isSel) e.currentTarget.style.background = '#F9FAFB'; }}
                    onMouseLeave={e => { if (!isSel) e.currentTarget.style.background = isToday ? '#EFF6FF' : 'transparent'; }}
                  >
                    <span style={{
                      fontWeight: isToday || isSel ? 700 : 400,
                      fontSize: 13, color: isSel ? '#fff' : isToday ? '#2563EB' : '#374151',
                      marginBottom: 3,
                    }}>
                      {day}
                    </span>
                    {/* Event dots */}
                    <div style={{ display: 'flex', gap: 2, flexWrap: 'wrap', justifyContent: 'center' }}>
                      {hasArena && <div style={{ width: 6, height: 6, borderRadius: '50%', background: isSel ? '#fff' : '#EF4444' }} />}
                      {hasQuiz  && <div style={{ width: 6, height: 6, borderRadius: '50%', background: isSel ? '#BFD7FF' : '#2563EB' }} />}
                      {hasAdmin && <div style={{ width: 6, height: 6, borderRadius: '50%', background: isSel ? '#FDE68A' : '#8B5CF6' }} />}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Legend */}
          <div style={{ display: 'flex', gap: 16, marginTop: 16, paddingTop: 14, borderTop: '1px solid #F3F4F6', fontSize: 12, color: '#6B7280', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#EF4444' }} /> Live Arena
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#2563EB' }} /> Quiz Approved
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#8B5CF6' }} /> Admin Event
            </div>
          </div>
        </div>

        {/* ── Right: selected day detail / upcoming list ─────── */}
        <div>
          {selectedKey && (
            <div className="card" style={{ marginBottom: 16 }}>
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12 }}>
                {new Date(`${selectedKey}T12:00`).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
              </div>
              {selectedEvs.length === 0 ? (
                <div style={{ color: '#9CA3AF', fontSize: 13 }}>No events on this day.</div>
              ) : selectedEvs.map((ev, i) => (
                <div key={i} style={{ marginBottom: 10, padding: '10px 12px', borderRadius: 8, background: ev.bg, borderLeft: `3px solid ${ev.color}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                    <span style={{ fontSize: 14 }}>{ev.kind === 'arena' ? '🔴' : ev.kind === 'compulsory' ? '📌' : '📝'}</span>
                    <div style={{ fontWeight: 700, fontSize: 13 }}>{ev.label}</div>
                    {ev.isCompulsory && (
                      <span style={{ fontSize: 9, fontWeight: 700, color: '#8B5CF6', background: '#F5F3FF', borderRadius: 99, padding: '1px 6px', border: '1px solid #DDD6FE' }}>ADMIN</span>
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: '#6B7280' }}>{ev.subject}</div>
                  {ev.kind === 'arena' && ev.time && (
                    <div style={{ fontSize: 12, color: ev.color, fontWeight: 600, marginTop: 3 }}>⏰ {ev.time} · PIN: {ev.pin}</div>
                  )}
                  {ev.kind === 'quiz' && (
                    <div style={{ fontSize: 11, color: '#6B7280', marginTop: 3 }}>Newly approved quiz</div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Admin compulsory events panel */}
          {events.filter(e => e.kind === 'compulsory' && e.date >= todayKey).length > 0 && (
            <div className="card" style={{ marginBottom: 16 }}>
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12 }}>📌 Compulsory Events</div>
              {events
                .filter(e => e.kind === 'compulsory' && e.date >= todayKey)
                .slice(0, 5)
                .map((ev, i) => (
                  <div key={i} style={{ marginBottom: 8, padding: '10px 12px', borderRadius: 8, background: ev.bg || '#F5F3FF', borderLeft: `3px solid ${ev.color || '#8B5CF6'}` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                      <div style={{ fontWeight: 700, fontSize: 13 }}>{ev.label}</div>
                      <span style={{ fontSize: 9, fontWeight: 700, color: '#8B5CF6', background: '#F5F3FF', borderRadius: 99, padding: '1px 6px', border: '1px solid #DDD6FE' }}>ADMIN</span>
                    </div>
                    <div style={{ fontSize: 12, color: '#6B7280' }}>
                      {new Date(`${ev.date}T12:00`).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
                    </div>
                    {ev.subject && <div style={{ fontSize: 11, color: '#6B7280', marginTop: 2 }}>{ev.subject}</div>}
                  </div>
                ))}
            </div>
          )}

          {/* Upcoming arenas panel */}
          <div className="card">
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12 }}>🔴 Upcoming Live Arenas</div>
            {loading ? (
              <div style={{ color: '#9CA3AF', fontSize: 13 }}>Loading…</div>
            ) : events.filter(e => e.kind === 'arena' && e.date >= todayKey).length === 0 ? (
              <div style={{ color: '#9CA3AF', fontSize: 13 }}>No arenas scheduled.</div>
            ) : (
              events
                .filter(e => e.kind === 'arena' && e.date >= todayKey)
                .slice(0, 5)
                .map((ev, i) => (
                  <div key={i} style={{ marginBottom: 8, padding: '10px 12px', borderRadius: 8, background: '#FEF2F2', border: '1px solid #FECACA' }}>
                    <div style={{ fontWeight: 700, fontSize: 13 }}>{ev.label}</div>
                    <div style={{ fontSize: 12, color: '#6B7280' }}>
                      {new Date(`${ev.date}T12:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} {ev.time && `· ${ev.time}`}
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#EF4444', marginTop: 2 }}>PIN: {ev.pin}</div>
                  </div>
                ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
