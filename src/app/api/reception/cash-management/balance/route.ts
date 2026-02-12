import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-auth';
import { PERMISSIONS } from '@/lib/permissions';
import { getCashAllocationBalance } from '@/lib/db/cash-management';
import { validateBranchAccess } from '@/lib/security';

// ============================================
// GET /api/reception/cash-management/balance
// Get cash allocation balance for a branch
// ============================================
export const GET = withAuth(async (request: NextRequest, { user }) => {
  try {
    // H-02: Validate branch access (IDOR prevention)
    const branchAccess = validateBranchAccess(user, request.nextUrl.searchParams.get('branchId'));
    if (branchAccess.error) {
      return NextResponse.json({ error: branchAccess.error }, { status: branchAccess.status });
    }
    if (!branchAccess.branchId) {
      return NextResponse.json({ error: 'branchId is required' }, { status: 400 });
    }

    const balance = await getCashAllocationBalance(branchAccess.branchId);
    return NextResponse.json(balance);
  } catch (error) {
    console.error('Failed to get cash balance:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}, { permission: PERMISSIONS.RECEPTION_CASH_VIEW, allowKiosk: true });
