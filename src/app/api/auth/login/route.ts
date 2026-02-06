import { NextRequest, NextResponse } from 'next/server';
import { createAccessToken, createRefreshToken } from '@/lib/auth';
import { authenticateEmployee } from '@/lib/db';
import { audit, getRequestMeta } from '@/lib/audit';
import type { UserRole } from '@/types';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { success: false, message: 'Email and password are required' },
        { status: 400 }
      );
    }

    // SEC-001: Database auth with bcrypt (no DEMO_USERS fallback)
    const result = await authenticateEmployee(email, password);

    if (!result) {
      const meta = getRequestMeta(request);
      audit({ action: 'auth.login_failed', details: { email }, ...meta });
      return NextResponse.json(
        { success: false, message: 'Invalid email or password' },
        { status: 401 }
      );
    }

    const { employee, mustReset } = result;

    const user = {
      id: employee.id,
      email: employee.email || email,
      name: employee.full_name,
      role: (employee.system_role || 'employee') as UserRole,
      position: employee.position,
      employeeId: employee.employee_id,
      department: employee.position,
      branchId: employee.branch_id || undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // SEC-018: Minimal JWT with 1-hour expiry
    const accessToken = await createAccessToken(user.id);

    // SEC-017: Create refresh token
    const refreshToken = await createRefreshToken(user.id);

    // Set cookies
    const cookieStore = await cookies();

    // Access token cookie (1 hour)
    cookieStore.set('c-space-auth', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60, // 1 hour
      path: '/',
    });

    // Refresh token cookie (7 days, restricted path)
    cookieStore.set('c-space-refresh', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/api/auth',
    });

    // SEC-008: Check if password reset is required
    if (mustReset) {
      return NextResponse.json({
        success: true,
        mustResetPassword: true,
        user,
      });
    }

    // Audit: successful login
    const meta = getRequestMeta(request);
    audit({ action: 'auth.login', user_id: user.id, resource_type: 'employee', resource_id: user.id, details: { role: user.role }, ...meta });

    // Token is delivered via httpOnly cookie only — never in response body
    return NextResponse.json({
      success: true,
      user,
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { success: false, message: 'An error occurred during login' },
      { status: 500 }
    );
  }
}
