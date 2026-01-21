import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const telegramId = searchParams.get('telegramId');

    if (!telegramId) {
      return NextResponse.json(
        { error: 'telegramId is required' },
        { status: 400 }
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
        { status: 404 }
      );
    }

    // Get today's date range (Tashkent timezone)
    const now = new Date();
    const tashkentOffset = 5 * 60; // UTC+5
    const localNow = new Date(now.getTime() + tashkentOffset * 60 * 1000);
    const todayStart = new Date(localNow);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(localNow);
    todayEnd.setHours(23, 59, 59, 999);

    // Get active attendance record (checked in but not checked out)
    const { data: attendance, error: attError } = await supabase
      .from('attendance')
      .select(`
        id,
        check_in,
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
      });
    }

    // Get shift info
    const shiftId = attendance.shift_id || 'day';
    const shift = SHIFTS[shiftId as keyof typeof SHIFTS] || SHIFTS.day;

    // Get branch name
    const branchName = (attendance.check_in_branch as any)?.name || 'Unknown';

    return NextResponse.json({
      isActive: true,
      employeeName: employee.full_name,
      checkInTime: attendance.check_in,
      branchName: branchName,
      shiftId: shiftId,
      shiftName: shift.name,
      shiftDuration: shift.duration,
      attendanceId: attendance.id,
    });
  } catch (error) {
    console.error('Timer status error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
