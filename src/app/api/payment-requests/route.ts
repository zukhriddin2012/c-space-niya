import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-auth';
import { PERMISSIONS } from '@/lib/permissions';
import { getPaymentRequests, createPaymentRequest } from '@/lib/db';

// GET /api/payment-requests - Get payment requests for a month
export const GET = withAuth(async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url);
    const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()));
    const month = parseInt(searchParams.get('month') || String(new Date().getMonth() + 1));
    const type = searchParams.get('type') as 'advance' | 'wage' | undefined;

    const requests = await getPaymentRequests(year, month, type);

    return NextResponse.json({ requests });
  } catch (error) {
    console.error('Error fetching payment requests:', error);
    return NextResponse.json({ error: 'Failed to fetch payment requests' }, { status: 500 });
  }
}, { permission: PERMISSIONS.PAYROLL_VIEW_ALL });

// POST /api/payment-requests - Create a new payment request
export const POST = withAuth(async (request: NextRequest, { user }) => {
  try {
    const body = await request.json();
    const { request_type, year, month, legal_entity_id, notes, items } = body;

    if (!request_type || !year || !month || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Invalid request data' }, { status: 400 });
    }

    const result = await createPaymentRequest({
      request_type,
      year,
      month,
      legal_entity_id,
      created_by: user.id,
      notes,
      items,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, request: result.request });
  } catch (error) {
    console.error('Error creating payment request:', error);
    return NextResponse.json({ error: 'Failed to create payment request' }, { status: 500 });
  }
}, { permission: PERMISSIONS.PAYROLL_PROCESS });
