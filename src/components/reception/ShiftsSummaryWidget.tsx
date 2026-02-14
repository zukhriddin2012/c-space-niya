'use client';

import { Calendar, Sun, Moon, Clock, Users } from 'lucide-react';
import { useTranslation } from '@/contexts/LanguageContext';

interface ShiftEmployee {
  employeeId: string;
  employeeName: string;
  employeeStatus: string;
}

interface ShiftDayData {
  date: string;
  dayOfWeek: string;
  dayCount: number;
  nightCount: number;
  dayRequired: number;
  nightRequired: number;
}

interface ShiftsData {
  today: {
    date: string;
    dayShift: { assigned: number; required: number; employees: ShiftEmployee[] };
    nightShift: { assigned: number; required: number; employees: ShiftEmployee[] };
  };
  week: {
    weekStart: string;
    days: ShiftDayData[];
  };
  myShifts: Array<{ date: string; shiftType: 'day' | 'night'; branchName: string }>;
}

interface ShiftsSummaryWidgetProps {
  data: ShiftsData | null;
  isLoading: boolean;
  onNavigate: () => void;
}

function CoveragePill({ assigned, required }: { assigned: number; required: number }) {
  const isFull = assigned >= required;
  const isEmpty = assigned === 0;

  let colorClass = 'bg-green-50 text-green-700 border-green-200';
  if (isEmpty) colorClass = 'bg-gray-50 text-gray-400 border-gray-200';
  else if (!isFull) colorClass = 'bg-amber-50 text-amber-700 border-amber-200';

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${colorClass}`}>
      {assigned}/{required}
    </span>
  );
}

// BUG-3 FIX: Accept title prop for i18n instead of hardcoding English
function SkeletonShifts({ title }: { title: string }) {
  return (
    <div className="space-y-3">
      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{title}</h3>
      <div className="p-4 rounded-xl border border-gray-200 bg-white shadow-sm space-y-4">
        <div className="h-20 bg-gray-50 rounded-lg animate-pulse" />
        <div className="h-16 bg-gray-50 rounded-lg animate-pulse" />
      </div>
    </div>
  );
}

export function ShiftsSummaryWidget({ data, isLoading, onNavigate }: ShiftsSummaryWidgetProps) {
  const { t } = useTranslation();

  if (isLoading) return <SkeletonShifts title={t.reception.dashboard?.shiftsTitle || 'Shifts Overview'} />;

  // No published schedule
  if (!data) {
    return (
      <div className="space-y-3">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
          {t.reception.dashboard?.shiftsTitle || 'Shifts Overview'}
        </h3>
        <div className="p-5 rounded-xl border border-gray-200 bg-white shadow-sm text-center">
          <Calendar className="w-10 h-10 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-500">
            {t.reception.dashboard?.noSchedule || 'No published schedule for this week'}
          </p>
        </div>
      </div>
    );
  }

  const todayStr = data.today.date;

  return (
    <div className="space-y-3">
      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
        {t.reception.dashboard?.shiftsTitle || 'Shifts Overview'}
      </h3>
      <div
        onClick={onNavigate}
        className="p-4 rounded-xl border border-gray-200 bg-white shadow-sm cursor-pointer hover:shadow-md hover:border-gray-300 transition-all space-y-5"
      >
        {/* Today's Coverage */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-4 h-4 text-purple-600" />
            <h4 className="text-sm font-semibold text-gray-900">
              {t.reception.dashboard?.todayCoverage || "Today's Coverage"}
            </h4>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {/* Day Shift */}
            <div className="p-3 rounded-lg bg-amber-50/50 border border-amber-100">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <Sun className="w-3.5 h-3.5 text-amber-500" />
                  <span className="text-xs font-medium text-gray-600">
                    {t.reception.dashboard?.dayShift || 'Day'}
                  </span>
                </div>
                <CoveragePill assigned={data.today.dayShift.assigned} required={data.today.dayShift.required} />
              </div>
              <div className="space-y-0.5">
                {data.today.dayShift.employees.length > 0 ? (
                  data.today.dayShift.employees.map(emp => (
                    <p key={emp.employeeId} className="text-[11px] text-gray-600 truncate">
                      {emp.employeeName}
                    </p>
                  ))
                ) : (
                  <p className="text-[11px] text-gray-400 italic">
                    {t.reception.dashboard?.noStaffAssigned || 'No staff assigned'}
                  </p>
                )}
              </div>
            </div>

            {/* Night Shift */}
            <div className="p-3 rounded-lg bg-indigo-50/50 border border-indigo-100">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <Moon className="w-3.5 h-3.5 text-indigo-500" />
                  <span className="text-xs font-medium text-gray-600">
                    {t.reception.dashboard?.nightShift || 'Night'}
                  </span>
                </div>
                <CoveragePill assigned={data.today.nightShift.assigned} required={data.today.nightShift.required} />
              </div>
              <div className="space-y-0.5">
                {data.today.nightShift.employees.length > 0 ? (
                  data.today.nightShift.employees.map(emp => (
                    <p key={emp.employeeId} className="text-[11px] text-gray-600 truncate">
                      {emp.employeeName}
                    </p>
                  ))
                ) : (
                  <p className="text-[11px] text-gray-400 italic">
                    {t.reception.dashboard?.noStaffAssigned || 'No staff assigned'}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Weekly Grid */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="w-4 h-4 text-purple-600" />
            <h4 className="text-sm font-semibold text-gray-900">
              {t.reception.dashboard?.weekOverview || 'This Week'}
            </h4>
          </div>
          <div className="grid grid-cols-7 gap-1">
            {data.week.days.map((day) => {
              const isToday = day.date === todayStr;
              const dayLabel = day.dayOfWeek.substring(0, 2);
              const dayNum = new Date(day.date + 'T00:00:00').getDate();
              const hasGap = (day.dayCount < day.dayRequired && day.dayRequired > 0) ||
                             (day.nightCount < day.nightRequired && day.nightRequired > 0);

              return (
                <div
                  key={day.date}
                  className={`text-center rounded-lg p-1.5 ${
                    isToday
                      ? 'ring-2 ring-purple-400 bg-purple-50'
                      : 'bg-gray-50'
                  }`}
                >
                  <p className="text-[10px] font-medium text-gray-400">{dayLabel}</p>
                  <p className={`text-sm font-bold ${isToday ? 'text-purple-700' : 'text-gray-700'}`}>{dayNum}</p>
                  <div className="flex flex-col gap-0.5 mt-1">
                    <div className="flex items-center justify-center gap-0.5">
                      <Sun className="w-2.5 h-2.5 text-amber-400" />
                      <span className={`text-[10px] font-medium ${
                        day.dayCount < day.dayRequired && day.dayRequired > 0 ? 'text-red-600' : 'text-gray-500'
                      }`}>
                        {day.dayCount}
                      </span>
                    </div>
                    <div className="flex items-center justify-center gap-0.5">
                      <Moon className="w-2.5 h-2.5 text-indigo-400" />
                      <span className={`text-[10px] font-medium ${
                        day.nightCount < day.nightRequired && day.nightRequired > 0 ? 'text-red-600' : 'text-gray-500'
                      }`}>
                        {day.nightCount}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* My Upcoming Shifts */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-4 h-4 text-purple-600" />
            <h4 className="text-sm font-semibold text-gray-900">
              {t.reception.dashboard?.myShifts || 'My Next Shifts'}
            </h4>
          </div>
          {data.myShifts.length > 0 ? (
            <div className="space-y-1">
              {data.myShifts.slice(0, 3).map((shift, i) => {
                const d = new Date(shift.date + 'T00:00:00');
                const label = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
                return (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    {shift.shiftType === 'day' ? (
                      <Sun className="w-3.5 h-3.5 text-amber-400" />
                    ) : (
                      <Moon className="w-3.5 h-3.5 text-indigo-400" />
                    )}
                    <span className="text-gray-700">{label}</span>
                    {shift.branchName && (
                      <span className="text-xs text-gray-400">• {shift.branchName}</span>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-gray-400 italic">
              {t.reception.dashboard?.noUpcomingShifts || 'No upcoming shifts'}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
