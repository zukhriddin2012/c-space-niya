import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-auth';
import { supabaseAdmin } from '@/lib/supabase';
import type { BranchOption } from '@/modules/reception/types';

// GET /api/reception/branches
// Returns the list of branches the current user can access in Reception Mode
export const GET = withAuth(async (request, { user }) => {
  try {
    // Roles that can see all branches
    const canSeeAllBranches = ['ceo', 'general_manager'].includes(user.role);
    const canSeeAllButNoTotal = ['hr'].includes(user.role);

    // Get user's assigned branch
    const { data: employee, error: empError } = await supabaseAdmin!
      .from('employees')
      .select('branch_id')
      .eq('id', user.id)
      .single();

    if (empError) {
      console.error('Error fetching employee:', empError);
      return NextResponse.json({ error: 'Failed to fetch user data' }, { status: 500 });
    }

    const assignedBranchId = employee?.branch_id;

    // Get all branches
    const { data: allBranches, error: branchError } = await supabaseAdmin!
      .from('branches')
      .select('id, name, code')
      .order('name');

    if (branchError) {
      console.error('Error fetching branches:', branchError);
      return NextResponse.json({ error: 'Failed to fetch branches' }, { status: 500 });
    }

    // Get additional branch access grants for this user
    const { data: accessGrants, error: accessError } = await supabaseAdmin!
      .from('reception_branch_access')
      .select('branch_id')
      .eq('user_id', user.id);

    if (accessError) {
      console.error('Error fetching branch access:', accessError);
      // Don't fail - just continue with assigned branch only
    }

    const grantedBranchIds = new Set((accessGrants || []).map(g => g.branch_id));

    // Build the list of accessible branches
    const branches: BranchOption[] = [];

    // Add "All Branches" option for executives
    if (canSeeAllBranches) {
      branches.push({
        id: 'all',
        name: 'All Branches',
        isAllBranches: true,
        isAssigned: false,
        isGranted: false,
      });
    }

    // For executives and HR, add all branches
    if (canSeeAllBranches || canSeeAllButNoTotal) {
      for (const branch of allBranches || []) {
        branches.push({
          id: branch.id,
          name: branch.name,
          code: branch.code,
          isAllBranches: false,
          isAssigned: branch.id === assignedBranchId,
          isGranted: grantedBranchIds.has(branch.id),
        });
      }
    } else {
      // For regular users, only show assigned + granted branches
      for (const branch of allBranches || []) {
        const isAssigned = branch.id === assignedBranchId;
        const isGranted = grantedBranchIds.has(branch.id);

        if (isAssigned || isGranted) {
          branches.push({
            id: branch.id,
            name: branch.name,
            code: branch.code,
            isAllBranches: false,
            isAssigned,
            isGranted,
          });
        }
      }
    }

    // Return metadata about user's access
    return NextResponse.json({
      branches,
      defaultBranchId: assignedBranchId,
      canSeeAllBranches,
      totalBranchCount: branches.filter(b => !b.isAllBranches).length,
    });
  } catch (error) {
    console.error('Error in GET /api/reception/branches:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});
