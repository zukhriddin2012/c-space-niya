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
  legal_entity_id?: string;
  branch?: string;
  notes?: string;
}

interface WageSyncResult {
  synced: number;
  created: number;
  updated: number;
  skipped: number;
  errors: string[];
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
          legal_entity_id: record.legal_entity_id || 'cspace-hq',
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

    // Deduplicate records within the import (keep last occurrence for each employee+year+month)
    const deduplicatedMap = new Map<string, typeof payslipRecords[0]>();
    for (const record of payslipRecords) {
      const key = `${record.employee_id}-${record.year}-${record.month}`;
      deduplicatedMap.set(key, record);
    }
    const uniqueRecords = Array.from(deduplicatedMap.values());

    // Use upsert to handle duplicates (update on conflict)
    const { data: upserted, error: upsertError } = await supabase
      .from('payslips')
      .upsert(uniqueRecords, {
        onConflict: 'employee_id,year,month',
        ignoreDuplicates: false, // Update existing records
      })
      .select();

    if (upsertError) {
      console.error('Error upserting payslips:', upsertError);
      return NextResponse.json({ error: 'Failed to import payslips: ' + upsertError.message }, { status: 500 });
    }

    // Now sync employee_wages based on most recent payslip data
    const wageSync = await syncEmployeeWagesFromPayslips(supabase, uniqueRecords);

    return NextResponse.json({
      message: 'Salary history imported successfully',
      imported: upserted?.length || 0,
      duplicatesInFile: payslipRecords.length - uniqueRecords.length,
      wageSync: wageSync,
    });
  } catch (error) {
    console.error('Error importing salary history:', error);
    return NextResponse.json({ error: 'Failed to import salary history' }, { status: 500 });
  }
}, { permission: PERMISSIONS.EMPLOYEES_EDIT_SALARY });

/**
 * Sync employee_wages table based on imported payslip data.
 * For each employee with payslip data, ensure they have a corresponding
 * entry in employee_wages for each legal entity.
 */
async function syncEmployeeWagesFromPayslips(
  db: typeof supabase,
  payslipRecords: Array<{
    employee_id: string;
    legal_entity_id: string;
    year: number;
    month: number;
    advance_bank: number;
    advance_naqd: number;
    salary_bank: number;
    salary_naqd: number;
  }>
): Promise<WageSyncResult> {
  const result: WageSyncResult = {
    synced: 0,
    created: 0,
    updated: 0,
    skipped: 0,
    errors: [],
  };

  if (!db) return result;

  // Group payslips by employee + legal entity, keeping only the most recent
  const latestPayslips = new Map<string, typeof payslipRecords[0]>();

  for (const record of payslipRecords) {
    const key = `${record.employee_id}-${record.legal_entity_id}`;
    const existing = latestPayslips.get(key);

    // Keep the most recent record (by year, then month)
    if (!existing ||
        record.year > existing.year ||
        (record.year === existing.year && record.month > existing.month)) {
      latestPayslips.set(key, record);
    }
  }

  // Process each unique employee+legal_entity combination
  for (const [key, payslip] of latestPayslips) {
    try {
      // Calculate monthly wage from payslip (salary_bank is the primary wage indicator)
      // advance_bank and salary_bank are bank payments, naqd are cash payments
      const totalMonthly = (payslip.advance_bank || 0) + (payslip.advance_naqd || 0) +
                           (payslip.salary_bank || 0) + (payslip.salary_naqd || 0);

      // Check if employee_wages entry exists
      const { data: existingWage, error: fetchError } = await db
        .from('employee_wages')
        .select('id, wage_amount, is_active')
        .eq('employee_id', payslip.employee_id)
        .eq('legal_entity_id', payslip.legal_entity_id)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 = no rows returned
        result.errors.push(`Error checking wage for ${key}: ${fetchError.message}`);
        continue;
      }

      if (existingWage) {
        // Update existing entry if the wage differs significantly (>5% difference)
        const existingAmount = Number(existingWage.wage_amount) || 0;
        const difference = Math.abs(existingAmount - totalMonthly);
        const percentDiff = existingAmount > 0 ? (difference / existingAmount) * 100 : 100;

        if (percentDiff > 5) {
          // Significant difference - update the wage
          const { error: updateError } = await db
            .from('employee_wages')
            .update({
              wage_amount: totalMonthly,
              notes: `Auto-updated from payslip import (${payslip.year}-${String(payslip.month).padStart(2, '0')})`,
              updated_at: new Date().toISOString(),
            })
            .eq('id', existingWage.id);

          if (updateError) {
            result.errors.push(`Error updating wage for ${key}: ${updateError.message}`);
          } else {
            result.updated++;
            result.synced++;
          }
        } else {
          // Wage is already approximately correct
          result.skipped++;
        }
      } else {
        // Create new employee_wages entry
        const { error: insertError } = await db
          .from('employee_wages')
          .insert({
            employee_id: payslip.employee_id,
            legal_entity_id: payslip.legal_entity_id,
            wage_amount: totalMonthly,
            wage_type: 'official',
            is_active: true,
            notes: `Auto-created from payslip import (${payslip.year}-${String(payslip.month).padStart(2, '0')})`,
          });

        if (insertError) {
          // Check if it's a duplicate error (race condition)
          if (insertError.code === '23505') {
            result.skipped++;
          } else {
            result.errors.push(`Error creating wage for ${key}: ${insertError.message}`);
          }
        } else {
          result.created++;
          result.synced++;
        }
      }
    } catch (err) {
      result.errors.push(`Unexpected error for ${key}: ${String(err)}`);
    }
  }

  return result;
}
