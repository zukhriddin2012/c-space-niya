import { supabaseAdmin, isSupabaseAdminConfigured, LeaveRequest } from './connection';

// ============================================
// LEAVE REQUESTS
// ============================================

export async function getLeaveRequests(status?: string): Promise<LeaveRequest[]> {
  if (!isSupabaseAdminConfigured()) {
    return [];
  }

  let query = supabaseAdmin!
    .from('leave_requests')
    .select(`
      *,
      employees(full_name, employee_id, position)
    `)
    .order('created_at', { ascending: false });

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching leave requests:', error);
    return [];
  }

  return data || [];
}

export async function updateLeaveRequest(
  id: number,
  status: 'approved' | 'rejected',
  reviewedBy: string,
  note?: string
): Promise<boolean> {
  if (!isSupabaseAdminConfigured()) {
    return false;
  }

  const { error } = await supabaseAdmin!
    .from('leave_requests')
    .update({
      status,
      reviewed_by: reviewedBy,
      reviewed_at: new Date().toISOString(),
      review_note: note || null,
    })
    .eq('id', id);

  if (error) {
    console.error('Error updating leave request:', error);
    return false;
  }

  return true;
}

// Get leave request by ID with employee telegram info (for notifications)
export async function getLeaveRequestWithTelegram(id: number): Promise<{
  id: number;
  employee_id: string;
  employee_name: string;
  telegram_id: string | null;
  start_date: string;
  end_date: string;
  reason: string | null;
  status: string;
  review_note: string | null;
} | null> {
  if (!isSupabaseAdminConfigured()) {
    return null;
  }

  const { data, error } = await supabaseAdmin!
    .from('leave_requests')
    .select(`
      id,
      employee_id,
      start_date,
      end_date,
      reason,
      status,
      review_note,
      employees(full_name, telegram_id)
    `)
    .eq('id', id)
    .single();

  if (error || !data) {
    console.error('Error fetching leave request:', error);
    return null;
  }

  return {
    id: data.id,
    employee_id: data.employee_id,
    employee_name: (data.employees as any)?.full_name || 'Unknown',
    telegram_id: (data.employees as any)?.telegram_id || null,
    start_date: data.start_date,
    end_date: data.end_date,
    reason: data.reason,
    status: data.status,
    review_note: data.review_note,
  };
}

// Get leave requests for a specific employee
export async function getLeaveRequestsByEmployee(employeeId: string): Promise<LeaveRequest[]> {
  if (!isSupabaseAdminConfigured()) {
    return [];
  }

  const { data, error } = await supabaseAdmin!
    .from('leave_requests')
    .select('*')
    .eq('employee_id', employeeId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching employee leave requests:', error);
    return [];
  }

  return data || [];
}

// Create a new leave request
export async function createLeaveRequest(request: {
  employee_id: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  reason: string;
}): Promise<{ success: boolean; request?: LeaveRequest; error?: string }> {
  if (!isSupabaseAdminConfigured()) {
    return { success: false, error: 'Database not configured' };
  }

  const { data, error } = await supabaseAdmin!
    .from('leave_requests')
    .insert({
      employee_id: request.employee_id,
      leave_type: request.leave_type,
      start_date: request.start_date,
      end_date: request.end_date,
      reason: request.reason,
      status: 'pending',
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating leave request:', error);
    return { success: false, error: error.message };
  }

  return { success: true, request: data };
}
