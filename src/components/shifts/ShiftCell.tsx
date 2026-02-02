'use client';

import React from 'react';
import { Plus, X, Check, Clock, Sun, Moon } from 'lucide-react';

interface Assignment {
  id: string;
  employee_id: string;
  confirmed_at: string | null;
  start_time?: string | null;  // Custom start time (e.g., "09:00")
  end_time?: string | null;    // Custom end time (e.g., "13:00")
  employees?: {
    full_name: string;
    employee_id: string;
    position: string;
  };
}

// Format time for display (remove seconds if present)
function formatTime(time: string | null | undefined): string {
  if (!time) return '';
  return time.substring(0, 5); // "09:00:00" -> "09:00"
}

interface ShiftCellProps {
  branchId: string;
  date: string;
  shiftType: 'day' | 'night';
  assignments: Assignment[];
  minRequired: number;
  maxAllowed?: number;
  readonly?: boolean;
  onAdd?: () => void;
  onRemove?: (assignmentId: string) => void;
}

export default function ShiftCell({
  branchId,
  date,
  shiftType,
  assignments,
  minRequired,
  maxAllowed,
  readonly = false,
  onAdd,
  onRemove,
}: ShiftCellProps) {
  const isEmpty = assignments.length === 0;
  const isUnderstaffed = assignments.length > 0 && assignments.length < minRequired;
  const isOverstaffed = maxAllowed && assignments.length > maxAllowed;
  const isFull = assignments.length >= minRequired;

  // Determine cell state styling
  const getCellStyle = () => {
    if (isEmpty) return 'bg-red-50 border-red-200';
    if (isUnderstaffed) return 'bg-amber-50 border-amber-200';
    if (isOverstaffed) return 'bg-blue-50 border-blue-200';
    return 'bg-green-50 border-green-200';
  };

  const ShiftIcon = shiftType === 'day' ? Sun : Moon;

  return (
    <div
      className={`
        min-h-[80px] p-2 border rounded-md transition-colors
        ${getCellStyle()}
        ${!readonly && 'hover:shadow-sm'}
      `}
    >
      {/* Header with shift type indicator */}
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1 text-xs text-gray-500">
          <ShiftIcon className="h-3 w-3" />
          <span>{shiftType === 'day' ? '09-18' : '18-09'}</span>
        </div>
        <span className="text-xs text-gray-400">
          {assignments.length}/{minRequired}
        </span>
      </div>

      {/* Empty state */}
      {isEmpty && (
        <div className="flex flex-col items-center justify-center py-2">
          <span className="text-xs font-medium text-red-600 mb-1">EMPTY</span>
          {!readonly && onAdd && (
            <button
              onClick={onAdd}
              className="p-1 rounded-full bg-red-100 hover:bg-red-200 text-red-600 transition-colors"
            >
              <Plus className="h-4 w-4" />
            </button>
          )}
        </div>
      )}

      {/* Assigned employees */}
      {assignments.length > 0 && (
        <div className="space-y-1">
          {assignments.map((assignment) => {
            const hasCustomTime = assignment.start_time || assignment.end_time;
            const timeDisplay = hasCustomTime
              ? `${formatTime(assignment.start_time)}-${formatTime(assignment.end_time)}`
              : null;

            return (
              <div
                key={assignment.id}
                className="flex items-center justify-between group bg-white rounded px-1.5 py-1 text-xs"
              >
                <div className="flex items-center gap-1.5 min-w-0 flex-1">
                  {assignment.confirmed_at ? (
                    <Check className="h-3 w-3 text-green-500 flex-shrink-0" />
                  ) : (
                    <Clock className="h-3 w-3 text-gray-400 flex-shrink-0" />
                  )}
                  <span className="truncate font-medium">
                    {assignment.employees?.full_name || 'Unknown'}
                  </span>
                  {timeDisplay && (
                    <span className="text-[10px] text-purple-600 font-medium flex-shrink-0">
                      ({timeDisplay})
                    </span>
                  )}
                </div>
                {!readonly && onRemove && (
                  <button
                    onClick={() => onRemove(assignment.id)}
                    className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-red-100 text-gray-400 hover:text-red-500 transition-all"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add more button (when not empty but can add more) */}
      {!isEmpty && !readonly && onAdd && (!maxAllowed || assignments.length < maxAllowed) && (
        <button
          onClick={onAdd}
          className="mt-1 w-full flex items-center justify-center gap-1 p-1 rounded text-xs text-gray-500 hover:bg-white hover:text-gray-700 transition-colors"
        >
          <Plus className="h-3 w-3" />
          <span>Add</span>
        </button>
      )}
    </div>
  );
}

export type { Assignment, ShiftCellProps };
