import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-auth';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';
import { supabaseAdmin, isSupabaseAdminConfigured } from '@/lib/supabase';
import type { UserRole } from '@/types';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

// POST /api/attendance/[id]/remind - Send reminder to employee
export const POST = withAuth(async (
  request: NextRequest,
  { user, params }: { user: { id: string; email: string; role: UserRole }; params?: Record<string, string> }
) => {
  // Check permission - need attendance edit permission
  if (!hasPermission(user.role, PERMISSIONS.ATTENDANCE_EDIT)) {
    return NextResponse.json(
      { error: 'Insufficient permissions' },
      { status: 403 }
    );
  }

  if (!isSupabaseAdminConfigured()) {
    return NextResponse.json(
      { error: 'Database not configured' },
      { status: 500 }
    );
  }

  const id = params?.id;

  if (!id) {
    return NextResponse.json(
      { error: 'Employee ID is required' },
      { status: 400 }
    );
  }

  try {
    const body = await request.json();
    const { type, employeeName } = body; // type: 'checkin' or 'checkout'

    if (!type || !['checkin', 'checkout'].includes(type)) {
      return NextResponse.json(
        { error: 'Invalid reminder type. Use "checkin" or "checkout"' },
        { status: 400 }
      );
    }

    // Get employee's telegram_id
    const { data: employee, error: fetchError } = await supabaseAdmin!
      .from('employees')
      .select('id, full_name, telegram_id')
      .eq('id', id)
      .single();

    if (fetchError || !employee) {
      return NextResponse.json(
        { error: 'Employee not found' },
        { status: 404 }
      );
    }

    if (!employee.telegram_id) {
      return NextResponse.json(
        { error: 'Employee has no Telegram account linked' },
        { status: 400 }
      );
    }

    if (!BOT_TOKEN) {
      return NextResponse.json(
        { error: 'Telegram bot not configured' },
        { status: 500 }
      );
    }

    // Prepare message based on type (Uzbek + Russian)
    const messages = {
      checkin: {
        text: `🔔 Eslatma\n\nHurmatli ${employee.full_name}, siz bugun ishga kirganingizni qayd qilmadingiz.\n\nIltimos, bot orqali ishga kirish vaqtingizni qayd qiling.\n\nP.S. Mabodo bugun dam olish kuni bo'lsa yoki ta'tilda bo'lsangiz, bu xabarni e'tiborsiz qoldiring. Biz sizni hurmat qilamiz :)\n\n—\n\n🔔 Напоминание\n\nУважаемый(ая) ${employee.full_name}, вы не отметили приход на работу сегодня.\n\nПожалуйста, отметьте время прихода через бот.\n\nP.S. Если сегодня выходной или вы в отпуске, проигнорируйте это сообщение. Мы вас уважаем :)`,
        button: '✅ Ishga kirish / Отметить приход',
        callback: 'home_checkin',
      },
      checkout: {
        text: `🔔 Eslatma\n\nHurmatli ${employee.full_name}, siz ofisdan chiqqaningizni qayd qilmadingiz.\n\nIltimos, bot orqali ishdan chiqish vaqtingizni qayd qiling.\n\nP.S. Mabodo haliham ofisda bo'lsangiz, bu xabarni e'tiborsiz qoldiring. Biz sizni hurmat qilamiz :)\n\n—\n\n🔔 Напоминание\n\nУважаемый(ая) ${employee.full_name}, вы не отметили уход из офиса.\n\nПожалуйста, отметьте время ухода через бот.\n\nP.S. Если вы ещё в офисе, проигнорируйте это сообщение. Мы вас уважаем :)`,
        button: '🚪 Chiqishni qayd qilish / Отметить уход',
        callback: 'home_checkout',
      },
    };

    const msg = messages[type as keyof typeof messages];

    // Send Telegram message
    const telegramResponse = await fetch(
      `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: employee.telegram_id,
          text: msg.text,
          reply_markup: {
            inline_keyboard: [
              [{ text: msg.button, callback_data: msg.callback }],
            ],
          },
        }),
      }
    );

    const telegramResult = await telegramResponse.json();

    if (!telegramResult.ok) {
      console.error('Telegram API error:', telegramResult);
      return NextResponse.json(
        { error: 'Failed to send Telegram message', details: telegramResult.description },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Reminder sent to ${employee.full_name}`,
    });
  } catch (error) {
    console.error('Send reminder error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});
