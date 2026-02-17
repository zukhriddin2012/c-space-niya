import { supabaseAdmin, isSupabaseAdminConfigured } from './connection';
import type { BranchProfitDealRow } from '@/modules/finance-dashboard/types';

// Get the currently active deal for a branch
export async function getActiveDeal(branchId: string): Promise<BranchProfitDealRow | null> {
  if (!isSupabaseAdminConfigured()) return null;

  const { data, error } = await supabaseAdmin!
    .from('branch_profit_deals')
    .select('*')
    .eq('branch_id', branchId)
    .is('effective_until', null)
    .single();

  if (error) {
    // PGRST116 = no rows found — not an error for us
    if (error.code === 'PGRST116') return null;
    console.error('Error fetching active deal:', error);
    return null;
  }
  return data;
}

// Get all active deals across all branches
export async function getAllActiveDeals(): Promise<BranchProfitDealRow[]> {
  if (!isSupabaseAdminConfigured()) return [];

  const { data, error } = await supabaseAdmin!
    .from('branch_profit_deals')
    .select(`
      *,
      branch:branches!branch_id(id, name),
      creator:employees!created_by(id, full_name)
    `)
    .is('effective_until', null)
    .order('branch_id');

  if (error) {
    console.error('Error fetching active deals:', error);
    return [];
  }
  return data || [];
}

// Get all deals for a branch (active + historical)
export async function getDealsByBranch(branchId: string): Promise<BranchProfitDealRow[]> {
  if (!isSupabaseAdminConfigured()) return [];

  const { data, error } = await supabaseAdmin!
    .from('branch_profit_deals')
    .select(`
      *,
      branch:branches!branch_id(id, name),
      creator:employees!created_by(id, full_name)
    `)
    .eq('branch_id', branchId)
    .order('effective_from', { ascending: false });

  if (error) {
    console.error('Error fetching deals for branch:', error);
    return [];
  }
  return data || [];
}

// Get all deals (all branches, active + historical) for admin table
export async function getAllDeals(): Promise<BranchProfitDealRow[]> {
  if (!isSupabaseAdminConfigured()) return [];

  const { data, error } = await supabaseAdmin!
    .from('branch_profit_deals')
    .select(`
      *,
      branch:branches!branch_id(id, name),
      creator:employees!created_by(id, full_name)
    `)
    .order('effective_until', { ascending: true, nullsFirst: true })
    .order('effective_from', { ascending: false });

  if (error) {
    console.error('Error fetching all deals:', error);
    return [];
  }
  return data || [];
}

// Get the deal that was active during a specific period
// Logic: effective_from <= periodStart AND (effective_until IS NULL OR effective_until >= periodEnd)
export async function getDealForPeriod(
  branchId: string,
  periodStart: string,
  periodEnd: string
): Promise<BranchProfitDealRow | null> {
  if (!isSupabaseAdminConfigured()) return null;

  const { data, error } = await supabaseAdmin!
    .from('branch_profit_deals')
    .select('*')
    .eq('branch_id', branchId)
    .lte('effective_from', periodStart)
    .or(`effective_until.is.null,effective_until.gte.${periodEnd}`)
    .order('effective_from', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('Error fetching deal for period:', error);
    return null;
  }
  return data;
}

// Create a new deal (auto-closes existing active deal if present)
export async function createDeal(
  input: {
    branchId: string;
    investorName: string;
    cspacePercentage: number;
    investorPercentage: number;
    effectiveFrom: string;
    notes?: string;
    createdBy: string;
  }
): Promise<{ success: boolean; deal?: BranchProfitDealRow; error?: string }> {
  if (!isSupabaseAdminConfigured()) {
    return { success: false, error: 'Database not configured' };
  }

  // Close existing active deal for this branch
  const existingDeal = await getActiveDeal(input.branchId);
  if (existingDeal) {
    // Close it on the day before the new deal starts
    const closingDate = new Date(input.effectiveFrom);
    closingDate.setDate(closingDate.getDate() - 1);
    const effectiveUntil = closingDate.toISOString().split('T')[0];

    const { error: closeError } = await supabaseAdmin!
      .from('branch_profit_deals')
      .update({ effective_until: effectiveUntil })
      .eq('id', existingDeal.id);

    if (closeError) {
      console.error('Error closing existing deal:', closeError);
      return { success: false, error: 'Failed to close existing deal' };
    }
  }

  // Create new deal
  const { data, error } = await supabaseAdmin!
    .from('branch_profit_deals')
    .insert({
      branch_id: input.branchId,
      investor_name: input.investorName,
      cspace_percentage: input.cspacePercentage,
      investor_percentage: input.investorPercentage,
      effective_from: input.effectiveFrom,
      notes: input.notes || null,
      created_by: input.createdBy,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating deal:', error);
    return { success: false, error: error.message };
  }

  return { success: true, deal: data };
}

// Close a specific deal (set effective_until)
export async function closeDeal(
  dealId: string,
  effectiveUntil: string
): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseAdminConfigured()) {
    return { success: false, error: 'Database not configured' };
  }

  const { error } = await supabaseAdmin!
    .from('branch_profit_deals')
    .update({ effective_until: effectiveUntil })
    .eq('id', dealId)
    .is('effective_until', null); // only close active deals

  if (error) {
    console.error('Error closing deal:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}
