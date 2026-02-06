import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth-server';
import { getBranches, getEmployees } from '@/lib/db';
import type { UserRole } from '@/types';

// Extended employee type with optional system fields
interface EmployeeWithSystemFields {
  id: string;
  employee_id: string;
  full_name: string;
  position: string;
  branch_id: string | null;
  email: string | null;
  system_role?: UserRole;
  department?: string;
}

export interface UserWithRole {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  branchId?: string;
  branchName?: string;
  position?: string;
  department?: string;
  employeeId?: string;
}

// GET /api/users - Get all users with their roles
export async function GET() {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only managers can view user roles
    if (!['general_manager', 'ceo', 'hr'].includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get employees and branches from database
    const [employees, branches] = await Promise.all([
      getEmployees(),
      getBranches()
    ]);

    const branchMap = new Map(branches.map(b => [b.id, b.name]));

    // Map employees to users with roles
    const users: UserWithRole[] = employees.map(emp => {
      const empWithFields = emp as EmployeeWithSystemFields;

      // SEC-002: Use database system_role only (DEMO_USERS removed)
      const role: UserRole = empWithFields.system_role || 'employee';

      return {
        id: emp.id,
        email: emp.email || '',
        name: emp.full_name,
        role,
        branchId: emp.branch_id || undefined,
        branchName: emp.branch_id ? branchMap.get(emp.branch_id) : undefined,
        position: emp.position,
        department: empWithFields.department,
        employeeId: emp.employee_id,
      };
    });

    // Sort by name
    users.sort((a, b) => a.name.localeCompare(b.name));

    return NextResponse.json({ users, branches });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}
