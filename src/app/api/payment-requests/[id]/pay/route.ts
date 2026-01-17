import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-auth';
import { PERMISSIONS } from '@/lib/permissions';
import { markPaymentRequestPaid } from '@/lib/db';

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

    return NextResponse.json({ success: true, message: 'Payment marked as paid' });
  } catch (error) {
    console.error('Error marking payment as paid:', error);
    return NextResponse.json({ error: 'Failed to mark payment as paid' }, { status: 500 });
  }
}, { permission: PERMISSIONS.PAYROLL_PROCESS });
