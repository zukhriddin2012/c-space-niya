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

    // Build base filter for transactions
    const baseFilter = {
      is_voided: false,
      dateFrom,
      dateTo,
      branchId: branchId && branchId !== 'all' ? branchId : null
    };

    // Query 1: Get ALL transactions for totals (using separate query to avoid limit)
    // Supabase JS client has 1000 row default limit, so we fetch in batches or use RPC
    let allTransactionsQuery = supabaseAdmin!
      .from('transactions')
      .select('amount, debt, service_type_id', { count: 'exact' })
      .eq('is_voided', false)
      .gte('transaction_date', dateFrom)
      .lte('transaction_date', dateTo);

    if (baseFilter.branchId) {
      allTransactionsQuery = allTransactionsQuery.eq('branch_id', baseFilter.branchId);
    }

    // Fetch all transactions in batches to overcome 1000 row limit
    const allTransactions: Array<{ amount: number; debt: number; service_type_id: string }> = [];
    let offset = 0;
    const batchSize = 1000;
    let hasMore = true;
    let transactionCount = 0;

    while (hasMore) {
      let batchQuery = supabaseAdmin!
        .from('transactions')
        .select('amount, debt, service_type_id', { count: 'exact' })
        .eq('is_voided', false)
        .gte('transaction_date', dateFrom)
        .lte('transaction_date', dateTo)
        .range(offset, offset + batchSize - 1);

      if (baseFilter.branchId) {
        batchQuery = batchQuery.eq('branch_id', baseFilter.branchId);
      }

      const { data: batch, count } = await batchQuery;

      if (count !== null && transactionCount === 0) {
        transactionCount = count;
      }

      if (batch && batch.length > 0) {
        batch.forEach(t => {
          const raw = t as Record<string, unknown>;
          allTransactions.push({
            amount: Number(raw.amount || 0),
            debt: Number(raw.debt || 0),
            service_type_id: String(raw.service_type_id || '')
          });
        });
        offset += batchSize;
        hasMore = batch.length === batchSize;
      } else {
        hasMore = false;
      }
    }

    // Calculate totals from all transactions
    const totalPaid = allTransactions.reduce((sum, t) => sum + t.amount, 0);
    const totalDebt = allTransactions.reduce((sum, t) => sum + t.debt, 0);

    // For service type breakdown
    const transactions = allTransactions;

    // Get expenses summary with expense type info for categorization
    // Fetch ALL expenses in batches (same approach as transactions)
    type ExpenseWithType = {
      amount: number;
      expense_type_id: string;
      payment_method: string;
      expense_type: { id: string; name: string; code: string; icon: string } | null;
    };

    const allExpenses: ExpenseWithType[] = [];
    let expenseOffset = 0;
    let hasMoreExpenses = true;
    let expenseCount = 0;

    while (hasMoreExpenses) {
      let expenseBatchQuery = supabaseAdmin!
        .from('expenses')
        .select(`
          amount,
          expense_type_id,
          payment_method,
          expense_type:expense_types(id, name, code, icon)
        `, { count: 'exact' })
        .eq('is_voided', false)
        .gte('expense_date', dateFrom)
        .lte('expense_date', dateTo)
        .range(expenseOffset, expenseOffset + batchSize - 1);

      if (branchId && branchId !== 'all') {
        expenseBatchQuery = expenseBatchQuery.eq('branch_id', branchId);
      }

      const { data: expenseBatch, count } = await expenseBatchQuery;

      if (count !== null && expenseCount === 0) {
        expenseCount = count;
      }

      if (expenseBatch && expenseBatch.length > 0) {
        expenseBatch.forEach(e => {
          const raw = e as Record<string, unknown>;
          const expType = raw.expense_type as { id: string; name: string; code: string; icon: string } | null;
          allExpenses.push({
            amount: Number(raw.amount || 0),
            expense_type_id: String(raw.expense_type_id || ''),
            payment_method: String(raw.payment_method || ''),
            expense_type: expType
          });
        });
        expenseOffset += batchSize;
        hasMoreExpenses = expenseBatch.length === batchSize;
      } else {
        hasMoreExpenses = false;
      }
    }

    const expenses = allExpenses;

    // Define CapEx codes (capital expenditures - equipment, renovation, etc.)
    const capexCodes = ['equipment', 'renovation', 'furniture', 'capex', 'investment'];

    // Calculate OpEx and CapEx
    let totalOpEx = 0;
    let totalCapEx = 0;

    expenses.forEach(e => {
      const amount = e.amount;
      const code = e.expense_type?.code?.toLowerCase() || '';
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

    expenses.forEach(e => {
      const expType = e.expense_type;
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
      expenseTypeBreakdown[key].amount += e.amount;
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
    transactions.forEach(t => {
      const key = t.service_type_id;
      if (!key) return;
      if (!serviceTypeBreakdown[key]) {
        serviceTypeBreakdown[key] = { count: 0, amount: 0 };
      }
      serviceTypeBreakdown[key].count++;
      serviceTypeBreakdown[key].amount += t.amount;
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

    return NextResponse.json({
      dateRange: { from: dateFrom, to: dateTo },
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
