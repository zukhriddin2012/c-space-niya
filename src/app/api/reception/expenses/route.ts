import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-auth';
import { PERMISSIONS } from '@/lib/permissions';
import { supabaseAdmin, isSupabaseAdminConfigured } from '@/lib/supabase';
import { validateBranchAccess, parsePagination, MAX_LENGTH } from '@/lib/security';
import { audit, getRequestMeta } from '@/lib/audit';
import { getCashAllocationBalance } from '@/lib/db/cash-management';
import type { CreateExpenseInput } from '@/modules/reception/types';

// ============================================
// GET /api/reception/expenses
// List expenses with filters
// ============================================
export const GET = withAuth(async (request: NextRequest, { user }) => {
  try {
    if (!isSupabaseAdminConfigured()) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const searchParams = request.nextUrl.searchParams;

    // H-02: Validate branch access (IDOR prevention) — PR2-066 security alignment
    const branchAccess = validateBranchAccess(user, searchParams.get('branchId'));
    if (branchAccess.error) {
      return NextResponse.json({ error: branchAccess.error }, { status: branchAccess.status });
    }

    // M-02: Safe pagination
    const { page, pageSize } = parsePagination(
      searchParams.get('page'), searchParams.get('pageSize')
    );
    const branchId = branchAccess.branchId;
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
      return NextResponse.json({ error: 'Failed to fetch expenses' }, { status: 500 });
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
    }, { status: 200 });
  } catch (error) {
    console.error('Server error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}, { permission: PERMISSIONS.RECEPTION_EXPENSES_VIEW, allowKiosk: true });

// ============================================
// POST /api/reception/expenses
// Create a new expense
// ============================================
export const POST = withAuth(async (request: NextRequest, { user, employee }) => {
  try {
    if (!isSupabaseAdminConfigured()) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    // employee is auto-resolved by withAuth (operator PIN → auth_user_id → email)
    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    const body: CreateExpenseInput = await request.json();

    // H-02: Validate branch access (IDOR prevention) — PR2-066 security alignment
    const branchAccess = validateBranchAccess(user, body.branchId || employee.branchId);
    if (branchAccess.error) {
      return NextResponse.json({ error: branchAccess.error }, { status: branchAccess.status });
    }
    const branchId = branchAccess.branchId || employee.branchId;
    if (!branchId) {
      return NextResponse.json({ error: 'Branch is required' }, { status: 400 });
    }

    // Validate required fields
    const errors: string[] = [];
    if (!body.subject?.trim()) errors.push('Subject is required');
    if (!body.amount || body.amount <= 0) errors.push('Valid amount is required');
    if (!body.expenseTypeId) errors.push('Expense type is required');
    if (!body.paymentMethod) errors.push('Payment method is required');
    if (body.paymentMethod && !['cash', 'bank'].includes(body.paymentMethod)) {
      errors.push('Payment method must be "cash" or "bank"');
    }
    // H-04: Length validation
    if (body.subject && body.subject.length > MAX_LENGTH.DESCRIPTION) {
      errors.push(`Subject exceeds ${MAX_LENGTH.DESCRIPTION} characters`);
    }

    if (errors.length > 0) {
      return NextResponse.json({ error: 'Validation failed', details: errors }, { status: 400 });
    }

    // PR2-066: OpEx balance check for cash expenses (informational, non-blocking)
    let opexWarning: string | undefined;
    if (body.paymentMethod === 'cash') {
      try {
        const balance = await getCashAllocationBalance(branchId);
        if (body.amount > balance.allocation.opex.available) {
          opexWarning = 'This expense exceeds the available OpEx balance. Consider using a dividend spend request for the excess.';
        }
      } catch {
        // Non-blocking: if balance check fails, just skip the warning
      }
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
      return NextResponse.json({ error: 'Failed to create expense' }, { status: 500 });
    }

    // SEC-024: Audit trail for expense creation
    await audit({
      user_id: user.id,
      action: 'expense.created',
      resource_type: 'expenses',
      resource_id: data.id,
      details: { branchId, amount: body.amount, paymentMethod: body.paymentMethod, subject: body.subject },
      severity: 'medium',
      ...getRequestMeta(request),
    });

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
      ...(opexWarning ? { opexWarning } : {}),
    }, { status: 201 });
  } catch (error) {
    console.error('Server error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}, { permission: PERMISSIONS.RECEPTION_EXPENSES_CREATE, allowKiosk: true });
