// SEC-017: Token refresh endpoint
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import crypto from 'crypto';
import { createAccessToken, createRefreshToken, JWT_SECRET } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST() {
  try {
    const cookieStore = await cookies();
    const refreshToken = cookieStore.get('c-space-refresh')?.value;

    if (!refreshToken) {
      return NextResponse.json(
        { success: false, message: 'No refresh token' },
        { status: 401 }
      );
    }

    if (!supabaseAdmin) {
      return NextResponse.json(
        { success: false, message: 'Database not configured' },
        { status: 500 }
      );
    }

    // Hash the refresh token to look up in DB
    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');

    // Find the token in the database
    const { data: storedToken, error } = await supabaseAdmin
      .from('refresh_tokens')
      .select('id, user_id, expires_at, revoked_at')
      .eq('token_hash', tokenHash)
      .single();

    if (error || !storedToken) {
      return NextResponse.json(
        { success: false, message: 'Invalid refresh token' },
        { status: 401 }
      );
    }

    // Check if revoked
    if (storedToken.revoked_at) {
      return NextResponse.json(
        { success: false, message: 'Token has been revoked' },
        { status: 401 }
      );
    }

    // Check if expired
    if (new Date(storedToken.expires_at) < new Date()) {
      return NextResponse.json(
        { success: false, message: 'Refresh token expired' },
        { status: 401 }
      );
    }

    // Verify user still exists and is active
    const { data: employee } = await supabaseAdmin
      .from('employees')
      .select('id, status')
      .eq('id', storedToken.user_id)
      .single();

    if (!employee || employee.status === 'terminated') {
      // Revoke the token
      await supabaseAdmin
        .from('refresh_tokens')
        .update({ revoked_at: new Date().toISOString() })
        .eq('id', storedToken.id);

      return NextResponse.json(
        { success: false, message: 'Account not active' },
        { status: 401 }
      );
    }

    // Rotate: revoke old token, create new ones
    await supabaseAdmin
      .from('refresh_tokens')
      .update({ revoked_at: new Date().toISOString() })
      .eq('id', storedToken.id);

    const newAccessToken = await createAccessToken(storedToken.user_id);
    const newRefreshToken = await createRefreshToken(storedToken.user_id);

    // Set new cookies
    cookieStore.set('c-space-auth', newAccessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60, // 1 hour
      path: '/',
    });

    cookieStore.set('c-space-refresh', newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/api/auth',
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Token refresh error:', error);
    return NextResponse.json(
      { success: false, message: 'An error occurred' },
      { status: 500 }
    );
  }
}
