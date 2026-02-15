import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-auth';
import { searchEmployeesForAssignment } from '@/lib/db/operator-switch';

export const GET = withAuth(async (request: NextRequest, { user }) => {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q');

    if (!q || q.length < 2) {
      return NextResponse.json({ employees: [] });
    }

    const employees = await searchEmployeesForAssignment(q);

    return NextResponse.json({ employees });
  } catch (error) {
    console.error('Assignment employee search error:', error);
    return NextResponse.json(
      { error: 'internal_server_error' },
      { status: 500 }
    );
  }
}, { roles: ['general_manager'] });
