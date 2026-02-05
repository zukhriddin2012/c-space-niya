import { supabaseAdmin, isSupabaseAdminConfigured, Employee } from './connection';
import type { LegalEntity } from './legal-entities';

// ============================================
// PAYMENT REQUESTS (Advance & Wage Payments)
// ============================================

export interface PaymentRequest {
  id: string;
  request_type: 'advance' | 'wage';
  year: number;
  month: number;
  legal_entity_id: string | null;
  total_amount: number;
  employee_count: number;
  status: 'draft' | 'pending_approval' | 'approved' | 'rejected' | 'paid';
  created_by: string;
  submitted_at: string | null;
  approved_by: string | null;
  approved_at: string | null;
  rejection_reason: string | null;
  paid_at: string | null;
  payment_reference: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  legal_entities?: LegalEntity;
  items?: PaymentRequestItem[];
}

export interface PaymentRequestItem {
  id: string;
  payment_request_id: string;
  employee_id: string;
  legal_entity_id: string | null;
  amount: number;
  net_salary: number | null;
  advance_paid: number;
  notes: string | null;
  created_at: string;
  employees?: Employee;
  legal_entities?: LegalEntity;
}

// Get all payment requests for a month
export async function getPaymentRequests(year: number, month: number, requestType?: 'advance' | 'wage'): Promise<PaymentRequest[]> {
  if (!isSupabaseAdminConfigured()) {
    return [];
  }

  let query = supabaseAdmin!
    .from('payment_requests')
    .select('*, legal_entities(id, name, short_name)')
    .eq('year', year)
    .eq('month', month)
    .order('created_at', { ascending: false });

  if (requestType) {
    query = query.eq('request_type', requestType);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching payment requests:', error);
    return [];
  }

  return data || [];
}

// Get a single payment request with items
export async function getPaymentRequestById(id: string): Promise<PaymentRequest | null> {
  if (!isSupabaseAdminConfigured()) {
    return null;
  }

  const { data, error } = await supabaseAdmin!
    .from('payment_requests')
    .select(`
      *,
      legal_entities(id, name, short_name),
      payment_request_items(
        *,
        employees(id, full_name, position, employee_id),
        legal_entities(id, name, short_name)
      )
    `)
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching payment request:', error);
    return null;
  }

  return {
    ...data,
    items: data.payment_request_items || [],
  };
}

// Create a new payment request
export async function createPaymentRequest(request: {
  request_type: 'advance' | 'wage';
  year: number;
  month: number;
  legal_entity_id?: string;
  created_by: string;
  notes?: string;
  items: {
    employee_id: string;
    legal_entity_id?: string;
    amount: number;
    net_salary?: number;
    advance_paid?: number;
    notes?: string;
  }[];
}): Promise<{ success: boolean; request?: PaymentRequest; error?: string }> {
  if (!isSupabaseAdminConfigured()) {
    return { success: false, error: 'Database not configured' };
  }

  const totalAmount = request.items.reduce((sum, item) => sum + item.amount, 0);

  // Create the payment request
  const { data: requestData, error: requestError } = await supabaseAdmin!
    .from('payment_requests')
    .insert({
      request_type: request.request_type,
      year: request.year,
      month: request.month,
      legal_entity_id: request.legal_entity_id || null,
      total_amount: totalAmount,
      employee_count: request.items.length,
      status: 'draft',
      created_by: request.created_by,
      notes: request.notes || null,
    })
    .select()
    .single();

  if (requestError) {
    console.error('Error creating payment request:', requestError);
    return { success: false, error: requestError.message };
  }

  // Create the items
  const itemsToInsert = request.items.map(item => ({
    payment_request_id: requestData.id,
    employee_id: item.employee_id,
    legal_entity_id: item.legal_entity_id || null,
    amount: item.amount,
    net_salary: item.net_salary || null,
    advance_paid: item.advance_paid || 0,
    notes: item.notes || null,
  }));

  const { error: itemsError } = await supabaseAdmin!
    .from('payment_request_items')
    .insert(itemsToInsert);

  if (itemsError) {
    console.error('Error creating payment request items:', itemsError);
    // Clean up the request if items failed
    await supabaseAdmin!.from('payment_requests').delete().eq('id', requestData.id);
    return { success: false, error: itemsError.message };
  }

  return { success: true, request: requestData };
}

// Submit payment request for approval (HR -> GM)
export async function submitPaymentRequest(id: string): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseAdminConfigured()) {
    return { success: false, error: 'Database not configured' };
  }

  const { error } = await supabaseAdmin!
    .from('payment_requests')
    .update({
      status: 'pending_approval',
      submitted_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('status', 'draft');

  if (error) {
    console.error('Error submitting payment request:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

// Approve payment request (GM)
export async function approvePaymentRequest(id: string, approvedBy: string): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseAdminConfigured()) {
    return { success: false, error: 'Database not configured' };
  }

  const { error } = await supabaseAdmin!
    .from('payment_requests')
    .update({
      status: 'approved',
      approved_by: approvedBy,
      approved_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('status', 'pending_approval');

  if (error) {
    console.error('Error approving payment request:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

// Reject payment request (GM)
export async function rejectPaymentRequest(id: string, rejectedBy: string, reason: string): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseAdminConfigured()) {
    return { success: false, error: 'Database not configured' };
  }

  const { error } = await supabaseAdmin!
    .from('payment_requests')
    .update({
      status: 'rejected',
      approved_by: rejectedBy,
      approved_at: new Date().toISOString(),
      rejection_reason: reason,
    })
    .eq('id', id)
    .eq('status', 'pending_approval');

  if (error) {
    console.error('Error rejecting payment request:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

// Mark payment request as paid
export async function markPaymentRequestPaid(id: string, paymentReference?: string): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseAdminConfigured()) {
    return { success: false, error: 'Database not configured' };
  }

  // First get the request details
  const request = await getPaymentRequestById(id);
  if (!request) {
    return { success: false, error: 'Payment request not found' };
  }

  // Update the request
  const { error } = await supabaseAdmin!
    .from('payment_requests')
    .update({
      status: 'paid',
      paid_at: new Date().toISOString(),
      payment_reference: paymentReference || null,
    })
    .eq('id', id)
    .eq('status', 'approved');

  if (error) {
    console.error('Error marking payment as paid:', error);
    return { success: false, error: error.message };
  }

  // Update payslips with advance/wage paid amounts
  if (request.items) {
    for (const item of request.items) {
      const columnToUpdate = request.request_type === 'advance' ? 'advance_paid' : 'wage_paid';

      // Get or create payslip for this employee/month
      const { data: existingPayslip } = await supabaseAdmin!
        .from('payslips')
        .select('id, advance_paid, wage_paid')
        .eq('employee_id', item.employee_id)
        .eq('year', request.year)
        .eq('month', request.month)
        .single();

      if (existingPayslip) {
        // Update existing payslip
        const currentValue = (existingPayslip as Record<string, number>)[columnToUpdate] || 0;
        await supabaseAdmin!
          .from('payslips')
          .update({ [columnToUpdate]: currentValue + item.amount })
          .eq('id', existingPayslip.id);
      } else {
        // Create new payslip
        await supabaseAdmin!
          .from('payslips')
          .insert({
            employee_id: item.employee_id,
            year: request.year,
            month: request.month,
            base_salary: item.net_salary || 0,
            bonuses: 0,
            deductions: 0,
            net_salary: item.net_salary || 0,
            [columnToUpdate]: item.amount,
            status: 'draft',
          });
      }
    }
  }

  return { success: true };
}

// Get advance payments summary for an employee in a month
export async function getEmployeeAdvancePaid(employeeId: string, year: number, month: number): Promise<number> {
  if (!isSupabaseAdminConfigured()) {
    return 0;
  }

  const { data, error } = await supabaseAdmin!
    .from('payment_request_items')
    .select(`
      amount,
      payment_requests!inner(
        year,
        month,
        request_type,
        status
      )
    `)
    .eq('employee_id', employeeId)
    .eq('payment_requests.year', year)
    .eq('payment_requests.month', month)
    .eq('payment_requests.request_type', 'advance')
    .eq('payment_requests.status', 'paid');

  if (error) {
    console.error('Error fetching employee advance paid:', error);
    return 0;
  }

  return (data || []).reduce((sum, item) => sum + (item.amount || 0), 0);
}

// Get payment request summary for payroll page
export async function getPaymentRequestsSummary(year: number, month: number) {
  const requests = await getPaymentRequests(year, month);

  const advanceRequests = requests.filter(r => r.request_type === 'advance');
  const wageRequests = requests.filter(r => r.request_type === 'wage');

  const getStatusSummary = (reqs: PaymentRequest[]) => ({
    draft: reqs.filter(r => r.status === 'draft').length,
    pending: reqs.filter(r => r.status === 'pending_approval').length,
    approved: reqs.filter(r => r.status === 'approved').length,
    rejected: reqs.filter(r => r.status === 'rejected').length,
    paid: reqs.filter(r => r.status === 'paid').length,
    totalAmount: reqs.reduce((sum, r) => sum + Number(r.total_amount), 0),
    paidAmount: reqs.filter(r => r.status === 'paid').reduce((sum, r) => sum + Number(r.total_amount), 0),
  });

  return {
    advance: getStatusSummary(advanceRequests),
    wage: getStatusSummary(wageRequests),
    requests,
  };
}

// Get paid advance amounts per employee for a given month
export async function getPaidAdvancesByEmployee(year: number, month: number): Promise<Record<string, number>> {
  if (!isSupabaseAdminConfigured()) {
    return {};
  }

  // Get all paid advance requests for this month
  const { data: requests, error: reqError } = await supabaseAdmin!
    .from('payment_requests')
    .select('id')
    .eq('year', year)
    .eq('month', month)
    .eq('request_type', 'advance')
    .eq('status', 'paid');

  if (reqError || !requests || requests.length === 0) {
    return {};
  }

  const requestIds = requests.map(r => r.id);

  // Get all items from paid advance requests
  const { data: items, error: itemsError } = await supabaseAdmin!
    .from('payment_request_items')
    .select('employee_id, amount')
    .in('payment_request_id', requestIds);

  if (itemsError || !items) {
    return {};
  }

  // Sum amounts per employee
  const paidAdvances: Record<string, number> = {};
  for (const item of items) {
    const empId = item.employee_id;
    paidAdvances[empId] = (paidAdvances[empId] || 0) + Number(item.amount);
  }

  return paidAdvances;
}

// Get employee's payment history
export async function getEmployeePaymentHistory(employeeId: string) {
  if (!isSupabaseAdminConfigured()) {
    return { payments: [], pending: [] };
  }

  // Get all payment request items for this employee
  const { data: items, error } = await supabaseAdmin!
    .from('payment_request_items')
    .select(`
      id,
      amount,
      net_salary,
      created_at,
      payment_request_id,
      payment_requests (
        id,
        request_type,
        year,
        month,
        status,
        submitted_at,
        approved_at,
        paid_at,
        payment_reference
      )
    `)
    .eq('employee_id', employeeId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching employee payments:', error);
    return { payments: [], pending: [] };
  }

  // Filter to only paid items
  const payments = (items || [])
    .filter((p: any) => p.payment_requests?.status === 'paid')
    .map((p: any) => ({
      id: p.id,
      amount: p.amount,
      net_salary: p.net_salary,
      type: p.payment_requests?.request_type,
      year: p.payment_requests?.year,
      month: p.payment_requests?.month,
      paid_at: p.payment_requests?.paid_at,
      payment_reference: p.payment_requests?.payment_reference,
    }));

  // Get pending payments (approved but not paid yet)
  const pending = (items || [])
    .filter((p: any) => ['approved', 'pending_approval'].includes(p.payment_requests?.status))
    .map((p: any) => ({
      id: p.id,
      amount: p.amount,
      net_salary: p.net_salary,
      type: p.payment_requests?.request_type,
      year: p.payment_requests?.year,
      month: p.payment_requests?.month,
      status: p.payment_requests?.status,
      submitted_at: p.payment_requests?.submitted_at,
      approved_at: p.payment_requests?.approved_at,
    }));

  return { payments, pending };
}

// Get payment request items with employee telegram IDs for notifications
export async function getPaymentRequestItemsWithTelegram(requestId: string): Promise<{
  request: {
    id: string;
    request_type: 'advance' | 'wage';
    year: number;
    month: number;
    status: string;
    rejection_reason?: string;
    payment_reference?: string;
  } | null;
  items: Array<{
    id: string;
    employee_id: string;
    employee_name: string;
    telegram_id: string | null;
    amount: number;
    net_salary: number;
  }>;
}> {
  if (!isSupabaseAdminConfigured()) {
    return { request: null, items: [] };
  }

  // First get the payment request
  const { data: request, error: requestError } = await supabaseAdmin!
    .from('payment_requests')
    .select('id, request_type, year, month, status, rejection_reason, payment_reference')
    .eq('id', requestId)
    .single();

  if (requestError || !request) {
    console.error('Error fetching payment request:', requestError);
    return { request: null, items: [] };
  }

  // Get items with employee telegram IDs
  const { data: items, error: itemsError } = await supabaseAdmin!
    .from('payment_request_items')
    .select(`
      id,
      employee_id,
      amount,
      net_salary,
      employees(id, full_name, telegram_id)
    `)
    .eq('payment_request_id', requestId);

  if (itemsError) {
    console.error('Error fetching payment request items:', itemsError);
    return { request, items: [] };
  }

  const formattedItems = (items || []).map((item: any) => ({
    id: item.id,
    employee_id: item.employee_id,
    employee_name: item.employees?.full_name || 'Unknown',
    telegram_id: item.employees?.telegram_id || null,
    amount: item.amount,
    net_salary: item.net_salary || 0,
  }));

  return { request, items: formattedItems };
}

// ============================================
// PAID STATUS (Duplicate Prevention)
// ============================================

export interface EmployeePaidStatus {
  advancePaid: number | null;
  advancePaidAt: string | null;
  wagePaid: number | null;
  wagePaidAt: string | null;
}

export type PaidStatusMap = Record<string, EmployeePaidStatus>;

// Get paid status for all employees in a period (for duplicate prevention)
export async function getEmployeePaidStatus(year: number, month: number): Promise<PaidStatusMap> {
  if (!isSupabaseAdminConfigured()) {
    return {};
  }

  // Get all paid payment_request_items for the period
  const { data, error } = await supabaseAdmin!
    .from('payment_request_items')
    .select(`
      employee_id,
      amount,
      payment_requests!inner (
        request_type,
        paid_at,
        status
      )
    `)
    .eq('payment_requests.year', year)
    .eq('payment_requests.month', month)
    .eq('payment_requests.status', 'paid');

  if (error) {
    console.error('Error fetching paid status:', error);
    return {};
  }

  // Transform to map
  const result: PaidStatusMap = {};

  for (const item of data || []) {
    const empId = item.employee_id;
    if (!result[empId]) {
      result[empId] = {
        advancePaid: null,
        advancePaidAt: null,
        wagePaid: null,
        wagePaidAt: null,
      };
    }

    const paymentRequest = item.payment_requests as unknown as {
      request_type: string;
      paid_at: string;
      status: string;
    };

    if (paymentRequest.request_type === 'advance') {
      result[empId].advancePaid = (result[empId].advancePaid || 0) + Number(item.amount);
      result[empId].advancePaidAt = paymentRequest.paid_at;
    } else {
      result[empId].wagePaid = (result[empId].wagePaid || 0) + Number(item.amount);
      result[empId].wagePaidAt = paymentRequest.paid_at;
    }
  }

  return result;
}

// ============================================
// AUDIT LOGGING
// ============================================

export type PaymentAuditAction = 'created' | 'submitted' | 'approved' | 'rejected' | 'paid' | 'notified' | 'deleted';

export async function logPaymentAudit(params: {
  payment_request_id: string;
  actor_id: string;
  action: PaymentAuditAction;
  old_status?: string | null;
  new_status?: string | null;
  details?: Record<string, unknown>;
}): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseAdminConfigured()) {
    return { success: false, error: 'Database not configured' };
  }

  const { error } = await supabaseAdmin!
    .from('payment_request_audit')
    .insert({
      payment_request_id: params.payment_request_id,
      actor_id: params.actor_id,
      action: params.action,
      old_status: params.old_status || null,
      new_status: params.new_status || null,
      details: params.details || null,
    });

  if (error) {
    console.error('Error logging payment audit:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

// ============================================
// DELETE PAYMENT REQUEST
// ============================================

export async function deletePaymentRequest(id: string, actorId: string): Promise<{
  success: boolean;
  error?: string;
  code?: string;
  deletedRequest?: {
    id: string;
    request_type: string;
    employee_count: number;
    total_amount: number;
  };
}> {
  if (!isSupabaseAdminConfigured()) {
    return { success: false, error: 'Database not configured' };
  }

  // 1. Fetch request to validate and log
  const { data: paymentRequest, error: fetchError } = await supabaseAdmin!
    .from('payment_requests')
    .select('*')
    .eq('id', id)
    .single();

  if (fetchError || !paymentRequest) {
    return { success: false, error: 'Payment request not found', code: 'NOT_FOUND' };
  }

  // 2. Check if paid (cannot delete paid requests)
  if (paymentRequest.status === 'paid') {
    return {
      success: false,
      error: 'Cannot delete paid payment request',
      code: 'CANNOT_DELETE_PAID',
    };
  }

  // 3. Log to audit BEFORE delete
  await logPaymentAudit({
    payment_request_id: id,
    actor_id: actorId,
    action: 'deleted',
    old_status: paymentRequest.status,
    new_status: null,
    details: {
      request_type: paymentRequest.request_type,
      employee_count: paymentRequest.employee_count,
      total_amount: paymentRequest.total_amount,
      year: paymentRequest.year,
      month: paymentRequest.month,
    },
  });

  // 4. Hard delete (items cascade automatically via FK constraint)
  const { error: deleteError } = await supabaseAdmin!
    .from('payment_requests')
    .delete()
    .eq('id', id);

  if (deleteError) {
    console.error('Error deleting payment request:', deleteError);
    return { success: false, error: deleteError.message };
  }

  return {
    success: true,
    deletedRequest: {
      id,
      request_type: paymentRequest.request_type,
      employee_count: paymentRequest.employee_count,
      total_amount: paymentRequest.total_amount,
    },
  };
}

// ============================================
// NOTIFICATION TRACKING
// ============================================

// Update notification sent timestamp
export async function markNotificationSent(id: string, userId: string): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseAdminConfigured()) {
    return { success: false, error: 'Database not configured' };
  }

  const { error } = await supabaseAdmin!
    .from('payment_requests')
    .update({
      notification_sent_at: new Date().toISOString(),
      notification_sent_by: userId,
    })
    .eq('id', id);

  if (error) {
    console.error('Error updating notification timestamp:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

// Get un-notified paid requests for a period
export async function getUnnotifiedPaidRequests(year: number, month: number): Promise<PaymentRequest[]> {
  if (!isSupabaseAdminConfigured()) {
    return [];
  }

  const { data, error } = await supabaseAdmin!
    .from('payment_requests')
    .select('*, legal_entities(id, name, short_name)')
    .eq('year', year)
    .eq('month', month)
    .eq('status', 'paid')
    .is('notification_sent_at', null)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching unnotified requests:', error);
    return [];
  }

  return data || [];
}

// Get count of un-notified paid requests for a period
export async function getUnnotifiedPaidCount(year: number, month: number): Promise<{
  total: number;
  advance: number;
  wage: number;
}> {
  if (!isSupabaseAdminConfigured()) {
    return { total: 0, advance: 0, wage: 0 };
  }

  const { data, error } = await supabaseAdmin!
    .from('payment_requests')
    .select('id, request_type')
    .eq('year', year)
    .eq('month', month)
    .eq('status', 'paid')
    .is('notification_sent_at', null);

  if (error) {
    console.error('Error fetching unnotified count:', error);
    return { total: 0, advance: 0, wage: 0 };
  }

  const requests = data || [];
  return {
    total: requests.length,
    advance: requests.filter(r => r.request_type === 'advance').length,
    wage: requests.filter(r => r.request_type === 'wage').length,
  };
}
