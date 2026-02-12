import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-auth';
import { PERMISSIONS } from '@/lib/permissions';
import { getCashPositionSummary } from '@/lib/db/cash-management';
import { validateBranchAccess } from '@/lib/security';

// ============================================
// GET /api/reception/cash-management/summary
// Get full cash position summary for a branch
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

    const summary = await getCashPositionSummary(branchAccess.branchId);
    return NextResponse.json(summary);
  } catch (error) {
    console.error('Failed to get cash summary:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}, { permission: PERMISSIONS.RECEPTION_CASH_VIEW, allowKiosk: true });
