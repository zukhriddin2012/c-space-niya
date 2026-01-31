import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-auth';
import { PERMISSIONS } from '@/lib/permissions';
import { supabaseAdmin, isSupabaseAdminConfigured } from '@/lib/supabase';

// ============================================
// GET /api/reception/dashboard
// Get dashboard statistics
// ============================================
export const GET = withAuth(async (request: NextRequest) => {
  try {
    if (!isSupabaseAdminConfigured()) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const searchParams = request.nextUrl.searchParams;
    const branchId = searchParams.get('branchId');
    const dateFrom = searchParams.get('dateFrom') || new Date().toISOString().split('T')[0];
    const dateTo = searchParams.get('dateTo') || new Date().toISOString().split('T')[0];

    // Get transactions summary
    let transactionsQuery = supabaseAdmin!
      .from('transactions')
      .select('amount, service_type_id, payment_method_id', { count: 'exact' })
      .eq('is_voided', false)
      .gte('transaction_date', dateFrom)
      .lte('transaction_date', dateTo);

    if (branchId && branchId !== 'all') {
      transactionsQuery = transactionsQuery.eq('branch_id', branchId);
    }

    const { data: transactions, count: transactionCount } = await transactionsQuery;

    // Calculate totals
    const totalIncome = (transactions || []).reduce((sum, t) => sum + Number(t.amount), 0);

    // Get expenses summary
    let expensesQuery = supabaseAdmin!
      .from('expenses')
      .select('amount, expense_type_id, payment_method', { count: 'exact' })
      .eq('is_voided', false)
      .gte('expense_date', dateFrom)
      .lte('expense_date', dateTo);

    if (branchId && branchId !== 'all') {
      expensesQuery = expensesQuery.eq('branch_id', branchId);
    }

    const { data: expenses, count: expenseCount } = await expensesQuery;

    const totalExpenses = (expenses || []).reduce((sum, e) => sum + Number(e.amount), 0);
    const cashExpenses = (expenses || []).filter(e => e.payment_method === 'cash').reduce((sum, e) => sum + Number(e.amount), 0);
    const bankExpenses = (expenses || []).filter(e => e.payment_method === 'bank').reduce((sum, e) => sum + Number(e.amount), 0);

    // Get breakdown by service type
    const serviceTypeBreakdown: Record<string, { count: number; amount: number }> = {};
    (transactions || []).forEach(t => {
      const key = t.service_type_id;
      if (!serviceTypeBreakdown[key]) {
        serviceTypeBreakdown[key] = { count: 0, amount: 0 };
      }
      serviceTypeBreakdown[key].count++;
      serviceTypeBreakdown[key].amount += Number(t.amount);
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

    // Get breakdown by payment method
    const paymentMethodBreakdown: Record<string, { count: number; amount: number }> = {};
    (transactions || []).forEach(t => {
      const key = t.payment_method_id;
      if (!paymentMethodBreakdown[key]) {
        paymentMethodBreakdown[key] = { count: 0, amount: 0 };
      }
      paymentMethodBreakdown[key].count++;
      paymentMethodBreakdown[key].amount += Number(t.amount);
    });

    // Get payment method names
    const paymentMethodIds = Object.keys(paymentMethodBreakdown);
    let paymentMethods: { id: string; name: string; icon: string }[] = [];
    if (paymentMethodIds.length > 0) {
      const { data } = await supabaseAdmin!
        .from('payment_methods')
        .select('id, name, icon')
        .in('id', paymentMethodIds);
      paymentMethods = data || [];
    }

    const byPaymentMethod = paymentMethods.map(pm => ({
      paymentMethodId: pm.id,
      paymentMethodName: pm.name,
      icon: pm.icon,
      count: paymentMethodBreakdown[pm.id]?.count || 0,
      amount: paymentMethodBreakdown[pm.id]?.amount || 0,
    })).sort((a, b) => b.amount - a.amount);

    // Get breakdown by expense type
    const expenseTypeBreakdown: Record<string, { count: number; amount: number }> = {};
    (expenses || []).forEach(e => {
      const key = e.expense_type_id;
      if (!expenseTypeBreakdown[key]) {
        expenseTypeBreakdown[key] = { count: 0, amount: 0 };
      }
      expenseTypeBreakdown[key].count++;
      expenseTypeBreakdown[key].amount += Number(e.amount);
    });

    // Get expense type names
    const expenseTypeIds = Object.keys(expenseTypeBreakdown);
    let expenseTypes: { id: string; name: string; icon: string }[] = [];
    if (expenseTypeIds.length > 0) {
      const { data } = await supabaseAdmin!
        .from('expense_types')
        .select('id, name, icon')
        .in('id', expenseTypeIds);
      expenseTypes = data || [];
    }

    const byExpenseType = expenseTypes.map(et => ({
      expenseTypeId: et.id,
      expenseTypeName: et.name,
      icon: et.icon,
      count: expenseTypeBreakdown[et.id]?.count || 0,
      amount: expenseTypeBreakdown[et.id]?.amount || 0,
    })).sort((a, b) => b.amount - a.amount);

    // Get recent activity (last 5 transactions + expenses combined)
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
      transactions: {
        total: totalIncome,
        count: transactionCount || 0,
        byServiceType,
        byPaymentMethod,
      },
      expenses: {
        total: totalExpenses,
        count: expenseCount || 0,
        byCash: cashExpenses,
        byBank: bankExpenses,
        byExpenseType,
      },
      netIncome: totalIncome - totalExpenses,
      recentActivity,
      showBranchColumn,
    });
  } catch (error) {
    console.error('Server error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}, { permission: PERMISSIONS.RECEPTION_VIEW });
