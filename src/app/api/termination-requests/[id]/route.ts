import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-auth';
import { PERMISSIONS, hasPermission } from '@/lib/permissions';
import {
  getTerminationRequestById,
  approveTerminationRequest,
  rejectTerminationRequest,
} from '@/lib/db';
import type { User } from '@/types';

// GET /api/termination-requests/[id] - Get a specific termination request
export const GET = withAuth(async (request: NextRequest, context: { user: User; params?: Record<string, string> }) => {
  try {
    const { user, params } = context;
    const requestId = params?.id;

    if (!requestId) {
      return NextResponse.json({ error: 'Request ID is required' }, { status: 400 });
    }

    const terminationRequest = await getTerminationRequestById(requestId);

    if (!terminationRequest) {
      return NextResponse.json({ error: 'Termination request not found' }, { status: 404 });
    }

    return NextResponse.json({ request: terminationRequest });
  } catch (error) {
    console.error('Error fetching termination request:', error);
    return NextResponse.json({ error: 'Failed to fetch termination request' }, { status: 500 });
  }
}, { permission: PERMISSIONS.EMPLOYEES_EDIT });

// PUT /api/termination-requests/[id] - Approve or reject a termination request
export const PUT = withAuth(async (request: NextRequest, context: { user: User; params?: Record<string, string> }) => {
  try {
    const { user, params } = context;
    const requestId = params?.id;

    if (!requestId) {
      return NextResponse.json({ error: 'Request ID is required' }, { status: 400 });
    }

    // Only GM/CEO can approve/reject termination requests
    const canApprove = hasPermission(user.role, PERMISSIONS.EMPLOYEES_DELETE);

    if (!canApprove) {
      return NextResponse.json(
        { error: 'Only General Manager can approve or reject termination requests' },
        { status: 403 }
      );
    }

    const { action, rejection_reason } = await request.json();

    if (!action || !['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: 'Valid action (approve/reject) is required' },
        { status: 400 }
      );
    }

    if (action === 'reject' && !rejection_reason) {
      return NextResponse.json(
        { error: 'Rejection reason is required' },
        { status: 400 }
      );
    }

    let result;
    if (action === 'approve') {
      result = await approveTerminationRequest(requestId, user.id);
    } else {
      result = await rejectTerminationRequest(requestId, user.id, rejection_reason);
    }

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: action === 'approve'
        ? 'Termination request approved. Employee has been terminated.'
        : 'Termination request rejected.',
    });
  } catch (error) {
    console.error('Error processing termination request:', error);
    return NextResponse.json({ error: 'Failed to process termination request' }, { status: 500 });
  }
}, { permission: PERMISSIONS.EMPLOYEES_DELETE });
