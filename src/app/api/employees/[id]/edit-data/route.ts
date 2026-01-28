import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-auth';
import { PERMISSIONS, hasPermission } from '@/lib/permissions';
import { getEmployeeById, getBranches, getDepartments, getActivePositions } from '@/lib/db';
import type { User } from '@/types';

// GET /api/employees/[id]/edit-data - Get employee data for editing
export const GET = withAuth(async (request: NextRequest, context: { user: User; params?: Record<string, string> }) => {
  try {
    const { user, params } = context;
    const id = params?.id;

    if (!id) {
      return NextResponse.json({ error: 'Employee ID is required' }, { status: 400 });
    }

    // Fetch employee, branches, departments, and positions
    const [employee, branches, departments, positions] = await Promise.all([
      getEmployeeById(id),
      getBranches(),
      getDepartments(),
      getActivePositions(),
    ]);

    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    // Determine permissions for this user
    const canEditSalary = hasPermission(user.role, PERMISSIONS.EMPLOYEES_EDIT_SALARY);
    const canAssignRoles = hasPermission(user.role, PERMISSIONS.USERS_ASSIGN_ROLES);

    return NextResponse.json({
      employee,
      branches,
      departments,
      positions,
      canEditSalary,
      canAssignRoles,
    });
  } catch (error) {
    console.error('Error fetching employee edit data:', error);
    return NextResponse.json({ error: 'Failed to fetch employee data' }, { status: 500 });
  }
}, { permission: PERMISSIONS.EMPLOYEES_EDIT });
