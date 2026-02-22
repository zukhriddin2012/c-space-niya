import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-auth';
import { PERMISSIONS } from '@/lib/permissions';
import { getLeadActivities, createLeadActivity } from '@/lib/db';
import { CreateActivitySchema } from '@/lib/validators/sales';
import type { User } from '@/types';

// GET /api/sales/leads/[id]/activities — List activities for a lead
export const GET = withAuth(
  async (_request: NextRequest, { user, params }: { user: User; params?: Record<string, string> }) => {
    try {
      const leadId = params?.id;
      if (!leadId) {
        return NextResponse.json({ error: 'Lead ID is required' }, { status: 400 });
      }

      const activities = await getLeadActivities(leadId);
      return NextResponse.json({ activities });
    } catch (error) {
      console.error('Error in GET /api/sales/leads/[id]/activities:', error);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  },
  { permission: PERMISSIONS.SALES_VIEW }
);

// POST /api/sales/leads/[id]/activities — Log a manual activity
export const POST = withAuth(
  async (request: NextRequest, { user, params }: { user: User; params?: Record<string, string> }) => {
    try {
      const leadId = params?.id;
      if (!leadId) {
        return NextResponse.json({ error: 'Lead ID is required' }, { status: 400 });
      }

      const body = await request.json();
      const parsed = CreateActivitySchema.safeParse(body);

      if (!parsed.success) {
        return NextResponse.json(
          { error: 'Validation failed', details: parsed.error.issues },
          { status: 400 }
        );
      }

      const result = await createLeadActivity({
        lead_id: leadId,
        ...parsed.data,
        performed_by: user.employeeId ?? user.id,
      });

      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }

      return NextResponse.json({ success: true, activity: result.activity }, { status: 201 });
    } catch (error) {
      console.error('Error in POST /api/sales/leads/[id]/activities:', error);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  },
  { permission: PERMISSIONS.SALES_EDIT }
);
