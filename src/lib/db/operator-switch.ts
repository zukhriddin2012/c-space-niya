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
  type AssignmentType,
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

// CSN-029: Search employees for branch assignment (no PIN requirement)
export async function searchEmployeesForAssignment(
  query: string,
  limit: number = 15
): Promise<EmployeeSearchResult[]> {
  if (!isSupabaseAdminConfigured()) {
    return [];
  }

  const { data: employees, error: empError } = await supabaseAdmin!
    .from('employees')
    .select(
      `
      id,
      full_name,
      branch_id,
      role,
      operator_pin_hash,
      branches!employees_branch_id_fkey(id, name)
    `
    )
    .ilike('full_name', `%${escapeIlike(query)}%`)
    .limit(limit);

  if (empError) {
    console.error('Error searching employees for assignment:', empError);
    return [];
  }

  return (employees || []).map((emp: any) => ({
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

// CSN-029: Create a new branch assignment with full validation
export async function createBranchAssignment(params: {
  employeeId: string;
  assignedBranchId: string;
  assignmentType: string;
  assignedBy: string;
  startsAt?: string;
  endsAt?: string | null;
  notes?: string | null;
}): Promise<{ success: boolean; data?: BranchAssignment; error?: string }> {
  if (!isSupabaseAdminConfigured()) {
    return { success: false, error: 'Database not configured' };
  }

  try {
    // 1. Verify employee exists and has PIN
    const { data: emp, error: empError } = await supabaseAdmin!
      .from('employees')
      .select('id, full_name, branch_id, operator_pin_hash')
      .eq('id', params.employeeId)
      .single();

    if (empError || !emp) {
      return { success: false, error: 'Employee not found' };
    }
    if (!emp.operator_pin_hash) {
      return { success: false, error: 'Employee does not have a PIN set' };
    }
    if (emp.branch_id === params.assignedBranchId) {
      return { success: false, error: 'Cannot assign employee to their home branch' };
    }

    // 2. Check for existing active assignment
    const { data: existing } = await supabaseAdmin!
      .from('branch_employee_assignments')
      .select('id')
      .eq('employee_id', params.employeeId)
      .eq('assigned_branch_id', params.assignedBranchId)
      .is('removed_at', null)
      .or(`ends_at.is.null,ends_at.gt.${new Date().toISOString()}`)
      .maybeSingle();

    if (existing) {
      return { success: false, error: 'Employee already has active assignment to this branch' };
    }

    // 3. Insert assignment
    const { data, error } = await supabaseAdmin!
      .from('branch_employee_assignments')
      .insert({
        employee_id: params.employeeId,
        home_branch_id: emp.branch_id,
        assigned_branch_id: params.assignedBranchId,
        assigned_by: params.assignedBy,
        assignment_type: params.assignmentType,
        starts_at: params.startsAt || new Date().toISOString(),
        ends_at: params.endsAt || null,
        notes: params.notes || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating branch assignment:', error);
      return { success: false, error: error.message };
    }

    const assignment = transformBranchAssignment(data as BranchAssignmentRow);
    assignment.employeeName = emp.full_name;

    return { success: true, data: assignment };
  } catch (error) {
    console.error('Error in createBranchAssignment:', error);
    return { success: false, error: 'Internal error' };
  }
}

// CSN-029: Remove assignment with auto-revoke of granted access
export async function removeBranchAssignment(
  id: string,
  _removedBy?: string
): Promise<{ success: boolean; accessRevoked: boolean; error?: string }> {
  if (!isSupabaseAdminConfigured()) {
    return { success: false, accessRevoked: false, error: 'Database not configured' };
  }

  try {
    // 1. Soft-delete the assignment
    const { data, error } = await supabaseAdmin!
      .from('branch_employee_assignments')
      .update({ removed_at: new Date().toISOString() })
      .eq('id', id)
      .is('removed_at', null)
      .select()
      .single();

    if (error || !data) {
      return { success: false, accessRevoked: false, error: 'Assignment not found or already removed' };
    }

    // 2. Revoke auto-granted access (AT-3)
    const { data: accessRow } = await supabaseAdmin!
      .from('reception_branch_access')
      .select('id')
      .eq('auto_granted_from', id)
      .maybeSingle();

    let accessRevoked = false;
    if (accessRow) {
      await supabaseAdmin!
        .from('reception_branch_access')
        .delete()
        .eq('id', accessRow.id);
      accessRevoked = true;
    }

    return { success: true, accessRevoked };
  } catch (error) {
    console.error('Error in removeBranchAssignment:', error);
    return { success: false, accessRevoked: false, error: 'Internal error' };
  }
}

// CSN-029: Auto-grant branch access when assignment is created
export async function autoGrantBranchAccess(
  assignmentId: string,
  employeeId: string,
  branchId: string,
  grantedBy: string
): Promise<{ granted: boolean }> {
  if (!isSupabaseAdminConfigured()) return { granted: false };
  try {
    // Check if access already exists
    const { data: existing } = await supabaseAdmin!
      .from('reception_branch_access')
      .select('id')
      .eq('user_id', employeeId)
      .eq('branch_id', branchId)
      .maybeSingle();

    if (existing) return { granted: false }; // Already has access

    // Auto-grant with link to assignment
    await supabaseAdmin!
      .from('reception_branch_access')
      .insert({
        user_id: employeeId,
        branch_id: branchId,
        granted_by: grantedBy,
        notes: 'Auto-granted via assignment CSN-029',
        auto_granted_from: assignmentId,
      });

    return { granted: true };
  } catch (error) {
    console.error('Error in autoGrantBranchAccess:', error);
    return { granted: false };
  }
}

// CSN-029: Update an existing assignment
export async function updateBranchAssignment(
  id: string,
  updates: {
    endsAt?: string | null;
    assignmentType?: string;
    notes?: string | null;
  }
): Promise<{ success: boolean; data?: BranchAssignment; error?: string }> {
  if (!isSupabaseAdminConfigured()) {
    return { success: false, error: 'Database not configured' };
  }

  try {
    const updateData: Record<string, unknown> = {};
    if (updates.endsAt !== undefined) updateData.ends_at = updates.endsAt;
    if (updates.assignmentType !== undefined) updateData.assignment_type = updates.assignmentType;
    if (updates.notes !== undefined) updateData.notes = updates.notes;

    const { data, error } = await supabaseAdmin!
      .from('branch_employee_assignments')
      .update(updateData)
      .eq('id', id)
      .is('removed_at', null)
      .select()
      .single();

    if (error || !data) {
      return { success: false, error: 'Assignment not found or already removed' };
    }

    return { success: true, data: transformBranchAssignment(data as BranchAssignmentRow) };
  } catch (error) {
    console.error('Error in updateBranchAssignment:', error);
    return { success: false, error: 'Internal error' };
  }
}

// CSN-029: Get assignments by branch with pagination, filtering, and joins
export async function getAssignmentsByBranch(
  branchId: string,
  options: {
    type?: string;
    search?: string;
    includeExpired?: boolean;
    page?: number;
    pageSize?: number;
  } = {}
): Promise<{
  success: boolean;
  data?: BranchAssignment[];
  total?: number;
  error?: string;
}> {
  if (!isSupabaseAdminConfigured()) {
    return { success: false, error: 'Database not configured' };
  }
  try {
    const page = options.page || 1;
    const pageSize = options.pageSize || 50;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabaseAdmin!
      .from('branch_employee_assignments')
      .select(`
        *,
        employee:employees!branch_employee_assignments_employee_id_fkey(id, full_name, branch_id),
        assigned_branch:branches!branch_employee_assignments_assigned_branch_id_fkey(id, name),
        home_branch:branches!branch_employee_assignments_home_branch_id_fkey(id, name),
        assignor:employees!branch_employee_assignments_assigned_by_fkey(id, full_name)
      `, { count: 'exact' })
      .eq('assigned_branch_id', branchId)
      .is('removed_at', null);

    if (!options.includeExpired) {
      query = query.or(`ends_at.is.null,ends_at.gt.${new Date().toISOString()}`);
    }

    if (options.type) {
      query = query.eq('assignment_type', options.type);
    }

    query = query.order('starts_at', { ascending: false }).range(from, to);

    const { data, error, count } = await query;

    if (error) {
      console.error('Error fetching assignments by branch:', error);
      return { success: false, error: error.message };
    }

    const assignments = (data || []).map((row: Record<string, unknown>) => {
      const emp = row.employee as { id: string; full_name: string; branch_id: string } | null;
      const assignedBranch = row.assigned_branch as { id: string; name: string } | null;
      const homeBranch = row.home_branch as { id: string; name: string } | null;
      const assignor = row.assignor as { id: string; full_name: string } | null;

      const base = transformBranchAssignment(row as unknown as BranchAssignmentRow);
      base.employeeName = emp?.full_name;
      base.homeBranchName = homeBranch?.name;
      base.assignedBranchName = assignedBranch?.name;
      base.assignedByName = assignor?.full_name;
      return base;
    });

    // Client-side search filter (Supabase can't ILIKE on FK-joined columns)
    let filtered = assignments;
    if (options.search) {
      const term = options.search.toLowerCase();
      filtered = assignments.filter(a =>
        a.employeeName?.toLowerCase().includes(term)
      );
    }

    return { success: true, data: filtered, total: count || 0 };
  } catch (error) {
    console.error('Error in getAssignmentsByBranch:', error);
    return { success: false, error: 'Internal error' };
  }
}

// CSN-029: Get all active assignments for an employee
export async function getAssignmentsByEmployee(
  employeeId: string,
  options: { includeExpired?: boolean } = {}
): Promise<{ success: boolean; data?: BranchAssignment[]; error?: string }> {
  if (!isSupabaseAdminConfigured()) {
    return { success: false, error: 'Database not configured' };
  }
  try {
    let query = supabaseAdmin!
      .from('branch_employee_assignments')
      .select(`
        *,
        assigned_branch:branches!branch_employee_assignments_assigned_branch_id_fkey(id, name),
        home_branch:branches!branch_employee_assignments_home_branch_id_fkey(id, name),
        assignor:employees!branch_employee_assignments_assigned_by_fkey(id, full_name)
      `)
      .eq('employee_id', employeeId)
      .is('removed_at', null);

    if (!options.includeExpired) {
      query = query.or(`ends_at.is.null,ends_at.gt.${new Date().toISOString()}`);
    }

    query = query.order('starts_at', { ascending: false });

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching assignments by employee:', error);
      return { success: false, error: error.message };
    }

    const assignments = (data || []).map((row: Record<string, unknown>) => {
      const assignedBranch = row.assigned_branch as { id: string; name: string } | null;
      const homeBranch = row.home_branch as { id: string; name: string } | null;
      const assignor = row.assignor as { id: string; full_name: string } | null;

      const base = transformBranchAssignment(row as unknown as BranchAssignmentRow);
      base.homeBranchName = homeBranch?.name;
      base.assignedBranchName = assignedBranch?.name;
      base.assignedByName = assignor?.full_name;
      return base;
    });

    return { success: true, data: assignments };
  } catch (error) {
    console.error('Error in getAssignmentsByEmployee:', error);
    return { success: false, error: 'Internal error' };
  }
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
      assignment_type,
      notes,
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
