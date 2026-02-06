import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { randomInt } from 'crypto';
import { withAuth } from '@/lib/api-auth';
import { PERMISSIONS } from '@/lib/permissions';
import { supabaseAdmin, isSupabaseAdminConfigured } from '@/lib/db/connection';

/**
 * POST /api/reception/operator-pin/bulk-assign
 *
 * Assigns random 6-digit PINs to employees.
 * By default, only assigns to employees without a PIN.
 * Pass { overwrite: true } to reassign PINs for ALL employees.
 *
 * PINs are unique within each branch (enforced in-batch).
 * Returns the generated PINs (plaintext) so the admin can distribute them.
 */
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

  if (!isSupabaseAdminConfigured()) {
    return NextResponse.json(
      { error: 'database_not_configured' },
      { status: 500 }
    );
  }

  try {
    const body = await request.json().catch(() => ({}));
    const overwrite = body.overwrite === true;
    const branchId = body.branchId; // optional: limit to one branch

    // Fetch employees
    let query = supabaseAdmin!
      .from('employees')
      .select('id, full_name, branch_id, operator_pin_hash')
      .eq('status', 'active');

    if (branchId) {
      query = query.eq('branch_id', branchId);
    }

    if (!overwrite) {
      query = query.is('operator_pin_hash', null);
    }

    const { data: employees, error: fetchError } = await query;

    if (fetchError) {
      console.error('Error fetching employees for bulk PIN:', fetchError);
      return NextResponse.json(
        { error: 'fetch_failed', details: fetchError.message },
        { status: 500 }
      );
    }

    if (!employees || employees.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No employees need PIN assignment',
        assigned: [],
        count: 0,
      });
    }

    // Group employees by branch to ensure per-branch uniqueness
    const employeesByBranch = new Map<string, typeof employees>();
    for (const emp of employees) {
      const bId = emp.branch_id;
      if (!employeesByBranch.has(bId)) {
        employeesByBranch.set(bId, []);
      }
      employeesByBranch.get(bId)!.push(emp);
    }

    const results: Array<{
      employeeId: string;
      employeeName: string;
      branchId: string;
      pin: string;
    }> = [];

    for (const [bId, branchEmployees] of employeesByBranch) {
      // Step 1: Generate unique PINs for this branch (in-memory Set, O(1) lookups)
      const usedPins = new Set<string>();
      const pinAssignments: Array<{
        emp: (typeof branchEmployees)[0];
        pin: string;
      }> = [];

      for (const emp of branchEmployees) {
        let pin: string;
        let attempts = 0;

        do {
          pin = String(randomInt(100000, 1000000));
          attempts++;
        } while (usedPins.has(pin) && attempts < 100);

        if (usedPins.has(pin)) {
          console.warn(`Could not generate unique PIN for employee ${emp.id} after 100 attempts`);
          continue;
        }

        usedPins.add(pin);
        pinAssignments.push({ emp, pin });
      }

      // Step 2: Hash all PINs in parallel (much faster than sequential)
      const hashPromises = pinAssignments.map(async ({ emp, pin }) => {
        const pinHash = await bcrypt.hash(pin, 10);
        return { emp, pin, pinHash };
      });

      const hashed = await Promise.all(hashPromises);

      // Step 3: Save all to DB in parallel
      const savePromises = hashed.map(async ({ emp, pin, pinHash }) => {
        const { error: updateError } = await supabaseAdmin!
          .from('employees')
          .update({ operator_pin_hash: pinHash })
          .eq('id', emp.id);

        if (updateError) {
          console.error(`Error setting PIN for employee ${emp.id}:`, updateError);
          return null;
        }

        return {
          employeeId: emp.id,
          employeeName: emp.full_name,
          branchId: bId,
          pin,
        };
      });

      const saved = await Promise.all(savePromises);
      results.push(...saved.filter((r): r is NonNullable<typeof r> => r !== null));
    }

    return NextResponse.json({
      success: true,
      message: `Assigned PINs to ${results.length} employees`,
      assigned: results,
      count: results.length,
    });
  } catch (error) {
    console.error('Bulk PIN assignment error:', error);
    return NextResponse.json(
      { error: 'internal_server_error' },
      { status: 500 }
    );
  }
}

export const POST = withAuth(handler, { permission: PERMISSIONS.OPERATOR_PIN_MANAGE });
