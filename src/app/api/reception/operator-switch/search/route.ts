import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-auth';
import { PERMISSIONS } from '@/lib/permissions';
import { searchEmployeesForCrossBranch } from '@/lib/db/operator-switch';

async function handler(
  request: Request,
  context: { user: { id: string; role: string; email: string } }
) {
  if (request.method !== 'GET') {
    return NextResponse.json(
      { error: 'method_not_allowed' },
      { status: 405 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q');
    const branchId = searchParams.get('branchId');

    if (!q || typeof q !== 'string') {
      return NextResponse.json(
        { error: 'missing_search_query' },
        { status: 400 }
      );
    }

    if (!branchId || typeof branchId !== 'string') {
      return NextResponse.json(
        { error: 'missing_branch_id' },
        { status: 400 }
      );
    }

    // Search for employees
    const employees = await searchEmployeesForCrossBranch(q, branchId);

    return NextResponse.json(
      {
        employees,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Cross-branch employee search error:', error);
    return NextResponse.json(
      { error: 'internal_server_error' },
      { status: 500 }
    );
  }
}

export const GET = withAuth(handler, { permission: PERMISSIONS.RECEPTION_VIEW });
