import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-auth';
import { PERMISSIONS } from '@/lib/permissions';
import {
  getDividendSpendRequests,
  createDividendSpendRequest,
  reviewDividendSpendRequest,
} from '@/lib/db/cash-management';
import type { DividendSpendStatus } from '@/modules/reception/types';
import { validateBranchAccess, parsePagination, MAX_LENGTH } from '@/lib/security';
import { audit, getRequestMeta } from '@/lib/audit';

// ============================================
// GET /api/reception/cash-management/dividend-requests
// List dividend spend requests
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

    // Validate status enum
    const rawStatus = searchParams.get('status');
    const validStatuses: DividendSpendStatus[] = ['pending', 'approved', 'rejected'];
    const status = rawStatus && validStatuses.includes(rawStatus as DividendSpendStatus)
      ? (rawStatus as DividendSpendStatus)
      : undefined;

    // M-02: Safe pagination
    const { page, pageSize } = parsePagination(
      searchParams.get('page'), searchParams.get('pageSize')
    );

    const result = await getDividendSpendRequests(
      branchAccess.branchId,
      status,
      page,
      pageSize
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error('Failed to get dividend requests:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}, { permission: PERMISSIONS.RECEPTION_CASH_VIEW, allowKiosk: true });

// ============================================
// POST /api/reception/cash-management/dividend-requests
// Create a dividend spend request
// ============================================
export const POST = withAuth(async (request: NextRequest, { user, employee }) => {
  try {
    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    const body = await request.json();
    const { branchId, expenseSubject, expenseAmount, expenseTypeId, expenseDate, opexPortion, dividendPortion, reason } = body;

    // H-02: Validate branch access (IDOR prevention)
    const branchAccess = validateBranchAccess(user, branchId);
    if (branchAccess.error) {
      return NextResponse.json({ error: branchAccess.error }, { status: branchAccess.status });
    }
    if (!branchAccess.branchId) {
      return NextResponse.json({ error: 'branchId is required' }, { status: 400 });
    }

    // Validation
    const errors: string[] = [];
    if (!expenseSubject?.trim()) errors.push('expenseSubject is required');
    if (!expenseAmount || expenseAmount <= 0) errors.push('expenseAmount must be positive');
    if (!expenseTypeId) errors.push('expenseTypeId is required');
    if (typeof opexPortion !== 'number' || opexPortion < 0) errors.push('opexPortion must be >= 0');
    if (typeof dividendPortion !== 'number' || dividendPortion <= 0) errors.push('dividendPortion must be > 0');
    if (!reason?.trim()) errors.push('reason is required');

    // H-04: Length validation
    if (expenseSubject && expenseSubject.length > MAX_LENGTH.DESCRIPTION) errors.push(`expenseSubject exceeds ${MAX_LENGTH.DESCRIPTION} characters`);
    if (reason && reason.length > MAX_LENGTH.REASON) errors.push(`reason exceeds ${MAX_LENGTH.REASON} characters`);

    if (errors.length > 0) {
      return NextResponse.json({ error: 'Validation failed', details: errors }, { status: 400 });
    }

    const request_ = await createDividendSpendRequest(
      { branchId: branchAccess.branchId, expenseSubject, expenseAmount, expenseTypeId, expenseDate, opexPortion, dividendPortion, reason },
      employee.id
    );

    // SEC-024: Audit trail for dividend spend request
    await audit({
      user_id: user.id,
      action: 'cash.dividend_spend_requested',
      resource_type: 'dividend_spend_requests',
      resource_id: request_.id,
      details: { branchId: branchAccess.branchId, expenseAmount, dividendPortion, expenseSubject },
      severity: 'medium',
      ...getRequestMeta(request),
    });

    return NextResponse.json(request_, { status: 201 });
  } catch (error) {
    console.error('Failed to create dividend request:', error);
    // SEC-066-08: Sanitize error — don't leak balance amounts
    return NextResponse.json({ error: 'Failed to create dividend request. Please check available balances and try again.' }, { status: 400 });
  }
}, { permission: PERMISSIONS.RECEPTION_CASH_DIVIDEND_REQUEST, allowKiosk: true });

// ============================================
// PATCH /api/reception/cash-management/dividend-requests
// Approve or reject a dividend spend request (GM only)
// ============================================
export const PATCH = withAuth(async (request: NextRequest, { user, employee }) => {
  try {
    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    const body = await request.json();
    const { requestId, action, reviewNote } = body;

    if (!requestId) {
      return NextResponse.json({ error: 'requestId is required' }, { status: 400 });
    }
    if (action !== 'approve' && action !== 'reject') {
      return NextResponse.json({ error: 'action must be "approve" or "reject"' }, { status: 400 });
    }
    // H-04: Length validation
    if (reviewNote && reviewNote.length > MAX_LENGTH.NOTES) {
      return NextResponse.json({ error: `reviewNote exceeds ${MAX_LENGTH.NOTES} characters` }, { status: 400 });
    }

    const result = await reviewDividendSpendRequest(
      { requestId, action, reviewNote },
      employee.id
    );

    // SEC-024: Audit trail for dividend approval/rejection
    await audit({
      user_id: user.id,
      action: action === 'approve' ? 'cash.dividend_spend_approved' : 'cash.dividend_spend_rejected',
      resource_type: 'dividend_spend_requests',
      resource_id: requestId,
      details: { action, expenseAmount: result.expenseAmount, expenseId: result.expenseId, reviewNote },
      severity: 'high',
      ...getRequestMeta(request),
    });

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    console.error('Failed to review dividend request:', error);
    // Only pass through safe messages
    const safeMessages = ['Dividend spend request not found', 'Request is no longer pending'];
    const responseMessage = safeMessages.includes(message) ? message : 'Failed to process review. Please try again.';
    return NextResponse.json({ error: responseMessage }, { status: 400 });
  }
}, { roles: ['general_manager'], allowKiosk: false });
