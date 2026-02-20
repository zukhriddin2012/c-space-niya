import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-auth';
import { PERMISSIONS } from '@/lib/permissions';
import { getModuleDetail, type AdoptionPeriod } from '@/lib/db';

export const GET = withAuth(async (request: NextRequest, { params }) => {
  try {
    const moduleName = params?.module;
    if (!moduleName) {
      return NextResponse.json({ error: 'Module name required' }, { status: 400 });
    }

    const period = (request.nextUrl.searchParams.get('period') || '7d') as AdoptionPeriod;
    if (!['7d', '30d', '90d'].includes(period)) {
      return NextResponse.json({ error: 'Invalid period. Use 7d, 30d, or 90d' }, { status: 400 });
    }

    const data = await getModuleDetail(moduleName, period);
    if (!data) {
      return NextResponse.json({ error: 'Module not found or no data' }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in GET /api/adoption/modules/[module]:', error);
    return NextResponse.json({ error: 'Failed to fetch module detail' }, { status: 500 });
  }
}, { permission: PERMISSIONS.REPORTS_ANALYTICS });
