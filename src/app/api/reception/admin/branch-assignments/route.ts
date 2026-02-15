import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-auth';
import { CreateAssignmentSchema, AssignmentQuerySchema } from '@/lib/validators/branch-assignments';
import { createBranchAssignment, autoGrantBranchAccess, getAssignmentsByBranch, getAssignmentsByEmployee } from '@/lib/db/operator-switch';
import { audit, getRequestMeta } from '@/lib/audit';

// GET /api/reception/admin/branch-assignments
export const GET = withAuth(async (request: NextRequest, { user }) => {
  try {
    const params = Object.fromEntries(new URL(request.url).searchParams);
    const parsed = AssignmentQuerySchema.safeParse(params);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid parameters', details: parsed.error.issues }, { status: 400 });
    }
    const { branchId, employeeId, type, includeExpired, search, page, pageSize } = parsed.data;

    if (branchId) {
      const result = await getAssignmentsByBranch(branchId, {
        type,
        search,
        includeExpired: includeExpired === 'true',
        page,
        pageSize,
      });
      if (!result.success) return NextResponse.json({ error: result.error }, { status: 500 });
      return NextResponse.json({ assignments: result.data, total: result.total, page, pageSize });
    } else {
      const result = await getAssignmentsByEmployee(employeeId!, {
        includeExpired: includeExpired === 'true',
      });
      if (!result.success) return NextResponse.json({ error: result.error }, { status: 500 });
      return NextResponse.json({ assignments: result.data });
    }
  } catch (error) {
    console.error('Error in GET /api/reception/admin/branch-assignments:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}, { roles: ['general_manager'] });

// POST /api/reception/admin/branch-assignments
export const POST = withAuth(async (request: NextRequest, { user }) => {
  try {
    const body = await request.json();
    const parsed = CreateAssignmentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.issues }, { status: 400 });
    }

    const result = await createBranchAssignment({
      ...parsed.data,
      assignedBy: user.id,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    // AT-3: Auto-grant branch access
    const { granted } = await autoGrantBranchAccess(
      result.data!.id,
      parsed.data.employeeId,
      parsed.data.assignedBranchId,
      user.id
    );

    // Audit
    audit({
      user_id: user.id,
      action: 'assignment.created',
      resource_type: 'branch_employee_assignment',
      resource_id: result.data!.id,
      details: { assignmentType: parsed.data.assignmentType, accessGranted: granted },
      ...getRequestMeta(request),
    });

    return NextResponse.json({ assignment: result.data, accessGranted: granted }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/reception/admin/branch-assignments:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}, { roles: ['general_manager'] });
