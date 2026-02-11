import { supabaseAdmin, isSupabaseAdminConfigured } from './connection';
import { escapeIlike } from '@/lib/security';
import {
  transformOperatorSwitchLog,
  transformBranchAssignment,
  type OperatorIdentity,
  type OperatorSwitchLog,
  type OperatorSwitchLogRow,
  type BranchAssignment,
  type BranchAssignmentRow,
  type EmployeeSearchResult,
} from '@/modules/reception/types';

// ============================================
// OPERATOR PIN AND CROSS-BRANCH ASSIGNMENTS
// ============================================

// Get employees with PIN assigned to a branch
// Includes primary branch employees + cross-branch assignments
export async function getEmployeesWithPin(branchId: string): Promise<
  Array<{
    id: string;
    full_name: string;
    operator_pin_hash: string;
    branch_id: string;
    is_cross_branch: boolean;
    home_branch_id?: string;
  }>
> {
  if (!isSupabaseAdminConfigured()) {
    return [];
  }

  // Get employees with PIN from primary branch
  const { data: primaryEmployees, error: primaryError } = await supabaseAdmin!
    .from('employees')
    .select('id, full_name, operator_pin_hash, branch_id')
    .eq('branch_id', branchId)
    .not('operator_pin_hash', 'is', null);

  if (primaryError) {
    console.error('Error fetching primary branch employees with PIN:', primaryError);
  }

  // Get employees with PIN from cross-branch assignments
  // BUG-004 fix: Disambiguate FK — use employee_id FK (not assigned_by FK) to join employees
  const { data: crossBranchData, error: crossError } = await supabaseAdmin!
    .from('branch_employee_assignments')
    .select(
      `
      employee_id,
      assigned_branch_id,
      home_branch_id,
      employees!branch_employee_assignments_employee_id_fkey(id, full_name, operator_pin_hash)
    `
    )
    .eq('assigned_branch_id', branchId)
    .is('removed_at', null)
    .or(
      `ends_at.is.null,ends_at.gt.${new Date().toISOString()}`
    );

  if (crossError) {
    console.error('Error fetching cross-branch employees with PIN:', crossError);
  }

  const result: Array<{
    id: string;
    full_name: string;
    operator_pin_hash: string;
    branch_id: string;
    is_cross_branch: boolean;
    home_branch_id?: string;
  }> = [];

  // Add primary branch employees
  if (primaryEmployees) {
    result.push(
      ...primaryEmployees
        .filter((emp) => emp.operator_pin_hash)
        .map((emp) => ({
          id: emp.id,
          full_name: emp.full_name,
          operator_pin_hash: emp.operator_pin_hash,
          branch_id: emp.branch_id,
          is_cross_branch: false,
        }))
    );
  }

  // Add cross-branch employees
  if (crossBranchData) {
    result.push(
      ...crossBranchData
        .filter((assignment: any) => assignment.employees?.operator_pin_hash)
        .map((assignment: any) => ({
          id: assignment.employees.id,
          full_name: assignment.employees.full_name,
          operator_pin_hash: assignment.employees.operator_pin_hash,
          branch_id: assignment.assigned_branch_id,
          is_cross_branch: true,
          home_branch_id: assignment.home_branch_id,
        }))
    );
  }

  return result;
}

// Get a single employee's PIN hash
export async function getEmployeePinHash(employeeId: string): Promise<string | null> {
  if (!isSupabaseAdminConfigured()) {
    return null;
  }

  const { data, error } = await supabaseAdmin!
    .from('employees')
    .select('operator_pin_hash')
    .eq('id', employeeId)
    .single();

  if (error) {
    console.error('Error fetching employee PIN hash:', error);
    return null;
  }

  return data?.operator_pin_hash || null;
}

// Set/update an employee's PIN hash
export async function setEmployeePinHash(
  employeeId: string,
  pinHash: string
): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseAdminConfigured()) {
    return { success: false, error: 'Database not configured' };
  }

  const { error } = await supabaseAdmin!
    .from('employees')
    .update({ operator_pin_hash: pinHash })
    .eq('id', employeeId);

  if (error) {
    console.error('Error setting employee PIN hash:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

// ============================================
// OPERATOR SWITCH LOGGING
// ============================================

// Log an operator switch event
export async function logOperatorSwitch(params: {
  branchId: string;
  sessionUserId: string;
  switchedToId: string;
  isCrossBranch: boolean;
  homeBranchId?: string;
  ipAddress?: string;
}): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseAdminConfigured()) {
    return { success: false, error: 'Database not configured' };
  }

  // BUG-005 fix: Kiosk users have synthetic IDs like "kiosk:labzak" which are not valid UUIDs.
  // The session_user_id column in operator_switch_log is UUID type, so skip logging for kiosk sessions.
  // The PIN was already validated server-side before reaching this point.
  const isKioskSession = params.sessionUserId.startsWith('kiosk:');
  if (isKioskSession) {
    // Still return success — the PIN switch itself worked, we just can't log the kiosk session ID
    return { success: true };
  }

  const { error } = await supabaseAdmin!
    .from('operator_switch_log')
    .insert({
      branch_id: params.branchId,
      session_user_id: params.sessionUserId,
      switched_to_id: params.switchedToId,
      is_cross_branch: params.isCrossBranch,
      home_branch_id: params.homeBranchId || null,
      ip_address: params.ipAddress || null,
    });

  if (error) {
    console.error('Error logging operator switch:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

// Get recent operator switch logs for a branch
export async function getOperatorSwitchLogs(
  branchId: string,
  limit: number = 50
): Promise<OperatorSwitchLog[]> {
  if (!isSupabaseAdminConfigured()) {
    return [];
  }

  const { data, error } = await supabaseAdmin!
    .from('operator_switch_log')
    .select(
      `
      id,
      branch_id,
      session_user_id,
      switched_to_id,
      is_cross_branch,
      home_branch_id,
      ip_address,
      created_at
    `
    )
    .eq('branch_id', branchId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching operator switch logs:', error);
    return [];
  }

  return (data || []).map((row) => transformOperatorSwitchLog(row as OperatorSwitchLogRow));
}

// ============================================
// CROSS-BRANCH EMPLOYEE SEARCH
// ============================================

// Search employees for cross-branch assignment by name
// Excludes employees already assigned to the given branch
export async function searchEmployeesForCrossBranch(
  query: string,
  excludeBranchId: string,
  limit: number = 5
): Promise<EmployeeSearchResult[]> {
  if (!isSupabaseAdminConfigured()) {
    return [];
  }

  // First, get all employees with PIN and matching name
  const { data: employees, error: empError } = await supabaseAdmin!
    .from('employees')
    .select(
      `
      id,
      full_name,
      branch_id,
      role,
      operator_pin_hash,
      branches!inner(id, name)
    `
    )
    .ilike('full_name', `%${escapeIlike(query)}%`)
    .not('operator_pin_hash', 'is', null)
    .neq('branch_id', excludeBranchId)
    .limit(limit);

  if (empError) {
    console.error('Error searching employees for cross-branch:', empError);
    return [];
  }

  if (!employees) {
    return [];
  }

  // Filter out employees already assigned to the exclude branch
  const { data: existingAssignments } = await supabaseAdmin!
    .from('branch_employee_assignments')
    .select('employee_id')
    .eq('assigned_branch_id', excludeBranchId)
    .is('removed_at', null)
    .or(`ends_at.is.null,ends_at.gt.${new Date().toISOString()}`);

  const assignedEmployeeIds = new Set(
    (existingAssignments || []).map((a: any) => a.employee_id)
  );

  return employees
    .filter((emp: any) => !assignedEmployeeIds.has(emp.id))
    .map((emp: any) => ({
      id: emp.id,
      name: emp.full_name,
      branchId: emp.branch_id,
      branchName: emp.branches?.name || '',
      role: emp.role || '',
      hasPinSet: !!emp.operator_pin_hash,
    }));
}

// ============================================
// BRANCH EMPLOYEE ASSIGNMENTS
// ============================================

// Create a new branch assignment
export async function createBranchAssignment(params: {
  employeeId: string;
  homeBranchId: string;
  assignedBranchId: string;
  assignedBy: string;
  startsAt: string;
  endsAt?: string;
}): Promise<{ success: boolean; data?: BranchAssignment; error?: string }> {
  if (!isSupabaseAdminConfigured()) {
    return { success: false, error: 'Database not configured' };
  }

  const { data, error } = await supabaseAdmin!
    .from('branch_employee_assignments')
    .insert({
      employee_id: params.employeeId,
      home_branch_id: params.homeBranchId,
      assigned_branch_id: params.assignedBranchId,
      assigned_by: params.assignedBy,
      starts_at: params.startsAt,
      ends_at: params.endsAt || null,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating branch assignment:', error);
    return { success: false, error: error.message };
  }

  return {
    success: true,
    data: transformBranchAssignment(data as BranchAssignmentRow),
  };
}

// Remove a branch assignment by setting removed_at
export async function removeBranchAssignment(
  id: string,
  removedBy: string
): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseAdminConfigured()) {
    return { success: false, error: 'Database not configured' };
  }

  const { error } = await supabaseAdmin!
    .from('branch_employee_assignments')
    .update({
      removed_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) {
    console.error('Error removing branch assignment:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

// Get all active branch assignments for a branch
// Active means: removed_at IS NULL AND (ends_at IS NULL OR ends_at > now())
export async function getActiveBranchAssignments(
  branchId: string
): Promise<BranchAssignment[]> {
  if (!isSupabaseAdminConfigured()) {
    return [];
  }

  const now = new Date().toISOString();

  // BUG-004 fix: Disambiguate employees FK (employee_id vs assigned_by)
  const { data, error } = await supabaseAdmin!
    .from('branch_employee_assignments')
    .select(
      `
      id,
      employee_id,
      home_branch_id,
      assigned_branch_id,
      assigned_by,
      starts_at,
      ends_at,
      removed_at,
      created_at,
      employees!branch_employee_assignments_employee_id_fkey(id, full_name),
      assigned_branch:branches!assigned_branch_id(id, name),
      home_branch:branches!home_branch_id(id, name),
      assigned_user:employees!branch_employee_assignments_assigned_by_fkey(id, full_name)
    `
    )
    .eq('assigned_branch_id', branchId)
    .is('removed_at', null)
    .or(`ends_at.is.null,ends_at.gt.${now}`);

  if (error) {
    console.error('Error fetching active branch assignments:', error);
    return [];
  }

  return (data || []).map((row: any) => {
    const transformed = transformBranchAssignment(row as BranchAssignmentRow);
    return {
      ...transformed,
      employeeName: row.employees?.full_name,
      homeBranchName: row.home_branch?.name,
      assignedBranchName: row.assigned_branch?.name,
      assignedByName: row.assigned_user?.full_name,
    };
  });
}
