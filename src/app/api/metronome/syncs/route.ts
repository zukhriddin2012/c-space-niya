import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-auth';
import { PERMISSIONS } from '@/lib/permissions';
import { getMetronomeSyncs, createMetronomeSync } from '@/lib/db';
import { CreateSyncSchema } from '@/lib/validators/metronome';

// GET /api/metronome/syncs - List syncs
export const GET = withAuth(async (request: NextRequest) => {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = searchParams.get('limit');
    const offset = searchParams.get('offset');

    // SEC-C4: Clamp query params
    const parsedLimit = limit ? Math.min(Math.max(parseInt(limit) || 10, 1), 100) : undefined;
    const parsedOffset = offset ? Math.max(parseInt(offset) || 0, 0) : undefined;

    const syncs = await getMetronomeSyncs({
      limit: parsedLimit,
      offset: parsedOffset,
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
    const parsed = CreateSyncSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten().fieldErrors }, { status: 400 });
    }

    const d = parsed.data;

    const result = await createMetronomeSync({
      sync_date: d.sync_date,
      title: d.title || null,
      notes: d.notes || null,
      attendee_ids: d.attendee_ids || [],
      started_at: d.started_at || null,
      ended_at: d.ended_at || null,
      duration_seconds: d.duration_seconds || null,
      next_sync_date: d.next_sync_date || null,
      next_sync_focus: d.next_sync_focus || null,
      focus_areas: d.focus_areas || [],
      items_discussed: d.items_discussed || 0,
      decisions_made: d.decisions_made || 0,
      action_items_completed: d.action_items_completed || 0,
      created_by: user.id,
    });

    if (!result.success) {
      return NextResponse.json({ error: 'Failed to create sync' }, { status: 400 });
    }

    return NextResponse.json({ data: result.sync }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/metronome/syncs:', error);
    return NextResponse.json({ error: 'Failed to create sync' }, { status: 500 });
  }
}, { permission: PERMISSIONS.METRONOME_RUN_MEETING });
