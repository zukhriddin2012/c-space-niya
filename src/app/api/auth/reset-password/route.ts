import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';
import { verifyToken, createAccessToken, createRefreshToken, revokeAllUserTokens } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { validatePassword } from '@/lib/password-validation';
import { audit, getRequestMeta } from '@/lib/audit';

const SALT_ROUNDS = 10;

export async function POST(request: NextRequest) {
  try {
    // Verify the user is authenticated
    const cookieStore = await cookies();
    const token = cookieStore.get('c-space-auth')?.value;

    if (!token) {
      return NextResponse.json({ success: false, message: 'Authentication required' }, { status: 401 });
    }

    const user = await verifyToken(token);
    if (!user) {
      return NextResponse.json({ success: false, message: 'Invalid session' }, { status: 401 });
    }

    const { newPassword } = await request.json();

    if (!newPassword) {
      return NextResponse.json({ success: false, message: 'New password is required' }, { status: 400 });
    }

    // Validate password strength
    const validation = validatePassword(newPassword);
    if (!validation.isValid) {
      return NextResponse.json({ success: false, message: 'Password does not meet requirements' }, { status: 400 });
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ success: false, message: 'Database not configured' }, { status: 500 });
    }

    // Hash the new password
    const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

    // Update the employee record
    const { error } = await supabaseAdmin
      .from('employees')
      .update({
        password_hash: passwordHash,
        must_reset_password: false,
        password_changed_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    if (error) {
      console.error('Password reset error:', error);
      return NextResponse.json({ success: false, message: 'Failed to update password' }, { status: 500 });
    }

    // Audit: password changed
    const meta = getRequestMeta(request);
    audit({ action: 'auth.password_change', user_id: user.id, severity: 'critical', ...meta });

    // Revoke all existing tokens
    await revokeAllUserTokens(user.id);

    // Issue new tokens
    const newAccessToken = await createAccessToken(user.id);
    const newRefreshToken = await createRefreshToken(user.id);

    // Set new cookies
    cookieStore.set('c-space-auth', newAccessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60,
      path: '/',
    });

    cookieStore.set('c-space-refresh', newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/api/auth',
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Password reset error:', error);
    return NextResponse.json({ success: false, message: 'An error occurred' }, { status: 500 });
  }
}
