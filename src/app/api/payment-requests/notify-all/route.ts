import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-auth';
import { PERMISSIONS } from '@/lib/permissions';
import {
  getUnnotifiedPaidRequests,
  getUnnotifiedPaidCount,
  getPaymentRequestItemsWithTelegram,
  markNotificationSent,
  logPaymentAudit,
} from '@/lib/db';
import { notifyPaymentPaid } from '@/lib/telegram-notifications';

// GET /api/payment-requests/notify-all - Get counts of un-notified paid requests
export const GET = withAuth(async (request: NextRequest) => {
  try {
    const searchParams = request.nextUrl.searchParams;
    const yearStr = searchParams.get('year');
    const monthStr = searchParams.get('month');

    if (!yearStr || !monthStr) {
      return NextResponse.json({ error: 'Year and month are required' }, { status: 400 });
    }

    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10);

    if (isNaN(year) || isNaN(month)) {
      return NextResponse.json({ error: 'Year and month must be valid numbers' }, { status: 400 });
    }

    if (month < 1 || month > 12) {
      return NextResponse.json({ error: 'Month must be between 1 and 12' }, { status: 400 });
    }

    const counts = await getUnnotifiedPaidCount(year, month);

    return NextResponse.json(counts);
  } catch (error) {
    console.error('Error getting notification counts:', error);
    return NextResponse.json({ error: 'Failed to get notification counts' }, { status: 500 });
  }
}, { permission: PERMISSIONS.PAYROLL_VIEW_ALL });

// POST /api/payment-requests/notify-all - Bulk send notifications for all un-notified paid requests
export const POST = withAuth(async (request: NextRequest, { user }) => {
  try {
    const body = await request.json();
    const { year, month } = body;

    // Validate year and month are provided
    if (year === undefined || month === undefined) {
      return NextResponse.json({ error: 'Year and month are required' }, { status: 400 });
    }

    // Validate year and month are numbers
    if (typeof year !== 'number' || typeof month !== 'number') {
      return NextResponse.json({ error: 'Year and month must be numbers' }, { status: 400 });
    }

    // Validate month range
    if (month < 1 || month > 12) {
      return NextResponse.json({ error: 'Month must be between 1 and 12' }, { status: 400 });
    }

    // Validate year is reasonable (not too far in past or future)
    const currentYear = new Date().getFullYear();
    if (year < 2020 || year > currentYear + 1) {
      return NextResponse.json({ error: 'Invalid year' }, { status: 400 });
    }

    // 1. Get all paid, un-notified requests for period
    const requests = await getUnnotifiedPaidRequests(year, month);

    if (requests.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No un-notified paid requests found',
        summary: {
          requestsProcessed: 0,
          advanceRequests: 0,
          wageRequests: 0,
          employeesNotified: 0,
          skipped: 0,
        },
      });
    }

    // 2. Process each request
    let totalNotified = 0;
    let totalSkipped = 0;
    let advanceCount = 0;
    let wageCount = 0;

    for (const req of requests) {
      const { request: reqData, items } = await getPaymentRequestItemsWithTelegram(req.id);

      if (!reqData) continue;

      let notified = 0;
      let skipped = 0;

      // Send notifications for this request
      for (const item of items) {
        if (!item.telegram_id) {
          skipped++;
          continue;
        }

        const success = await notifyPaymentPaid({
          employeeName: item.employee_name,
          telegramId: item.telegram_id,
          amount: item.amount,
          type: reqData.request_type,
          month: reqData.month,
          year: reqData.year,
          paymentReference: reqData.payment_reference || undefined,
        });

        if (success) notified++;
        else skipped++;
      }

      // Update notification timestamp
      await markNotificationSent(req.id, user.id);

      // Log to audit
      await logPaymentAudit({
        payment_request_id: req.id,
        actor_id: user.id,
        action: 'notified',
        details: {
          notified,
          skipped,
          total: items.length,
          bulk: true,
        },
      });

      totalNotified += notified;
      totalSkipped += skipped;

      if (req.request_type === 'advance') advanceCount++;
      else wageCount++;
    }

    return NextResponse.json({
      success: true,
      summary: {
        requestsProcessed: requests.length,
        advanceRequests: advanceCount,
        wageRequests: wageCount,
        employeesNotified: totalNotified,
        skipped: totalSkipped,
      },
      message: `Notified ${totalNotified} employees across ${requests.length} requests`,
    });
  } catch (error) {
    console.error('Error sending bulk notifications:', error);
    return NextResponse.json({ error: 'Failed to send bulk notifications' }, { status: 500 });
  }
}, { permission: PERMISSIONS.PAYROLL_PROCESS });
