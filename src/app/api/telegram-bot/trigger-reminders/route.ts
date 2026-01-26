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
    preferred_language: string | null;
  };
}

// Get employees who need checkout reminder based on shift type
async function getEmployeesForCheckoutReminder(shiftType: 'day' | 'night'): Promise<Employee[]> {
  if (!isSupabaseAdminConfigured()) return [];

  const today = new Date();
  const dateStr = today.toISOString().split('T')[0];

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
      employees!inner(
        id,
        full_name,
        telegram_id,
        preferred_language
      )
    `)
    .eq('date', dateStr)
    .is('check_out', null)
    .not('employees.telegram_id', 'is', null);

  if (error || !data) {
    console.error('Error fetching employees for reminder:', error);
    return [];
  }

  const typedData = data as unknown as AttendanceWithEmployee[];

  // Filter by shift type based on check-in time
  const filtered = typedData.filter(att => {
    const checkInTime = new Date(att.check_in).toLocaleTimeString('en-US', {
      hour12: false,
      timeZone: 'Asia/Tashkent'
    });

    if (shiftType === 'day') {
      return checkInTime <= cutoffTime;
    } else {
      return checkInTime > cutoffTime;
    }
  });

  return filtered.map(att => ({
    employeeId: att.employees.id,
    employeeName: att.employees.full_name,
    telegramId: att.employees.telegram_id,
    attendanceId: att.id,
    preferredLanguage: att.employees.preferred_language || 'uz',
  }));
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
    const webAppUrl = `${WEBAPP_URL}/telegram/checkout-reminder?attendanceId=${emp.attendanceId}&lang=${lang}`;

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

export async function POST(request: NextRequest) {
  try {
    if (!isSupabaseAdminConfigured()) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    if (!BOT_TOKEN) {
      return NextResponse.json({ error: 'Telegram bot not configured' }, { status: 500 });
    }

    const body = await request.json();
    const { shiftType } = body;

    if (!shiftType || !['day', 'night'].includes(shiftType)) {
      return NextResponse.json({ error: 'Invalid shift type. Use "day" or "night".' }, { status: 400 });
    }

    console.log(`📤 Manually triggering ${shiftType} shift checkout reminders...`);

    // Get employees who need reminders
    const employees = await getEmployeesForCheckoutReminder(shiftType);

    if (employees.length === 0) {
      return NextResponse.json({
        success: true,
        message: `No ${shiftType} shift employees need checkout reminder`,
        sent: 0,
        total: 0,
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
    });
  } catch (error) {
    console.error('Error triggering reminders:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
