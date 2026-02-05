import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-auth';
import { PERMISSIONS } from '@/lib/permissions';
import { supabaseAdmin, isSupabaseAdminConfigured } from '@/lib/supabase';
import type { CreateExpenseInput } from '@/modules/reception/types';

// ============================================
// GET /api/reception/expenses
// List expenses with filters
// ============================================
export const GET = withAuth(async (request: NextRequest) => {
  try {
    if (!isSupabaseAdminConfigured()) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');
    const branchId = searchParams.get('branchId');
    const expenseTypeId = searchParams.get('expenseTypeId');
    const paymentMethod = searchParams.get('paymentMethod');
    const recordedBy = searchParams.get('recordedBy');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const search = searchParams.get('search');
    const includeVoided = searchParams.get('includeVoided') === 'true';
    const sortBy = searchParams.get('sortBy') || 'date'; // 'date', 'amount', 'created'
    const sortOrder = searchParams.get('sortOrder') || 'desc'; // 'asc', 'desc'

    // Build query
    let query = supabaseAdmin!
      .from('expenses')
      .select(`
        *,
        expense_type:expense_types(id, name, code, icon),
        recorded_by_employee:employees!recorded_by(id, full_name),
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
    if (expenseTypeId) {
      query = query.eq('expense_type_id', expenseTypeId);
    }
    if (paymentMethod) {
      query = query.eq('payment_method', paymentMethod);
    }
    if (recordedBy) {
      query = query.eq('recorded_by', recordedBy);
    }
    if (dateFrom) {
      query = query.gte('expense_date', dateFrom);
    }
    if (dateTo) {
      query = query.lte('expense_date', dateTo);
    }
    if (search) {
      query = query.or(`subject.ilike.%${search}%,expense_number.ilike.%${search}%`);
    }

    // Apply sorting based on sortBy parameter
    const isAscending = sortOrder === 'asc';
    switch (sortBy) {
      case 'amount':
        query = query.order('amount', { ascending: isAscending });
        break;
      case 'created':
        query = query.order('created_at', { ascending: isAscending });
        break;
      case 'date':
      default:
        query = query.order('expense_date', { ascending: isAscending });
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
    const expenses = (data || []).map((row: Record<string, unknown>) => ({
      id: row.id,
      expenseNumber: row.expense_number,
      subject: row.subject,
      amount: Number(row.amount),
      expenseTypeId: row.expense_type_id,
      expenseType: row.expense_type,
      paymentMethod: row.payment_method,
      branchId: row.branch_id,
      branchName: (row.branch as { name: string } | null)?.name,
      recordedBy: row.recorded_by,
      recordedByName: (row.recorded_by_employee as { full_name: string } | null)?.full_name,
      isVoided: row.is_voided,
      voidedAt: row.voided_at,
      voidReason: row.void_reason,
      expenseDate: row.expense_date,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    return NextResponse.json({
      data: expenses,
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
}, { permission: PERMISSIONS.RECEPTION_EXPENSES_VIEW });

// ============================================
// POST /api/reception/expenses
// Create a new expense
// ============================================
export const POST = withAuth(async (request: NextRequest, { user }) => {
  try {
    if (!isSupabaseAdminConfigured()) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    // Get employee
    // First try to find by auth_user_id, then fall back to email
    let employee: { id: string; branch_id: string } | null = null;

    // Try by auth_user_id first (most reliable)
    if (user.id) {
      const { data: empByAuthId } = await supabaseAdmin!
        .from('employees')
        .select('id, branch_id')
        .eq('auth_user_id', user.id)
        .single();

      if (empByAuthId) {
        employee = empByAuthId;
      }
    }

    // Fall back to email lookup if not found by auth_user_id
    if (!employee && user.email) {
      const { data: empByEmail } = await supabaseAdmin!
        .from('employees')
        .select('id, branch_id')
        .eq('email', user.email)
        .single();

      if (empByEmail) {
        employee = empByEmail;

        // Auto-link auth_user_id for future lookups
        if (user.id) {
          await supabaseAdmin!
            .from('employees')
            .update({ auth_user_id: user.id })
            .eq('id', empByEmail.id);
        }
      }
    }

    if (!employee) {
      return NextResponse.json({
        error: 'Employee not found',
        details: 'No employee record found for this user. Please contact admin to link your account.'
      }, { status: 404 });
    }

    const body: CreateExpenseInput = await request.json();

    // Validate required fields
    const errors: string[] = [];
    if (!body.subject?.trim()) errors.push('Subject is required');
    if (!body.amount || body.amount <= 0) errors.push('Valid amount is required');
    if (!body.expenseTypeId) errors.push('Expense type is required');
    if (!body.paymentMethod) errors.push('Payment method is required');
    if (body.paymentMethod && !['cash', 'bank'].includes(body.paymentMethod)) {
      errors.push('Payment method must be "cash" or "bank"');
    }

    if (errors.length > 0) {
      return NextResponse.json({ error: 'Validation failed', details: errors }, { status: 400 });
    }

    // Use provided branch or employee's branch
    const branchId = body.branchId || employee.branch_id;
    if (!branchId) {
      return NextResponse.json({ error: 'Branch is required' }, { status: 400 });
    }

    // Insert expense
    const { data, error } = await supabaseAdmin!
      .from('expenses')
      .insert({
        subject: body.subject.trim(),
        amount: body.amount,
        expense_type_id: body.expenseTypeId,
        payment_method: body.paymentMethod,
        branch_id: branchId,
        recorded_by: employee.id,
        expense_date: body.expenseDate || new Date().toISOString().split('T')[0],
      })
      .select(`
        *,
        expense_type:expense_types(id, name, code, icon),
        recorded_by_employee:employees!recorded_by(id, full_name),
        branch:branches!branch_id(id, name)
      `)
      .single();

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json({ error: 'Failed to create expense', details: error.message }, { status: 500 });
    }

    return NextResponse.json({
      id: data.id,
      expenseNumber: data.expense_number,
      subject: data.subject,
      amount: Number(data.amount),
      expenseType: data.expense_type,
      paymentMethod: data.payment_method,
      recordedByName: data.recorded_by_employee?.full_name,
      branchName: data.branch?.name,
      expenseDate: data.expense_date,
      createdAt: data.created_at,
    }, { status: 201 });
  } catch (error) {
    console.error('Server error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}, { permission: PERMISSIONS.RECEPTION_EXPENSES_CREATE });
