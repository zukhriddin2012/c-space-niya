import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-auth';
import { PERMISSIONS } from '@/lib/permissions';
import { getSlaBreachStats } from '@/lib/db/maintenance-issues';
import { validateBranchAccess } from '@/lib/security';

/**
 * GET /api/reception/maintenance-issues/sla-stats
 *
 * Returns SLA breach statistics for maintenance issues.
 * Requires MAINTENANCE_VIEW_ALL permission for cross-branch stats,
 * otherwise returns branch-scoped data.
 */
export const GET = withAuth(async (request: NextRequest, { user }) => {
  try {
    // Check permissions
    const branchAccess = validateBranchAccess(
      user,
      request.nextUrl.searchParams.get('branchId'),
      PERMISSIONS.MAINTENANCE_VIEW_ALL
    );
    if (branchAccess.error) {
      return NextResponse.json({ error: branchAccess.error }, { status: branchAccess.status });
    }

    const result = await getSlaBreachStats();

    if (!result.success) {
      return NextResponse.json(
        { error: 'Failed to fetch SLA stats', details: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.data,
    });
  } catch (error) {
    console.error('Error in SLA stats endpoint:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});
