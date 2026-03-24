import { useState } from 'react';
import MonthlyCalendar from './MonthlyCalendar';
import GoalRing from './GoalRing';
import DayDetailPanel from './DayDetailPanel';

export default function CalendarGoalRow({ dashLoading, activityByDate, weeklyMins, currentUserId }) {
  const [selectedDate, setSelectedDate] = useState(null);

  if (dashLoading) return null;

  return (
    <>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16, marginBottom: 20 }}>
      <div className="card" style={{ margin: 0 }}>
        <div className="ch" style={{ marginBottom: 12 }}>
          <div className="ct">📅 Activity Calendar</div>
        </div>
        <MonthlyCalendar
          activityByDate={activityByDate}
          selectedDate={selectedDate}
          onDateClick={date => setSelectedDate(date)}
        />
      </div>
      <div className="card" style={{ margin: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <div className="ch" style={{ marginBottom: 12, width: '100%' }}>
          <div className="ct">🎯 Weekly Learning Target</div>
        </div>
        <GoalRing mins={weeklyMins} userId={currentUserId} />
      </div>
    </div>
    {selectedDate && (
      <DayDetailPanel
        date={selectedDate}
        userId={currentUserId}
        onClose={() => setSelectedDate(null)}
      />
    )}
    </>
  );
}
