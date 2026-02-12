import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-auth';
import { PERMISSIONS } from '@/lib/permissions';
import { getInkassoDeliveries, createInkassoDelivery } from '@/lib/db/cash-management';
import { validateBranchAccess, parsePagination, MAX_LENGTH } from '@/lib/security';
import { audit, getRequestMeta } from '@/lib/audit';

// ============================================
// GET /api/reception/cash-management/inkasso-deliveries
// List inkasso delivery history
// ============================================
export const GET = withAuth(async (request: NextRequest, { user }) => {
  try {
    const searchParams = request.nextUrl.searchParams;

    // H-02: Validate branch access (IDOR prevention)
    const branchAccess = validateBranchAccess(user, searchParams.get('branchId'));
    if (branchAccess.error) {
      return NextResponse.json({ error: branchAccess.error }, { status: branchAccess.status });
    }
    if (!branchAccess.branchId) {
      return NextResponse.json({ error: 'branchId is required' }, { status: 400 });
    }

    // M-02: Safe pagination
    const { page, pageSize } = parsePagination(
      searchParams.get('page'), searchParams.get('pageSize')
    );

    const result = await getInkassoDeliveries(branchAccess.branchId, page, pageSize);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Failed to get inkasso deliveries:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}, { permission: PERMISSIONS.RECEPTION_CASH_VIEW, allowKiosk: true });

// ============================================
// POST /api/reception/cash-management/inkasso-deliveries
// Record a new inkasso delivery batch
// ============================================
export const POST = withAuth(async (request: NextRequest, { user, employee }) => {
  try {
    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    const body = await request.json();
    const { branchId, transactionIds, deliveredDate, notes } = body;

    // H-02: Validate branch access (IDOR prevention)
    const branchAccess = validateBranchAccess(user, branchId);
    if (branchAccess.error) {
      return NextResponse.json({ error: branchAccess.error }, { status: branchAccess.status });
    }
    if (!branchAccess.branchId) {
      return NextResponse.json({ error: 'branchId is required' }, { status: 400 });
    }

    if (!transactionIds || !Array.isArray(transactionIds) || transactionIds.length === 0) {
      return NextResponse.json({ error: 'transactionIds must be a non-empty array' }, { status: 400 });
    }
    // H-04: Length validation
    if (notes && notes.length > MAX_LENGTH.NOTES) {
      return NextResponse.json({ error: `Notes exceed ${MAX_LENGTH.NOTES} characters` }, { status: 400 });
    }

    const delivery = await createInkassoDelivery(
      { branchId: branchAccess.branchId, transactionIds, deliveredDate, notes },
      employee.id
    );

    // SEC-024: Audit trail for irreversible inkasso delivery
    await audit({
      user_id: user.id,
      action: 'cash.inkasso_delivery_created',
      resource_type: 'inkasso_deliveries',
      resource_id: delivery.id,
      details: { branchId: branchAccess.branchId, transactionCount: transactionIds.length, totalAmount: delivery.totalAmount },
      severity: 'high',
      ...getRequestMeta(request),
    });

    return NextResponse.json(delivery, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    console.error('Failed to create inkasso delivery:', error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}, { permission: PERMISSIONS.RECEPTION_CASH_VIEW, allowKiosk: true });
