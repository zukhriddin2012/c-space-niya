import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-auth';
import { getDepartmentById, updateDepartment, deleteDepartment, getEmployeesByDepartment } from '@/lib/db';

// GET /api/departments/[id] - Get department by ID
export const GET = withAuth(async (
  request: NextRequest,
  { params }
) => {
  try {
    const id = params?.id;
    if (!id) {
      return NextResponse.json({ error: 'Department ID required' }, { status: 400 });
    }

    // Check if requesting employees
    const { searchParams } = new URL(request.url);
    if (searchParams.get('include') === 'employees') {
      const employees = await getEmployeesByDepartment(id);
      return NextResponse.json(employees);
    }

    const department = await getDepartmentById(id);
    if (!department) {
      return NextResponse.json({ error: 'Department not found' }, { status: 404 });
    }

    return NextResponse.json(department);
  } catch (error) {
    console.error('Error fetching department:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});

// PUT /api/departments/[id] - Update department
export const PUT = withAuth(
  async (request: NextRequest, { params }) => {
    try {
      const id = params?.id;
      if (!id) {
        return NextResponse.json({ error: 'Department ID required' }, { status: 400 });
      }

      const body = await request.json();
      const { name, description, color, manager_id } = body;

      const updates: Record<string, unknown> = {};
      if (name !== undefined) updates.name = name.trim();
      if (description !== undefined) updates.description = description?.trim() || null;
      if (color !== undefined) updates.color = color;
      if (manager_id !== undefined) updates.manager_id = manager_id;

      const department = await updateDepartment(id, updates);
      if (!department) {
        return NextResponse.json({ error: 'Failed to update department' }, { status: 500 });
      }

      return NextResponse.json(department);
    } catch (error) {
      console.error('Error updating department:', error);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  },
  { roles: ['general_manager', 'hr'] }
);

// DELETE /api/departments/[id] - Delete department
export const DELETE = withAuth(
  async (request: NextRequest, { params }) => {
    try {
      const id = params?.id;
      if (!id) {
        return NextResponse.json({ error: 'Department ID required' }, { status: 400 });
      }

      const success = await deleteDepartment(id);
      if (!success) {
        return NextResponse.json({ error: 'Failed to delete department' }, { status: 500 });
      }

      return NextResponse.json({ success: true });
    } catch (error) {
      console.error('Error deleting department:', error);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  },
  { roles: ['general_manager', 'hr'] }
);
