import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-auth';
import { PERMISSIONS } from '@/lib/permissions';
import { getMetronomeInitiatives, createMetronomeInitiative } from '@/lib/db';
import type { MetronomeFunctionTag, MetronomePriority } from '@/lib/db/metronome';

// GET /api/metronome/initiatives - List initiatives
export const GET = withAuth(async (request: NextRequest) => {
  try {
    const searchParams = request.nextUrl.searchParams;
    const priority = searchParams.get('priority') as MetronomePriority | null;
    const functionTag = searchParams.get('function_tag') as MetronomeFunctionTag | null;
    const archived = searchParams.get('archived');
    const search = searchParams.get('search');
    const limit = searchParams.get('limit');
    const offset = searchParams.get('offset');

    const initiatives = await getMetronomeInitiatives({
      priority: priority || undefined,
      functionTag: functionTag || undefined,
      isArchived: archived !== null ? archived === 'true' : undefined,
      search: search || undefined,
      limit: limit ? parseInt(limit) : undefined,
      offset: offset ? parseInt(offset) : undefined,
    });

    return NextResponse.json({ data: initiatives, total: initiatives.length });
  } catch (error) {
    console.error('Error in GET /api/metronome/initiatives:', error);
    return NextResponse.json({ error: 'Failed to fetch initiatives' }, { status: 500 });
  }
}, { permission: PERMISSIONS.METRONOME_VIEW });

// POST /api/metronome/initiatives - Create initiative
export const POST = withAuth(async (request: NextRequest, { user }) => {
  try {
    const body = await request.json();
    const { title, description, function_tag, priority, accountable_ids, owner_label, status_label, deadline, deadline_label } = body;

    if (!title || !function_tag || !priority) {
      return NextResponse.json({ error: 'Title, function_tag, and priority are required' }, { status: 400 });
    }

    const validTags: MetronomeFunctionTag[] = ['bd', 'construction', 'hr', 'finance', 'legal', 'strategy', 'service'];
    if (!validTags.includes(function_tag)) {
      return NextResponse.json({ error: 'Invalid function_tag' }, { status: 400 });
    }

    const validPriorities: MetronomePriority[] = ['critical', 'high', 'strategic', 'resolved'];
    if (!validPriorities.includes(priority)) {
      return NextResponse.json({ error: 'Invalid priority' }, { status: 400 });
    }

    const result = await createMetronomeInitiative({
      title,
      description: description || null,
      function_tag,
      priority,
      accountable_ids: accountable_ids || [],
      owner_label: owner_label || null,
      status_label: status_label || null,
      deadline: deadline || null,
      deadline_label: deadline_label || null,
      is_archived: false,
      sort_order: 0,
      created_by: user.id,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ data: result.initiative }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/metronome/initiatives:', error);
    return NextResponse.json({ error: 'Failed to create initiative' }, { status: 500 });
  }
}, { permission: PERMISSIONS.METRONOME_CREATE });
