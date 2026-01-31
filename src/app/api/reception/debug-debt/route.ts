import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, isSupabaseAdminConfigured } from '@/lib/supabase';

// DEBUG ENDPOINT - Get raw debt data
export async function GET(request: NextRequest) {
  if (!isSupabaseAdminConfigured()) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  try {
    // Get total debt using raw SQL
    const { data: debtStats, error: statsError } = await supabaseAdmin!
      .rpc('get_debt_stats');

    // If RPC doesn't exist, try direct query
    let directQuery = null;
    const { data: rawDebt, error: rawError } = await supabaseAdmin!
      .from('transactions')
      .select('id, transaction_number, amount, debt')
      .gt('debt', 0)
      .eq('is_voided', false)
      .limit(20);

    // Get count and sum
    const { data: summary, error: summaryError } = await supabaseAdmin!
      .from('transactions')
      .select('debt')
      .gt('debt', 0)
      .eq('is_voided', false);

    const totalDebt = (summary || []).reduce((sum, t) => {
      const raw = t as Record<string, unknown>;
      return sum + Number(raw.debt || 0);
    }, 0);

    // Also check what columns exist
    const { data: sampleRow } = await supabaseAdmin!
      .from('transactions')
      .select('*')
      .limit(1)
      .single();

    const columns = sampleRow ? Object.keys(sampleRow) : [];

    // Check TXN-DEBT records specifically - what dates do they have?
    const { data: debtOnlyRecords } = await supabaseAdmin!
      .from('transactions')
      .select('transaction_number, transaction_date, debt')
      .like('transaction_number', 'TXN-DEBT%')
      .limit(10);

    // Check date range of all debt records
    const { data: dateRange } = await supabaseAdmin!
      .from('transactions')
      .select('transaction_date')
      .gt('debt', 0)
      .order('transaction_date', { ascending: true })
      .limit(1);

    const { data: dateRangeMax } = await supabaseAdmin!
      .from('transactions')
      .select('transaction_date')
      .gt('debt', 0)
      .order('transaction_date', { ascending: false })
      .limit(1);

    // Test with same date filter as dashboard "All Time" (2020-01-01 to today)
    const todayStr = new Date().toISOString().split('T')[0];
    const { data: withDateFilter, error: dateFilterError } = await supabaseAdmin!
      .from('transactions')
      .select('id, transaction_number, debt')
      .gt('debt', 0)
      .eq('is_voided', false)
      .gte('transaction_date', '2020-01-01')
      .lte('transaction_date', todayStr);

    const dateFilterTotal = (withDateFilter || []).reduce((sum, t) => {
      const raw = t as Record<string, unknown>;
      return sum + Number(raw.debt || 0);
    }, 0);

    return NextResponse.json({
      hasDebtColumn: columns.includes('debt'),
      columns,
      recordsWithDebt: summary?.length || 0,
      calculatedTotalDebt: totalDebt,
      withDateFilter: {
        count: withDateFilter?.length || 0,
        totalDebt: dateFilterTotal,
        dateRange: '2020-01-01 to ' + todayStr,
        error: dateFilterError?.message
      },
      sampleRecords: rawDebt,
      debtOnlyRecords,
      debtDateRange: {
        earliest: dateRange?.[0]?.transaction_date,
        latest: dateRangeMax?.[0]?.transaction_date
      },
      errors: {
        stats: statsError?.message,
        raw: rawError?.message,
        summary: summaryError?.message
      }
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
