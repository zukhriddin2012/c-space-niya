import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth-server';
import { getBranches, getEmployees } from '@/lib/db';
import { DEMO_USERS } from '@/lib/auth';
import type { UserRole } from '@/types';

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
export async function GET(request: NextRequest) {
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
      // Use database system_role if available, otherwise fall back to DEMO_USERS or 'employee'
      let role: UserRole = (emp as any).system_role || 'employee';

      // Fall back to DEMO_USERS if no database role set
      if (!(emp as any).system_role) {
        const demoUser = DEMO_USERS.find(u => u.email.toLowerCase() === emp.email?.toLowerCase());
        if (demoUser) {
          role = demoUser.role;
        }
      }

      return {
        id: emp.id,
        email: emp.email || '',
        name: emp.full_name,
        role,
        branchId: emp.branch_id || undefined,
        branchName: emp.branch_id ? branchMap.get(emp.branch_id) : undefined,
        position: emp.position,
        department: (emp as any).department,
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
