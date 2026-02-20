import { NextRequest, NextResponse } from 'next/server';
import { computeAndStoreSnapshot } from '@/lib/db';

// Shared secret for cron authentication — MUST be set in production
const CRON_SECRET = process.env.CRON_SECRET;

/**
 * GET /api/cron/adoption-snapshot
 *
 * Called daily (midnight recommended) to pre-compute and store
 * adoption scores for all periods (7d, 30d, 90d).
 *
 * Authentication: Bearer token via Authorization header (CRON_SECRET required)
 * Can be called by:
 * - Supabase pg_cron via pg_net HTTP extension
 * - Vercel Cron Jobs
 * - External cron service (e.g., cron-job.org)
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // SEC: Require CRON_SECRET — reject if not configured
    if (!CRON_SECRET) {
      console.error('CRON_SECRET environment variable is not set');
      return NextResponse.json({ error: 'Server misconfigured' }, { status: 403 });
    }

    // SEC: Accept only Bearer token (not query params — secrets in URLs leak to logs)
    const authHeader = request.headers.get('authorization');
    const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (bearerToken !== CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
