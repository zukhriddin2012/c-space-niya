import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-auth';
import { PERMISSIONS } from '@/lib/permissions';
import { supabase } from '@/lib/supabase';

interface SalaryRecord {
  employee_name: string;
  employee_id?: string;
  year: number;
  month: number;
  advance_bank: number;
  advance_naqd: number;
  salary_bank: number;
  salary_naqd: number;
  total: number;
  branch?: string;
  notes?: string;
}

// POST /api/admin/import-salary-history - Import historical salary data
export const POST = withAuth(async (request: NextRequest) => {
  try {
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const body = await request.json();
    const { records } = body as { records: SalaryRecord[] };

    if (!records || !Array.isArray(records) || records.length === 0) {
      return NextResponse.json({ error: 'No records provided' }, { status: 400 });
    }

    // Get employee IDs from employee_id codes
    const employeeCodes = records
      .map(r => r.employee_id)
      .filter((id): id is string => !!id);

    const { data: employees, error: empError } = await supabase
      .from('employees')
      .select('id, employee_id, full_name')
      .in('employee_id', employeeCodes);

    if (empError) {
      console.error('Error fetching employees:', empError);
      return NextResponse.json({ error: 'Failed to fetch employees' }, { status: 500 });
    }

    const employeeMap = new Map(employees?.map(e => [e.employee_id, e.id]) || []);

    // Prepare payslip records
    const payslipRecords = records
      .filter(r => r.employee_id && employeeMap.has(r.employee_id))
      .map(record => {
        const employeeUuid = employeeMap.get(record.employee_id!);
        return {
          employee_id: employeeUuid,
          year: record.year,
          month: record.month,
          gross_salary: record.total,
          net_salary: record.total, // Assuming no deductions for historical data
          deductions: 0,
          bonuses: 0,
          advance_bank: record.advance_bank || 0,
          advance_naqd: record.advance_naqd || 0,
          salary_bank: record.salary_bank || 0,
          salary_naqd: record.salary_naqd || 0,
          working_days: 0, // Not tracked in historical data
          worked_days: 0,
          status: 'paid',
          notes: record.notes || `Historical import: ${record.branch || ''}`,
        };
      });

    if (payslipRecords.length === 0) {
      return NextResponse.json({ error: 'No valid records to import' }, { status: 400 });
    }

    // Get existing payslips
    const { data: existingPayslips } = await supabase
      .from('payslips')
      .select('employee_id, year, month')
      .in('employee_id', payslipRecords.map(r => r.employee_id))
      .in('year', [...new Set(payslipRecords.map(r => r.year))])
      .in('month', [...new Set(payslipRecords.map(r => r.month))]);

    const existingSet = new Set(
      (existingPayslips || []).map(p => `${p.employee_id}-${p.year}-${p.month}`)
    );

    // Filter out duplicates
    const newRecords = payslipRecords.filter(
      r => !existingSet.has(`${r.employee_id}-${r.year}-${r.month}`)
    );

    if (newRecords.length === 0) {
      return NextResponse.json({
        message: 'All records already exist',
        imported: 0,
        skipped: payslipRecords.length,
      });
    }

    // Insert new records
    const { data: inserted, error: insertError } = await supabase
      .from('payslips')
      .insert(newRecords)
      .select();

    if (insertError) {
      console.error('Error inserting payslips:', insertError);
      return NextResponse.json({ error: 'Failed to insert payslips: ' + insertError.message }, { status: 500 });
    }

    return NextResponse.json({
      message: 'Salary history imported successfully',
      imported: inserted?.length || 0,
      skipped: payslipRecords.length - (inserted?.length || 0),
    });
  } catch (error) {
    console.error('Error importing salary history:', error);
    return NextResponse.json({ error: 'Failed to import salary history' }, { status: 500 });
  }
}, { permission: PERMISSIONS.EMPLOYEES_EDIT_SALARY });
