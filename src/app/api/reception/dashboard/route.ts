import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-auth';
import { PERMISSIONS } from '@/lib/permissions';
import { supabaseAdmin, isSupabaseAdminConfigured } from '@/lib/supabase';

// ============================================
// GET /api/reception/dashboard
// Get dashboard statistics (Income Statement format)
// Updated: 2026-01-31 - Added debt column support
// ============================================
export const GET = withAuth(async (request: NextRequest) => {
  try {
    if (!isSupabaseAdminConfigured()) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const searchParams = request.nextUrl.searchParams;
    const branchId = searchParams.get('branchId');

    // Default to current month (1st of month to today)
    const today = new Date();
    const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const dateFrom = searchParams.get('dateFrom') || firstOfMonth.toISOString().split('T')[0];
    const dateTo = searchParams.get('dateTo') || today.toISOString().split('T')[0];

    console.log('DEBUG: Date params received - dateFrom:', dateFrom, 'dateTo:', dateTo, 'branchId:', branchId);

    // Get transactions summary (Income/Paid) - includes debt column
    // Use select('*') to ensure all columns including newly added 'debt' are returned
    // IMPORTANT: Supabase defaults to 1000 row limit, we need all rows for accurate totals
    let transactionsQuery = supabaseAdmin!
      .from('transactions')
      .select('*', { count: 'exact' })
      .eq('is_voided', false)
      .gte('transaction_date', dateFrom)
      .lte('transaction_date', dateTo)
      .limit(10000);

    if (branchId && branchId !== 'all') {
      transactionsQuery = transactionsQuery.eq('branch_id', branchId);
    }

    const { data: transactions, count: transactionCount } = await transactionsQuery;

    // Type assertion to handle debt column (added after types were generated)
    type TransactionWithDebt = { amount: number; debt?: number; service_type_id: string; payment_method_id: string; transaction_number?: string };

    // DEBUG: Log sample transactions to see if debt column is being returned
    const sampleWithDebt = (transactions || [])
      .filter(t => {
        const raw = t as Record<string, unknown>;
        return raw.debt && Number(raw.debt) > 0;
      })
      .slice(0, 5)
      .map(t => {
        const raw = t as Record<string, unknown>;
        return {
          transaction_number: raw.transaction_number,
          amount: raw.amount,
          debt: raw.debt,
          keys: Object.keys(raw)
        };
      });
    console.log('DEBUG: Total transactions:', transactions?.length);
    console.log('DEBUG: Sample transactions with debt > 0:', JSON.stringify(sampleWithDebt, null, 2));

    // Calculate totals - Paid is the amount, Debt is unpaid portion
    const totalPaid = (transactions || []).reduce((sum, t) => {
      const txn = t as unknown as TransactionWithDebt;
      return sum + Number(txn.amount || 0);
    }, 0);
    const totalDebt = (transactions || []).reduce((sum, t) => {
      const raw = t as Record<string, unknown>;
      return sum + Number(raw.debt || 0);
    }, 0);

    console.log('DEBUG: Calculated totalDebt:', totalDebt);

    // Get expenses summary with expense type info for categorization
    let expensesQuery = supabaseAdmin!
      .from('expenses')
      .select(`
        amount,
        expense_type_id,
        payment_method,
        expense_type:expense_types(id, name, code, icon)
      `, { count: 'exact' })
      .eq('is_voided', false)
      .gte('expense_date', dateFrom)
      .lte('expense_date', dateTo);

    if (branchId && branchId !== 'all') {
      expensesQuery = expensesQuery.eq('branch_id', branchId);
    }

    const { data: expenses, count: expenseCount } = await expensesQuery;

    // Define CapEx codes (capital expenditures - equipment, renovation, etc.)
    const capexCodes = ['equipment', 'renovation', 'furniture', 'capex', 'investment'];

    // Calculate OpEx and CapEx
    type JoinedExpenseType = { id: string; name: string; code: string; icon: string } | null;

    let totalOpEx = 0;
    let totalCapEx = 0;

    (expenses || []).forEach(e => {
      const amount = Number(e.amount);
      const expType = e.expense_type as unknown as JoinedExpenseType;
      const code = expType?.code?.toLowerCase() || '';
      if (capexCodes.some(c => code.includes(c))) {
        totalCapEx += amount;
      } else {
        totalOpEx += amount;
      }
    });

    // Get breakdown by expense type (Top 5)
    const expenseTypeBreakdown: Record<string, {
      name: string;
      code: string;
      icon: string;
      count: number;
      amount: number
    }> = {};

    (expenses || []).forEach(e => {
      const expType = e.expense_type as unknown as JoinedExpenseType;
      if (!expType) return;

      const key = expType.id;
      if (!expenseTypeBreakdown[key]) {
        expenseTypeBreakdown[key] = {
          name: expType.name,
          code: expType.code,
          icon: expType.icon || '📦',
          count: 0,
          amount: 0
        };
      }
      expenseTypeBreakdown[key].count++;
      expenseTypeBreakdown[key].amount += Number(e.amount);
    });

    const topExpenseCategories = Object.entries(expenseTypeBreakdown)
      .map(([id, data]) => ({
        id,
        name: data.name,
        code: data.code,
        icon: data.icon,
        count: data.count,
        amount: data.amount,
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);

    // Calculate profits
    const operatingProfit = totalPaid - totalOpEx;
    const profit = operatingProfit - totalCapEx;

    // Get breakdown by service type (for income details)
    const serviceTypeBreakdown: Record<string, { count: number; amount: number }> = {};
    (transactions || []).forEach(t => {
      const txn = t as unknown as TransactionWithDebt;
      const key = txn.service_type_id;
      if (!serviceTypeBreakdown[key]) {
        serviceTypeBreakdown[key] = { count: 0, amount: 0 };
      }
      serviceTypeBreakdown[key].count++;
      serviceTypeBreakdown[key].amount += Number(txn.amount || 0);
    });

    // Get service type names
    const serviceTypeIds = Object.keys(serviceTypeBreakdown);
    let serviceTypes: { id: string; name: string; icon: string }[] = [];
    if (serviceTypeIds.length > 0) {
      const { data } = await supabaseAdmin!
        .from('service_types')
        .select('id, name, icon')
        .in('id', serviceTypeIds);
      serviceTypes = data || [];
    }

    const byServiceType = serviceTypes.map(st => ({
      serviceTypeId: st.id,
      serviceTypeName: st.name,
      icon: st.icon,
      count: serviceTypeBreakdown[st.id]?.count || 0,
      amount: serviceTypeBreakdown[st.id]?.amount || 0,
    })).sort((a, b) => b.amount - a.amount);

    // Get recent activity (last 10 transactions + expenses combined)
    let recentTransactionsQuery = supabaseAdmin!
      .from('transactions')
      .select(`
        id, transaction_number, customer_name, amount, transaction_date, created_at,
        service_type:service_types(name, icon),
        branch:branches(name)
      `)
      .eq('is_voided', false)
      .order('created_at', { ascending: false })
      .limit(5);

    if (branchId && branchId !== 'all') {
      recentTransactionsQuery = recentTransactionsQuery.eq('branch_id', branchId);
    }

    const { data: recentTransactions } = await recentTransactionsQuery;

    let recentExpensesQuery = supabaseAdmin!
      .from('expenses')
      .select(`
        id, expense_number, subject, amount, expense_date, created_at,
        expense_type:expense_types(name, icon),
        branch:branches(name)
      `)
      .eq('is_voided', false)
      .order('created_at', { ascending: false })
      .limit(5);

    if (branchId && branchId !== 'all') {
      recentExpensesQuery = recentExpensesQuery.eq('branch_id', branchId);
    }

    const { data: recentExpenses } = await recentExpensesQuery;

    // Type for joined service/expense types
    type JoinedType = { name: string; icon: string } | null;
    type JoinedBranch = { name: string } | null;

    const showBranchColumn = !branchId || branchId === 'all';

    const recentActivity = [
      ...(recentTransactions || []).map(t => {
        const serviceType = t.service_type as unknown as JoinedType;
        const branch = t.branch as unknown as JoinedBranch;
        return {
          type: 'transaction' as const,
          id: t.id,
          number: t.transaction_number,
          title: t.customer_name,
          subtitle: serviceType?.name || '',
          icon: serviceType?.icon || '💵',
          amount: Number(t.amount),
          date: t.transaction_date,
          createdAt: t.created_at,
          branchName: branch?.name,
        };
      }),
      ...(recentExpenses || []).map(e => {
        const expenseType = e.expense_type as unknown as JoinedType;
        const branch = e.branch as unknown as JoinedBranch;
        return {
          type: 'expense' as const,
          id: e.id,
          number: e.expense_number,
          title: e.subject,
          subtitle: expenseType?.name || '',
          icon: expenseType?.icon || '📦',
          amount: -Number(e.amount),
          date: e.expense_date,
          createdAt: e.created_at,
          branchName: branch?.name,
        };
      }),
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 10);

    // DEBUG: Count transactions with debt for debugging
    const debugDebtCount = (transactions || []).filter(t => {
      const raw = t as Record<string, unknown>;
      return Number(raw.debt || 0) > 0;
    }).length;

    return NextResponse.json({
      dateRange: { from: dateFrom, to: dateTo },
      // DEBUG info - remove after fixing
      _debug: {
        totalTransactions: transactions?.length || 0,
        transactionsWithDebt: debugDebtCount,
        calculatedDebt: totalDebt,
        branchId: branchId || 'not set',
        sampleDebt: (transactions || []).slice(0, 3).map(t => {
          const raw = t as Record<string, unknown>;
          return { tn: raw.transaction_number, debt: raw.debt };
        })
      },
      // Income Statement format
      income: {
        paid: totalPaid,
        debt: totalDebt,
        count: transactionCount || 0,
        byServiceType,
      },
      expenses: {
        opex: totalOpEx,
        capex: totalCapEx,
        total: totalOpEx + totalCapEx,
        count: expenseCount || 0,
        topCategories: topExpenseCategories,
      },
      profit: {
        operating: operatingProfit,
        net: profit,
      },
      recentActivity,
      showBranchColumn,
    });
  } catch (error) {
    console.error('Server error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}, { permission: PERMISSIONS.RECEPTION_VIEW });
