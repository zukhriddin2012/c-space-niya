import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-auth';
import { PERMISSIONS } from '@/lib/permissions';
import { getPaymentRequestById } from '@/lib/db';

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
