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
  is_projected?: boolean; // True if this is projected from configured wages (no payslip yet)
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
  // Current month payment status
  currentMonth: {
    year: number;
    month: number;
    advancePaid: number;
    wagePaid: number;
    totalPaid: number;
    remaining: number;
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

    // Get current month info for advance payments
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    // Fetch all data in parallel
    const [primaryWagesResult, branchWagesResult, payslipsResult, advancePaymentsResult] = await Promise.all([
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
      // Note: employee_branch_wages has no wage_type column — these are always 'additional'
      supabaseAdmin!
        .from('employee_branch_wages')
        .select(`
          id,
          branch_id,
          wage_amount,
          is_active,
          branches(id, name)
        `)
        .eq('employee_id', employeeId)
        .eq('is_active', true),

      // Historical payslips (last 12 months)
      getPayslipsLast12Months(employeeId),

      // Current month advance payments (paid)
      supabaseAdmin!
        .from('payment_request_items')
        .select(`
          amount,
          payment_requests!inner(year, month, status, request_type)
        `)
        .eq('employee_id', employeeId)
        .eq('payment_requests.year', currentYear)
        .eq('payment_requests.month', currentMonth)
        .eq('payment_requests.status', 'paid'),
    ]);

    if (primaryWagesResult.error) {
      console.error('Error fetching primary wages:', primaryWagesResult.error);
      return NextResponse.json({ error: 'Failed to fetch primary wages' }, { status: 500 });
    }

    if (branchWagesResult.error) {
      console.error('Error fetching branch wages:', branchWagesResult.error);
      return NextResponse.json({ error: 'Failed to fetch branch wages' }, { status: 500 });
    }

    // Log advance payments errors but don't fail the request
    if (advancePaymentsResult.error) {
      console.error('Error fetching advance payments (non-fatal):', advancePaymentsResult.error);
    }

    const primaryWages = primaryWagesResult.data || [];
    const branchWages = branchWagesResult.data || [];
    let payslips = payslipsResult;
    const advancePayments = advancePaymentsResult.data || [];

    // Calculate current month advance payments
    let currentMonthAdvancePaid = 0;
    let currentMonthWagePaid = 0;
    advancePayments.forEach((item: any) => {
      const amount = Number(item.amount) || 0;
      if (item.payment_requests?.request_type === 'advance') {
        currentMonthAdvancePaid += amount;
      } else if (item.payment_requests?.request_type === 'wage') {
        currentMonthWagePaid += amount;
      }
    });

    // Process primary wages
    const primarySources: WageSource[] = primaryWages.map((w: any) => ({
      source_type: 'primary' as const,
      source_id: w.legal_entity_id,
      source_name: w.legal_entities?.short_name || w.legal_entities?.name || w.legal_entity_id,
      wage_amount: Number(w.wage_amount) || 0,
      wage_type: w.wage_type || 'official',
      is_active: w.is_active,
    }));

    // Process additional wages (branch wages are always type 'additional')
    const additionalSources: WageSource[] = branchWages.map((w: any) => ({
      source_type: 'additional' as const,
      source_id: w.branch_id,
      source_name: w.branches?.name || w.branch_id,
      wage_amount: Number(w.wage_amount) || 0,
      wage_type: 'additional',
      is_active: w.is_active,
    }));

    const primaryTotal = primarySources.reduce((sum, w) => sum + w.wage_amount, 0);
    const additionalTotal = additionalSources.reduce((sum, w) => sum + w.wage_amount, 0);
    const grandTotal = primaryTotal + additionalTotal;

    // Historical payslips only contain Primary/Bank wages
    // Additional/Cash wages are paid separately and not tracked in payslips
    // For accurate total compensation view, we add current additional wages to each month
    // This assumes additional wages were consistent (which may not be 100% accurate for past months)
    const payslipsWithAdditional = payslips.map(p => ({
      ...p,
      // Add additional wages to get total compensation
      total: p.total + additionalTotal,
      // Store original primary-only total for reference
      primary_total: p.total,
      additional_total: additionalTotal,
    }));

    // Check if current month has payslip data, if not add projected entry from configured wages
    const hasCurrentMonth = payslipsWithAdditional.some(p => p.year === currentYear && p.month === currentMonth);
    let finalPayslips = payslipsWithAdditional;

    if (!hasCurrentMonth && grandTotal > 0) {
      // Add current month as projected based on configured wages
      finalPayslips = [...payslipsWithAdditional, {
        year: currentYear,
        month: currentMonth,
        total: grandTotal,
        primary_total: primaryTotal,
        additional_total: additionalTotal,
        advance_bank: 0,
        advance_naqd: 0,
        salary_bank: primaryTotal,
        salary_naqd: additionalTotal,
        legal_entity_id: primarySources[0]?.source_id || null,
        legal_entity_name: primarySources[0]?.source_name,
        is_projected: true,
      }];
    }

    // Calculate historical stats using finalPayslips (which includes additional wages)
    const totals = finalPayslips.map(p => p.total);
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

    if (finalPayslips.length > 0) {
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
    if (primarySources.length > 0 && finalPayslips.length === 0) {
      warnings.push('Employee has configured wages but no payment history');
    }

    // Check for legal entities in payslips that aren't in employee_wages
    const configuredEntities = new Set(primarySources.map(w => w.source_id));
    const payslipEntities = new Set(finalPayslips.map(p => p.legal_entity_id).filter(Boolean));

    payslipEntities.forEach(entityId => {
      if (!configuredEntities.has(entityId as string)) {
        warnings.push(`Payslip from entity "${entityId}" not found in current wage configuration`);
      }
    });

    // Note if additional wages were added to historical data
    if (additionalTotal > 0 && payslips.length > 0) {
      warnings.push(`Historical data includes current additional wages (${formatCurrency(additionalTotal)}/month)`);
    }

    const response: UnifiedWageResponse = {
      currentWages: {
        primary: primarySources,
        additional: additionalSources,
        primaryTotal,
        additionalTotal,
        grandTotal,
      },
      history: {
        months: finalPayslips,
        stats: {
          current,
          highest,
          average,
          growth,
        },
      },
      currentMonth: {
        year: currentYear,
        month: currentMonth,
        advancePaid: currentMonthAdvancePaid,
        wagePaid: currentMonthWagePaid,
        totalPaid: currentMonthAdvancePaid + currentMonthWagePaid,
        remaining: Math.max(0, grandTotal - currentMonthAdvancePaid - currentMonthWagePaid),
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

  // Build a simpler query - fetch all from startYear onwards, then filter in code
  const { data: payslips, error } = await supabaseAdmin!
    .from('payslips')
    .select(`
      year, month, advance_bank, advance_naqd, salary_bank, salary_naqd, legal_entity_id,
      legal_entities(id, name, short_name)
    `)
    .eq('employee_id', employeeId)
    .gte('year', startYear)
    .order('year', { ascending: true })
    .order('month', { ascending: true });

  if (error) {
    console.error('Error fetching payslips:', error);
    return [];
  }

  // Filter records to be within the 12-month window
  const filteredPayslips = (payslips || []).filter((record: any) => {
    // Check if record is within the 12-month window
    if (record.year > currentYear) return false;
    if (record.year === currentYear && record.month > currentMonth) return false;
    if (record.year < startYear) return false;
    if (record.year === startYear && record.month < startMonth) return false;
    return true;
  });

  // Aggregate by month (in case of multiple legal entities)
  const monthlyTotals = new Map<string, MonthlyPayslip>();

  filteredPayslips.forEach((record: any) => {
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
// Deploy trigger: Thu Jan 29 02:26:11 UTC 2026
