import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth-server';
import { supabaseAdmin, isSupabaseAdminConfigured } from '@/lib/supabase';

// Only general_manager can access dev board
async function checkAccess() {
  const user = await getSession();
  if (!user) return { allowed: false, error: 'Unauthorized', status: 401 };
  if (user.role !== 'general_manager') {
    return { allowed: false, error: 'Access denied', status: 403 };
  }
  return { allowed: true, user };
}

// GET /api/dev-board/sprints/[id] - Get sprint details with tasks
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const access = await checkAccess();
  if (!access.allowed) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  if (!isSupabaseAdminConfigured()) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  try {
    const { id } = await params;

    // Get sprint
    const { data: sprint, error: sprintError } = await supabaseAdmin!
      .from('dev_sprints')
      .select('*')
      .eq('id', id)
      .single();

    if (sprintError) {
      return NextResponse.json({ error: 'Sprint not found' }, { status: 404 });
    }

    // Get tasks in this sprint
    const { data: tasks, error: tasksError } = await supabaseAdmin!
      .from('dev_tasks')
      .select('*')
      .eq('sprint_id', id);

    if (tasksError) {
      console.error('Error fetching sprint tasks:', tasksError);
    }

    const taskStats = {
      total: tasks?.length || 0,
      completed: tasks?.filter(t => t.status === 'done').length || 0,
      in_progress: tasks?.filter(t => t.status === 'in_progress').length || 0,
      todo: tasks?.filter(t => t.status === 'todo').length || 0,
      testing: tasks?.filter(t => t.status === 'testing').length || 0,
      backlog: tasks?.filter(t => t.status === 'backlog').length || 0,
    };

    return NextResponse.json({ sprint, tasks, taskStats });
  } catch (error) {
    console.error('Error fetching sprint:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/dev-board/sprints/[id] - Update sprint
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const access = await checkAccess();
  if (!access.allowed) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  if (!isSupabaseAdminConfigured()) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const { name, goal, start_date, end_date, status } = body;

    const updates: Record<string, unknown> = {};
    if (name !== undefined) updates.name = name;
    if (goal !== undefined) updates.goal = goal;
    if (start_date !== undefined) updates.start_date = start_date;
    if (end_date !== undefined) updates.end_date = end_date;
    if (status !== undefined) updates.status = status;

    // If activating this sprint, deactivate others
    if (status === 'active') {
      await supabaseAdmin!
        .from('dev_sprints')
        .update({ status: 'planning' })
        .eq('status', 'active')
        .neq('id', id);
    }

    const { data: sprint, error } = await supabaseAdmin!
      .from('dev_sprints')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating sprint:', error);
      return NextResponse.json({ error: 'Failed to update sprint' }, { status: 500 });
    }

    return NextResponse.json({ sprint });
  } catch (error) {
    console.error('Error updating sprint:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/dev-board/sprints/[id] - Delete sprint
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const access = await checkAccess();
  if (!access.allowed) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  if (!isSupabaseAdminConfigured()) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  try {
    const { id } = await params;

    // Move tasks back to backlog (no sprint)
    await supabaseAdmin!
      .from('dev_tasks')
      .update({ sprint_id: null })
      .eq('sprint_id', id);

    // Delete sprint
    const { error } = await supabaseAdmin!
      .from('dev_sprints')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting sprint:', error);
      return NextResponse.json({ error: 'Failed to delete sprint' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting sprint:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/dev-board/sprints/[id] - Perform actions (e.g., complete)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const access = await checkAccess();
  if (!access.allowed) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  if (!isSupabaseAdminConfigured()) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const { action } = body;

    if (!action) {
      return NextResponse.json({ error: 'Action is required' }, { status: 400 });
    }

    switch (action) {
      case 'complete':
        return handleCompleteSprint(id, body);

      default:
        return NextResponse.json({ error: `Invalid action: ${action}` }, { status: 400 });
    }
  } catch (error) {
    console.error('Error processing sprint action:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Helper: Handle sprint completion
async function handleCompleteSprint(sprintId: string, body: {
  incompleteTaskAction?: string;
  nextSprintId?: string;
}) {
  const {
    incompleteTaskAction = 'backlog', // 'backlog' | 'next_sprint' | 'keep'
    nextSprintId
  } = body;

  // Get the sprint
  const { data: sprint, error: sprintError } = await supabaseAdmin!
    .from('dev_sprints')
    .select('*')
    .eq('id', sprintId)
    .single();

  if (sprintError || !sprint) {
    return NextResponse.json({ error: 'Sprint not found' }, { status: 404 });
  }

  // Get incomplete tasks (not done)
  const { data: incompleteTasks, error: tasksError } = await supabaseAdmin!
    .from('dev_tasks')
    .select('id, status')
    .eq('sprint_id', sprintId)
    .neq('status', 'done');

  if (tasksError) {
    console.error('Error fetching tasks:', tasksError);
  }

  const incompleteTaskIds = incompleteTasks?.map(t => t.id) || [];

  // Handle incomplete tasks based on action
  if (incompleteTaskIds.length > 0) {
    if (incompleteTaskAction === 'backlog') {
      // Move to backlog (remove sprint_id)
      await supabaseAdmin!
        .from('dev_tasks')
        .update({ sprint_id: null, status: 'backlog' })
        .in('id', incompleteTaskIds);
    } else if (incompleteTaskAction === 'next_sprint' && nextSprintId) {
      // Move to next sprint
      await supabaseAdmin!
        .from('dev_tasks')
        .update({ sprint_id: nextSprintId })
        .in('id', incompleteTaskIds);
    }
    // 'keep' = leave them as-is in the completed sprint
  }

  // Mark sprint as completed
  const { data: updatedSprint, error: updateError } = await supabaseAdmin!
    .from('dev_sprints')
    .update({ status: 'completed' })
    .eq('id', sprintId)
    .select()
    .single();

  if (updateError) {
    console.error('Error completing sprint:', updateError);
    return NextResponse.json({ error: 'Failed to complete sprint' }, { status: 500 });
  }

  return NextResponse.json({
    sprint: updatedSprint,
    movedTasks: incompleteTaskIds.length,
    action: incompleteTaskAction
  });
}
