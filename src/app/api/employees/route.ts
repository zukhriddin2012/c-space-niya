import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-auth';
import { PERMISSIONS } from '@/lib/permissions';
import { getEmployees, createEmployee } from '@/lib/db';

// GET /api/employees - Get all employees
export const GET = withAuth(async () => {
  try {
    const employees = await getEmployees();
    return NextResponse.json({ employees });
  } catch (error) {
    console.error('Error fetching employees:', error);
    return NextResponse.json({ error: 'Failed to fetch employees' }, { status: 500 });
  }
}, { permission: PERMISSIONS.EMPLOYEES_VIEW_ALL });

// POST /api/employees - Create a new employee
export const POST = withAuth(async (request: NextRequest) => {
  try {
    const body = await request.json();
    const { full_name, position, level, branch_id, salary, phone, email, status, employment_type, hire_date, system_role } = body;

    if (!full_name || !position) {
      return NextResponse.json({ error: 'Full name and position are required' }, { status: 400 });
    }

    const result = await createEmployee({
      full_name,
      position,
      level: level || 'junior',
      branch_id: branch_id || null,
      salary: salary ? parseFloat(salary) : 0,
      phone: phone || null,
      email: email || null,
      status: status || 'active',
      employment_type: employment_type || 'full-time',
      hire_date: hire_date || new Date().toISOString().split('T')[0],
      system_role: system_role || 'employee',
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ employee: result.employee }, { status: 201 });
  } catch (error) {
    console.error('Error creating employee:', error);
    return NextResponse.json({ error: 'Failed to create employee' }, { status: 500 });
  }
}, { permission: PERMISSIONS.EMPLOYEES_CREATE });
