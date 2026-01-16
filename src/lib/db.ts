// Database access layer - uses Supabase when configured, falls back to static data
import { supabaseAdmin, isSupabaseAdminConfigured, Employee, Attendance, Branch, LeaveRequest } from './supabase';

// ============================================
// EMPLOYEES
// ============================================

export async function getEmployees(): Promise<Employee[]> {
  if (!isSupabaseAdminConfigured()) {
    // Fallback to static data
    const { employees } = await import('@/data/employees');
    return employees.map(e => ({
      id: e.id,
      employee_id: e.employeeId,
      full_name: e.fullName,
      position: e.position,
      level: e.level,
      branch_id: e.branchId,
      salary: e.salary,
      phone: e.phone || null,
      email: e.email || null,
      telegram_id: null,
      default_shift: 'day',
      can_rotate: false,
      status: 'active',
      hire_date: e.hireDate || new Date().toISOString().split('T')[0],
    }));
  }

  const { data, error } = await supabaseAdmin!
    .from('employees')
    .select('*, branches(name)')
    .eq('status', 'active')
    .order('full_name');

  if (error) {
    console.error('Error fetching employees:', error);
    return [];
  }

  return data || [];
}

export async function getEmployeeById(id: string): Promise<Employee | null> {
  if (!isSupabaseAdminConfigured()) {
    const { employees } = await import('@/data/employees');
    const emp = employees.find(e => e.id === id);
    if (!emp) return null;
    return {
      id: emp.id,
      employee_id: emp.employeeId,
      full_name: emp.fullName,
      position: emp.position,
      level: emp.level,
      branch_id: emp.branchId,
      salary: emp.salary,
      phone: emp.phone || null,
      email: emp.email || null,
      telegram_id: null,
      default_shift: 'day',
      can_rotate: false,
      status: 'active',
      hire_date: emp.hireDate || new Date().toISOString().split('T')[0],
    };
  }

  const { data, error } = await supabaseAdmin!
    .from('employees')
    .select('*, branches(name)')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching employee:', error);
    return null;
  }

  return data;
}

export async function getEmployeesByBranch(branchId: string): Promise<Employee[]> {
  if (!isSupabaseAdminConfigured()) {
    const { employees } = await import('@/data/employees');
    return employees
      .filter(e => e.branchId === branchId)
      .map(e => ({
        id: e.id,
        employee_id: e.employeeId,
        full_name: e.fullName,
        position: e.position,
        level: e.level,
        branch_id: e.branchId,
        salary: e.salary,
        phone: e.phone || null,
        email: e.email || null,
        telegram_id: null,
        default_shift: 'day',
        can_rotate: false,
        status: 'active',
        hire_date: e.hireDate || new Date().toISOString().split('T')[0],
      }));
  }

  const { data, error } = await supabaseAdmin!
    .from('employees')
    .select('*, branches(name)')
    .eq('branch_id', branchId)
    .eq('status', 'active')
    .order('full_name');

  if (error) {
    console.error('Error fetching employees by branch:', error);
    return [];
  }

  return data || [];
}

// ============================================
// BRANCHES
// ============================================

export async function getBranches(): Promise<Branch[]> {
  if (!isSupabaseAdminConfigured()) {
    const { branches } = await import('@/data/branches');
    return branches.map(b => ({
      id: b.id,
      name: b.name,
      address: b.address,
      latitude: b.latitude || null,
      longitude: b.longitude || null,
      geofence_radius: 100,
    }));
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
    const { branches } = await import('@/data/branches');
    const branch = branches.find(b => b.id === id);
    if (!branch) return null;
    return {
      id: branch.id,
      name: branch.name,
      address: branch.address,
      latitude: branch.latitude || null,
      longitude: branch.longitude || null,
      geofence_radius: 100,
    };
  }

  const { data, error } = await supabaseAdmin!
    .from('branches')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching branch:', error);
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
}): Promise<{ success: boolean; branch?: Branch; error?: string }> {
  if (!isSupabaseAdminConfigured()) {
    return { success: false, error: 'Database not configured' };
  }

  const { data, error } = await supabaseAdmin!
    .from('branches')
    .insert({
      name: branch.name,
      address: branch.address,
      latitude: branch.latitude || null,
      longitude: branch.longitude || null,
      geofence_radius: branch.geofence_radius || 100,
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

// ============================================
// ATTENDANCE
// ============================================

export async function getTodayAttendance(): Promise<Attendance[]> {
  if (!isSupabaseAdminConfigured()) {
    // Return empty for static data (no real attendance)
    return [];
  }

  const today = new Date().toISOString().split('T')[0];

  const { data, error } = await supabaseAdmin!
    .from('attendance')
    .select(`
      *,
      employees(full_name, employee_id, position),
      check_in_branch:branches!attendance_check_in_branch_id_fkey(name),
      check_out_branch:branches!attendance_check_out_branch_id_fkey(name)
    `)
    .eq('date', today)
    .order('check_in', { ascending: false });

  if (error) {
    console.error('Error fetching today attendance:', error);
    return [];
  }

  return data || [];
}

export async function getAttendanceByDate(date: string): Promise<Attendance[]> {
  if (!isSupabaseAdminConfigured()) {
    return [];
  }

  const { data, error } = await supabaseAdmin!
    .from('attendance')
    .select(`
      *,
      employees(full_name, employee_id, position),
      check_in_branch:branches!attendance_check_in_branch_id_fkey(name),
      check_out_branch:branches!attendance_check_out_branch_id_fkey(name)
    `)
    .eq('date', date)
    .order('check_in', { ascending: false });

  if (error) {
    console.error('Error fetching attendance by date:', error);
    return [];
  }

  return data || [];
}

export async function getAttendanceByEmployee(employeeId: string, days: number = 30): Promise<Attendance[]> {
  if (!isSupabaseAdminConfigured()) {
    return [];
  }

  const { data, error } = await supabaseAdmin!
    .from('attendance')
    .select(`
      *,
      check_in_branch:branches!attendance_check_in_branch_id_fkey(name),
      check_out_branch:branches!attendance_check_out_branch_id_fkey(name)
    `)
    .eq('employee_id', employeeId)
    .order('date', { ascending: false })
    .limit(days);

  if (error) {
    console.error('Error fetching employee attendance:', error);
    return [];
  }

  return data || [];
}

export async function getAttendanceStats(date?: string) {
  const targetDate = date || new Date().toISOString().split('T')[0];
  const attendance = await getAttendanceByDate(targetDate);
  const employees = await getEmployees();

  return {
    total: employees.length,
    present: attendance.filter(a => a.status === 'present').length,
    late: attendance.filter(a => a.status === 'late').length,
    earlyLeave: attendance.filter(a => a.status === 'early_leave').length,
    absent: employees.length - attendance.length,
    checkedOut: attendance.filter(a => a.check_out).length,
  };
}

// ============================================
// LEAVE REQUESTS
// ============================================

export async function getLeaveRequests(status?: string): Promise<LeaveRequest[]> {
  if (!isSupabaseAdminConfigured()) {
    return [];
  }

  let query = supabaseAdmin!
    .from('leave_requests')
    .select(`
      *,
      employees(full_name, employee_id, position)
    `)
    .order('created_at', { ascending: false });

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching leave requests:', error);
    return [];
  }

  return data || [];
}

export async function updateLeaveRequest(
  id: number,
  status: 'approved' | 'rejected',
  reviewedBy: string,
  note?: string
): Promise<boolean> {
  if (!isSupabaseAdminConfigured()) {
    return false;
  }

  const { error } = await supabaseAdmin!
    .from('leave_requests')
    .update({
      status,
      reviewed_by: reviewedBy,
      reviewed_at: new Date().toISOString(),
      review_note: note || null,
    })
    .eq('id', id);

  if (error) {
    console.error('Error updating leave request:', error);
    return false;
  }

  return true;
}
// Vercel deployment trigger - 20260116215036
