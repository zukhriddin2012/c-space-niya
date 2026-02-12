import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-auth';
import { PERMISSIONS } from '@/lib/permissions';
import { getCashTransfers, createCashTransfer } from '@/lib/db/cash-management';
import { validateBranchAccess, parsePagination, MAX_LENGTH } from '@/lib/security';
import { audit, getRequestMeta } from '@/lib/audit';

// ============================================
// GET /api/reception/cash-management/transfers
// List cash transfer history
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

    const result = await getCashTransfers(branchAccess.branchId, page, pageSize);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Failed to get cash transfers:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}, { permission: PERMISSIONS.RECEPTION_CASH_VIEW, allowKiosk: true });

// ============================================
// POST /api/reception/cash-management/transfers
// Record a safe transfer (GM only)
// ============================================
export const POST = withAuth(async (request: NextRequest, { user, employee }) => {
  try {
    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    const body = await request.json();
    const { branchId, dividendAmount, marketingAmount, transferDate, notes } = body;

    // H-02: Validate branch access (IDOR prevention)
    const branchAccess = validateBranchAccess(user, branchId);
    if (branchAccess.error) {
      return NextResponse.json({ error: branchAccess.error }, { status: branchAccess.status });
    }
    if (!branchAccess.branchId) {
      return NextResponse.json({ error: 'branchId is required' }, { status: 400 });
    }

    if (typeof dividendAmount !== 'number' || dividendAmount < 0) {
      return NextResponse.json({ error: 'dividendAmount must be >= 0' }, { status: 400 });
    }
    if (typeof marketingAmount !== 'number' || marketingAmount < 0) {
      return NextResponse.json({ error: 'marketingAmount must be >= 0' }, { status: 400 });
    }
    if (dividendAmount + marketingAmount <= 0) {
      return NextResponse.json({ error: 'Total transfer must be > 0' }, { status: 400 });
    }
    // H-04: Length validation
    if (notes && notes.length > MAX_LENGTH.NOTES) {
      return NextResponse.json({ error: `Notes exceed ${MAX_LENGTH.NOTES} characters` }, { status: 400 });
    }

    const transfer = await createCashTransfer(
      { branchId: branchAccess.branchId, dividendAmount, marketingAmount, transferDate, notes },
      employee.id
    );

    // SEC-024: Audit trail for cash transfer (financial operation)
    await audit({
      user_id: user.id,
      action: 'cash.transfer_created',
      resource_type: 'cash_transfers',
      resource_id: transfer.id,
      details: { branchId: branchAccess.branchId, dividendAmount, marketingAmount, totalAmount: transfer.totalAmount },
      severity: 'high',
      ...getRequestMeta(request),
    });

    return NextResponse.json(transfer, { status: 201 });
  } catch (error) {
    console.error('Failed to create cash transfer:', error);
    // SEC-066-08: Sanitize error — don't leak balance amounts
    return NextResponse.json({ error: 'Failed to create transfer. Please check available balances and try again.' }, { status: 400 });
  }
}, { roles: ['general_manager'], allowKiosk: false });
