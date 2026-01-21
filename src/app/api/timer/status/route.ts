import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// CORS headers for Mini App
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Telegram-Init-Data',
};

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
export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const telegramId = searchParams.get('telegramId');

    if (!telegramId) {
      return NextResponse.json(
        { error: 'telegramId is required' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Get employee by telegram_id
    const { data: employee, error: empError } = await supabase
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
    const { data: attendance, error: attError } = await supabase
      .from('attendance')
      .select(`
        id,
        date,
        check_in,
        check_in_timestamp,
        check_out,
        shift_id,
        check_in_branch:branches!attendance_check_in_branch_id_fkey(id, name)
      `)
      .eq('employee_id', employee.id)
      .is('check_out', null)
      .order('check_in', { ascending: false })
      .limit(1)
      .single();

    if (attError || !attendance) {
      // No active check-in
      return NextResponse.json({
        isActive: false,
        employeeName: employee.full_name,
      }, { headers: corsHeaders });
    }

    // Get shift info
    const shiftId = attendance.shift_id || 'day';
    const shift = SHIFTS[shiftId as keyof typeof SHIFTS] || SHIFTS.day;

    // Get branch name
    const branchName = (attendance.check_in_branch as any)?.name || 'Unknown';

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
