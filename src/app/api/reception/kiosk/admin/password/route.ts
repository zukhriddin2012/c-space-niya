import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { withAuth } from '@/lib/api-auth';
import { supabaseAdmin, isSupabaseAdminConfigured } from '@/lib/db/connection';
import type { User } from '@/types';

// POST /api/reception/kiosk/admin/password — Set reception kiosk password for a branch
async function handlePost(
  request: NextRequest,
  context: { user: User }
) {
  try {
    if (!isSupabaseAdminConfigured()) {
      return NextResponse.json({ error: 'database_not_configured' }, { status: 500 });
    }

    const { user } = context;
    const body = await request.json();
    const { branchId, password } = body;

    if (!branchId || !password) {
      return NextResponse.json({ error: 'branch_id_and_password_required' }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ error: 'password_too_short' }, { status: 400 });
    }

    // Permission check: GM can set for any branch, BM only for their own
    const isGM = user.role === 'general_manager' || user.role === 'ceo';
    const isBM = user.role === 'branch_manager';

    if (!isGM && !isBM) {
      return NextResponse.json({ error: 'insufficient_permissions' }, { status: 403 });
    }

    if (isBM && user.branchId !== branchId) {
      return NextResponse.json(
        { error: 'can_only_manage_own_branch' },
        { status: 403 }
      );
    }

    // Hash the password
    const passwordHash = await bcrypt.hash(password, 10);

    // Update the branch
    const { error: updateError } = await supabaseAdmin!
      .from('branches')
      .update({
        reception_password_hash: passwordHash,
        reception_password_set_at: new Date().toISOString(),
        reception_password_set_by: user.id,
      })
      .eq('id', branchId);

    if (updateError) {
      console.error('Error setting kiosk password:', updateError);
      return NextResponse.json({ error: 'failed_to_set_password' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Kiosk password management error:', error);
    return NextResponse.json({ error: 'internal_server_error' }, { status: 500 });
  }
}

// DELETE /api/reception/kiosk/admin/password — Remove reception kiosk password (disable kiosk)
async function handleDelete(
  request: NextRequest,
  context: { user: User }
) {
  try {
    if (!isSupabaseAdminConfigured()) {
      return NextResponse.json({ error: 'database_not_configured' }, { status: 500 });
    }

    const { user } = context;
    const { searchParams } = new URL(request.url);
    const branchId = searchParams.get('branchId');

    if (!branchId) {
      return NextResponse.json({ error: 'branch_id_required' }, { status: 400 });
    }

    // Permission check
    const isGM = user.role === 'general_manager' || user.role === 'ceo';
    const isBM = user.role === 'branch_manager';

    if (!isGM && !isBM) {
      return NextResponse.json({ error: 'insufficient_permissions' }, { status: 403 });
    }

    if (isBM && user.branchId !== branchId) {
      return NextResponse.json({ error: 'can_only_manage_own_branch' }, { status: 403 });
    }

    const { error: updateError } = await supabaseAdmin!
      .from('branches')
      .update({
        reception_password_hash: null,
        reception_password_set_at: null,
        reception_password_set_by: null,
      })
      .eq('id', branchId);

    if (updateError) {
      console.error('Error removing kiosk password:', updateError);
      return NextResponse.json({ error: 'failed_to_remove_password' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Kiosk password removal error:', error);
    return NextResponse.json({ error: 'internal_server_error' }, { status: 500 });
  }
}

export const POST = withAuth(handlePost, { roles: ['general_manager', 'ceo', 'branch_manager'] });
export const DELETE = withAuth(handleDelete, { roles: ['general_manager', 'ceo', 'branch_manager'] });
