import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-auth';
import { PERMISSIONS } from '@/lib/permissions';
import { supabaseAdmin, isSupabaseAdminConfigured } from '@/lib/supabase';
import type { CreatePaymentMethodInput, PaymentMethodRow } from '@/modules/reception/types';
import { transformPaymentMethod } from '@/modules/reception/types';

// ============================================
// GET /api/reception/admin/payment-methods
// List all payment methods
// ============================================
export const GET = withAuth(async (request: NextRequest) => {
  try {
    if (!isSupabaseAdminConfigured()) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const searchParams = request.nextUrl.searchParams;
    const activeOnly = searchParams.get('activeOnly') === 'true';

    let query = supabaseAdmin!
      .from('payment_methods')
      .select('*')
      .order('sort_order', { ascending: true });

    if (activeOnly) {
      query = query.eq('is_active', true);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json({ error: 'Database error', details: error.message }, { status: 500 });
    }

    const paymentMethods = (data as PaymentMethodRow[]).map(transformPaymentMethod);

    return NextResponse.json(paymentMethods);
  } catch (error) {
    console.error('Server error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}, { permission: PERMISSIONS.RECEPTION_VIEW });

// ============================================
// POST /api/reception/admin/payment-methods
// Create a new payment method
// ============================================
export const POST = withAuth(async (request: NextRequest) => {
  try {
    if (!isSupabaseAdminConfigured()) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const body: CreatePaymentMethodInput = await request.json();

    // Validate required fields
    const errors: string[] = [];
    if (!body.name?.trim()) errors.push('Name is required');
    if (!body.code?.trim()) errors.push('Code is required');

    if (errors.length > 0) {
      return NextResponse.json({ error: 'Validation failed', details: errors }, { status: 400 });
    }

    // Normalize code to lowercase and replace spaces with underscores
    const normalizedCode = body.code.toLowerCase().replace(/\s+/g, '_');

    // Check if code already exists
    const { data: existing } = await supabaseAdmin!
      .from('payment_methods')
      .select('id')
      .eq('code', normalizedCode)
      .single();

    if (existing) {
      return NextResponse.json({ error: 'A payment method with this code already exists' }, { status: 409 });
    }

    // Get max sort_order if not provided
    let sortOrder = body.sortOrder;
    if (sortOrder === undefined) {
      const { data: maxOrder } = await supabaseAdmin!
        .from('payment_methods')
        .select('sort_order')
        .order('sort_order', { ascending: false })
        .limit(1)
        .single();

      sortOrder = (maxOrder?.sort_order ?? 0) + 1;
    }

    const { data, error } = await supabaseAdmin!
      .from('payment_methods')
      .insert({
        name: body.name.trim(),
        code: normalizedCode,
        icon: body.icon || null,
        requires_code: body.requiresCode ?? false,
        sort_order: sortOrder,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json({ error: 'Failed to create payment method', details: error.message }, { status: 500 });
    }

    return NextResponse.json(transformPaymentMethod(data as PaymentMethodRow), { status: 201 });
  } catch (error) {
    console.error('Server error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}, { permission: PERMISSIONS.RECEPTION_ADMIN });
