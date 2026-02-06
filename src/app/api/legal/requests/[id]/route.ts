import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-auth';
import { PERMISSIONS } from '@/lib/permissions';
import { updateLegalRequest } from '@/lib/db/legal-requests';
import type {
  UpdateLegalRequestInput,
  LegalRequestStatus,
} from '@/modules/legal/types';
import type { User } from '@/types';

// ============================================
// PATCH /api/legal/requests/[id]
// Legal team update: assign, change status, resolve, or reject
// ============================================
export const PATCH = withAuth(async (
  request: NextRequest,
  context: { user: User; params?: Record<string, string> }
) => {
  try {
    const id = context.params?.id;

    if (!id) {
      return NextResponse.json(
        { error: 'ID is required' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const {
      status,
      assignedTo,
      resolutionNotes,
      rejectionReason,
    } = body as {
      status?: unknown;
      assignedTo?: unknown;
      resolutionNotes?: unknown;
      rejectionReason?: unknown;
    };

    // Build update object with type safety
    const updateInput: UpdateLegalRequestInput = {};

    if (status !== undefined) {
      const VALID_STATUSES: LegalRequestStatus[] = [
        'submitted',
        'under_review',
        'in_progress',
        'ready',
        'completed',
        'rejected',
      ];

      if (typeof status !== 'string' || !VALID_STATUSES.includes(status as LegalRequestStatus)) {
        return NextResponse.json(
          {
            error: 'Invalid status',
            validStatuses: VALID_STATUSES,
          },
          { status: 400 }
        );
      }

      updateInput.status = status as LegalRequestStatus;
    }

    if (assignedTo !== undefined) {
      if (assignedTo !== null && typeof assignedTo !== 'string') {
        return NextResponse.json(
          { error: 'assignedTo must be a string or null' },
          { status: 400 }
        );
      }
      updateInput.assignedTo = assignedTo as string | undefined;
    }

    if (resolutionNotes !== undefined) {
      if (resolutionNotes !== null && typeof resolutionNotes !== 'string') {
        return NextResponse.json(
          { error: 'resolutionNotes must be a string or null' },
          { status: 400 }
        );
      }
      updateInput.resolutionNotes = resolutionNotes as string | undefined;
    }

    if (rejectionReason !== undefined) {
      if (rejectionReason !== null && typeof rejectionReason !== 'string') {
        return NextResponse.json(
          { error: 'rejectionReason must be a string or null' },
          { status: 400 }
        );
      }
      updateInput.rejectionReason = rejectionReason as string | undefined;
    }

    // If no fields to update, return bad request
    if (Object.keys(updateInput).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      );
    }

    // Perform the update
    const result = await updateLegalRequest(id, updateInput, context.user.id);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to update legal request' },
        { status: 400 }
      );
    }

    return NextResponse.json({ data: result.data });
  } catch (error) {
    console.error('Error in PATCH /api/legal/requests/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}, { permission: PERMISSIONS.LEGAL_REQUESTS_MANAGE });
