import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-auth';
import { getDepartments, createDepartment } from '@/lib/db';

// GET /api/departments - Get all departments
export const GET = withAuth(async () => {
  try {
    const departments = await getDepartments();
    return NextResponse.json(departments);
  } catch (error) {
    console.error('Error fetching departments:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});

// POST /api/departments - Create a new department
export const POST = withAuth(
  async (request: NextRequest) => {
    try {
      const body = await request.json();
      const { name, description, color, manager_id } = body;

      if (!name || typeof name !== 'string') {
        return NextResponse.json({ error: 'Name is required' }, { status: 400 });
      }

      const department = await createDepartment({
        name: name.trim(),
        description: description?.trim(),
        color,
        manager_id,
      });

      if (!department) {
        return NextResponse.json({ error: 'Failed to create department' }, { status: 500 });
      }

      return NextResponse.json(department, { status: 201 });
    } catch (error) {
      console.error('Error creating department:', error);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  },
  { roles: ['general_manager', 'hr'] }
);
