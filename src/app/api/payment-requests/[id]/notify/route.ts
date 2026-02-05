import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-auth';
import { PERMISSIONS } from '@/lib/permissions';
import {
  getPaymentRequestById,
  getPaymentRequestItemsWithTelegram,
  markNotificationSent,
  logPaymentAudit,
} from '@/lib/db';
import {
  notifyPaymentApproved,
  notifyPaymentPaid,
} from '@/lib/telegram-notifications';

// POST /api/payment-requests/[id]/notify - Send Telegram notifications for a single request
export const POST = withAuth(async (request: NextRequest, { user, params }) => {
  try {
    const id = params?.id;
    if (!id) {
      return NextResponse.json({ error: 'Request ID is required' }, { status: 400 });
    }

    // 1. Fetch request
    const paymentRequest = await getPaymentRequestById(id);

    if (!paymentRequest) {
      return NextResponse.json({ error: 'Payment request not found' }, { status: 404 });
    }

    // 2. Validate status (only approved or paid)
    if (!['approved', 'paid'].includes(paymentRequest.status)) {
      return NextResponse.json({
        success: false,
        error: 'Can only notify for approved or paid requests',
        code: 'INVALID_STATUS',
      }, { status: 400 });
    }

    // 3. Check if already notified
    if ((paymentRequest as any).notification_sent_at) {
      return NextResponse.json({
        success: true,
        alreadyNotified: true,
        notifiedAt: (paymentRequest as any).notification_sent_at,
        message: 'Notifications were already sent',
      });
    }

    // 4. Get items with telegram IDs
    const { request: reqData, items } = await getPaymentRequestItemsWithTelegram(id);

    if (!reqData) {
      return NextResponse.json({ error: 'Failed to fetch request data' }, { status: 500 });
    }

    // 5. Send notifications
    let notified = 0;
    let skipped = 0;

    for (const item of items) {
      if (!item.telegram_id) {
        skipped++;
        continue;
      }

      let success = false;
      if (paymentRequest.status === 'paid') {
        success = await notifyPaymentPaid({
          employeeName: item.employee_name,
          telegramId: item.telegram_id,
          amount: item.amount,
          type: reqData.request_type,
          month: reqData.month,
          year: reqData.year,
          paymentReference: reqData.payment_reference || undefined,
        });
      } else {
        success = await notifyPaymentApproved({
          employeeName: item.employee_name,
          telegramId: item.telegram_id,
          amount: item.amount,
          type: reqData.request_type,
          month: reqData.month,
          year: reqData.year,
        });
      }

      if (success) notified++;
      else skipped++;
    }

    // 6. Update notification timestamp
    await markNotificationSent(id, user.id);

    // 7. Log to audit
    await logPaymentAudit({
      payment_request_id: id,
      actor_id: user.id,
      action: 'notified',
      details: {
        notified,
        skipped,
        total: items.length,
        status: paymentRequest.status,
      },
    });

    return NextResponse.json({
      success: true,
      notified,
      skipped,
      message: `Notifications sent to ${notified} employees${skipped > 0 ? ` (${skipped} skipped - no Telegram)` : ''}`,
    });
  } catch (error) {
    console.error('Error sending notifications:', error);
    return NextResponse.json({ error: 'Failed to send notifications' }, { status: 500 });
  }
}, { permission: PERMISSIONS.PAYROLL_PROCESS });
