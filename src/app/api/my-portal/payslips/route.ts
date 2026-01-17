import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-auth';
import { getEmployeeByEmail, getPayslipsByEmployee } from '@/lib/db';

export const GET = withAuth(async (request: NextRequest, { user }) => {
  try {
    const employee = await getEmployeeByEmail(user.email);

    if (!employee) {
      return NextResponse.json(
        { error: 'Employee profile not found' },
        { status: 404 }
      );
    }

    const payslips = await getPayslipsByEmployee(employee.id);

    return NextResponse.json({ payslips });
  } catch (error) {
    console.error('Error fetching payslips:', error);
    return NextResponse.json(
      { error: 'Failed to fetch payslips' },
      { status: 500 }
    );
  }
});
