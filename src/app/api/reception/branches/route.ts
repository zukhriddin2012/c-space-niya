import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-auth';
import { supabaseAdmin } from '@/lib/supabase';
import type { BranchOption } from '@/modules/reception/types';

// GET /api/reception/branches
// Returns the list of branches the current user can access in Reception Mode
export const GET = withAuth(async (request, { user }) => {
  try {
    // Check if Supabase is configured
    if (!supabaseAdmin) {
      console.error('[Branches API] Supabase admin client not configured');
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    console.log('[Branches API] User:', { id: user.id, role: user.role, email: user.email });

    // Roles that can see all branches
    const isKioskUser = user.id?.startsWith('kiosk:') || user.role === 'reception_kiosk';
    const canSeeAllBranches = !isKioskUser && ['ceo', 'general_manager'].includes(user.role);
    const canSeeAllButNoTotal = !isKioskUser && ['hr'].includes(user.role);
    console.log('[Branches API] Permissions:', { canSeeAllBranches, canSeeAllButNoTotal, isKioskUser });

    // Get user's assigned branch - try multiple lookup strategies
    let employee: { id: string; branch_id: string | null } | null = null;

    // Kiosk users have their branchId embedded — skip employee lookup entirely
    if (isKioskUser) {
      console.log('[Branches API] Kiosk user — using branchId from session:', user.branchId);
      // We'll use assignedBranchId = user.branchId below
    }

    // Try by auth_user_id first (most reliable)
    if (!isKioskUser && user.id) {
      const { data: empByAuthId } = await supabaseAdmin
        .from('employees')
        .select('id, branch_id')
        .eq('auth_user_id', user.id)
        .maybeSingle();

      if (empByAuthId) {
        employee = empByAuthId;
        console.log('[Branches API] Found employee by auth_user_id:', employee.id);
      }
    }

    // Try by UUID ID (if it looks like a UUID)
    if (!employee && user.id && user.id.includes('-')) {
      const { data: empById } = await supabaseAdmin
        .from('employees')
        .select('id, branch_id')
        .eq('id', user.id)
        .maybeSingle();

      if (empById) {
        employee = empById;
        console.log('[Branches API] Found employee by UUID:', employee.id);
      }
    }

    // Try by email
    if (!employee && user.email) {
      const { data: empByEmail } = await supabaseAdmin
        .from('employees')
        .select('id, branch_id')
        .eq('email', user.email)
        .maybeSingle();

      if (empByEmail) {
        employee = empByEmail;
        console.log('[Branches API] Found employee by email:', employee.id);

        // Auto-link auth_user_id for future lookups
        if (user.id) {
          await supabaseAdmin
            .from('employees')
            .update({ auth_user_id: user.id })
            .eq('id', empByEmail.id);
          console.log('[Branches API] Linked auth_user_id:', user.id);
        }
      }
    }

    // Try by employee_id (e.g., 'EMP018' from '18')
    if (!employee && user.id && !user.id.includes('-')) {
      const empIdFormatted = `EMP${user.id.padStart(3, '0')}`;
      const { data: empByEmpId } = await supabaseAdmin
        .from('employees')
        .select('id, branch_id')
        .eq('employee_id', empIdFormatted)
        .maybeSingle();

      if (empByEmpId) {
        employee = empByEmpId;
        console.log('[Branches API] Found employee by employee_id:', empIdFormatted);
      }
    }

    // Try by name as last resort
    if (!employee && user.name) {
      const { data: empByName } = await supabaseAdmin
        .from('employees')
        .select('id, branch_id')
        .eq('full_name', user.name)
        .maybeSingle();

      if (empByName) {
        employee = empByName;
        console.log('[Branches API] Found employee by name:', user.name);
      }
    }

    if (!employee) {
      console.log('[Branches API] No employee found for:', { id: user.id, email: user.email, name: user.name });
    }

    const assignedBranchId = employee?.branch_id || user.branchId || null;
    const employeeId = employee?.id || (isKioskUser ? null : user.id);
    console.log('[Branches API] Assigned branch:', assignedBranchId);

    // Get all branches
    const { data: allBranches, error: branchError } = await supabaseAdmin
      .from('branches')
      .select('id, name')
      .order('name');

    if (branchError) {
      console.error('Error fetching branches:', branchError);
      return NextResponse.json({ error: 'Failed to fetch branches' }, { status: 500 });
    }

    // Get additional branch access grants for this user
    // Skip for kiosk users — their IDs (e.g. 'kiosk:labzak') are not valid UUIDs
    // and the reception_branch_access.user_id column is UUID type
    let grantedBranchIds = new Set<string>();

    const isValidUUID = employeeId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(employeeId);

    if (isValidUUID) {
      const { data: accessGrants, error: accessError } = await supabaseAdmin
        .from('reception_branch_access')
        .select('branch_id')
        .eq('user_id', employeeId);

      if (accessError) {
        console.error('Error fetching branch access:', accessError);
        // Don't fail - just continue with assigned branch only
      }

      grantedBranchIds = new Set((accessGrants || []).map(g => g.branch_id));
    } else {
      console.log('[Branches API] Skipping reception_branch_access query — employeeId is not a UUID:', employeeId);
    }

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
}, { allowKiosk: true });
