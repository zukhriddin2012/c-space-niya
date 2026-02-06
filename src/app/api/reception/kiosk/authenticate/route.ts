import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { createKioskToken, KIOSK_COOKIE_OPTIONS } from '@/lib/kiosk-auth';
import { supabaseAdmin, isSupabaseAdminConfigured } from '@/lib/db/connection';
import { rateLimit } from '@/lib/rate-limiter';

// POST /api/reception/kiosk/authenticate — Public endpoint, no user auth required
export async function POST(request: NextRequest) {
  try {
    if (!isSupabaseAdminConfigured()) {
      return NextResponse.json({ error: 'database_not_configured' }, { status: 500 });
    }

    // Rate limit: 5 attempts per 15 minutes per IP
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
               request.headers.get('x-real-ip') || 'unknown';
    const rl = rateLimit(`kiosk-auth:${ip}`, 5, 15 * 60 * 1000);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'too_many_attempts', retryAfter: rl.retryAfter },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { branchId, password } = body;

    if (!branchId || !password) {
      return NextResponse.json(
        { error: 'branch_id_and_password_required' },
        { status: 400 }
      );
    }

    // Fetch branch with reception password hash
    const { data: branch, error: branchError } = await supabaseAdmin!
      .from('branches')
      .select('id, name, reception_password_hash')
      .eq('id', branchId)
      .single();

    // Uniform error for branch not found / no password / wrong password
    // to prevent enumeration
    if (branchError || !branch || !branch.reception_password_hash) {
      return NextResponse.json({ error: 'invalid_credentials' }, { status: 401 });
    }

    // Verify password
    const isValid = await bcrypt.compare(password, branch.reception_password_hash);
    if (!isValid) {
      return NextResponse.json({ error: 'invalid_credentials' }, { status: 401 });
    }

    // Create kiosk session token
    const { token, expiresAt } = await createKioskToken(branchId);

    // Set cookie and return response
    const response = NextResponse.json({
      success: true,
      branchId,
      branchName: branch.name,
      expiresAt,
    });

    response.cookies.set('reception-kiosk', token, KIOSK_COOKIE_OPTIONS);

    return response;
  } catch (error) {
    console.error('Kiosk authentication error:', error);
    return NextResponse.json({ error: 'internal_server_error' }, { status: 500 });
  }
}
