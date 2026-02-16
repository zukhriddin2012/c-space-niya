import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-auth';
import { PERMISSIONS, hasPermission } from '@/lib/permissions';
import {
  getAssignmentsBySchedule,
  getAssignmentsByBranchAndSchedule,
  getAssignmentsByEmployee,
  getAssignmentsByDate,
  createAssignment,
  getEmployeeConflictDetails,
  getAwayAssignmentsForBranch,
  type CreateAssignmentInput,
  type ShiftType,
} from '@/lib/db';
import { supabaseAdmin, isSupabaseAdminConfigured } from '@/lib/supabase';
import type { User } from '@/types';

// GET /api/shifts/assignments - List assignments with filters
export const GET = withAuth(async (request: NextRequest, context: { user: User }) => {
  try {
    const { searchParams } = new URL(request.url);
    const scheduleId = searchParams.get('schedule_id');
    const branchId = searchParams.get('branch_id');
    const employeeId = searchParams.get('employee_id');
    const date = searchParams.get('date');
    const fromDate = searchParams.get('from');
    const toDate = searchParams.get('to');
    const awayForBranch = searchParams.get('away_for_branch');

    // Away assignments for a branch's home employees
    if (scheduleId && awayForBranch) {
      if (!hasPermission(context.user.role, PERMISSIONS.SHIFTS_VIEW_ALL)) {
        if (context.user.branchId !== awayForBranch) {
          return NextResponse.json({ error: 'Cannot view other branches' }, { status: 403 });
        }
      }
      const awayAssignments = await getAwayAssignmentsForBranch(scheduleId, awayForBranch);
      return NextResponse.json({ away_assignments: awayAssignments });
    }

    // By schedule (optionally filtered by branch)
    if (scheduleId) {
      if (branchId) {
        // Check if user can view this branch
        if (!hasPermission(context.user.role, PERMISSIONS.SHIFTS_VIEW_ALL)) {
          // Branch manager can only view their own branch
          if (context.user.branchId !== branchId) {
            return NextResponse.json({ error: 'Cannot view other branches' }, { status: 403 });
          }
        }
        const assignments = await getAssignmentsByBranchAndSchedule(scheduleId, branchId);
        return NextResponse.json({ assignments });
      }
      const assignments = await getAssignmentsBySchedule(scheduleId);
      return NextResponse.json({ assignments });
    }

    // By employee (for "my schedule")
    if (employeeId && fromDate && toDate) {
      // Employees can view their own schedule
      if (employeeId !== context.user.id && !hasPermission(context.user.role, PERMISSIONS.SHIFTS_VIEW_ALL)) {
        return NextResponse.json({ error: 'Cannot view other employees schedules' }, { status: 403 });
      }
      const assignments = await getAssignmentsByEmployee(employeeId, fromDate, toDate);
      return NextResponse.json({ assignments });
    }

    // By date (all assignments for a day)
    if (date) {
      const assignments = await getAssignmentsByDate(date);
      return NextResponse.json({ assignments });
    }

    return NextResponse.json(
      { error: 'Must specify schedule_id, (employee_id + from + to), or date' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error fetching assignments:', error);
    return NextResponse.json({ error: 'Failed to fetch assignments' }, { status: 500 });
  }
}, { permission: PERMISSIONS.SHIFTS_VIEW });

// POST /api/shifts/assignments - Create new assignment
export const POST = withAuth(async (request: NextRequest, context: { user: User }) => {
  try {
    const body: CreateAssignmentInput = await request.json();

    // Validate required fields
    if (!body.schedule_id || !body.branch_id || !body.date || !body.shift_type || !body.employee_id) {
      return NextResponse.json(
        { error: 'schedule_id, branch_id, date, shift_type, and employee_id are required' },
        { status: 400 }
      );
    }

    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(body.date)) {
      return NextResponse.json(
        { error: 'date must be in YYYY-MM-DD format' },
        { status: 400 }
      );
    }

    // Validate shift_type
    if (!['day', 'night'].includes(body.shift_type)) {
      return NextResponse.json(
        { error: 'shift_type must be "day" or "night"' },
        { status: 400 }
      );
    }

    // Validate custom time format if provided (HH:MM)
    const timeRegex = /^([01][0-9]|2[0-3]):[0-5][0-9]$/;
    if (body.start_time && !timeRegex.test(body.start_time)) {
      return NextResponse.json(
        { error: 'start_time must be in HH:MM format' },
        { status: 400 }
      );
    }
    if (body.end_time && !timeRegex.test(body.end_time)) {
      return NextResponse.json(
        { error: 'end_time must be in HH:MM format' },
        { status: 400 }
      );
    }

    // Check permissions
    const canEditAll = hasPermission(context.user.role, PERMISSIONS.SHIFTS_EDIT);
    const canEditOwnBranch = hasPermission(context.user.role, PERMISSIONS.SHIFTS_EDIT_OWN_BRANCH);

    if (!canEditAll) {
      if (canEditOwnBranch) {
        // Branch manager can only edit their own branch
        if (context.user.branchId !== body.branch_id) {
          return NextResponse.json({ error: 'Cannot edit other branches' }, { status: 403 });
        }
      } else {
        return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
      }
    }

    // Cross-branch guard: only admins can assign employees from other branches
    if (!canEditAll && isSupabaseAdminConfigured()) {
      const { data: employee } = await supabaseAdmin!
        .from('employees')
        .select('primary_branch_id, branch_id')
        .eq('id', body.employee_id)
        .single();

      if (employee) {
        const homeBranch = employee.primary_branch_id || employee.branch_id;
        if (homeBranch && homeBranch !== body.branch_id) {
          return NextResponse.json(
            { error: 'Only administrators can assign employees from other branches' },
            { status: 403 }
          );
        }
      }
    }

    // Check schedule exists and is editable
    if (!isSupabaseAdminConfigured()) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const { data: schedule, error: scheduleError } = await supabaseAdmin!
      .from('shift_schedules')
      .select('status')
      .eq('id', body.schedule_id)
      .single();

    if (scheduleError || !schedule) {
      return NextResponse.json({ error: 'Schedule not found' }, { status: 404 });
    }

    if (schedule.status === 'locked') {
      return NextResponse.json({ error: 'Cannot modify locked schedule' }, { status: 400 });
    }

    // Check for conflicts with detailed error message
    const conflict = await getEmployeeConflictDetails(
      body.employee_id,
      body.date,
      body.shift_type as ShiftType
    );

    if (conflict?.hasConflict) {
      return NextResponse.json(
        {
          error: `Employee is already assigned to ${conflict.conflictBranchName} on ${body.date} (${body.shift_type} shift)`,
          conflict: {
            branch_name: conflict.conflictBranchName,
            branch_id: conflict.conflictBranchId,
            date: conflict.conflictDate,
            shift_type: conflict.conflictShiftType,
          },
        },
        { status: 409 }
      );
    }

    // Create assignment
    const assignment = await createAssignment(body);

    if (!assignment) {
      return NextResponse.json({ error: 'Failed to create assignment' }, { status: 500 });
    }

    return NextResponse.json({ success: true, assignment }, { status: 201 });
  } catch (error) {
    console.error('Error creating assignment:', error);
    return NextResponse.json({ error: 'Failed to create assignment' }, { status: 500 });
  }
}, { permissions: [PERMISSIONS.SHIFTS_EDIT, PERMISSIONS.SHIFTS_EDIT_OWN_BRANCH] });
