'use client';

import React, { useState, useEffect } from 'react';
import { useServiceHub } from '@/contexts/ServiceHubContext';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  Calendar,
  Sun,
  Moon,
} from 'lucide-react';

interface EmployeeShift {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeStatus: 'active' | 'on_leave' | 'unavailable' | 'unassigned';
}

interface DayShifts {
  date: string;
  dayOfWeek: string;
  dayShift: EmployeeShift[];
  nightShift: EmployeeShift[];
}

interface ShiftsResponse {
  weekStart: string;
  weekEnd: string;
  schedule: DayShifts[];
}

const getWeekStart = (date: Date): string => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  // Use local date (not toISOString which converts to UTC and shifts dates in UTC+ timezones)
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const dayStr = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${dayStr}`;
};

const formatDate = (dateString: string): string => {
  const date = new Date(dateString + 'T00:00:00');
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const getStatusColor = (status: string): string => {
  switch (status) {
    case 'active': return 'bg-green-100 text-green-800 border border-green-200';
    case 'on_leave': return 'bg-blue-100 text-blue-800 border border-blue-200';
    case 'unavailable': return 'bg-red-100 text-red-800 border border-red-200';
    default: return 'bg-gray-100 text-gray-800 border border-gray-200';
  }
};

const getStatusLabel = (status: string): string => {
  switch (status) {
    case 'active': return 'Active';
    case 'on_leave': return 'On Leave';
    case 'unavailable': return 'Unavailable';
    case 'unassigned': return 'Unassigned';
    default: return 'Unknown';
  }
};

export default function ReceptionShifts() {
  const { selectedBranchId } = useServiceHub();
  const [weekStart, setWeekStart] = useState<string>(() => getWeekStart(new Date()));
  const [schedule, setSchedule] = useState<DayShifts[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [noScheduleFound, setNoScheduleFound] = useState(false);

  useEffect(() => {
    if (!selectedBranchId) return;
    fetchShifts();
  }, [selectedBranchId, weekStart]);

  const fetchShifts = async () => {
    try {
      setIsLoading(true);
      setError(null);
      setNoScheduleFound(false);

      const params = new URLSearchParams({
        branchId: selectedBranchId || '',
        weekStart,
      });

      const response = await fetch(`/api/reception/shifts?${params.toString()}`);

      if (!response.ok) {
        throw new Error('Failed to fetch shift schedule');
      }

      const data: ShiftsResponse = await response.json();

      if (!data.schedule || data.schedule.length === 0) {
        setNoScheduleFound(true);
        setSchedule([]);
      } else {
        setSchedule(data.schedule);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load shift schedule');
    } finally {
      setIsLoading(false);
    }
  };

  const formatLocalDate = (d: Date): string => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const handlePreviousWeek = () => {
    const current = new Date(weekStart + 'T00:00:00');
    current.setDate(current.getDate() - 7);
    setWeekStart(formatLocalDate(current));
  };

  const handleNextWeek = () => {
    const current = new Date(weekStart + 'T00:00:00');
    current.setDate(current.getDate() + 7);
    setWeekStart(formatLocalDate(current));
  };

  const handleCurrentWeek = () => {
    setWeekStart(getWeekStart(new Date()));
  };

  if (!selectedBranchId) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 mb-4">Please select a branch first</p>
      </div>
    );
  }

  const weekStartDate = new Date(weekStart + 'T00:00:00');
  const weekEndDate = new Date(weekStartDate);
  weekEndDate.setDate(weekEndDate.getDate() + 6);
  const weekLabel = `${formatDate(weekStart)} - ${weekEndDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Shifts Schedule</h1>
        <p className="text-sm text-gray-500 mt-1">Published reception shift assignments</p>
      </div>

      {/* Week Navigation */}
      <Card>
        <div className="flex items-center justify-between">
          <Button variant="secondary" size="sm" onClick={handlePreviousWeek} leftIcon={<ChevronLeft className="w-4 h-4" />}>
            Previous
          </Button>
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-400" />
            <span className="text-sm font-semibold text-gray-900">{weekLabel}</span>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={handleCurrentWeek}>Today</Button>
            <Button variant="secondary" size="sm" onClick={handleNextWeek} rightIcon={<ChevronRight className="w-4 h-4" />}>
              Next
            </Button>
          </div>
        </div>
      </Card>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
        </div>
      ) : error ? (
        <Card>
          <div className="text-center py-8">
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={() => fetchShifts()} variant="secondary">Retry</Button>
          </div>
        </Card>
      ) : noScheduleFound ? (
        <Card>
          <div className="text-center py-12">
            <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">No published schedule for this week</p>
            <p className="text-gray-400 text-sm mt-2">Check back later or navigate to another week</p>
          </div>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 auto-rows-max">
            {schedule.map((dayShifts) => (
              <Card key={dayShifts.date} className="overflow-hidden">
                <div className="border-b border-gray-200 bg-gradient-to-r from-purple-50 to-blue-50 px-4 py-3">
                  <h3 className="font-semibold text-gray-900">{dayShifts.dayOfWeek}</h3>
                  <p className="text-sm text-gray-600">{formatDate(dayShifts.date)}</p>
                </div>
                <div className="divide-y divide-gray-100">
                  {/* Day Shift */}
                  <div>
                    <div className="bg-white px-4 py-2.5 flex items-center gap-2 border-b border-gray-100">
                      <Sun className="w-4 h-4 text-yellow-600" />
                      <span className="text-sm font-semibold text-gray-700">Day Shift</span>
                    </div>
                    {dayShifts.dayShift.length === 0 ? (
                      <div className="px-4 py-4 text-center"><p className="text-sm text-gray-500">No staff assigned</p></div>
                    ) : (
                      <div className="divide-y divide-gray-100">
                        {dayShifts.dayShift.map((emp) => (
                          <div key={emp.id} className="px-4 py-3 flex items-center justify-between hover:bg-gray-50">
                            <p className="text-sm font-medium text-gray-900">{emp.employeeName}</p>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(emp.employeeStatus)}`}>
                              {getStatusLabel(emp.employeeStatus)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  {/* Night Shift */}
                  <div>
                    <div className="bg-white px-4 py-2.5 flex items-center gap-2 border-b border-gray-100">
                      <Moon className="w-4 h-4 text-indigo-600" />
                      <span className="text-sm font-semibold text-gray-700">Night Shift</span>
                    </div>
                    {dayShifts.nightShift.length === 0 ? (
                      <div className="px-4 py-4 text-center"><p className="text-sm text-gray-500">No staff assigned</p></div>
                    ) : (
                      <div className="divide-y divide-gray-100">
                        {dayShifts.nightShift.map((emp) => (
                          <div key={emp.id} className="px-4 py-3 flex items-center justify-between hover:bg-gray-50">
                            <p className="text-sm font-medium text-gray-900">{emp.employeeName}</p>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(emp.employeeStatus)}`}>
                              {getStatusLabel(emp.employeeStatus)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* Legend */}
          <Card>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { color: 'bg-green-500', label: 'Active' },
                { color: 'bg-blue-500', label: 'On Leave' },
                { color: 'bg-red-500', label: 'Unavailable' },
                { color: 'bg-gray-500', label: 'Unassigned' },
              ].map(item => (
                <div key={item.label} className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${item.color}`} />
                  <span className="text-sm text-gray-700">{item.label}</span>
                </div>
              ))}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
