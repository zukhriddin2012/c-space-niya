import { supabaseAdmin, isSupabaseAdminConfigured } from './connection';
import type { BranchBriefing } from '@/modules/reception/types';

export async function getBranchBriefing(
  branchId: string,
  _homeBranchId?: string
): Promise<{ success: boolean; data?: BranchBriefing; error?: string }> {
  if (!isSupabaseAdminConfigured()) {
    return { success: false, error: 'Database not configured' };
  }

  try {
    const today = new Date().toISOString().split('T')[0];
    const eightHoursAgo = new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString();

    // Run 4 queries in parallel
    const [txnResult, expResult, operatorResult, settingsResult] = await Promise.all([
      // 1. Today's transactions
      supabaseAdmin!.from('transactions')
        .select('id, amount, customer_name, service_type_id, payment_method_id, transaction_date, agent_id')
        .eq('branch_id', branchId)
        .gte('transaction_date', today)
        .eq('is_voided', false)
        .order('transaction_date', { ascending: false })
        .limit(50),

      // 2. Today's expenses
      supabaseAdmin!.from('expenses')
        .select('id, amount, subject, expense_type_id, expense_date, recorded_by')
        .eq('branch_id', branchId)
        .gte('expense_date', today)
        .eq('is_voided', false)
        .order('expense_date', { ascending: false })
        .limit(50),

      // 3. Active operators (last 8h)
      supabaseAdmin!.from('operator_switch_log')
        .select('switched_to_id, switched_at, is_cross_branch, employee:employees!operator_switch_log_switched_to_id_fkey(full_name)')
        .eq('branch_id', branchId)
        .gte('switched_at', eightHoursAgo)
        .order('switched_at', { ascending: false }),

      // 4. Branch settings counts (GLOBAL — no branch_id on these tables)
      Promise.all([
        supabaseAdmin!.from('service_types').select('name').eq('is_active', true),
        supabaseAdmin!.from('expense_types').select('name').eq('is_active', true),
        supabaseAdmin!.from('payment_methods').select('name').eq('is_active', true),
      ]),
    ]);

    // Calculate today's summary
    const transactions = txnResult.data || [];
    const expenses = expResult.data || [];
    const txnTotal = transactions.reduce((sum: number, t: { amount: number }) => sum + (t.amount || 0), 0);
    const expTotal = expenses.reduce((sum: number, e: { amount: number }) => sum + (e.amount || 0), 0);

    // Deduplicate operators (keep latest switch per employee)
    const operatorMap = new Map<string, {
      employeeId: string;
      employeeName: string;
      switchedAt: string;
      isCrossBranch: boolean;
    }>();
    for (const op of (operatorResult.data || [])) {
      if (!operatorMap.has(op.switched_to_id)) {
        const empJoin = op.employee as { full_name: string } | { full_name: string }[] | null;
        const emp = Array.isArray(empJoin) ? empJoin[0] : empJoin;
        operatorMap.set(op.switched_to_id, {
          employeeId: op.switched_to_id,
          employeeName: emp?.full_name || 'Unknown',
          switchedAt: op.switched_at,
          isCrossBranch: op.is_cross_branch || false,
        });
      }
    }

    // Build settings
    const [svcResult, expTypeResult, pmResult] = settingsResult;
    const serviceTypeNames = (svcResult.data || []).map((s: { name: string }) => s.name);
    const expenseTypeNames = (expTypeResult.data || []).map((e: { name: string }) => e.name);
    const paymentMethodNames = (pmResult.data || []).map((p: { name: string }) => p.name);

    // Recent activity (merge last 5 transactions + expenses)
    const recentActivity = [
      ...transactions.slice(0, 5).map((t: { id: string; customer_name: string; amount: number; transaction_date: string }) => ({
        type: 'transaction' as const,
        id: t.id,
        description: t.customer_name,
        amount: t.amount,
        operatorName: '',
        timestamp: t.transaction_date,
      })),
      ...expenses.slice(0, 5).map((e: { id: string; subject: string; amount: number; expense_date: string }) => ({
        type: 'expense' as const,
        id: e.id,
        description: e.subject,
        amount: -e.amount,
        operatorName: '',
        timestamp: e.expense_date,
      })),
    ]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 5);

    // Get branch name
    const { data: branchData } = await supabaseAdmin!
      .from('branches')
      .select('name')
      .eq('id', branchId)
      .single();

    const briefing: BranchBriefing = {
      branchId,
      branchName: branchData?.name || branchId,
      todaySummary: {
        transactionCount: transactions.length,
        transactionTotal: txnTotal,
        expenseCount: expenses.length,
        expenseTotal: expTotal,
        netAmount: txnTotal - expTotal,
      },
      activeOperators: Array.from(operatorMap.values()),
      branchSettings: {
        serviceTypeCount: serviceTypeNames.length,
        expenseTypeCount: expenseTypeNames.length,
        paymentMethodCount: paymentMethodNames.length,
        serviceTypeNames,
        expenseTypeNames,
        paymentMethodNames,
      },
      recentActivity,
    };

    return { success: true, data: briefing };
  } catch (error) {
    console.error('Error in getBranchBriefing:', error);
    return { success: false, error: 'Internal error' };
  }
}
