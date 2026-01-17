'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  Clock,
  Calendar,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  XCircle,
  AlertCircle,
  TrendingUp,
  ArrowLeft,
} from 'lucide-react';
import Link from 'next/link';

interface AttendanceRecord {
  id: string;
  date: string;
  check_in: string | null;
  check_out: string | null;
  status: string;
  total_hours: number | null;
  check_in_branch?: { name: string };
  check_out_branch?: { name: string };
}

interface MonthlySummary {
  workingDays: number;
  presentDays: number;
  lateDays: number;
  absentDays: number;
  totalHours: number;
  avgHoursPerDay: number;
}

function formatTime(timeString: string | null): string {
  if (!timeString) return '-';
  return new Date(`2000-01-01T${timeString}`).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

function getStatusIcon(status: string) {
  switch (status) {
    case 'present':
      return <CheckCircle2 size={16} className="text-green-600" />;
    case 'late':
      return <AlertCircle size={16} className="text-yellow-600" />;
    case 'absent':
      return <XCircle size={16} className="text-red-600" />;
    case 'early_leave':
      return <AlertCircle size={16} className="text-orange-600" />;
    default:
      return <Clock size={16} className="text-gray-400" />;
  }
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'present':
      return 'bg-green-100 text-green-700';
    case 'late':
      return 'bg-yellow-100 text-yellow-700';
    case 'absent':
      return 'bg-red-100 text-red-700';
    case 'early_leave':
      return 'bg-orange-100 text-orange-700';
    default:
      return 'bg-gray-100 text-gray-700';
  }
}

export default function MyAttendancePage() {
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [summary, setSummary] = useState<MonthlySummary | null>(null);
  const [loading, setLoading] = useState(true);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1;

  useEffect(() => {
    fetchAttendance();
  }, [year, month]);

  const fetchAttendance = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/my-portal/attendance?year=${year}&month=${month}`);
      if (res.ok) {
        const data = await res.json();
        setAttendance(data.attendance || []);
        setSummary(data.summary || null);
      }
    } catch (error) {
      console.error('Error fetching attendance:', error);
    } finally {
      setLoading(false);
    }
  };

  const previousMonth = () => {
    setCurrentDate(new Date(year, month - 2, 1));
  };

  const nextMonth = () => {
    const today = new Date();
    const nextDate = new Date(year, month, 1);
    if (nextDate <= today) {
      setCurrentDate(nextDate);
    }
  };

  const monthName = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const isCurrentMonth = year === new Date().getFullYear() && month === new Date().getMonth() + 1;

  // Generate calendar days
  const daysInMonth = new Date(year, month, 0).getDate();
  const firstDayOfMonth = new Date(year, month - 1, 1).getDay();
  const attendanceMap = new Map(attendance.map((a) => [a.date, a]));

  const calendarDays = [];
  // Add empty slots for days before month starts
  for (let i = 0; i < firstDayOfMonth; i++) {
    calendarDays.push({ day: null, record: null });
  }
  // Add actual days
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    calendarDays.push({ day, date: dateStr, record: attendanceMap.get(dateStr) || null });
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/my-portal"
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft size={20} className="text-gray-600" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Attendance</h1>
          <p className="text-gray-600">View your attendance history and statistics</p>
        </div>
      </div>

      {/* Month Navigation */}
      <div className="flex items-center justify-between bg-white rounded-xl border border-gray-200 p-4">
        <button
          onClick={previousMonth}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ChevronLeft size={20} className="text-gray-600" />
        </button>
        <h2 className="text-lg font-semibold text-gray-900">{monthName}</h2>
        <button
          onClick={nextMonth}
          disabled={isCurrentMonth}
          className={`p-2 rounded-lg transition-colors ${
            isCurrentMonth ? 'text-gray-300 cursor-not-allowed' : 'hover:bg-gray-100 text-gray-600'
          }`}
        >
          <ChevronRight size={20} />
        </button>
      </div>

      {/* Monthly Summary */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
            <p className="text-2xl font-bold text-gray-900">{summary.workingDays}</p>
            <p className="text-sm text-gray-500">Working Days</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
            <p className="text-2xl font-bold text-green-600">{summary.presentDays}</p>
            <p className="text-sm text-gray-500">Present</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
            <p className="text-2xl font-bold text-yellow-600">{summary.lateDays}</p>
            <p className="text-sm text-gray-500">Late</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
            <p className="text-2xl font-bold text-red-600">{summary.absentDays}</p>
            <p className="text-sm text-gray-500">Absent</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
            <p className="text-2xl font-bold text-blue-600">{summary.totalHours}h</p>
            <p className="text-sm text-gray-500">Total Hours</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
            <p className="text-2xl font-bold text-purple-600">{summary.avgHoursPerDay}h</p>
            <p className="text-sm text-gray-500">Avg/Day</p>
          </div>
        </div>
      )}

      {/* Calendar View */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="grid grid-cols-7 bg-gray-50 border-b border-gray-200">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <div key={day} className="p-3 text-center text-sm font-medium text-gray-500">
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {calendarDays.map((item, index) => {
            const isWeekend = index % 7 === 0 || index % 7 === 6;
            const isToday =
              item.date === new Date().toISOString().split('T')[0];

            return (
              <div
                key={index}
                className={`min-h-[80px] p-2 border-b border-r border-gray-100 ${
                  isWeekend ? 'bg-gray-50' : ''
                } ${isToday ? 'ring-2 ring-purple-500 ring-inset' : ''}`}
              >
                {item.day && (
                  <>
                    <p
                      className={`text-sm font-medium mb-1 ${
                        isToday ? 'text-purple-600' : 'text-gray-700'
                      }`}
                    >
                      {item.day}
                    </p>
                    {item.record ? (
                      <div className="space-y-1">
                        <div className="flex items-center gap-1">
                          {getStatusIcon(item.record.status)}
                          <span className="text-xs text-gray-600">
                            {formatTime(item.record.check_in)}
                          </span>
                        </div>
                        {item.record.check_out && (
                          <p className="text-xs text-gray-500">
                            → {formatTime(item.record.check_out)}
                          </p>
                        )}
                      </div>
                    ) : !isWeekend && new Date(item.date!) < new Date() ? (
                      <div className="flex items-center gap-1">
                        <XCircle size={14} className="text-red-400" />
                        <span className="text-xs text-red-400">Absent</span>
                      </div>
                    ) : null}
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Detailed List */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <h3 className="font-semibold text-gray-900">Detailed Records</h3>
        </div>
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading...</div>
        ) : attendance.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No attendance records for this month</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Check In
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Check Out
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Hours
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Location
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {attendance.map((record) => (
                  <tr key={record.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">
                        {new Date(record.date).toLocaleDateString('en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{formatTime(record.check_in)}</td>
                    <td className="px-4 py-3 text-gray-600">{formatTime(record.check_out)}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {record.total_hours ? `${record.total_hours.toFixed(1)}h` : '-'}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium capitalize ${getStatusColor(
                          record.status
                        )}`}
                      >
                        {record.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {record.check_in_branch?.name || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
