import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-auth';
import { PERMISSIONS } from '@/lib/permissions';
import { supabaseAdmin, isSupabaseAdminConfigured } from '@/lib/supabase';
import type { UpdatePaymentMethodInput, PaymentMethodRow } from '@/modules/reception/types';
import { transformPaymentMethod } from '@/modules/reception/types';

// ============================================
// GET /api/reception/admin/payment-methods/[id]
// Get a single payment method
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
      .from('payment_methods')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Payment method not found' }, { status: 404 });
      }
      console.error('Database error:', error);
      return NextResponse.json({ error: 'Database error', details: error.message }, { status: 500 });
    }

    return NextResponse.json(transformPaymentMethod(data as PaymentMethodRow));
  } catch (error) {
    console.error('Server error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}, { permission: PERMISSIONS.RECEPTION_VIEW });

// ============================================
// PUT /api/reception/admin/payment-methods/[id]
// Update a payment method
// ============================================
export const PUT = withAuth(async (request: NextRequest, { params }) => {
  try {
    if (!isSupabaseAdminConfigured()) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const id = params?.id;
    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    const body: UpdatePaymentMethodInput = await request.json();

    // Build update object
    const updateData: Record<string, unknown> = {};

    if (body.name !== undefined) {
      if (!body.name.trim()) {
        return NextResponse.json({ error: 'Name cannot be empty' }, { status: 400 });
      }
      updateData.name = body.name.trim();
    }

    if (body.code !== undefined) {
      if (!body.code.trim()) {
        return NextResponse.json({ error: 'Code cannot be empty' }, { status: 400 });
      }
      const normalizedCode = body.code.toLowerCase().replace(/\s+/g, '_');

      // Check if code already exists for another payment method
      const { data: existing } = await supabaseAdmin!
        .from('payment_methods')
        .select('id')
        .eq('code', normalizedCode)
        .neq('id', id)
        .single();

      if (existing) {
        return NextResponse.json({ error: 'A payment method with this code already exists' }, { status: 409 });
      }
      updateData.code = normalizedCode;
    }

    if (body.icon !== undefined) updateData.icon = body.icon || null;
    if (body.requiresCode !== undefined) updateData.requires_code = body.requiresCode;
    if (body.isActive !== undefined) updateData.is_active = body.isActive;
    if (body.sortOrder !== undefined) updateData.sort_order = body.sortOrder;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin!
      .from('payment_methods')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Payment method not found' }, { status: 404 });
      }
      console.error('Database error:', error);
      return NextResponse.json({ error: 'Failed to update payment method', details: error.message }, { status: 500 });
    }

    return NextResponse.json(transformPaymentMethod(data as PaymentMethodRow));
  } catch (error) {
    console.error('Server error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}, { permission: PERMISSIONS.RECEPTION_ADMIN });

// ============================================
// DELETE /api/reception/admin/payment-methods/[id]
// Deactivate a payment method (soft delete)
// ============================================
export const DELETE = withAuth(async (request: NextRequest, { params }) => {
  try {
    if (!isSupabaseAdminConfigured()) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const id = params?.id;
    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    // Check if payment method is used in any transactions
    const { count: usageCount } = await supabaseAdmin!
      .from('transactions')
      .select('id', { count: 'exact', head: true })
      .eq('payment_method_id', id);

    // Soft delete - just deactivate
    const { data, error } = await supabaseAdmin!
      .from('payment_methods')
      .update({ is_active: false })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Payment method not found' }, { status: 404 });
      }
      console.error('Database error:', error);
      return NextResponse.json({ error: 'Failed to deactivate payment method', details: error.message }, { status: 500 });
    }

    return NextResponse.json({
      ...transformPaymentMethod(data as PaymentMethodRow),
      message: usageCount && usageCount > 0
        ? `Payment method deactivated. It is used in ${usageCount} transaction(s).`
        : 'Payment method deactivated successfully.',
    });
  } catch (error) {
    console.error('Server error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}, { permission: PERMISSIONS.RECEPTION_ADMIN });
