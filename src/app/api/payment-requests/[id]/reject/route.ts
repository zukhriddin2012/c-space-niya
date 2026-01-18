import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-auth';
import { PERMISSIONS } from '@/lib/permissions';
import { rejectPaymentRequest, getPaymentRequestItemsWithTelegram } from '@/lib/db';
import { notifyPaymentRejected } from '@/lib/telegram-notifications';

// POST /api/payment-requests/[id]/reject - Reject request (GM)
export const POST = withAuth(async (request: NextRequest, { user, params }) => {
  try {
    const id = params?.id;
    if (!id) {
      return NextResponse.json({ error: 'Request ID is required' }, { status: 400 });
    }

    const { reason } = await request.json();

    if (!reason) {
      return NextResponse.json({ error: 'Rejection reason is required' }, { status: 400 });
    }

    // Get request data before rejecting (for notifications)
    const requestData = await getPaymentRequestItemsWithTelegram(id);

    const result = await rejectPaymentRequest(id, user.id, reason);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    // Send Telegram notifications to employees (async, don't wait)
    if (requestData.request) {
      sendNotifications(requestData, reason).catch(err => console.error('Notification error:', err));
    }

    return NextResponse.json({ success: true, message: 'Payment request rejected' });
  } catch (error) {
    console.error('Error rejecting payment request:', error);
    return NextResponse.json({ error: 'Failed to reject payment request' }, { status: 500 });
  }
}, { permission: PERMISSIONS.PAYROLL_APPROVE });

async function sendNotifications(
  requestData: {
    request: { request_type: 'advance' | 'wage'; year: number; month: number } | null;
    items: Array<{ employee_name: string; telegram_id: string | null; amount: number }>;
  },
  reason: string
) {
  if (!requestData.request) return;

  for (const item of requestData.items) {
    if (item.telegram_id) {
      await notifyPaymentRejected({
        employeeName: item.employee_name,
        telegramId: item.telegram_id,
        amount: item.amount,
        type: requestData.request.request_type,
        month: requestData.request.month,
        year: requestData.request.year,
        reason,
      });
    }
  }
}
