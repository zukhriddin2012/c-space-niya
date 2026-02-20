import { NextRequest, NextResponse } from 'next/server';
import { computeAndStoreSnapshot } from '@/lib/db';

// Shared secret for cron authentication
const CRON_SECRET = process.env.CRON_SECRET;

/**
 * GET /api/cron/adoption-snapshot
 *
 * Called daily (midnight recommended) to pre-compute and store
 * adoption scores for all periods (7d, 30d, 90d).
 *
 * Authentication: Bearer token or query param ?secret=<CRON_SECRET>
 * Can be called by:
 * - Supabase pg_cron via pg_net HTTP extension
 * - Vercel Cron Jobs
 * - External cron service (e.g., cron-job.org)
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Authenticate the cron request
    if (CRON_SECRET) {
      const authHeader = request.headers.get('authorization');
      const querySecret = request.nextUrl.searchParams.get('secret');
      const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

      if (bearerToken !== CRON_SECRET && querySecret !== CRON_SECRET) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    const result = await computeAndStoreSnapshot();

    if (!result.success) {
      return NextResponse.json(
        { error: 'Snapshot computation failed', details: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      periodsStored: result.periods,
    });
  } catch (error) {
    console.error('Cron adoption-snapshot error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
