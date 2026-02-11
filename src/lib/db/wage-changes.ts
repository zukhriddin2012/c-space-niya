import { supabaseAdmin, isSupabaseAdminConfigured } from './connection';

// ======================
// WAGE CHANGE REQUESTS
// ======================

export interface WageChangeRequest {
  id: string;
  employee_id: string;
  wage_type: 'primary' | 'additional';
  legal_entity_id: string | null;
  branch_id: string | null;
  current_amount: number;
  proposed_amount: number;
  change_type: 'increase' | 'decrease';
  reason: string;
  effective_date: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  requested_by: string;
  approved_by: string | null;
  rejection_reason: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  approved_at: string | null;
  // Joined fields
  employee?: { full_name: string; employee_id: string };
  requester?: { full_name: string };
  approver?: { full_name: string };
  legal_entity?: { name: string };
  branch?: { name: string };
}

export async function createWageChangeRequest(data: {
  employee_id: string;
  wage_type: 'primary' | 'additional';
  legal_entity_id?: string;
  branch_id?: string;
  current_amount: number;
  proposed_amount: number;
  reason: string;
  effective_date: string;
  requested_by: string;
  notes?: string;
}): Promise<{ success: boolean; request?: WageChangeRequest; error?: string }> {
  if (!isSupabaseAdminConfigured()) {
    return { success: false, error: 'Database not configured' };
  }

  // Validate wage type and reference
  if (data.wage_type === 'primary' && !data.legal_entity_id) {
    return { success: false, error: 'Legal entity is required for primary wage changes' };
  }
  if (data.wage_type === 'additional' && !data.branch_id) {
    return { success: false, error: 'Branch is required for additional wage changes' };
  }

  // Determine change type
  const change_type = data.proposed_amount > data.current_amount ? 'increase' : 'decrease';

  // Check for existing pending request for the same wage
  const { data: existingRequests } = await supabaseAdmin!
    .from('wage_change_requests')
    .select('id')
    .eq('employee_id', data.employee_id)
    .eq('wage_type', data.wage_type)
    .eq('status', 'pending')
    .eq(data.wage_type === 'primary' ? 'legal_entity_id' : 'branch_id',
        data.wage_type === 'primary' ? data.legal_entity_id : data.branch_id)
    .limit(1);

  if (existingRequests && existingRequests.length > 0) {
    return { success: false, error: 'There is already a pending wage change request for this wage' };
  }

  // Create the request
  const { data: request, error } = await supabaseAdmin!
    .from('wage_change_requests')
    .insert({
      employee_id: data.employee_id,
      wage_type: data.wage_type,
      legal_entity_id: data.legal_entity_id || null,
      branch_id: data.branch_id || null,
      current_amount: data.current_amount,
      proposed_amount: data.proposed_amount,
      change_type,
      reason: data.reason,
      effective_date: data.effective_date,
      requested_by: data.requested_by,
      notes: data.notes || null,
      status: 'pending',
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating wage change request:', error);
    return { success: false, error: error.message };
  }

  return { success: true, request };
}

export async function getWageChangeRequests(
  status?: string
): Promise<WageChangeRequest[]> {
  if (!isSupabaseAdminConfigured()) {
    return [];
  }

  // BUG-008 fix: legal_entity_id and branch_id have no FK constraints in the DB schema,
  // so explicit FK hints fail. Remove those joins — data is fetched without relational lookup.
  let query = supabaseAdmin!
    .from('wage_change_requests')
    .select(`
      *,
      employee:employees!wage_change_requests_employee_id_fkey(full_name, employee_id),
      requester:employees!wage_change_requests_requested_by_fkey(full_name),
      approver:employees!wage_change_requests_approved_by_fkey(full_name)
    `)
    .order('created_at', { ascending: false });

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching wage change requests:', error);
    return [];
  }

  return data || [];
}

export async function getWageChangeRequestById(
  requestId: string
): Promise<WageChangeRequest | null> {
  if (!isSupabaseAdminConfigured()) {
    return null;
  }

  const { data, error } = await supabaseAdmin!
    .from('wage_change_requests')
    .select(`
      *,
      employee:employees!wage_change_requests_employee_id_fkey(full_name, employee_id),
      requester:employees!wage_change_requests_requested_by_fkey(full_name),
      approver:employees!wage_change_requests_approved_by_fkey(full_name)
    `)
    .eq('id', requestId)
    .single();

  if (error) {
    console.error('Error fetching wage change request:', error);
    return null;
  }

  return data;
}

export async function getEmployeePendingWageChanges(
  employeeId: string
): Promise<WageChangeRequest[]> {
  if (!isSupabaseAdminConfigured()) {
    return [];
  }

  const { data, error } = await supabaseAdmin!
    .from('wage_change_requests')
    .select(`
      *,
      requester:employees!wage_change_requests_requested_by_fkey(full_name)
    `)
    .eq('employee_id', employeeId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching pending wage changes:', error);
    return [];
  }

  return data || [];
}

export async function approveWageChangeRequest(
  requestId: string,
  approvedBy: string
): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseAdminConfigured()) {
    return { success: false, error: 'Database not configured' };
  }

  // Fetch the request
  const { data: request, error: fetchError } = await supabaseAdmin!
    .from('wage_change_requests')
    .select('*')
    .eq('id', requestId)
    .single();

  if (fetchError || !request) {
    return { success: false, error: 'Wage change request not found' };
  }

  if (request.status !== 'pending') {
    return { success: false, error: 'This request has already been processed' };
  }

  // Update request status
  const { error: updateError } = await supabaseAdmin!
    .from('wage_change_requests')
    .update({
      status: 'approved',
      approved_by: approvedBy,
      approved_at: new Date().toISOString(),
    })
    .eq('id', requestId);

  if (updateError) {
    console.error('Error approving wage change request:', updateError);
    return { success: false, error: updateError.message };
  }

  // Update the actual wage
  if (request.wage_type === 'primary') {
    const { error: wageError } = await supabaseAdmin!
      .from('employee_wages')
      .update({ wage_amount: request.proposed_amount })
      .eq('employee_id', request.employee_id)
      .eq('legal_entity_id', request.legal_entity_id)
      .eq('is_active', true);

    if (wageError) {
      console.error('Error updating primary wage:', wageError);
      return { success: false, error: 'Request approved but failed to update wage: ' + wageError.message };
    }
  } else {
    const { error: wageError } = await supabaseAdmin!
      .from('employee_branch_wages')
      .update({ wage_amount: request.proposed_amount })
      .eq('employee_id', request.employee_id)
      .eq('branch_id', request.branch_id)
      .eq('is_active', true);

    if (wageError) {
      console.error('Error updating additional wage:', wageError);
      return { success: false, error: 'Request approved but failed to update wage: ' + wageError.message };
    }
  }

  return { success: true };
}

export async function rejectWageChangeRequest(
  requestId: string,
  rejectedBy: string,
  rejectionReason: string
): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseAdminConfigured()) {
    return { success: false, error: 'Database not configured' };
  }

  // Check request exists and is pending
  const { data: request, error: fetchError } = await supabaseAdmin!
    .from('wage_change_requests')
    .select('status')
    .eq('id', requestId)
    .single();

  if (fetchError || !request) {
    return { success: false, error: 'Wage change request not found' };
  }

  if (request.status !== 'pending') {
    return { success: false, error: 'This request has already been processed' };
  }

  const { error } = await supabaseAdmin!
    .from('wage_change_requests')
    .update({
      status: 'rejected',
      approved_by: rejectedBy,
      rejection_reason: rejectionReason,
      approved_at: new Date().toISOString(),
    })
    .eq('id', requestId);

  if (error) {
    console.error('Error rejecting wage change request:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

export async function cancelWageChangeRequest(
  requestId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseAdminConfigured()) {
    return { success: false, error: 'Database not configured' };
  }

  // Check request exists, is pending, and was requested by this user
  const { data: request, error: fetchError } = await supabaseAdmin!
    .from('wage_change_requests')
    .select('status, requested_by')
    .eq('id', requestId)
    .single();

  if (fetchError || !request) {
    return { success: false, error: 'Wage change request not found' };
  }

  if (request.status !== 'pending') {
    return { success: false, error: 'This request has already been processed' };
  }

  if (request.requested_by !== userId) {
    return { success: false, error: 'You can only cancel your own requests' };
  }

  const { error } = await supabaseAdmin!
    .from('wage_change_requests')
    .update({ status: 'cancelled' })
    .eq('id', requestId);

  if (error) {
    console.error('Error cancelling wage change request:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}
