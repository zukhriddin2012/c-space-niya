import { NextRequest, NextResponse } from 'next/server';
import { createToken, validateCredentials } from '@/lib/auth';
import { setSession } from '@/lib/auth-server';
import { getEmployeeByEmail } from '@/lib/db';
import type { UserRole } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { success: false, message: 'Email and password are required' },
        { status: 400 }
      );
    }

    const user = validateCredentials(email, password);

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Check if the employee has an updated role in the database
    // This ensures role changes made by GM take effect on next login
    try {
      const employee = await getEmployeeByEmail(email);
      if (employee) {
        // Employee record may have system_role field from database
        const dbRole = (employee as unknown as { system_role?: UserRole }).system_role;
        if (dbRole) {
          // Use the database role instead of the hardcoded one
          user.role = dbRole;
        }
      }
    } catch (dbError) {
      // If database check fails, continue with the default role
      console.warn('Could not fetch employee role from database:', dbError);
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
