import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyKioskToken, KIOSK_COOKIE_NAME } from '@/lib/kiosk-auth';
import { supabaseAdmin, isSupabaseAdminConfigured } from '@/lib/db/connection';

// GET /api/reception/kiosk/session — Check kiosk session validity
export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(KIOSK_COOKIE_NAME)?.value;

    if (!token) {
      return NextResponse.json({ valid: false }, { status: 200 });
    }

    const payload = await verifyKioskToken(token);
    if (!payload) {
      return NextResponse.json({ valid: false }, { status: 200 });
    }

    // Optionally fetch branch name
    let branchName = '';
    if (isSupabaseAdminConfigured()) {
      const { data: branch } = await supabaseAdmin!
        .from('branches')
        .select('name')
        .eq('id', payload.branchId)
        .single();
      branchName = branch?.name || '';
    }

    // Calculate expiry from JWT (365 days from authenticatedAt)
    const expiresAt = new Date((payload.authenticatedAt + 365 * 24 * 60 * 60) * 1000);

    return NextResponse.json({
      valid: true,
      branchId: payload.branchId,
      branchName,
      authenticatedAt: new Date(payload.authenticatedAt * 1000).toISOString(),
      expiresAt: expiresAt.toISOString(),
    });
  } catch (error) {
    console.error('Kiosk session check error:', error);
    return NextResponse.json({ valid: false }, { status: 200 });
  }
}
