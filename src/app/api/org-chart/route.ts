import { NextResponse } from 'next/server';
import { supabaseAdmin, isSupabaseAdminConfigured } from '@/lib/supabase';

export async function GET() {
  try {
    if (!isSupabaseAdminConfigured()) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    // Fetch all active employees with their manager info
    const { data: employees, error } = await supabaseAdmin!
      .from('employees')
      .select(`
        id,
        employee_id,
        full_name,
        position,
        email,
        phone,
        telegram_id,
        photo,
        level,
        status,
        manager_id,
        department_id,
        branch_id,
        departments:department_id (
          id,
          name
        ),
        branches:branch_id (
          id,
          name
        )
      `)
      .in('status', ['active', 'probation'])
      .order('full_name');

    if (error) {
      console.error('Error fetching employees for org chart:', error);
      return NextResponse.json({ error: 'Failed to fetch employees' }, { status: 500 });
    }

    // Transform data for org chart
    const orgData = employees?.map(emp => ({
      id: emp.id,
      employeeId: emp.employee_id,
      name: emp.full_name,
      position: emp.position || 'Employee',
      email: emp.email,
      phone: emp.phone,
      telegramId: emp.telegram_id,
      photo: emp.photo,
      level: emp.level,
      managerId: emp.manager_id,
      departmentId: emp.department_id,
      departmentName: (emp.departments as unknown as { name: string } | null)?.name || null,
      branchId: emp.branch_id,
      branchName: (emp.branches as unknown as { name: string } | null)?.name || null,
    })) || [];

    // Build hierarchy tree
    const buildTree = (employees: typeof orgData, parentId: string | null = null): typeof orgData => {
      return employees
        .filter(emp => emp.managerId === parentId)
        .map(emp => ({
          ...emp,
          children: buildTree(employees, emp.id),
        }));
    };

    // Find roots (employees without managers)
    const roots = orgData.filter(emp => !emp.managerId);

    // Build tree for each root
    const tree = roots.map(root => ({
      ...root,
      children: buildTree(orgData, root.id),
    }));

    // Stats
    const stats = {
      totalEmployees: orgData.length,
      departments: new Set(orgData.map(e => e.departmentId).filter(Boolean)).size,
      managers: orgData.filter(e => orgData.some(other => other.managerId === e.id)).length,
      roots: roots.length,
    };

    return NextResponse.json({
      tree,
      flat: orgData,
      stats
    });
  } catch (error) {
    console.error('Org chart API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
