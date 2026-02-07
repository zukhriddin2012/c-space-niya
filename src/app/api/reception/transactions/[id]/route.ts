import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-auth';
import { PERMISSIONS } from '@/lib/permissions';
import { supabaseAdmin, isSupabaseAdminConfigured } from '@/lib/supabase';

// ============================================
// GET /api/reception/transactions/[id]
// Get a single transaction
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
      .from('transactions')
      .select(`
        *,
        service_type:service_types(id, name, code, icon),
        payment_method:payment_methods(id, name, code, icon, requires_code),
        agent:employees!agent_id(id, full_name),
        branch:branches!branch_id(id, name),
        voided_by_employee:employees!voided_by(id, full_name)
      `)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
      }
      console.error('Database error:', error);
      return NextResponse.json({ error: 'Database error', details: error.message }, { status: 500 });
    }

    return NextResponse.json({
      id: data.id,
      transactionNumber: data.transaction_number,
      customerName: data.customer_name,
      customerPhone: data.customer_phone,
      customerCompany: data.customer_company,
      serviceTypeId: data.service_type_id,
      serviceType: data.service_type,
      amount: Number(data.amount),
      paymentMethodId: data.payment_method_id,
      paymentMethod: data.payment_method,
      transactionCode: data.transaction_code,
      branchId: data.branch_id,
      branchName: data.branch?.name,
      agentId: data.agent_id,
      agentName: data.agent?.full_name,
      notes: data.notes,
      isVoided: data.is_voided,
      voidedAt: data.voided_at,
      voidedBy: data.voided_by,
      voidedByName: data.voided_by_employee?.full_name,
      voidReason: data.void_reason,
      transactionDate: data.transaction_date,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    });
  } catch (error) {
    console.error('Server error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}, { permission: PERMISSIONS.RECEPTION_TRANSACTIONS_VIEW, allowKiosk: true });

// ============================================
// DELETE /api/reception/transactions/[id]
// Void a transaction (soft delete)
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
      .from('transactions')
      .select('is_voided')
      .eq('id', id)
      .single();

    if (!existing) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }

    if (existing.is_voided) {
      return NextResponse.json({ error: 'Transaction is already voided' }, { status: 400 });
    }

    // Void the transaction
    const { data, error } = await supabaseAdmin!
      .from('transactions')
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
      return NextResponse.json({ error: 'Failed to void transaction', details: error.message }, { status: 500 });
    }

    return NextResponse.json({
      id: data.id,
      transactionNumber: data.transaction_number,
      isVoided: true,
      message: 'Transaction voided successfully',
    });
  } catch (error) {
    console.error('Server error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}, { permission: PERMISSIONS.RECEPTION_TRANSACTIONS_VOID, allowKiosk: true });
