import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-auth';
import { PERMISSIONS, hasPermission } from '@/lib/permissions';
import { getLeadStats } from '@/lib/db';
import type { User } from '@/types';

// GET /api/sales/leads/stats — Dashboard aggregates
export const GET = withAuth(
  async (request: NextRequest, { user }: { user: User }) => {
    try {
      const { searchParams } = new URL(request.url);
      let branchId = searchParams.get('branchId') ?? undefined;

      // Branch scoping: non-admins can only see their own branch stats
      if (!hasPermission(user.role, PERMISSIONS.SALES_VIEW_ALL)) {
        branchId = user.branchId;
      }

      const stats = await getLeadStats(branchId);
      return NextResponse.json({ stats });
    } catch (error) {
      console.error('Error in GET /api/sales/leads/stats:', error);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  },
  { permission: PERMISSIONS.SALES_VIEW }
);
