import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Direct API for AI assistant (Jarvis) to read/write to Dev Board
// No auth required - this is for Jarvis to communicate quickly

// Jarvis Profile
const JARVIS = {
  name: 'Jarvis',
  avatar: '🤖',
  role: 'AI Development Assistant',
  color: '#8B5CF6', // Purple
};

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// CORS headers for external access
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// Handle OPTIONS preflight
export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

// GET - Read all tasks and recent comments
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get('task_id');

    if (taskId) {
      // Get specific task with comments
      const { data: task } = await supabase
        .from('dev_tasks')
        .select('*, dev_projects(name), dev_sprints(name)')
        .eq('id', taskId)
        .single();

      const { data: comments } = await supabase
        .from('dev_task_comments')
        .select('*')
        .eq('task_id', taskId)
        .order('created_at', { ascending: true });

      return NextResponse.json({ task, comments }, { headers: corsHeaders });
    }

    // Get all tasks grouped by status
    const { data: tasks } = await supabase
      .from('dev_tasks')
      .select('*, dev_projects(name), dev_sprints(name)')
      .order('created_at', { ascending: false });

    // Get recent comments (last 20)
    const { data: recentComments } = await supabase
      .from('dev_task_comments')
      .select('*, dev_tasks(title)')
      .order('created_at', { ascending: false })
      .limit(20);

    // Group tasks by status
    const byStatus = {
      backlog: tasks?.filter(t => t.status === 'backlog') || [],
      todo: tasks?.filter(t => t.status === 'todo') || [],
      in_progress: tasks?.filter(t => t.status === 'in_progress') || [],
      testing: tasks?.filter(t => t.status === 'testing') || [],
      done: tasks?.filter(t => t.status === 'done') || [],
    };

    return NextResponse.json({
      tasks: byStatus,
      recentComments,
      summary: {
        total: tasks?.length || 0,
        backlog: byStatus.backlog.length,
        todo: byStatus.todo.length,
        in_progress: byStatus.in_progress.length,
        testing: byStatus.testing.length,
        done: byStatus.done.length,
      }
    }, { headers: corsHeaders });
  } catch (error) {
    console.error('AI Sync GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500, headers: corsHeaders });
  }
}

// POST - Add comment or update task
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, task_id, comment, status, title, description, task_type, priority } = body;

    if (action === 'comment' && task_id && comment) {
      // Add a comment
      const { data, error } = await supabase
        .from('dev_task_comments')
        .insert({
          task_id,
          content: comment,
          author: JARVIS.name, // Jarvis - AI Assistant
        })
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json({ success: true, comment: data }, { headers: corsHeaders });
    }

    if (action === 'update_status' && task_id && status) {
      // Update task status
      const updates: Record<string, unknown> = { status };
      if (status === 'done') {
        updates.completed_at = new Date().toISOString();
      }

      const { data, error } = await supabase
        .from('dev_tasks')
        .update(updates)
        .eq('id', task_id)
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json({ success: true, task: data }, { headers: corsHeaders });
    }

    if (action === 'create_task' && title) {
      // Create new task
      const { data, error } = await supabase
        .from('dev_tasks')
        .insert({
          title,
          description: description || '',
          task_type: task_type || 'task',
          priority: priority || 'P1',
          status: status || 'backlog',
          project_id: '11111111-1111-1111-1111-111111111111', // People Platform
        })
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json({ success: true, task: data }, { headers: corsHeaders });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400, headers: corsHeaders });
  } catch (error) {
    console.error('AI Sync POST error:', error);
    return NextResponse.json({ error: 'Failed to process' }, { status: 500, headers: corsHeaders });
  }
}
