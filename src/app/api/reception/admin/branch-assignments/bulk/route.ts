import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-auth';
import { BulkCreateAssignmentSchema } from '@/lib/validators/branch-assignments';
import { createBranchAssignment, autoGrantBranchAccess } from '@/lib/db/operator-switch';
import { audit, getRequestMeta } from '@/lib/audit';
import type { BranchAssignment } from '@/modules/reception/types';

// POST /api/reception/admin/branch-assignments/bulk
export const POST = withAuth(async (request: NextRequest, { user }) => {
  try {
    const body = await request.json();
    const parsed = BulkCreateAssignmentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.issues }, { status: 400 });
    }

    const { employeeIds, assignedBranchId, assignmentType, startsAt, endsAt, notes } = parsed.data;

    const created: BranchAssignment[] = [];
    const skipped: Array<{ employeeId: string; employeeName: string; reason: string }> = [];
    let accessGranted = 0;

    // Process each employee sequentially (validation requires individual checks)
    for (const employeeId of employeeIds) {
      const result = await createBranchAssignment({
        employeeId,
        assignedBranchId,
        assignmentType,
        assignedBy: user.id,
        startsAt,
        endsAt,
        notes,
      });

      if (!result.success) {
        // Map error to reason
        let reason = 'unknown';
        const err = result.error || '';
        if (err.includes('not found')) reason = 'not_found';
        else if (err.includes('PIN')) reason = 'no_pin';
        else if (err.includes('home branch')) reason = 'same_branch';
        else if (err.includes('already has')) reason = 'already_assigned';

        skipped.push({ employeeId, employeeName: '', reason });
        continue;
      }

      created.push(result.data!);

      // AT-3: Auto-grant branch access
      const { granted } = await autoGrantBranchAccess(
        result.data!.id,
        employeeId,
        assignedBranchId,
        user.id
      );
      if (granted) accessGranted++;
    }

    // Audit
    audit({
      user_id: user.id,
      action: 'assignment.bulk_created',
      resource_type: 'branch_employee_assignment',
      details: {
        assignedBranchId,
        assignmentType,
        createdCount: created.length,
        skippedCount: skipped.length,
        accessGranted,
      },
      ...getRequestMeta(request),
    });

    return NextResponse.json({ created, skipped, accessGranted }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/reception/admin/branch-assignments/bulk:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}, { roles: ['general_manager'] });
