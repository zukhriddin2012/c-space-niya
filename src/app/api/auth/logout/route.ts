// SEC-017: Logout endpoint — revoke all tokens
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken, revokeAllUserTokens } from '@/lib/auth';
import { audit, getRequestMeta } from '@/lib/audit';

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('c-space-auth')?.value;

    // Try to revoke tokens if user is authenticated
    if (token) {
      const user = await verifyToken(token);
      if (user) {
        await revokeAllUserTokens(user.id);
        const meta = getRequestMeta(request);
        audit({ action: 'auth.logout', user_id: user.id, ...meta });
      }
    }

    // Clear all auth cookies
    cookieStore.delete('c-space-auth');
    cookieStore.delete('c-space-refresh');

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Logout error:', error);
    // Still clear cookies even on error
    const cookieStore = await cookies();
    cookieStore.delete('c-space-auth');
    cookieStore.delete('c-space-refresh');
    return NextResponse.json({ success: true });
  }
}
