import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { withAuth } from '@/lib/api-auth';
import { PERMISSIONS } from '@/lib/permissions';
import { getEmployeesWithPin, logOperatorSwitch } from '@/lib/db/operator-switch';
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
    const { pin, branchId } = body;

    // Validate PIN format
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

    // Get employees with PINs
    const employees = await getEmployeesWithPin(branchId);

    // Try to match PIN
    for (const employee of employees) {
      const pinMatch = await bcrypt.compare(pin, employee.operator_pin_hash);

      if (pinMatch) {
        // Reset lockout on successful match
        resetLockout(lockoutKey);

        // Log the switch
        await logOperatorSwitch({
          branchId,
          sessionUserId: context.user.id,
          switchedToId: employee.id,
          isCrossBranch: employee.is_cross_branch,
          homeBranchId: employee.is_cross_branch ? employee.branch_id : undefined,
        });

        return NextResponse.json(
          {
            operator: {
              id: employee.id,
              name: employee.full_name,
              branchId,
              isCrossBranch: employee.is_cross_branch,
              homeBranchId: employee.is_cross_branch ? employee.branch_id : undefined,
            },
          },
          { status: 200 }
        );
      }
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
    console.error('Operator switch error:', error);
    return NextResponse.json(
      { error: 'internal_server_error' },
      { status: 500 }
    );
  }
}

export const POST = withAuth(handler, { permission: PERMISSIONS.RECEPTION_VIEW });
