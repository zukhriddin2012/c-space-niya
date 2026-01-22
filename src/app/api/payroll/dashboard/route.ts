import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-auth';
import { PERMISSIONS } from '@/lib/permissions';
import { getPayrollByMonth, calculatePayrollStats, getPaymentRequestsSummary, getPaidAdvancesByEmployee } from '@/lib/db';

export const GET = withAuth(async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url);
    const currentDate = new Date();
    const year = parseInt(searchParams.get('year') || String(currentDate.getFullYear()));
    const month = parseInt(searchParams.get('month') || String(currentDate.getMonth() + 1));

    // Fetch all data in parallel
    const [payroll, paymentRequestsSummary, paidAdvances] = await Promise.all([
      getPayrollByMonth(year, month),
      getPaymentRequestsSummary(year, month),
      getPaidAdvancesByEmployee(year, month),
    ]);

    // Calculate stats from payroll data
    const stats = calculatePayrollStats(payroll);

    return NextResponse.json({
      payroll,
      stats,
      paymentRequestsSummary,
      paidAdvances,
      year,
      month,
    });
  } catch (error) {
    console.error('Error fetching payroll dashboard:', error);
    return NextResponse.json({ error: 'Failed to fetch payroll data' }, { status: 500 });
  }
}, { permission: PERMISSIONS.PAYROLL_VIEW });
