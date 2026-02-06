import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-auth';
import { PERMISSIONS } from '@/lib/permissions';
import { addMaintenanceAttachment, getMaintenanceIssueById } from '@/lib/db/maintenance-issues';
import { validateRecordBranchAccess, validateFileMetadata } from '@/lib/security';
import type { User } from '@/types';

// ============================================
// POST /api/reception/maintenance-issues/[id]/attachments
// Upload attachment metadata for maintenance issue
// (Actual file upload to Supabase Storage will be added later)
// ============================================
export const POST = withAuth(
  async (request: NextRequest, context: { user: { id: string; role: string; email: string }; params?: Record<string, string> }) => {
    try {
      const id = context.params?.id;

      if (!id) {
        return NextResponse.json({ error: 'Issue ID is required' }, { status: 400 });
      }

      // C-02: Verify the issue belongs to user's branch
      const issue = await getMaintenanceIssueById(id);
      if (!issue) {
        return NextResponse.json({ error: 'Issue not found' }, { status: 404 });
      }
      if (!validateRecordBranchAccess(context.user as User, issue.branchId, PERMISSIONS.MAINTENANCE_VIEW_ALL)) {
        return NextResponse.json({ error: 'Issue not found' }, { status: 404 });
      }

      const body = await request.json();

      // H-07 / M-10: Validate file metadata with proper bounds
      const errors = validateFileMetadata(body);

      if (errors.length > 0) {
        return NextResponse.json(
          { error: 'Validation failed', details: errors },
          { status: 400 }
        );
      }

      // Add attachment metadata
      const attachment = await addMaintenanceAttachment(
        id,
        body.fileName.trim(),
        body.fileType.trim(),
        body.fileSize,
        body.fileUrl.trim(),
        context.user.id
      );

      if (!attachment) {
        return NextResponse.json(
          { error: 'Failed to add attachment' },
          { status: 500 }
        );
      }

      return NextResponse.json({ data: attachment }, { status: 201 });
    } catch (error) {
      console.error('Server error:', error);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  },
  { permission: PERMISSIONS.RECEPTION_MAINTENANCE_REPORT }
);
