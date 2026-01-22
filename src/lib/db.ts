// Database access layer - uses Supabase when configured, falls back to static data
import { supabaseAdmin, isSupabaseAdminConfigured, Employee, Attendance, Branch, LeaveRequest } from './supabase';

// Get current date string in Tashkent timezone (UTC+5) - consistent with bot
function getTashkentDateString(): string {
  const now = new Date();
  const tashkentTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Tashkent' }));
  const year = tashkentTime.getFullYear();
  const month = String(tashkentTime.getMonth() + 1).padStart(2, '0');
  const day = String(tashkentTime.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

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
      employment_type: 'full-time',
      hire_date: e.hireDate || new Date().toISOString().split('T')[0],
    }));
  }

  const { data, error } = await supabaseAdmin!
    .from('employees')
    .select('*, branches(name)')
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
      employment_type: 'full-time',
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
        employment_type: 'full-time',
        hire_date: e.hireDate || new Date().toISOString().split('T')[0],
      }));
  }

  const { data, error } = await supabaseAdmin!
    .from('employees')
    .select('*, branches(name)')
    .eq('branch_id', branchId)
    .order('full_name');

  if (error) {
    console.error('Error fetching employees by branch:', error);
    return [];
  }

  return data || [];
}

export async function updateEmployee(
  id: string,
  updates: {
    full_name?: string;
    position?: string;
    level?: string;
    branch_id?: string | null;
    salary?: number;
    phone?: string | null;
    email?: string | null;
    status?: string;
    employment_type?: string;
    system_role?: string;
  }
): Promise<{ success: boolean; employee?: Employee; error?: string }> {
  if (!isSupabaseAdminConfigured()) {
    return { success: false, error: 'Database not configured' };
  }

  const { data, error } = await supabaseAdmin!
    .from('employees')
    .update(updates)
    .eq('id', id)
    .select('*, branches(name)')
    .single();

  if (error) {
    console.error('Error updating employee:', error);
    return { success: false, error: error.message };
  }

  return { success: true, employee: data };
}

export async function createEmployee(employeeData: {
  full_name: string;
  position: string;
  level?: string;
  branch_id?: string | null;
  salary?: number;
  phone?: string | null;
  email?: string | null;
  status?: string;
  employment_type?: string;
  hire_date?: string;
  system_role?: string;
}): Promise<{ success: boolean; employee?: Employee; error?: string }> {
  if (!isSupabaseAdminConfigured()) {
    return { success: false, error: 'Database not configured' };
  }

  // Generate employee_id based on name (e.g., "John Doe" -> "JD001")
  const nameParts = employeeData.full_name.trim().split(' ');
  const initials = nameParts.map(p => p.charAt(0).toUpperCase()).join('');

  // Get count of existing employees with similar initials
  const { count } = await supabaseAdmin!
    .from('employees')
    .select('*', { count: 'exact', head: true })
    .ilike('employee_id', `${initials}%`);

  const employeeId = `${initials}${String((count || 0) + 1).padStart(3, '0')}`;

  const { data, error } = await supabaseAdmin!
    .from('employees')
    .insert({
      employee_id: employeeId,
      full_name: employeeData.full_name,
      position: employeeData.position,
      level: employeeData.level || 'junior',
      branch_id: employeeData.branch_id || null,
      salary: employeeData.salary || 0,
      phone: employeeData.phone || null,
      email: employeeData.email || null,
      status: employeeData.status || 'active',
      employment_type: employeeData.employment_type || 'full-time',
      hire_date: employeeData.hire_date || new Date().toISOString().split('T')[0],
      system_role: employeeData.system_role || 'employee',
    })
    .select('*, branches(name)')
    .single();

  if (error) {
    console.error('Error creating employee:', error);
    return { success: false, error: error.message };
  }

  return { success: true, employee: data };
}

export async function deleteEmployee(id: string): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseAdminConfigured()) {
    return { success: false, error: 'Database not configured' };
  }

  // First, delete related wage entries
  await supabaseAdmin!
    .from('employee_wages')
    .delete()
    .eq('employee_id', id);

  // Then delete the employee
  const { error } = await supabaseAdmin!
    .from('employees')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting employee:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
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

// ============================================
// ATTENDANCE
// ============================================

export async function getTodayAttendance(): Promise<Attendance[]> {
  if (!isSupabaseAdminConfigured()) {
    // Return empty for static data (no real attendance)
    return [];
  }

  // Use Tashkent timezone for "today" - consistent with bot
  const today = getTashkentDateString();

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

  // Run all 3 queries in parallel for better performance
  const [todayResult, activeOvernightResult, checkoutOnDateResult] = await Promise.all([
    // Query 1: Get attendance records for the requested date
    supabaseAdmin!
      .from('attendance')
      .select(`
        *,
        employees(full_name, employee_id, position),
        check_in_branch:branches!attendance_check_in_branch_id_fkey(name),
        check_out_branch:branches!attendance_check_out_branch_id_fkey(name)
      `)
      .eq('date', date)
      .order('check_in', { ascending: false }),

    // Query 2: Fetch records that started on a previous day but are still active (no checkout)
    supabaseAdmin!
      .from('attendance')
      .select(`
        *,
        employees(full_name, employee_id, position),
        check_in_branch:branches!attendance_check_in_branch_id_fkey(name),
        check_out_branch:branches!attendance_check_out_branch_id_fkey(name)
      `)
      .lt('date', date)
      .is('check_out', null),

    // Query 3: Fetch records that checked out on the viewing date
    supabaseAdmin!
      .from('attendance')
      .select(`
        *,
        employees(full_name, employee_id, position),
        check_in_branch:branches!attendance_check_in_branch_id_fkey(name),
        check_out_branch:branches!attendance_check_out_branch_id_fkey(name)
      `)
      .lt('date', date)
      .not('check_out', 'is', null)
      .gte('check_out_timestamp', `${date}T00:00:00`)
      .lt('check_out_timestamp', `${date}T23:59:59`),
  ]);

  if (todayResult.error) {
    console.error('Error fetching attendance by date:', todayResult.error);
  }
  if (activeOvernightResult.error) {
    console.error('Error fetching active overnight attendance:', activeOvernightResult.error);
  }
  if (checkoutOnDateResult.error) {
    console.error('Error fetching checkout-on-date attendance:', checkoutOnDateResult.error);
  }

  const data = todayResult.data || [];
  const activeOvernightData = activeOvernightResult.data || [];
  const checkoutOnDateData = checkoutOnDateResult.data || [];

  // Mark overnight records and combine with today's records
  const overnightRecords = [
    ...activeOvernightData.map(record => ({
      ...record,
      is_overnight: true,
      overnight_from_date: record.date,
    })),
    ...checkoutOnDateData.map(record => ({
      ...record,
      is_overnight: true,
      overnight_from_date: record.date,
      is_checkout_day: true,
    })),
  ];

  // Filter out employees who already have a record for today (avoid duplicates)
  const todayEmployeeIds = new Set(data.map(r => r.employee_id));
  const filteredOvernightRecords = overnightRecords.filter(
    r => !todayEmployeeIds.has(r.employee_id)
  );

  return [...data, ...filteredOvernightRecords];
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
  // Use Tashkent timezone for default "today" - consistent with bot
  const targetDate = date || getTashkentDateString();
  const attendance = await getAttendanceByDate(targetDate);
  const employees = await getEmployees();
  // Only count active employees for attendance stats
  const activeEmployees = employees.filter(e => e.status === 'active');

  return {
    total: activeEmployees.length,
    // Present = currently in office (checked in but not checked out), includes both on-time and late arrivals
    present: attendance.filter(a => (a.status === 'present' || a.status === 'late') && !a.check_out).length,
    late: attendance.filter(a => a.status === 'late').length,
    earlyLeave: attendance.filter(a => a.status === 'early_leave').length,
    absent: activeEmployees.length - attendance.length,
    checkedOut: attendance.filter(a => a.check_out).length,
  };
}

// Get attendance for an employee within a date range (for monthly reports)
export async function getAttendanceByEmployeeAndMonth(
  employeeId: string,
  year: number,
  month: number
): Promise<Attendance[]> {
  if (!isSupabaseAdminConfigured()) {
    return [];
  }

  // Calculate start and end of month
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

  const { data, error } = await supabaseAdmin!
    .from('attendance')
    .select(`
      *,
      check_in_branch:branches!attendance_check_in_branch_id_fkey(name),
      check_out_branch:branches!attendance_check_out_branch_id_fkey(name)
    `)
    .eq('employee_id', employeeId)
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: true });

  if (error) {
    console.error('Error fetching monthly attendance:', error);
    return [];
  }

  return data || [];
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

// Get leave request by ID with employee telegram info (for notifications)
export async function getLeaveRequestWithTelegram(id: number): Promise<{
  id: number;
  employee_id: string;
  employee_name: string;
  telegram_id: string | null;
  start_date: string;
  end_date: string;
  reason: string | null;
  status: string;
  review_note: string | null;
} | null> {
  if (!isSupabaseAdminConfigured()) {
    return null;
  }

  const { data, error } = await supabaseAdmin!
    .from('leave_requests')
    .select(`
      id,
      employee_id,
      start_date,
      end_date,
      reason,
      status,
      review_note,
      employees(full_name, telegram_id)
    `)
    .eq('id', id)
    .single();

  if (error || !data) {
    console.error('Error fetching leave request:', error);
    return null;
  }

  return {
    id: data.id,
    employee_id: data.employee_id,
    employee_name: (data.employees as any)?.full_name || 'Unknown',
    telegram_id: (data.employees as any)?.telegram_id || null,
    start_date: data.start_date,
    end_date: data.end_date,
    reason: data.reason,
    status: data.status,
    review_note: data.review_note,
  };
}

// Get leave requests for a specific employee
export async function getLeaveRequestsByEmployee(employeeId: string): Promise<LeaveRequest[]> {
  if (!isSupabaseAdminConfigured()) {
    return [];
  }

  const { data, error } = await supabaseAdmin!
    .from('leave_requests')
    .select('*')
    .eq('employee_id', employeeId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching employee leave requests:', error);
    return [];
  }

  return data || [];
}

// Create a new leave request
export async function createLeaveRequest(request: {
  employee_id: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  reason: string;
}): Promise<{ success: boolean; request?: LeaveRequest; error?: string }> {
  if (!isSupabaseAdminConfigured()) {
    return { success: false, error: 'Database not configured' };
  }

  const { data, error } = await supabaseAdmin!
    .from('leave_requests')
    .insert({
      employee_id: request.employee_id,
      leave_type: request.leave_type,
      start_date: request.start_date,
      end_date: request.end_date,
      reason: request.reason,
      status: 'pending',
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating leave request:', error);
    return { success: false, error: error.message };
  }

  return { success: true, request: data };
}

// Get employee by email (for linking user to employee)
export async function getEmployeeByEmail(email: string): Promise<Employee | null> {
  if (!isSupabaseAdminConfigured()) {
    const { employees } = await import('@/data/employees');
    const emp = employees.find(e => e.email === email);
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
      employment_type: 'full-time',
      hire_date: emp.hireDate || new Date().toISOString().split('T')[0],
    };
  }

  const { data, error } = await supabaseAdmin!
    .from('employees')
    .select('*, branches(name)')
    .eq('email', email)
    .single();

  if (error) {
    console.error('Error fetching employee by email:', error);
    return null;
  }

  return data;
}

// Authenticate employee with email and password from database
export async function authenticateEmployee(email: string, password: string): Promise<Employee | null> {
  if (!isSupabaseAdminConfigured()) {
    // Fallback: no database configured
    return null;
  }

  const { data, error } = await supabaseAdmin!
    .from('employees')
    .select('*, branches(name)')
    .eq('email', email)
    .eq('password', password)
    .eq('status', 'active')
    .single();

  if (error) {
    // No matching employee found or other error
    return null;
  }

  return data;
}

// ============================================
// PAYSLIPS
// ============================================

export interface Payslip {
  id: string;
  employee_id: string;
  month: number;
  year: number;
  base_salary: number;
  bonuses: number;
  net_salary: number;
  status: 'draft' | 'approved' | 'paid';
  payment_date: string | null;
  created_at: string;
}

export async function getPayslipsByEmployee(employeeId: string): Promise<Payslip[]> {
  if (!isSupabaseAdminConfigured()) {
    // Return demo payslips for static data
    // Fixed monthly salary - no deductions or overtime calculations
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;
    const baseSalary = 8000000; // Fixed monthly salary

    return Array.from({ length: 6 }, (_, i) => {
      const month = currentMonth - i;
      const year = month <= 0 ? currentYear - 1 : currentYear;
      const adjustedMonth = month <= 0 ? month + 12 : month;

      // Occasional bonus (every 3rd month or so)
      const hasBonus = i % 3 === 0 && i > 0;
      const bonuses = hasBonus ? 1000000 : 0;

      return {
        id: `payslip-${i}`,
        employee_id: employeeId,
        month: adjustedMonth,
        year: year,
        base_salary: baseSalary,
        bonuses: bonuses,
        net_salary: baseSalary + bonuses,
        status: i === 0 ? 'approved' : 'paid',
        payment_date: i === 0 ? null : `${year}-${String(adjustedMonth).padStart(2, '0')}-25`,
        created_at: new Date().toISOString(),
      };
    });
  }

  const { data, error } = await supabaseAdmin!
    .from('payslips')
    .select('*')
    .eq('employee_id', employeeId)
    .order('year', { ascending: false })
    .order('month', { ascending: false });

  if (error) {
    console.error('Error fetching payslips:', error);
    return [];
  }

  return data || [];
}

// Extended payslip with employee info for payroll page
export interface PayrollRecord {
  id: string;
  employee_id: string;
  employee_name: string;
  employee_position: string;
  legal_entity: string;        // Entity/Branch name
  wage_category: 'primary' | 'additional';  // Primary (bank) or Additional (cash)
  month: number;
  year: number;
  gross_salary: number;  // Before tax (same as net for Additional wages)
  bonuses: number;
  deductions: number;    // Tax amount (0 for Additional wages)
  net_salary: number;    // What employee receives (the amount you imported)
  status: 'draft' | 'approved' | 'paid';
  payment_date: string | null;
}

// Tax rate - 12% is added ON TOP of net salary
const TAX_RATE = 0.12;

// Calculate gross from net: gross = net / (1 - tax_rate) or net * 1.136 approximately
// But since tax is ON TOP of net: gross = net + (net * tax_rate) = net * 1.12
function calculateGrossFromNet(netSalary: number): number {
  return Math.round(netSalary * (1 + TAX_RATE));
}

function calculateTaxFromNet(netSalary: number): number {
  return Math.round(netSalary * TAX_RATE);
}

// Get all payroll records for a specific month/year
// Uses employee_wages (Primary/bank) and employee_branch_wages (Additional/cash) tables
export async function getPayrollByMonth(year: number, month: number): Promise<PayrollRecord[]> {
  if (!isSupabaseAdminConfigured()) {
    return [];
  }

  // Get all employees
  const employees = await getEmployees();

  // Get all PRIMARY wages (bank - from legal entities)
  const { data: primaryWages, error: primaryError } = await supabaseAdmin!
    .from('employee_wages')
    .select('*, legal_entities(id, name, short_name)')
    .eq('is_active', true);

  if (primaryError) {
    console.error('Error fetching primary wages:', primaryError);
  }

  // Get all ADDITIONAL wages (cash - from branches)
  const { data: additionalWages, error: additionalError } = await supabaseAdmin!
    .from('employee_branch_wages')
    .select('*, branches(id, name)')
    .eq('is_active', true);

  if (additionalError) {
    console.error('Error fetching additional wages:', additionalError);
  }

  // Get existing payslips for this month (to check status)
  const { data: payslips, error: payslipsError } = await supabaseAdmin!
    .from('payslips')
    .select('*')
    .eq('year', year)
    .eq('month', month);

  if (payslipsError) {
    console.error('Error fetching payslips:', payslipsError);
  }

  const payslipMap = new Map((payslips || []).map(p => [p.employee_id, p]));
  const employeeMap = new Map(employees.map(e => [e.id, e]));

  // Build payroll records from PRIMARY wages (with 12% tax)
  const seenPrimaryKeys = new Set<string>();
  const uniquePrimaryWages = (primaryWages || []).filter(wage => {
    const key = `${wage.employee_id}-${wage.legal_entity_id}`;
    if (seenPrimaryKeys.has(key)) {
      return false;
    }
    seenPrimaryKeys.add(key);
    return true;
  });

  const primaryRecords: PayrollRecord[] = uniquePrimaryWages.map(wage => {
    const employee = employeeMap.get(wage.employee_id);
    const payslip = payslipMap.get(wage.employee_id);
    const netSalary = wage.wage_amount || 0;
    const grossSalary = calculateGrossFromNet(netSalary);  // 12% tax applied
    const tax = calculateTaxFromNet(netSalary);

    return {
      id: payslip?.id || `primary-${wage.id}-${year}-${month}`,
      employee_id: wage.employee_id,
      employee_name: employee?.full_name || 'Unknown',
      employee_position: employee?.position || '',
      legal_entity: wage.legal_entities?.short_name || wage.legal_entities?.name || '-',
      wage_category: 'primary' as const,
      month,
      year,
      gross_salary: grossSalary,
      bonuses: payslip?.bonuses || 0,
      deductions: tax,
      net_salary: netSalary,
      status: payslip?.status || 'draft',
      payment_date: payslip?.payment_date || null,
    };
  });

  // Build payroll records from ADDITIONAL wages (NO tax - cash as-is)
  const seenAdditionalKeys = new Set<string>();
  const uniqueAdditionalWages = (additionalWages || []).filter(wage => {
    const key = `${wage.employee_id}-${wage.branch_id}`;
    if (seenAdditionalKeys.has(key)) {
      return false;
    }
    seenAdditionalKeys.add(key);
    return true;
  });

  const additionalRecords: PayrollRecord[] = uniqueAdditionalWages.map(wage => {
    const employee = employeeMap.get(wage.employee_id);
    const payslip = payslipMap.get(wage.employee_id);
    const netSalary = wage.wage_amount || 0;
    // NO tax for Additional wages - gross = net, deductions = 0

    return {
      id: `additional-${wage.id}-${year}-${month}`,
      employee_id: wage.employee_id,
      employee_name: employee?.full_name || 'Unknown',
      employee_position: employee?.position || '',
      legal_entity: wage.branches?.name || '-',
      wage_category: 'additional' as const,
      month,
      year,
      gross_salary: netSalary,  // Same as net (no tax)
      bonuses: 0,
      deductions: 0,  // NO tax for cash wages
      net_salary: netSalary,
      status: payslip?.status || 'draft',
      payment_date: payslip?.payment_date || null,
    };
  });

  // Combine and sort by net salary descending
  const allRecords = [...primaryRecords, ...additionalRecords];
  return allRecords.sort((a, b) => b.net_salary - a.net_salary);
}

// Get payroll statistics for a month
export async function getPayrollStats(year: number, month: number) {
  const payroll = await getPayrollByMonth(year, month);

  // Separate Primary and Additional wages
  const primaryPayroll = payroll.filter(p => p.wage_category === 'primary');
  const additionalPayroll = payroll.filter(p => p.wage_category === 'additional');

  // Get unique employee count (employees may have both Primary and Additional wages)
  const uniqueEmployeeIds = new Set(payroll.map(p => p.employee_id));

  return {
    totalGross: payroll.reduce((sum, p) => sum + p.gross_salary + p.bonuses, 0),
    totalDeductions: payroll.reduce((sum, p) => sum + p.deductions, 0),
    totalNet: payroll.reduce((sum, p) => sum + p.net_salary, 0),
    // Primary wages breakdown (bank, with 12% tax)
    primaryGross: primaryPayroll.reduce((sum, p) => sum + p.gross_salary, 0),
    primaryNet: primaryPayroll.reduce((sum, p) => sum + p.net_salary, 0),
    primaryTax: primaryPayroll.reduce((sum, p) => sum + p.deductions, 0),
    // Additional wages breakdown (cash, no tax)
    additionalTotal: additionalPayroll.reduce((sum, p) => sum + p.net_salary, 0),
    // Status counts
    paid: payroll.filter(p => p.status === 'paid').length,
    approved: payroll.filter(p => p.status === 'approved').length,
    draft: payroll.filter(p => p.status === 'draft').length,
    totalRecords: payroll.length,
    totalEmployees: uniqueEmployeeIds.size,
  };
}

// Get employee attendance summary for a given month
export async function getEmployeeAttendanceSummary(employeeId: string, year: number, month: number) {
  const attendance = await getAttendanceByEmployeeAndMonth(employeeId, year, month);

  const workingDays = getWorkingDaysInMonth(year, month);
  const presentDays = attendance.filter(a => a.status === 'present' || a.status === 'late').length;
  const lateDays = attendance.filter(a => a.status === 'late').length;
  const absentDays = workingDays - presentDays;
  const totalHours = attendance.reduce((sum, a) => sum + (a.total_hours || 0), 0);
  const avgHoursPerDay = presentDays > 0 ? totalHours / presentDays : 0;

  return {
    workingDays,
    presentDays,
    lateDays,
    absentDays,
    totalHours: Math.round(totalHours * 10) / 10,
    avgHoursPerDay: Math.round(avgHoursPerDay * 10) / 10,
  };
}

function getWorkingDaysInMonth(year: number, month: number): number {
  const daysInMonth = new Date(year, month, 0).getDate();
  let workingDays = 0;

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month - 1, day);
    const dayOfWeek = date.getDay();
    // Monday = 1, Sunday = 0, Saturday = 6
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      workingDays++;
    }
  }

  return workingDays;
}

// Get weekly attendance summary for the current week from database
export async function getWeeklyAttendanceSummary(totalEmployees: number) {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  // Use Tashkent timezone for "today" - consistent with bot
  const now = new Date();
  const tashkentNow = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Tashkent' }));
  const today = tashkentNow;

  // Get start of week (Monday) in Tashkent timezone
  const dayOfWeek = today.getDay();
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Adjust for Sunday = 0
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() + diff);
  startOfWeek.setHours(0, 0, 0, 0);

  // Ensure total is at least 1 to avoid division by zero
  const safeTotal = Math.max(1, totalEmployees);

  // Build list of dates that need fetching
  const datesToFetch: { index: number; dateStr: string; dayName: string }[] = [];
  const weekData: { day: string; date: string; present: number; late: number; absent: number; total: number }[] = [];

  for (let i = 0; i < 7; i++) {
    const currentDate = new Date(startOfWeek);
    currentDate.setDate(startOfWeek.getDate() + i);
    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, '0');
    const day = String(currentDate.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;

    const isWeekend = currentDate.getDay() === 0 || currentDate.getDay() === 6;
    const isPastOrToday = currentDate <= today;

    if (isPastOrToday && !isWeekend) {
      datesToFetch.push({ index: i, dateStr, dayName: days[i] });
    } else {
      // Future dates or weekends - no data needed
      weekData[i] = {
        day: days[i],
        date: dateStr,
        present: 0,
        late: 0,
        absent: isWeekend ? 0 : safeTotal,
        total: safeTotal,
      };
    }
  }

  // Fetch all weekday attendance in parallel
  if (datesToFetch.length > 0) {
    const attendanceResults = await Promise.all(
      datesToFetch.map(d => getAttendanceByDate(d.dateStr))
    );

    datesToFetch.forEach((d, idx) => {
      const attendance = attendanceResults[idx];
      const present = attendance.filter(a => a.status === 'present').length;
      const late = attendance.filter(a => a.status === 'late').length;
      const earlyLeave = attendance.filter(a => a.status === 'early_leave').length;
      const absent = safeTotal - present - late - earlyLeave;

      weekData[d.index] = {
        day: d.dayName,
        date: d.dateStr,
        present,
        late,
        absent: Math.max(0, absent),
        total: safeTotal,
      };
    });
  }

  // Sort by index to maintain correct order
  return weekData.filter(Boolean);
}

// ============================================
// LEGAL ENTITIES
// ============================================

export interface LegalEntity {
  id: string;
  name: string;
  short_name: string | null;
  inn: string | null;
  address: string | null;
  bank_name: string | null;
  bank_account: string | null;
  mfo: string | null;
  oked: string | null;
  nds_code: string | null;
  director_name: string | null;
  director_employee_id: string | null;
  branch_id: string | null;
  status: string;
  created_at?: string;
  updated_at?: string;
  branches?: { name: string };
}

export async function getLegalEntities(): Promise<LegalEntity[]> {
  if (!isSupabaseAdminConfigured()) {
    return [];
  }

  const { data, error } = await supabaseAdmin!
    .from('legal_entities')
    .select('*, branches(name)')
    .eq('status', 'active')
    .order('name');

  if (error) {
    console.error('Error fetching legal entities:', error);
    return [];
  }

  return data || [];
}

export async function getLegalEntityById(id: string): Promise<LegalEntity | null> {
  if (!isSupabaseAdminConfigured()) {
    return null;
  }

  const { data, error } = await supabaseAdmin!
    .from('legal_entities')
    .select('*, branches(name)')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching legal entity:', error);
    return null;
  }

  return data;
}

export async function createLegalEntity(entity: {
  name: string;
  short_name?: string;
  inn?: string;
  address?: string;
  bank_name?: string;
  bank_account?: string;
  mfo?: string;
  oked?: string;
  nds_code?: string;
  director_name?: string;
  branch_id?: string;
}): Promise<{ success: boolean; entity?: LegalEntity; error?: string }> {
  if (!isSupabaseAdminConfigured()) {
    return { success: false, error: 'Database not configured' };
  }

  // Generate ID from name
  const id = entity.name
    .toLowerCase()
    .replace(/[«»""'']/g, '')
    .replace(/ооо|сп\s*/gi, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    || `entity-${Date.now()}`;

  const { data, error } = await supabaseAdmin!
    .from('legal_entities')
    .insert({
      id,
      name: entity.name,
      short_name: entity.short_name || null,
      inn: entity.inn || null,
      address: entity.address || null,
      bank_name: entity.bank_name || null,
      bank_account: entity.bank_account || null,
      mfo: entity.mfo || null,
      oked: entity.oked || null,
      nds_code: entity.nds_code || null,
      director_name: entity.director_name || null,
      branch_id: entity.branch_id || null,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating legal entity:', error);
    return { success: false, error: error.message };
  }

  return { success: true, entity: data };
}

export async function updateLegalEntity(
  id: string,
  updates: Partial<LegalEntity>
): Promise<{ success: boolean; entity?: LegalEntity; error?: string }> {
  if (!isSupabaseAdminConfigured()) {
    return { success: false, error: 'Database not configured' };
  }

  const { data, error } = await supabaseAdmin!
    .from('legal_entities')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating legal entity:', error);
    return { success: false, error: error.message };
  }

  return { success: true, entity: data };
}

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

// ============================================
// PAYMENT REQUESTS (Advance & Wage Payments)
// ============================================

export interface PaymentRequest {
  id: string;
  request_type: 'advance' | 'wage';
  year: number;
  month: number;
  legal_entity_id: string | null;
  total_amount: number;
  employee_count: number;
  status: 'draft' | 'pending_approval' | 'approved' | 'rejected' | 'paid';
  created_by: string;
  submitted_at: string | null;
  approved_by: string | null;
  approved_at: string | null;
  rejection_reason: string | null;
  paid_at: string | null;
  payment_reference: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  legal_entities?: LegalEntity;
  items?: PaymentRequestItem[];
}

export interface PaymentRequestItem {
  id: string;
  payment_request_id: string;
  employee_id: string;
  legal_entity_id: string | null;
  amount: number;
  net_salary: number | null;
  advance_paid: number;
  notes: string | null;
  created_at: string;
  employees?: Employee;
  legal_entities?: LegalEntity;
}

// Get all payment requests for a month
export async function getPaymentRequests(year: number, month: number, requestType?: 'advance' | 'wage'): Promise<PaymentRequest[]> {
  if (!isSupabaseAdminConfigured()) {
    return [];
  }

  let query = supabaseAdmin!
    .from('payment_requests')
    .select('*, legal_entities(id, name, short_name)')
    .eq('year', year)
    .eq('month', month)
    .order('created_at', { ascending: false });

  if (requestType) {
    query = query.eq('request_type', requestType);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching payment requests:', error);
    return [];
  }

  return data || [];
}

// Get a single payment request with items
export async function getPaymentRequestById(id: string): Promise<PaymentRequest | null> {
  if (!isSupabaseAdminConfigured()) {
    return null;
  }

  const { data, error } = await supabaseAdmin!
    .from('payment_requests')
    .select(`
      *,
      legal_entities(id, name, short_name),
      payment_request_items(
        *,
        employees(id, full_name, position, employee_id),
        legal_entities(id, name, short_name)
      )
    `)
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching payment request:', error);
    return null;
  }

  return {
    ...data,
    items: data.payment_request_items || [],
  };
}

// Create a new payment request
export async function createPaymentRequest(request: {
  request_type: 'advance' | 'wage';
  year: number;
  month: number;
  legal_entity_id?: string;
  created_by: string;
  notes?: string;
  items: {
    employee_id: string;
    legal_entity_id?: string;
    amount: number;
    net_salary?: number;
    advance_paid?: number;
    notes?: string;
  }[];
}): Promise<{ success: boolean; request?: PaymentRequest; error?: string }> {
  if (!isSupabaseAdminConfigured()) {
    return { success: false, error: 'Database not configured' };
  }

  const totalAmount = request.items.reduce((sum, item) => sum + item.amount, 0);

  // Create the payment request
  const { data: requestData, error: requestError } = await supabaseAdmin!
    .from('payment_requests')
    .insert({
      request_type: request.request_type,
      year: request.year,
      month: request.month,
      legal_entity_id: request.legal_entity_id || null,
      total_amount: totalAmount,
      employee_count: request.items.length,
      status: 'draft',
      created_by: request.created_by,
      notes: request.notes || null,
    })
    .select()
    .single();

  if (requestError) {
    console.error('Error creating payment request:', requestError);
    return { success: false, error: requestError.message };
  }

  // Create the items
  const itemsToInsert = request.items.map(item => ({
    payment_request_id: requestData.id,
    employee_id: item.employee_id,
    legal_entity_id: item.legal_entity_id || null,
    amount: item.amount,
    net_salary: item.net_salary || null,
    advance_paid: item.advance_paid || 0,
    notes: item.notes || null,
  }));

  const { error: itemsError } = await supabaseAdmin!
    .from('payment_request_items')
    .insert(itemsToInsert);

  if (itemsError) {
    console.error('Error creating payment request items:', itemsError);
    // Clean up the request if items failed
    await supabaseAdmin!.from('payment_requests').delete().eq('id', requestData.id);
    return { success: false, error: itemsError.message };
  }

  return { success: true, request: requestData };
}

// Submit payment request for approval (HR -> GM)
export async function submitPaymentRequest(id: string): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseAdminConfigured()) {
    return { success: false, error: 'Database not configured' };
  }

  const { error } = await supabaseAdmin!
    .from('payment_requests')
    .update({
      status: 'pending_approval',
      submitted_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('status', 'draft');

  if (error) {
    console.error('Error submitting payment request:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

// Approve payment request (GM)
export async function approvePaymentRequest(id: string, approvedBy: string): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseAdminConfigured()) {
    return { success: false, error: 'Database not configured' };
  }

  const { error } = await supabaseAdmin!
    .from('payment_requests')
    .update({
      status: 'approved',
      approved_by: approvedBy,
      approved_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('status', 'pending_approval');

  if (error) {
    console.error('Error approving payment request:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

// Reject payment request (GM)
export async function rejectPaymentRequest(id: string, rejectedBy: string, reason: string): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseAdminConfigured()) {
    return { success: false, error: 'Database not configured' };
  }

  const { error } = await supabaseAdmin!
    .from('payment_requests')
    .update({
      status: 'rejected',
      approved_by: rejectedBy,
      approved_at: new Date().toISOString(),
      rejection_reason: reason,
    })
    .eq('id', id)
    .eq('status', 'pending_approval');

  if (error) {
    console.error('Error rejecting payment request:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

// Mark payment request as paid
export async function markPaymentRequestPaid(id: string, paymentReference?: string): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseAdminConfigured()) {
    return { success: false, error: 'Database not configured' };
  }

  // First get the request details
  const request = await getPaymentRequestById(id);
  if (!request) {
    return { success: false, error: 'Payment request not found' };
  }

  // Update the request
  const { error } = await supabaseAdmin!
    .from('payment_requests')
    .update({
      status: 'paid',
      paid_at: new Date().toISOString(),
      payment_reference: paymentReference || null,
    })
    .eq('id', id)
    .eq('status', 'approved');

  if (error) {
    console.error('Error marking payment as paid:', error);
    return { success: false, error: error.message };
  }

  // Update payslips with advance/wage paid amounts
  if (request.items) {
    for (const item of request.items) {
      const columnToUpdate = request.request_type === 'advance' ? 'advance_paid' : 'wage_paid';

      // Get or create payslip for this employee/month
      const { data: existingPayslip } = await supabaseAdmin!
        .from('payslips')
        .select('id, advance_paid, wage_paid')
        .eq('employee_id', item.employee_id)
        .eq('year', request.year)
        .eq('month', request.month)
        .single();

      if (existingPayslip) {
        // Update existing payslip
        const currentValue = (existingPayslip as Record<string, number>)[columnToUpdate] || 0;
        await supabaseAdmin!
          .from('payslips')
          .update({ [columnToUpdate]: currentValue + item.amount })
          .eq('id', existingPayslip.id);
      } else {
        // Create new payslip
        await supabaseAdmin!
          .from('payslips')
          .insert({
            employee_id: item.employee_id,
            year: request.year,
            month: request.month,
            base_salary: item.net_salary || 0,
            bonuses: 0,
            deductions: 0,
            net_salary: item.net_salary || 0,
            [columnToUpdate]: item.amount,
            status: 'draft',
          });
      }
    }
  }

  return { success: true };
}

// Get advance payments summary for an employee in a month
export async function getEmployeeAdvancePaid(employeeId: string, year: number, month: number): Promise<number> {
  if (!isSupabaseAdminConfigured()) {
    return 0;
  }

  const { data, error } = await supabaseAdmin!
    .from('payment_request_items')
    .select(`
      amount,
      payment_requests!inner(
        year,
        month,
        request_type,
        status
      )
    `)
    .eq('employee_id', employeeId)
    .eq('payment_requests.year', year)
    .eq('payment_requests.month', month)
    .eq('payment_requests.request_type', 'advance')
    .eq('payment_requests.status', 'paid');

  if (error) {
    console.error('Error fetching employee advance paid:', error);
    return 0;
  }

  return (data || []).reduce((sum, item) => sum + (item.amount || 0), 0);
}

// Get payment request summary for payroll page
export async function getPaymentRequestsSummary(year: number, month: number) {
  const requests = await getPaymentRequests(year, month);

  const advanceRequests = requests.filter(r => r.request_type === 'advance');
  const wageRequests = requests.filter(r => r.request_type === 'wage');

  const getStatusSummary = (reqs: PaymentRequest[]) => ({
    draft: reqs.filter(r => r.status === 'draft').length,
    pending: reqs.filter(r => r.status === 'pending_approval').length,
    approved: reqs.filter(r => r.status === 'approved').length,
    rejected: reqs.filter(r => r.status === 'rejected').length,
    paid: reqs.filter(r => r.status === 'paid').length,
    totalAmount: reqs.reduce((sum, r) => sum + Number(r.total_amount), 0),
    paidAmount: reqs.filter(r => r.status === 'paid').reduce((sum, r) => sum + Number(r.total_amount), 0),
  });

  return {
    advance: getStatusSummary(advanceRequests),
    wage: getStatusSummary(wageRequests),
    requests,
  };
}

// Get paid advance amounts per employee for a given month
export async function getPaidAdvancesByEmployee(year: number, month: number): Promise<Record<string, number>> {
  if (!isSupabaseAdminConfigured()) {
    return {};
  }

  // Get all paid advance requests for this month
  const { data: requests, error: reqError } = await supabaseAdmin!
    .from('payment_requests')
    .select('id')
    .eq('year', year)
    .eq('month', month)
    .eq('request_type', 'advance')
    .eq('status', 'paid');

  if (reqError || !requests || requests.length === 0) {
    return {};
  }

  const requestIds = requests.map(r => r.id);

  // Get all items from paid advance requests
  const { data: items, error: itemsError } = await supabaseAdmin!
    .from('payment_request_items')
    .select('employee_id, amount')
    .in('payment_request_id', requestIds);

  if (itemsError || !items) {
    return {};
  }

  // Sum amounts per employee
  const paidAdvances: Record<string, number> = {};
  for (const item of items) {
    const empId = item.employee_id;
    paidAdvances[empId] = (paidAdvances[empId] || 0) + Number(item.amount);
  }

  return paidAdvances;
}

// Get employee's payment history
export async function getEmployeePaymentHistory(employeeId: string) {
  if (!isSupabaseAdminConfigured()) {
    return { payments: [], pending: [] };
  }

  // Get all payment request items for this employee
  const { data: items, error } = await supabaseAdmin!
    .from('payment_request_items')
    .select(`
      id,
      amount,
      net_salary,
      created_at,
      payment_request_id,
      payment_requests (
        id,
        request_type,
        year,
        month,
        status,
        submitted_at,
        approved_at,
        paid_at,
        payment_reference
      )
    `)
    .eq('employee_id', employeeId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching employee payments:', error);
    return { payments: [], pending: [] };
  }

  // Filter to only paid items
  const payments = (items || [])
    .filter((p: any) => p.payment_requests?.status === 'paid')
    .map((p: any) => ({
      id: p.id,
      amount: p.amount,
      net_salary: p.net_salary,
      type: p.payment_requests?.request_type,
      year: p.payment_requests?.year,
      month: p.payment_requests?.month,
      paid_at: p.payment_requests?.paid_at,
      payment_reference: p.payment_requests?.payment_reference,
    }));

  // Get pending payments (approved but not paid yet)
  const pending = (items || [])
    .filter((p: any) => ['approved', 'pending_approval'].includes(p.payment_requests?.status))
    .map((p: any) => ({
      id: p.id,
      amount: p.amount,
      net_salary: p.net_salary,
      type: p.payment_requests?.request_type,
      year: p.payment_requests?.year,
      month: p.payment_requests?.month,
      status: p.payment_requests?.status,
      submitted_at: p.payment_requests?.submitted_at,
      approved_at: p.payment_requests?.approved_at,
    }));

  return { payments, pending };
}

// Get payment request items with employee telegram IDs for notifications
export async function getPaymentRequestItemsWithTelegram(requestId: string): Promise<{
  request: {
    id: string;
    request_type: 'advance' | 'wage';
    year: number;
    month: number;
    status: string;
    rejection_reason?: string;
    payment_reference?: string;
  } | null;
  items: Array<{
    id: string;
    employee_id: string;
    employee_name: string;
    telegram_id: string | null;
    amount: number;
    net_salary: number;
  }>;
}> {
  if (!isSupabaseAdminConfigured()) {
    return { request: null, items: [] };
  }

  // First get the payment request
  const { data: request, error: requestError } = await supabaseAdmin!
    .from('payment_requests')
    .select('id, request_type, year, month, status, rejection_reason, payment_reference')
    .eq('id', requestId)
    .single();

  if (requestError || !request) {
    console.error('Error fetching payment request:', requestError);
    return { request: null, items: [] };
  }

  // Get items with employee telegram IDs
  const { data: items, error: itemsError } = await supabaseAdmin!
    .from('payment_request_items')
    .select(`
      id,
      employee_id,
      amount,
      net_salary,
      employees(id, full_name, telegram_id)
    `)
    .eq('payment_request_id', requestId);

  if (itemsError) {
    console.error('Error fetching payment request items:', itemsError);
    return { request, items: [] };
  }

  const formattedItems = (items || []).map((item: any) => ({
    id: item.id,
    employee_id: item.employee_id,
    employee_name: item.employees?.full_name || 'Unknown',
    telegram_id: item.employees?.telegram_id || null,
    amount: item.amount,
    net_salary: item.net_salary || 0,
  }));

  return { request, items: formattedItems };
}

// ============================================
// EMPLOYEE DOCUMENTS
// ============================================

export interface EmployeeDocument {
  id: string;
  employee_id: string;
  document_type: 'term_sheet' | 'contract' | 'passport' | 'id_card' | 'diploma' | 'other';
  file_name: string;
  file_path: string;
  file_size: number;
  mime_type: string | null;
  uploaded_by: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export const DOCUMENT_TYPES = [
  { value: 'term_sheet', label: 'Term Sheet' },
  { value: 'contract', label: 'Employment Contract' },
  { value: 'passport', label: 'Passport' },
  { value: 'id_card', label: 'ID Card' },
  { value: 'diploma', label: 'Diploma/Certificate' },
  { value: 'other', label: 'Other' },
] as const;

export type DocumentType = typeof DOCUMENT_TYPES[number]['value'];

export async function getEmployeeDocuments(employeeId: string): Promise<EmployeeDocument[]> {
  if (!isSupabaseAdminConfigured()) {
    return [];
  }

  const { data, error } = await supabaseAdmin!
    .from('employee_documents')
    .select('*')
    .eq('employee_id', employeeId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching employee documents:', error);
    return [];
  }

  return data || [];
}

export async function addEmployeeDocument(document: {
  employee_id: string;
  document_type: DocumentType;
  file_name: string;
  file_path: string;
  file_size: number;
  mime_type?: string;
  uploaded_by?: string;
  notes?: string;
}): Promise<{ success: boolean; document?: EmployeeDocument; error?: string }> {
  if (!isSupabaseAdminConfigured()) {
    return { success: false, error: 'Database not configured' };
  }

  const { data, error } = await supabaseAdmin!
    .from('employee_documents')
    .insert({
      employee_id: document.employee_id,
      document_type: document.document_type,
      file_name: document.file_name,
      file_path: document.file_path,
      file_size: document.file_size,
      mime_type: document.mime_type || null,
      uploaded_by: document.uploaded_by || null,
      notes: document.notes || null,
    })
    .select()
    .single();

  if (error) {
    console.error('Error adding employee document:', error);
    return { success: false, error: error.message };
  }

  return { success: true, document: data };
}

export async function getEmployeeDocumentById(documentId: string): Promise<EmployeeDocument | null> {
  if (!isSupabaseAdminConfigured()) {
    return null;
  }

  const { data, error } = await supabaseAdmin!
    .from('employee_documents')
    .select('*')
    .eq('id', documentId)
    .single();

  if (error) {
    console.error('Error fetching document:', error);
    return null;
  }

  return data;
}

export async function deleteEmployeeDocument(documentId: string): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseAdminConfigured()) {
    return { success: false, error: 'Database not configured' };
  }

  const { error } = await supabaseAdmin!
    .from('employee_documents')
    .delete()
    .eq('id', documentId);

  if (error) {
    console.error('Error deleting document:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

export async function updateEmployeeDocumentNotes(
  documentId: string,
  notes: string
): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseAdminConfigured()) {
    return { success: false, error: 'Database not configured' };
  }

  const { error } = await supabaseAdmin!
    .from('employee_documents')
    .update({ notes, updated_at: new Date().toISOString() })
    .eq('id', documentId);

  if (error) {
    console.error('Error updating document notes:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

// ============================================
// TERMINATION REQUESTS
// ============================================

export interface TerminationRequest {
  id: string;
  employee_id: string;
  requested_by: string;
  reason: string;
  termination_date: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  approved_by: string | null;
  rejection_reason: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  approved_at: string | null;
  // Joined data
  employee?: {
    id: string;
    employee_id: string;
    full_name: string;
    position: string;
    branch_id: string | null;
    branches?: { name: string } | null;
  };
  requester?: {
    id: string;
    full_name: string;
  };
  approver?: {
    id: string;
    full_name: string;
  };
}

export async function createTerminationRequest(request: {
  employee_id: string;
  requested_by: string;
  reason: string;
  termination_date: string;
  notes?: string;
}): Promise<{ success: boolean; request?: TerminationRequest; error?: string }> {
  if (!isSupabaseAdminConfigured()) {
    return { success: false, error: 'Database not configured' };
  }

  // Check if there's already a pending request for this employee
  const { data: existing } = await supabaseAdmin!
    .from('termination_requests')
    .select('id')
    .eq('employee_id', request.employee_id)
    .eq('status', 'pending')
    .limit(1);

  if (existing && existing.length > 0) {
    return { success: false, error: 'A pending termination request already exists for this employee' };
  }

  const { data, error } = await supabaseAdmin!
    .from('termination_requests')
    .insert({
      employee_id: request.employee_id,
      requested_by: request.requested_by,
      reason: request.reason,
      termination_date: request.termination_date,
      notes: request.notes || null,
      status: 'pending',
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating termination request:', error);
    return { success: false, error: error.message };
  }

  return { success: true, request: data };
}

export async function getTerminationRequests(
  status?: string
): Promise<TerminationRequest[]> {
  if (!isSupabaseAdminConfigured()) {
    return [];
  }

  let query = supabaseAdmin!
    .from('termination_requests')
    .select(`
      *,
      employee:employees!termination_requests_employee_id_fkey(
        id, employee_id, full_name, position, branch_id,
        branches(name)
      ),
      requester:employees!termination_requests_requested_by_fkey(id, full_name),
      approver:employees!termination_requests_approved_by_fkey(id, full_name)
    `)
    .order('created_at', { ascending: false });

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching termination requests:', error);
    return [];
  }

  return data || [];
}

export async function getTerminationRequestById(id: string): Promise<TerminationRequest | null> {
  if (!isSupabaseAdminConfigured()) {
    return null;
  }

  const { data, error } = await supabaseAdmin!
    .from('termination_requests')
    .select(`
      *,
      employee:employees!termination_requests_employee_id_fkey(
        id, employee_id, full_name, position, branch_id,
        branches(name)
      ),
      requester:employees!termination_requests_requested_by_fkey(id, full_name),
      approver:employees!termination_requests_approved_by_fkey(id, full_name)
    `)
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching termination request:', error);
    return null;
  }

  return data;
}

export async function getEmployeePendingTermination(employeeId: string): Promise<TerminationRequest | null> {
  if (!isSupabaseAdminConfigured()) {
    return null;
  }

  const { data, error } = await supabaseAdmin!
    .from('termination_requests')
    .select('*')
    .eq('employee_id', employeeId)
    .eq('status', 'pending')
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
    console.error('Error fetching pending termination:', error);
  }

  return data || null;
}

export async function approveTerminationRequest(
  requestId: string,
  approvedBy: string
): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseAdminConfigured()) {
    return { success: false, error: 'Database not configured' };
  }

  // Get the request to find the employee
  const { data: request, error: fetchError } = await supabaseAdmin!
    .from('termination_requests')
    .select('employee_id, termination_date')
    .eq('id', requestId)
    .single();

  if (fetchError || !request) {
    return { success: false, error: 'Termination request not found' };
  }

  // Update request status
  const { error: updateError } = await supabaseAdmin!
    .from('termination_requests')
    .update({
      status: 'approved',
      approved_by: approvedBy,
      approved_at: new Date().toISOString(),
    })
    .eq('id', requestId);

  if (updateError) {
    console.error('Error approving termination request:', updateError);
    return { success: false, error: updateError.message };
  }

  // Update employee status to terminated
  const { error: employeeError } = await supabaseAdmin!
    .from('employees')
    .update({
      status: 'terminated',
      notes: `Terminated on ${request.termination_date}. Approved termination request.`,
    })
    .eq('id', request.employee_id);

  if (employeeError) {
    console.error('Error updating employee status:', employeeError);
    return { success: false, error: employeeError.message };
  }

  // Deactivate all wages for this employee
  await supabaseAdmin!
    .from('employee_wages')
    .update({ is_active: false })
    .eq('employee_id', request.employee_id);

  await supabaseAdmin!
    .from('employee_branch_wages')
    .update({ is_active: false })
    .eq('employee_id', request.employee_id);

  // Clear telegram_id to disable bot access
  await supabaseAdmin!
    .from('employees')
    .update({ telegram_id: null })
    .eq('id', request.employee_id);

  return { success: true };
}

export async function rejectTerminationRequest(
  requestId: string,
  rejectedBy: string,
  rejectionReason: string
): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseAdminConfigured()) {
    return { success: false, error: 'Database not configured' };
  }

  const { error } = await supabaseAdmin!
    .from('termination_requests')
    .update({
      status: 'rejected',
      approved_by: rejectedBy,
      rejection_reason: rejectionReason,
      approved_at: new Date().toISOString(),
    })
    .eq('id', requestId);

  if (error) {
    console.error('Error rejecting termination request:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

// ======================
// WAGE CHANGE REQUESTS
// ======================

export interface WageChangeRequest {
  id: string;
  employee_id: string;
  wage_type: 'primary' | 'additional';
  legal_entity_id: string | null;
  branch_id: string | null;
  current_amount: number;
  proposed_amount: number;
  change_type: 'increase' | 'decrease';
  reason: string;
  effective_date: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  requested_by: string;
  approved_by: string | null;
  rejection_reason: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  approved_at: string | null;
  // Joined fields
  employee?: { full_name: string; employee_id: string };
  requester?: { full_name: string };
  approver?: { full_name: string };
  legal_entity?: { name: string };
  branch?: { name: string };
}

export async function createWageChangeRequest(data: {
  employee_id: string;
  wage_type: 'primary' | 'additional';
  legal_entity_id?: string;
  branch_id?: string;
  current_amount: number;
  proposed_amount: number;
  reason: string;
  effective_date: string;
  requested_by: string;
  notes?: string;
}): Promise<{ success: boolean; request?: WageChangeRequest; error?: string }> {
  if (!isSupabaseAdminConfigured()) {
    return { success: false, error: 'Database not configured' };
  }

  // Validate wage type and reference
  if (data.wage_type === 'primary' && !data.legal_entity_id) {
    return { success: false, error: 'Legal entity is required for primary wage changes' };
  }
  if (data.wage_type === 'additional' && !data.branch_id) {
    return { success: false, error: 'Branch is required for additional wage changes' };
  }

  // Determine change type
  const change_type = data.proposed_amount > data.current_amount ? 'increase' : 'decrease';

  // Check for existing pending request for the same wage
  const { data: existingRequests } = await supabaseAdmin!
    .from('wage_change_requests')
    .select('id')
    .eq('employee_id', data.employee_id)
    .eq('wage_type', data.wage_type)
    .eq('status', 'pending')
    .eq(data.wage_type === 'primary' ? 'legal_entity_id' : 'branch_id',
        data.wage_type === 'primary' ? data.legal_entity_id : data.branch_id)
    .limit(1);

  if (existingRequests && existingRequests.length > 0) {
    return { success: false, error: 'There is already a pending wage change request for this wage' };
  }

  // Create the request
  const { data: request, error } = await supabaseAdmin!
    .from('wage_change_requests')
    .insert({
      employee_id: data.employee_id,
      wage_type: data.wage_type,
      legal_entity_id: data.legal_entity_id || null,
      branch_id: data.branch_id || null,
      current_amount: data.current_amount,
      proposed_amount: data.proposed_amount,
      change_type,
      reason: data.reason,
      effective_date: data.effective_date,
      requested_by: data.requested_by,
      notes: data.notes || null,
      status: 'pending',
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating wage change request:', error);
    return { success: false, error: error.message };
  }

  return { success: true, request };
}

export async function getWageChangeRequests(
  status?: string
): Promise<WageChangeRequest[]> {
  if (!isSupabaseAdminConfigured()) {
    return [];
  }

  let query = supabaseAdmin!
    .from('wage_change_requests')
    .select(`
      *,
      employee:employees!wage_change_requests_employee_id_fkey(full_name, employee_id),
      requester:employees!wage_change_requests_requested_by_fkey(full_name),
      approver:employees!wage_change_requests_approved_by_fkey(full_name),
      legal_entity:legal_entities!wage_change_requests_legal_entity_id_fkey(name),
      branch:branches!wage_change_requests_branch_id_fkey(name)
    `)
    .order('created_at', { ascending: false });

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching wage change requests:', error);
    return [];
  }

  return data || [];
}

export async function getWageChangeRequestById(
  requestId: string
): Promise<WageChangeRequest | null> {
  if (!isSupabaseAdminConfigured()) {
    return null;
  }

  const { data, error } = await supabaseAdmin!
    .from('wage_change_requests')
    .select(`
      *,
      employee:employees!wage_change_requests_employee_id_fkey(full_name, employee_id),
      requester:employees!wage_change_requests_requested_by_fkey(full_name),
      approver:employees!wage_change_requests_approved_by_fkey(full_name),
      legal_entity:legal_entities!wage_change_requests_legal_entity_id_fkey(name),
      branch:branches!wage_change_requests_branch_id_fkey(name)
    `)
    .eq('id', requestId)
    .single();

  if (error) {
    console.error('Error fetching wage change request:', error);
    return null;
  }

  return data;
}

export async function getEmployeePendingWageChanges(
  employeeId: string
): Promise<WageChangeRequest[]> {
  if (!isSupabaseAdminConfigured()) {
    return [];
  }

  const { data, error } = await supabaseAdmin!
    .from('wage_change_requests')
    .select(`
      *,
      legal_entity:legal_entities!wage_change_requests_legal_entity_id_fkey(name),
      branch:branches!wage_change_requests_branch_id_fkey(name),
      requester:employees!wage_change_requests_requested_by_fkey(full_name)
    `)
    .eq('employee_id', employeeId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching pending wage changes:', error);
    return [];
  }

  return data || [];
}

export async function approveWageChangeRequest(
  requestId: string,
  approvedBy: string
): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseAdminConfigured()) {
    return { success: false, error: 'Database not configured' };
  }

  // Fetch the request
  const { data: request, error: fetchError } = await supabaseAdmin!
    .from('wage_change_requests')
    .select('*')
    .eq('id', requestId)
    .single();

  if (fetchError || !request) {
    return { success: false, error: 'Wage change request not found' };
  }

  if (request.status !== 'pending') {
    return { success: false, error: 'This request has already been processed' };
  }

  // Update request status
  const { error: updateError } = await supabaseAdmin!
    .from('wage_change_requests')
    .update({
      status: 'approved',
      approved_by: approvedBy,
      approved_at: new Date().toISOString(),
    })
    .eq('id', requestId);

  if (updateError) {
    console.error('Error approving wage change request:', updateError);
    return { success: false, error: updateError.message };
  }

  // Update the actual wage
  if (request.wage_type === 'primary') {
    const { error: wageError } = await supabaseAdmin!
      .from('employee_wages')
      .update({ wage_amount: request.proposed_amount })
      .eq('employee_id', request.employee_id)
      .eq('legal_entity_id', request.legal_entity_id)
      .eq('is_active', true);

    if (wageError) {
      console.error('Error updating primary wage:', wageError);
      return { success: false, error: 'Request approved but failed to update wage: ' + wageError.message };
    }
  } else {
    const { error: wageError } = await supabaseAdmin!
      .from('employee_branch_wages')
      .update({ wage_amount: request.proposed_amount })
      .eq('employee_id', request.employee_id)
      .eq('branch_id', request.branch_id)
      .eq('is_active', true);

    if (wageError) {
      console.error('Error updating additional wage:', wageError);
      return { success: false, error: 'Request approved but failed to update wage: ' + wageError.message };
    }
  }

  return { success: true };
}

export async function rejectWageChangeRequest(
  requestId: string,
  rejectedBy: string,
  rejectionReason: string
): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseAdminConfigured()) {
    return { success: false, error: 'Database not configured' };
  }

  // Check request exists and is pending
  const { data: request, error: fetchError } = await supabaseAdmin!
    .from('wage_change_requests')
    .select('status')
    .eq('id', requestId)
    .single();

  if (fetchError || !request) {
    return { success: false, error: 'Wage change request not found' };
  }

  if (request.status !== 'pending') {
    return { success: false, error: 'This request has already been processed' };
  }

  const { error } = await supabaseAdmin!
    .from('wage_change_requests')
    .update({
      status: 'rejected',
      approved_by: rejectedBy,
      rejection_reason: rejectionReason,
      approved_at: new Date().toISOString(),
    })
    .eq('id', requestId);

  if (error) {
    console.error('Error rejecting wage change request:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

export async function cancelWageChangeRequest(
  requestId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseAdminConfigured()) {
    return { success: false, error: 'Database not configured' };
  }

  // Check request exists, is pending, and was requested by this user
  const { data: request, error: fetchError } = await supabaseAdmin!
    .from('wage_change_requests')
    .select('status, requested_by')
    .eq('id', requestId)
    .single();

  if (fetchError || !request) {
    return { success: false, error: 'Wage change request not found' };
  }

  if (request.status !== 'pending') {
    return { success: false, error: 'This request has already been processed' };
  }

  if (request.requested_by !== userId) {
    return { success: false, error: 'You can only cancel your own requests' };
  }

  const { error } = await supabaseAdmin!
    .from('wage_change_requests')
    .update({ status: 'cancelled' })
    .eq('id', requestId);

  if (error) {
    console.error('Error cancelling wage change request:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

// ============================================
// FEEDBACK SUBMISSIONS
// ============================================

export const FEEDBACK_CATEGORIES = [
  { value: 'work_environment', label: 'Work Environment' },
  { value: 'management', label: 'Management & Leadership' },
  { value: 'career', label: 'Career Development' },
  { value: 'compensation', label: 'Compensation & Benefits' },
  { value: 'suggestion', label: 'Suggestion / Idea' },
  { value: 'other', label: 'Other' },
] as const;

export type FeedbackCategory = typeof FEEDBACK_CATEGORIES[number]['value'];
export type FeedbackStatus = 'submitted' | 'read' | 'acknowledged';

export interface FeedbackSubmission {
  id: string;
  employee_id: string;
  is_anonymous: boolean;
  category: FeedbackCategory;
  feedback_text: string;
  rating: number | null;
  status: FeedbackStatus;
  read_by: string | null;
  read_at: string | null;
  acknowledged_by: string | null;
  acknowledged_at: string | null;
  response_note: string | null;
  created_at: string;
  updated_at: string;
  // Joined data (only visible if not anonymous)
  employee?: {
    full_name: string;
    employee_id: string;
    position: string;
  };
  reader?: { full_name: string };
  acknowledger?: { full_name: string };
}

export async function createFeedback(data: {
  employee_id: string;
  is_anonymous: boolean;
  category: FeedbackCategory;
  feedback_text: string;
  rating?: number | null;
}): Promise<{ success: boolean; feedback?: FeedbackSubmission; error?: string }> {
  if (!isSupabaseAdminConfigured()) {
    return { success: false, error: 'Database not configured' };
  }

  const { data: feedback, error } = await supabaseAdmin!
    .from('feedback_submissions')
    .insert({
      employee_id: data.employee_id,
      is_anonymous: data.is_anonymous,
      category: data.category,
      feedback_text: data.feedback_text,
      rating: data.rating || null,
      status: 'submitted',
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating feedback:', error);
    return { success: false, error: error.message };
  }

  return { success: true, feedback };
}

export async function getAllFeedback(status?: FeedbackStatus): Promise<FeedbackSubmission[]> {
  if (!isSupabaseAdminConfigured()) {
    return [];
  }

  let query = supabaseAdmin!
    .from('feedback_submissions')
    .select(`
      *,
      employee:employees!feedback_submissions_employee_id_fkey(full_name, employee_id, position),
      reader:employees!feedback_submissions_read_by_fkey(full_name),
      acknowledger:employees!feedback_submissions_acknowledged_by_fkey(full_name)
    `)
    .order('created_at', { ascending: false });

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching feedback:', error);
    return [];
  }

  // Hide employee info for anonymous feedback
  return (data || []).map(f => {
    if (f.is_anonymous) {
      return { ...f, employee: undefined };
    }
    return f;
  });
}

export async function getFeedbackById(id: string): Promise<FeedbackSubmission | null> {
  if (!isSupabaseAdminConfigured()) {
    return null;
  }

  const { data, error } = await supabaseAdmin!
    .from('feedback_submissions')
    .select(`
      *,
      employee:employees!feedback_submissions_employee_id_fkey(full_name, employee_id, position),
      reader:employees!feedback_submissions_read_by_fkey(full_name),
      acknowledger:employees!feedback_submissions_acknowledged_by_fkey(full_name)
    `)
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching feedback:', error);
    return null;
  }

  // Hide employee info for anonymous feedback
  if (data && data.is_anonymous) {
    return { ...data, employee: undefined };
  }

  return data;
}

export async function markFeedbackRead(
  id: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseAdminConfigured()) {
    return { success: false, error: 'Database not configured' };
  }

  const { error } = await supabaseAdmin!
    .from('feedback_submissions')
    .update({
      status: 'read',
      read_by: userId,
      read_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('status', 'submitted');

  if (error) {
    console.error('Error marking feedback as read:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

export async function acknowledgeFeedback(
  id: string,
  userId: string,
  responseNote?: string
): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseAdminConfigured()) {
    return { success: false, error: 'Database not configured' };
  }

  const { error } = await supabaseAdmin!
    .from('feedback_submissions')
    .update({
      status: 'acknowledged',
      acknowledged_by: userId,
      acknowledged_at: new Date().toISOString(),
      response_note: responseNote || null,
    })
    .eq('id', id)
    .in('status', ['submitted', 'read']);

  if (error) {
    console.error('Error acknowledging feedback:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

export async function getMyFeedback(employeeId: string): Promise<FeedbackSubmission[]> {
  if (!isSupabaseAdminConfigured()) {
    return [];
  }

  const { data, error } = await supabaseAdmin!
    .from('feedback_submissions')
    .select('*')
    .eq('employee_id', employeeId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching my feedback:', error);
    return [];
  }

  return data || [];
}

export async function getUnreadFeedbackCount(): Promise<number> {
  if (!isSupabaseAdminConfigured()) {
    return 0;
  }

  const { count, error } = await supabaseAdmin!
    .from('feedback_submissions')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'submitted');

  if (error) {
    console.error('Error fetching unread feedback count:', error);
    return 0;
  }

  return count || 0;
}

// Get GM's telegram_id for notifications
export async function getGMTelegramId(): Promise<string | null> {
  if (!isSupabaseAdminConfigured()) {
    return null;
  }

  const { data, error } = await supabaseAdmin!
    .from('employees')
    .select('telegram_id')
    .eq('system_role', 'general_manager')
    .eq('status', 'active')
    .not('telegram_id', 'is', null)
    .limit(1)
    .single();

  if (error) {
    console.error('Error fetching GM telegram ID:', error);
    return null;
  }

  return data?.telegram_id || null;
}

// ============================================
// CANDIDATES (Recruitment Pipeline)
// ============================================

export type CandidateStage = 'screening' | 'interview_1' | 'interview_2' | 'under_review' | 'probation' | 'hired' | 'rejected';

export interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
  required: boolean;
}

export interface Candidate {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  iq_score: number | null;
  mbti_type: string | null;
  applied_role: string;
  about: string | null;
  resume_file_name: string | null;
  resume_file_path: string | null;
  resume_file_size: number | null;
  stage: CandidateStage;
  probation_employee_id: string | null;
  probation_start_date: string | null;
  probation_end_date: string | null;
  checklist: ChecklistItem[];
  source: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  stage_changed_at: string;
  // New fields for deadlines and tracking
  next_event_at: string | null;
  next_event_title: string | null;
  term_sheet_signed: boolean;
  probation_account_created: boolean;
  comment_count: number;
  // Joined
  probation_employee?: { full_name: string; employee_id: string };
}

// Comment on a candidate
export interface CandidateComment {
  id: string;
  candidate_id: string;
  user_id: string;
  content: string;
  stage_tag: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  user?: { full_name: string; email: string };
}

// Event for a candidate (interview, meeting, deadline)
export interface CandidateEvent {
  id: string;
  candidate_id: string;
  title: string;
  event_type: 'interview' | 'meeting' | 'deadline' | 'review' | 'signing' | 'other';
  scheduled_at: string;
  completed_at: string | null;
  with_user_id: string | null;
  location: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  with_user?: { full_name: string };
}

// Default checklist items for probation
const DEFAULT_PROBATION_CHECKLIST: ChecklistItem[] = [
  { id: '1', text: 'Create Term Sheet', completed: false, required: true },
  { id: '2', text: 'Sign Term Sheet', completed: false, required: true },
  { id: '3', text: 'Create temporary employee account', completed: false, required: true },
  { id: '4', text: 'Setup workspace/equipment', completed: false, required: false },
];

// Additional checklist items for Community Manager role
const CM_CHECKLIST_ITEMS: ChecklistItem[] = [
  { id: 'cm1', text: 'Week 1: Platform familiarization', completed: false, required: true },
  { id: 'cm2', text: 'Week 1: Review community guidelines', completed: false, required: true },
  { id: 'cm3', text: 'Week 2: Supervised community engagement', completed: false, required: true },
  { id: 'cm4', text: 'Week 2: Complete CM program assessment', completed: false, required: true },
];

function getProbationChecklist(role: string): ChecklistItem[] {
  const checklist = [...DEFAULT_PROBATION_CHECKLIST];

  // Add CM-specific items if role matches
  if (role.toLowerCase().includes('community manager') || role.toLowerCase() === 'cm') {
    checklist.push(...CM_CHECKLIST_ITEMS);
  }

  return checklist;
}

export async function getCandidates(stage?: CandidateStage): Promise<Candidate[]> {
  if (!isSupabaseAdminConfigured()) {
    return [];
  }

  let query = supabaseAdmin!
    .from('candidates')
    .select(`
      *,
      probation_employee:employees!probation_employee_id(full_name, employee_id)
    `)
    .order('created_at', { ascending: false });

  if (stage) {
    query = query.eq('stage', stage);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching candidates:', error);
    return [];
  }

  return data || [];
}

export async function getCandidateById(id: string): Promise<Candidate | null> {
  if (!isSupabaseAdminConfigured()) {
    return null;
  }

  const { data, error } = await supabaseAdmin!
    .from('candidates')
    .select(`
      *,
      probation_employee:employees!probation_employee_id(full_name, employee_id)
    `)
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching candidate:', error);
    return null;
  }

  return data;
}

export async function createCandidate(candidateData: {
  full_name: string;
  email: string;
  phone?: string | null;
  iq_score?: number | null;
  mbti_type?: string | null;
  applied_role: string;
  about?: string | null;
  resume_file_name?: string | null;
  resume_file_path?: string | null;
  resume_file_size?: number | null;
  source?: string | null;
  notes?: string | null;
}): Promise<{ success: boolean; candidate?: Candidate; error?: string }> {
  if (!isSupabaseAdminConfigured()) {
    return { success: false, error: 'Database not configured' };
  }

  const { data, error } = await supabaseAdmin!
    .from('candidates')
    .insert({
      ...candidateData,
      stage: 'screening',
      checklist: [],
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating candidate:', error);
    return { success: false, error: error.message };
  }

  return { success: true, candidate: data };
}

export async function updateCandidate(
  id: string,
  updates: {
    full_name?: string;
    email?: string;
    phone?: string | null;
    iq_score?: number | null;
    mbti_type?: string | null;
    applied_role?: string;
    about?: string | null;
    resume_file_name?: string | null;
    resume_file_path?: string | null;
    resume_file_size?: number | null;
    source?: string | null;
    notes?: string | null;
  }
): Promise<{ success: boolean; candidate?: Candidate; error?: string }> {
  if (!isSupabaseAdminConfigured()) {
    return { success: false, error: 'Database not configured' };
  }

  const { data, error } = await supabaseAdmin!
    .from('candidates')
    .update(updates)
    .eq('id', id)
    .select(`
      *,
      probation_employee:employees!probation_employee_id(full_name, employee_id)
    `)
    .single();

  if (error) {
    console.error('Error updating candidate:', error);
    return { success: false, error: error.message };
  }

  return { success: true, candidate: data };
}

export async function updateCandidateStage(
  id: string,
  newStage: CandidateStage
): Promise<{ success: boolean; candidate?: Candidate; error?: string }> {
  if (!isSupabaseAdminConfigured()) {
    return { success: false, error: 'Database not configured' };
  }

  // Get current candidate to check role for checklist
  const candidate = await getCandidateById(id);
  if (!candidate) {
    return { success: false, error: 'Candidate not found' };
  }

  const updates: Record<string, unknown> = {
    stage: newStage,
    stage_changed_at: new Date().toISOString(),
  };

  // If moving to probation, populate the checklist
  if (newStage === 'probation' && candidate.stage !== 'probation') {
    updates.checklist = getProbationChecklist(candidate.applied_role);
    updates.probation_start_date = new Date().toISOString().split('T')[0];
    // Set end date to 2 weeks from now by default
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 14);
    updates.probation_end_date = endDate.toISOString().split('T')[0];
  }

  const { data, error } = await supabaseAdmin!
    .from('candidates')
    .update(updates)
    .eq('id', id)
    .select(`
      *,
      probation_employee:employees!probation_employee_id(full_name, employee_id)
    `)
    .single();

  if (error) {
    console.error('Error updating candidate stage:', error);
    return { success: false, error: error.message };
  }

  return { success: true, candidate: data };
}

export async function updateCandidateChecklist(
  id: string,
  checklist: ChecklistItem[]
): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseAdminConfigured()) {
    return { success: false, error: 'Database not configured' };
  }

  const { error } = await supabaseAdmin!
    .from('candidates')
    .update({ checklist })
    .eq('id', id);

  if (error) {
    console.error('Error updating candidate checklist:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

export async function deleteCandidate(id: string): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseAdminConfigured()) {
    return { success: false, error: 'Database not configured' };
  }

  const { error } = await supabaseAdmin!
    .from('candidates')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting candidate:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

export async function convertCandidateToEmployee(
  candidateId: string,
  approvedBy: string,
  employmentType: string = 'full-time'
): Promise<{ success: boolean; employee?: Employee; error?: string }> {
  if (!isSupabaseAdminConfigured()) {
    return { success: false, error: 'Database not configured' };
  }

  // Get candidate
  const candidate = await getCandidateById(candidateId);
  if (!candidate) {
    return { success: false, error: 'Candidate not found' };
  }

  // Check if candidate is in probation stage
  if (candidate.stage !== 'probation') {
    return { success: false, error: 'Candidate must be in probation stage to be hired' };
  }

  // Check if all required checklist items are completed
  const incompleteRequired = candidate.checklist.filter(
    item => item.required && !item.completed
  );
  if (incompleteRequired.length > 0) {
    return {
      success: false,
      error: `Please complete all required checklist items: ${incompleteRequired.map(i => i.text).join(', ')}`
    };
  }

  // If there's already a probation employee, just update their status
  if (candidate.probation_employee_id) {
    const { data: employee, error: updateError } = await supabaseAdmin!
      .from('employees')
      .update({
        status: 'active',
        employment_type: employmentType,
      })
      .eq('id', candidate.probation_employee_id)
      .select('*, branches(name)')
      .single();

    if (updateError) {
      console.error('Error updating employee status:', updateError);
      return { success: false, error: updateError.message };
    }

    // Update candidate stage to hired
    await updateCandidateStage(candidateId, 'hired');

    return { success: true, employee };
  }

  // Create new employee from candidate
  const employeeResult = await createEmployee({
    full_name: candidate.full_name,
    position: candidate.applied_role,
    level: 'junior',
    phone: candidate.phone,
    email: candidate.email,
    status: 'active',
    employment_type: employmentType,
    hire_date: new Date().toISOString().split('T')[0],
  });

  if (!employeeResult.success || !employeeResult.employee) {
    return { success: false, error: employeeResult.error || 'Failed to create employee' };
  }

  // Update candidate with the new employee ID and stage
  await supabaseAdmin!
    .from('candidates')
    .update({
      stage: 'hired',
      probation_employee_id: employeeResult.employee.id,
      stage_changed_at: new Date().toISOString(),
    })
    .eq('id', candidateId);

  return { success: true, employee: employeeResult.employee };
}

export async function getCandidateStats(): Promise<{
  total: number;
  byStage: Record<CandidateStage, number>;
  thisMonth: number;
}> {
  if (!isSupabaseAdminConfigured()) {
    return {
      total: 0,
      byStage: {
        screening: 0,
        interview_1: 0,
        interview_2: 0,
        under_review: 0,
        probation: 0,
        hired: 0,
        rejected: 0,
      },
      thisMonth: 0,
    };
  }

  // Get all candidates
  const { data: candidates, error } = await supabaseAdmin!
    .from('candidates')
    .select('stage, created_at');

  if (error) {
    console.error('Error fetching candidate stats:', error);
    return {
      total: 0,
      byStage: {
        screening: 0,
        interview_1: 0,
        interview_2: 0,
        under_review: 0,
        probation: 0,
        hired: 0,
        rejected: 0,
      },
      thisMonth: 0,
    };
  }

  const byStage: Record<CandidateStage, number> = {
    screening: 0,
    interview_1: 0,
    interview_2: 0,
    under_review: 0,
    probation: 0,
    hired: 0,
    rejected: 0,
  };

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  let thisMonth = 0;

  candidates?.forEach(c => {
    byStage[c.stage as CandidateStage]++;
    if (new Date(c.created_at) >= startOfMonth) {
      thisMonth++;
    }
  });

  return {
    total: candidates?.length || 0,
    byStage,
    thisMonth,
  };
}

// ============================================
// RECRUITMENT FILES
// ============================================

export interface RecruitmentFile {
  id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  mime_type: string | null;
  category: string;
  role: string | null;
  description: string | null;
  uploaded_by: string | null;
  created_at: string;
  // Joined
  uploader?: { full_name: string };
}

export async function getRecruitmentFiles(category?: string): Promise<RecruitmentFile[]> {
  if (!isSupabaseAdminConfigured()) {
    return [];
  }

  let query = supabaseAdmin!
    .from('recruitment_files')
    .select(`
      *,
      uploader:employees!uploaded_by(full_name)
    `)
    .order('created_at', { ascending: false });

  if (category) {
    query = query.eq('category', category);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching recruitment files:', error);
    return [];
  }

  return data || [];
}

export async function createRecruitmentFile(fileData: {
  file_name: string;
  file_path: string;
  file_size: number;
  mime_type?: string | null;
  category: string;
  role?: string | null;
  description?: string | null;
  uploaded_by?: string | null;
}): Promise<{ success: boolean; file?: RecruitmentFile; error?: string }> {
  if (!isSupabaseAdminConfigured()) {
    return { success: false, error: 'Database not configured' };
  }

  const { data, error } = await supabaseAdmin!
    .from('recruitment_files')
    .insert(fileData)
    .select()
    .single();

  if (error) {
    console.error('Error creating recruitment file:', error);
    return { success: false, error: error.message };
  }

  return { success: true, file: data };
}

export async function deleteRecruitmentFile(id: string): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseAdminConfigured()) {
    return { success: false, error: 'Database not configured' };
  }

  const { error } = await supabaseAdmin!
    .from('recruitment_files')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting recruitment file:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

export async function linkProbationEmployee(
  candidateId: string,
  employeeId: string
): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseAdminConfigured()) {
    return { success: false, error: 'Database not configured' };
  }

  const { error } = await supabaseAdmin!
    .from('candidates')
    .update({ probation_employee_id: employeeId })
    .eq('id', candidateId);

  if (error) {
    console.error('Error linking probation employee:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}
