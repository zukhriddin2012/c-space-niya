import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-auth';
import { PERMISSIONS } from '@/lib/permissions';
import { getEmployeePendingTermination } from '@/lib/db';
import type { User } from '@/types';

// GET /api/employees/[id]/termination-status - Get pending termination request for an employee
export const GET = withAuth(async (request: NextRequest, context: { user: User; params?: Record<string, string> }) => {
  try {
    const { params } = context;
    const employeeId = params?.id;

    if (!employeeId) {
      return NextResponse.json({ error: 'Employee ID is required' }, { status: 400 });
    }

    const pendingTermination = await getEmployeePendingTermination(employeeId);

    return NextResponse.json({ pendingTermination });
  } catch (error) {
    console.error('Error fetching termination status:', error);
    return NextResponse.json({ error: 'Failed to fetch termination status' }, { status: 500 });
  }
}, { permission: PERMISSIONS.EMPLOYEES_EDIT });
