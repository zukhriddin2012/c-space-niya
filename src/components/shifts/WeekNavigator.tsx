'use client';

import React from 'react';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import Button from '@/components/ui/Button';

interface WeekNavigatorProps {
  weekStartDate: Date;
  onWeekChange: (newDate: Date) => void;
  disabled?: boolean;
}

// Get Monday of the week for a given date
function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

// Format date range for display
function formatWeekRange(startDate: Date): string {
  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + 6);

  const startMonth = startDate.toLocaleDateString('en-US', { month: 'short' });
  const endMonth = endDate.toLocaleDateString('en-US', { month: 'short' });
  const startDay = startDate.getDate();
  const endDay = endDate.getDate();
  const year = startDate.getFullYear();

  if (startMonth === endMonth) {
    return `${startMonth} ${startDay}-${endDay}, ${year}`;
  }
  return `${startMonth} ${startDay} - ${endMonth} ${endDay}, ${year}`;
}

export default function WeekNavigator({
  weekStartDate,
  onWeekChange,
  disabled = false,
}: WeekNavigatorProps) {
  const today = getMonday(new Date());
  const isCurrentWeek = weekStartDate.getTime() === today.getTime();

  const handlePrevWeek = () => {
    const newDate = new Date(weekStartDate);
    newDate.setDate(newDate.getDate() - 7);
    onWeekChange(newDate);
  };

  const handleNextWeek = () => {
    const newDate = new Date(weekStartDate);
    newDate.setDate(newDate.getDate() + 7);
    onWeekChange(newDate);
  };

  const handleToday = () => {
    onWeekChange(today);
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="secondary"
        size="sm"
        onClick={handlePrevWeek}
        disabled={disabled}
        className="p-2"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      <Button
        variant={isCurrentWeek ? 'primary' : 'outline'}
        size="sm"
        onClick={handleToday}
        disabled={disabled || isCurrentWeek}
        className="flex items-center gap-1.5"
      >
        <Calendar className="h-4 w-4" />
        <span className="hidden sm:inline">This Week</span>
      </Button>

      <Button
        variant="secondary"
        size="sm"
        onClick={handleNextWeek}
        disabled={disabled}
        className="p-2"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>

      <div className="ml-2 text-sm font-medium text-gray-700">
        {formatWeekRange(weekStartDate)}
      </div>
    </div>
  );
}

export { getMonday, formatWeekRange };
