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
      employment_type: 'full-time',
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
    .eq('status', 'active')
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
  legal_entity: string;
  month: number;
  year: number;
  gross_salary: number;  // Before tax
  bonuses: number;
  deductions: number;    // Tax amount
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
// Uses employee_wages table (net salaries) as the source
export async function getPayrollByMonth(year: number, month: number): Promise<PayrollRecord[]> {
  if (!isSupabaseAdminConfigured()) {
    return [];
  }

  // Get all employees
  const employees = await getEmployees();

  // Get all employee wages (this is the NET salary data you imported)
  const { data: allWages, error: wagesError } = await supabaseAdmin!
    .from('employee_wages')
    .select('*, legal_entities(id, name, short_name)')
    .eq('is_active', true);

  if (wagesError) {
    console.error('Error fetching wages:', wagesError);
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

  // Build payroll records from wages
  const payrollRecords: PayrollRecord[] = (allWages || []).map(wage => {
    const employee = employeeMap.get(wage.employee_id);
    const payslip = payslipMap.get(wage.employee_id);
    const netSalary = wage.wage_amount || 0;
    const grossSalary = calculateGrossFromNet(netSalary);
    const tax = calculateTaxFromNet(netSalary);

    return {
      id: payslip?.id || `wage-${wage.id}-${year}-${month}`,
      employee_id: wage.employee_id,
      employee_name: employee?.full_name || 'Unknown',
      employee_position: employee?.position || '',
      legal_entity: wage.legal_entities?.short_name || wage.legal_entities?.name || '-',
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

  return payrollRecords.sort((a, b) => b.net_salary - a.net_salary);
}

// Get payroll statistics for a month
export async function getPayrollStats(year: number, month: number) {
  const payroll = await getPayrollByMonth(year, month);

  return {
    totalGross: payroll.reduce((sum, p) => sum + p.gross_salary + p.bonuses, 0),
    totalDeductions: payroll.reduce((sum, p) => sum + p.deductions, 0),
    totalNet: payroll.reduce((sum, p) => sum + p.net_salary, 0),
    paid: payroll.filter(p => p.status === 'paid').length,
    approved: payroll.filter(p => p.status === 'approved').length,
    draft: payroll.filter(p => p.status === 'draft').length,
    totalEmployees: payroll.length,
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
  const today = new Date();

  // Get start of week (Monday)
  const dayOfWeek = today.getDay();
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Adjust for Sunday = 0
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() + diff);
  startOfWeek.setHours(0, 0, 0, 0);

  // Ensure total is at least 1 to avoid division by zero
  const safeTotal = Math.max(1, totalEmployees);

  const weekData = [];

  for (let i = 0; i < 7; i++) {
    const currentDate = new Date(startOfWeek);
    currentDate.setDate(startOfWeek.getDate() + i);
    const dateStr = currentDate.toISOString().split('T')[0];

    // Only fetch data for dates up to today (and skip weekends for work attendance)
    const isWeekend = currentDate.getDay() === 0 || currentDate.getDay() === 6;
    const isPastOrToday = currentDate <= today;

    if (isPastOrToday && !isWeekend) {
      const attendance = await getAttendanceByDate(dateStr);
      const present = attendance.filter(a => a.status === 'present').length;
      const late = attendance.filter(a => a.status === 'late').length;
      const earlyLeave = attendance.filter(a => a.status === 'early_leave').length;
      const absent = safeTotal - present - late - earlyLeave;

      weekData.push({
        day: days[i],
        date: dateStr,
        present,
        late,
        absent: Math.max(0, absent),
        total: safeTotal,
      });
    } else {
      // Future dates or weekends - no data
      weekData.push({
        day: days[i],
        date: dateStr,
        present: 0,
        late: 0,
        absent: isWeekend ? 0 : safeTotal,
        total: safeTotal,
      });
    }
  }

  return weekData;
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

// Get total wages for an employee across all entities
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
