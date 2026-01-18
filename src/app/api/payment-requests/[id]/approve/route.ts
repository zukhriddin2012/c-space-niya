import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-auth';
import { PERMISSIONS } from '@/lib/permissions';
import { approvePaymentRequest, getPaymentRequestItemsWithTelegram } from '@/lib/db';
import { notifyPaymentApproved } from '@/lib/telegram-notifications';

// POST /api/payment-requests/[id]/approve - Approve request (GM)
export const POST = withAuth(async (request: NextRequest, { user, params }) => {
  try {
    const id = params?.id;
    if (!id) {
      return NextResponse.json({ error: 'Request ID is required' }, { status: 400 });
    }

    const result = await approvePaymentRequest(id, user.id);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    // Send Telegram notifications to employees (async, don't wait)
    sendNotifications(id).catch(err => console.error('Notification error:', err));

    return NextResponse.json({ success: true, message: 'Payment request approved' });
  } catch (error) {
    console.error('Error approving payment request:', error);
    return NextResponse.json({ error: 'Failed to approve payment request' }, { status: 500 });
  }
}, { permission: PERMISSIONS.PAYROLL_APPROVE });

async function sendNotifications(requestId: string) {
  const { request, items } = await getPaymentRequestItemsWithTelegram(requestId);
  if (!request) return;

  for (const item of items) {
    if (item.telegram_id) {
      await notifyPaymentApproved({
        employeeName: item.employee_name,
        telegramId: item.telegram_id,
        amount: item.amount,
        type: request.request_type,
        month: request.month,
        year: request.year,
      });
    }
  }
}
