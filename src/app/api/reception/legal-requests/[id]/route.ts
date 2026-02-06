import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-auth';
import { PERMISSIONS } from '@/lib/permissions';
import {
  getLegalRequestById,
  updateLegalRequest,
} from '@/lib/db/legal-requests';
import { validateRecordBranchAccess, validateStringLength, MAX_LENGTH } from '@/lib/security';
import type {
  UpdateLegalRequestInput,
  LegalRequestStatus,
} from '@/modules/legal/types';
import type { User } from '@/types';

// ============================================
// GET /api/reception/legal-requests/[id]
// Get a single legal request with all relations
// ============================================
export const GET = withAuth(async (
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

    const legalRequest = await getLegalRequestById(id);

    if (!legalRequest) {
      return NextResponse.json(
        { error: 'Legal request not found' },
        { status: 404 }
      );
    }

    // C-02: Verify branch access (IDOR prevention)
    if (!validateRecordBranchAccess(context.user, legalRequest.branchId, PERMISSIONS.LEGAL_REQUESTS_VIEW_ALL)) {
      return NextResponse.json({ error: 'Legal request not found' }, { status: 404 });
    }

    return NextResponse.json({ data: legalRequest });
  } catch (error) {
    console.error('Error in GET /api/reception/legal-requests/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}, { permission: PERMISSIONS.RECEPTION_LEGAL_VIEW });

// ============================================
// PATCH /api/reception/legal-requests/[id]
// Update a legal request (status, assignment, resolution)
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

    // C-02: Fetch record first to verify branch access
    const existing = await getLegalRequestById(id);
    if (!existing) {
      return NextResponse.json({ error: 'Legal request not found' }, { status: 404 });
    }
    if (!validateRecordBranchAccess(context.user, existing.branchId, PERMISSIONS.LEGAL_REQUESTS_VIEW_ALL)) {
      return NextResponse.json({ error: 'Legal request not found' }, { status: 404 });
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
      // H-04: Length limit
      const lengthErr = validateStringLength(resolutionNotes, 'resolutionNotes', MAX_LENGTH.NOTES);
      if (lengthErr) {
        return NextResponse.json({ error: lengthErr }, { status: 400 });
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
      // H-04: Length limit
      const lengthErr = validateStringLength(rejectionReason, 'rejectionReason', MAX_LENGTH.REASON);
      if (lengthErr) {
        return NextResponse.json({ error: lengthErr }, { status: 400 });
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
    console.error('Error in PATCH /api/reception/legal-requests/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}, { permission: PERMISSIONS.LEGAL_REQUESTS_MANAGE });
