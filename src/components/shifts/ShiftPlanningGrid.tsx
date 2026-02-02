'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Loader2, Send, Lock, FileText } from 'lucide-react';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Card from '@/components/ui/Card';
import WeekNavigator, { getMonday } from './WeekNavigator';
import ShiftCell, { type Assignment } from './ShiftCell';
import CoverageIndicator, { type CoverageStatus } from './CoverageIndicator';

interface Branch {
  id: string;
  name: string;
}

interface BranchRequirement {
  branch_id: string;
  shift_type: 'day' | 'night';
  min_staff: number;
  max_staff: number | null;
  has_shift: boolean;
}

interface Schedule {
  id: string;
  week_start_date: string;
  status: 'draft' | 'published' | 'locked';
  published_at: string | null;
}

interface ShiftAssignment extends Assignment {
  branch_id: string;
  date: string;
  shift_type: 'day' | 'night';
}

interface ShiftPlanningGridProps {
  branchFilter?: string; // For Branch Manager view
  readonly?: boolean;
  onAssignmentAdd?: (branchId: string, date: string, shiftType: 'day' | 'night') => void;
  onAssignmentRemove?: (assignmentId: string) => void;
  onPublish?: (scheduleId: string) => void;
  onScheduleChange?: (scheduleId: string | null) => void;
}

// Get day names for header
const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// Format date for display
function formatDayHeader(date: Date): string {
  const day = date.getDate();
  const month = date.toLocaleDateString('en-US', { month: 'short' });
  return `${DAY_NAMES[date.getDay() === 0 ? 6 : date.getDay() - 1]} ${day} ${month}`;
}

// Format date as YYYY-MM-DD (using local timezone, not UTC)
function formatDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function ShiftPlanningGrid({
  branchFilter,
  readonly = false,
  onAssignmentAdd,
  onAssignmentRemove,
  onPublish,
  onScheduleChange,
}: ShiftPlanningGridProps) {
  const [weekStartDate, setWeekStartDate] = useState(() => getMonday(new Date()));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [assignments, setAssignments] = useState<ShiftAssignment[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [requirements, setRequirements] = useState<BranchRequirement[]>([]);
  const [coverage, setCoverage] = useState<CoverageStatus | null>(null);
  const [publishing, setPublishing] = useState(false);

  // Fetch data
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const weekStr = formatDateString(weekStartDate);

      // Fetch branches
      const branchesRes = await fetch('/api/branches');
      const branchesData = await branchesRes.json();
      let branchesList = branchesData.branches || [];

      // Filter branches if branchFilter is set
      if (branchFilter) {
        branchesList = branchesList.filter((b: Branch) => b.id === branchFilter);
      }
      setBranches(branchesList);

      // Fetch requirements
      const reqRes = await fetch('/api/branches/shift-requirements');
      if (reqRes.ok) {
        const reqData = await reqRes.json();
        setRequirements(reqData.requirements || []);
      }

      // Fetch or create schedule
      const scheduleRes = await fetch(`/api/shifts/schedules?week=${weekStr}`);
      const scheduleData = await scheduleRes.json();

      if (scheduleData.schedule) {
        setSchedule(scheduleData.schedule);
        onScheduleChange?.(scheduleData.schedule.id);

        // Fetch assignments
        const assignRes = await fetch(`/api/shifts/schedules/${scheduleData.schedule.id}`);
        const assignData = await assignRes.json();
        setAssignments(assignData.assignments || []);
        setCoverage(assignData.coverage || null);
      } else {
        // No schedule for this week yet
        setSchedule(null);
        onScheduleChange?.(null);
        setAssignments([]);
        setCoverage(null);
      }
    } catch (err) {
      console.error('Error fetching shift data:', err);
      setError('Failed to load shift planning data');
    } finally {
      setLoading(false);
    }
  }, [weekStartDate, branchFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Create schedule for the week
  const handleCreateSchedule = async () => {
    try {
      const weekStr = formatDateString(weekStartDate);
      const res = await fetch('/api/shifts/schedules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ week_start_date: weekStr }),
      });

      if (res.ok) {
        fetchData();
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to create schedule');
      }
    } catch (err) {
      setError('Failed to create schedule');
    }
  };

  // Publish schedule
  const handlePublish = async () => {
    if (!schedule || publishing) return;

    setPublishing(true);
    try {
      const res = await fetch(`/api/shifts/schedules/${schedule.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'publish' }),
      });

      if (res.ok) {
        fetchData();
        onPublish?.(schedule.id);
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to publish schedule');
      }
    } catch (err) {
      setError('Failed to publish schedule');
    } finally {
      setPublishing(false);
    }
  };

  // Get assignments for a specific cell
  const getAssignmentsForCell = (branchId: string, date: string, shiftType: 'day' | 'night') => {
    return assignments.filter(
      (a) => a.branch_id === branchId && a.date === date && a.shift_type === shiftType
    );
  };

  // Get requirement for a branch/shift
  const getRequirement = (branchId: string, shiftType: 'day' | 'night') => {
    return requirements.find(
      (r) => r.branch_id === branchId && r.shift_type === shiftType
    );
  };

  // Generate week dates
  const weekDates: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(weekStartDate);
    date.setDate(weekStartDate.getDate() + i);
    weekDates.push(date);
  }

  // Status badge
  const getStatusBadge = () => {
    if (!schedule) return null;
    switch (schedule.status) {
      case 'draft':
        return <Badge variant="warning"><FileText className="h-3 w-3 mr-1" />Draft</Badge>;
      case 'published':
        return <Badge variant="success"><Send className="h-3 w-3 mr-1" />Published</Badge>;
      case 'locked':
        return <Badge variant="default"><Lock className="h-3 w-3 mr-1" />Locked</Badge>;
    }
  };

  const isReadonly = readonly || schedule?.status === 'locked';
  const canPublish = schedule?.status === 'draft' && !branchFilter;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <WeekNavigator
            weekStartDate={weekStartDate}
            onWeekChange={setWeekStartDate}
          />
          {getStatusBadge()}
        </div>

        <div className="flex items-center gap-2">
          {coverage && <CoverageIndicator coverage={coverage} />}
          {canPublish && (
            <Button
              variant="primary"
              size="sm"
              onClick={handlePublish}
              disabled={publishing}
              className="flex items-center gap-1.5"
            >
              {publishing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Publish Week
            </Button>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
          {error}
        </div>
      )}

      {/* No schedule yet */}
      {!schedule && !error && (
        <Card className="p-8 text-center">
          <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No schedule for this week</h3>
          <p className="text-gray-500 mb-4">Create a draft schedule to start planning shifts.</p>
          <Button variant="primary" onClick={handleCreateSchedule}>
            Create Schedule
          </Button>
        </Card>
      )}

      {/* Grid */}
      {schedule && (
        <div className="overflow-x-auto">
          <div className="min-w-[900px]">
            {/* Header Row */}
            <div className="grid grid-cols-8 gap-2 mb-2">
              <div className="font-medium text-sm text-gray-500 p-2">Branch</div>
              {weekDates.map((date) => (
                <div key={date.toISOString()} className="text-center">
                  <div className="font-medium text-sm text-gray-700">
                    {formatDayHeader(date)}
                  </div>
                </div>
              ))}
            </div>

            {/* Branch Rows */}
            {branches.map((branch) => (
              <div key={branch.id} className="mb-4">
                {/* Branch name */}
                <div className="font-medium text-sm text-gray-900 mb-2 px-2">
                  {branch.name}
                </div>

                {/* Day shifts row */}
                <div className="grid grid-cols-8 gap-2 mb-1">
                  <div className="text-xs text-gray-500 p-2 flex items-center">
                    ☀️ Day
                  </div>
                  {weekDates.map((date) => {
                    const dateStr = formatDateString(date);
                    const req = getRequirement(branch.id, 'day');
                    return (
                      <ShiftCell
                        key={`${branch.id}-${dateStr}-day`}
                        branchId={branch.id}
                        date={dateStr}
                        shiftType="day"
                        assignments={getAssignmentsForCell(branch.id, dateStr, 'day')}
                        minRequired={req?.min_staff || 1}
                        maxAllowed={req?.max_staff || undefined}
                        readonly={isReadonly}
                        onAdd={() => onAssignmentAdd?.(branch.id, dateStr, 'day')}
                        onRemove={onAssignmentRemove}
                      />
                    );
                  })}
                </div>

                {/* Night shifts row */}
                <div className="grid grid-cols-8 gap-2">
                  <div className="text-xs text-gray-500 p-2 flex items-center">
                    🌙 Night
                  </div>
                  {weekDates.map((date) => {
                    const dateStr = formatDateString(date);
                    const req = getRequirement(branch.id, 'night');
                    if (req && !req.has_shift) {
                      return (
                        <div
                          key={`${branch.id}-${dateStr}-night`}
                          className="min-h-[80px] bg-gray-100 border border-gray-200 rounded-md flex items-center justify-center text-xs text-gray-400"
                        >
                          No night shift
                        </div>
                      );
                    }
                    return (
                      <ShiftCell
                        key={`${branch.id}-${dateStr}-night`}
                        branchId={branch.id}
                        date={dateStr}
                        shiftType="night"
                        assignments={getAssignmentsForCell(branch.id, dateStr, 'night')}
                        minRequired={req?.min_staff || 1}
                        maxAllowed={req?.max_staff || undefined}
                        readonly={isReadonly}
                        onAdd={() => onAssignmentAdd?.(branch.id, dateStr, 'night')}
                        onRemove={onAssignmentRemove}
                      />
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
