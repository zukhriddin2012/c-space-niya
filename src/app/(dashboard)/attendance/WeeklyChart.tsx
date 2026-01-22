'use client';

import { useEffect, useState } from 'react';
import { TrendingUp } from 'lucide-react';

interface DaySummary {
  day: string;
  date: string;
  present: number;
  late: number;
  absent: number;
  total: number;
}

export default function WeeklyChart() {
  const [weeklySummary, setWeeklySummary] = useState<DaySummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchWeeklySummary() {
      try {
        const res = await fetch('/api/attendance/weekly-summary');
        if (res.ok) {
          const data = await res.json();
          setWeeklySummary(data);
        }
      } catch (error) {
        console.error('Error fetching weekly summary:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchWeeklySummary();
  }, []);

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp size={20} className="text-purple-600" />
          <h3 className="font-semibold text-gray-900">This Week&apos;s Attendance</h3>
        </div>
        <div className="flex items-end gap-4 h-32">
          {[...Array(7)].map((_, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full h-24 bg-gray-100 rounded animate-pulse" />
              <div className="w-6 h-3 bg-gray-200 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (weeklySummary.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp size={20} className="text-purple-600" />
        <h3 className="font-semibold text-gray-900">This Week&apos;s Attendance</h3>
      </div>
      <div className="flex items-end gap-4 h-32">
        {weeklySummary.map((day, index) => {
          const safeTotal = day.total > 0 ? day.total : 1;
          const presentHeight = (day.present / safeTotal) * 100;
          const lateHeight = (day.late / safeTotal) * 100;
          const isToday = index === (new Date().getDay() === 0 ? 6 : new Date().getDay() - 1);
          const isWeekend = index === 5 || index === 6;
          return (
            <div key={day.day} className="flex-1 flex flex-col items-center gap-1">
              <div className={`w-full flex flex-col-reverse h-24 rounded overflow-hidden ${isWeekend ? 'bg-gray-50' : 'bg-gray-100'}`}>
                {!isWeekend && (
                  <>
                    <div className="bg-green-500 transition-all" style={{ height: `${presentHeight}%` }} />
                    <div className="bg-orange-400 transition-all" style={{ height: `${lateHeight}%` }} />
                  </>
                )}
              </div>
              <span className={`text-xs ${isToday ? 'font-bold text-purple-600' : isWeekend ? 'text-gray-400' : 'text-gray-500'}`}>
                {day.day}
              </span>
            </div>
          );
        })}
      </div>
      <div className="flex items-center gap-6 mt-4 justify-center">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-green-500 rounded" />
          <span className="text-xs text-gray-600">On Time</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-orange-400 rounded" />
          <span className="text-xs text-gray-600">Late</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-gray-100 rounded" />
          <span className="text-xs text-gray-600">Absent</span>
        </div>
      </div>
    </div>
  );
}
