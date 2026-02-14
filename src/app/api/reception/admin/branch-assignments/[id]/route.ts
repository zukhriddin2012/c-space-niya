import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-auth';
import { UpdateAssignmentSchema } from '@/lib/validators/branch-assignments';
import { updateBranchAssignment, removeBranchAssignment } from '@/lib/db/operator-switch';
import { audit, getRequestMeta } from '@/lib/audit';

// PATCH /api/reception/admin/branch-assignments/[id]
export const PATCH = withAuth(async (request: NextRequest, { user, params }) => {
  try {
    const id = params?.id;
    if (!id) {
      return NextResponse.json({ error: 'Assignment ID required' }, { status: 400 });
    }

    const body = await request.json();
    const parsed = UpdateAssignmentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.issues }, { status: 400 });
    }

    const result = await updateBranchAssignment(id, parsed.data);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    audit({
      user_id: user.id,
      action: 'assignment.updated',
      resource_type: 'branch_employee_assignment',
      resource_id: id,
      details: parsed.data,
      ...getRequestMeta(request),
    });

    return NextResponse.json({ assignment: result.data });
  } catch (error) {
    console.error('Error in PATCH /api/reception/admin/branch-assignments/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}, { roles: ['general_manager'] });

// DELETE /api/reception/admin/branch-assignments/[id]
export const DELETE = withAuth(async (request: NextRequest, { user, params }) => {
  try {
    const id = params?.id;
    if (!id) {
      return NextResponse.json({ error: 'Assignment ID required' }, { status: 400 });
    }

    const result = await removeBranchAssignment(id);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    audit({
      user_id: user.id,
      action: 'assignment.removed',
      resource_type: 'branch_employee_assignment',
      resource_id: id,
      details: { accessRevoked: result.accessRevoked },
      ...getRequestMeta(request),
    });

    return NextResponse.json({ success: true, accessRevoked: result.accessRevoked });
  } catch (error) {
    console.error('Error in DELETE /api/reception/admin/branch-assignments/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}, { roles: ['general_manager'] });
