import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-auth';
import { PERMISSIONS, hasPermission } from '@/lib/permissions';
import {
  getMetronomeDecisions,
  getDecisionById,
  createMetronomeDecision,
  updateMetronomeDecision,
} from '@/lib/db';
import {
  CreateDecisionSchema,
  DecideSchema,
  DeferSchema,
  UpdateDecisionSchema,
} from '@/lib/validators/metronome';
import type { MetronomeDecisionStatus } from '@/lib/db/metronome';

// GET /api/metronome/decisions - List decisions
export const GET = withAuth(async (request: NextRequest) => {
  try {
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status') as MetronomeDecisionStatus | null;
    const initiativeId = searchParams.get('initiative_id');

    const decisions = await getMetronomeDecisions({
      status: status || undefined,
      initiativeId: initiativeId || undefined,
    });

    return NextResponse.json({ data: decisions });
  } catch (error) {
    console.error('Error in GET /api/metronome/decisions:', error);
    return NextResponse.json({ error: 'Failed to fetch decisions' }, { status: 500 });
  }
}, { permission: PERMISSIONS.METRONOME_VIEW });

// POST /api/metronome/decisions - Create decision
export const POST = withAuth(async (request: NextRequest, { user }) => {
  try {
    const body = await request.json();
    const parsed = CreateDecisionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten().fieldErrors }, { status: 400 });
    }

    const { question, initiative_id, function_tag, deadline } = parsed.data;

    const result = await createMetronomeDecision({
      question,
      initiative_id: initiative_id || null,
      function_tag: function_tag || null,
      status: 'open',
      decision_text: null,
      decided_by: null,
      deadline: deadline || null,
      created_by: user.id,
    });

    if (!result.success) {
      return NextResponse.json({ error: 'Failed to create decision' }, { status: 400 });
    }

    return NextResponse.json({ data: result.decision }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/metronome/decisions:', error);
    return NextResponse.json({ error: 'Failed to create decision' }, { status: 500 });
  }
}, { permission: PERMISSIONS.METRONOME_CREATE });

// PATCH /api/metronome/decisions - Decide/defer/update a decision
export const PATCH = withAuth(async (request: NextRequest, { user }) => {
  try {
    const body = await request.json();
    const { action } = body;

    if (!action) {
      return NextResponse.json({ error: 'action is required' }, { status: 400 });
    }

    const canEditAll = hasPermission(user.role, PERMISSIONS.METRONOME_EDIT_ALL);
    const canRunMeeting = hasPermission(user.role, PERMISSIONS.METRONOME_RUN_MEETING);

    switch (action) {
      case 'decide': {
        const parsed = DecideSchema.safeParse(body);
        if (!parsed.success) {
          return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten().fieldErrors }, { status: 400 });
        }

        // SEC-C3: Ownership check — decide requires EDIT_ALL, RUN_MEETING, or being the creator
        const decision = await getDecisionById(parsed.data.id);
        if (!decision) {
          return NextResponse.json({ error: 'Decision not found' }, { status: 404 });
        }

        if (!canEditAll && !canRunMeeting && decision.created_by !== user.id) {
          return NextResponse.json({ error: 'You can only decide on your own decisions or during meetings' }, { status: 403 });
        }

        const result = await updateMetronomeDecision(parsed.data.id, {
          status: 'decided',
          decision_text: parsed.data.decision_text,
          decided_by: user.id,
          decided_at: new Date().toISOString(),
        });

        if (!result.success) {
          return NextResponse.json({ error: 'Failed to decide' }, { status: 400 });
        }
        break;
      }

      case 'defer': {
        const parsed = DeferSchema.safeParse(body);
        if (!parsed.success) {
          return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten().fieldErrors }, { status: 400 });
        }

        // SEC-C3: Ownership check — defer requires EDIT_ALL, RUN_MEETING, or being the creator
        const decision = await getDecisionById(parsed.data.id);
        if (!decision) {
          return NextResponse.json({ error: 'Decision not found' }, { status: 404 });
        }

        if (!canEditAll && !canRunMeeting && decision.created_by !== user.id) {
          return NextResponse.json({ error: 'You can only defer your own decisions or during meetings' }, { status: 403 });
        }

        const result = await updateMetronomeDecision(parsed.data.id, {
          status: 'deferred',
        });

        if (!result.success) {
          return NextResponse.json({ error: 'Failed to defer decision' }, { status: 400 });
        }
        break;
      }

      case 'update': {
        const parsed = UpdateDecisionSchema.safeParse(body);
        if (!parsed.success) {
          return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten().fieldErrors }, { status: 400 });
        }

        if (!canEditAll) {
          return NextResponse.json({ error: 'Edit all permission required for update' }, { status: 403 });
        }

        const { id, action: _action, ...fields } = parsed.data;
        const allowedFields: Record<string, unknown> = {};
        const editableKeys = ['question', 'deadline', 'function_tag', 'initiative_id'];
        for (const key of editableKeys) {
          if (key in fields) {
            allowedFields[key] = (fields as Record<string, unknown>)[key];
          }
        }

        const result = await updateMetronomeDecision(id, allowedFields);
        if (!result.success) {
          return NextResponse.json({ error: 'Failed to update decision' }, { status: 400 });
        }
        break;
      }

      default:
        return NextResponse.json({ error: 'Invalid action. Use: decide, defer, update' }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in PATCH /api/metronome/decisions:', error);
    return NextResponse.json({ error: 'Failed to update decision' }, { status: 500 });
  }
}, { permission: PERMISSIONS.METRONOME_EDIT_OWN });
