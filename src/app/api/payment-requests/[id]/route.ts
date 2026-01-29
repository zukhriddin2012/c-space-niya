import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-auth';
import { PERMISSIONS } from '@/lib/permissions';
import {
  getPaymentRequestById,
  submitPaymentRequest,
  approvePaymentRequest,
  rejectPaymentRequest,
  markPaymentRequestPaid,
  getPaymentRequestItemsWithTelegram
} from '@/lib/db';
import {
  notifyPaymentApproved,
  notifyPaymentRejected,
  notifyPaymentPaid
} from '@/lib/telegram-notifications';

// GET /api/payment-requests/[id] - Get a single payment request with items
export const GET = withAuth(async (request: NextRequest, { params }) => {
  try {
    const id = params?.id;
    if (!id) {
      return NextResponse.json({ error: 'Request ID is required' }, { status: 400 });
    }

    const paymentRequest = await getPaymentRequestById(id);

    if (!paymentRequest) {
      return NextResponse.json({ error: 'Payment request not found' }, { status: 404 });
    }

    return NextResponse.json({ request: paymentRequest });
  } catch (error) {
    console.error('Error fetching payment request:', error);
    return NextResponse.json({ error: 'Failed to fetch payment request' }, { status: 500 });
  }
}, { permission: PERMISSIONS.PAYROLL_VIEW_ALL });

// PATCH /api/payment-requests/[id] - Perform actions: submit, approve, reject, pay
export const PATCH = withAuth(async (request: NextRequest, { user, params }) => {
  try {
    const id = params?.id;
    if (!id) {
      return NextResponse.json({ error: 'Request ID is required' }, { status: 400 });
    }

    const body = await request.json();
    const { action, reason, payment_reference } = body;

    if (!action) {
      return NextResponse.json({ error: 'Action is required' }, { status: 400 });
    }

    switch (action) {
      case 'submit': {
        const result = await submitPaymentRequest(id);
        if (!result.success) {
          return NextResponse.json({ error: result.error }, { status: 400 });
        }
        return NextResponse.json({ success: true, message: 'Payment request submitted for approval' });
      }

      case 'approve': {
        const result = await approvePaymentRequest(id, user.id);
        if (!result.success) {
          return NextResponse.json({ error: result.error }, { status: 400 });
        }
        // Send Telegram notifications (async)
        sendApproveNotifications(id).catch(err => console.error('Notification error:', err));
        return NextResponse.json({ success: true, message: 'Payment request approved' });
      }

      case 'reject': {
        if (!reason) {
          return NextResponse.json({ error: 'Rejection reason is required' }, { status: 400 });
        }
        // Get request data before rejecting (for notifications)
        const requestData = await getPaymentRequestItemsWithTelegram(id);
        const result = await rejectPaymentRequest(id, user.id, reason);
        if (!result.success) {
          return NextResponse.json({ error: result.error }, { status: 400 });
        }
        // Send Telegram notifications (async)
        if (requestData.request) {
          sendRejectNotifications(requestData, reason).catch(err => console.error('Notification error:', err));
        }
        return NextResponse.json({ success: true, message: 'Payment request rejected' });
      }

      case 'pay': {
        const result = await markPaymentRequestPaid(id, payment_reference);
        if (!result.success) {
          return NextResponse.json({ error: result.error }, { status: 400 });
        }
        // Send Telegram notifications (async)
        sendPayNotifications(id, payment_reference).catch(err => console.error('Notification error:', err));
        return NextResponse.json({ success: true, message: 'Payment marked as paid' });
      }

      default:
        return NextResponse.json({ error: `Invalid action: ${action}` }, { status: 400 });
    }
  } catch (error) {
    console.error('Error processing payment request action:', error);
    return NextResponse.json({ error: 'Failed to process action' }, { status: 500 });
  }
}, {
  permission: PERMISSIONS.PAYROLL_PROCESS,
  // Note: approve/reject need PAYROLL_APPROVE but we'll validate in the db functions
});

// Notification helpers
async function sendApproveNotifications(requestId: string) {
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

async function sendRejectNotifications(
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

async function sendPayNotifications(requestId: string, paymentReference?: string) {
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
