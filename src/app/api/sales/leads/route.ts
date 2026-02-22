import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-auth';
import { PERMISSIONS, hasPermission } from '@/lib/permissions';
import { getLeads, createLead, checkLeadDuplicates, buildDuplicateWarning } from '@/lib/db';
import { CreateLeadSchema, LeadQuerySchema } from '@/lib/validators/sales';
import type { User } from '@/types';

// GET /api/sales/leads — List leads with optional filters
export const GET = withAuth(
  async (request: NextRequest, { user }: { user: User }) => {
    try {
      const { searchParams } = new URL(request.url);
      const parsed = LeadQuerySchema.safeParse(Object.fromEntries(searchParams));

      if (!parsed.success) {
        return NextResponse.json(
          { error: 'Invalid query parameters', details: parsed.error.issues },
          { status: 400 }
        );
      }

      const query = parsed.data;
      const options: Parameters<typeof getLeads>[0] = {};

      // Branch scoping: SALES_VIEW_ALL sees everything, SALES_VIEW only own branch
      if (!hasPermission(user.role, PERMISSIONS.SALES_VIEW_ALL)) {
        options.branchId = user.branchId;
      } else if (query.branchId) {
        options.branchId = query.branchId;
      }

      if (query.stage) options.stage = query.stage;
      if (query.assignedTo) options.assignedTo = query.assignedTo;
      if (query.capturedBy) options.capturedBy = query.capturedBy;
      if (query.priority) options.priority = query.priority;
      if (query.sourceId) options.sourceId = query.sourceId;
      if (query.isArchived === 'true') options.isArchived = true;

      const leads = await getLeads(options);
      return NextResponse.json({ leads });
    } catch (error) {
      console.error('Error in GET /api/sales/leads:', error);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  },
  { permission: PERMISSIONS.SALES_VIEW }
);

// POST /api/sales/leads — Create a new lead
export const POST = withAuth(
  async (request: NextRequest, { user }: { user: User }) => {
    try {
      const body = await request.json();
      const parsed = CreateLeadSchema.safeParse(body);

      if (!parsed.success) {
        return NextResponse.json(
          { error: 'Validation failed', details: parsed.error.issues },
          { status: 400 }
        );
      }

      // Run duplicate check and lead creation concurrently
      const [duplicateMatches, createResult] = await Promise.all([
        checkLeadDuplicates({
          phone: parsed.data.phone,
          fullName: parsed.data.full_name,
          branchId: parsed.data.branch_id,
        }),
        createLead({
          ...parsed.data,
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
      console.error('Error in POST /api/sales/leads:', error);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  },
  { permission: PERMISSIONS.SALES_CREATE }
);
