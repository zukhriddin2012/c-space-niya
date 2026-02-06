import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { withAuth } from '@/lib/api-auth';
import { PERMISSIONS, hasPermission } from '@/lib/permissions';
import {
  getEmployeesWithPin,
  setEmployeePinHash,
} from '@/lib/db/operator-switch';
import { getEmployeeById } from '@/lib/db/employees';
import { supabaseAdmin, isSupabaseAdminConfigured } from '@/lib/db/connection';

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
    const { pin, employeeId } = body;

    // Validate PIN format
    if (!pin || typeof pin !== 'string' || pin.length !== 4 || !/^\d+$/.test(pin)) {
      return NextResponse.json(
        { error: 'invalid_pin_format' },
        { status: 400 }
      );
    }

    // Determine target employee
    let targetEmployeeId: string;
    let targetBranchId: string;

    if (employeeId) {
      // H-01: Use proper permission check instead of role string matching
      if (!hasPermission(context.user.role as any, PERMISSIONS.OPERATOR_PIN_MANAGE)) {
        return NextResponse.json(
          { error: 'insufficient_permissions' },
          { status: 403 }
        );
      }

      targetEmployeeId = employeeId;

      // Get the target employee's branch ID
      const targetEmployee = await getEmployeeById(employeeId);

      if (!targetEmployee || !targetEmployee.branch_id) {
        return NextResponse.json(
          { error: 'employee_not_found' },
          { status: 404 }
        );
      }

      targetBranchId = targetEmployee.branch_id;
    } else {
      // Set PIN for current user - fetch by auth user email
      if (!isSupabaseAdminConfigured()) {
        return NextResponse.json(
          { error: 'database_not_configured' },
          { status: 500 }
        );
      }

      const { data: employee, error: empError } = await supabaseAdmin!
        .from('employees')
        .select('id, branch_id')
        .eq('email', context.user.email)
        .single();

      if (empError || !employee) {
        return NextResponse.json(
          { error: 'employee_not_found' },
          { status: 404 }
        );
      }

      targetEmployeeId = employee.id;
      targetBranchId = employee.branch_id;
    }

    // Check PIN uniqueness within branch
    const existingPins = await getEmployeesWithPin(targetBranchId);

    for (const employee of existingPins) {
      // Skip the same employee
      if (employee.id === targetEmployeeId) {
        continue;
      }

      const pinMatch = await bcrypt.compare(pin, employee.operator_pin_hash);
      if (pinMatch) {
        return NextResponse.json(
          { error: 'pin_already_taken' },
          { status: 409 }
        );
      }
    }

    // Hash the PIN
    const pinHash = await bcrypt.hash(pin, 10);

    // Save PIN hash
    await setEmployeePinHash(targetEmployeeId, pinHash);

    return NextResponse.json(
      { success: true },
      { status: 200 }
    );
  } catch (error) {
    console.error('Operator PIN management error:', error);
    return NextResponse.json(
      { error: 'internal_server_error' },
      { status: 500 }
    );
  }
}

export const POST = withAuth(handler, { permission: PERMISSIONS.RECEPTION_VIEW });
