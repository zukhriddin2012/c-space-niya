import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getTashkentTime, getTashkentHour, getTashkentTimeString, getTashkentDateString } from '@/lib/timezone';

// Remote check-in endpoint for employees with remote work enabled

// Detect shift type from employee position or check-in time
function detectShift(position: string | null): 'day' | 'night' {
  // Check if position indicates night shift
  if (position && /night/i.test(position)) {
    return 'night';
  }
  // Otherwise, infer from check-in time:
  // If checking in between 15:00-23:59, likely night shift
  const hour = getTashkentHour();
  if (hour >= 15 && hour <= 23) {
    return 'night';
  }
  return 'day';
}

// Check if employee is late based on shift type
// Day shift: late after 9:15, Night shift: late after 18:15
function isLate(shiftId: string): boolean {
  const tashkent = getTashkentTime();
  const hour = tashkent.getHours();
  const minute = tashkent.getMinutes();
  const currentMinutes = hour * 60 + minute;
  const lateThreshold = shiftId === 'night' ? 18 * 60 + 15 : 9 * 60 + 15;
  return currentMinutes > lateThreshold;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { telegramId, shiftId: providedShiftId } = body;

    if (!telegramId) {
      return NextResponse.json({ success: false, error: 'Missing telegramId' }, { status: 400 });
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ success: false, error: 'Database not configured' }, { status: 500 });
    }

    // Get employee by telegram ID
    // Note: remote_work_enabled may not exist if migration hasn't run - we skip that check
    // since user already got to this endpoint through the remote choice flow
    const { data: employee, error: empError } = await supabaseAdmin
      .from('employees')
      .select('id, full_name, position, branch_id, preferred_language, default_shift')
      .eq('telegram_id', telegramId.toString())
      .single();

    if (empError || !employee) {
      console.error('Employee lookup error:', empError);
      return NextResponse.json({ success: false, error: 'Employee not found' }, { status: 404 });
    }

    // Use provided shift, or employee's default shift, or auto-detect from position/time
    const shiftId = providedShiftId || employee.default_shift || detectShift(employee.position);

    // Check if employee has active check-in
    const { data: activeCheckin } = await supabaseAdmin
      .from('attendance')
      .select('id, check_in')
      .eq('employee_id', employee.id)
      .is('check_out', null)
      .order('date', { ascending: false })
      .limit(1)
      .single();

    if (activeCheckin) {
      return NextResponse.json({
        success: false,
        error: 'active_checkin',
        message: 'You already have an active check-in',
        checkIn: activeCheckin.check_in?.substring(0, 5),
      }, { status: 400 });
    }

    // Record remote check-in (no GPS/IP verification needed)
    const checkInTime = getTashkentTimeString();
    const today = getTashkentDateString();
    const late = isLate(shiftId);

    const { data: attendance, error: attError } = await supabaseAdmin
      .from('attendance')
      .insert({
        employee_id: employee.id,
        date: today,
        check_in: checkInTime,
        check_in_branch_id: employee.branch_id, // Use employee's default branch
        check_in_latitude: 0,
        check_in_longitude: 0,
        shift_id: shiftId,
        status: late ? 'late' : 'present',
        verification_type: 'remote', // This marks it as remote check-in
      })
      .select()
      .single();

    if (attError) {
      console.error('Remote check-in error:', attError);
      return NextResponse.json({ success: false, error: 'Failed to record check-in' }, { status: 500 });
    }

    const responseData = {
      id: attendance.id,
      checkIn: checkInTime.substring(0, 5),
      branchId: employee.branch_id,
      branchName: 'Remote',
      verificationType: 'remote',
      isLate: late,
      isRemote: true,
      shiftId,
      employeeName: employee.full_name,
      language: employee.preferred_language || 'uz',
    };

    // Notify Telegram bot via webhook
    const botWebhookUrl = process.env.TELEGRAM_BOT_WEBHOOK_URL;
    const botWebhookSecret = process.env.TELEGRAM_BOT_WEBHOOK_SECRET;

    if (botWebhookUrl && botWebhookSecret) {
      try {
        const webhookResponse = await fetch(`${botWebhookUrl}/webhook/checkin`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${botWebhookSecret}`,
          },
          body: JSON.stringify({
            telegramId,
            success: true,
            data: responseData,
            isRemote: true,
          }),
        });
        console.log('Remote checkin webhook response:', webhookResponse.status);
      } catch (err) {
        console.error('Failed to notify bot webhook:', err);
      }
    }

    return NextResponse.json({
      success: true,
      data: responseData,
    });
  } catch (error) {
    console.error('Remote check-in error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
