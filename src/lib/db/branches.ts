// Branch database functions
import { supabaseAdmin, isSupabaseAdminConfigured, Branch } from './connection';

export async function getBranches(): Promise<Branch[]> {
  if (!isSupabaseAdminConfigured()) {
    console.error('Supabase not configured');
    return [];
  }

  const { data, error } = await supabaseAdmin!
    .from('branches')
    .select('*')
    .order('name');

  if (error) {
    console.error('Error fetching branches:', error);
    return [];
  }

  return data || [];
}

export async function getBranchById(id: string): Promise<Branch | null> {
  if (!isSupabaseAdminConfigured()) {
    console.error('Supabase not configured');
    return null;
  }

  const { data, error } = await supabaseAdmin!
    .from('branches')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching branch by id:', error);
    return null;
  }

  return data;
}

export async function createBranch(branch: {
  name: string;
  address: string;
  latitude?: number;
  longitude?: number;
  geofence_radius?: number;
  // New configuration fields
  operational_status?: 'under_construction' | 'operational' | 'rented' | 'facility_management';
  has_night_shift?: boolean;
  smart_lock_enabled?: boolean;
  smart_lock_start_time?: string;
  smart_lock_end_time?: string;
  branch_class?: 'A+' | 'A' | 'B+' | 'B' | 'C+' | 'C';
  description?: string | null;
  community_manager_id?: string | null;
}): Promise<{ success: boolean; branch?: Branch; error?: string }> {
  if (!isSupabaseAdminConfigured()) {
    return { success: false, error: 'Database not configured' };
  }

  // Generate a slug-based ID from the branch name
  // e.g., "C-Space New Branch" -> "new-branch"
  const generateId = (name: string): string => {
    return name
      .toLowerCase()
      .replace(/c-space\s*/i, '') // Remove "C-Space" prefix
      .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
      .trim()
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Remove duplicate hyphens
      || `branch-${Date.now()}`; // Fallback if name is empty after processing
  };

  const branchId = generateId(branch.name);

  const { data, error } = await supabaseAdmin!
    .from('branches')
    .insert({
      id: branchId,
      name: branch.name,
      address: branch.address,
      latitude: branch.latitude || null,
      longitude: branch.longitude || null,
      geofence_radius: branch.geofence_radius || 100,
      // New configuration fields
      operational_status: branch.operational_status || 'operational',
      has_night_shift: branch.has_night_shift || false,
      smart_lock_enabled: branch.smart_lock_enabled || false,
      smart_lock_start_time: branch.smart_lock_start_time || '18:00',
      smart_lock_end_time: branch.smart_lock_end_time || '09:00',
      branch_class: branch.branch_class || 'B',
      description: branch.description || null,
      community_manager_id: branch.community_manager_id || null,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating branch:', error);
    return { success: false, error: error.message };
  }

  return { success: true, branch: data };
}

export async function updateBranch(
  id: string,
  updates: {
    name?: string;
    address?: string;
    latitude?: number | null;
    longitude?: number | null;
    geofence_radius?: number;
    office_ips?: string[];
    // New configuration fields
    operational_status?: 'under_construction' | 'operational' | 'rented' | 'facility_management';
    has_night_shift?: boolean;
    smart_lock_enabled?: boolean;
    smart_lock_start_time?: string | null;
    smart_lock_end_time?: string | null;
    branch_class?: 'A+' | 'A' | 'B+' | 'B' | 'C+' | 'C';
    description?: string | null;
    community_manager_id?: string | null;
  }
): Promise<{ success: boolean; branch?: Branch; error?: string }> {
  if (!isSupabaseAdminConfigured()) {
    return { success: false, error: 'Database not configured' };
  }

  const { data, error } = await supabaseAdmin!
    .from('branches')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating branch:', error);
    return { success: false, error: error.message };
  }

  return { success: true, branch: data };
}

export async function deleteBranch(id: string): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseAdminConfigured()) {
    return { success: false, error: 'Database not configured' };
  }

  // Check if branch has employees
  const { data: employees } = await supabaseAdmin!
    .from('employees')
    .select('id')
    .eq('branch_id', id)
    .eq('status', 'active')
    .limit(1);

  if (employees && employees.length > 0) {
    return { success: false, error: 'Cannot delete branch with active employees' };
  }

  // Check if branch has legal entities
  const { data: legalEntities } = await supabaseAdmin!
    .from('legal_entities')
    .select('id, name')
    .eq('branch_id', id)
    .eq('status', 'active')
    .limit(1);

  if (legalEntities && legalEntities.length > 0) {
    return { success: false, error: `Cannot delete branch: Legal entity "${legalEntities[0].name}" is assigned to this branch. Please reassign or remove the legal entity first.` };
  }

  // Check if branch has employee branch wages
  const { data: branchWages } = await supabaseAdmin!
    .from('employee_branch_wages')
    .select('id')
    .eq('branch_id', id)
    .eq('is_active', true)
    .limit(1);

  if (branchWages && branchWages.length > 0) {
    return { success: false, error: 'Cannot delete branch with active wage assignments. Please remove wage assignments first.' };
  }

  const { error } = await supabaseAdmin!
    .from('branches')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting branch:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}
