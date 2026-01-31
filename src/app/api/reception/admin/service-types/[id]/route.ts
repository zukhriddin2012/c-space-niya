import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-auth';
import { PERMISSIONS } from '@/lib/permissions';
import { supabaseAdmin, isSupabaseAdminConfigured } from '@/lib/supabase';
import type { UpdateServiceTypeInput, ServiceTypeRow } from '@/modules/reception/types';
import { transformServiceType } from '@/modules/reception/types';

// ============================================
// GET /api/reception/admin/service-types/[id]
// Get a single service type
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
      .from('service_types')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Service type not found' }, { status: 404 });
      }
      console.error('Database error:', error);
      return NextResponse.json({ error: 'Database error', details: error.message }, { status: 500 });
    }

    return NextResponse.json(transformServiceType(data as ServiceTypeRow));
  } catch (error) {
    console.error('Server error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}, { permission: PERMISSIONS.RECEPTION_VIEW });

// ============================================
// PUT /api/reception/admin/service-types/[id]
// Update a service type
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

    const body: UpdateServiceTypeInput = await request.json();

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

      // Check if code already exists for another service type
      const { data: existing } = await supabaseAdmin!
        .from('service_types')
        .select('id')
        .eq('code', normalizedCode)
        .neq('id', id)
        .single();

      if (existing) {
        return NextResponse.json({ error: 'A service type with this code already exists' }, { status: 409 });
      }
      updateData.code = normalizedCode;
    }

    if (body.icon !== undefined) updateData.icon = body.icon || null;
    if (body.description !== undefined) updateData.description = body.description || null;
    if (body.isActive !== undefined) updateData.is_active = body.isActive;
    if (body.sortOrder !== undefined) updateData.sort_order = body.sortOrder;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin!
      .from('service_types')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Service type not found' }, { status: 404 });
      }
      console.error('Database error:', error);
      return NextResponse.json({ error: 'Failed to update service type', details: error.message }, { status: 500 });
    }

    return NextResponse.json(transformServiceType(data as ServiceTypeRow));
  } catch (error) {
    console.error('Server error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}, { permission: PERMISSIONS.RECEPTION_ADMIN });

// ============================================
// DELETE /api/reception/admin/service-types/[id]
// Deactivate a service type (soft delete)
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

    // Check if service type is used in any transactions
    const { count: usageCount } = await supabaseAdmin!
      .from('transactions')
      .select('id', { count: 'exact', head: true })
      .eq('service_type_id', id);

    // Soft delete - just deactivate
    const { data, error } = await supabaseAdmin!
      .from('service_types')
      .update({ is_active: false })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Service type not found' }, { status: 404 });
      }
      console.error('Database error:', error);
      return NextResponse.json({ error: 'Failed to deactivate service type', details: error.message }, { status: 500 });
    }

    return NextResponse.json({
      ...transformServiceType(data as ServiceTypeRow),
      message: usageCount && usageCount > 0
        ? `Service type deactivated. It is used in ${usageCount} transaction(s).`
        : 'Service type deactivated successfully.',
    });
  } catch (error) {
    console.error('Server error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}, { permission: PERMISSIONS.RECEPTION_ADMIN });
