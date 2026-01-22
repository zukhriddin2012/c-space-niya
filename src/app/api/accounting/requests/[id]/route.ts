import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-auth';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';
import { supabaseAdmin, isSupabaseAdminConfigured } from '@/lib/supabase';

// ============================================
// GET /api/accounting/requests/[id]
// Get a single request with all relations
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

    // Get employee details
    const { data: employee } = await supabaseAdmin!
      .from('employees')
      .select('id, branch_id')
      .eq('email', user.email)
      .single();

    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    // Fetch the request with relations
    const { data: requestData, error: requestError } = await supabaseAdmin!
      .from('accounting_requests')
      .select(`
        *,
        requester:employees!requester_id(id, full_name, email, position, branch_id),
        assignee:employees!assigned_to(id, full_name, email, position),
        branch:branches!branch_id(id, name, address),
        from_entity:legal_entities!from_entity_id(id, name, inn)
      `)
      .eq('id', id)
      .single();

    if (requestError) {
      if (requestError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Request not found' }, { status: 404 });
      }
      console.error('Database error:', requestError);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    // Check access: user can view all OR is the requester
    const canViewAll = hasPermission(user.role, PERMISSIONS.ACCOUNTING_REQUESTS_VIEW_ALL);
    if (!canViewAll && requestData.requester_id !== employee.id) {
      return NextResponse.json({ error: 'Forbidden: Not your request' }, { status: 403 });
    }

    // Fetch related data in parallel
    const [attachments, comments, approvals, history] = await Promise.all([
      supabaseAdmin!
        .from('accounting_request_attachments')
        .select(`*, uploader:employees!uploaded_by(id, full_name)`)
        .eq('request_id', id)
        .order('created_at', { ascending: false }),

      supabaseAdmin!
        .from('accounting_request_comments')
        .select(`*, author:employees!author_id(id, full_name, position)`)
        .eq('request_id', id)
        .order('created_at', { ascending: true }),

      supabaseAdmin!
        .from('accounting_request_approvals')
        .select(`*, approver:employees!approved_by(id, full_name, position)`)
        .eq('request_id', id)
        .order('approval_step', { ascending: true }),

      supabaseAdmin!
        .from('accounting_request_history')
        .select(`*, actor:employees!actor_id(id, full_name)`)
        .eq('request_id', id)
        .order('created_at', { ascending: false })
        .limit(50),
    ]);

    // Filter internal comments if user doesn't have permission
    let filteredComments = comments.data || [];
    const canViewInternal = hasPermission(user.role, PERMISSIONS.ACCOUNTING_REQUESTS_PROCESS);
    if (!canViewInternal) {
      filteredComments = filteredComments.filter(c => !c.is_internal);
    }

    return NextResponse.json({
      ...requestData,
      attachments: attachments.data || [],
      comments: filteredComments,
      approvals: approvals.data || [],
      history: history.data || [],
    });
  } catch (error) {
    console.error('Server error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}, { permission: PERMISSIONS.ACCOUNTING_REQUESTS_VIEW });

// ============================================
// PUT /api/accounting/requests/[id]
// Update a request (only if pending and owner)
// ============================================
export const PUT = withAuth(async (
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
      .select('id')
      .eq('email', user.email)
      .single();

    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    // Fetch current request
    const { data: currentRequest, error: fetchError } = await supabaseAdmin!
      .from('accounting_requests')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !currentRequest) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }

    // Check ownership
    if (currentRequest.requester_id !== employee.id) {
      return NextResponse.json({ error: 'Forbidden: Not your request' }, { status: 403 });
    }

    // Check status
    if (currentRequest.status !== 'pending') {
      return NextResponse.json(
        { error: 'Cannot edit request: Status is not pending' },
        { status: 400 }
      );
    }

    const body = await request.json();

    // Build update object
    const allowedFields = [
      'priority', 'notes', 'tenant_name', 'tenant_inn', 'contract_number',
      'contract_start_date', 'contract_end_date', 'reconciliation_period_start',
      'reconciliation_period_end', 'recipient_name', 'recipient_inn', 'amount',
      'payment_category', 'payment_purpose', 'invoice_number', 'client_name',
      'client_inn', 'expected_amount', 'expected_date'
    ];

    const updateData: Record<string, unknown> = {};
    const changes: { field: string; oldValue: unknown; newValue: unknown }[] = [];

    for (const field of allowedFields) {
      if (body[field] !== undefined && body[field] !== currentRequest[field]) {
        updateData[field] = body[field];
        changes.push({ field, oldValue: currentRequest[field], newValue: body[field] });
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ message: 'No changes to update' });
    }

    // Update the request
    const { data, error } = await supabaseAdmin!
      .from('accounting_requests')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json({ error: 'Failed to update request' }, { status: 500 });
    }

    // Log history for each change
    for (const change of changes) {
      await supabaseAdmin!.from('accounting_request_history').insert({
        request_id: id,
        actor_id: employee.id,
        action: 'updated',
        field_name: change.field,
        old_value: String(change.oldValue ?? ''),
        new_value: String(change.newValue ?? ''),
      });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Server error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}, { permission: PERMISSIONS.ACCOUNTING_REQUESTS_EDIT_OWN });

// ============================================
// DELETE /api/accounting/requests/[id]
// Cancel a request
// ============================================
export const DELETE = withAuth(async (
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
      .select('id')
      .eq('email', user.email)
      .single();

    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    // Fetch current request
    const { data: currentRequest, error: fetchError } = await supabaseAdmin!
      .from('accounting_requests')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !currentRequest) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }

    // Check ownership
    if (currentRequest.requester_id !== employee.id) {
      return NextResponse.json({ error: 'Forbidden: Not your request' }, { status: 403 });
    }

    // Check status
    if (!['pending', 'in_progress'].includes(currentRequest.status)) {
      return NextResponse.json(
        { error: 'Cannot cancel request: Status must be pending or in_progress' },
        { status: 400 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const cancellationReason = body.reason || 'Cancelled by requester';

    // Update to cancelled status
    const { data, error } = await supabaseAdmin!
      .from('accounting_requests')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        cancelled_by: employee.id,
        cancellation_reason: cancellationReason,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json({ error: 'Failed to cancel request' }, { status: 500 });
    }

    // Log history
    await supabaseAdmin!.from('accounting_request_history').insert({
      request_id: id,
      actor_id: employee.id,
      action: 'cancelled',
      details: { reason: cancellationReason },
    });

    return NextResponse.json(data);
  } catch (error) {
    console.error('Server error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}, { permission: PERMISSIONS.ACCOUNTING_REQUESTS_CANCEL_OWN });
