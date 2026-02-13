import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-auth';
import { supabaseAdmin } from '@/lib/supabase';
import type { ReceptionBranchAccess } from '@/modules/reception/types';

// GET /api/reception/admin/branch-access
// List users with access to a specific branch (for Branch Managers)
// Or list all branch access (for HR/GM/CEO)
export const GET = withAuth(async (request, { user }) => {
  try {
    const { searchParams } = new URL(request.url);
    const branchId = searchParams.get('branchId');

    // Check permissions
    const isAdmin = ['ceo', 'general_manager', 'hr'].includes(user.role);
    const isBranchManager = user.role === 'branch_manager';

    if (!isAdmin && !isBranchManager) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Branch Managers can only see their branch
    let targetBranchId = branchId;
    if (isBranchManager && !isAdmin) {
      // Get the BM's branch
      const { data: employee } = await supabaseAdmin!
        .from('employees')
        .select('branch_id')
        .eq('id', user.id)
        .single();

      targetBranchId = employee?.branch_id;

      // If they requested a different branch, deny
      if (branchId && branchId !== targetBranchId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
      }
    }

    // Build query
    let query = supabaseAdmin!
      .from('reception_branch_access')
      .select(`
        id,
        user_id,
        branch_id,
        granted_by,
        granted_at,
        notes,
        user:employees!reception_branch_access_user_id_fkey(id, name),
        branch:branches!reception_branch_access_branch_id_fkey(id, name),
        grantor:employees!reception_branch_access_granted_by_fkey(id, name)
      `)
      .order('granted_at', { ascending: false });

    if (targetBranchId) {
      query = query.eq('branch_id', targetBranchId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching branch access:', error);
      return NextResponse.json({ error: 'Failed to fetch branch access' }, { status: 500 });
    }

    // Transform the data - Supabase returns arrays for joined relations
    type JoinedUser = { id: string; name: string };
    type JoinedBranch = { id: string; name: string };

    const accessList: ReceptionBranchAccess[] = (data || []).map((row: Record<string, unknown>) => {
      // Handle both array and object results from Supabase joins
      const userJoin = row.user as JoinedUser | JoinedUser[] | null;
      const branchJoin = row.branch as JoinedBranch | JoinedBranch[] | null;
      const grantorJoin = row.grantor as JoinedUser | JoinedUser[] | null;

      const user = Array.isArray(userJoin) ? userJoin[0] : userJoin;
      const branch = Array.isArray(branchJoin) ? branchJoin[0] : branchJoin;
      const grantor = Array.isArray(grantorJoin) ? grantorJoin[0] : grantorJoin;

      return {
        id: row.id as string,
        userId: row.user_id as string,
        branchId: row.branch_id as string,
        grantedBy: row.granted_by as string,
        grantedAt: row.granted_at as string,
        notes: (row.notes as string | null) ?? undefined,
        userName: user?.name,
        branchName: branch?.name,
        grantedByName: grantor?.name,
      };
    });

    // Determine if user can manage branch access
    // Admins can always manage, BMs can only manage their own branch
    let canManage = isAdmin;
    if (isBranchManager && targetBranchId) {
      const { data: employee } = await supabaseAdmin!
        .from('employees')
        .select('branch_id')
        .eq('id', user.id)
        .single();
      canManage = employee?.branch_id === targetBranchId;
    }

    return NextResponse.json({ users: accessList, canManage });
  } catch (error) {
    console.error('Error in GET /api/reception/admin/branch-access:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}, { roles: ['general_manager'], allowKiosk: true });

// POST /api/reception/admin/branch-access
// Grant branch access to a user (CSN-028: GM only)
export const POST = withAuth(async (request, { user }) => {
  try {
    const body = await request.json();
    const { userId, branchId, notes } = body;

    if (!userId || !branchId) {
      return NextResponse.json({ error: 'userId and branchId are required' }, { status: 400 });
    }

    // Check permissions
    const isAdmin = ['ceo', 'general_manager', 'hr'].includes(user.role);
    const isBranchManager = user.role === 'branch_manager';

    if (!isAdmin && !isBranchManager) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Branch Managers can only grant access to their branch
    if (isBranchManager && !isAdmin) {
      const { data: employee } = await supabaseAdmin!
        .from('employees')
        .select('branch_id')
        .eq('id', user.id)
        .single();

      if (employee?.branch_id !== branchId) {
        return NextResponse.json({ error: 'You can only grant access to your own branch' }, { status: 403 });
      }
    }

    // Check if user already has access
    const { data: existing } = await supabaseAdmin!
      .from('reception_branch_access')
      .select('id')
      .eq('user_id', userId)
      .eq('branch_id', branchId)
      .single();

    if (existing) {
      return NextResponse.json({ error: 'User already has access to this branch' }, { status: 400 });
    }

    // Check if this is the user's assigned branch (redundant grant)
    const { data: targetUser } = await supabaseAdmin!
      .from('employees')
      .select('branch_id')
      .eq('id', userId)
      .single();

    if (targetUser?.branch_id === branchId) {
      return NextResponse.json({ error: 'User is already assigned to this branch' }, { status: 400 });
    }

    // Grant access
    const { data, error } = await supabaseAdmin!
      .from('reception_branch_access')
      .insert({
        user_id: userId,
        branch_id: branchId,
        granted_by: user.id,
        notes: notes || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Error granting branch access:', error);
      return NextResponse.json({ error: 'Failed to grant access' }, { status: 500 });
    }

    return NextResponse.json({
      id: data.id,
      userId: data.user_id,
      branchId: data.branch_id,
      grantedBy: data.granted_by,
      grantedAt: data.granted_at,
      notes: data.notes,
    });
  } catch (error) {
    console.error('Error in POST /api/reception/admin/branch-access:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}, { roles: ['general_manager'], allowKiosk: true });
