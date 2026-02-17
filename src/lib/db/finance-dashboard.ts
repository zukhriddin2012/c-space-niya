import { supabaseAdmin, isSupabaseAdminConfigured } from './connection';

// ============================================
// CORE AGGREGATION: Revenue + Expenses per branch
// ============================================

export interface BranchAggregation {
  branch_id: string;
  branch_name: string;
  total_revenue: number;
  transaction_count: number;
  total_expenses: number;
  expense_count: number;
}

export async function getFinancialAggregations(
  startDate: string,
  endDate: string,
  branchId?: string | null
): Promise<BranchAggregation[]> {
  if (!isSupabaseAdminConfigured()) return [];

  // --- Revenue by branch ---
  let revenueQuery = supabaseAdmin!
    .from('transactions')
    .select('branch_id, amount')
    .eq('is_voided', false)
    .gte('transaction_date', startDate)
    .lte('transaction_date', endDate);

  if (branchId) {
    revenueQuery = revenueQuery.eq('branch_id', branchId);
  }

  const { data: revenueRows, error: revError } = await revenueQuery;
  if (revError) {
    console.error('Error fetching revenue:', revError);
    return [];
  }

  // --- Expenses by branch ---
  let expenseQuery = supabaseAdmin!
    .from('expenses')
    .select('branch_id, amount')
    .eq('is_voided', false)
    .gte('expense_date', startDate)
    .lte('expense_date', endDate);

  if (branchId) {
    expenseQuery = expenseQuery.eq('branch_id', branchId);
  }

  const { data: expenseRows, error: expError } = await expenseQuery;
  if (expError) {
    console.error('Error fetching expenses:', expError);
    return [];
  }

  // --- Aggregate in JS ---
  const branchMap = new Map<string, BranchAggregation>();

  for (const row of revenueRows || []) {
    const bid = row.branch_id;
    if (!branchMap.has(bid)) {
      branchMap.set(bid, {
        branch_id: bid,
        branch_name: '',
        total_revenue: 0,
        transaction_count: 0,
        total_expenses: 0,
        expense_count: 0,
      });
    }
    const agg = branchMap.get(bid)!;
    agg.total_revenue += Number(row.amount);
    agg.transaction_count += 1;
  }

  for (const row of expenseRows || []) {
    const bid = row.branch_id;
    if (!branchMap.has(bid)) {
      branchMap.set(bid, {
        branch_id: bid,
        branch_name: '',
        total_revenue: 0,
        transaction_count: 0,
        total_expenses: 0,
        expense_count: 0,
      });
    }
    const agg = branchMap.get(bid)!;
    agg.total_expenses += Number(row.amount);
    agg.expense_count += 1;
  }

  // --- Fetch branch names ---
  const branchIds = Array.from(branchMap.keys());
  if (branchIds.length > 0) {
    const { data: branches } = await supabaseAdmin!
      .from('branches')
      .select('id, name')
      .in('id', branchIds);

    for (const b of branches || []) {
      const agg = branchMap.get(b.id);
      if (agg) agg.branch_name = b.name;
    }
  }

  return Array.from(branchMap.values());
}

// ============================================
// BREAKDOWNS: Revenue by service type
// ============================================

interface ServiceTypeBreakdown {
  service_type_id: string;
  service_type_name: string;
  service_type_icon: string | null;
  total_amount: number;
  count: number;
}

export async function getRevenueByServiceType(
  startDate: string,
  endDate: string,
  branchId?: string | null,
  limit: number = 5
): Promise<ServiceTypeBreakdown[]> {
  if (!isSupabaseAdminConfigured()) return [];

  let query = supabaseAdmin!
    .from('transactions')
    .select(`
      service_type_id,
      amount,
      service_type:service_types!service_type_id(id, name, icon)
    `)
    .eq('is_voided', false)
    .gte('transaction_date', startDate)
    .lte('transaction_date', endDate);

  if (branchId) {
    query = query.eq('branch_id', branchId);
  }

  const { data, error } = await query;
  if (error) {
    console.error('Error fetching revenue by service type:', error);
    return [];
  }

  // Aggregate by service_type_id
  const map = new Map<string, ServiceTypeBreakdown>();
  for (const row of data || []) {
    const stId = row.service_type_id;
    if (!map.has(stId)) {
      const st = row.service_type as unknown as { id: string; name: string; icon: string | null } | null;
      map.set(stId, {
        service_type_id: stId,
        service_type_name: st?.name || 'Unknown',
        service_type_icon: st?.icon || null,
        total_amount: 0,
        count: 0,
      });
    }
    const item = map.get(stId)!;
    item.total_amount += Number(row.amount);
    item.count += 1;
  }

  // Sort by amount descending, take top N + aggregate rest as "Other"
  const sorted = Array.from(map.values()).sort((a, b) => b.total_amount - a.total_amount);

  if (sorted.length <= limit) return sorted;

  const top = sorted.slice(0, limit);
  const rest = sorted.slice(limit);
  const other: ServiceTypeBreakdown = {
    service_type_id: 'other',
    service_type_name: 'Other',
    service_type_icon: null,
    total_amount: rest.reduce((sum, r) => sum + r.total_amount, 0),
    count: rest.reduce((sum, r) => sum + r.count, 0),
  };
  return [...top, other];
}

// ============================================
// BREAKDOWNS: Expenses by category
// ============================================

interface ExpenseCategoryBreakdown {
  expense_type_id: string;
  expense_type_name: string;
  expense_type_icon: string | null;
  total_amount: number;
  count: number;
}

export async function getExpensesByCategory(
  startDate: string,
  endDate: string,
  branchId?: string | null
): Promise<ExpenseCategoryBreakdown[]> {
  if (!isSupabaseAdminConfigured()) return [];

  let query = supabaseAdmin!
    .from('expenses')
    .select(`
      expense_type_id,
      amount,
      expense_type:expense_types!expense_type_id(id, name, icon)
    `)
    .eq('is_voided', false)
    .gte('expense_date', startDate)
    .lte('expense_date', endDate);

  if (branchId) {
    query = query.eq('branch_id', branchId);
  }

  const { data, error } = await query;
  if (error) {
    console.error('Error fetching expenses by category:', error);
    return [];
  }

  const map = new Map<string, ExpenseCategoryBreakdown>();
  for (const row of data || []) {
    const etId = row.expense_type_id;
    if (!map.has(etId)) {
      const et = row.expense_type as unknown as { id: string; name: string; icon: string | null } | null;
      map.set(etId, {
        expense_type_id: etId,
        expense_type_name: et?.name || 'Unknown',
        expense_type_icon: et?.icon || null,
        total_amount: 0,
        count: 0,
      });
    }
    const item = map.get(etId)!;
    item.total_amount += Number(row.amount);
    item.count += 1;
  }

  return Array.from(map.values()).sort((a, b) => b.total_amount - a.total_amount);
}

// ============================================
// BREAKDOWNS: Revenue by payment method
// ============================================

interface PaymentMethodBreakdownRow {
  payment_method_id: string;
  payment_method_name: string;
  total_amount: number;
  count: number;
}

export async function getRevenueByPaymentMethod(
  startDate: string,
  endDate: string,
  branchId?: string | null
): Promise<PaymentMethodBreakdownRow[]> {
  if (!isSupabaseAdminConfigured()) return [];

  let query = supabaseAdmin!
    .from('transactions')
    .select(`
      payment_method_id,
      amount,
      payment_method:payment_methods!payment_method_id(id, name)
    `)
    .eq('is_voided', false)
    .gte('transaction_date', startDate)
    .lte('transaction_date', endDate);

  if (branchId) {
    query = query.eq('branch_id', branchId);
  }

  const { data, error } = await query;
  if (error) {
    console.error('Error fetching revenue by payment method:', error);
    return [];
  }

  // Aggregate globally
  const map = new Map<string, PaymentMethodBreakdownRow>();
  for (const row of data || []) {
    const pmId = row.payment_method_id;
    if (!map.has(pmId)) {
      const pm = row.payment_method as unknown as { id: string; name: string } | null;
      map.set(pmId, {
        payment_method_id: pmId,
        payment_method_name: pm?.name || 'Unknown',
        total_amount: 0,
        count: 0,
      });
    }
    const item = map.get(pmId)!;
    item.total_amount += Number(row.amount);
    item.count += 1;
  }

  return Array.from(map.values()).sort((a, b) => b.total_amount - a.total_amount);
}

// Per-branch payment method breakdown (for stacked chart)
export interface BranchPaymentMethodData {
  branchId: string;
  branchName: string;
  methods: { id: string; name: string; amount: number }[];
}

export async function getPaymentMethodsByBranch(
  startDate: string,
  endDate: string,
  branchId?: string | null
): Promise<BranchPaymentMethodData[]> {
  if (!isSupabaseAdminConfigured()) return [];

  let query = supabaseAdmin!
    .from('transactions')
    .select(`
      payment_method_id,
      amount,
      branch_id,
      payment_method:payment_methods!payment_method_id(id, name),
      branch:branches!branch_id(id, name)
    `)
    .eq('is_voided', false)
    .gte('transaction_date', startDate)
    .lte('transaction_date', endDate);

  if (branchId) {
    query = query.eq('branch_id', branchId);
  }

  const { data, error } = await query;
  if (error) {
    console.error('Error fetching payment methods by branch:', error);
    return [];
  }

  const result = new Map<string, { branchName: string; methods: Map<string, { name: string; amount: number }> }>();

  for (const row of data || []) {
    const bid = row.branch_id;
    if (!result.has(bid)) {
      const br = row.branch as unknown as { name: string } | null;
      result.set(bid, { branchName: br?.name || bid, methods: new Map() });
    }
    const branch = result.get(bid)!;
    const pmId = row.payment_method_id;
    if (!branch.methods.has(pmId)) {
      const pm = row.payment_method as unknown as { name: string } | null;
      branch.methods.set(pmId, { name: pm?.name || 'Unknown', amount: 0 });
    }
    branch.methods.get(pmId)!.amount += Number(row.amount);
  }

  return Array.from(result.entries()).map(([branchId, data]) => ({
    branchId,
    branchName: data.branchName,
    methods: Array.from(data.methods.entries()).map(([id, m]) => ({ id, name: m.name, amount: m.amount })),
  }));
}

// ============================================
// SUMMARY TOTALS (for sticky footer on transactions/expenses pages)
// ============================================

export async function getTransactionSummaryTotals(
  branchId: string | null,
  filters: {
    dateFrom?: string;
    dateTo?: string;
    serviceTypeId?: string;
    paymentMethodId?: string;
    agentId?: string;
  }
): Promise<{ totalRevenue: number; count: number; cashTotal: number; digitalTotal: number; bankTotal: number }> {
  if (!isSupabaseAdminConfigured()) {
    return { totalRevenue: 0, count: 0, cashTotal: 0, digitalTotal: 0, bankTotal: 0 };
  }

  let query = supabaseAdmin!
    .from('transactions')
    .select(`
      amount,
      payment_method:payment_methods!payment_method_id(code)
    `)
    .eq('is_voided', false);

  if (branchId) query = query.eq('branch_id', branchId);
  if (filters.dateFrom) query = query.gte('transaction_date', filters.dateFrom);
  if (filters.dateTo) query = query.lte('transaction_date', filters.dateTo);
  if (filters.serviceTypeId) query = query.eq('service_type_id', filters.serviceTypeId);
  if (filters.paymentMethodId) query = query.eq('payment_method_id', filters.paymentMethodId);
  if (filters.agentId) query = query.eq('agent_id', filters.agentId);

  const { data, error } = await query;
  if (error) {
    console.error('Error fetching transaction summary:', error);
    return { totalRevenue: 0, count: 0, cashTotal: 0, digitalTotal: 0, bankTotal: 0 };
  }

  let totalRevenue = 0, cashTotal = 0, digitalTotal = 0, bankTotal = 0;
  const digitalCodes = new Set(['payme', 'click', 'uzum', 'terminal']);

  for (const row of data || []) {
    const amount = Number(row.amount);
    totalRevenue += amount;
    const code = (row.payment_method as unknown as { code: string } | null)?.code || '';
    if (code === 'cash') cashTotal += amount;
    else if (code === 'bank') bankTotal += amount;
    else if (digitalCodes.has(code)) digitalTotal += amount;
  }

  return { totalRevenue, count: (data || []).length, cashTotal, digitalTotal, bankTotal };
}

export async function getExpenseSummaryTotals(
  branchId: string | null,
  filters: {
    dateFrom?: string;
    dateTo?: string;
    expenseTypeId?: string;
    paymentMethod?: string;
    recordedBy?: string;
  }
): Promise<{ totalExpenses: number; count: number; cashTotal: number; bankTotal: number }> {
  if (!isSupabaseAdminConfigured()) {
    return { totalExpenses: 0, count: 0, cashTotal: 0, bankTotal: 0 };
  }

  let query = supabaseAdmin!
    .from('expenses')
    .select('amount, payment_method')
    .eq('is_voided', false);

  if (branchId) query = query.eq('branch_id', branchId);
  if (filters.dateFrom) query = query.gte('expense_date', filters.dateFrom);
  if (filters.dateTo) query = query.lte('expense_date', filters.dateTo);
  if (filters.expenseTypeId) query = query.eq('expense_type_id', filters.expenseTypeId);
  if (filters.paymentMethod) query = query.eq('payment_method', filters.paymentMethod);
  if (filters.recordedBy) query = query.eq('recorded_by', filters.recordedBy);

  const { data, error } = await query;
  if (error) {
    console.error('Error fetching expense summary:', error);
    return { totalExpenses: 0, count: 0, cashTotal: 0, bankTotal: 0 };
  }

  let totalExpenses = 0, cashTotal = 0, bankTotal = 0;
  for (const row of data || []) {
    const amount = Number(row.amount);
    totalExpenses += amount;
    if (row.payment_method === 'cash') cashTotal += amount;
    else bankTotal += amount;
  }

  return { totalExpenses, count: (data || []).length, cashTotal, bankTotal };
}
