import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-auth';
import { PERMISSIONS } from '@/lib/permissions';
import {
  getActionItems,
  createActionItem,
  updateActionItem,
  reorderActionItems,
} from '@/lib/db';
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
export const POST = withAuth(async (request: NextRequest) => {
  try {
    const body = await request.json();
    const { initiative_id, title, assigned_to, deadline, status } = body;

    if (!initiative_id || !title) {
      return NextResponse.json({ error: 'initiative_id and title are required' }, { status: 400 });
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
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ data: result.actionItem }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/metronome/action-items:', error);
    return NextResponse.json({ error: 'Failed to create action item' }, { status: 500 });
  }
}, { permission: PERMISSIONS.METRONOME_EDIT_OWN });

// PATCH /api/metronome/action-items - Toggle/update/reorder action items
export const PATCH = withAuth(async (request: NextRequest) => {
  try {
    const body = await request.json();
    const { action, id, items, ...fields } = body;

    if (!action) {
      return NextResponse.json({ error: 'Action is required (toggle/update/reorder)' }, { status: 400 });
    }

    switch (action) {
      case 'toggle': {
        if (!id) {
          return NextResponse.json({ error: 'id is required for toggle' }, { status: 400 });
        }

        // Get current status to toggle
        const currentItems = await getActionItems();
        const item = currentItems.find(i => i.id === id);
        if (!item) {
          return NextResponse.json({ error: 'Action item not found' }, { status: 404 });
        }

        const newStatus = item.status === 'done' ? 'pending' : 'done';
        const completedAt = newStatus === 'done' ? new Date().toISOString() : null;

        const result = await updateActionItem(id, {
          status: newStatus,
          completed_at: completedAt,
        });

        if (!result.success) {
          return NextResponse.json({ error: result.error }, { status: 400 });
        }
        break;
      }

      case 'update': {
        if (!id) {
          return NextResponse.json({ error: 'id is required for update' }, { status: 400 });
        }

        const allowedFields: Record<string, unknown> = {};
        const editableKeys = ['title', 'status', 'assigned_to', 'deadline', 'sort_order'];
        for (const key of editableKeys) {
          if (key in fields) {
            allowedFields[key] = fields[key];
          }
        }

        // If status changed to done, set completed_at
        if (allowedFields.status === 'done') {
          allowedFields.completed_at = new Date().toISOString();
        } else if (allowedFields.status && allowedFields.status !== 'done') {
          allowedFields.completed_at = null;
        }

        const result = await updateActionItem(id, allowedFields);
        if (!result.success) {
          return NextResponse.json({ error: result.error }, { status: 400 });
        }
        break;
      }

      case 'reorder': {
        if (!items || !Array.isArray(items)) {
          return NextResponse.json({ error: 'items array is required for reorder' }, { status: 400 });
        }

        const result = await reorderActionItems(items);
        if (!result.success) {
          return NextResponse.json({ error: result.error }, { status: 400 });
        }
        break;
      }

      default:
        return NextResponse.json({ error: 'Invalid action. Use: toggle, update, reorder' }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in PATCH /api/metronome/action-items:', error);
    return NextResponse.json({ error: 'Failed to update action item' }, { status: 500 });
  }
}, { permission: PERMISSIONS.METRONOME_EDIT_OWN });
