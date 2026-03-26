import { useState, memo } from 'react';
import MonthlyCalendar from './MonthlyCalendar';
import GoalRing from './GoalRing';
import JournalModal from '../JournalModal';
import { useAppStore } from '../../stores/useAppStore';

function CalendarGoalRow({ dashLoading, activityByDate, weeklyMins, currentUserId, refreshDashboard }) {
  const [selectedDate, setSelectedDate] = useState(null);
  const addToast = useAppStore(s => s.addToast);

  if (dashLoading) return null;

  return (
    <>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
      <div className="card" style={{ margin: 0 }}>
        <div className="ch mb-3">
          <div className="ct">📅 Activity Calendar</div>
        </div>
        <MonthlyCalendar
          activityByDate={activityByDate}
          selectedDate={selectedDate}
          onDateClick={date => setSelectedDate(date)}
        />
      </div>
      <div className="card flex flex-col items-center justify-center" style={{ margin: 0 }}>
        <div className="ch mb-3 w-full">
          <div className="ct">🎯 Weekly Learning Target</div>
        </div>
        <GoalRing mins={weeklyMins} userId={currentUserId} />
      </div>
    </div>
    {selectedDate && currentUserId && (
      <JournalModal
        date={selectedDate}
        userId={currentUserId}
        onClose={() => setSelectedDate(null)}
        addToast={addToast}
        onSave={() => { setSelectedDate(null); refreshDashboard?.(); }}
        mode="modal"
      />
    )}
    </>
  );
}

export default memo(CalendarGoalRow);
