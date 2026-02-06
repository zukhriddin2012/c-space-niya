import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, isSupabaseAdminConfigured } from '@/lib/supabase';
import { getCorsHeaders } from '@/lib/cors';

// Shift configurations
const SHIFTS = {
  day: {
    id: 'day',
    name: 'Kunduzgi smena',
    duration: 8 * 60 * 60, // 8 hours in seconds
  },
  night: {
    id: 'night',
    name: 'Tungi smena',
    duration: 15 * 60 * 60, // 15 hours in seconds (18:00 - 09:00)
  },
};

// Handle OPTIONS request for CORS
export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get('origin');
  return NextResponse.json({}, { headers: getCorsHeaders(origin) });
}

export async function GET(request: NextRequest) {
  const origin = request.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  try {
    if (!isSupabaseAdminConfigured()) {
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 500, headers: corsHeaders }
      );
    }

    const { searchParams } = new URL(request.url);
    const telegramId = searchParams.get('telegramId');

    if (!telegramId) {
      return NextResponse.json(
        { error: 'telegramId is required' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Get employee by telegram_id
    const { data: employee, error: empError } = await supabaseAdmin!
      .from('employees')
      .select('id, full_name, branch_id')
      .eq('telegram_id', telegramId)
      .single();

    if (empError || !employee) {
      return NextResponse.json(
        { error: 'Employee not found', isActive: false },
        { status: 404, headers: corsHeaders }
      );
    }

    // Get active attendance record (checked in but not checked out)
    const { data: attendanceData, error: attError } = await supabaseAdmin!
      .from('attendance')
      .select(`
        id,
        date,
        check_in,
        check_in_timestamp,
        check_out,
        shift_id,
        check_in_branch_id
      `)
      .eq('employee_id', employee.id)
      .is('check_out', null)
      .order('date', { ascending: false })
      .order('check_in', { ascending: false })
      .limit(1);

    if (attError || !attendanceData || attendanceData.length === 0) {
      // No active check-in
      return NextResponse.json({
        isActive: false,
        employeeName: employee.full_name,
      }, { headers: corsHeaders });
    }

    const attendance = attendanceData[0];

    // Get branch name separately
    let branchName = 'Unknown';
    if (attendance.check_in_branch_id) {
      const { data: branch } = await supabaseAdmin!
        .from('branches')
        .select('name')
        .eq('id', attendance.check_in_branch_id)
        .single();
      branchName = branch?.name || 'Unknown';
    }

    // Get shift info
    const shiftId = attendance.shift_id || 'day';
    const shift = SHIFTS[shiftId as keyof typeof SHIFTS] || SHIFTS.day;

    // Use check_in_timestamp if available, otherwise construct from date + check_in
    // check_in is just TIME (HH:MM:SS), check_in_timestamp is TIMESTAMP
    let checkInTime = attendance.check_in_timestamp;

    // Fallback: if check_in_timestamp is null, construct it from date + check_in
    if (!checkInTime && attendance.date && attendance.check_in) {
      // Combine date (YYYY-MM-DD) with check_in time (HH:MM:SS)
      checkInTime = `${attendance.date}T${attendance.check_in}`;
    }

    return NextResponse.json({
      isActive: true,
      employeeName: employee.full_name,
      checkInTime: checkInTime, // Full ISO: "2025-01-21T08:45:27.000Z"
      branchName: branchName,
      shiftId: shiftId,
      shiftName: shift.name,
      shiftDuration: shift.duration,
      attendanceId: attendance.id,
    }, { headers: corsHeaders });
  } catch (error) {
    console.error('Timer status error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}
