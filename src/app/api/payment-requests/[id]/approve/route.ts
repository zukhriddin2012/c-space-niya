import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-auth';
import { PERMISSIONS } from '@/lib/permissions';
import { approvePaymentRequest } from '@/lib/db';

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

    return NextResponse.json({ success: true, message: 'Payment request approved' });
  } catch (error) {
    console.error('Error approving payment request:', error);
    return NextResponse.json({ error: 'Failed to approve payment request' }, { status: 500 });
  }
}, { permission: PERMISSIONS.PAYROLL_APPROVE });
