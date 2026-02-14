import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-auth';
import { getBranchBriefing } from '@/lib/db/branch-briefing';

// GET /api/reception/branch-briefing?branchId=X&homeBranchId=Y
export const GET = withAuth(async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url);
    const branchId = searchParams.get('branchId');
    const homeBranchId = searchParams.get('homeBranchId') || undefined;

    if (!branchId) {
      return NextResponse.json({ error: 'branchId is required' }, { status: 400 });
    }

    const result = await getBranchBriefing(branchId, homeBranchId);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ briefing: result.data });
  } catch (error) {
    console.error('Error in GET /api/reception/branch-briefing:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}, { allowKiosk: true });
