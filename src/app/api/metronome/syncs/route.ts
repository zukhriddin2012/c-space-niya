import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-auth';
import { PERMISSIONS } from '@/lib/permissions';
import { getMetronomeSyncs, createMetronomeSync } from '@/lib/db';

// GET /api/metronome/syncs - List syncs
export const GET = withAuth(async (request: NextRequest) => {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = searchParams.get('limit');
    const offset = searchParams.get('offset');

    const syncs = await getMetronomeSyncs({
      limit: limit ? parseInt(limit) : undefined,
      offset: offset ? parseInt(offset) : undefined,
    });

    return NextResponse.json({ data: syncs, total: syncs.length });
  } catch (error) {
    console.error('Error in GET /api/metronome/syncs:', error);
    return NextResponse.json({ error: 'Failed to fetch syncs' }, { status: 500 });
  }
}, { permission: PERMISSIONS.METRONOME_VIEW });

// POST /api/metronome/syncs - Create sync record (on meeting end)
export const POST = withAuth(async (request: NextRequest, { user }) => {
  try {
    const body = await request.json();
    const {
      sync_date,
      title,
      notes,
      attendee_ids,
      started_at,
      ended_at,
      duration_seconds,
      next_sync_date,
      next_sync_focus,
      focus_areas,
      items_discussed,
      decisions_made,
      action_items_completed,
    } = body;

    if (!sync_date) {
      return NextResponse.json({ error: 'sync_date is required' }, { status: 400 });
    }

    // Validate focus_areas structure if provided
    if (focus_areas && Array.isArray(focus_areas)) {
      for (const entry of focus_areas) {
        if (!entry.person || !Array.isArray(entry.items)) {
          return NextResponse.json({ error: 'focus_areas must be array of {person, items[]}' }, { status: 400 });
        }
      }
    }

    const result = await createMetronomeSync({
      sync_date,
      title: title || null,
      notes: notes || null,
      attendee_ids: attendee_ids || [],
      started_at: started_at || null,
      ended_at: ended_at || null,
      duration_seconds: duration_seconds || null,
      next_sync_date: next_sync_date || null,
      next_sync_focus: next_sync_focus || null,
      focus_areas: focus_areas || [],
      items_discussed: items_discussed || 0,
      decisions_made: decisions_made || 0,
      action_items_completed: action_items_completed || 0,
      created_by: user.id,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ data: result.sync }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/metronome/syncs:', error);
    return NextResponse.json({ error: 'Failed to create sync' }, { status: 500 });
  }
}, { permission: PERMISSIONS.METRONOME_RUN_MEETING });
