import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-auth';
import { PERMISSIONS } from '@/lib/permissions';
import { supabaseAdmin, isSupabaseAdminConfigured } from '@/lib/supabase';
import type { User } from '@/types';

// GET /api/candidates/[id]/comments - Get all comments for a candidate
export const GET = withAuth(async (
  request: NextRequest,
  context: { user: User; params?: Record<string, string> }
) => {
  try {
    if (!isSupabaseAdminConfigured() || !supabaseAdmin) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const id = context.params?.id;

    const { data: comments, error } = await supabaseAdmin
      .from('candidate_comments')
      .select(`
        *,
        user:employees!candidate_comments_user_id_fkey(full_name, email)
      `)
      .eq('candidate_id', id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching comments:', error);
      return NextResponse.json({ error: 'Failed to fetch comments' }, { status: 500 });
    }

    return NextResponse.json({ comments: comments || [] });
  } catch (error) {
    console.error('Error in GET comments:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}, { permission: PERMISSIONS.RECRUITMENT_VIEW });

// POST /api/candidates/[id]/comments - Add a comment
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
    const { content, stage_tag } = body;

    if (!content?.trim()) {
      return NextResponse.json({ error: 'Comment content is required' }, { status: 400 });
    }

    const { data: comment, error } = await supabaseAdmin
      .from('candidate_comments')
      .insert({
        candidate_id: id,
        user_id: context.user.id,
        content: content.trim(),
        stage_tag: stage_tag || null,
      })
      .select(`
        *,
        user:employees!candidate_comments_user_id_fkey(full_name, email)
      `)
      .single();

    if (error) {
      console.error('Error adding comment:', error);
      return NextResponse.json({ error: 'Failed to add comment' }, { status: 500 });
    }

    return NextResponse.json({ comment });
  } catch (error) {
    console.error('Error in POST comment:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}, { permission: PERMISSIONS.RECRUITMENT_MANAGE });

// DELETE /api/candidates/[id]/comments?comment_id=xxx - Delete a comment
export const DELETE = withAuth(async (
  request: NextRequest,
  context: { user: User; params?: Record<string, string> }
) => {
  try {
    if (!isSupabaseAdminConfigured() || !supabaseAdmin) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const commentId = searchParams.get('comment_id');

    if (!commentId) {
      return NextResponse.json({ error: 'Comment ID is required' }, { status: 400 });
    }

    // Check if user owns the comment or is admin
    const { data: comment } = await supabaseAdmin
      .from('candidate_comments')
      .select('user_id')
      .eq('id', commentId)
      .single();

    // Allow comment owner, HR, or General Manager to delete comments
    const canDeleteAnyComment = ['general_manager', 'ceo', 'hr'].includes(context.user.role);
    if (comment && comment.user_id !== context.user.id && !canDeleteAnyComment) {
      return NextResponse.json({ error: 'Not authorized to delete this comment' }, { status: 403 });
    }

    const { error } = await supabaseAdmin
      .from('candidate_comments')
      .delete()
      .eq('id', commentId);

    if (error) {
      console.error('Error deleting comment:', error);
      return NextResponse.json({ error: 'Failed to delete comment' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE comment:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}, { permission: PERMISSIONS.RECRUITMENT_MANAGE });
