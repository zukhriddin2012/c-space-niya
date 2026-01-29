import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-auth';
import { PERMISSIONS } from '@/lib/permissions';
import { supabaseAdmin, isSupabaseAdminConfigured } from '@/lib/supabase';

interface SalaryHistoryRecord {
  year: number;
  month: number;
  total: number;
  advance_bank: number;
  advance_naqd: number;
  salary_bank: number;
  salary_naqd: number;
  legal_entity_id: string | null;
}

// GET /api/employees/[id]/salary-history - Get salary history for last 12 months
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

    // Get current date for calculating last 12 months
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    // Calculate the start date (12 months ago)
    let startYear = currentYear;
    let startMonth = currentMonth - 11;
    if (startMonth <= 0) {
      startMonth += 12;
      startYear -= 1;
    }

    // Fetch payslips for this employee in the last 12 months
    const { data: payslips, error } = await supabaseAdmin!
      .from('payslips')
      .select('year, month, advance_bank, advance_naqd, salary_bank, salary_naqd, legal_entity_id')
      .eq('employee_id', employeeId)
      .or(`year.gt.${startYear},and(year.eq.${startYear},month.gte.${startMonth})`)
      .lte('year', currentYear)
      .order('year', { ascending: true })
      .order('month', { ascending: true });

    if (error) {
      console.error('Error fetching salary history:', error);
      return NextResponse.json({ error: 'Failed to fetch salary history' }, { status: 500 });
    }

    // Process and aggregate data by month (in case multiple legal entities)
    const monthlyTotals = new Map<string, SalaryHistoryRecord>();

    (payslips || []).forEach((record) => {
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
        });
      }
    });

    // Convert to array and sort by date
    const history = Array.from(monthlyTotals.values())
      .sort((a, b) => {
        if (a.year !== b.year) return a.year - b.year;
        return a.month - b.month;
      })
      .slice(-12); // Keep only last 12 months

    // Calculate stats
    const totals = history.map(h => h.total);
    const current = totals.length > 0 ? totals[totals.length - 1] : 0;
    const highest = totals.length > 0 ? Math.max(...totals) : 0;
    const average = totals.length > 0 ? Math.round(totals.reduce((a, b) => a + b, 0) / totals.length) : 0;

    // Calculate growth (first vs last)
    let growth = 0;
    if (totals.length >= 2 && totals[0] > 0) {
      growth = Math.round(((totals[totals.length - 1] - totals[0]) / totals[0]) * 100);
    }

    return NextResponse.json({
      history,
      stats: {
        current,
        highest,
        average,
        growth,
      }
    });
  } catch (error) {
    console.error('Error fetching salary history:', error);
    return NextResponse.json({ error: 'Failed to fetch salary history' }, { status: 500 });
  }
}, { permission: PERMISSIONS.EMPLOYEES_VIEW_SALARY });
