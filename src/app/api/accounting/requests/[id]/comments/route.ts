import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-auth';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';
import { supabaseAdmin, isSupabaseAdminConfigured } from '@/lib/supabase';

// ============================================
// GET /api/accounting/requests/[id]/comments
// List comments for a request
// ============================================
export const GET = withAuth(async (
  request: NextRequest,
  { user, params }
) => {
  try {
    if (!isSupabaseAdminConfigured()) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const id = params?.id;
    if (!id) {
      return NextResponse.json({ error: 'Request ID is required' }, { status: 400 });
    }

    const canViewInternal = hasPermission(user.role, PERMISSIONS.ACCOUNTING_REQUESTS_PROCESS);

    // Fetch comments
    let query = supabaseAdmin!
      .from('accounting_request_comments')
      .select(`
        *,
        author:employees!author_id(id, full_name)
      `)
      .eq('request_id', id)
      .order('created_at', { ascending: true });

    // Filter internal comments for non-accountants
    if (!canViewInternal) {
      query = query.eq('is_internal', false);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json({ error: 'Failed to fetch comments' }, { status: 500 });
    }

    // Transform data
    const comments = (data || []).map(comment => ({
      id: comment.id,
      requestId: comment.request_id,
      authorId: comment.author_id,
      authorName: comment.author?.full_name,
      content: comment.content,
      isInternal: comment.is_internal,
      createdAt: comment.created_at,
    }));

    return NextResponse.json(comments);
  } catch (error) {
    console.error('Server error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}, { permission: PERMISSIONS.ACCOUNTING_REQUESTS_VIEW });

// ============================================
// POST /api/accounting/requests/[id]/comments
// Add a comment to a request
// ============================================
export const POST = withAuth(async (
  request: NextRequest,
  { user, params }
) => {
  try {
    if (!isSupabaseAdminConfigured()) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const id = params?.id;
    if (!id) {
      return NextResponse.json({ error: 'Request ID is required' }, { status: 400 });
    }

    // Get employee details
    const { data: employee } = await supabaseAdmin!
      .from('employees')
      .select('id, full_name')
      .eq('email', user.email)
      .single();

    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    const body = await request.json();
    const { content, isInternal } = body;

    if (!content || !content.trim()) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 });
    }

    // Only accountants can create internal comments
    const canCreateInternal = hasPermission(user.role, PERMISSIONS.ACCOUNTING_REQUESTS_PROCESS);
    const isInternalComment = isInternal && canCreateInternal;

    // Verify request exists
    const { data: existingRequest, error: requestError } = await supabaseAdmin!
      .from('accounting_requests')
      .select('id, requester_id')
      .eq('id', id)
      .single();

    if (requestError || !existingRequest) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }

    // Check permission - either owner, accountant, or has view permission
    const canViewAll = hasPermission(user.role, PERMISSIONS.ACCOUNTING_REQUESTS_VIEW_ALL);
    const isOwner = existingRequest.requester_id === employee.id;

    if (!isOwner && !canViewAll) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Insert comment
    const { data, error } = await supabaseAdmin!
      .from('accounting_request_comments')
      .insert({
        request_id: id,
        author_id: employee.id,
        content: content.trim(),
        is_internal: isInternalComment,
      })
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json({ error: 'Failed to add comment' }, { status: 500 });
    }

    // Log history
    await supabaseAdmin!.from('accounting_request_history').insert({
      request_id: id,
      actor_id: employee.id,
      action: 'comment_added',
      details: {
        is_internal: isInternalComment,
      },
    });

    return NextResponse.json({
      id: data.id,
      requestId: data.request_id,
      authorId: data.author_id,
      authorName: employee.full_name,
      content: data.content,
      isInternal: data.is_internal,
      createdAt: data.created_at,
    }, { status: 201 });
  } catch (error) {
    console.error('Server error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}, { permission: PERMISSIONS.ACCOUNTING_REQUESTS_VIEW });
