import { NextRequest, NextResponse } from 'next/server';
import { detectAndMarkSlaBreaches } from '@/lib/db/maintenance-issues';
import { notifyMaintenanceSlaBreached } from '@/lib/telegram-notifications';

// Shared secret for cron authentication
// In production, set CRON_SECRET env var and call with ?secret=<value>
const CRON_SECRET = process.env.CRON_SECRET;

/**
 * GET /api/cron/sla-check
 *
 * Called periodically (every 15 minutes recommended) to:
 * 1. Detect maintenance issues that have breached their SLA deadline
 * 2. Mark them as breached in the database
 * 3. Send Telegram notifications to branch admins
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

    // Run SLA breach detection
    const result = await detectAndMarkSlaBreaches();

    if (!result.success) {
      console.error('SLA check failed:', result.error);
      return NextResponse.json(
        { error: 'SLA check failed', details: result.error },
        { status: 500 }
      );
    }

    // Send notifications for newly breached issues
    let notificationsSent = 0;
    let notificationsFailed = 0;

    if (result.newlyBreached.length > 0) {
      // In production, you'd look up the branch admin's Telegram ID
      // For now, use the ADMIN_TELEGRAM_ID env var as a fallback
      const adminTelegramId = process.env.ADMIN_TELEGRAM_ID;

      if (adminTelegramId) {
        for (const issue of result.newlyBreached) {
          const sent = await notifyMaintenanceSlaBreached({
            telegramId: adminTelegramId,
            issueNumber: issue.issueNumber,
            category: issue.category,
            urgency: issue.urgency,
            locationDescription: issue.locationDescription,
            slaHours: issue.slaHours,
            hoursElapsed: issue.hoursElapsed,
          });

          if (sent) {
            notificationsSent++;
          } else {
            notificationsFailed++;
          }

          // Rate limit: 50ms between Telegram messages
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      }
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      breachesDetected: result.newlyBreached.length,
      notifications: {
        sent: notificationsSent,
        failed: notificationsFailed,
      },
      issues: result.newlyBreached.map(i => ({
        issueNumber: i.issueNumber,
        category: i.category,
        urgency: i.urgency,
        hoursElapsed: Math.round(i.hoursElapsed * 10) / 10,
        slaHours: i.slaHours,
      })),
    });
  } catch (error) {
    console.error('Cron SLA check error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
