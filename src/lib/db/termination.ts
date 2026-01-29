import { supabaseAdmin, isSupabaseAdminConfigured } from './connection';

// ============================================
// TERMINATION REQUESTS
// ============================================

export interface TerminationRequest {
  id: string;
  employee_id: string;
  requested_by: string;
  reason: string;
  termination_date: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  approved_by: string | null;
  rejection_reason: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  approved_at: string | null;
  // Joined data
  employee?: {
    id: string;
    employee_id: string;
    full_name: string;
    position: string;
    branch_id: string | null;
    branches?: { name: string } | null;
  };
  requester?: {
    id: string;
    full_name: string;
  };
  approver?: {
    id: string;
    full_name: string;
  };
}

export async function createTerminationRequest(request: {
  employee_id: string;
  requested_by: string;
  reason: string;
  termination_date: string;
  notes?: string;
}): Promise<{ success: boolean; request?: TerminationRequest; error?: string }> {
  if (!isSupabaseAdminConfigured()) {
    return { success: false, error: 'Database not configured' };
  }

  // Check if there's already a pending request for this employee
  const { data: existing } = await supabaseAdmin!
    .from('termination_requests')
    .select('id')
    .eq('employee_id', request.employee_id)
    .eq('status', 'pending')
    .limit(1);

  if (existing && existing.length > 0) {
    return { success: false, error: 'A pending termination request already exists for this employee' };
  }

  const { data, error } = await supabaseAdmin!
    .from('termination_requests')
    .insert({
      employee_id: request.employee_id,
      requested_by: request.requested_by,
      reason: request.reason,
      termination_date: request.termination_date,
      notes: request.notes || null,
      status: 'pending',
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating termination request:', error);
    return { success: false, error: error.message };
  }

  return { success: true, request: data };
}

export async function getTerminationRequests(
  status?: string
): Promise<TerminationRequest[]> {
  if (!isSupabaseAdminConfigured()) {
    return [];
  }

  let query = supabaseAdmin!
    .from('termination_requests')
    .select(`
      *,
      employee:employees!termination_requests_employee_id_fkey(
        id, employee_id, full_name, position, branch_id,
        branches!employees_branch_id_fkey(name)
      ),
      requester:employees!termination_requests_requested_by_fkey(id, full_name),
      approver:employees!termination_requests_approved_by_fkey(id, full_name)
    `)
    .order('created_at', { ascending: false });

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching termination requests:', error);
    return [];
  }

  return data || [];
}

export async function getTerminationRequestById(id: string): Promise<TerminationRequest | null> {
  if (!isSupabaseAdminConfigured()) {
    return null;
  }

  const { data, error } = await supabaseAdmin!
    .from('termination_requests')
    .select(`
      *,
      employee:employees!termination_requests_employee_id_fkey(
        id, employee_id, full_name, position, branch_id,
        branches!employees_branch_id_fkey(name)
      ),
      requester:employees!termination_requests_requested_by_fkey(id, full_name),
      approver:employees!termination_requests_approved_by_fkey(id, full_name)
    `)
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching termination request:', error);
    return null;
  }

  return data;
}

export async function getEmployeePendingTermination(employeeId: string): Promise<TerminationRequest | null> {
  if (!isSupabaseAdminConfigured()) {
    return null;
  }

  const { data, error } = await supabaseAdmin!
    .from('termination_requests')
    .select('*')
    .eq('employee_id', employeeId)
    .eq('status', 'pending')
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
    console.error('Error fetching pending termination:', error);
  }

  return data || null;
}

export async function approveTerminationRequest(
  requestId: string,
  approvedBy: string
): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseAdminConfigured()) {
    return { success: false, error: 'Database not configured' };
  }

  // Get the request to find the employee
  const { data: request, error: fetchError } = await supabaseAdmin!
    .from('termination_requests')
    .select('employee_id, termination_date')
    .eq('id', requestId)
    .single();

  if (fetchError || !request) {
    return { success: false, error: 'Termination request not found' };
  }

  // Update request status
  const { error: updateError } = await supabaseAdmin!
    .from('termination_requests')
    .update({
      status: 'approved',
      approved_by: approvedBy,
      approved_at: new Date().toISOString(),
    })
    .eq('id', requestId);

  if (updateError) {
    console.error('Error approving termination request:', updateError);
    return { success: false, error: updateError.message };
  }

  // Update employee status to terminated
  const { error: employeeError } = await supabaseAdmin!
    .from('employees')
    .update({
      status: 'terminated',
      notes: `Terminated on ${request.termination_date}. Approved termination request.`,
    })
    .eq('id', request.employee_id);

  if (employeeError) {
    console.error('Error updating employee status:', employeeError);
    return { success: false, error: employeeError.message };
  }

  // Deactivate all wages for this employee
  await supabaseAdmin!
    .from('employee_wages')
    .update({ is_active: false })
    .eq('employee_id', request.employee_id);

  await supabaseAdmin!
    .from('employee_branch_wages')
    .update({ is_active: false })
    .eq('employee_id', request.employee_id);

  // Clear telegram_id to disable bot access
  await supabaseAdmin!
    .from('employees')
    .update({ telegram_id: null })
    .eq('id', request.employee_id);

  return { success: true };
}

export async function rejectTerminationRequest(
  requestId: string,
  rejectedBy: string,
  rejectionReason: string
): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseAdminConfigured()) {
    return { success: false, error: 'Database not configured' };
  }

  const { error } = await supabaseAdmin!
    .from('termination_requests')
    .update({
      status: 'rejected',
      approved_by: rejectedBy,
      rejection_reason: rejectionReason,
      approved_at: new Date().toISOString(),
    })
    .eq('id', requestId);

  if (error) {
    console.error('Error rejecting termination request:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}
