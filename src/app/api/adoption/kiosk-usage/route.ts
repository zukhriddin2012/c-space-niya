import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-auth';
import { PERMISSIONS } from '@/lib/permissions';
import { getKioskUsageByBranch, type AdoptionPeriod } from '@/lib/db';

export const GET = withAuth(async (request: NextRequest) => {
  try {
    const period = (request.nextUrl.searchParams.get('period') || '7d') as AdoptionPeriod;
    if (!['7d', '30d', '90d'].includes(period)) {
      return NextResponse.json({ error: 'Invalid period. Use 7d, 30d, or 90d' }, { status: 400 });
    }

    const data = await getKioskUsageByBranch(period);
    if (!data) {
      return NextResponse.json({ error: 'Failed to compute kiosk usage' }, { status: 500 });
    }

    return NextResponse.json({ branches: data });
  } catch (error) {
    console.error('Error in GET /api/adoption/kiosk-usage:', error);
    return NextResponse.json({ error: 'Failed to fetch kiosk usage' }, { status: 500 });
  }
}, { permission: PERMISSIONS.REPORTS_ANALYTICS });
