import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-auth';
import { PERMISSIONS } from '@/lib/permissions';
import { rejectPaymentRequest } from '@/lib/db';

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

    const result = await rejectPaymentRequest(id, user.id, reason);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: 'Payment request rejected' });
  } catch (error) {
    console.error('Error rejecting payment request:', error);
    return NextResponse.json({ error: 'Failed to reject payment request' }, { status: 500 });
  }
}, { permission: PERMISSIONS.PAYROLL_APPROVE });
