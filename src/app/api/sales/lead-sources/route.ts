import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-auth';
import { PERMISSIONS } from '@/lib/permissions';
import { getLeadSources } from '@/lib/db';

// GET /api/sales/lead-sources — Reference data for source dropdowns
export const GET = withAuth(
  async () => {
    try {
      const sources = await getLeadSources();
      return NextResponse.json({ sources });
    } catch (error) {
      console.error('Error in GET /api/sales/lead-sources:', error);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  },
  { permission: PERMISSIONS.SALES_VIEW }
);
