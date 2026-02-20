import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-auth';
import { PERMISSIONS } from '@/lib/permissions';
import { getUserScores, type AdoptionPeriod } from '@/lib/db';

export const GET = withAuth(async (request: NextRequest) => {
  try {
    const params = request.nextUrl.searchParams;
    const period = (params.get('period') || '7d') as AdoptionPeriod;
    if (!['7d', '30d', '90d'].includes(period)) {
      return NextResponse.json({ error: 'Invalid period. Use 7d, 30d, or 90d' }, { status: 400 });
    }

    const limit = Math.min(Math.max(parseInt(params.get('limit') || '10', 10), 1), 100);
    const offset = Math.max(parseInt(params.get('offset') || '0', 10), 0);
    const sort = params.get('sort') || 'score';
    const order = params.get('order') || 'desc';

    const data = await getUserScores(period, { limit, offset, sort, order });
    if (!data) {
      return NextResponse.json({ error: 'Failed to compute user scores' }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in GET /api/adoption/users:', error);
    return NextResponse.json({ error: 'Failed to fetch user scores' }, { status: 500 });
  }
}, { permission: PERMISSIONS.REPORTS_ANALYTICS });
