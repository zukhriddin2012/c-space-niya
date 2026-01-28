import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-auth';
import { getPositionById, updatePosition, deletePosition } from '@/lib/db';

// GET /api/positions/[id] - Get position by ID
export const GET = withAuth(async (
  request: NextRequest,
  { params }
) => {
  try {
    const id = params?.id;
    if (!id) {
      return NextResponse.json({ error: 'Position ID required' }, { status: 400 });
    }

    const position = await getPositionById(id);
    if (!position) {
      return NextResponse.json({ error: 'Position not found' }, { status: 404 });
    }

    return NextResponse.json(position);
  } catch (error) {
    console.error('Error fetching position:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});

// PUT /api/positions/[id] - Update position
export const PUT = withAuth(
  async (request: NextRequest, { params }) => {
    try {
      const id = params?.id;
      if (!id) {
        return NextResponse.json({ error: 'Position ID required' }, { status: 400 });
      }

      const body = await request.json();
      const { name, name_uz, name_ru, description, department_id, level, min_salary, max_salary, is_active } = body;

      const updates: Record<string, unknown> = {};
      if (name !== undefined) updates.name = name.trim();
      if (name_uz !== undefined) updates.name_uz = name_uz?.trim() || null;
      if (name_ru !== undefined) updates.name_ru = name_ru?.trim() || null;
      if (description !== undefined) updates.description = description?.trim() || null;
      if (department_id !== undefined) updates.department_id = department_id || null;
      if (level !== undefined) updates.level = level || null;
      if (min_salary !== undefined) updates.min_salary = min_salary || null;
      if (max_salary !== undefined) updates.max_salary = max_salary || null;
      if (is_active !== undefined) updates.is_active = is_active;

      const position = await updatePosition(id, updates);
      if (!position) {
        return NextResponse.json({ error: 'Failed to update position' }, { status: 500 });
      }

      return NextResponse.json(position);
    } catch (error) {
      console.error('Error updating position:', error);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  },
  { roles: ['general_manager', 'hr'] }
);

// DELETE /api/positions/[id] - Delete position
export const DELETE = withAuth(
  async (request: NextRequest, { params }) => {
    try {
      const id = params?.id;
      if (!id) {
        return NextResponse.json({ error: 'Position ID required' }, { status: 400 });
      }

      const success = await deletePosition(id);
      if (!success) {
        return NextResponse.json({ error: 'Failed to delete position' }, { status: 500 });
      }

      return NextResponse.json({ success: true });
    } catch (error) {
      console.error('Error deleting position:', error);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  },
  { roles: ['general_manager', 'hr'] }
);
