'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { MetronomeKeyDateRow } from '@/lib/db/metronome';

interface MonthCalendarProps {
  keyDates: MetronomeKeyDateRow[];
  onMonthChange: (year: number, month: number) => void;
}

const categoryColors: Record<string, string> = {
  critical: 'bg-red-200 text-red-800',
  high: 'bg-orange-200 text-orange-800',
  meeting: 'bg-purple-200 text-purple-800',
  strategic: 'bg-blue-200 text-blue-800',
  event: 'bg-emerald-200 text-emerald-800',
  holiday: 'bg-amber-200 text-amber-800',
};

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export default function MonthCalendar({ keyDates, onMonthChange }: MonthCalendarProps) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());

  // Use local date components (not UTC via toISOString) to match calendar cell dates
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  const goToPrev = () => {
    const newMonth = month === 0 ? 11 : month - 1;
    const newYear = month === 0 ? year - 1 : year;
    setMonth(newMonth);
    setYear(newYear);
    onMonthChange(newYear, newMonth);
  };

  const goToNext = () => {
    const newMonth = month === 11 ? 0 : month + 1;
    const newYear = month === 11 ? year + 1 : year;
    setMonth(newMonth);
    setYear(newYear);
    onMonthChange(newYear, newMonth);
  };

  // Build calendar grid
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();

  // Adjust for Monday start (0=Mon...6=Sun)
  let startDow = firstDay.getDay() - 1;
  if (startDow < 0) startDow = 6;

  const cells: Array<{ day: number | null; dateStr: string }> = [];

  // Padding days from previous month
  for (let i = 0; i < startDow; i++) {
    cells.push({ day: null, dateStr: '' });
  }

  // Actual days
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    cells.push({ day: d, dateStr });
  }

  // Group key dates by date string
  const dateMap: Record<string, MetronomeKeyDateRow[]> = {};
  for (const kd of keyDates) {
    const ds = kd.date;
    if (!dateMap[ds]) dateMap[ds] = [];
    dateMap[ds].push(kd);
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <button onClick={goToPrev} className="p-1 rounded hover:bg-gray-100 transition-colors">
          <ChevronLeft size={18} className="text-gray-500" />
        </button>
        <h3 className="text-sm font-semibold text-gray-900">
          {MONTHS[month]} {year}
        </h3>
        <button onClick={goToNext} className="p-1 rounded hover:bg-gray-100 transition-colors">
          <ChevronRight size={18} className="text-gray-500" />
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 gap-0 mb-1">
        {DAYS.map(d => (
          <div key={d} className="text-center text-[10px] font-medium text-gray-400 py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-0">
        {cells.map((cell, idx) => {
          if (cell.day === null) {
            return <div key={`empty-${idx}`} className="h-16 border-t border-gray-100" />;
          }

          const isToday = cell.dateStr === todayStr;
          const events = dateMap[cell.dateStr] || [];

          return (
            <div
              key={cell.dateStr}
              className={`h-16 border-t border-gray-100 p-0.5 relative ${
                isToday ? 'ring-2 ring-inset ring-purple-500 bg-purple-50/30 rounded' : ''
              }`}
            >
              <div className="flex items-start justify-between">
                <span
                  className={`inline-flex items-center justify-center w-5 h-5 text-[11px] rounded-full ${
                    isToday
                      ? 'bg-purple-600 text-white font-bold shadow-sm'
                      : 'text-gray-700'
                  }`}
                >
                  {cell.day}
                </span>
                {isToday && (
                  <span className="text-[8px] font-bold text-purple-600 leading-none mt-0.5">
                    TODAY
                  </span>
                )}
              </div>

              {/* Event pills */}
              <div className="mt-0.5 space-y-0.5 overflow-hidden">
                {events.slice(0, 2).map(ev => (
                  <div
                    key={ev.id}
                    className={`text-[9px] px-1 py-0 rounded truncate leading-tight ${
                      categoryColors[ev.category] || 'bg-gray-200 text-gray-700'
                    }`}
                    title={ev.title}
                  >
                    {ev.emoji ? `${ev.emoji} ` : ''}{ev.title}
                  </div>
                ))}
                {events.length > 2 && (
                  <div className="text-[9px] text-gray-400 px-1">
                    +{events.length - 2} more
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
