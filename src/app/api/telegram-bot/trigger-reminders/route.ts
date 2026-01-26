import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, isSupabaseAdminConfigured } from '@/lib/supabase';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const WEBAPP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://c-space-hr.vercel.app';

interface Employee {
  employeeId: string;
  employeeName: string;
  telegramId: string;
  attendanceId: string;
  preferredLanguage: string;
}

interface AttendanceWithEmployee {
  id: string;
  employee_id: string;
  check_in: string;
  check_out: string | null;
  employees: {
    id: string;
    full_name: string;
    telegram_id: string;
  };
}

// Get time string for comparison - check_in is stored as HH:MM:SS format already in Tashkent time
function normalizeTimeString(timeStr: string): string {
  // If it's already in HH:MM:SS format, return as is
  if (/^\d{2}:\d{2}:\d{2}$/.test(timeStr)) {
    return timeStr;
  }
  // If it's a full ISO datetime, extract time part and convert to Tashkent
  if (timeStr.includes('T') || timeStr.includes('-')) {
    const date = new Date(timeStr);
    if (isNaN(date.getTime())) return timeStr;
    // Add 5 hours for Tashkent timezone
    const tashkentTime = new Date(date.getTime() + 5 * 60 * 60 * 1000);
    const hours = tashkentTime.getUTCHours().toString().padStart(2, '0');
    const minutes = tashkentTime.getUTCMinutes().toString().padStart(2, '0');
    const seconds = tashkentTime.getUTCSeconds().toString().padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
  }
  return timeStr;
}

// Get employees who need checkout reminder based on shift type
async function getEmployeesForCheckoutReminder(shiftType: 'day' | 'night'): Promise<{ employees: Employee[], debug: object }> {
  if (!isSupabaseAdminConfigured()) return { employees: [], debug: { error: 'Supabase not configured' } };

  const dateStr = getTashkentDateString();

  // Day shift: checked in before 3:30 PM
  // Night shift: checked in after 3:30 PM
  const cutoffTime = '15:30:00';

  const { data, error } = await supabaseAdmin!
    .from('attendance')
    .select(`
      id,
      employee_id,
      check_in,
      check_out,
      employees(
        id,
        full_name,
        telegram_id
      )
    `)
    .eq('date', dateStr)
    .is('check_out', null);

  if (error || !data) {
    console.error('Error fetching employees for reminder:', error);
    return { employees: [], debug: { error: error?.message, dateStr } };
  }

  console.log(`📊 Found ${data.length} attendance records without checkout for ${dateStr}`);

  const typedData = data as unknown as AttendanceWithEmployee[];
  const debugInfo: { name: string; checkIn: string; tashkentTime: string; hasTelegram: boolean; passesFilter: boolean }[] = [];

  // Filter by shift type based on check-in time and ensure telegram_id exists
  const filtered = typedData.filter(att => {
    // Skip if no employee or no telegram_id
    if (!att.employees || !att.employees.telegram_id) {
      debugInfo.push({
        name: att.employees?.full_name || 'Unknown',
        checkIn: att.check_in,
        tashkentTime: '-',
        hasTelegram: false,
        passesFilter: false
      });
      return false;
    }

    const checkInTime = normalizeTimeString(att.check_in);
    const passesFilter = shiftType === 'day' ? checkInTime <= cutoffTime : checkInTime > cutoffTime;

    debugInfo.push({
      name: att.employees.full_name,
      checkIn: att.check_in,
      tashkentTime: checkInTime,
      hasTelegram: true,
      passesFilter
    });

    console.log(`  - ${att.employees.full_name}: check-in ${checkInTime}, cutoff ${cutoffTime}, passes: ${passesFilter}`);

    return passesFilter;
  });

  console.log(`📋 Filtered to ${filtered.length} ${shiftType} shift employees with telegram_id`);

  return {
    employees: filtered.map(att => ({
      employeeId: att.employees.id,
      employeeName: att.employees.full_name,
      telegramId: att.employees.telegram_id,
      attendanceId: att.id,
      preferredLanguage: 'uz', // Default to Uzbek
    })),
    debug: {
      dateStr,
      cutoffTime,
      shiftType,
      totalRecords: data.length,
      filteredCount: filtered.length,
      records: debugInfo
    }
  };
}

// Send checkout reminder to an employee
async function sendCheckoutReminder(emp: Employee): Promise<boolean> {
  if (!BOT_TOKEN) return false;

  try {
    // Create reminder record
    const { data: reminder, error: createError } = await supabaseAdmin!
      .from('checkout_reminders')
      .insert({
        employee_id: emp.employeeId,
        attendance_id: emp.attendanceId,
        shift_type: 'day', // Will be updated based on context
        status: 'pending',
      })
      .select()
      .single();

    if (createError) {
      // Check if reminder already exists
      if (createError.code === '23505') {
        console.log(`⏭ Reminder already exists for ${emp.employeeName}`);
        return false;
      }
      console.error('Error creating reminder:', createError);
      return false;
    }

    // Get translations based on language
    const lang = emp.preferredLanguage || 'uz';
    const messages: Record<string, { title: string; message: string; button: string }> = {
      uz: {
        title: '⏰ Chiqish eslatmasi',
        message: `Salom ${emp.employeeName}! Siz hali ishdan chiqmadingiz. Iltimos, joylashuvingizni tasdiqlang.`,
        button: '📍 Tekshirish',
      },
      ru: {
        title: '⏰ Напоминание о выходе',
        message: `Привет ${emp.employeeName}! Вы ещё не отметили выход. Пожалуйста, подтвердите местоположение.`,
        button: '📍 Проверить',
      },
      en: {
        title: '⏰ Checkout Reminder',
        message: `Hi ${emp.employeeName}! You haven't checked out yet. Please verify your location.`,
        button: '📍 Check',
      },
    };

    const msg = messages[lang] || messages.uz;
    // Include tid (telegramId) in URL for more reliable identification
    const webAppUrl = `${WEBAPP_URL}/telegram/checkout-reminder?tid=${emp.telegramId}&aid=${emp.attendanceId}&lang=${lang}`;

    const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: emp.telegramId,
        text: `${msg.title}\n\n${msg.message}`,
        reply_markup: {
          inline_keyboard: [
            [{ text: msg.button, web_app: { url: webAppUrl } }],
          ],
        },
      }),
    });

    const result = await response.json();

    if (!result.ok) {
      console.error(`Failed to send reminder to ${emp.employeeName}:`, result.description);
      return false;
    }

    // Update reminder as sent
    await supabaseAdmin!
      .from('checkout_reminders')
      .update({
        status: 'sent',
        reminder_sent_at: new Date().toISOString(),
        telegram_message_id: result.result.message_id,
      })
      .eq('id', reminder.id);

    return true;
  } catch (err) {
    console.error(`Error sending reminder to ${emp.employeeName}:`, err);
    return false;
  }
}

// Get Tashkent date string (UTC+5)
function getTashkentDateString(): string {
  const now = new Date();
  const tashkentTime = new Date(now.getTime() + 5 * 60 * 60 * 1000);
  return tashkentTime.toISOString().split('T')[0];
}

// Get a single employee by telegram ID for self-reminder
async function getEmployeeForSelfReminder(telegramId: string): Promise<Employee | null> {
  if (!isSupabaseAdminConfigured()) return null;

  const dateStr = getTashkentDateString();

  const { data, error } = await supabaseAdmin!
    .from('attendance')
    .select(`
      id,
      employee_id,
      check_in,
      check_out,
      employees(
        id,
        full_name,
        telegram_id,
        preferred_language
      )
    `)
    .eq('date', dateStr)
    .is('check_out', null);

  if (error || !data) return null;

  const typedData = data as unknown as (AttendanceWithEmployee & { employees: { preferred_language?: string } })[];

  for (const att of typedData) {
    if (att.employees?.telegram_id === telegramId) {
      return {
        employeeId: att.employees.id,
        employeeName: att.employees.full_name,
        telegramId: att.employees.telegram_id,
        attendanceId: att.id,
        preferredLanguage: (att.employees as any).preferred_language || 'uz',
      };
    }
  }

  return null;
}

export async function POST(request: NextRequest) {
  try {
    if (!isSupabaseAdminConfigured()) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    if (!BOT_TOKEN) {
      return NextResponse.json({ error: 'Telegram bot not configured' }, { status: 500 });
    }

    const body = await request.json();
    const { shiftType, telegramId } = body;

    // If telegramId is provided, send reminder to that specific person only
    if (telegramId) {
      console.log(`📤 Sending reminder to specific user: ${telegramId}`);

      const employee = await getEmployeeForSelfReminder(telegramId);

      if (!employee) {
        return NextResponse.json({
          success: false,
          error: 'No active check-in found for this user today',
          sent: 0,
        });
      }

      const success = await sendCheckoutReminder(employee);

      return NextResponse.json({
        success,
        message: success
          ? `Reminder sent to ${employee.employeeName}`
          : `Failed to send reminder to ${employee.employeeName}`,
        sent: success ? 1 : 0,
        total: 1,
      });
    }

    // Original logic: send to all employees of a shift type
    if (!shiftType || !['day', 'night'].includes(shiftType)) {
      return NextResponse.json({ error: 'Invalid shift type. Use "day" or "night".' }, { status: 400 });
    }

    console.log(`📤 Manually triggering ${shiftType} shift checkout reminders...`);

    // Get employees who need reminders
    const { employees, debug } = await getEmployeesForCheckoutReminder(shiftType);

    if (employees.length === 0) {
      return NextResponse.json({
        success: true,
        message: `No ${shiftType} shift employees need checkout reminder`,
        sent: 0,
        total: 0,
        debug, // Include debug info
      });
    }

    console.log(`📋 Found ${employees.length} employees to remind`);

    let sentCount = 0;
    const results: { name: string; success: boolean }[] = [];

    for (const emp of employees) {
      const success = await sendCheckoutReminder(emp);
      results.push({ name: emp.employeeName, success });
      if (success) sentCount++;
    }

    console.log(`✅ Sent ${sentCount}/${employees.length} ${shiftType} shift checkout reminders`);

    return NextResponse.json({
      success: true,
      message: `Sent ${sentCount} of ${employees.length} ${shiftType} shift reminders`,
      sent: sentCount,
      total: employees.length,
      results,
      debug, // Include debug info
    });
  } catch (error) {
    console.error('Error triggering reminders:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
