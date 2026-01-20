import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-auth';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';
import { supabaseAdmin, isSupabaseAdminConfigured } from '@/lib/supabase';
import type { UserRole } from '@/types';

// POST /api/attendance/[id]/checkout - Manual check-out
export const POST = withAuth(async (
  request: NextRequest,
  { user, params }: { user: { id: string; email: string; role: UserRole }; params?: Record<string, string> }
) => {
  // Check permission - need attendance edit permission
  if (!hasPermission(user.role, PERMISSIONS.ATTENDANCE_EDIT)) {
    return NextResponse.json(
      { error: 'Insufficient permissions' },
      { status: 403 }
    );
  }

  const id = params?.id;

  if (!isSupabaseAdminConfigured()) {
    return NextResponse.json(
      { error: 'Database not configured' },
      { status: 500 }
    );
  }

  if (!id) {
    return NextResponse.json(
      { error: 'Attendance ID is required' },
      { status: 400 }
    );
  }

  try {
    const body = await request.json();
    const { checkOutTime } = body;

    if (!checkOutTime) {
      return NextResponse.json(
        { error: 'Check-out time is required' },
        { status: 400 }
      );
    }

    // Validate time format (HH:MM or HH:MM:SS)
    const timeRegex = /^([01]?[0-9]|2[0-3]):([0-5][0-9])(:[0-5][0-9])?$/;
    if (!timeRegex.test(checkOutTime)) {
      return NextResponse.json(
        { error: 'Invalid time format. Use HH:MM or HH:MM:SS' },
        { status: 400 }
      );
    }

    // Format time to HH:MM:SS
    const formattedTime = checkOutTime.length === 5 ? `${checkOutTime}:00` : checkOutTime;

    // Get the attendance record first
    const { data: record, error: fetchError } = await supabaseAdmin!
      .from('attendance')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !record) {
      return NextResponse.json(
        { error: 'Attendance record not found' },
        { status: 404 }
      );
    }

    // Check if already checked out
    if (record.check_out) {
      return NextResponse.json(
        { error: 'Employee has already checked out' },
        { status: 400 }
      );
    }

    // Calculate total hours
    const checkInParts = record.check_in.split(':');
    const checkOutParts = formattedTime.split(':');
    const checkInMinutes = parseInt(checkInParts[0]) * 60 + parseInt(checkInParts[1]);
    const checkOutMinutes = parseInt(checkOutParts[0]) * 60 + parseInt(checkOutParts[1]);

    let totalMinutes = checkOutMinutes - checkInMinutes;
    // Handle overnight shifts
    if (totalMinutes < 0) {
      totalMinutes += 24 * 60;
    }
    const totalHours = Math.round((totalMinutes / 60) * 10) / 10;

    // Determine if early leave (for day shift: before 17:00, for night shift: before 09:00)
    const shiftId = record.shift_id || 'day';
    const earlyThreshold = shiftId === 'night' ? 9 * 60 : 17 * 60;
    const isEarlyLeave = checkOutMinutes < earlyThreshold && totalHours < 8;

    // Update status if early leave
    const newStatus = isEarlyLeave ? 'early_leave' : record.status;

    // Update the attendance record
    const { data: updated, error: updateError } = await supabaseAdmin!
      .from('attendance')
      .update({
        check_out: formattedTime,
        total_hours: totalHours,
        status: newStatus,
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating attendance:', updateError);
      return NextResponse.json(
        { error: 'Failed to update attendance record' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      record: updated,
      totalHours,
      isEarlyLeave,
    });
  } catch (error) {
    console.error('Manual checkout error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});
