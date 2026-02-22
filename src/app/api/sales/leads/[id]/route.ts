import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-auth';
import { PERMISSIONS } from '@/lib/permissions';
import { getLeadById, updateLead, archiveLead } from '@/lib/db';
import { UpdateLeadSchema } from '@/lib/validators/sales';
import type { User } from '@/types';

// GET /api/sales/leads/[id] — Get a single lead with all joins
export const GET = withAuth(
  async (_request: NextRequest, { user, params }: { user: User; params?: Record<string, string> }) => {
    try {
      const id = params?.id;
      if (!id) {
        return NextResponse.json({ error: 'Lead ID is required' }, { status: 400 });
      }

      const lead = await getLeadById(id);
      if (!lead) {
        return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
      }

      return NextResponse.json({ lead });
    } catch (error) {
      console.error('Error in GET /api/sales/leads/[id]:', error);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  },
  { permission: PERMISSIONS.SALES_VIEW }
);

// PATCH /api/sales/leads/[id] — Update lead fields
export const PATCH = withAuth(
  async (request: NextRequest, { user, params }: { user: User; params?: Record<string, string> }) => {
    try {
      const id = params?.id;
      if (!id) {
        return NextResponse.json({ error: 'Lead ID is required' }, { status: 400 });
      }

      const body = await request.json();
      const parsed = UpdateLeadSchema.safeParse(body);

      if (!parsed.success) {
        return NextResponse.json(
          { error: 'Validation failed', details: parsed.error.issues },
          { status: 400 }
        );
      }

      const result = await updateLead(id, parsed.data);

      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }

      return NextResponse.json({ success: true, lead: result.lead });
    } catch (error) {
      console.error('Error in PATCH /api/sales/leads/[id]:', error);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  },
  { permission: PERMISSIONS.SALES_EDIT }
);

// DELETE /api/sales/leads/[id] — Soft delete (archive)
export const DELETE = withAuth(
  async (_request: NextRequest, { user, params }: { user: User; params?: Record<string, string> }) => {
    try {
      const id = params?.id;
      if (!id) {
        return NextResponse.json({ error: 'Lead ID is required' }, { status: 400 });
      }

      const result = await archiveLead(id);

      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }

      return NextResponse.json({ success: true });
    } catch (error) {
      console.error('Error in DELETE /api/sales/leads/[id]:', error);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  },
  { permission: PERMISSIONS.SALES_DELETE }
);
