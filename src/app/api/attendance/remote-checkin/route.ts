import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// Get Tashkent time
function getTashkentTime() {
  const now = new Date();
  const tashkent = new Date(now.getTime() + (5 * 60 * 60 * 1000));
  return tashkent;
}

// Check if employee is late
function isLate(shiftId: string): boolean {
  const tashkent = getTashkentTime();
  const hour = tashkent.getUTCHours();
  const minute = tashkent.getUTCMinutes();
  const currentMinutes = hour * 60 + minute;
  const lateThreshold = shiftId === 'night' ? 18 * 60 + 15 : 9 * 60 + 15;
  return currentMinutes > lateThreshold;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { telegramId, shiftId = 'day' } = body;

    if (!telegramId) {
      return NextResponse.json({ success: false, error: 'Missing telegramId' }, { status: 400 });
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ success: false, error: 'Database not configured' }, { status: 500 });
    }

    // Get employee by telegram ID (including remote_work_enabled)
    const { data: employee, error: empError } = await supabaseAdmin
      .from('employees')
      .select('id, full_name, position, branch_id, preferred_language, remote_work_enabled')
      .eq('telegram_id', telegramId.toString())
      .single();

    if (empError || !employee) {
      return NextResponse.json({ success: false, error: 'Employee not found' }, { status: 404 });
    }

    // Check if remote work is enabled for this employee
    if (!employee.remote_work_enabled) {
      return NextResponse.json({
        success: false,
        error: 'remote_not_allowed',
        message: 'Remote work is not enabled for this employee',
      }, { status: 403 });
    }

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
    const tashkent = getTashkentTime();
    const checkInTime = tashkent.toISOString().substring(11, 19);
    const today = tashkent.toISOString().split('T')[0];
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
