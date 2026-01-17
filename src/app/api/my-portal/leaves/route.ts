import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-auth';
import { getEmployeeByEmail, getLeaveRequestsByEmployee, createLeaveRequest } from '@/lib/db';

// GET - Fetch leave requests for the current employee
export const GET = withAuth(async (request: NextRequest, { user }) => {
  try {
    const employee = await getEmployeeByEmail(user.email);

    if (!employee) {
      return NextResponse.json(
        { error: 'Employee profile not found' },
        { status: 404 }
      );
    }

    const leaves = await getLeaveRequestsByEmployee(employee.id);

    return NextResponse.json({ leaves });
  } catch (error) {
    console.error('Error fetching leaves:', error);
    return NextResponse.json(
      { error: 'Failed to fetch leave requests' },
      { status: 500 }
    );
  }
});

// POST - Create a new leave request
export const POST = withAuth(async (request: NextRequest, { user }) => {
  try {
    const employee = await getEmployeeByEmail(user.email);

    if (!employee) {
      return NextResponse.json(
        { error: 'Employee profile not found' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { leave_type, start_date, end_date, reason } = body;

    // Validate required fields
    if (!leave_type || !start_date || !end_date) {
      return NextResponse.json(
        { error: 'Leave type, start date, and end date are required' },
        { status: 400 }
      );
    }

    // Validate dates
    const startDate = new Date(start_date);
    const endDate = new Date(end_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (startDate < today) {
      return NextResponse.json(
        { error: 'Start date cannot be in the past' },
        { status: 400 }
      );
    }

    if (endDate < startDate) {
      return NextResponse.json(
        { error: 'End date must be after start date' },
        { status: 400 }
      );
    }

    // Create the leave request
    const result = await createLeaveRequest({
      employee_id: employee.id,
      leave_type,
      start_date,
      end_date,
      reason: reason || '',
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to create leave request' },
        { status: 400 }
      );
    }

    return NextResponse.json({ request: result.request }, { status: 201 });
  } catch (error) {
    console.error('Error creating leave request:', error);
    return NextResponse.json(
      { error: 'Failed to create leave request' },
      { status: 500 }
    );
  }
});
