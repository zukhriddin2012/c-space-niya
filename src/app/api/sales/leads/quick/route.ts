import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-auth';
import { PERMISSIONS } from '@/lib/permissions';
import { createLead } from '@/lib/db';
import { supabaseAdmin, isSupabaseAdminConfigured } from '@/lib/db';
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
      const duplicateCheckPromise = phone && isSupabaseAdminConfigured()
        ? supabaseAdmin!
            .from('leads')
            .select('id, full_name, stage, created_at')
            .eq('phone', phone)
            .eq('is_archived', false)
            .neq('stage', 'lost')
            .limit(1)
        : Promise.resolve({ data: null });

      const createPromise = createLead({
        ...rest,
        phone: phone ?? null,
        captured_by: user.employeeId ?? user.id,
      });

      const [duplicateResult, createResult] = await Promise.all([
        duplicateCheckPromise,
        createPromise,
      ]);

      if (!createResult.success) {
        return NextResponse.json({ error: createResult.error }, { status: 400 });
      }

      // Build response with optional duplicate warning
      const response: {
        success: true;
        lead: typeof createResult.lead;
        duplicate_warning?: {
          existing_lead_id: string;
          existing_lead_name: string;
          message: string;
        };
      } = {
        success: true,
        lead: createResult.lead,
      };

      const existing = duplicateResult.data;
      if (existing && existing.length > 0) {
        const match = existing[0];
        const daysAgo = Math.floor(
          (Date.now() - new Date(match.created_at).getTime()) / (1000 * 60 * 60 * 24)
        );
        response.duplicate_warning = {
          existing_lead_id: match.id,
          existing_lead_name: match.full_name,
          message: `This number was logged ${daysAgo} day${daysAgo !== 1 ? 's' : ''} ago as ${match.full_name} (${match.stage}). Log anyway?`,
        };
      }

      return NextResponse.json(response, { status: 201 });
    } catch (error) {
      console.error('Error in POST /api/sales/leads/quick:', error);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  },
  { permission: PERMISSIONS.SALES_CREATE }
);
