import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-auth';
import { PERMISSIONS, hasPermission } from '@/lib/permissions';
import { createTerminationRequest, getTerminationRequests } from '@/lib/db';
import type { User } from '@/types';

// GET /api/termination-requests - List termination requests
export const GET = withAuth(async (request: NextRequest, context: { user: User }) => {
  try {
    const { user } = context;
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || undefined;

    // Only GM can view all termination requests
    const canViewAll = hasPermission(user.role, PERMISSIONS.EMPLOYEES_DELETE);

    if (!canViewAll) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const requests = await getTerminationRequests(status);

    return NextResponse.json({ requests });
  } catch (error) {
    console.error('Error fetching termination requests:', error);
    return NextResponse.json({ error: 'Failed to fetch termination requests' }, { status: 500 });
  }
}, { permission: PERMISSIONS.EMPLOYEES_EDIT });

// POST /api/termination-requests - Create a termination request
export const POST = withAuth(async (request: NextRequest, context: { user: User }) => {
  try {
    const { user } = context;
    const { employee_id, reason, termination_date, notes } = await request.json();

    if (!employee_id || !reason || !termination_date) {
      return NextResponse.json(
        { error: 'Employee ID, reason, and termination date are required' },
        { status: 400 }
      );
    }

    const result = await createTerminationRequest({
      employee_id,
      requested_by: user.id,
      reason,
      termination_date,
      notes,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      request: result.request,
    });
  } catch (error) {
    console.error('Error creating termination request:', error);
    return NextResponse.json({ error: 'Failed to create termination request' }, { status: 500 });
  }
}, { permission: PERMISSIONS.EMPLOYEES_EDIT });
