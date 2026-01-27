import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const WEBAPP_URL = process.env.NEXT_PUBLIC_WEBAPP_URL || 'https://c-space-hr.vercel.app';

type Lang = 'uz' | 'ru' | 'en';

// Translations for responses
const messages = {
  checkoutDone: {
    uz: '✅ Chiqishingiz qayd etildi! Keyingi safar ko\'rishguncha! 👋',
    ru: '✅ Ваш уход зафиксирован! До встречи! 👋',
    en: '✅ Your checkout has been recorded! See you next time! 👋',
  },
  reminderSet: {
    uz: (time: string) => `⏰ Eslatma belgilandi! ${time} da yana tekshiramiz.`,
    ru: (time: string) => `⏰ Напоминание установлено! Проверим в ${time}.`,
    en: (time: string) => `⏰ Reminder set! We'll check again at ${time}.`,
  },
  stayingLate: {
    uz: '🌙 Bugun kech qolasiz. Chiqishni qayd etishni unutmang!',
    ru: '🌙 Вы сегодня задерживаетесь. Не забудьте отметить уход!',
    en: '🌙 You\'re staying late today. Don\'t forget to checkout when you leave!',
  },
  atWorkConfirmed: {
    uz: '👍 Yaxshi! 45 daqiqadan keyin yana tekshiramiz.',
    ru: '👍 Хорошо! Проверим снова через 45 минут.',
    en: '👍 Got it! We\'ll check again in 45 minutes.',
  },
  error: {
    uz: '❌ Xatolik yuz berdi. Keyinroq urinib ko\'ring.',
    ru: '❌ Произошла ошибка. Попробуйте позже.',
    en: '❌ An error occurred. Please try again later.',
  },
};

// Send/edit Telegram message
async function sendTelegramMessage(chatId: string, text: string, messageId?: number): Promise<boolean> {
  if (!BOT_TOKEN) return false;

  try {
    if (messageId) {
      // Edit existing message
      const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/editMessageText`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          message_id: messageId,
          text,
        }),
      });
      const result = await response.json();
      if (!result.ok) {
        console.error('Failed to edit message:', result.description);
        // Fall back to sending new message
        await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: chatId, text }),
        });
      }
    } else {
      await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text }),
      });
    }
    return true;
  } catch (err) {
    console.error('Failed to send message:', err);
    return false;
  }
}

// Answer callback query to remove "loading" indicator
async function answerCallbackQuery(callbackQueryId: string, text?: string): Promise<void> {
  if (!BOT_TOKEN) return;

  try {
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/answerCallbackQuery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        callback_query_id: callbackQueryId,
        text: text || '',
      }),
    });
  } catch (err) {
    console.error('Failed to answer callback query:', err);
  }
}

// Handle callback query (button click)
async function handleCallbackQuery(callbackQuery: any): Promise<void> {
  const { id: callbackQueryId, from, message, data } = callbackQuery;
  const telegramId = String(from.id);
  const messageId = message?.message_id;
  const chatId = message?.chat?.id || telegramId;

  console.log('[Webhook] Callback query:', { telegramId, data, messageId });

  // Answer callback immediately to remove loading indicator
  await answerCallbackQuery(callbackQueryId);

  if (!data || !data.startsWith('r:')) {
    console.log('[Webhook] Unknown callback data:', data);
    return;
  }

  // Parse callback data: r:{action}:{reminderId}[:attendanceId]
  const parts = data.split(':');
  const action = parts[1];
  const shortReminderId = parts[2];
  const shortAttendanceId = parts[3]; // Only for 'il' (i_left) action

  if (!supabaseAdmin) {
    await sendTelegramMessage(chatId, messages.error.uz, messageId);
    return;
  }

  // Get employee
  const { data: employee, error: empError } = await supabaseAdmin
    .from('employees')
    .select('id, full_name, preferred_language')
    .eq('telegram_id', telegramId)
    .single();

  if (empError || !employee) {
    console.error('[Webhook] Employee not found:', telegramId);
    await sendTelegramMessage(chatId, messages.error.uz, messageId);
    return;
  }

  const lang = (employee.preferred_language as Lang) || 'uz';

  // Find reminder by short ID prefix
  console.log('[Webhook] Looking up reminder with short ID:', shortReminderId);
  const { data: reminder, error: reminderError } = await supabaseAdmin
    .from('checkout_reminders')
    .select('id, attendance_id')
    .ilike('id', `${shortReminderId}%`)
    .single();

  if (reminderError) {
    console.error('[Webhook] Reminder lookup error:', reminderError);
  }

  const reminderId = reminder?.id;
  let attendanceId = reminder?.attendance_id;

  console.log('[Webhook] Found reminder:', { reminderId, attendanceId });

  // For i_left, try to get attendance from callback data too
  if (action === 'il' && shortAttendanceId) {
    const { data: att } = await supabaseAdmin
      .from('attendance')
      .select('id')
      .ilike('id', `${shortAttendanceId}%`)
      .single();
    if (att) attendanceId = att.id;
  }

  // If still no attendanceId, try to find active attendance for employee
  if (!attendanceId) {
    console.log('[Webhook] No attendanceId from reminder, looking up active attendance for employee:', employee.id);
    const { data: activeAtt } = await supabaseAdmin
      .from('attendance')
      .select('id')
      .eq('employee_id', employee.id)
      .is('check_out', null)
      .order('date', { ascending: false })
      .limit(1)
      .single();

    if (activeAtt) {
      attendanceId = activeAtt.id;
      console.log('[Webhook] Found active attendance:', attendanceId);
    }
  }

  const now = new Date();

  try {
    switch (action) {
      case 'il': // i_left - checkout
        if (attendanceId) {
          const checkOutTime = now.toTimeString().slice(0, 8);

          await supabaseAdmin
            .from('attendance')
            .update({
              check_out: checkOutTime,
              checkout_type: 'reminder_confirmed',
              updated_at: now.toISOString(),
            })
            .eq('id', attendanceId);

          if (reminderId) {
            await supabaseAdmin
              .from('checkout_reminders')
              .update({
                response_received_at: now.toISOString(),
                response_type: 'i_left',
                status: 'completed',
              })
              .eq('id', reminderId);
          }

          await sendTelegramMessage(chatId, messages.checkoutDone[lang], messageId);
        } else {
          await sendTelegramMessage(chatId, messages.error[lang], messageId);
        }
        break;

      case 'aw': // im_at_work - confirm at work, schedule 45 min reminder
        if (reminderId) {
          await supabaseAdmin
            .from('checkout_reminders')
            .update({
              response_received_at: now.toISOString(),
              response_type: 'im_at_work',
              status: 'completed',
            })
            .eq('id', reminderId);
        }

        // Schedule next reminder in 45 minutes
        if (attendanceId) {
          const nextTime = new Date(now.getTime() + 45 * 60 * 1000);
          await supabaseAdmin
            .from('checkout_reminders')
            .insert({
              employee_id: employee.id,
              attendance_id: attendanceId,
              shift_type: 'day',
              status: 'scheduled',
              scheduled_for: nextTime.toISOString(),
            });
        }

        await sendTelegramMessage(chatId, messages.atWorkConfirmed[lang], messageId);
        break;

      case '45': // 45 minutes
        if (reminderId) {
          await supabaseAdmin
            .from('checkout_reminders')
            .update({
              response_received_at: now.toISOString(),
              response_type: '45min',
              status: 'completed',
            })
            .eq('id', reminderId);
        }

        if (attendanceId) {
          const nextTime = new Date(now.getTime() + 45 * 60 * 1000);
          await supabaseAdmin
            .from('checkout_reminders')
            .insert({
              employee_id: employee.id,
              attendance_id: attendanceId,
              shift_type: 'day',
              status: 'scheduled',
              scheduled_for: nextTime.toISOString(),
            });

          const timeStr = nextTime.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' });
          await sendTelegramMessage(chatId, messages.reminderSet[lang](timeStr), messageId);
        }
        break;

      case '2h': // 2 hours
        if (reminderId) {
          await supabaseAdmin
            .from('checkout_reminders')
            .update({
              response_received_at: now.toISOString(),
              response_type: '2hours',
              status: 'completed',
            })
            .eq('id', reminderId);
        }

        if (attendanceId) {
          const nextTime = new Date(now.getTime() + 2 * 60 * 60 * 1000);
          await supabaseAdmin
            .from('checkout_reminders')
            .insert({
              employee_id: employee.id,
              attendance_id: attendanceId,
              shift_type: 'day',
              status: 'scheduled',
              scheduled_for: nextTime.toISOString(),
            });

          const timeStr = nextTime.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' });
          await sendTelegramMessage(chatId, messages.reminderSet[lang](timeStr), messageId);
        }
        break;

      case 'ad': // all_day - staying late
        if (reminderId) {
          await supabaseAdmin
            .from('checkout_reminders')
            .update({
              response_received_at: now.toISOString(),
              response_type: 'all_day',
              status: 'completed',
            })
            .eq('id', reminderId);
        }

        await sendTelegramMessage(chatId, messages.stayingLate[lang], messageId);
        break;

      default:
        console.log('[Webhook] Unknown action:', action);
    }
  } catch (err) {
    console.error('[Webhook] Error handling action:', err);
    await sendTelegramMessage(chatId, messages.error[lang], messageId);
  }
}

// Webhook endpoint for Telegram
export async function POST(request: NextRequest) {
  try {
    const update = await request.json();
    console.log('[Webhook] Received update:', JSON.stringify(update).substring(0, 500));

    // Handle callback queries (inline button clicks)
    if (update.callback_query) {
      await handleCallbackQuery(update.callback_query);
    }

    // Handle regular messages (if needed in future)
    if (update.message) {
      console.log('[Webhook] Message received:', update.message.text?.substring(0, 100));
      // Could handle /start, /help, etc. here
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[Webhook] Error:', error);
    return NextResponse.json({ ok: false, error: 'Internal error' }, { status: 500 });
  }
}

// For health check
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'Telegram webhook endpoint',
    timestamp: new Date().toISOString(),
  });
}
