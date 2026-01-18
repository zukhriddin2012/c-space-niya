import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-auth';
import { PERMISSIONS } from '@/lib/permissions';
import { markPaymentRequestPaid, getPaymentRequestItemsWithTelegram } from '@/lib/db';
import { notifyPaymentPaid } from '@/lib/telegram-notifications';

// POST /api/payment-requests/[id]/pay - Mark as paid (after bank transfer)
export const POST = withAuth(async (request: NextRequest, { params }) => {
  try {
    const id = params?.id;
    if (!id) {
      return NextResponse.json({ error: 'Request ID is required' }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const { payment_reference } = body;

    const result = await markPaymentRequestPaid(id, payment_reference);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    // Send Telegram notifications to employees (async, don't wait)
    sendNotifications(id, payment_reference).catch(err => console.error('Notification error:', err));

    return NextResponse.json({ success: true, message: 'Payment marked as paid' });
  } catch (error) {
    console.error('Error marking payment as paid:', error);
    return NextResponse.json({ error: 'Failed to mark payment as paid' }, { status: 500 });
  }
}, { permission: PERMISSIONS.PAYROLL_PROCESS });

async function sendNotifications(requestId: string, paymentReference?: string) {
  const { request, items } = await getPaymentRequestItemsWithTelegram(requestId);
  if (!request) return;

  for (const item of items) {
    if (item.telegram_id) {
      await notifyPaymentPaid({
        employeeName: item.employee_name,
        telegramId: item.telegram_id,
        amount: item.amount,
        type: request.request_type,
        month: request.month,
        year: request.year,
        paymentReference,
      });
    }
  }
}
