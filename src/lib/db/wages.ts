import { supabaseAdmin, isSupabaseAdminConfigured, Branch } from './connection';
import type { LegalEntity } from './legal-entities';

// ============================================
// EMPLOYEE WAGES (Multi-entity wage distribution)
// ============================================

export interface EmployeeWage {
  id: string;
  employee_id: string;
  legal_entity_id: string;
  wage_amount: number;
  wage_type: 'official' | 'bonus';
  notes: string | null;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
  legal_entities?: LegalEntity;
}

export async function getEmployeeWages(employeeId: string): Promise<EmployeeWage[]> {
  if (!isSupabaseAdminConfigured()) {
    return [];
  }

  const { data, error } = await supabaseAdmin!
    .from('employee_wages')
    .select('*, legal_entities(id, name, short_name, inn, branch_id)')
    .eq('employee_id', employeeId)
    .eq('is_active', true)
    .order('wage_amount', { ascending: false });

  if (error) {
    console.error('Error fetching employee wages:', error);
    return [];
  }

  return data || [];
}

export async function addEmployeeWage(wage: {
  employee_id: string;
  legal_entity_id: string;
  wage_amount: number;
  wage_type?: 'official' | 'bonus';
  notes?: string;
}): Promise<{ success: boolean; wage?: EmployeeWage; error?: string }> {
  if (!isSupabaseAdminConfigured()) {
    return { success: false, error: 'Database not configured' };
  }

  const { data, error } = await supabaseAdmin!
    .from('employee_wages')
    .upsert({
      employee_id: wage.employee_id,
      legal_entity_id: wage.legal_entity_id,
      wage_amount: wage.wage_amount,
      wage_type: wage.wage_type || 'official',
      notes: wage.notes || null,
      is_active: true,
    }, {
      onConflict: 'employee_id,legal_entity_id,wage_type'
    })
    .select()
    .single();

  if (error) {
    console.error('Error adding employee wage:', error);
    return { success: false, error: error.message };
  }

  return { success: true, wage: data };
}

export async function updateEmployeeWage(
  id: string,
  updates: { wage_amount?: number; notes?: string; is_active?: boolean }
): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseAdminConfigured()) {
    return { success: false, error: 'Database not configured' };
  }

  const { error } = await supabaseAdmin!
    .from('employee_wages')
    .update(updates)
    .eq('id', id);

  if (error) {
    console.error('Error updating employee wage:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

export async function removeEmployeeWage(id: string): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseAdminConfigured()) {
    return { success: false, error: 'Database not configured' };
  }

  // Soft delete - set is_active to false
  const { error } = await supabaseAdmin!
    .from('employee_wages')
    .update({ is_active: false })
    .eq('id', id);

  if (error) {
    console.error('Error removing employee wage:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

// Get total wages for an employee across all entities (Primary wages only)
export async function getEmployeeTotalWages(employeeId: string): Promise<{
  total: number;
  entities: { entity: string; amount: number }[];
}> {
  const wages = await getEmployeeWages(employeeId);

  const total = wages.reduce((sum, w) => sum + (w.wage_amount || 0), 0);
  const entities = wages.map(w => ({
    entity: w.legal_entities?.short_name || w.legal_entities?.name || w.legal_entity_id,
    amount: w.wage_amount,
  }));

  return { total, entities };
}

// ============================================
// EMPLOYEE BRANCH WAGES (Additional/Cash wages)
// ============================================

export interface EmployeeBranchWage {
  id: string;
  employee_id: string;
  branch_id: string;
  wage_amount: number;
  notes: string | null;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
  branches?: Branch;
}

export async function getEmployeeBranchWages(employeeId: string): Promise<EmployeeBranchWage[]> {
  if (!isSupabaseAdminConfigured()) {
    return [];
  }

  const { data, error } = await supabaseAdmin!
    .from('employee_branch_wages')
    .select('*, branches(id, name, address)')
    .eq('employee_id', employeeId)
    .eq('is_active', true)
    .order('wage_amount', { ascending: false });

  if (error) {
    console.error('Error fetching employee branch wages:', error);
    return [];
  }

  return data || [];
}

export async function addEmployeeBranchWage(wage: {
  employee_id: string;
  branch_id: string;
  wage_amount: number;
  notes?: string;
}): Promise<{ success: boolean; wage?: EmployeeBranchWage; error?: string }> {
  if (!isSupabaseAdminConfigured()) {
    return { success: false, error: 'Database not configured' };
  }

  const { data, error } = await supabaseAdmin!
    .from('employee_branch_wages')
    .upsert({
      employee_id: wage.employee_id,
      branch_id: wage.branch_id,
      wage_amount: wage.wage_amount,
      notes: wage.notes || null,
      is_active: true,
    }, {
      onConflict: 'employee_id,branch_id'
    })
    .select()
    .single();

  if (error) {
    console.error('Error adding employee branch wage:', error);
    return { success: false, error: error.message };
  }

  return { success: true, wage: data };
}

export async function updateEmployeeBranchWage(
  id: string,
  updates: { wage_amount?: number; notes?: string; is_active?: boolean }
): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseAdminConfigured()) {
    return { success: false, error: 'Database not configured' };
  }

  const { error } = await supabaseAdmin!
    .from('employee_branch_wages')
    .update(updates)
    .eq('id', id);

  if (error) {
    console.error('Error updating employee branch wage:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

export async function removeEmployeeBranchWage(id: string): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseAdminConfigured()) {
    return { success: false, error: 'Database not configured' };
  }

  // Soft delete - set is_active to false
  const { error } = await supabaseAdmin!
    .from('employee_branch_wages')
    .update({ is_active: false })
    .eq('id', id);

  if (error) {
    console.error('Error removing employee branch wage:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

// Get total wages for an employee across all sources (Primary + Additional)
export async function getEmployeeAllWages(employeeId: string): Promise<{
  primaryTotal: number;
  additionalTotal: number;
  grandTotal: number;
  primaryWages: { entity: string; amount: number }[];
  additionalWages: { branch: string; amount: number }[];
}> {
  const [primaryWages, branchWages] = await Promise.all([
    getEmployeeWages(employeeId),
    getEmployeeBranchWages(employeeId),
  ]);

  const primaryTotal = primaryWages.reduce((sum, w) => sum + (w.wage_amount || 0), 0);
  const additionalTotal = branchWages.reduce((sum, w) => sum + (w.wage_amount || 0), 0);

  return {
    primaryTotal,
    additionalTotal,
    grandTotal: primaryTotal + additionalTotal,
    primaryWages: primaryWages.map(w => ({
      entity: w.legal_entities?.short_name || w.legal_entities?.name || w.legal_entity_id,
      amount: w.wage_amount,
    })),
    additionalWages: branchWages.map(w => ({
      branch: w.branches?.name || w.branch_id,
      amount: w.wage_amount,
    })),
  };
}
