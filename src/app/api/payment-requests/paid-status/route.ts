import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-auth';
import { PERMISSIONS } from '@/lib/permissions';
import { getEmployeePaidStatus, getUnnotifiedPaidCount } from '@/lib/db';

// GET /api/payment-requests/paid-status - Get paid status for all employees in a period
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

    if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
      return NextResponse.json({ error: 'Invalid year or month' }, { status: 400 });
    }

    // Get paid status for all employees
    const paidEmployees = await getEmployeePaidStatus(year, month);

    // Also get un-notified count for dashboard
    const unnotifiedCount = await getUnnotifiedPaidCount(year, month);

    return NextResponse.json({
      success: true,
      period: { year, month },
      paidEmployees,
      unnotifiedCount,
    });
  } catch (error) {
    console.error('Error fetching paid status:', error);
    return NextResponse.json({ error: 'Failed to fetch paid status' }, { status: 500 });
  }
}, { permission: PERMISSIONS.PAYROLL_VIEW_ALL });
