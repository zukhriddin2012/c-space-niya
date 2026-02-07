import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-auth';
import { PERMISSIONS } from '@/lib/permissions';
import { supabaseAdmin, isSupabaseAdminConfigured } from '@/lib/supabase';
import type { CreateTransactionInput } from '@/modules/reception/types';

// ============================================
// GET /api/reception/transactions
// List transactions with filters
// ============================================
export const GET = withAuth(async (request: NextRequest, { user }) => {
  try {
    if (!isSupabaseAdminConfigured()) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');
    const branchId = searchParams.get('branchId');
    const serviceTypeId = searchParams.get('serviceTypeId');
    const paymentMethodId = searchParams.get('paymentMethodId');
    const agentId = searchParams.get('agentId');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const search = searchParams.get('search');
    const includeVoided = searchParams.get('includeVoided') === 'true';
    const sortBy = searchParams.get('sortBy') || 'date'; // 'date', 'amount', 'created'
    const sortOrder = searchParams.get('sortOrder') || 'desc'; // 'asc', 'desc'

    // Build query
    let query = supabaseAdmin!
      .from('transactions')
      .select(`
        *,
        service_type:service_types(id, name, code, icon),
        payment_method:payment_methods(id, name, code, icon, requires_code),
        agent:employees!agent_id(id, full_name),
        branch:branches!branch_id(id, name)
      `, { count: 'exact' });

    // Filter out voided unless requested
    if (!includeVoided) {
      query = query.eq('is_voided', false);
    }

    // Apply filters
    if (branchId && branchId !== 'all') {
      query = query.eq('branch_id', branchId);
    }
    if (serviceTypeId) {
      query = query.eq('service_type_id', serviceTypeId);
    }
    if (paymentMethodId) {
      query = query.eq('payment_method_id', paymentMethodId);
    }
    if (agentId) {
      query = query.eq('agent_id', agentId);
    }
    if (dateFrom) {
      query = query.gte('transaction_date', dateFrom);
    }
    if (dateTo) {
      query = query.lte('transaction_date', dateTo);
    }
    if (search) {
      query = query.or(`customer_name.ilike.%${search}%,transaction_number.ilike.%${search}%,notes.ilike.%${search}%`);
    }

    // Apply sorting based on sortBy parameter
    const isAscending = sortOrder === 'asc';
    switch (sortBy) {
      case 'amount':
        query = query.order('amount', { ascending: isAscending });
        break;
      case 'date':
        query = query.order('transaction_date', { ascending: isAscending });
        query = query.order('created_at', { ascending: isAscending });
        break;
      case 'created':
      default:
        query = query.order('created_at', { ascending: isAscending });
        break;
    }

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json({ error: 'Database error', details: error.message }, { status: 500 });
    }

    // Transform data
    const transactions = (data || []).map((row: Record<string, unknown>) => ({
      id: row.id,
      transactionNumber: row.transaction_number,
      customerName: row.customer_name,
      customerPhone: row.customer_phone,
      customerCompany: row.customer_company,
      serviceTypeId: row.service_type_id,
      serviceType: row.service_type,
      amount: Number(row.amount),
      paymentMethodId: row.payment_method_id,
      paymentMethod: row.payment_method,
      transactionCode: row.transaction_code,
      branchId: row.branch_id,
      branchName: (row.branch as { name: string } | null)?.name,
      agentId: row.agent_id,
      agentName: (row.agent as { full_name: string } | null)?.full_name,
      notes: row.notes,
      isVoided: row.is_voided,
      voidedAt: row.voided_at,
      voidReason: row.void_reason,
      transactionDate: row.transaction_date,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    return NextResponse.json({
      data: transactions,
      pagination: {
        total: count || 0,
        page,
        pageSize,
        totalPages: Math.ceil((count || 0) / pageSize),
      },
      showBranchColumn: !branchId || branchId === 'all',
    });
  } catch (error) {
    console.error('Server error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}, { permission: PERMISSIONS.RECEPTION_TRANSACTIONS_VIEW, allowKiosk: true });

// ============================================
// POST /api/reception/transactions
// Create a new transaction
// ============================================
export const POST = withAuth(async (request: NextRequest, { employee }) => {
  try {
    if (!isSupabaseAdminConfigured()) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    // employee is auto-resolved by withAuth (operator PIN → auth_user_id → email)
    if (!employee) {
      return NextResponse.json({
        error: 'Employee not found',
        details: 'No employee record found for this user. Please contact admin to link your account.'
      }, { status: 404 });
    }

    const body: CreateTransactionInput = await request.json();

    // Validate required fields
    const errors: string[] = [];
    if (!body.customerName?.trim()) errors.push('Customer name is required');
    if (!body.serviceTypeId) errors.push('Service type is required');
    if (!body.amount || body.amount <= 0) errors.push('Valid amount is required');
    if (!body.paymentMethodId) errors.push('Payment method is required');

    if (errors.length > 0) {
      return NextResponse.json({ error: 'Validation failed', details: errors }, { status: 400 });
    }

    // Check if payment method requires transaction code
    const { data: paymentMethod } = await supabaseAdmin!
      .from('payment_methods')
      .select('requires_code')
      .eq('id', body.paymentMethodId)
      .single();

    if (paymentMethod?.requires_code && !body.transactionCode?.trim()) {
      errors.push('Transaction code is required for this payment method');
      return NextResponse.json({ error: 'Validation failed', details: errors }, { status: 400 });
    }

    // Use provided branch or employee's branch
    const branchId = body.branchId || employee.branchId;
    if (!branchId) {
      return NextResponse.json({ error: 'Branch is required' }, { status: 400 });
    }

    // Insert transaction
    const { data, error } = await supabaseAdmin!
      .from('transactions')
      .insert({
        customer_name: body.customerName.trim(),
        client_id: body.clientId || null,
        customer_phone: body.customerPhone?.trim() || null,
        customer_company: body.customerCompany?.trim() || null,
        service_type_id: body.serviceTypeId,
        amount: body.amount,
        payment_method_id: body.paymentMethodId,
        transaction_code: body.transactionCode?.trim() || null,
        branch_id: branchId,
        agent_id: employee.id,
        notes: body.notes?.trim() || null,
        transaction_date: body.transactionDate || new Date().toISOString().split('T')[0],
      })
      .select(`
        *,
        service_type:service_types(id, name, code, icon),
        payment_method:payment_methods(id, name, code, icon),
        agent:employees!agent_id(id, full_name),
        branch:branches!branch_id(id, name)
      `)
      .single();

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json({ error: 'Failed to create transaction', details: error.message }, { status: 500 });
    }

    return NextResponse.json({
      id: data.id,
      transactionNumber: data.transaction_number,
      customerName: data.customer_name,
      amount: Number(data.amount),
      serviceType: data.service_type,
      paymentMethod: data.payment_method,
      agentName: data.agent?.full_name,
      branchName: data.branch?.name,
      transactionDate: data.transaction_date,
      createdAt: data.created_at,
    }, { status: 201 });
  } catch (error) {
    console.error('Server error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}, { permission: PERMISSIONS.RECEPTION_TRANSACTIONS_CREATE, allowKiosk: true });
