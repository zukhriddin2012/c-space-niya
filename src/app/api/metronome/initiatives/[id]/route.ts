import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-auth';
import { PERMISSIONS, hasPermission } from '@/lib/permissions';
import { getMetronomeInitiativeById, updateMetronomeInitiative } from '@/lib/db';

// PATCH /api/metronome/initiatives/[id] - Update/archive/restore initiative
export const PATCH = withAuth(async (request: NextRequest, { user, params }) => {
  try {
    const id = params?.id;
    if (!id) {
      return NextResponse.json({ error: 'Initiative ID required' }, { status: 400 });
    }

    const body = await request.json();
    const { action, ...fields } = body;

    if (!action) {
      return NextResponse.json({ error: 'Action is required (update/archive/restore)' }, { status: 400 });
    }

    // Get the initiative to check ownership
    const initiative = await getMetronomeInitiativeById(id);
    if (!initiative) {
      return NextResponse.json({ error: 'Initiative not found' }, { status: 404 });
    }

    const canEditAll = hasPermission(user.role, PERMISSIONS.METRONOME_EDIT_ALL);
    const isOwner = initiative.created_by === user.id;

    switch (action) {
      case 'update': {
        // EDIT_OWN requires ownership, EDIT_ALL bypasses
        if (!canEditAll && !isOwner) {
          return NextResponse.json({ error: 'You can only edit your own initiatives' }, { status: 403 });
        }

        const allowedFields: Record<string, unknown> = {};
        const editableKeys = ['title', 'description', 'function_tag', 'priority', 'accountable_ids', 'owner_label', 'status_label', 'deadline', 'deadline_label', 'sort_order'];
        for (const key of editableKeys) {
          if (key in fields) {
            allowedFields[key] = fields[key];
          }
        }

        const result = await updateMetronomeInitiative(id, allowedFields);
        if (!result.success) {
          return NextResponse.json({ error: result.error }, { status: 400 });
        }
        break;
      }

      case 'archive': {
        if (!canEditAll) {
          return NextResponse.json({ error: 'Only administrators can archive initiatives' }, { status: 403 });
        }
        const result = await updateMetronomeInitiative(id, { is_archived: true });
        if (!result.success) {
          return NextResponse.json({ error: result.error }, { status: 400 });
        }
        break;
      }

      case 'restore': {
        if (!canEditAll) {
          return NextResponse.json({ error: 'Only administrators can restore initiatives' }, { status: 403 });
        }
        const result = await updateMetronomeInitiative(id, { is_archived: false });
        if (!result.success) {
          return NextResponse.json({ error: result.error }, { status: 400 });
        }
        break;
      }

      default:
        return NextResponse.json({ error: 'Invalid action. Use: update, archive, restore' }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in PATCH /api/metronome/initiatives/[id]:', error);
    return NextResponse.json({ error: 'Failed to update initiative' }, { status: 500 });
  }
}, { permission: PERMISSIONS.METRONOME_EDIT_OWN });
