import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-auth';
import { PERMISSIONS } from '@/lib/permissions';
import { assignLead } from '@/lib/db';
import { AssignLeadSchema } from '@/lib/validators/sales';
import type { User } from '@/types';

// PATCH /api/sales/leads/[id]/assign — Reassign lead to another employee
export const PATCH = withAuth(
  async (request: NextRequest, { user, params }: { user: User; params?: Record<string, string> }) => {
    try {
      const id = params?.id;
      if (!id) {
        return NextResponse.json({ error: 'Lead ID is required' }, { status: 400 });
      }

      const body = await request.json();
      const parsed = AssignLeadSchema.safeParse(body);

      if (!parsed.success) {
        return NextResponse.json(
          { error: 'Validation failed', details: parsed.error.issues },
          { status: 400 }
        );
      }

      const result = await assignLead(
        id,
        parsed.data.assigned_to,
        user.employeeId ?? user.id
      );

      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }

      return NextResponse.json({ success: true, lead: result.lead });
    } catch (error) {
      console.error('Error in PATCH /api/sales/leads/[id]/assign:', error);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  },
  { permission: PERMISSIONS.SALES_ASSIGN }
);
