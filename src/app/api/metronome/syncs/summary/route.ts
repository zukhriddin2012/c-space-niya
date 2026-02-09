import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-auth';
import { PERMISSIONS } from '@/lib/permissions';
import { getMetronomeSummary } from '@/lib/db';

// GET /api/metronome/syncs/summary - Dashboard aggregates
export const GET = withAuth(async () => {
  try {
    const summary = await getMetronomeSummary();
    return NextResponse.json({ data: summary });
  } catch (error) {
    console.error('Error in GET /api/metronome/syncs/summary:', error);
    return NextResponse.json({ error: 'Failed to fetch summary' }, { status: 500 });
  }
}, { permission: PERMISSIONS.METRONOME_VIEW });
