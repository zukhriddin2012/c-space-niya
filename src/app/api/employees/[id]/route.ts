import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-auth';
import { PERMISSIONS, hasPermission } from '@/lib/permissions';
import { getEmployeeById, updateEmployee, deleteEmployee } from '@/lib/db';

// GET /api/employees/[id] - Get a single employee
export const GET = withAuth(async (
  request: NextRequest,
  { params }
) => {
  try {
    const id = params?.id;
    if (!id) {
      return NextResponse.json({ error: 'Employee ID required' }, { status: 400 });
    }

    const employee = await getEmployeeById(id);

    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    return NextResponse.json({ employee });
  } catch (error) {
    console.error('Error fetching employee:', error);
    return NextResponse.json({ error: 'Failed to fetch employee' }, { status: 500 });
  }
}, { permission: PERMISSIONS.EMPLOYEES_VIEW_ALL });

// PUT /api/employees/[id] - Update an employee
export const PUT = withAuth(async (
  request: NextRequest,
  { params, user }
) => {
  try {
    const id = params?.id;
    if (!id) {
      return NextResponse.json({ error: 'Employee ID required' }, { status: 400 });
    }

    const body = await request.json();
    const {
      full_name, position, position_id, level, branch_id, department_id, manager_id, salary, phone, email,
      status, employment_type, system_role,
      hire_date, birth_date, gender,
      is_growth_team, remote_work_enabled
    } = body;

    // SEC: Prevent privilege escalation — system_role changes require USERS_ASSIGN_ROLES permission
    if (system_role !== undefined && !hasPermission(user.role, PERMISSIONS.USERS_ASSIGN_ROLES)) {
      return NextResponse.json(
        { error: 'You do not have permission to change user roles' },
        { status: 403 }
      );
    }

    const updates: {
      full_name?: string;
      position?: string;
      position_id?: string | null;
      level?: string;
      branch_id?: string | null;
      department_id?: string | null;
      manager_id?: string | null;
      salary?: number;
      phone?: string | null;
      email?: string | null;
      status?: string;
      employment_type?: string;
      system_role?: string;
      hire_date?: string;
      birth_date?: string | null;
      gender?: string | null;
      is_growth_team?: boolean;
      remote_work_enabled?: boolean;
    } = {};

    if (full_name !== undefined) updates.full_name = full_name;
    if (position !== undefined) updates.position = position;
    if (position_id !== undefined) updates.position_id = position_id || null;
    if (level !== undefined) updates.level = level;
    if (branch_id !== undefined) updates.branch_id = branch_id || null;
    if (department_id !== undefined) updates.department_id = department_id || null;
    if (manager_id !== undefined) updates.manager_id = manager_id || null;
    if (salary !== undefined) updates.salary = parseFloat(salary) || 0;
    if (phone !== undefined) updates.phone = phone || null;
    if (email !== undefined) updates.email = email || null;
    if (status !== undefined) updates.status = status;
    if (employment_type !== undefined) updates.employment_type = employment_type;
    if (system_role !== undefined) updates.system_role = system_role;
    if (hire_date !== undefined) updates.hire_date = hire_date;
    if (birth_date !== undefined) updates.birth_date = birth_date || null;
    if (gender !== undefined) updates.gender = gender || null;
    if (is_growth_team !== undefined) updates.is_growth_team = is_growth_team;
    if (remote_work_enabled !== undefined) updates.remote_work_enabled = remote_work_enabled;

    const result = await updateEmployee(id, updates);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ employee: result.employee });
  } catch (error) {
    console.error('Error updating employee:', error);
    return NextResponse.json({ error: 'Failed to update employee' }, { status: 500 });
  }
}, { permission: PERMISSIONS.EMPLOYEES_EDIT });

// DELETE /api/employees/[id] - Delete an employee
export const DELETE = withAuth(async (
  request: NextRequest,
  { params }
) => {
  try {
    const id = params?.id;
    if (!id) {
      return NextResponse.json({ error: 'Employee ID required' }, { status: 400 });
    }

    const result = await deleteEmployee(id);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting employee:', error);
    return NextResponse.json({ error: 'Failed to delete employee' }, { status: 500 });
  }
}, { permission: PERMISSIONS.EMPLOYEES_EDIT });
