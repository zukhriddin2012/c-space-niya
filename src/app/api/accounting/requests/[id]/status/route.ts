import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-auth';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';
import { supabaseAdmin, isSupabaseAdminConfigured } from '@/lib/supabase';
import { APPROVAL_THRESHOLDS, VALID_STATUS_TRANSITIONS } from '@/modules/accounting/lib/constants';
import type { AccountingRequestStatus } from '@/modules/accounting/types';

// ============================================
// POST /api/accounting/requests/[id]/status
// Change request status (for accountants)
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
      .select('id')
      .eq('email', user.email)
      .single();

    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    const body = await request.json();
    const { status: newStatus, notes, assignToSelf } = body;

    if (!newStatus) {
      return NextResponse.json({ error: 'New status is required' }, { status: 400 });
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
        if (!hasPermission(user.role, PERMISSIONS.ACCOUNTING_REQUESTS_PROCESS)) {
          return NextResponse.json({ error: 'Forbidden: Cannot process requests' }, { status: 403 });
        }
        if (assignToSelf || !currentRequest.assigned_to) {
          updateData.assigned_to = employee.id;
          updateData.assigned_at = new Date().toISOString();
        }
        break;

      case 'needs_info':
        if (!hasPermission(user.role, PERMISSIONS.ACCOUNTING_REQUESTS_PROCESS)) {
          return NextResponse.json({ error: 'Forbidden: Cannot process requests' }, { status: 403 });
        }
        break;

      case 'pending_approval':
        if (!hasPermission(user.role, PERMISSIONS.ACCOUNTING_REQUESTS_PROCESS)) {
          return NextResponse.json({ error: 'Forbidden: Cannot process requests' }, { status: 403 });
        }

        const amount = currentRequest.amount || 0;
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
        if (!hasPermission(user.role, PERMISSIONS.ACCOUNTING_REQUESTS_PROCESS)) {
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
        updateData.completed_by = employee.id;
        if (notes) updateData.resolution_notes = notes;
        break;

      case 'rejected':
        if (!hasPermission(user.role, PERMISSIONS.ACCOUNTING_REQUESTS_PROCESS)) {
          return NextResponse.json({ error: 'Forbidden: Cannot process requests' }, { status: 403 });
        }
        if (!notes) {
          return NextResponse.json({ error: 'Rejection reason is required' }, { status: 400 });
        }
        updateData.rejected_at = new Date().toISOString();
        updateData.rejected_by = employee.id;
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
      actor_id: employee.id,
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
  } catch (error) {
    console.error('Server error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}, { permission: PERMISSIONS.ACCOUNTING_REQUESTS_PROCESS });
