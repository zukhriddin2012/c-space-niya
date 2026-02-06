import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, isSupabaseAdminConfigured } from '@/lib/supabase';
import { validateTelegramInitData } from '@/lib/telegram-auth';
import { getCorsHeaders } from '@/lib/cors';

type ResponseType = 'im_at_work' | 'i_left' | '45min' | '2hours' | 'all_day';

// Calculate next reminder time based on response
function getNextReminderTime(responseType: ResponseType): Date | null {
  const now = new Date();
  switch (responseType) {
    case '45min':
      return new Date(now.getTime() + 45 * 60 * 1000);
    case '2hours':
      return new Date(now.getTime() + 2 * 60 * 60 * 1000);
    case 'all_day':
      const endOfDay = new Date(now);
      endOfDay.setHours(23, 59, 59, 999);
      return endOfDay;
    case 'im_at_work':
      return new Date(now.getTime() + 45 * 60 * 1000);
    default:
      return null;
  }
}

// Handle OPTIONS for CORS preflight
export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get('origin');
  return new NextResponse(null, { status: 200, headers: getCorsHeaders(origin) });
}

// Handle GET for testing
export async function GET(request: NextRequest) {
  const origin = request.headers.get('origin');
  return NextResponse.json({
    status: 'ok',
    message: 'Use POST with telegramId and responseType',
    timestamp: new Date().toISOString()
  }, { headers: getCorsHeaders(origin) });
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  try {
    const body = await request.json();
    const { telegramId, reminderId, attendanceId, responseType, initData } = body;

    // SEC-010: Validate Telegram initData — mandatory for all requests
    if (!initData) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401, headers: corsHeaders });
    }
    const validation = validateTelegramInitData(initData);
    if (!validation.valid) {
      return NextResponse.json({ success: false, error: 'Invalid authentication' }, { status: 401, headers: corsHeaders });
    }

    if (!telegramId || !responseType) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400, headers: corsHeaders });
    }

    if (!isSupabaseAdminConfigured()) {
      return NextResponse.json({ success: false, error: 'Database not configured' }, { status: 500, headers: corsHeaders });
    }

    // Get employee by telegram ID
    const { data: employee, error: empError } = await supabaseAdmin!
      .from('employees')
      .select('id, full_name, branch_id')
      .eq('telegram_id', telegramId)
      .single();

    if (empError || !employee) {
      return NextResponse.json({ success: false, error: 'Employee not found' }, { status: 404, headers: corsHeaders });
    }

    // Handle different response types
    if (responseType === 'i_left') {
      let targetAttendanceId = attendanceId;

      if (!targetAttendanceId) {
        const { data: attendance } = await supabaseAdmin!
          .from('attendance')
          .select('id')
          .eq('employee_id', employee.id)
          .is('check_out', null)
          .order('date', { ascending: false })
          .limit(1)
          .single();

        if (attendance) targetAttendanceId = attendance.id;
      }

      if (targetAttendanceId) {
        const now = new Date();
        const checkOutTime = now.toTimeString().slice(0, 8);

        const { error: checkoutError } = await supabaseAdmin!
          .from('attendance')
          .update({
            check_out: checkOutTime,
            checkout_type: 'reminder_confirmed',
            updated_at: now.toISOString(),
          })
          .eq('id', targetAttendanceId);

        if (checkoutError) {
          return NextResponse.json({ success: false, error: 'Failed to checkout' }, { status: 500, headers: corsHeaders });
        }

        if (reminderId) {
          await supabaseAdmin!
            .from('checkout_reminders')
            .update({
              response_received_at: now.toISOString(),
              response_type: 'i_left',
              status: 'completed',
            })
            .eq('id', reminderId);
        }

        return NextResponse.json({ success: true, action: 'checked_out', checkOutTime }, { headers: corsHeaders });
      }

      return NextResponse.json({ success: false, error: 'No active attendance found' }, { status: 404, headers: corsHeaders });
    }

    // For other responses (im_at_work, 45min, 2hours, all_day)
    const now = new Date();
    const nextReminderTime = getNextReminderTime(responseType as ResponseType);

    if (reminderId) {
      await supabaseAdmin!
        .from('checkout_reminders')
        .update({
          response_received_at: now.toISOString(),
          response_type: responseType,
          status: 'completed',
        })
        .eq('id', reminderId);
    }

    let targetAttendanceId = attendanceId;
    let shiftType = 'day';

    if (!targetAttendanceId) {
      const { data: attendance } = await supabaseAdmin!
        .from('attendance')
        .select('id, check_in')
        .eq('employee_id', employee.id)
        .is('check_out', null)
        .order('date', { ascending: false })
        .limit(1)
        .single();

      if (attendance) {
        targetAttendanceId = attendance.id;
        const checkInHour = parseInt(attendance.check_in?.substring(0, 2) || '9');
        const checkInMinute = parseInt(attendance.check_in?.substring(3, 5) || '0');
        shiftType = (checkInHour < 15 || (checkInHour === 15 && checkInMinute <= 30)) ? 'day' : 'night';
      }
    }

    let nextReminder = null;
    if (responseType !== 'all_day' && targetAttendanceId && nextReminderTime) {
      const { data: newReminder } = await supabaseAdmin!
        .from('checkout_reminders')
        .insert({
          employee_id: employee.id,
          attendance_id: targetAttendanceId,
          shift_type: shiftType,
          status: 'scheduled',
          scheduled_for: nextReminderTime.toISOString(),
        })
        .select()
        .single();

      if (newReminder) {
        nextReminder = { id: newReminder.id, scheduledFor: nextReminderTime.toISOString() };
      }
    }

    return NextResponse.json({
      success: true,
      action: 'reminder_scheduled',
      responseType,
      nextReminder,
    }, { headers: corsHeaders });

  } catch (error) {
    console.error('[TgAction] Error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500, headers: corsHeaders });
  }
}
