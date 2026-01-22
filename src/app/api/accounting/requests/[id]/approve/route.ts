import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-auth';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';
import { supabaseAdmin, isSupabaseAdminConfigured } from '@/lib/supabase';

// ============================================
// POST /api/accounting/requests/[id]/approve
// Approve a pending approval request
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
    const { comments } = body;

    // Fetch current request
    const { data: currentRequest, error: fetchError } = await supabaseAdmin!
      .from('accounting_requests')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !currentRequest) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }

    // Must be in pending_approval status
    if (currentRequest.status !== 'pending_approval') {
      return NextResponse.json(
        { error: 'Request is not pending approval' },
        { status: 400 }
      );
    }

    const currentStep = currentRequest.current_approval_step || 1;
    const approvalLevel = currentRequest.approval_level;

    // Determine if user can approve at this level
    let canApprove = false;
    let nextStep: number | null = null;
    let newStatus: string = 'pending_approval';

    if (currentStep === 1 && approvalLevel === 'chief_accountant') {
      // Chief accountant approval for 2M-10M
      canApprove = hasPermission(user.role, PERMISSIONS.ACCOUNTING_REQUESTS_APPROVE_STANDARD);
      if (canApprove) {
        newStatus = 'approved';
      }
    } else if (currentStep === 1 && approvalLevel === 'executive') {
      // First step for executive approval: Chief Accountant
      canApprove = hasPermission(user.role, PERMISSIONS.ACCOUNTING_REQUESTS_APPROVE_STANDARD);
      if (canApprove) {
        nextStep = 2;
        newStatus = 'pending_approval';
      }
    } else if (currentStep === 2 && approvalLevel === 'executive') {
      // Second step: GM/CEO approval
      canApprove = hasPermission(user.role, PERMISSIONS.ACCOUNTING_REQUESTS_APPROVE_HIGH);
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
        approved_by: employee.id,
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
      actor_id: employee.id,
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
  } catch (error) {
    console.error('Server error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});

// ============================================
// DELETE /api/accounting/requests/[id]/approve
// Reject a pending approval request
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

    const body = await request.json();
    const { reason } = body;

    if (!reason) {
      return NextResponse.json({ error: 'Rejection reason is required' }, { status: 400 });
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

    // Must be in pending_approval status
    if (currentRequest.status !== 'pending_approval') {
      return NextResponse.json(
        { error: 'Request is not pending approval' },
        { status: 400 }
      );
    }

    const currentStep = currentRequest.current_approval_step || 1;

    // Check if user has approval permission at any level
    const canReject =
      hasPermission(user.role, PERMISSIONS.ACCOUNTING_REQUESTS_APPROVE_STANDARD) ||
      hasPermission(user.role, PERMISSIONS.ACCOUNTING_REQUESTS_APPROVE_HIGH);

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
        rejected_by: employee.id,
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
        rejected_by: employee.id,
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
      actor_id: employee.id,
      action: 'approval_rejected',
      details: { approval_step: currentStep, reason },
    });

    return NextResponse.json(data);
  } catch (error) {
    console.error('Server error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});
