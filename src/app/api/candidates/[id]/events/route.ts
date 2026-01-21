import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-auth';
import { PERMISSIONS } from '@/lib/permissions';
import { supabaseAdmin, isSupabaseAdminConfigured } from '@/lib/supabase';
import type { User } from '@/types';

// GET /api/candidates/[id]/events - Get all events for a candidate
export const GET = withAuth(async (
  request: NextRequest,
  context: { user: User; params?: Record<string, string> }
) => {
  try {
    if (!isSupabaseAdminConfigured() || !supabaseAdmin) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const id = context.params?.id;

    const { data: events, error } = await supabaseAdmin
      .from('candidate_events')
      .select(`
        *,
        with_user:employees!candidate_events_with_user_id_fkey(full_name)
      `)
      .eq('candidate_id', id)
      .order('scheduled_at', { ascending: true });

    if (error) {
      console.error('Error fetching events:', error);
      return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 });
    }

    return NextResponse.json({ events: events || [] });
  } catch (error) {
    console.error('Error in GET events:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}, { permission: PERMISSIONS.RECRUITMENT_VIEW });

// POST /api/candidates/[id]/events - Add an event
export const POST = withAuth(async (
  request: NextRequest,
  context: { user: User; params?: Record<string, string> }
) => {
  try {
    if (!isSupabaseAdminConfigured() || !supabaseAdmin) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const id = context.params?.id;
    const body = await request.json();
    const { title, event_type, scheduled_at, with_user_id, location, notes } = body;

    if (!title?.trim()) {
      return NextResponse.json({ error: 'Event title is required' }, { status: 400 });
    }

    if (!scheduled_at) {
      return NextResponse.json({ error: 'Scheduled date/time is required' }, { status: 400 });
    }

    const { data: event, error } = await supabaseAdmin
      .from('candidate_events')
      .insert({
        candidate_id: id,
        title: title.trim(),
        event_type: event_type || 'interview',
        scheduled_at,
        with_user_id: with_user_id || null,
        location: location || null,
        notes: notes || null,
      })
      .select(`
        *,
        with_user:employees!candidate_events_with_user_id_fkey(full_name)
      `)
      .single();

    if (error) {
      console.error('Error adding event:', error);
      return NextResponse.json({ error: 'Failed to add event' }, { status: 500 });
    }

    return NextResponse.json({ event });
  } catch (error) {
    console.error('Error in POST event:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}, { permission: PERMISSIONS.RECRUITMENT_MANAGE });

// PUT /api/candidates/[id]/events - Update an event (mark complete, etc.)
export const PUT = withAuth(async (
  request: NextRequest,
  context: { user: User; params?: Record<string, string> }
) => {
  try {
    if (!isSupabaseAdminConfigured() || !supabaseAdmin) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const body = await request.json();
    const { event_id, completed_at, title, scheduled_at, location, notes } = body;

    if (!event_id) {
      return NextResponse.json({ error: 'Event ID is required' }, { status: 400 });
    }

    const updateData: Record<string, unknown> = {};
    if (completed_at !== undefined) updateData.completed_at = completed_at;
    if (title !== undefined) updateData.title = title;
    if (scheduled_at !== undefined) updateData.scheduled_at = scheduled_at;
    if (location !== undefined) updateData.location = location;
    if (notes !== undefined) updateData.notes = notes;

    const { data: event, error } = await supabaseAdmin
      .from('candidate_events')
      .update(updateData)
      .eq('id', event_id)
      .select(`
        *,
        with_user:employees!candidate_events_with_user_id_fkey(full_name)
      `)
      .single();

    if (error) {
      console.error('Error updating event:', error);
      return NextResponse.json({ error: 'Failed to update event' }, { status: 500 });
    }

    return NextResponse.json({ event });
  } catch (error) {
    console.error('Error in PUT event:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}, { permission: PERMISSIONS.RECRUITMENT_MANAGE });

// DELETE /api/candidates/[id]/events?event_id=xxx - Delete an event
export const DELETE = withAuth(async (
  request: NextRequest,
  context: { user: User; params?: Record<string, string> }
) => {
  try {
    if (!isSupabaseAdminConfigured() || !supabaseAdmin) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get('event_id');

    if (!eventId) {
      return NextResponse.json({ error: 'Event ID is required' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('candidate_events')
      .delete()
      .eq('id', eventId);

    if (error) {
      console.error('Error deleting event:', error);
      return NextResponse.json({ error: 'Failed to delete event' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE event:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}, { permission: PERMISSIONS.RECRUITMENT_MANAGE });
