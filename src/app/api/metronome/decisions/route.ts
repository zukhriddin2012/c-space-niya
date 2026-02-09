import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-auth';
import { PERMISSIONS, hasPermission } from '@/lib/permissions';
import {
  getMetronomeDecisions,
  createMetronomeDecision,
  updateMetronomeDecision,
} from '@/lib/db';
import type { MetronomeDecisionStatus, MetronomeFunctionTag } from '@/lib/db/metronome';

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
    const { question, initiative_id, function_tag, deadline } = body;

    if (!question) {
      return NextResponse.json({ error: 'Question is required' }, { status: 400 });
    }

    if (function_tag) {
      const validTags: MetronomeFunctionTag[] = ['bd', 'construction', 'hr', 'finance', 'legal', 'strategy', 'service'];
      if (!validTags.includes(function_tag)) {
        return NextResponse.json({ error: 'Invalid function_tag' }, { status: 400 });
      }
    }

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
      return NextResponse.json({ error: result.error }, { status: 400 });
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
    const { action, id, ...fields } = body;

    if (!action || !id) {
      return NextResponse.json({ error: 'action and id are required' }, { status: 400 });
    }

    const canEditAll = hasPermission(user.role, PERMISSIONS.METRONOME_EDIT_ALL);

    switch (action) {
      case 'decide': {
        const { decision_text } = fields;
        if (!decision_text) {
          return NextResponse.json({ error: 'decision_text is required' }, { status: 400 });
        }

        const result = await updateMetronomeDecision(id, {
          status: 'decided',
          decision_text,
          decided_by: user.id,
          decided_at: new Date().toISOString(),
        });

        if (!result.success) {
          return NextResponse.json({ error: result.error }, { status: 400 });
        }
        break;
      }

      case 'defer': {
        const result = await updateMetronomeDecision(id, {
          status: 'deferred',
        });

        if (!result.success) {
          return NextResponse.json({ error: result.error }, { status: 400 });
        }
        break;
      }

      case 'update': {
        if (!canEditAll) {
          return NextResponse.json({ error: 'Edit all permission required for update' }, { status: 403 });
        }

        const allowedFields: Record<string, unknown> = {};
        const editableKeys = ['question', 'deadline', 'function_tag', 'initiative_id'];
        for (const key of editableKeys) {
          if (key in fields) {
            allowedFields[key] = fields[key];
          }
        }

        const result = await updateMetronomeDecision(id, allowedFields);
        if (!result.success) {
          return NextResponse.json({ error: result.error }, { status: 400 });
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
