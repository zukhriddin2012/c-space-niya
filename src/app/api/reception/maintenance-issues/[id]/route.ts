import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-auth';
import { PERMISSIONS } from '@/lib/permissions';
import { getMaintenanceIssueById, updateMaintenanceIssue } from '@/lib/db/maintenance-issues';
import type { UpdateMaintenanceIssueInput } from '@/modules/maintenance/types';
import { validateRecordBranchAccess, validateStringLength, MAX_LENGTH, validateEnum } from '@/lib/security';
import type { User } from '@/types';

// ============================================
// GET /api/reception/maintenance-issues/[id]
// Get single maintenance issue with relations
// ============================================
export const GET = withAuth(
  async (request: NextRequest, context: { user: { id: string; role: string; email: string }; params?: Record<string, string> }) => {
    try {
      const id = context.params?.id;

      if (!id) {
        return NextResponse.json({ error: 'Issue ID is required' }, { status: 400 });
      }

      const issue = await getMaintenanceIssueById(id);

      if (!issue) {
        return NextResponse.json({ error: 'Issue not found' }, { status: 404 });
      }

      // C-02: IDOR prevention
      if (!validateRecordBranchAccess(context.user as User, issue.branchId, PERMISSIONS.MAINTENANCE_VIEW_ALL)) {
        return NextResponse.json({ error: 'Issue not found' }, { status: 404 });
      }

      return NextResponse.json({ data: issue });
    } catch (error) {
      console.error('Server error:', error);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  },
  { permission: PERMISSIONS.RECEPTION_MAINTENANCE_VIEW }
);

// ============================================
// PATCH /api/reception/maintenance-issues/[id]
// Update maintenance issue (status, assignment, resolution)
// ============================================
export const PATCH = withAuth(
  async (request: NextRequest, context: { user: { id: string; role: string; email: string }; params?: Record<string, string> }) => {
    try {
      const id = context.params?.id;

      if (!id) {
        return NextResponse.json({ error: 'Issue ID is required' }, { status: 400 });
      }

      // C-02: Fetch and verify branch access
      const existing = await getMaintenanceIssueById(id);
      if (!existing) {
        return NextResponse.json({ error: 'Issue not found' }, { status: 404 });
      }
      if (!validateRecordBranchAccess(context.user as User, existing.branchId, PERMISSIONS.MAINTENANCE_VIEW_ALL)) {
        return NextResponse.json({ error: 'Issue not found' }, { status: 404 });
      }

      const body = await request.json();

      // Validate input
      const input: UpdateMaintenanceIssueInput = {};

      if (body.status !== undefined) {
        // H-03: Validate status enum
        const statusCheck = validateEnum(body.status, ['open', 'in_progress', 'resolved'] as const, 'status');
        if (statusCheck.error) {
          return NextResponse.json({ error: statusCheck.error }, { status: 400 });
        }
        input.status = statusCheck.value!;
      }

      if (body.assignedTo !== undefined) {
        if (body.assignedTo !== null && typeof body.assignedTo !== 'string') {
          return NextResponse.json({ error: 'assignedTo must be a string or null' }, { status: 400 });
        }
        input.assignedTo = body.assignedTo;
      }

      if (body.resolutionNotes !== undefined) {
        const lengthErr = validateStringLength(body.resolutionNotes, 'resolutionNotes', MAX_LENGTH.NOTES);
        if (lengthErr) {
          return NextResponse.json({ error: lengthErr }, { status: 400 });
        }
        input.resolutionNotes = body.resolutionNotes;
      }

      // Must have at least one field to update
      if (Object.keys(input).length === 0) {
        return NextResponse.json(
          { error: 'No valid fields to update' },
          { status: 400 }
        );
      }

      // Update the issue
      const result = await updateMaintenanceIssue(id, input, context.user.id);

      if (!result.success) {
        // Return 400 for invalid state transitions or other validation errors
        const statusCode = result.error?.includes('Cannot transition') ? 400 : 500;
        return NextResponse.json(
          { error: result.error || 'Failed to update maintenance issue' },
          { status: statusCode }
        );
      }

      return NextResponse.json({ data: result.data });
    } catch (error) {
      console.error('Server error:', error);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  },
  { permission: PERMISSIONS.MAINTENANCE_MANAGE }
);
