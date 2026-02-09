import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-auth';
import { PERMISSIONS } from '@/lib/permissions';
import {
  getMetronomeKeyDates,
  createMetronomeKeyDate,
  deleteMetronomeKeyDate,
} from '@/lib/db';
import type { MetronomeKeyDateCategory } from '@/lib/db/metronome';

// GET /api/metronome/key-dates - List key dates
export const GET = withAuth(async (request: NextRequest) => {
  try {
    const searchParams = request.nextUrl.searchParams;
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    const keyDates = await getMetronomeKeyDates({
      from: from || undefined,
      to: to || undefined,
    });

    return NextResponse.json({ data: keyDates });
  } catch (error) {
    console.error('Error in GET /api/metronome/key-dates:', error);
    return NextResponse.json({ error: 'Failed to fetch key dates' }, { status: 500 });
  }
}, { permission: PERMISSIONS.METRONOME_VIEW });

// POST /api/metronome/key-dates - Create key date
export const POST = withAuth(async (request: NextRequest, { user }) => {
  try {
    const body = await request.json();
    const { date, title, emoji, category, initiative_id, is_recurring } = body;

    if (!date || !title) {
      return NextResponse.json({ error: 'date and title are required' }, { status: 400 });
    }

    const validCategories: MetronomeKeyDateCategory[] = ['critical', 'high', 'meeting', 'strategic', 'event', 'holiday'];
    const cat = category || 'event';
    if (!validCategories.includes(cat)) {
      return NextResponse.json({ error: 'Invalid category' }, { status: 400 });
    }

    const result = await createMetronomeKeyDate({
      date,
      title,
      emoji: emoji || null,
      category: cat,
      initiative_id: initiative_id || null,
      is_recurring: is_recurring || false,
      created_by: user.id,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ data: result.keyDate }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/metronome/key-dates:', error);
    return NextResponse.json({ error: 'Failed to create key date' }, { status: 500 });
  }
}, { permission: PERMISSIONS.METRONOME_MANAGE_DATES });

// DELETE /api/metronome/key-dates - Delete key date
export const DELETE = withAuth(async (request: NextRequest) => {
  try {
    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const result = await deleteMetronomeKeyDate(id);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/metronome/key-dates:', error);
    return NextResponse.json({ error: 'Failed to delete key date' }, { status: 500 });
  }
}, { permission: PERMISSIONS.METRONOME_MANAGE_DATES });
