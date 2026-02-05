import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-auth';
import { PERMISSIONS, hasPermission } from '@/lib/permissions';
import {
  getPaymentRequestById,
  submitPaymentRequest,
  approvePaymentRequest,
  rejectPaymentRequest,
  markPaymentRequestPaid,
  getPaymentRequestItemsWithTelegram,
  deletePaymentRequest,
} from '@/lib/db';
import {
  notifyPaymentRejected,
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
        // Check PAYROLL_APPROVE permission for approve action
        if (!hasPermission(user.role, PERMISSIONS.PAYROLL_APPROVE)) {
          return NextResponse.json({ error: 'Approval permission required' }, { status: 403 });
        }
        const result = await approvePaymentRequest(id, user.id);
        if (!result.success) {
          return NextResponse.json({ error: result.error }, { status: 400 });
        }
        // NOTE: Auto-notifications removed - user triggers manually via /notify endpoint
        return NextResponse.json({ success: true, message: 'Payment request approved' });
      }

      case 'reject': {
        // Check PAYROLL_APPROVE permission for reject action
        if (!hasPermission(user.role, PERMISSIONS.PAYROLL_APPROVE)) {
          return NextResponse.json({ error: 'Approval permission required' }, { status: 403 });
        }
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
        // NOTE: Auto-notifications removed - user triggers manually via /notify endpoint
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
  // Note: approve/reject also check PAYROLL_APPROVE permission in the handler above
});

// DELETE /api/payment-requests/[id] - Delete a payment request (non-paid only)
export const DELETE = withAuth(async (request: NextRequest, { user, params }) => {
  try {
    const id = params?.id;
    if (!id) {
      return NextResponse.json({ error: 'Request ID is required' }, { status: 400 });
    }

    const result = await deletePaymentRequest(id, user.id);

    if (!result.success) {
      const status = result.code === 'CANNOT_DELETE_PAID' ? 400 : result.code === 'NOT_FOUND' ? 404 : 500;
      return NextResponse.json({
        success: false,
        error: result.error,
        code: result.code,
      }, { status });
    }

    return NextResponse.json({
      success: true,
      message: 'Payment request deleted successfully',
      deletedRequest: result.deletedRequest,
    });
  } catch (error) {
    console.error('Error deleting payment request:', error);
    return NextResponse.json({ error: 'Failed to delete payment request' }, { status: 500 });
  }
}, { permission: PERMISSIONS.PAYROLL_PROCESS });

// Notification helper for rejections (auto-notify kept for rejections)
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
