import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-auth';
import { PERMISSIONS } from '@/lib/permissions';
import { createLead, checkLeadDuplicates, buildDuplicateWarning } from '@/lib/db';
import { QuickCaptureSchema } from '@/lib/validators/sales';
import type { User } from '@/types';

// POST /api/sales/leads/quick — Quick capture with duplicate warning
// Optimized for speed: minimal validation, non-blocking duplicate check
export const POST = withAuth(
  async (request: NextRequest, { user }: { user: User }) => {
    try {
      const body = await request.json();
      const parsed = QuickCaptureSchema.safeParse(body);

      if (!parsed.success) {
        return NextResponse.json(
          { error: 'Validation failed', details: parsed.error.issues },
          { status: 400 }
        );
      }

      const { phone, ...rest } = parsed.data;

      // Run duplicate check and lead creation concurrently for speed
      const [duplicateMatches, createResult] = await Promise.all([
        checkLeadDuplicates({
          phone: phone,
          fullName: parsed.data.full_name,
          branchId: parsed.data.branch_id,
        }),
        createLead({
          ...rest,
          phone: phone ?? null,
          captured_by: user.employeeId ?? user.id,
        }),
      ]);

      if (!createResult.success) {
        return NextResponse.json({ error: createResult.error }, { status: 400 });
      }

      const duplicateWarning = buildDuplicateWarning(duplicateMatches);

      return NextResponse.json({
        success: true,
        lead: createResult.lead,
        ...(duplicateWarning && { duplicate_warning: duplicateWarning }),
      }, { status: 201 });
    } catch (error) {
      console.error('Error in POST /api/sales/leads/quick:', error);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  },
  { permission: PERMISSIONS.SALES_CREATE }
);
