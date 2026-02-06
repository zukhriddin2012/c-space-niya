import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-auth';
import { PERMISSIONS } from '@/lib/permissions';
import { validateBranchAccess } from '@/lib/security';
import type { User } from '@/types';
import { supabaseAdmin, isSupabaseAdminConfigured } from '@/lib/db/connection';

interface ShiftEmployee {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeStatus: string;
}

interface ShiftDay {
  date: string;
  dayOfWeek: string;
  dayShift: ShiftEmployee[];
  nightShift: ShiftEmployee[];
}

interface ShiftScheduleResponse {
  weekStart: string;
  weekEnd: string;
  schedule: ShiftDay[];
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// ============================================
// GET /api/reception/shifts
// Get published shift schedule for a branch (read-only R5)
// ============================================
export const GET = withAuth(async (request: NextRequest, { user }) => {
  try {
    if (!isSupabaseAdminConfigured()) {
      return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
    }

    const searchParams = request.nextUrl.searchParams;
    const weekStart = searchParams.get('weekStart');

    // H-02 / M-06: Validate branch access
    const branchAccess = validateBranchAccess(
      user as User,
      searchParams.get('branchId'),
      PERMISSIONS.SHIFTS_VIEW_ALL
    );
    if (branchAccess.error) {
      return NextResponse.json({ error: branchAccess.error }, { status: branchAccess.status });
    }
    const branchId = branchAccess.branchId;

    if (!branchId) {
      return NextResponse.json(
        { error: 'Branch ID is required' },
        { status: 400 }
      );
    }

    if (!weekStart) {
      return NextResponse.json(
        { error: 'Week start date is required' },
        { status: 400 }
      );
    }

    // Query published schedule for the branch and week
    const { data: scheduleData, error: scheduleError } = await supabaseAdmin!
      .from('shift_schedules')
      .select('*')
      .eq('branch_id', branchId)
      .eq('week_start_date', weekStart)
      .eq('status', 'published')
      .single();

    // If no published schedule found, return empty response
    if (scheduleError || !scheduleData) {
      return NextResponse.json<ShiftScheduleResponse>({
        weekStart: weekStart,
        weekEnd: '',
        schedule: [],
      });
    }

    // Query shift assignments for this schedule, joined with employee data
    const { data: assignmentsData, error: assignmentsError } = await supabaseAdmin!
      .from('shift_assignments')
      .select(`
        *,
        employee:employees(id, full_name)
      `)
      .eq('schedule_id', scheduleData.id);

    if (assignmentsError) {
      console.error('Error fetching shift assignments:', assignmentsError);
      return NextResponse.json<ShiftScheduleResponse>({
        weekStart: weekStart,
        weekEnd: '',
        schedule: [],
      });
    }

    // Calculate week end date (7 days after week start)
    const startDate = new Date(weekStart + 'T00:00:00');
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 6);
    const weekEndStr = endDate.toISOString().split('T')[0];

    // Group assignments by date and shift type
    const shiftsByDay: Record<string, ShiftDay> = {};

    // Initialize all 7 days of the week
    for (let i = 0; i < 7; i++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(currentDate.getDate() + i);
      const dateStr = currentDate.toISOString().split('T')[0];

      shiftsByDay[dateStr] = {
        date: dateStr,
        dayOfWeek: DAY_NAMES[currentDate.getDay()],
        dayShift: [],
        nightShift: [],
      };
    }

    // Process assignments
    if (assignmentsData) {
      for (const assignment of assignmentsData) {
        const assignmentDate = assignment.assignment_date as string;
        const shiftType = assignment.shift_type as string;
        const employeeId = assignment.employee_id as string;
        const employee = assignment.employee as { id: string; full_name: string } | null;
        const employeeName = employee?.full_name || 'Unknown';
        const status = (assignment.status as string) || 'active';

        if (!shiftsByDay[assignmentDate]) {
          const dynDate = new Date(assignmentDate + 'T00:00:00');
          shiftsByDay[assignmentDate] = {
            date: assignmentDate,
            dayOfWeek: DAY_NAMES[dynDate.getDay()],
            dayShift: [],
            nightShift: [],
          };
        }

        const employeeData: ShiftEmployee = {
          id: employee?.id || employeeId,
          employeeId,
          employeeName,
          employeeStatus: status,
        };

        if (shiftType === 'day') {
          shiftsByDay[assignmentDate].dayShift.push(employeeData);
        } else if (shiftType === 'night') {
          shiftsByDay[assignmentDate].nightShift.push(employeeData);
        }
      }
    }

    // Convert to sorted array
    const schedule = Object.values(shiftsByDay).sort((a, b) =>
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    return NextResponse.json<ShiftScheduleResponse>({
      weekStart,
      weekEnd: weekEndStr,
      schedule,
    });
  } catch (error) {
    console.error('Server error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}, { permission: PERMISSIONS.RECEPTION_SHIFTS_VIEW, allowKiosk: true });
