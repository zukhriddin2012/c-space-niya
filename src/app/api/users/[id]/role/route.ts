import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth-server';
import { supabaseAdmin, isSupabaseAdminConfigured } from '@/lib/supabase';
import type { UserRole } from '@/types';

const VALID_ROLES: UserRole[] = ['general_manager', 'ceo', 'hr', 'branch_manager', 'recruiter', 'employee', 'accountant', 'chief_accountant', 'legal_manager'];

// PUT /api/users/[id]/role - Update a user's role
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only general_manager can change roles
    if (user.role !== 'general_manager') {
      return NextResponse.json({ error: 'Only General Manager can assign roles' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { role, branchId } = body as { role: UserRole; branchId?: string };

    // Validate role
    if (!role || !VALID_ROLES.includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    // Branch manager must have a branch assigned
    if (role === 'branch_manager' && !branchId) {
      return NextResponse.json({ error: 'Branch manager must be assigned to a branch' }, { status: 400 });
    }

    if (!isSupabaseAdminConfigured()) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    // Update the employee's system_role in the database
    const updateData: { system_role: UserRole; branch_id?: string } = { system_role: role };

    // If branch_manager, also update their branch assignment
    if (role === 'branch_manager' && branchId) {
      updateData.branch_id = branchId;
    }

    const { data, error } = await supabaseAdmin!
      .from('employees')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating user role:', error);
      return NextResponse.json({ error: 'Failed to update role' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `Role updated to ${role}`,
      employee: data
    });
  } catch (error) {
    console.error('Error updating user role:', error);
    return NextResponse.json({ error: 'Failed to update role' }, { status: 500 });
  }
}
