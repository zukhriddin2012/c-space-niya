import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-auth';
import { PERMISSIONS } from '@/lib/permissions';
import { submitPaymentRequest } from '@/lib/db';

// POST /api/payment-requests/[id]/submit - Submit for approval (HR)
export const POST = withAuth(async (request: NextRequest, { params }) => {
  try {
    const id = params?.id;
    if (!id) {
      return NextResponse.json({ error: 'Request ID is required' }, { status: 400 });
    }

    const result = await submitPaymentRequest(id);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: 'Payment request submitted for approval' });
  } catch (error) {
    console.error('Error submitting payment request:', error);
    return NextResponse.json({ error: 'Failed to submit payment request' }, { status: 500 });
  }
}, { permission: PERMISSIONS.PAYROLL_PROCESS });
