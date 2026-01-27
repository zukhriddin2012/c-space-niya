import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

type Lang = 'uz' | 'ru' | 'en';

// Translations for bot messages
const messages = {
  ipMatched: {
    uz: (name: string, branch: string) => `✅ Ajoyib, ${name}! Siz hali ${branch}dasiz.\n\nQachon yana tekshiraylik?`,
    ru: (name: string, branch: string) => `✅ Отлично, ${name}! Вы всё ещё в ${branch}.\n\nКогда напомнить снова?`,
    en: (name: string, branch: string) => `✅ Great, ${name}! You're still at ${branch}.\n\nWhen should we check again?`,
  },
  ipNotMatched: {
    uz: (name: string) => `❓ ${name}, sizni ofisda aniqlay olmadik.\n\nHali ishdamisiz?`,
    ru: (name: string) => `❓ ${name}, мы не обнаружили вас в офисе.\n\nВы ещё на работе?`,
    en: (name: string) => `❓ ${name}, we couldn't detect you at the office.\n\nAre you still at work?`,
  },
  buttons: {
    in45min: { uz: '⏱️ 45 daq', ru: '⏱️ 45 мин', en: '⏱️ 45 min' },
    in2hours: { uz: '🕐 2 soat', ru: '🕐 2 часа', en: '🕐 2 hours' },
    allDay: { uz: '🌙 Bugun ketmayman', ru: '🌙 Сегодня не уйду', en: '🌙 Not leaving today' },
    imAtWork: { uz: '🏢 Men ishdaman', ru: '🏢 Я на работе', en: '🏢 I\'m at work' },
    iLeft: { uz: '🚪 Men chiqdim', ru: '🚪 Я ушёл', en: '🚪 I left' },
  },
};

// Edit the original reminder message with IP verification result
async function editReminderMessage(
  telegramId: string,
  messageId: string | null,
  ipMatched: boolean,
  branchName: string,
  reminderId: string,
  attendanceId: string,
  employeeName: string,
  lang: Lang = 'uz'
): Promise<{ success: boolean; error?: string }> {
  if (!BOT_TOKEN) {
    console.error('BOT_TOKEN not configured');
    return { success: false, error: 'BOT_TOKEN not configured' };
  }

  try {
    let text: string;
    let replyMarkup: object;

    // Use shorter callback data format: r:{action}:{shortId}
    // Telegram has 64-byte limit for callback_data
    // UUID is 36 chars, so we use first 8 chars as short ID
    const shortReminderId = reminderId.substring(0, 8);
    const shortAttendanceId = attendanceId.substring(0, 8);

    if (ipMatched) {
      text = messages.ipMatched[lang](employeeName, branchName);
      replyMarkup = {
        inline_keyboard: [
          [
            { text: messages.buttons.in45min[lang], callback_data: `r:45:${shortReminderId}` },
            { text: messages.buttons.in2hours[lang], callback_data: `r:2h:${shortReminderId}` },
          ],
          [
            { text: messages.buttons.allDay[lang], callback_data: `r:ad:${shortReminderId}` },
          ],
        ],
      };
    } else {
      text = messages.ipNotMatched[lang](employeeName);
      replyMarkup = {
        inline_keyboard: [
          [
            { text: messages.buttons.imAtWork[lang], callback_data: `r:aw:${shortReminderId}` },
          ],
          [
            { text: messages.buttons.iLeft[lang], callback_data: `r:il:${shortReminderId}:${shortAttendanceId}` },
          ],
        ],
      };
    }

    console.log('[Checkout Reminder] Updating message:', {
      telegramId,
      messageId,
      ipMatched,
      branchName,
      reminderId,
      lang,
    });

    // If we have messageId, edit the existing message; otherwise send new
    if (messageId) {
      const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/editMessageText`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: telegramId,
          message_id: parseInt(messageId),
          text,
          reply_markup: replyMarkup,
        }),
      });

      const result = await response.json();
      console.log('[Checkout Reminder] Edit message result:', JSON.stringify(result));
      console.log('[Checkout Reminder] Message text was:', text.substring(0, 50));
      console.log('[Checkout Reminder] Reply markup was:', JSON.stringify(replyMarkup));

      if (!result.ok) {
        console.error('[Checkout Reminder] Failed to edit message:', result.description);
        console.log('[Checkout Reminder] Trying fallback sendMessage...');
        // If edit fails, try sending new message
        const sendResponse = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: telegramId,
            text,
            reply_markup: replyMarkup,
          }),
        });
        const sendResult = await sendResponse.json();
        console.log('[Checkout Reminder] Fallback send message result:', JSON.stringify(sendResult));
        return { success: sendResult.ok, error: sendResult.ok ? undefined : sendResult.description };
      }

      return { success: true };
    } else {
      // Fallback to sending new message if no messageId
      console.log('[Checkout Reminder] No messageId, sending new message');
      const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: telegramId,
          text,
          reply_markup: replyMarkup,
        }),
      });

      const result = await response.json();
      console.log('[Checkout Reminder] Send message result:', result);
      return { success: result.ok, error: result.ok ? undefined : result.description };
    }
  } catch (err) {
    console.error('[Checkout Reminder] Failed to edit/send message:', err);
    return { success: false, error: String(err) };
  }
}

// Handle GET requests (for debugging - should not happen)
export async function GET(request: NextRequest) {
  return NextResponse.json({
    error: 'GET not allowed - use POST',
    method: request.method,
    url: request.url,
  }, { status: 405 });
}

export async function POST(request: NextRequest) {
  try {
    // Get the client's IP address
    const forwardedFor = request.headers.get('x-forwarded-for');
    const realIp = request.headers.get('x-real-ip');
    const clientIp = forwardedFor?.split(',')[0]?.trim() || realIp || 'unknown';

    const body = await request.json();
    const { telegramId, attendanceId, messageId } = body;

    if (!telegramId) {
      return NextResponse.json({ success: false, error: 'Missing telegramId' }, { status: 400 });
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ success: false, error: 'Database not configured' }, { status: 500 });
    }

    // Get employee by telegram ID (including preferred_language)
    const { data: employee, error: empError } = await supabaseAdmin
      .from('employees')
      .select('id, full_name, branch_id, preferred_language')
      .eq('telegram_id', telegramId.toString())
      .single();

    if (empError || !employee) {
      return NextResponse.json({ success: false, error: 'Employee not found' }, { status: 404 });
    }

    const lang = (employee.preferred_language as Lang) || 'uz';

    // Find active attendance record
    let attendance;
    if (attendanceId) {
      const { data, error } = await supabaseAdmin
        .from('attendance')
        .select('*, check_in_branch:branches!attendance_check_in_branch_id_fkey(id, name)')
        .eq('id', attendanceId)
        .single();

      if (!error && data) {
        attendance = data;
      }
    }

    // If no specific attendance, get active one
    if (!attendance) {
      const { data, error } = await supabaseAdmin
        .from('attendance')
        .select('*, check_in_branch:branches!attendance_check_in_branch_id_fkey(id, name)')
        .eq('employee_id', employee.id)
        .is('check_out', null)
        .order('date', { ascending: false })
        .limit(1)
        .single();

      if (error || !data) {
        return NextResponse.json({ success: false, error: 'No active check-in found' }, { status: 404 });
      }
      attendance = data;
    }

    // Check if IP matches any branch's office IPs
    const { data: branches } = await supabaseAdmin
      .from('branches')
      .select('id, name, office_ips')
      .not('office_ips', 'is', null);

    let ipMatched = false;
    let matchedBranch = null;
    for (const branch of branches || []) {
      if (branch.office_ips && Array.isArray(branch.office_ips)) {
        if (branch.office_ips.includes(clientIp)) {
          ipMatched = true;
          matchedBranch = branch;
          break;
        }
      }
    }

    // Create or update checkout reminder
    const { data: existingReminder } = await supabaseAdmin
      .from('checkout_reminders')
      .select('id')
      .eq('attendance_id', attendance.id)
      .in('status', ['pending', 'sent'])
      .limit(1);

    let reminderId: string;
    if (existingReminder && existingReminder.length > 0) {
      reminderId = existingReminder[0].id;
      // Update with IP info and set sent_at if not already set
      await supabaseAdmin
        .from('checkout_reminders')
        .update({
          ip_address: clientIp,
          ip_verified: ipMatched,
          status: 'sent',
          reminder_sent_at: new Date().toISOString(),
        })
        .eq('id', reminderId)
        .is('reminder_sent_at', null);

      // Also update IP info for records where sent_at is already set
      await supabaseAdmin
        .from('checkout_reminders')
        .update({
          ip_address: clientIp,
          ip_verified: ipMatched,
        })
        .eq('id', reminderId);
    } else {
      // Create new reminder
      const shiftType = attendance.check_in?.substring(0, 5) <= '15:30' ? 'day' : 'night';
      const { data: newReminder, error: reminderError } = await supabaseAdmin
        .from('checkout_reminders')
        .insert({
          employee_id: employee.id,
          attendance_id: attendance.id,
          shift_type: shiftType,
          status: 'sent',
          reminder_sent_at: new Date().toISOString(),
          ip_address: clientIp,
          ip_verified: ipMatched,
        })
        .select()
        .single();

      if (reminderError || !newReminder) {
        console.error('Failed to create reminder:', reminderError);
        return NextResponse.json({ success: false, error: 'Failed to create reminder' }, { status: 500 });
      }
      reminderId = newReminder.id;
    }

    const branchName = ipMatched ? matchedBranch?.name : (attendance.check_in_branch?.name || '');

    console.log('[Checkout Check] Processing:', {
      telegramId,
      messageId,
      clientIp,
      ipMatched,
      branchName,
      attendanceId: attendance.id,
      reminderId,
    });

    // Edit the original reminder message (or send new if no messageId)
    const messageResult = await editReminderMessage(
      telegramId,
      messageId || null,
      ipMatched,
      branchName,
      reminderId,
      attendance.id,
      employee.full_name,
      lang
    );

    return NextResponse.json({
      success: true,
      ipMatched,
      branchName,
      attendanceId: attendance.id,
      reminderId,
      clientIp,
      messageUpdated: messageResult.success,
      messageError: messageResult.error,
    });
  } catch (error) {
    console.error('Checkout check error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
