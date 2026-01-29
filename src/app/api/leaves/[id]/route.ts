import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-auth';
import { PERMISSIONS } from '@/lib/permissions';
import { updateLeaveRequest, getLeaveRequestWithTelegram } from '@/lib/db';
import { notifyLeaveApproved, notifyLeaveRejected } from '@/lib/telegram-notifications';

// PATCH /api/leaves/[id] - Perform actions: approve, reject
export const PATCH = withAuth(async (request: NextRequest, { user, params }) => {
  try {
    const id = params?.id;
    if (!id) {
      return NextResponse.json({ error: 'Leave request ID is required' }, { status: 400 });
    }

    const leaveId = parseInt(id, 10);
    if (isNaN(leaveId)) {
      return NextResponse.json({ error: 'Invalid leave request ID' }, { status: 400 });
    }

    const body = await request.json();
    const { action, reason } = body;

    if (!action) {
      return NextResponse.json({ error: 'Action is required' }, { status: 400 });
    }

    // Get leave request data (for validation and notifications)
    const leaveData = await getLeaveRequestWithTelegram(leaveId);

    if (!leaveData) {
      return NextResponse.json({ error: 'Leave request not found' }, { status: 404 });
    }

    if (leaveData.status !== 'pending') {
      return NextResponse.json({ error: 'Leave request is not pending' }, { status: 400 });
    }

    switch (action) {
      case 'approve': {
        const success = await updateLeaveRequest(leaveId, 'approved', user.id);

        if (!success) {
          return NextResponse.json({ error: 'Failed to approve leave request' }, { status: 500 });
        }

        // Send Telegram notification (async)
        if (leaveData.telegram_id) {
          notifyLeaveApproved({
            employeeName: leaveData.employee_name,
            telegramId: leaveData.telegram_id,
            startDate: leaveData.start_date,
            endDate: leaveData.end_date,
            reason: leaveData.reason || undefined,
          }).catch(err => console.error('Notification error:', err));
        }

        return NextResponse.json({ success: true, message: 'Leave request approved' });
      }

      case 'reject': {
        const success = await updateLeaveRequest(leaveId, 'rejected', user.id, reason);

        if (!success) {
          return NextResponse.json({ error: 'Failed to reject leave request' }, { status: 500 });
        }

        // Send Telegram notification (async)
        if (leaveData.telegram_id) {
          notifyLeaveRejected({
            employeeName: leaveData.employee_name,
            telegramId: leaveData.telegram_id,
            startDate: leaveData.start_date,
            endDate: leaveData.end_date,
            reason: leaveData.reason || undefined,
            reviewNote: reason,
          }).catch(err => console.error('Notification error:', err));
        }

        return NextResponse.json({ success: true, message: 'Leave request rejected' });
      }

      default:
        return NextResponse.json({ error: `Invalid action: ${action}` }, { status: 400 });
    }
  } catch (error) {
    console.error('Error processing leave request action:', error);
    return NextResponse.json({ error: 'Failed to process action' }, { status: 500 });
  }
}, { permission: PERMISSIONS.LEAVE_APPROVE });
