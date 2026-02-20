import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-auth';
import { PERMISSIONS } from '@/lib/permissions';
import { getUserDetail, type AdoptionPeriod } from '@/lib/db';

export const GET = withAuth(async (request: NextRequest, { params }) => {
  try {
    const userId = params?.id;
    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

    const period = (request.nextUrl.searchParams.get('period') || '7d') as AdoptionPeriod;
    if (!['7d', '30d', '90d'].includes(period)) {
      return NextResponse.json({ error: 'Invalid period. Use 7d, 30d, or 90d' }, { status: 400 });
    }

    const data = await getUserDetail(userId, period);
    if (!data) {
      return NextResponse.json({ error: 'User not found or no data' }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in GET /api/adoption/users/[id]:', error);
    return NextResponse.json({ error: 'Failed to fetch user detail' }, { status: 500 });
  }
}, { permission: PERMISSIONS.REPORTS_ANALYTICS });
