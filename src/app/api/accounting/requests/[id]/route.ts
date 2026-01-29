import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-auth';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';
import { supabaseAdmin, isSupabaseAdminConfigured } from '@/lib/supabase';
import { APPROVAL_THRESHOLDS, VALID_STATUS_TRANSITIONS } from '@/modules/accounting/lib/constants';
import type { AccountingRequestStatus } from '@/modules/accounting/types';
import type { UserRole } from '@/types';

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

// ============================================
// PATCH /api/accounting/requests/[id]
// Perform actions: approve, reject, changeStatus
// ============================================
export const PATCH = withAuth(async (
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

    const body = await request.json();
    const { action, comments, reason, status: newStatus, notes, assignToSelf } = body;

    if (!action) {
      return NextResponse.json({ error: 'Action is required' }, { status: 400 });
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

    switch (action) {
      case 'approve':
        return handleApprove(id, currentRequest, employee.id, user.role, comments);

      case 'reject':
        return handleReject(id, currentRequest, employee.id, user.role, reason);

      case 'changeStatus':
        return handleStatusChange(id, currentRequest, employee.id, user.role, newStatus, notes, assignToSelf);

      default:
        return NextResponse.json({ error: `Invalid action: ${action}` }, { status: 400 });
    }
  } catch (error) {
    console.error('Server error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});

// Helper: Handle approval
async function handleApprove(
  id: string,
  currentRequest: Record<string, unknown>,
  employeeId: string,
  userRole: UserRole,
  comments?: string
) {
  // Must be in pending_approval status
  if (currentRequest.status !== 'pending_approval') {
    return NextResponse.json(
      { error: 'Request is not pending approval' },
      { status: 400 }
    );
  }

  const currentStep = (currentRequest.current_approval_step as number) || 1;
  const approvalLevel = currentRequest.approval_level as string;

  // Determine if user can approve at this level
  let canApprove = false;
  let nextStep: number | null = null;
  let newStatus: string = 'pending_approval';

  if (currentStep === 1 && approvalLevel === 'chief_accountant') {
    canApprove = hasPermission(userRole, PERMISSIONS.ACCOUNTING_REQUESTS_APPROVE_STANDARD);
    if (canApprove) {
      newStatus = 'approved';
    }
  } else if (currentStep === 1 && approvalLevel === 'executive') {
    canApprove = hasPermission(userRole, PERMISSIONS.ACCOUNTING_REQUESTS_APPROVE_STANDARD);
    if (canApprove) {
      nextStep = 2;
      newStatus = 'pending_approval';
    }
  } else if (currentStep === 2 && approvalLevel === 'executive') {
    canApprove = hasPermission(userRole, PERMISSIONS.ACCOUNTING_REQUESTS_APPROVE_HIGH);
    if (canApprove) {
      newStatus = 'approved';
    }
  }

  if (!canApprove) {
    return NextResponse.json(
      { error: 'You do not have permission to approve at this level' },
      { status: 403 }
    );
  }

  // Update the approval record
  const { error: approvalError } = await supabaseAdmin!
    .from('accounting_request_approvals')
    .update({
      status: 'approved',
      approved_by: employeeId,
      approved_at: new Date().toISOString(),
      comments,
    })
    .eq('request_id', id)
    .eq('approval_step', currentStep);

  if (approvalError) {
    console.error('Approval update error:', approvalError);
    return NextResponse.json({ error: 'Failed to record approval' }, { status: 500 });
  }

  // Update the request
  const updateData: Record<string, unknown> = { status: newStatus };

  if (nextStep) {
    updateData.current_approval_step = nextStep;

    // Create the next approval record
    await supabaseAdmin!.from('accounting_request_approvals').insert({
      request_id: id,
      approval_step: nextStep,
      approval_level: 'executive',
      status: 'pending',
    });
  }

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

  // Log history
  await supabaseAdmin!.from('accounting_request_history').insert({
    request_id: id,
    actor_id: employeeId,
    action: 'approved',
    details: {
      approval_step: currentStep,
      comments,
      final_approval: newStatus === 'approved',
    },
  });

  return NextResponse.json({
    ...data,
    message: newStatus === 'approved'
      ? 'Request fully approved'
      : 'Approved. Awaiting executive approval.',
  });
}

// Helper: Handle rejection
async function handleReject(
  id: string,
  currentRequest: Record<string, unknown>,
  employeeId: string,
  userRole: UserRole,
  reason?: string
) {
  if (!reason) {
    return NextResponse.json({ error: 'Rejection reason is required' }, { status: 400 });
  }

  // Must be in pending_approval status
  if (currentRequest.status !== 'pending_approval') {
    return NextResponse.json(
      { error: 'Request is not pending approval' },
      { status: 400 }
    );
  }

  const currentStep = (currentRequest.current_approval_step as number) || 1;

  // Check if user has approval permission at any level
  const canReject =
    hasPermission(userRole, PERMISSIONS.ACCOUNTING_REQUESTS_APPROVE_STANDARD) ||
    hasPermission(userRole, PERMISSIONS.ACCOUNTING_REQUESTS_APPROVE_HIGH);

  if (!canReject) {
    return NextResponse.json(
      { error: 'You do not have permission to reject approvals' },
      { status: 403 }
    );
  }

  // Update the approval record
  await supabaseAdmin!
    .from('accounting_request_approvals')
    .update({
      status: 'rejected',
      rejected_by: employeeId,
      rejected_at: new Date().toISOString(),
      rejection_reason: reason,
    })
    .eq('request_id', id)
    .eq('approval_step', currentStep);

  // Update the request to rejected
  const { data, error } = await supabaseAdmin!
    .from('accounting_requests')
    .update({
      status: 'rejected',
      rejected_at: new Date().toISOString(),
      rejected_by: employeeId,
      rejection_reason: reason,
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Database error:', error);
    return NextResponse.json({ error: 'Failed to reject request' }, { status: 500 });
  }

  // Log history
  await supabaseAdmin!.from('accounting_request_history').insert({
    request_id: id,
    actor_id: employeeId,
    action: 'approval_rejected',
    details: { approval_step: currentStep, reason },
  });

  return NextResponse.json(data);
}

// Helper: Handle status change
async function handleStatusChange(
  id: string,
  currentRequest: Record<string, unknown>,
  employeeId: string,
  userRole: UserRole,
  newStatus?: string,
  notes?: string,
  assignToSelf?: boolean
) {
  if (!newStatus) {
    return NextResponse.json({ error: 'New status is required' }, { status: 400 });
  }

  const currentStatus = currentRequest.status as AccountingRequestStatus;

  // Validate the transition
  const validTransitions = VALID_STATUS_TRANSITIONS[currentStatus] || [];
  if (!(validTransitions as readonly string[]).includes(newStatus)) {
    return NextResponse.json(
      { error: `Invalid transition from ${currentStatus} to ${newStatus}` },
      { status: 400 }
    );
  }

  // Permission checks and update data
  const updateData: Record<string, unknown> = { status: newStatus };

  switch (newStatus) {
    case 'in_progress':
      if (!hasPermission(userRole, PERMISSIONS.ACCOUNTING_REQUESTS_PROCESS)) {
        return NextResponse.json({ error: 'Forbidden: Cannot process requests' }, { status: 403 });
      }
      if (assignToSelf || !currentRequest.assigned_to) {
        updateData.assigned_to = employeeId;
        updateData.assigned_at = new Date().toISOString();
      }
      break;

    case 'needs_info':
      if (!hasPermission(userRole, PERMISSIONS.ACCOUNTING_REQUESTS_PROCESS)) {
        return NextResponse.json({ error: 'Forbidden: Cannot process requests' }, { status: 403 });
      }
      break;

    case 'pending_approval':
      if (!hasPermission(userRole, PERMISSIONS.ACCOUNTING_REQUESTS_PROCESS)) {
        return NextResponse.json({ error: 'Forbidden: Cannot process requests' }, { status: 403 });
      }

      const amount = (currentRequest.amount as number) || 0;
      if (amount >= APPROVAL_THRESHOLDS.HIGH) {
        updateData.approval_level = 'executive';
        updateData.current_approval_step = 1;
      } else if (amount >= APPROVAL_THRESHOLDS.STANDARD) {
        updateData.approval_level = 'chief_accountant';
        updateData.current_approval_step = 1;
      } else {
        return NextResponse.json(
          { error: 'This amount does not require approval. Mark as completed instead.' },
          { status: 400 }
        );
      }
      break;

    case 'completed':
      if (!hasPermission(userRole, PERMISSIONS.ACCOUNTING_REQUESTS_PROCESS)) {
        return NextResponse.json({ error: 'Forbidden: Cannot process requests' }, { status: 403 });
      }

      // For payments that need approval, must be approved first
      if (currentRequest.request_type === 'payment' && currentRequest.requires_approval) {
        if (currentStatus !== 'approved') {
          return NextResponse.json(
            { error: 'Payment requires approval before completion' },
            { status: 400 }
          );
        }
      }

      updateData.completed_at = new Date().toISOString();
      updateData.completed_by = employeeId;
      if (notes) updateData.resolution_notes = notes;
      break;

    case 'rejected':
      if (!hasPermission(userRole, PERMISSIONS.ACCOUNTING_REQUESTS_PROCESS)) {
        return NextResponse.json({ error: 'Forbidden: Cannot process requests' }, { status: 403 });
      }
      if (!notes) {
        return NextResponse.json({ error: 'Rejection reason is required' }, { status: 400 });
      }
      updateData.rejected_at = new Date().toISOString();
      updateData.rejected_by = employeeId;
      updateData.rejection_reason = notes;
      break;

    case 'pending':
      // Resubmission after rejection
      updateData.rejected_at = null;
      updateData.rejected_by = null;
      updateData.rejection_reason = null;
      updateData.edit_requested = false;
      break;
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
    return NextResponse.json({ error: 'Failed to update status' }, { status: 500 });
  }

  // Log history
  await supabaseAdmin!.from('accounting_request_history').insert({
    request_id: id,
    actor_id: employeeId,
    action: 'status_changed',
    old_value: currentStatus,
    new_value: newStatus,
    details: notes ? { notes } : null,
  });

  // Create approval record if needed
  if (newStatus === 'pending_approval') {
    await supabaseAdmin!.from('accounting_request_approvals').insert({
      request_id: id,
      approval_step: 1,
      approval_level: updateData.approval_level,
      status: 'pending',
    });
  }

  return NextResponse.json(data);
}
