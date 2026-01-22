import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-auth';
import { getWeeklyAttendanceSummary, getEmployees } from '@/lib/db';

export const GET = withAuth(async () => {
  try {
    const employees = await getEmployees();
    const activeEmployees = employees.filter(e => e.status === 'active');
    const weeklySummary = await getWeeklyAttendanceSummary(activeEmployees.length);

    return NextResponse.json(weeklySummary);
  } catch (error) {
    console.error('Error fetching weekly summary:', error);
    return NextResponse.json({ error: 'Failed to fetch weekly summary' }, { status: 500 });
  }
});
