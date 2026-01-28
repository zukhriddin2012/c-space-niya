import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-auth';
import { getPositions, getActivePositions, createPosition } from '@/lib/db';

// GET /api/positions - Get all positions
export const GET = withAuth(async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get('active') === 'true';

    const positions = activeOnly ? await getActivePositions() : await getPositions();
    return NextResponse.json(positions);
  } catch (error) {
    console.error('Error fetching positions:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});

// POST /api/positions - Create a new position
export const POST = withAuth(
  async (request: NextRequest) => {
    try {
      const body = await request.json();
      const { name, name_uz, name_ru, description, department_id, level, min_salary, max_salary, is_active } = body;

      if (!name || typeof name !== 'string') {
        return NextResponse.json({ error: 'Name is required' }, { status: 400 });
      }

      const position = await createPosition({
        name: name.trim(),
        name_uz: name_uz?.trim(),
        name_ru: name_ru?.trim(),
        description: description?.trim(),
        department_id,
        level,
        min_salary,
        max_salary,
        is_active,
      });

      if (!position) {
        return NextResponse.json({ error: 'Failed to create position' }, { status: 500 });
      }

      return NextResponse.json(position, { status: 201 });
    } catch (error) {
      console.error('Error creating position:', error);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  },
  { roles: ['general_manager', 'hr'] }
);
