import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-auth';
import { PERMISSIONS, hasPermission } from '@/lib/permissions';
import {
  getAssignmentsBySchedule,
  updateSchedule,
  publishSchedule,
  lockSchedule,
  getScheduleCoverageStatus,
} from '@/lib/db';
import { supabaseAdmin, isSupabaseAdminConfigured } from '@/lib/supabase';
import type { User } from '@/types';

// GET /api/shifts/schedules/[id] - Get schedule with assignments
export const GET = withAuth(async (
  request: NextRequest,
  context: { user: User; params?: Record<string, string> }
) => {
  try {
    const id = context.params?.id;
    if (!id) {
      return NextResponse.json({ error: 'Schedule ID is required' }, { status: 400 });
    }

    if (!isSupabaseAdminConfigured()) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    // Get schedule
    const { data: schedule, error } = await supabaseAdmin!
      .from('shift_schedules')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !schedule) {
      return NextResponse.json({ error: 'Schedule not found' }, { status: 404 });
    }

    // Get assignments
    const assignments = await getAssignmentsBySchedule(id);

    // Get coverage status
    const coverage = await getScheduleCoverageStatus(id);

    return NextResponse.json({
      schedule,
      assignments,
      coverage,
    });
  } catch (error) {
    console.error('Error fetching schedule:', error);
    return NextResponse.json({ error: 'Failed to fetch schedule' }, { status: 500 });
  }
}, { permission: PERMISSIONS.SHIFTS_VIEW });

// PATCH /api/shifts/schedules/[id] - Update schedule (publish, lock, update notes)
export const PATCH = withAuth(async (
  request: NextRequest,
  context: { user: User; params?: Record<string, string> }
) => {
  try {
    const id = context.params?.id;
    if (!id) {
      return NextResponse.json({ error: 'Schedule ID is required' }, { status: 400 });
    }

    const body = await request.json();
    const { action, notes } = body;

    if (!isSupabaseAdminConfigured()) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    // Get current schedule
    const { data: schedule, error: fetchError } = await supabaseAdmin!
      .from('shift_schedules')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !schedule) {
      return NextResponse.json({ error: 'Schedule not found' }, { status: 404 });
    }

    // Handle actions
    if (action === 'publish') {
      // Check publish permission
      if (!hasPermission(context.user.role, PERMISSIONS.SHIFTS_PUBLISH)) {
        return NextResponse.json({ error: 'Insufficient permissions to publish' }, { status: 403 });
      }

      // Can only publish drafts
      if (schedule.status !== 'draft') {
        return NextResponse.json(
          { error: `Cannot publish schedule with status: ${schedule.status}` },
          { status: 400 }
        );
      }

      // Check coverage (warn but don't block)
      const coverage = await getScheduleCoverageStatus(id);

      const success = await publishSchedule(id, context.user.id);
      if (!success) {
        return NextResponse.json({ error: 'Failed to publish schedule' }, { status: 500 });
      }

      // Fetch updated schedule
      const { data: updated } = await supabaseAdmin!
        .from('shift_schedules')
        .select('*')
        .eq('id', id)
        .single();

      return NextResponse.json({
        success: true,
        schedule: updated,
        coverage,
        warning: coverage.empty_shifts > 0
          ? `Published with ${coverage.empty_shifts} empty shifts`
          : undefined,
      });
    }

    if (action === 'lock') {
      // Check permission
      if (!hasPermission(context.user.role, PERMISSIONS.SHIFTS_PUBLISH)) {
        return NextResponse.json({ error: 'Insufficient permissions to lock' }, { status: 403 });
      }

      // Can only lock published schedules
      if (schedule.status !== 'published') {
        return NextResponse.json(
          { error: `Cannot lock schedule with status: ${schedule.status}` },
          { status: 400 }
        );
      }

      const success = await lockSchedule(id);
      if (!success) {
        return NextResponse.json({ error: 'Failed to lock schedule' }, { status: 500 });
      }

      // Fetch updated schedule
      const { data: updated } = await supabaseAdmin!
        .from('shift_schedules')
        .select('*')
        .eq('id', id)
        .single();

      return NextResponse.json({ success: true, schedule: updated });
    }

    // Update notes
    if (notes !== undefined) {
      // Check edit permission
      if (!hasPermission(context.user.role, PERMISSIONS.SHIFTS_EDIT)) {
        return NextResponse.json({ error: 'Insufficient permissions to edit' }, { status: 403 });
      }

      const updated = await updateSchedule(id, { notes });
      if (!updated) {
        return NextResponse.json({ error: 'Failed to update schedule' }, { status: 500 });
      }

      return NextResponse.json({ success: true, schedule: updated });
    }

    return NextResponse.json({ error: 'No valid action or update provided' }, { status: 400 });
  } catch (error) {
    console.error('Error updating schedule:', error);
    return NextResponse.json({ error: 'Failed to update schedule' }, { status: 500 });
  }
}, { permission: PERMISSIONS.SHIFTS_VIEW });
