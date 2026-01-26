import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, isSupabaseAdminConfigured } from '@/lib/supabase';

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
      // Set to 11:59 PM today (effectively no more reminders today)
      const endOfDay = new Date(now);
      endOfDay.setHours(23, 59, 59, 999);
      return endOfDay;
    case 'im_at_work':
      // Default to 45 minutes for "I'm at work" response
      return new Date(now.getTime() + 45 * 60 * 1000);
    default:
      return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      telegramId,
      reminderId,
      attendanceId,
      responseType,
      ipAddress,
      ipVerified
    } = body;

    if (!telegramId || !responseType) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields'
      }, { status: 400 });
    }

    if (!isSupabaseAdminConfigured()) {
      return NextResponse.json({
        success: false,
        error: 'Database not configured'
      }, { status: 500 });
    }

    // Get employee by telegram ID
    const { data: employee, error: empError } = await supabaseAdmin!
      .from('employees')
      .select('id, full_name, branch_id')
      .eq('telegram_id', telegramId)
      .single();

    if (empError || !employee) {
      return NextResponse.json({
        success: false,
        error: 'Employee not found'
      }, { status: 404 });
    }

    // Handle different response types
    if (responseType === 'i_left') {
      // User confirmed they left - perform checkout
      let targetAttendanceId = attendanceId;

      if (!targetAttendanceId) {
        // Find active attendance
        const { data: attendance } = await supabaseAdmin!
          .from('attendance')
          .select('id, check_in_branch_id')
          .eq('employee_id', employee.id)
          .is('check_out', null)
          .order('date', { ascending: false })
          .limit(1)
          .single();

        if (attendance) {
          targetAttendanceId = attendance.id;
        }
      }

      if (targetAttendanceId) {
        // Perform checkout
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
          console.error('Checkout error:', checkoutError);
          return NextResponse.json({
            success: false,
            error: 'Failed to checkout'
          }, { status: 500 });
        }

        // Update reminder status if exists
        if (reminderId) {
          await supabaseAdmin!
            .from('checkout_reminders')
            .update({
              response_received_at: now.toISOString(),
              response_type: 'i_left',
              status: 'completed',
              ip_address: ipAddress,
              ip_verified: ipVerified || false,
            })
            .eq('id', reminderId);
        }

        return NextResponse.json({
          success: true,
          action: 'checked_out',
          checkOutTime,
        });
      }

      return NextResponse.json({
        success: false,
        error: 'No active attendance found'
      }, { status: 404 });
    }

    // For other responses (im_at_work, 45min, 2hours, all_day)
    // Update current reminder and schedule next one
    const now = new Date();
    const nextReminderTime = getNextReminderTime(responseType as ResponseType);

    // Update current reminder
    if (reminderId) {
      await supabaseAdmin!
        .from('checkout_reminders')
        .update({
          response_received_at: now.toISOString(),
          response_type: responseType,
          status: 'completed',
          ip_address: ipAddress,
          ip_verified: ipVerified || false,
        })
        .eq('id', reminderId);
    }

    // Get attendance for next reminder
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
        // Determine shift type from check-in time
        const checkInHour = parseInt(attendance.check_in?.substring(0, 2) || '9');
        const checkInMinute = parseInt(attendance.check_in?.substring(3, 5) || '0');
        shiftType = (checkInHour < 15 || (checkInHour === 15 && checkInMinute <= 30)) ? 'day' : 'night';
      }
    }

    // Create next reminder if not "all_day" response
    let nextReminder = null;
    if (responseType !== 'all_day' && targetAttendanceId && nextReminderTime) {
      const { data: newReminder, error: reminderError } = await supabaseAdmin!
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

      if (!reminderError && newReminder) {
        nextReminder = {
          id: newReminder.id,
          scheduledFor: nextReminderTime.toISOString(),
        };
      }
    }

    return NextResponse.json({
      success: true,
      action: 'reminder_scheduled',
      responseType,
      nextReminder,
    });

  } catch (error) {
    console.error('Reminder response error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}
