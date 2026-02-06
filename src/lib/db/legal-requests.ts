import { supabaseAdmin, isSupabaseAdminConfigured } from './connection';
import { escapeIlike } from '@/lib/security';
import {
  transformLegalRequest,
  transformLegalAttachment,
  transformLegalComment,
  transformLegalStatusChange,
  LEGAL_STATUS_TRANSITIONS,
  type LegalRequest,
  type LegalRequestRow,
  type LegalRequestAttachment,
  type LegalRequestAttachmentRow,
  type LegalRequestComment,
  type LegalRequestCommentRow,
  type LegalRequestStatusChange,
  type LegalRequestStatusChangeRow,
  type LegalRequestFilters,
  type LegalDashboardStats,
  type LegalRequestStatus,
  type CreateLegalRequestInput,
  type UpdateLegalRequestInput,
} from '@/modules/legal/types';

// ============================================
// LEGAL REQUESTS (Main Domain)
// ============================================

export interface LegalRequestListResult {
  data: LegalRequest[];
  pagination: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
}

/**
 * Get legal requests with pagination and filtering
 * Default sort: created_at DESC
 * Filters out voided requests (voided_at IS NULL)
 */
export async function getLegalRequests(
  filters: LegalRequestFilters & {
    page?: number;
    pageSize?: number;
  } = {}
): Promise<LegalRequestListResult> {
  if (!isSupabaseAdminConfigured()) {
    return {
      data: [],
      pagination: { total: 0, page: 1, pageSize: 10, totalPages: 0 },
    };
  }

  const page = filters.page || 1;
  const pageSize = filters.pageSize || 10;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  // Build the query for data
  let query = supabaseAdmin!
    .from('legal_requests')
    .select('*', { count: 'exact' })
    .is('voided_at', null)
    .order('created_at', { ascending: false });

  // Apply filters
  if (filters.status && filters.status.length > 0) {
    query = query.in('status', filters.status);
  }

  if (filters.requestType && filters.requestType.length > 0) {
    query = query.in('request_type', filters.requestType);
  }

  if (filters.branchId) {
    query = query.eq('branch_id', filters.branchId);
  }

  if (filters.assignedTo) {
    query = query.eq('assigned_to', filters.assignedTo);
  }

  if (filters.search) {
    const escapedSearch = escapeIlike(filters.search);
    query = query.or(
      `request_number.ilike.%${escapedSearch}%,metadata->>submittedByName.ilike.%${escapedSearch}%`
    );
  }

  if (filters.dateFrom) {
    query = query.gte('created_at', filters.dateFrom);
  }

  if (filters.dateTo) {
    query = query.lte('created_at', filters.dateTo);
  }

  // Apply pagination
  query = query.range(from, to);

  const { data, error, count } = await query;

  if (error) {
    console.error('Error fetching legal requests:', error);
    return {
      data: [],
      pagination: { total: 0, page, pageSize, totalPages: 0 },
    };
  }

  const rows = (data || []) as LegalRequestRow[];
  const total = count || 0;
  const totalPages = Math.ceil(total / pageSize);

  return {
    data: rows.map(transformLegalRequest),
    pagination: {
      total,
      page,
      pageSize,
      totalPages,
    },
  };
}

/**
 * Get a single legal request with all relations
 * Loads attachments, comments, and status history via separate queries
 */
export async function getLegalRequestById(id: string): Promise<LegalRequest | null> {
  if (!isSupabaseAdminConfigured()) {
    return null;
  }

  // Fetch the main request
  const { data: requestData, error: requestError } = await supabaseAdmin!
    .from('legal_requests')
    .select('*')
    .eq('id', id)
    .single();

  if (requestError || !requestData) {
    console.error('Error fetching legal request:', requestError);
    return null;
  }

  const request = transformLegalRequest(requestData as LegalRequestRow);

  // Fetch attachments
  const { data: attachmentsData, error: attachmentsError } = await supabaseAdmin!
    .from('legal_request_attachments')
    .select('*')
    .eq('request_id', id);

  if (!attachmentsError && attachmentsData) {
    request.attachments = (attachmentsData as LegalRequestAttachmentRow[]).map(
      transformLegalAttachment
    );
  }

  // Fetch comments
  const { data: commentsData, error: commentsError } = await supabaseAdmin!
    .from('legal_request_comments')
    .select('*')
    .eq('request_id', id)
    .order('created_at', { ascending: true });

  if (!commentsError && commentsData) {
    request.comments = (commentsData as LegalRequestCommentRow[]).map(transformLegalComment);
  }

  // Fetch status history
  const { data: statusHistoryData, error: statusHistoryError } = await supabaseAdmin!
    .from('legal_request_status_history')
    .select('*')
    .eq('request_id', id)
    .order('created_at', { ascending: true });

  if (!statusHistoryError && statusHistoryData) {
    request.statusHistory = (statusHistoryData as LegalRequestStatusChangeRow[]).map(
      transformLegalStatusChange
    );
  }

  return request;
}

/**
 * Create a new legal request
 * - Generates request number via RPC
 * - Inserts initial status history (null → 'submitted')
 * - Returns { success, data?, error? }
 */
export async function createLegalRequest(
  input: CreateLegalRequestInput,
  submittedBy: string,
  operatorId?: string
): Promise<{ success: boolean; data?: LegalRequest; error?: string }> {
  if (!isSupabaseAdminConfigured()) {
    return { success: false, error: 'Database not configured' };
  }

  // Generate request number
  const { data: numberData, error: numberError } = await supabaseAdmin!.rpc(
    'next_legal_request_number'
  );

  if (numberError) {
    console.error('Error generating request number:', numberError);
    return { success: false, error: numberError.message };
  }

  const requestNumber = numberData || '';

  // Insert the legal request
  const { data: requestData, error: requestError } = await supabaseAdmin!
    .from('legal_requests')
    .insert({
      request_number: requestNumber,
      request_type: input.requestType,
      status: 'submitted',
      branch_id: input.branchId,
      submitted_by: submittedBy,
      submitted_by_operator: operatorId || null,
      metadata: input.metadata,
    })
    .select()
    .single();

  if (requestError || !requestData) {
    console.error('Error creating legal request:', requestError);
    return { success: false, error: requestError?.message || 'Failed to create request' };
  }

  // Insert initial status history (null → 'submitted')
  const { error: historyError } = await supabaseAdmin!
    .from('legal_request_status_history')
    .insert({
      request_id: requestData.id,
      old_status: null,
      new_status: 'submitted',
      changed_by: submittedBy,
      notes: 'Request submitted',
    });

  if (historyError) {
    console.error('Error creating status history:', historyError);
    // Still return success since the request was created
  }

  return {
    success: true,
    data: transformLegalRequest(requestData as LegalRequestRow),
  };
}

/**
 * Update a legal request
 * - Validates status transitions
 * - Inserts status_history entry if status changes
 * - Sets resolved_at/resolved_by for 'completed'
 * - Sets rejected_at/rejected_by/rejection_reason for 'rejected'
 */
export async function updateLegalRequest(
  id: string,
  input: UpdateLegalRequestInput,
  changedBy: string
): Promise<{ success: boolean; data?: LegalRequest; error?: string }> {
  if (!isSupabaseAdminConfigured()) {
    return { success: false, error: 'Database not configured' };
  }

  // Get current request to check status transition
  const { data: currentData, error: fetchError } = await supabaseAdmin!
    .from('legal_requests')
    .select('*')
    .eq('id', id)
    .single();

  if (fetchError || !currentData) {
    console.error('Error fetching legal request:', fetchError);
    return { success: false, error: 'Request not found' };
  }

  const current = currentData as LegalRequestRow;

  // Validate status transition if status is changing
  if (input.status && input.status !== current.status) {
    const allowedTransitions = LEGAL_STATUS_TRANSITIONS[current.status];
    if (!allowedTransitions.includes(input.status)) {
      return {
        success: false,
        error: `Invalid status transition from "${current.status}" to "${input.status}"`,
      };
    }
  }

  // Build update object
  const updateObj: Record<string, any> = {
    updated_at: new Date().toISOString(),
  };

  if (input.status) {
    updateObj.status = input.status;
  }

  if (input.assignedTo !== undefined) {
    updateObj.assigned_to = input.assignedTo || null;
    if (input.assignedTo) {
      updateObj.assigned_at = new Date().toISOString();
    }
  }

  if (input.resolutionNotes !== undefined) {
    updateObj.resolution_notes = input.resolutionNotes || null;
  }

  // Handle status-specific fields
  if (input.status === 'completed') {
    updateObj.resolved_at = new Date().toISOString();
    updateObj.resolved_by = changedBy;
  }

  if (input.status === 'rejected') {
    updateObj.rejected_at = new Date().toISOString();
    updateObj.rejected_by = changedBy;
    if (input.rejectionReason !== undefined) {
      updateObj.rejection_reason = input.rejectionReason || null;
    }
  }

  // Perform the update
  const { data: updatedData, error: updateError } = await supabaseAdmin!
    .from('legal_requests')
    .update(updateObj)
    .eq('id', id)
    .select()
    .single();

  if (updateError || !updatedData) {
    console.error('Error updating legal request:', updateError);
    return { success: false, error: updateError?.message || 'Failed to update request' };
  }

  // Insert status history if status changed
  if (input.status && input.status !== current.status) {
    const { error: historyError } = await supabaseAdmin!
      .from('legal_request_status_history')
      .insert({
        request_id: id,
        old_status: current.status,
        new_status: input.status,
        changed_by: changedBy,
        notes: null,
      });

    if (historyError) {
      console.error('Error creating status history:', historyError);
      // Still return success
    }
  }

  return {
    success: true,
    data: transformLegalRequest(updatedData as LegalRequestRow),
  };
}

/**
 * Add a comment to a legal request
 * Returns the created comment
 */
export async function addLegalRequestComment(
  requestId: string,
  authorId: string,
  content: string,
  isInternal: boolean = false
): Promise<LegalRequestComment | null> {
  if (!isSupabaseAdminConfigured()) {
    return null;
  }

  const { data, error } = await supabaseAdmin!
    .from('legal_request_comments')
    .insert({
      request_id: requestId,
      author_id: authorId,
      content,
      is_internal: isInternal,
    })
    .select()
    .single();

  if (error) {
    console.error('Error adding legal request comment:', error);
    return null;
  }

  return transformLegalComment(data as LegalRequestCommentRow);
}

/**
 * Get statistics for legal requests dashboard
 * Counts by status and type, with optional filtering by branch
 */
export async function getLegalRequestStats(branchId?: string): Promise<LegalDashboardStats> {
  if (!isSupabaseAdminConfigured()) {
    return {
      total: 0,
      byStatus: {
        submitted: 0,
        under_review: 0,
        in_progress: 0,
        ready: 0,
        completed: 0,
        rejected: 0,
      },
      byType: {
        contract_preparation: 0,
        supplementary_agreement: 0,
        contract_termination: 0,
        website_registration: 0,
        guarantee_letter: 0,
      },
      byBranch: [],
    };
  }

  // Fetch all non-voided requests
  let query = supabaseAdmin!
    .from('legal_requests')
    .select('id, status, request_type, branch_id')
    .is('voided_at', null);

  if (branchId) {
    query = query.eq('branch_id', branchId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching legal request stats:', error);
    return {
      total: 0,
      byStatus: {
        submitted: 0,
        under_review: 0,
        in_progress: 0,
        ready: 0,
        completed: 0,
        rejected: 0,
      },
      byType: {
        contract_preparation: 0,
        supplementary_agreement: 0,
        contract_termination: 0,
        website_registration: 0,
        guarantee_letter: 0,
      },
      byBranch: [],
    };
  }

  const requests = (data || []) as any[];

  // Count by status
  const byStatus: Record<LegalRequestStatus, number> = {
    submitted: 0,
    under_review: 0,
    in_progress: 0,
    ready: 0,
    completed: 0,
    rejected: 0,
  };

  for (const req of requests) {
    byStatus[req.status as LegalRequestStatus]++;
  }

  // Count by type
  const byType: Record<string, number> = {
    contract_preparation: 0,
    supplementary_agreement: 0,
    contract_termination: 0,
    website_registration: 0,
    guarantee_letter: 0,
  };

  for (const req of requests) {
    if (byType[req.request_type] !== undefined) {
      byType[req.request_type]++;
    }
  }

  // Count by branch (simplified - would need branch name from join)
  const byBranchMap: Record<string, { count: number; name?: string }> = {};
  for (const req of requests) {
    if (!byBranchMap[req.branch_id]) {
      byBranchMap[req.branch_id] = { count: 0 };
    }
    byBranchMap[req.branch_id].count++;
  }

  const byBranch = Object.entries(byBranchMap).map(([branchId, data]) => ({
    branchId,
    branchName: data.name || branchId,
    count: data.count,
  }));

  return {
    total: requests.length,
    byStatus: byStatus as Record<LegalRequestStatus, number>,
    byType: byType as Record<string, number>,
    byBranch,
  };
}

/**
 * Void a legal request
 * Sets voided_at, voided_by, void_reason
 */
export async function voidLegalRequest(
  id: string,
  voidedBy: string,
  reason: string
): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseAdminConfigured()) {
    return { success: false, error: 'Database not configured' };
  }

  const { error } = await supabaseAdmin!
    .from('legal_requests')
    .update({
      voided_at: new Date().toISOString(),
      voided_by: voidedBy,
      void_reason: reason,
    })
    .eq('id', id);

  if (error) {
    console.error('Error voiding legal request:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}
