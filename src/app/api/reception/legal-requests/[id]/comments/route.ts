import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-auth';
import { PERMISSIONS, hasPermission } from '@/lib/permissions';
import { addLegalRequestComment, getLegalRequestById } from '@/lib/db/legal-requests';
import { validateRecordBranchAccess, validateStringLength, MAX_LENGTH } from '@/lib/security';
import type { User } from '@/types';

// ============================================
// POST /api/reception/legal-requests/[id]/comments
// Add a comment to a legal request
// ============================================
export const POST = withAuth(async (
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

    // C-02: Verify the legal request belongs to user's branch
    const legalRequest = await getLegalRequestById(id);
    if (!legalRequest) {
      return NextResponse.json({ error: 'Legal request not found' }, { status: 404 });
    }
    if (!validateRecordBranchAccess(context.user, legalRequest.branchId, PERMISSIONS.LEGAL_REQUESTS_VIEW_ALL)) {
      return NextResponse.json({ error: 'Legal request not found' }, { status: 404 });
    }

    const body = await request.json();
    const { content, isInternal } = body as {
      content?: unknown;
      isInternal?: unknown;
    };

    // Validation
    if (!content || typeof content !== 'string') {
      return NextResponse.json(
        { error: 'content is required and must be a string' },
        { status: 400 }
      );
    }

    if (content.trim().length === 0) {
      return NextResponse.json(
        { error: 'content cannot be empty' },
        { status: 400 }
      );
    }

    // H-04: Length limit
    const lengthErr = validateStringLength(content, 'content', MAX_LENGTH.COMMENT);
    if (lengthErr) {
      return NextResponse.json({ error: lengthErr }, { status: 400 });
    }

    // Check if this is an internal comment
    const isInternalComment = isInternal === true;

    // If internal comment, check permission
    if (isInternalComment) {
      const hasManagePermission = hasPermission(
        context.user.role as any,
        PERMISSIONS.LEGAL_REQUESTS_MANAGE
      );

      if (!hasManagePermission) {
        return NextResponse.json(
          { error: 'You do not have permission to add internal comments' },
          { status: 403 }
        );
      }
    }

    // Add the comment
    const comment = await addLegalRequestComment(
      id,
      context.user.id,
      content.trim(),
      isInternalComment
    );

    if (!comment) {
      return NextResponse.json(
        { error: 'Failed to add comment' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { data: comment },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error in POST /api/reception/legal-requests/[id]/comments:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}, { permission: PERMISSIONS.RECEPTION_LEGAL_VIEW });
