import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-auth';
import { PERMISSIONS } from '@/lib/permissions';
import {
  getMetronomeKeyDates,
  createMetronomeKeyDate,
  deleteMetronomeKeyDate,
} from '@/lib/db';
import { CreateKeyDateSchema, DeleteKeyDateSchema } from '@/lib/validators/metronome';

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
    const parsed = CreateKeyDateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten().fieldErrors }, { status: 400 });
    }

    const { date, title, emoji, category, initiative_id, is_recurring } = parsed.data;

    const result = await createMetronomeKeyDate({
      date,
      title,
      emoji: emoji || null,
      category: category || 'event',
      initiative_id: initiative_id || null,
      is_recurring: is_recurring || false,
      created_by: user.id,
    });

    if (!result.success) {
      return NextResponse.json({ error: 'Failed to create key date' }, { status: 400 });
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
    const parsed = DeleteKeyDateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten().fieldErrors }, { status: 400 });
    }

    const result = await deleteMetronomeKeyDate(parsed.data.id);
    if (!result.success) {
      return NextResponse.json({ error: 'Failed to delete key date' }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/metronome/key-dates:', error);
    return NextResponse.json({ error: 'Failed to delete key date' }, { status: 500 });
  }
}, { permission: PERMISSIONS.METRONOME_MANAGE_DATES });
