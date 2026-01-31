import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-auth';
import { PERMISSIONS } from '@/lib/permissions';
import { supabaseAdmin, isSupabaseAdminConfigured } from '@/lib/supabase';
import type { UpdateExpenseTypeInput, ExpenseTypeRow } from '@/modules/reception/types';
import { transformExpenseType } from '@/modules/reception/types';

// ============================================
// GET /api/reception/admin/expense-types/[id]
// Get a single expense type
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
      .from('expense_types')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Expense type not found' }, { status: 404 });
      }
      console.error('Database error:', error);
      return NextResponse.json({ error: 'Database error', details: error.message }, { status: 500 });
    }

    return NextResponse.json(transformExpenseType(data as ExpenseTypeRow));
  } catch (error) {
    console.error('Server error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}, { permission: PERMISSIONS.RECEPTION_VIEW });

// ============================================
// PUT /api/reception/admin/expense-types/[id]
// Update an expense type
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

    const body: UpdateExpenseTypeInput = await request.json();

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

      // Check if code already exists for another expense type
      const { data: existing } = await supabaseAdmin!
        .from('expense_types')
        .select('id')
        .eq('code', normalizedCode)
        .neq('id', id)
        .single();

      if (existing) {
        return NextResponse.json({ error: 'An expense type with this code already exists' }, { status: 409 });
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
      .from('expense_types')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Expense type not found' }, { status: 404 });
      }
      console.error('Database error:', error);
      return NextResponse.json({ error: 'Failed to update expense type', details: error.message }, { status: 500 });
    }

    return NextResponse.json(transformExpenseType(data as ExpenseTypeRow));
  } catch (error) {
    console.error('Server error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}, { permission: PERMISSIONS.RECEPTION_ADMIN });

// ============================================
// DELETE /api/reception/admin/expense-types/[id]
// Deactivate an expense type (soft delete)
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

    // Check if expense type is used in any expenses
    const { count: usageCount } = await supabaseAdmin!
      .from('expenses')
      .select('id', { count: 'exact', head: true })
      .eq('expense_type_id', id);

    // Soft delete - just deactivate
    const { data, error } = await supabaseAdmin!
      .from('expense_types')
      .update({ is_active: false })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Expense type not found' }, { status: 404 });
      }
      console.error('Database error:', error);
      return NextResponse.json({ error: 'Failed to deactivate expense type', details: error.message }, { status: 500 });
    }

    return NextResponse.json({
      ...transformExpenseType(data as ExpenseTypeRow),
      message: usageCount && usageCount > 0
        ? `Expense type deactivated. It is used in ${usageCount} expense(s).`
        : 'Expense type deactivated successfully.',
    });
  } catch (error) {
    console.error('Server error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}, { permission: PERMISSIONS.RECEPTION_ADMIN });
