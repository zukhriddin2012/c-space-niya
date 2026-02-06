// Employee database functions
import { supabaseAdmin, isSupabaseAdminConfigured, Employee } from './connection';

export async function getEmployees(): Promise<Employee[]> {
  if (!isSupabaseAdminConfigured()) {
    console.error('Supabase not configured');
    return [];
  }

  const { data, error } = await supabaseAdmin!
    .from('employees')
    .select('*, branches!employees_branch_id_fkey(name)')
    .order('full_name');

  if (error) {
    console.error('Error fetching employees:', error);
    return [];
  }

  return data || [];
}

export async function getEmployeeById(id: string): Promise<Employee | null> {
  if (!isSupabaseAdminConfigured()) {
    console.error('Supabase not configured');
    return null;
  }

  const { data, error } = await supabaseAdmin!
    .from('employees')
    .select('*, branches!employees_branch_id_fkey(name)')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching employee by id:', error);
    return null;
  }

  return data;
}

// Get all potential managers (active employees with their position)
export async function getPotentialManagers(): Promise<{ id: string; full_name: string; position: string }[]> {
  if (!isSupabaseAdminConfigured()) {
    console.error('Supabase not configured');
    return [];
  }

  const { data, error } = await supabaseAdmin!
    .from('employees')
    .select('id, full_name, position')
    .in('status', ['active', 'probation'])
    .order('full_name');

  if (error) {
    console.error('Error fetching potential managers:', error);
    return [];
  }

  return data || [];
}

export async function getEmployeesByBranch(branchId: string): Promise<Employee[]> {
  if (!isSupabaseAdminConfigured()) {
    console.error('Supabase not configured');
    return [];
  }

  const { data, error } = await supabaseAdmin!
    .from('employees')
    .select('*, branches!employees_branch_id_fkey(name)')
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
    .select('*, branches!employees_branch_id_fkey(name)')
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
    .select('*, branches!employees_branch_id_fkey(name)')
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
      position_id: null,
      level: emp.level,
      branch_id: emp.branchId,
      department_id: null,
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
    .select('*, branches!employees_branch_id_fkey(name)')
    .eq('email', email)
    .single();

  if (error) {
    // PGRST116 = no rows found (not really an error, just no match)
    if (error.code !== 'PGRST116') {
      console.error('Error fetching employee by email:', email, 'Error code:', error.code, 'Message:', error.message);
    }
    return null;
  }

  return data;
}

// SEC-001: Authenticate employee with bcrypt password hashing
export async function authenticateEmployee(
  email: string,
  password: string
): Promise<{ employee: Employee; mustReset: boolean } | null> {
  if (!isSupabaseAdminConfigured()) {
    return null;
  }

  // Fetch employee by email (case-insensitive) — only fetch what we need
  const { data, error } = await supabaseAdmin!
    .from('employees')
    .select('id, email, password_hash, password, must_reset_password, status, full_name, system_role, employee_id, position, position_id, level, branch_id, department_id, salary, phone, telegram_id, default_shift, can_rotate, employment_type, hire_date, preferred_language, is_growth_team, remote_work_enabled, branches!employees_branch_id_fkey(name)')
    .ilike('email', email)
    .single();

  if (error || !data) return null;
  if (data.status === 'terminated') return null;

  // Try bcrypt hash first (new system), then fall back to plaintext (migration period)
  let isValid = false;
  if (data.password_hash) {
    const bcrypt = await import('bcryptjs');
    isValid = await bcrypt.compare(password, data.password_hash);
  } else if (data.password) {
    // Temporary fallback during migration — plaintext comparison
    isValid = data.password === password;
  }

  if (!isValid) return null;

  const { password_hash, password: _pw, must_reset_password, ...employee } = data;
  return { employee: employee as unknown as Employee, mustReset: must_reset_password || false };
}
