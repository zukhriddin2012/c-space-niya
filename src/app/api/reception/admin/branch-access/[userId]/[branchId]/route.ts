import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-auth';
import { supabaseAdmin } from '@/lib/supabase';

// DELETE /api/reception/admin/branch-access/[userId]/[branchId]
// Revoke branch access from a user
export const DELETE = withAuth(async (request: NextRequest, { user, params }) => {
  try {
    const userId = params?.userId;
    const branchId = params?.branchId;

    if (!userId || !branchId) {
      return NextResponse.json({ error: 'userId and branchId are required' }, { status: 400 });
    }

    // Check permissions
    const isAdmin = ['ceo', 'general_manager', 'hr'].includes(user.role);
    const isBranchManager = user.role === 'branch_manager';

    if (!isAdmin && !isBranchManager) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Branch Managers can only revoke access to their branch
    if (isBranchManager && !isAdmin) {
      const { data: employee } = await supabaseAdmin!
        .from('employees')
        .select('branch_id')
        .eq('id', user.id)
        .single();

      if (employee?.branch_id !== branchId) {
        return NextResponse.json({ error: 'You can only revoke access to your own branch' }, { status: 403 });
      }
    }

    // Check if the access grant exists
    const { data: existing, error: checkError } = await supabaseAdmin!
      .from('reception_branch_access')
      .select('id')
      .eq('user_id', userId)
      .eq('branch_id', branchId)
      .single();

    if (checkError || !existing) {
      return NextResponse.json({ error: 'Access grant not found' }, { status: 404 });
    }

    // Delete the access grant
    const { error } = await supabaseAdmin!
      .from('reception_branch_access')
      .delete()
      .eq('user_id', userId)
      .eq('branch_id', branchId);

    if (error) {
      console.error('Error revoking branch access:', error);
      return NextResponse.json({ error: 'Failed to revoke access' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/reception/admin/branch-access:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}, { roles: ['general_manager'], allowKiosk: true });
