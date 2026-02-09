import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-auth';
import { PERMISSIONS, hasPermission } from '@/lib/permissions';
import {
  getActionItems,
  getActionItemById,
  getMetronomeInitiativeById,
  createActionItem,
  updateActionItem,
  reorderActionItems,
} from '@/lib/db';
import {
  CreateActionItemSchema,
  ToggleActionItemSchema,
  UpdateActionItemSchema,
  ReorderActionItemsSchema,
} from '@/lib/validators/metronome';
import type { MetronomeActionStatus } from '@/lib/db/metronome';

// GET /api/metronome/action-items - List action items
export const GET = withAuth(async (request: NextRequest) => {
  try {
    const searchParams = request.nextUrl.searchParams;
    const initiativeId = searchParams.get('initiative_id');
    const status = searchParams.get('status') as MetronomeActionStatus | null;
    const assignedTo = searchParams.get('assigned_to');

    const items = await getActionItems({
      initiativeId: initiativeId || undefined,
      status: status || undefined,
      assignedTo: assignedTo || undefined,
    });

    return NextResponse.json({ data: items });
  } catch (error) {
    console.error('Error in GET /api/metronome/action-items:', error);
    return NextResponse.json({ error: 'Failed to fetch action items' }, { status: 500 });
  }
}, { permission: PERMISSIONS.METRONOME_VIEW });

// POST /api/metronome/action-items - Create action item
export const POST = withAuth(async (request: NextRequest, { user }) => {
  try {
    const body = await request.json();
    const parsed = CreateActionItemSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten().fieldErrors }, { status: 400 });
    }

    const { initiative_id, title, assigned_to, deadline, status } = parsed.data;

    // SEC-C2: Ownership check — verify user owns or is accountable for the initiative
    const canEditAll = hasPermission(user.role, PERMISSIONS.METRONOME_EDIT_ALL);
    if (!canEditAll) {
      const initiative = await getMetronomeInitiativeById(initiative_id);
      if (!initiative) {
        return NextResponse.json({ error: 'Initiative not found' }, { status: 404 });
      }
      if (initiative.created_by !== user.id && !initiative.accountable_ids.includes(user.id)) {
        return NextResponse.json({ error: 'You can only add action items to your own initiatives' }, { status: 403 });
      }
    }

    const result = await createActionItem({
      initiative_id,
      title,
      status: status || 'pending',
      assigned_to: assigned_to || null,
      deadline: deadline || null,
      sort_order: 0,
    });

    if (!result.success) {
      return NextResponse.json({ error: 'Failed to create action item' }, { status: 400 });
    }

    return NextResponse.json({ data: result.actionItem }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/metronome/action-items:', error);
    return NextResponse.json({ error: 'Failed to create action item' }, { status: 500 });
  }
}, { permission: PERMISSIONS.METRONOME_EDIT_OWN });

// PATCH /api/metronome/action-items - Toggle/update/reorder action items
export const PATCH = withAuth(async (request: NextRequest, { user }) => {
  try {
    const body = await request.json();
    const { action } = body;

    if (!action) {
      return NextResponse.json({ error: 'Action is required (toggle/update/reorder)' }, { status: 400 });
    }

    const canEditAll = hasPermission(user.role, PERMISSIONS.METRONOME_EDIT_ALL);

    switch (action) {
      case 'toggle': {
        // SEC-C4: Zod validation
        const parsed = ToggleActionItemSchema.safeParse(body);
        if (!parsed.success) {
          return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten().fieldErrors }, { status: 400 });
        }

        // SEC-H1: Single-row lookup instead of full table scan
        const item = await getActionItemById(parsed.data.id);
        if (!item) {
          return NextResponse.json({ error: 'Action item not found' }, { status: 404 });
        }

        // SEC-C2: Ownership check via parent initiative
        if (!canEditAll) {
          const initiative = await getMetronomeInitiativeById(item.initiative_id);
          if (!initiative) {
            return NextResponse.json({ error: 'Parent initiative not found' }, { status: 404 });
          }
          if (initiative.created_by !== user.id && !initiative.accountable_ids.includes(user.id)) {
            return NextResponse.json({ error: 'You can only modify action items on your own initiatives' }, { status: 403 });
          }
        }

        // SEC-M2: Atomic toggle — compute new status from fetched item
        const newStatus: MetronomeActionStatus = item.status === 'done' ? 'pending' : 'done';
        const completedAt = newStatus === 'done' ? new Date().toISOString() : null;

        const result = await updateActionItem(parsed.data.id, {
          status: newStatus,
          completed_at: completedAt,
        });

        if (!result.success) {
          return NextResponse.json({ error: 'Failed to toggle action item' }, { status: 400 });
        }

        return NextResponse.json({ success: true, newStatus });
      }

      case 'update': {
        const parsed = UpdateActionItemSchema.safeParse(body);
        if (!parsed.success) {
          return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten().fieldErrors }, { status: 400 });
        }

        // SEC-C2: Ownership check
        const item = await getActionItemById(parsed.data.id);
        if (!item) {
          return NextResponse.json({ error: 'Action item not found' }, { status: 404 });
        }

        if (!canEditAll) {
          const initiative = await getMetronomeInitiativeById(item.initiative_id);
          if (!initiative) {
            return NextResponse.json({ error: 'Parent initiative not found' }, { status: 404 });
          }
          if (initiative.created_by !== user.id && !initiative.accountable_ids.includes(user.id)) {
            return NextResponse.json({ error: 'You can only modify action items on your own initiatives' }, { status: 403 });
          }
        }

        const { id, action: _action, ...fields } = parsed.data;
        const allowedFields: Record<string, unknown> = {};
        const editableKeys = ['title', 'status', 'assigned_to', 'deadline', 'sort_order'];
        for (const key of editableKeys) {
          if (key in fields) {
            allowedFields[key] = (fields as Record<string, unknown>)[key];
          }
        }

        if (allowedFields.status === 'done') {
          allowedFields.completed_at = new Date().toISOString();
        } else if (allowedFields.status && allowedFields.status !== 'done') {
          allowedFields.completed_at = null;
        }

        const result = await updateActionItem(id, allowedFields);
        if (!result.success) {
          return NextResponse.json({ error: 'Failed to update action item' }, { status: 400 });
        }

        return NextResponse.json({ success: true });
      }

      case 'reorder': {
        // SEC-M3: Zod validates array length (max 100), UUID format, sort_order range
        const parsed = ReorderActionItemsSchema.safeParse(body);
        if (!parsed.success) {
          return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten().fieldErrors }, { status: 400 });
        }

        const result = await reorderActionItems(parsed.data.items);
        if (!result.success) {
          return NextResponse.json({ error: 'Failed to reorder action items' }, { status: 400 });
        }

        return NextResponse.json({ success: true });
      }

      default:
        return NextResponse.json({ error: 'Invalid action. Use: toggle, update, reorder' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error in PATCH /api/metronome/action-items:', error);
    return NextResponse.json({ error: 'Failed to update action item' }, { status: 500 });
  }
}, { permission: PERMISSIONS.METRONOME_EDIT_OWN });
