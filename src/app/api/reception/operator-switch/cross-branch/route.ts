import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { withAuth } from '@/lib/api-auth';
import { PERMISSIONS } from '@/lib/permissions';
import { getEmployeePinHash, logOperatorSwitch } from '@/lib/db/operator-switch';
import { getEmployeeById } from '@/lib/db/employees';
import {
  checkLockout,
  recordFailure,
  resetLockout,
} from '@/modules/reception/lib/pin-lockout';

async function handler(
  request: Request,
  context: { user: { id: string; role: string; email: string } }
) {
  if (request.method !== 'POST') {
    return NextResponse.json(
      { error: 'method_not_allowed' },
      { status: 405 }
    );
  }

  try {
    const body = await request.json();
    const { employeeId, pin, branchId } = body;

    // Validate inputs
    if (!employeeId || typeof employeeId !== 'string') {
      return NextResponse.json(
        { error: 'missing_employee_id' },
        { status: 400 }
      );
    }

    if (!pin || typeof pin !== 'string' || pin.length !== 4 || !/^\d+$/.test(pin)) {
      return NextResponse.json(
        { error: 'invalid_pin_format' },
        { status: 400 }
      );
    }

    if (!branchId || typeof branchId !== 'string') {
      return NextResponse.json(
        { error: 'missing_branch_id' },
        { status: 400 }
      );
    }

    // Check lockout status
    const lockoutKey = `${branchId}:${context.user.id}`;
    const lockoutStatus = checkLockout(lockoutKey);

    if (lockoutStatus.locked) {
      return NextResponse.json(
        {
          error: 'too_many_attempts',
          lockoutRemainingSeconds: lockoutStatus.remainingSeconds,
        },
        { status: 423 }
      );
    }

    // Get employee PIN hash and full employee data
    const pinHash = await getEmployeePinHash(employeeId);

    if (!pinHash) {
      return NextResponse.json(
        { error: 'no_pin_set' },
        { status: 404 }
      );
    }

    // Get full employee data
    const employee = await getEmployeeById(employeeId);

    if (!employee) {
      return NextResponse.json(
        { error: 'employee_not_found' },
        { status: 404 }
      );
    }

    // Try to match PIN
    const pinMatch = await bcrypt.compare(pin, pinHash);

    if (pinMatch) {
      // Reset lockout on successful match
      resetLockout(lockoutKey);

      // Log the switch
      await logOperatorSwitch({
        branchId,
        sessionUserId: context.user.id,
        switchedToId: employeeId,
        isCrossBranch: true,
        homeBranchId: employee.branch_id || undefined,
      });

      return NextResponse.json(
        {
          operator: {
            id: employeeId,
            name: employee.full_name,
            branchId: employee.branch_id || undefined,
            isCrossBranch: true,
            homeBranchId: employee.branch_id || undefined,
          },
        },
        { status: 200 }
      );
    }

    // No match found - record failure
    const failureResult = recordFailure(lockoutKey);

    if (failureResult.locked) {
      return NextResponse.json(
        {
          error: 'too_many_attempts',
          lockoutRemainingSeconds: failureResult.lockoutRemainingSeconds,
        },
        { status: 423 }
      );
    }

    return NextResponse.json(
      {
        error: 'invalid_pin',
        attemptsRemaining: failureResult.attemptsRemaining,
      },
      { status: 401 }
    );
  } catch (error) {
    console.error('Cross-branch operator switch error:', error);
    return NextResponse.json(
      { error: 'internal_server_error' },
      { status: 500 }
    );
  }
}

export const POST = withAuth(handler, { permission: PERMISSIONS.RECEPTION_VIEW });
