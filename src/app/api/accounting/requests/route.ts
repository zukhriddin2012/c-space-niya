import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-auth';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';
import { supabaseAdmin, isSupabaseAdminConfigured } from '@/lib/supabase';
import { generateRequestTitle } from '@/modules/accounting/lib/utils';
import type { CreateAccountingRequestInput } from '@/modules/accounting/types';

// ============================================
// GET /api/accounting/requests
// List accounting requests with filters
// ============================================
export const GET = withAuth(async (request: NextRequest, { user }) => {
  try {
    if (!isSupabaseAdminConfigured()) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    // Get employee details
    const { data: employee } = await supabaseAdmin!
      .from('employees')
      .select('id, branch_id, full_name')
      .eq('email', user.email)
      .single();

    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');
    const status = searchParams.getAll('status');
    const requestType = searchParams.getAll('requestType');
    const branchId = searchParams.get('branchId');
    const priority = searchParams.get('priority');
    const assignedTo = searchParams.get('assignedTo');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const search = searchParams.get('search');
    const sortField = searchParams.get('sortField') || 'created_at';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    // Build query
    let query = supabaseAdmin!
      .from('accounting_requests')
      .select(`
        *,
        requester:employees!requester_id(id, full_name, email, position),
        assignee:employees!assigned_to(id, full_name, email, position),
        branch:branches!branch_id(id, name),
        from_entity:legal_entities!from_entity_id(id, name)
      `, { count: 'exact' });

    // Apply role-based filtering
    const canViewAll = hasPermission(user.role, PERMISSIONS.ACCOUNTING_REQUESTS_VIEW_ALL);
    if (!canViewAll) {
      // Users without VIEW_ALL can only see their own requests
      query = query.eq('requester_id', employee.id);
    }

    // Apply filters
    if (status.length > 0) {
      query = query.in('status', status);
    }
    if (requestType.length > 0) {
      query = query.in('request_type', requestType);
    }
    if (branchId) {
      query = query.eq('branch_id', branchId);
    }
    if (priority) {
      query = query.eq('priority', priority);
    }
    if (assignedTo) {
      if (assignedTo === 'unassigned') {
        query = query.is('assigned_to', null);
      } else {
        query = query.eq('assigned_to', assignedTo);
      }
    }
    if (dateFrom) {
      query = query.gte('created_at', dateFrom);
    }
    if (dateTo) {
      query = query.lte('created_at', dateTo);
    }
    if (search) {
      query = query.or(`request_number.ilike.%${search}%,title.ilike.%${search}%,tenant_name.ilike.%${search}%,recipient_name.ilike.%${search}%,client_name.ilike.%${search}%`);
    }

    // Apply sorting
    const validSortFields = ['created_at', 'updated_at', 'sla_deadline', 'amount', 'priority'];
    const field = validSortFields.includes(sortField) ? sortField : 'created_at';
    query = query.order(field, { ascending: sortOrder === 'asc' });

    // Apply pagination
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json({ error: 'Database error', details: error.message }, { status: 500 });
    }

    return NextResponse.json({
      data: data || [],
      total: count || 0,
      page,
      pageSize,
      totalPages: Math.ceil((count || 0) / pageSize),
    });
  } catch (error) {
    console.error('Server error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}, { permission: PERMISSIONS.ACCOUNTING_REQUESTS_VIEW });

// ============================================
// POST /api/accounting/requests
// Create a new accounting request
// ============================================
export const POST = withAuth(async (request: NextRequest, { user }) => {
  try {
    if (!isSupabaseAdminConfigured()) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    // Get employee details
    const { data: employee } = await supabaseAdmin!
      .from('employees')
      .select('id, branch_id, full_name')
      .eq('email', user.email)
      .single();

    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    const body: CreateAccountingRequestInput = await request.json();

    // Validate required fields
    const errors = validateRequest(body);
    if (errors.length > 0) {
      return NextResponse.json({ error: 'Validation failed', details: errors }, { status: 400 });
    }

    // Build request data
    const requestData: Record<string, unknown> = {
      request_type: body.requestType,
      status: 'pending',
      priority: body.priority,
      requester_id: employee.id,
      branch_id: body.branchId || employee.branch_id,
      from_entity_id: body.fromEntityId,
      title: generateRequestTitle(body.requestType, body as any),
      notes: body.notes,
    };

    // Add type-specific fields
    if (body.requestType === 'reconciliation') {
      requestData.tenant_name = body.tenantName;
      requestData.tenant_inn = body.tenantInn;
      requestData.contract_number = body.contractNumber;
      requestData.contract_start_date = body.contractStartDate;
      requestData.contract_end_date = body.contractEndDate;
      requestData.reconciliation_period_start = body.reconciliationPeriodStart;
      requestData.reconciliation_period_end = body.reconciliationPeriodEnd;
    } else if (body.requestType === 'payment') {
      requestData.recipient_name = body.recipientName;
      requestData.recipient_inn = body.recipientInn;
      requestData.amount = body.amount;
      requestData.payment_category = body.paymentCategory;
      requestData.payment_purpose = body.paymentPurpose;
      requestData.contract_number = body.contractNumber;
      requestData.invoice_number = body.invoiceNumber;
    } else if (body.requestType === 'confirmation') {
      requestData.client_name = body.clientName;
      requestData.client_inn = body.clientInn;
      requestData.expected_amount = body.expectedAmount;
      requestData.expected_date = body.expectedDate;
      requestData.invoice_number = body.invoiceNumber;
    }

    // Insert the request
    const { data, error } = await supabaseAdmin!
      .from('accounting_requests')
      .insert(requestData)
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json({ error: 'Failed to create request', details: error.message }, { status: 500 });
    }

    // Log history
    await supabaseAdmin!.from('accounting_request_history').insert({
      request_id: data.id,
      actor_id: employee.id,
      action: 'created',
      details: { request_type: body.requestType },
    });

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('Server error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}, { permission: PERMISSIONS.ACCOUNTING_REQUESTS_CREATE });

function validateRequest(body: CreateAccountingRequestInput): string[] {
  const errors: string[] = [];

  if (!body.requestType) errors.push('Request type is required');
  if (!body.fromEntityId) errors.push('From entity is required');
  if (!body.priority) errors.push('Priority is required');

  if (body.requestType === 'reconciliation') {
    if (!body.tenantName) errors.push('Tenant name is required');
    if (!body.tenantInn) errors.push('Tenant INN is required');
    if (!body.reconciliationPeriodStart) errors.push('Reconciliation period start is required');
    if (!body.reconciliationPeriodEnd) errors.push('Reconciliation period end is required');
  }

  if (body.requestType === 'payment') {
    if (!body.recipientName) errors.push('Recipient name is required');
    if (!body.amount || body.amount <= 0) errors.push('Valid amount is required');
    if (!body.paymentCategory) errors.push('Payment category is required');
    if (!body.paymentPurpose) errors.push('Payment purpose is required');
  }

  if (body.requestType === 'confirmation') {
    if (!body.clientName) errors.push('Client name is required');
  }

  return errors;
}
