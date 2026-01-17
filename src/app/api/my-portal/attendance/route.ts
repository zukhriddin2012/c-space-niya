import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-auth';
import { getEmployeeByEmail, getAttendanceByEmployeeAndMonth, getEmployeeAttendanceSummary } from '@/lib/db';

export const GET = withAuth(async (request: NextRequest, { user }) => {
  try {
    // Get employee linked to this user
    const employee = await getEmployeeByEmail(user.email);

    if (!employee) {
      return NextResponse.json(
        { error: 'Employee profile not found' },
        { status: 404 }
      );
    }

    // Get query params
    const { searchParams } = new URL(request.url);
    const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()));
    const month = parseInt(searchParams.get('month') || String(new Date().getMonth() + 1));

    // Fetch attendance for the month
    const [attendance, summary] = await Promise.all([
      getAttendanceByEmployeeAndMonth(employee.id, year, month),
      getEmployeeAttendanceSummary(employee.id, year, month),
    ]);

    return NextResponse.json({
      attendance,
      summary,
    });
  } catch (error) {
    console.error('Error fetching attendance:', error);
    return NextResponse.json(
      { error: 'Failed to fetch attendance' },
      { status: 500 }
    );
  }
});
