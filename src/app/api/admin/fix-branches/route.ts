import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-auth';
import { PERMISSIONS } from '@/lib/permissions';
import { supabaseAdmin, isSupabaseAdminConfigured } from '@/lib/supabase';

// POST /api/admin/fix-branches - Fix duplicate branches
export const POST = withAuth(async () => {
  try {
    if (!isSupabaseAdminConfigured()) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    // Step 1: Find all branches with "Headquarters" in the name
    const { data: branches, error: branchError } = await supabaseAdmin!
      .from('branches')
      .select('id, name')
      .or('name.ilike.%headquarters%,name.ilike.%HQ%');

    if (branchError) {
      return NextResponse.json({ error: branchError.message }, { status: 400 });
    }

    if (!branches || branches.length <= 1) {
      return NextResponse.json({
        message: 'No duplicate headquarters branches found',
        branches
      });
    }

    // Determine which branch to keep (prefer 'hq' id)
    const keepBranch = branches.find(b => b.id === 'hq') || branches[0];
    const duplicateBranches = branches.filter(b => b.id !== keepBranch.id);
    const duplicateIds = duplicateBranches.map(b => b.id);

    // Step 2: Update legal_entities to point to the branch we're keeping
    const { error: leUpdateError } = await supabaseAdmin!
      .from('legal_entities')
      .update({ branch_id: keepBranch.id })
      .in('branch_id', duplicateIds);

    if (leUpdateError) {
      return NextResponse.json({
        error: `Failed to update legal_entities: ${leUpdateError.message}`
      }, { status: 400 });
    }

    // Step 3: Update employees to point to the branch we're keeping
    const { error: empUpdateError } = await supabaseAdmin!
      .from('employees')
      .update({ branch_id: keepBranch.id })
      .in('branch_id', duplicateIds);

    if (empUpdateError) {
      return NextResponse.json({
        error: `Failed to update employees: ${empUpdateError.message}`
      }, { status: 400 });
    }

    // Step 4: Delete duplicate branches
    const { error: deleteError } = await supabaseAdmin!
      .from('branches')
      .delete()
      .in('id', duplicateIds);

    if (deleteError) {
      return NextResponse.json({
        error: `Failed to delete duplicates: ${deleteError.message}`
      }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: `Fixed duplicate branches. Kept "${keepBranch.name}" (${keepBranch.id})`,
      kept: keepBranch,
      deleted: duplicateBranches
    });
  } catch (error) {
    console.error('Error fixing branches:', error);
    return NextResponse.json({ error: 'Failed to fix branches' }, { status: 500 });
  }
}, { permission: PERMISSIONS.ADMIN });

// GET - Show current branch status
export const GET = withAuth(async () => {
  try {
    if (!isSupabaseAdminConfigured()) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    // Get all branches with counts
    const { data: branches, error } = await supabaseAdmin!
      .from('branches')
      .select('id, name')
      .order('name');

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Get legal entity counts per branch
    const { data: leCounts } = await supabaseAdmin!
      .from('legal_entities')
      .select('branch_id');

    // Get employee counts per branch
    const { data: empCounts } = await supabaseAdmin!
      .from('employees')
      .select('branch_id')
      .eq('status', 'active');

    const branchStats = branches?.map(b => ({
      ...b,
      legal_entities_count: leCounts?.filter(le => le.branch_id === b.id).length || 0,
      employees_count: empCounts?.filter(e => e.branch_id === b.id).length || 0,
    }));

    // Find duplicates
    const hqBranches = branchStats?.filter(b =>
      b.name.toLowerCase().includes('headquarters') ||
      b.name.toLowerCase().includes('hq')
    );

    return NextResponse.json({
      branches: branchStats,
      potential_duplicates: hqBranches,
      has_duplicates: (hqBranches?.length || 0) > 1
    });
  } catch (error) {
    console.error('Error getting branch status:', error);
    return NextResponse.json({ error: 'Failed to get branch status' }, { status: 500 });
  }
}, { permission: PERMISSIONS.ADMIN });
