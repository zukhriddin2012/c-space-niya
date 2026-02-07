import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-auth';
import { PERMISSIONS } from '@/lib/permissions';
import { supabaseAdmin, isSupabaseAdminConfigured } from '@/lib/supabase';

// ============================================
// GET /api/reception/expenses/[id]
// Get a single expense
// ============================================
export const GET = withAuth(async (request: NextRequest, { params }) => {
  try {
    if (!isSupabaseAdminConfigured()) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const id = params?.id;
    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin!
      .from('expenses')
      .select(`
        *,
        expense_type:expense_types(id, name, code, icon),
        recorded_by_employee:employees!recorded_by(id, full_name),
        branch:branches!branch_id(id, name),
        voided_by_employee:employees!voided_by(id, full_name)
      `)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
      }
      console.error('Database error:', error);
      return NextResponse.json({ error: 'Database error', details: error.message }, { status: 500 });
    }

    return NextResponse.json({
      id: data.id,
      expenseNumber: data.expense_number,
      subject: data.subject,
      amount: Number(data.amount),
      expenseTypeId: data.expense_type_id,
      expenseType: data.expense_type,
      paymentMethod: data.payment_method,
      branchId: data.branch_id,
      branchName: data.branch?.name,
      recordedBy: data.recorded_by,
      recordedByName: data.recorded_by_employee?.full_name,
      isVoided: data.is_voided,
      voidedAt: data.voided_at,
      voidedBy: data.voided_by,
      voidedByName: data.voided_by_employee?.full_name,
      voidReason: data.void_reason,
      expenseDate: data.expense_date,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    });
  } catch (error) {
    console.error('Server error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}, { permission: PERMISSIONS.RECEPTION_EXPENSES_VIEW, allowKiosk: true });

// ============================================
// DELETE /api/reception/expenses/[id]
// Void an expense (soft delete)
// ============================================
export const DELETE = withAuth(async (request: NextRequest, { employee, params }) => {
  try {
    if (!isSupabaseAdminConfigured()) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const id = params?.id;
    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    // employee is auto-resolved by withAuth (operator PIN → auth_user_id → email)
    if (!employee) {
      return NextResponse.json({
        error: 'Employee not found',
        details: 'No employee record found for this user.'
      }, { status: 404 });
    }

    // Get reason from request body
    let reason = 'No reason provided';
    try {
      const body = await request.json();
      if (body.reason) {
        reason = body.reason;
      }
    } catch {
      // Body is optional
    }

    // Check if already voided
    const { data: existing } = await supabaseAdmin!
      .from('expenses')
      .select('is_voided')
      .eq('id', id)
      .single();

    if (!existing) {
      return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
    }

    if (existing.is_voided) {
      return NextResponse.json({ error: 'Expense is already voided' }, { status: 400 });
    }

    // Void the expense
    const { data, error } = await supabaseAdmin!
      .from('expenses')
      .update({
        is_voided: true,
        voided_at: new Date().toISOString(),
        voided_by: employee.id,
        void_reason: reason,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json({ error: 'Failed to void expense', details: error.message }, { status: 500 });
    }

    return NextResponse.json({
      id: data.id,
      expenseNumber: data.expense_number,
      isVoided: true,
      message: 'Expense voided successfully',
    });
  } catch (error) {
    console.error('Server error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}, { permission: PERMISSIONS.RECEPTION_EXPENSES_VOID, allowKiosk: true });
