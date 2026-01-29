import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-auth';
import { PERMISSIONS } from '@/lib/permissions';
import { supabaseAdmin, isSupabaseAdminConfigured } from '@/lib/supabase';

interface WageSource {
  source_type: 'primary' | 'additional';
  source_id: string;
  source_name: string;
  wage_amount: number;
  wage_type: string;
  is_active: boolean;
}

interface MonthlyPayslip {
  year: number;
  month: number;
  advance_bank: number;
  advance_naqd: number;
  salary_bank: number;
  salary_naqd: number;
  total: number;
  legal_entity_id: string | null;
  legal_entity_name?: string;
}

interface UnifiedWageResponse {
  // Current configured wages
  currentWages: {
    primary: WageSource[];
    additional: WageSource[];
    primaryTotal: number;
    additionalTotal: number;
    grandTotal: number;
  };
  // Historical payslips
  history: {
    months: MonthlyPayslip[];
    stats: {
      current: number;
      highest: number;
      average: number;
      growth: number;
    };
  };
  // Reconciliation - compare current config vs actual payments
  reconciliation: {
    configuredMonthly: number;
    lastPaidMonthly: number;
    difference: number;
    status: 'synced' | 'underpaid' | 'overpaid' | 'no_history';
    warnings: string[];
  };
}

// GET /api/employees/[id]/unified-wages - Get unified wage data from all sources
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

    // Fetch all data in parallel
    const [primaryWagesResult, branchWagesResult, payslipsResult] = await Promise.all([
      // Primary wages from employee_wages
      supabaseAdmin!
        .from('employee_wages')
        .select(`
          id,
          legal_entity_id,
          wage_amount,
          wage_type,
          is_active,
          legal_entities(id, name, short_name)
        `)
        .eq('employee_id', employeeId)
        .eq('is_active', true),

      // Additional wages from employee_branch_wages
      supabaseAdmin!
        .from('employee_branch_wages')
        .select(`
          id,
          branch_id,
          wage_amount,
          wage_type,
          is_active,
          branches(id, name)
        `)
        .eq('employee_id', employeeId)
        .eq('is_active', true),

      // Historical payslips (last 12 months)
      getPayslipsLast12Months(employeeId),
    ]);

    if (primaryWagesResult.error) {
      console.error('Error fetching primary wages:', primaryWagesResult.error);
      return NextResponse.json({ error: 'Failed to fetch primary wages' }, { status: 500 });
    }

    if (branchWagesResult.error) {
      console.error('Error fetching branch wages:', branchWagesResult.error);
      return NextResponse.json({ error: 'Failed to fetch branch wages' }, { status: 500 });
    }

    const primaryWages = primaryWagesResult.data || [];
    const branchWages = branchWagesResult.data || [];
    const payslips = payslipsResult;

    // Process primary wages
    const primarySources: WageSource[] = primaryWages.map((w: any) => ({
      source_type: 'primary' as const,
      source_id: w.legal_entity_id,
      source_name: w.legal_entities?.short_name || w.legal_entities?.name || w.legal_entity_id,
      wage_amount: Number(w.wage_amount) || 0,
      wage_type: w.wage_type || 'official',
      is_active: w.is_active,
    }));

    // Process additional wages
    const additionalSources: WageSource[] = branchWages.map((w: any) => ({
      source_type: 'additional' as const,
      source_id: w.branch_id,
      source_name: w.branches?.name || w.branch_id,
      wage_amount: Number(w.wage_amount) || 0,
      wage_type: w.wage_type || 'additional',
      is_active: w.is_active,
    }));

    const primaryTotal = primarySources.reduce((sum, w) => sum + w.wage_amount, 0);
    const additionalTotal = additionalSources.reduce((sum, w) => sum + w.wage_amount, 0);
    const grandTotal = primaryTotal + additionalTotal;

    // Calculate historical stats
    const totals = payslips.map(p => p.total);
    const current = totals.length > 0 ? totals[totals.length - 1] : 0;
    const highest = totals.length > 0 ? Math.max(...totals) : 0;
    const average = totals.length > 0 ? Math.round(totals.reduce((a, b) => a + b, 0) / totals.length) : 0;

    let growth = 0;
    if (totals.length >= 2 && totals[0] > 0) {
      growth = Math.round(((totals[totals.length - 1] - totals[0]) / totals[0]) * 100);
    }

    // Reconciliation - compare configured wages with actual payments
    const lastPaidMonthly = current;
    const configuredMonthly = grandTotal;
    const difference = configuredMonthly - lastPaidMonthly;
    const warnings: string[] = [];

    let reconciliationStatus: 'synced' | 'underpaid' | 'overpaid' | 'no_history' = 'no_history';

    if (payslips.length > 0) {
      const tolerance = 100000; // 100K UZS tolerance for rounding differences
      if (Math.abs(difference) <= tolerance) {
        reconciliationStatus = 'synced';
      } else if (difference > 0) {
        reconciliationStatus = 'underpaid';
        warnings.push(`Last payment (${formatCurrency(lastPaidMonthly)}) is less than configured wage (${formatCurrency(configuredMonthly)})`);
      } else {
        reconciliationStatus = 'overpaid';
        warnings.push(`Last payment (${formatCurrency(lastPaidMonthly)}) exceeds configured wage (${formatCurrency(configuredMonthly)})`);
      }
    }

    // Check for wage entries without corresponding payslips
    if (primarySources.length > 0 && payslips.length === 0) {
      warnings.push('Employee has configured wages but no payment history');
    }

    // Check for legal entities in payslips that aren't in employee_wages
    const configuredEntities = new Set(primarySources.map(w => w.source_id));
    const payslipEntities = new Set(payslips.map(p => p.legal_entity_id).filter(Boolean));

    payslipEntities.forEach(entityId => {
      if (!configuredEntities.has(entityId as string)) {
        warnings.push(`Payslip from entity "${entityId}" not found in current wage configuration`);
      }
    });

    const response: UnifiedWageResponse = {
      currentWages: {
        primary: primarySources,
        additional: additionalSources,
        primaryTotal,
        additionalTotal,
        grandTotal,
      },
      history: {
        months: payslips,
        stats: {
          current,
          highest,
          average,
          growth,
        },
      },
      reconciliation: {
        configuredMonthly,
        lastPaidMonthly,
        difference,
        status: reconciliationStatus,
        warnings,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching unified wages:', error);
    return NextResponse.json({ error: 'Failed to fetch unified wages' }, { status: 500 });
  }
}, { permission: PERMISSIONS.EMPLOYEES_VIEW_SALARY });

// Helper function to get payslips for last 12 months
async function getPayslipsLast12Months(employeeId: string): Promise<MonthlyPayslip[]> {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  // Calculate start date (12 months ago)
  let startYear = currentYear;
  let startMonth = currentMonth - 11;
  if (startMonth <= 0) {
    startMonth += 12;
    startYear -= 1;
  }

  const { data: payslips, error } = await supabaseAdmin!
    .from('payslips')
    .select(`
      year, month, advance_bank, advance_naqd, salary_bank, salary_naqd, legal_entity_id,
      legal_entities(id, name, short_name)
    `)
    .eq('employee_id', employeeId)
    .or(`year.gt.${startYear},and(year.eq.${startYear},month.gte.${startMonth})`)
    .lte('year', currentYear)
    .order('year', { ascending: true })
    .order('month', { ascending: true });

  if (error) {
    console.error('Error fetching payslips:', error);
    return [];
  }

  // Aggregate by month (in case of multiple legal entities)
  const monthlyTotals = new Map<string, MonthlyPayslip>();

  (payslips || []).forEach((record: any) => {
    const key = `${record.year}-${record.month}`;
    const existing = monthlyTotals.get(key);

    const advance_bank = Number(record.advance_bank) || 0;
    const advance_naqd = Number(record.advance_naqd) || 0;
    const salary_bank = Number(record.salary_bank) || 0;
    const salary_naqd = Number(record.salary_naqd) || 0;
    const total = advance_bank + advance_naqd + salary_bank + salary_naqd;

    if (existing) {
      existing.total += total;
      existing.advance_bank += advance_bank;
      existing.advance_naqd += advance_naqd;
      existing.salary_bank += salary_bank;
      existing.salary_naqd += salary_naqd;
    } else {
      monthlyTotals.set(key, {
        year: record.year,
        month: record.month,
        total,
        advance_bank,
        advance_naqd,
        salary_bank,
        salary_naqd,
        legal_entity_id: record.legal_entity_id,
        legal_entity_name: record.legal_entities?.short_name || record.legal_entities?.name,
      });
    }
  });

  return Array.from(monthlyTotals.values())
    .sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      return a.month - b.month;
    })
    .slice(-12);
}

// Helper to format currency
function formatCurrency(amount: number): string {
  if (amount >= 1000000) {
    return `${(amount / 1000000).toFixed(1)}M UZS`;
  } else if (amount >= 1000) {
    return `${(amount / 1000).toFixed(0)}K UZS`;
  }
  return `${amount} UZS`;
}
