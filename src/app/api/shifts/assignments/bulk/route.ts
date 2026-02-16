import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-auth';
import { PERMISSIONS, hasPermission } from '@/lib/permissions';
import {
  createAssignmentsBulk,
  getEmployeeConflictDetails,
  type CreateAssignmentInput,
  type ShiftType,
} from '@/lib/db';
import { supabaseAdmin, isSupabaseAdminConfigured } from '@/lib/supabase';
import type { User } from '@/types';

interface BulkAssignmentBody {
  schedule_id: string;
  branch_id: string;
  date: string;
  shift_type: string;
  employee_ids: string[];
  start_time?: string;
  end_time?: string;
}

// POST /api/shifts/assignments/bulk - Create multiple assignments at once
export const POST = withAuth(async (request: NextRequest, context: { user: User }) => {
  try {
    const body: BulkAssignmentBody = await request.json();

    // Validate required fields
    if (!body.schedule_id || !body.branch_id || !body.date || !body.shift_type || !body.employee_ids) {
      return NextResponse.json(
        { error: 'schedule_id, branch_id, date, shift_type, and employee_ids are required' },
        { status: 400 }
      );
    }

    if (!Array.isArray(body.employee_ids) || body.employee_ids.length === 0) {
      return NextResponse.json(
        { error: 'employee_ids must be a non-empty array' },
        { status: 400 }
      );
    }

    if (body.employee_ids.length > 50) {
      return NextResponse.json(
        { error: 'Maximum 50 employees per bulk operation' },
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
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
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
        if (context.user.branchId !== body.branch_id) {
          return NextResponse.json({ error: 'Cannot edit other branches' }, { status: 403 });
        }
      } else {
        return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
      }
    }

    // Cross-branch guard: only admins can assign employees from other branches
    if (!canEditAll && isSupabaseAdminConfigured()) {
      const { data: employees } = await supabaseAdmin!
        .from('employees')
        .select('id, primary_branch_id, branch_id')
        .in('id', body.employee_ids);

      const crossBranchEmployees = (employees || []).filter(emp => {
        const homeBranch = emp.primary_branch_id || emp.branch_id;
        return homeBranch && homeBranch !== body.branch_id;
      });

      if (crossBranchEmployees.length > 0) {
        return NextResponse.json(
          { error: 'Only administrators can assign employees from other branches' },
          { status: 403 }
        );
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

    // Check conflicts for each employee with detailed error messages
    const conflicts: { employee_id: string; reason: string; conflict_branch_name?: string; conflict_branch_id?: string }[] = [];
    const validEmployeeIds: string[] = [];

    await Promise.all(
      body.employee_ids.map(async (employeeId) => {
        const conflict = await getEmployeeConflictDetails(
          employeeId,
          body.date,
          body.shift_type as ShiftType
        );
        if (conflict?.hasConflict) {
          conflicts.push({
            employee_id: employeeId,
            reason: `Already assigned to ${conflict.conflictBranchName} on ${body.date} (${body.shift_type} shift)`,
            conflict_branch_name: conflict.conflictBranchName,
            conflict_branch_id: conflict.conflictBranchId,
          });
        } else {
          validEmployeeIds.push(employeeId);
        }
      })
    );

    // Create assignments for non-conflicting employees
    let created: unknown[] = [];
    if (validEmployeeIds.length > 0) {
      const inputs: CreateAssignmentInput[] = validEmployeeIds.map((employeeId) => ({
        schedule_id: body.schedule_id,
        branch_id: body.branch_id,
        date: body.date,
        shift_type: body.shift_type as ShiftType,
        employee_id: employeeId,
        ...(body.start_time && { start_time: body.start_time }),
        ...(body.end_time && { end_time: body.end_time }),
      }));

      created = await createAssignmentsBulk(inputs);
    }

    // If all had conflicts
    if (validEmployeeIds.length === 0) {
      return NextResponse.json(
        { error: 'All employees already assigned to this shift', conflicts },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { success: true, created, conflicts },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating bulk assignments:', error);
    return NextResponse.json({ error: 'Failed to create assignments' }, { status: 500 });
  }
}, { permissions: [PERMISSIONS.SHIFTS_EDIT, PERMISSIONS.SHIFTS_EDIT_OWN_BRANCH] });
