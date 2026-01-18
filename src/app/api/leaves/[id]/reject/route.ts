import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-auth';
import { PERMISSIONS } from '@/lib/permissions';
import { updateLeaveRequest, getLeaveRequestWithTelegram } from '@/lib/db';
import { notifyLeaveRejected } from '@/lib/telegram-notifications';

// POST /api/leaves/[id]/reject - Reject leave request
export const POST = withAuth(async (request: NextRequest, { user, params }) => {
  try {
    const id = params?.id;
    if (!id) {
      return NextResponse.json({ error: 'Leave request ID is required' }, { status: 400 });
    }

    const leaveId = parseInt(id, 10);
    if (isNaN(leaveId)) {
      return NextResponse.json({ error: 'Invalid leave request ID' }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const { reason } = body;

    // Get leave request data before updating (for notifications)
    const leaveData = await getLeaveRequestWithTelegram(leaveId);

    if (!leaveData) {
      return NextResponse.json({ error: 'Leave request not found' }, { status: 404 });
    }

    if (leaveData.status !== 'pending') {
      return NextResponse.json({ error: 'Leave request is not pending' }, { status: 400 });
    }

    const success = await updateLeaveRequest(leaveId, 'rejected', user.id, reason);

    if (!success) {
      return NextResponse.json({ error: 'Failed to reject leave request' }, { status: 500 });
    }

    // Send Telegram notification to employee (async, don't wait)
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
  } catch (error) {
    console.error('Error rejecting leave request:', error);
    return NextResponse.json({ error: 'Failed to reject leave request' }, { status: 500 });
  }
}, { permission: PERMISSIONS.LEAVE_APPROVE });
