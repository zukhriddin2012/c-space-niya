import { NextRequest, NextResponse } from 'next/server';
import { createToken, validateCredentials } from '@/lib/auth';
import { setSession } from '@/lib/auth-server';
import { authenticateEmployee } from '@/lib/db';
import type { User, UserRole } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { success: false, message: 'Email and password are required' },
        { status: 400 }
      );
    }

    let user: User | null = null;

    // Try database authentication first
    const employee = await authenticateEmployee(email, password);

    if (employee) {
      // Create user from database employee
      user = {
        id: employee.id,
        email: employee.email || email,
        name: employee.full_name,
        role: (employee.system_role || 'employee') as UserRole,
        employeeId: employee.employee_id,
        department: employee.position,
        branchId: employee.branch_id || undefined,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    } else {
      // Fallback to DEMO_USERS for development/testing
      user = validateCredentials(email, password);
    }

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Invalid email or password' },
        { status: 401 }
      );
    }

    const token = await createToken(user);
    await setSession(token);

    return NextResponse.json({
      success: true,
      user,
      accessToken: token,
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { success: false, message: 'An error occurred during login' },
      { status: 500 }
    );
  }
}
