import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-auth';
import { PERMISSIONS } from '@/lib/permissions';
import { supabaseAdmin, isSupabaseAdminConfigured } from '@/lib/supabase';

// GET /api/employees/[id]/payslips - Get all payslips for an employee
export const GET = withAuth(async (
  request: NextRequest,
  { params }
) => {
  try {
    const employeeId = params?.id;
    if (!employeeId) {
      return NextResponse.json({ error: 'Employee ID required' }, { status: 400 });
    }

    if (!isSupabaseAdminConfigured()) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const { data: payslips, error } = await supabaseAdmin!
      .from('payslips')
      .select(`
        *,
        legal_entities(id, name, short_name)
      `)
      .eq('employee_id', employeeId)
      .order('year', { ascending: false })
      .order('month', { ascending: false });

    if (error) {
      console.error('Error fetching payslips:', error);
      return NextResponse.json({ error: 'Failed to fetch payslips' }, { status: 500 });
    }

    return NextResponse.json({ payslips: payslips || [] });
  } catch (error) {
    console.error('Error fetching payslips:', error);
    return NextResponse.json({ error: 'Failed to fetch payslips' }, { status: 500 });
  }
}, { permission: PERMISSIONS.EMPLOYEES_VIEW_SALARY });

// POST /api/employees/[id]/payslips - Add a new payslip
export const POST = withAuth(async (
  request: NextRequest,
  { params }
) => {
  try {
    const employeeId = params?.id;
    if (!employeeId) {
      return NextResponse.json({ error: 'Employee ID required' }, { status: 400 });
    }

    if (!isSupabaseAdminConfigured()) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const body = await request.json();
    const { year, month, advance_bank, advance_naqd, salary_bank, salary_naqd, notes, legal_entity_id } = body;

    if (!year || !month) {
      return NextResponse.json({ error: 'Year and month are required' }, { status: 400 });
    }

    // Calculate totals
    const gross = (advance_bank || 0) + (advance_naqd || 0) + (salary_bank || 0) + (salary_naqd || 0);

    const { data: payslip, error } = await supabaseAdmin!
      .from('payslips')
      .insert({
        employee_id: employeeId,
        year,
        month,
        advance_bank: advance_bank || 0,
        advance_naqd: advance_naqd || 0,
        salary_bank: salary_bank || 0,
        salary_naqd: salary_naqd || 0,
        gross_salary: gross,
        net_salary: gross,
        deductions: 0,
        bonuses: 0,
        status: 'paid',
        notes: notes || null,
        legal_entity_id: legal_entity_id || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding payslip:', error);
      if (error.code === '23505') {
        return NextResponse.json({ error: 'A payslip for this month already exists' }, { status: 400 });
      }
      return NextResponse.json({ error: 'Failed to add payslip' }, { status: 500 });
    }

    return NextResponse.json({ payslip }, { status: 201 });
  } catch (error) {
    console.error('Error adding payslip:', error);
    return NextResponse.json({ error: 'Failed to add payslip' }, { status: 500 });
  }
}, { permission: PERMISSIONS.EMPLOYEES_EDIT_SALARY });

// PUT /api/employees/[id]/payslips - Update a payslip
export const PUT = withAuth(async (
  request: NextRequest,
  { params }
) => {
  try {
    const employeeId = params?.id;
    if (!employeeId) {
      return NextResponse.json({ error: 'Employee ID required' }, { status: 400 });
    }

    if (!isSupabaseAdminConfigured()) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const body = await request.json();
    const { payslip_id, advance_bank, advance_naqd, salary_bank, salary_naqd, notes } = body;

    if (!payslip_id) {
      return NextResponse.json({ error: 'Payslip ID required' }, { status: 400 });
    }

    // Calculate new totals
    const gross = (advance_bank || 0) + (advance_naqd || 0) + (salary_bank || 0) + (salary_naqd || 0);

    // SEC: Scope to employee_id from URL to prevent IDOR
    const { data: payslip, error } = await supabaseAdmin!
      .from('payslips')
      .update({
        advance_bank: advance_bank || 0,
        advance_naqd: advance_naqd || 0,
        salary_bank: salary_bank || 0,
        salary_naqd: salary_naqd || 0,
        gross_salary: gross,
        net_salary: gross,
        notes: notes || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', payslip_id)
      .eq('employee_id', employeeId)
      .select()
      .single();

    if (error) {
      console.error('Error updating payslip:', error);
      return NextResponse.json({ error: 'Failed to update payslip' }, { status: 500 });
    }

    return NextResponse.json({ payslip });
  } catch (error) {
    console.error('Error updating payslip:', error);
    return NextResponse.json({ error: 'Failed to update payslip' }, { status: 500 });
  }
}, { permission: PERMISSIONS.EMPLOYEES_EDIT_SALARY });

// DELETE /api/employees/[id]/payslips - Delete a payslip
export const DELETE = withAuth(async (
  request: NextRequest,
  { params }
) => {
  try {
    const employeeId = params?.id;
    if (!employeeId) {
      return NextResponse.json({ error: 'Employee ID required' }, { status: 400 });
    }

    if (!isSupabaseAdminConfigured()) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const payslipId = searchParams.get('payslip_id');

    if (!payslipId) {
      return NextResponse.json({ error: 'Payslip ID required' }, { status: 400 });
    }

    // SEC: Scope to employee_id from URL to prevent IDOR
    const { error } = await supabaseAdmin!
      .from('payslips')
      .delete()
      .eq('id', payslipId)
      .eq('employee_id', employeeId);

    if (error) {
      console.error('Error deleting payslip:', error);
      return NextResponse.json({ error: 'Failed to delete payslip' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting payslip:', error);
    return NextResponse.json({ error: 'Failed to delete payslip' }, { status: 500 });
  }
}, { permission: PERMISSIONS.EMPLOYEES_EDIT_SALARY });
