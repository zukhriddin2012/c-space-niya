import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-auth';
import { PERMISSIONS, hasPermission } from '@/lib/permissions';
import {
  updateAssignment,
  deleteAssignment,
  confirmAssignment,
} from '@/lib/db';
import { supabaseAdmin, isSupabaseAdminConfigured } from '@/lib/supabase';
import type { User } from '@/types';

// Helper to get assignment with schedule info
async function getAssignmentWithSchedule(id: string) {
  if (!isSupabaseAdminConfigured()) return null;

  const { data, error } = await supabaseAdmin!
    .from('shift_assignments')
    .select(`
      *,
      employees(full_name, employee_id, position),
      branches(name),
      shift_schedules(status)
    `)
    .eq('id', id)
    .single();

  if (error) return null;
  return data;
}

// GET /api/shifts/assignments/[id] - Get single assignment
export const GET = withAuth(async (
  request: NextRequest,
  context: { user: User; params?: Record<string, string> }
) => {
  try {
    const id = context.params?.id;
    if (!id) {
      return NextResponse.json({ error: 'Assignment ID is required' }, { status: 400 });
    }

    const assignment = await getAssignmentWithSchedule(id);

    if (!assignment) {
      return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
    }

    return NextResponse.json({ assignment });
  } catch (error) {
    console.error('Error fetching assignment:', error);
    return NextResponse.json({ error: 'Failed to fetch assignment' }, { status: 500 });
  }
}, { permission: PERMISSIONS.SHIFTS_VIEW });

// PATCH /api/shifts/assignments/[id] - Update or confirm assignment
export const PATCH = withAuth(async (
  request: NextRequest,
  context: { user: User; params?: Record<string, string> }
) => {
  try {
    const id = context.params?.id;
    if (!id) {
      return NextResponse.json({ error: 'Assignment ID is required' }, { status: 400 });
    }

    const body = await request.json();
    const { action, employee_id, role, notes } = body;

    // Get current assignment
    const assignment = await getAssignmentWithSchedule(id);

    if (!assignment) {
      return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
    }

    // Check if schedule is locked
    if (assignment.shift_schedules?.status === 'locked') {
      return NextResponse.json({ error: 'Cannot modify assignment in locked schedule' }, { status: 400 });
    }

    // Handle confirm action (employee confirming their own shift)
    if (action === 'confirm') {
      // Employee can only confirm their own assignments
      if (assignment.employee_id !== context.user.id) {
        // Unless they have edit permission
        if (!hasPermission(context.user.role, PERMISSIONS.SHIFTS_EDIT)) {
          return NextResponse.json({ error: 'Can only confirm your own shifts' }, { status: 403 });
        }
      }

      // Schedule must be published
      if (assignment.shift_schedules?.status !== 'published') {
        return NextResponse.json(
          { error: 'Can only confirm shifts in published schedules' },
          { status: 400 }
        );
      }

      const success = await confirmAssignment(id);
      if (!success) {
        return NextResponse.json({ error: 'Failed to confirm assignment' }, { status: 500 });
      }

      // Fetch updated
      const updated = await getAssignmentWithSchedule(id);
      return NextResponse.json({ success: true, assignment: updated });
    }

    // Handle update (employee_id, role, notes)
    const updates: Record<string, unknown> = {};
    if (employee_id !== undefined) updates.employee_id = employee_id;
    if (role !== undefined) updates.role = role;
    if (notes !== undefined) updates.notes = notes;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid updates provided' }, { status: 400 });
    }

    // Check permissions
    const canEditAll = hasPermission(context.user.role, PERMISSIONS.SHIFTS_EDIT);
    const canEditOwnBranch = hasPermission(context.user.role, PERMISSIONS.SHIFTS_EDIT_OWN_BRANCH);

    if (!canEditAll) {
      if (canEditOwnBranch) {
        // Branch manager can only edit their own branch
        if (context.user.branch_id !== assignment.branch_id) {
          return NextResponse.json({ error: 'Cannot edit other branches' }, { status: 403 });
        }
      } else {
        return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
      }
    }

    const updated = await updateAssignment(id, updates as { employee_id?: string; role?: string; notes?: string });

    if (!updated) {
      return NextResponse.json({ error: 'Failed to update assignment' }, { status: 500 });
    }

    return NextResponse.json({ success: true, assignment: updated });
  } catch (error) {
    console.error('Error updating assignment:', error);
    return NextResponse.json({ error: 'Failed to update assignment' }, { status: 500 });
  }
}, { permission: PERMISSIONS.SHIFTS_VIEW });

// DELETE /api/shifts/assignments/[id] - Remove assignment
export const DELETE = withAuth(async (
  request: NextRequest,
  context: { user: User; params?: Record<string, string> }
) => {
  try {
    const id = context.params?.id;
    if (!id) {
      return NextResponse.json({ error: 'Assignment ID is required' }, { status: 400 });
    }

    // Get current assignment
    const assignment = await getAssignmentWithSchedule(id);

    if (!assignment) {
      return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
    }

    // Check if schedule is locked
    if (assignment.shift_schedules?.status === 'locked') {
      return NextResponse.json({ error: 'Cannot delete assignment in locked schedule' }, { status: 400 });
    }

    // Check permissions
    const canEditAll = hasPermission(context.user.role, PERMISSIONS.SHIFTS_EDIT);
    const canEditOwnBranch = hasPermission(context.user.role, PERMISSIONS.SHIFTS_EDIT_OWN_BRANCH);

    if (!canEditAll) {
      if (canEditOwnBranch) {
        // Branch manager can only edit their own branch
        if (context.user.branch_id !== assignment.branch_id) {
          return NextResponse.json({ error: 'Cannot delete from other branches' }, { status: 403 });
        }
      } else {
        return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
      }
    }

    const success = await deleteAssignment(id);

    if (!success) {
      return NextResponse.json({ error: 'Failed to delete assignment' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting assignment:', error);
    return NextResponse.json({ error: 'Failed to delete assignment' }, { status: 500 });
  }
}, { permission: PERMISSIONS.SHIFTS_VIEW });
