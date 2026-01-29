import { supabaseAdmin, isSupabaseAdminConfigured, Department } from './connection';
import type { Employee } from './connection';

export interface DepartmentWithStats extends Department {
  manager?: Employee;
  employee_count: number;
  total_budget: number;
}

export async function getDepartments(): Promise<DepartmentWithStats[]> {
  if (!isSupabaseAdminConfigured()) {
    console.error('Supabase not configured');
    return [];
  }

  // Get departments with manager and accountable person info
  const { data: departments, error: deptError } = await supabaseAdmin!
    .from('departments')
    .select(`
      *,
      manager:employees!departments_manager_id_fkey(id, full_name, position),
      accountable_person:employees!departments_accountable_person_id_fkey(id, full_name, position)
    `)
    .order('name');

  if (deptError) {
    console.error('Error fetching departments:', deptError);
    return [];
  }

  // Get employee counts and budget per department
  const { data: employees, error: empError } = await supabaseAdmin!
    .from('employees')
    .select('id, department_id, salary, status')
    .in('status', ['active', 'probation']);

  if (empError) {
    console.error('Error fetching employees for department stats:', empError);
  }

  // Calculate stats per department
  const deptStats = new Map<string, { count: number; budget: number }>();
  for (const emp of employees || []) {
    if (emp.department_id) {
      const current = deptStats.get(emp.department_id) || { count: 0, budget: 0 };
      current.count++;
      current.budget += emp.salary || 0;
      deptStats.set(emp.department_id, current);
    }
  }

  return (departments || []).map(dept => ({
    ...dept,
    employee_count: deptStats.get(dept.id)?.count || 0,
    total_budget: deptStats.get(dept.id)?.budget || 0,
  }));
}

export async function getDepartmentById(id: string): Promise<DepartmentWithStats | null> {
  if (!isSupabaseAdminConfigured()) {
    console.error('Supabase not configured');
    return null;
  }

  const { data, error } = await supabaseAdmin!
    .from('departments')
    .select(`
      *,
      manager:employees!departments_manager_id_fkey(id, full_name, position),
      accountable_person:employees!departments_accountable_person_id_fkey(id, full_name, position)
    `)
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching department by id:', error);
    return null;
  }

  // Get employee count and budget
  const { data: employees } = await supabaseAdmin!
    .from('employees')
    .select('id, salary')
    .eq('department_id', id)
    .in('status', ['active', 'probation']);

  const employee_count = employees?.length || 0;
  const total_budget = employees?.reduce((sum, e) => sum + (e.salary || 0), 0) || 0;

  return { ...data, employee_count, total_budget };
}

export async function createDepartment(department: {
  name: string;
  description?: string;
  color?: string;
  category?: string;
  accountable_person_id?: string | null;
  manager_id?: string | null;
}): Promise<Department | null> {
  if (!isSupabaseAdminConfigured()) {
    console.error('Supabase not configured');
    return null;
  }

  const { data, error } = await supabaseAdmin!
    .from('departments')
    .insert({
      name: department.name,
      description: department.description || null,
      color: department.color || 'bg-gray-500',
      category: department.category || 'operations',
      accountable_person_id: department.accountable_person_id || null,
      manager_id: department.manager_id || null,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating department:', error);
    return null;
  }

  return data;
}

export async function updateDepartment(
  id: string,
  updates: {
    name?: string;
    description?: string | null;
    color?: string;
    manager_id?: string | null;
  }
): Promise<Department | null> {
  if (!isSupabaseAdminConfigured()) {
    console.error('Supabase not configured');
    return null;
  }

  const { data, error } = await supabaseAdmin!
    .from('departments')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating department:', error);
    return null;
  }

  return data;
}

export async function deleteDepartment(id: string): Promise<boolean> {
  if (!isSupabaseAdminConfigured()) {
    console.error('Supabase not configured');
    return false;
  }

  // First, unassign employees from this department
  await supabaseAdmin!
    .from('employees')
    .update({ department_id: null })
    .eq('department_id', id);

  const { error } = await supabaseAdmin!
    .from('departments')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting department:', error);
    return false;
  }

  return true;
}

export async function getEmployeesByDepartment(departmentId: string): Promise<Employee[]> {
  if (!isSupabaseAdminConfigured()) {
    console.error('Supabase not configured');
    return [];
  }

  const { data, error } = await supabaseAdmin!
    .from('employees')
    .select('*, branches!employees_branch_id_fkey(name)')
    .eq('department_id', departmentId)
    .in('status', ['active', 'probation'])
    .order('full_name');

  if (error) {
    console.error('Error fetching employees by department:', error);
    return [];
  }

  return data || [];
}
