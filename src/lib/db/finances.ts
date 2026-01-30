// Finance database functions
import { supabaseAdmin, isSupabaseAdminConfigured } from './connection';

// Types
export interface FinanceTransaction {
  id: string;
  branch_id: string;
  transaction_type: 'revenue' | 'expense' | 'transfer';
  transaction_date: string;
  amount: number;
  service_type?: string;
  customer_id?: string;
  customer_name?: string;
  expense_category?: string;
  vendor_name?: string;
  payment_method?: 'cash' | 'bank' | 'payme' | 'click' | 'uzum' | 'terminal' | 'transfer';
  payment_reference?: string;
  processed_by?: string;
  approved_by?: string;
  approval_status?: 'pending' | 'approved' | 'rejected';
  imported_from?: string;
  import_batch_id?: string;
  notes?: string;
  created_at?: string;
}

export interface FinanceAccount {
  id: string;
  code: string;
  name: string;
  name_uz?: string;
  name_ru?: string;
  account_type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
  parent_code?: string;
  is_active: boolean;
}

export interface FinanceCustomer {
  id: string;
  branch_id: string;
  name: string;
  customer_type: 'company' | 'individual';
  telegram_id?: string;
  phone?: string;
  email?: string;
  notes?: string;
  is_active: boolean;
}

export interface ImportBatch {
  id: string;
  branch_id: string;
  file_name: string;
  file_type: string;
  row_count: number;
  success_count: number;
  error_count: number;
  errors?: Record<string, unknown>[];
  imported_by: string;
  created_at: string;
}

export interface ServiceMapping {
  service_name: string;
  service_name_variants?: string[];
  account_code: string;
}

// ============================================
// TRANSACTIONS
// ============================================

export interface TransactionQueryOptions {
  startDate?: string;
  endDate?: string;
  transactionType?: 'revenue' | 'expense';
  serviceType?: string;
  expenseCategory?: string;
  paymentMethod?: string;
  approvalStatus?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface TransactionsResult {
  transactions: FinanceTransaction[];
  total: number;
  totalRevenue: number;
  totalExpenses: number;
}

export async function getTransactions(
  branchId: string,
  options?: TransactionQueryOptions
): Promise<FinanceTransaction[]> {
  const result = await getTransactionsWithCount(branchId, options);
  return result.transactions;
}

export async function getTransactionsWithCount(
  branchId: string,
  options?: TransactionQueryOptions
): Promise<TransactionsResult> {
  if (!isSupabaseAdminConfigured()) {
    return { transactions: [], total: 0, totalRevenue: 0, totalExpenses: 0 };
  }

  // Build filter conditions as an array of filter objects
  const filters: Array<{ column: string; op: string; value: string }> = [];

  if (options?.startDate) {
    filters.push({ column: 'transaction_date', op: 'gte', value: options.startDate });
  }
  if (options?.endDate) {
    filters.push({ column: 'transaction_date', op: 'lte', value: options.endDate });
  }
  if (options?.transactionType) {
    filters.push({ column: 'transaction_type', op: 'eq', value: options.transactionType });
  }
  if (options?.serviceType) {
    filters.push({ column: 'service_type', op: 'eq', value: options.serviceType });
  }
  if (options?.expenseCategory) {
    filters.push({ column: 'expense_category', op: 'eq', value: options.expenseCategory });
  }
  if (options?.paymentMethod) {
    filters.push({ column: 'payment_method', op: 'eq', value: options.paymentMethod });
  }
  if (options?.approvalStatus) {
    filters.push({ column: 'approval_status', op: 'eq', value: options.approvalStatus });
  }

  const searchFilter = options?.search
    ? `customer_name.ilike.%${options.search}%,vendor_name.ilike.%${options.search}%,notes.ilike.%${options.search}%`
    : null;

  // Get count
  let countQuery = supabaseAdmin!
    .from('finance_transactions')
    .select('*', { count: 'exact', head: true })
    .eq('branch_id', branchId);

  for (const f of filters) {
    if (f.op === 'gte') countQuery = countQuery.gte(f.column, f.value);
    else if (f.op === 'lte') countQuery = countQuery.lte(f.column, f.value);
    else if (f.op === 'eq') countQuery = countQuery.eq(f.column, f.value);
  }
  if (searchFilter) countQuery = countQuery.or(searchFilter);

  const { count } = await countQuery;

  // Get paginated data
  let dataQuery = supabaseAdmin!
    .from('finance_transactions')
    .select('*')
    .eq('branch_id', branchId);

  for (const f of filters) {
    if (f.op === 'gte') dataQuery = dataQuery.gte(f.column, f.value);
    else if (f.op === 'lte') dataQuery = dataQuery.lte(f.column, f.value);
    else if (f.op === 'eq') dataQuery = dataQuery.eq(f.column, f.value);
  }
  if (searchFilter) dataQuery = dataQuery.or(searchFilter);

  dataQuery = dataQuery
    .order('transaction_date', { ascending: false })
    .order('created_at', { ascending: false });

  if (options?.limit) {
    const offset = options.offset || 0;
    dataQuery = dataQuery.range(offset, offset + options.limit - 1);
  }

  const { data, error } = await dataQuery;

  if (error) {
    console.error('Error fetching transactions:', error);
    return { transactions: [], total: 0, totalRevenue: 0, totalExpenses: 0 };
  }

  // Calculate totals from all filtered data (not just paginated)
  let totalsQuery = supabaseAdmin!
    .from('finance_transactions')
    .select('transaction_type, amount')
    .eq('branch_id', branchId);

  for (const f of filters) {
    if (f.op === 'gte') totalsQuery = totalsQuery.gte(f.column, f.value);
    else if (f.op === 'lte') totalsQuery = totalsQuery.lte(f.column, f.value);
    else if (f.op === 'eq') totalsQuery = totalsQuery.eq(f.column, f.value);
  }
  if (searchFilter) totalsQuery = totalsQuery.or(searchFilter);

  const { data: allFiltered } = await totalsQuery;

  let totalRevenue = 0;
  let totalExpenses = 0;
  interface TotalsRow { transaction_type: string; amount: number }
  const filtered = allFiltered as TotalsRow[] | null;
  (filtered || []).forEach(t => {
    if (t.transaction_type === 'revenue') {
      totalRevenue += t.amount || 0;
    } else if (t.transaction_type === 'expense') {
      totalExpenses += t.amount || 0;
    }
  });

  return {
    transactions: (data || []) as FinanceTransaction[],
    total: count || 0,
    totalRevenue,
    totalExpenses,
  };
}

export async function createTransaction(
  transaction: Omit<FinanceTransaction, 'id' | 'created_at'>
): Promise<{ success: boolean; transaction?: FinanceTransaction; error?: string }> {
  if (!isSupabaseAdminConfigured()) {
    return { success: false, error: 'Database not configured' };
  }

  const { data, error } = await supabaseAdmin!
    .from('finance_transactions')
    .insert(transaction)
    .select()
    .single();

  if (error) {
    console.error('Error creating transaction:', error);
    return { success: false, error: error.message };
  }

  return { success: true, transaction: data };
}

export async function createTransactionsBatch(
  transactions: Omit<FinanceTransaction, 'id' | 'created_at'>[]
): Promise<{ success: boolean; count: number; errors: string[] }> {
  if (!isSupabaseAdminConfigured()) {
    return { success: false, count: 0, errors: ['Database not configured'] };
  }

  const errors: string[] = [];
  let successCount = 0;

  // Insert in batches of 100
  const batchSize = 100;
  for (let i = 0; i < transactions.length; i += batchSize) {
    const batch = transactions.slice(i, i + batchSize);

    const { data, error } = await supabaseAdmin!
      .from('finance_transactions')
      .insert(batch)
      .select();

    if (error) {
      errors.push(`Batch ${i / batchSize + 1}: ${error.message}`);
    } else {
      successCount += data?.length || 0;
    }
  }

  return {
    success: errors.length === 0,
    count: successCount,
    errors,
  };
}

// ============================================
// IMPORT BATCHES
// ============================================

export async function createImportBatch(
  batch: Omit<ImportBatch, 'id' | 'created_at'>
): Promise<{ success: boolean; batch?: ImportBatch; error?: string }> {
  if (!isSupabaseAdminConfigured()) {
    return { success: false, error: 'Database not configured' };
  }

  const { data, error } = await supabaseAdmin!
    .from('finance_import_batches')
    .insert(batch)
    .select()
    .single();

  if (error) {
    console.error('Error creating import batch:', error);
    return { success: false, error: error.message };
  }

  return { success: true, batch: data };
}

export async function getImportBatches(branchId: string): Promise<ImportBatch[]> {
  if (!isSupabaseAdminConfigured()) return [];

  const { data, error } = await supabaseAdmin!
    .from('finance_import_batches')
    .select('*')
    .eq('branch_id', branchId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching import batches:', error);
    return [];
  }

  return data || [];
}

// ============================================
// SERVICE MAPPINGS
// ============================================

export async function getServiceMappings(): Promise<ServiceMapping[]> {
  if (!isSupabaseAdminConfigured()) return [];

  const { data, error } = await supabaseAdmin!
    .from('finance_service_mappings')
    .select('service_name, service_name_variants, account_code')
    .eq('is_active', true);

  if (error) {
    console.error('Error fetching service mappings:', error);
    return [];
  }

  return (data as ServiceMapping[]) || [];
}

export async function getExpenseMappings(): Promise<ServiceMapping[]> {
  if (!isSupabaseAdminConfigured()) return [];

  const { data, error } = await supabaseAdmin!
    .from('finance_expense_mappings')
    .select('category_name, category_name_variants, account_code')
    .eq('is_active', true);

  if (error) {
    console.error('Error fetching expense mappings:', error);
    return [];
  }

  // Map category fields to service_name fields
  interface ExpenseMapping { category_name: string; category_name_variants?: string[]; account_code: string }
  const mappings = (data as ExpenseMapping[]) || [];
  return mappings.map(m => ({
    service_name: m.category_name,
    service_name_variants: m.category_name_variants,
    account_code: m.account_code,
  }));
}

// ============================================
// DASHBOARD STATS
// ============================================

export interface FinanceDashboardStats {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  transactionCount: number;
  revenueByService: Record<string, number>;
  revenueByPaymentMethod: Record<string, number>;
  pendingApprovals: number;
  outstandingDebt: number;
}

export async function getDashboardStats(
  branchId: string,
  startDate: string,
  endDate: string
): Promise<FinanceDashboardStats> {
  if (!isSupabaseAdminConfigured()) {
    return {
      totalRevenue: 0,
      totalExpenses: 0,
      netProfit: 0,
      transactionCount: 0,
      revenueByService: {},
      revenueByPaymentMethod: {},
      pendingApprovals: 0,
      outstandingDebt: 0,
    };
  }

  // Get transactions for the period
  const { data: transactions } = await supabaseAdmin!
    .from('finance_transactions')
    .select('*')
    .eq('branch_id', branchId)
    .gte('transaction_date', startDate)
    .lte('transaction_date', endDate);

  const txns = transactions || [];

  // Calculate totals
  const revenue = txns.filter(t => t.transaction_type === 'revenue');
  const expenses = txns.filter(t => t.transaction_type === 'expense');

  const totalRevenue = revenue.reduce((sum, t) => sum + (t.amount || 0), 0);
  const totalExpenses = expenses.reduce((sum, t) => sum + (t.amount || 0), 0);

  // Revenue by service
  const revenueByService: Record<string, number> = {};
  revenue.forEach(t => {
    const service = t.service_type || 'Other';
    revenueByService[service] = (revenueByService[service] || 0) + (t.amount || 0);
  });

  // Revenue by payment method
  const revenueByPaymentMethod: Record<string, number> = {};
  revenue.forEach(t => {
    const method = t.payment_method || 'Unknown';
    revenueByPaymentMethod[method] = (revenueByPaymentMethod[method] || 0) + (t.amount || 0);
  });

  // Pending approvals
  const { count: pendingApprovals } = await supabaseAdmin!
    .from('finance_transactions')
    .select('id', { count: 'exact', head: true })
    .eq('branch_id', branchId)
    .eq('approval_status', 'pending');

  // Outstanding debt
  const { data: receivables } = await supabaseAdmin!
    .from('finance_receivables')
    .select('amount, paid_amount')
    .eq('branch_id', branchId)
    .in('status', ['open', 'partial', 'overdue']);

  const outstandingDebt = (receivables || []).reduce(
    (sum, r) => sum + ((r.amount || 0) - (r.paid_amount || 0)),
    0
  );

  return {
    totalRevenue,
    totalExpenses,
    netProfit: totalRevenue - totalExpenses,
    transactionCount: txns.length,
    revenueByService,
    revenueByPaymentMethod,
    pendingApprovals: pendingApprovals || 0,
    outstandingDebt,
  };
}

// ============================================
// ACCOUNTS
// ============================================

export async function getAccounts(type?: string): Promise<FinanceAccount[]> {
  if (!isSupabaseAdminConfigured()) return [];

  let query = supabaseAdmin!
    .from('finance_accounts')
    .select('*')
    .eq('is_active', true)
    .order('display_order');

  if (type) {
    query = query.eq('account_type', type);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching accounts:', error);
    return [];
  }

  return data || [];
}

// ============================================
// CUSTOMERS
// ============================================

export async function getCustomers(branchId: string): Promise<FinanceCustomer[]> {
  if (!isSupabaseAdminConfigured()) return [];

  const { data, error } = await supabaseAdmin!
    .from('finance_customers')
    .select('*')
    .eq('branch_id', branchId)
    .eq('is_active', true)
    .order('name');

  if (error) {
    console.error('Error fetching customers:', error);
    return [];
  }

  return data || [];
}

export async function findOrCreateCustomer(
  branchId: string,
  name: string,
  customerType: 'company' | 'individual' = 'individual'
): Promise<FinanceCustomer | null> {
  if (!isSupabaseAdminConfigured()) return null;

  // Try to find existing customer
  const { data: existing } = await supabaseAdmin!
    .from('finance_customers')
    .select('*')
    .eq('branch_id', branchId)
    .ilike('name', name)
    .limit(1)
    .single();

  if (existing) return existing;

  // Create new customer
  const { data: created, error } = await supabaseAdmin!
    .from('finance_customers')
    .insert({
      branch_id: branchId,
      name,
      customer_type: customerType,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating customer:', error);
    return null;
  }

  return created;
}

// ============================================
// BRANCH FINANCE SETTINGS
// ============================================

export interface BranchFinanceSettings {
  special_fund_percentage: number;
  allocation_threshold: number;
  expense_auto_approval_limit: number;
}

export async function getBranchFinanceSettings(branchId: string): Promise<BranchFinanceSettings | null> {
  if (!isSupabaseAdminConfigured()) return null;

  const { data, error } = await supabaseAdmin!
    .from('branches')
    .select('special_fund_percentage, allocation_threshold, expense_auto_approval_limit')
    .eq('id', branchId)
    .single();

  if (error) {
    console.error('Error fetching branch finance settings:', error);
    return null;
  }

  return data;
}

export async function updateBranchFinanceSettings(
  branchId: string,
  settings: Partial<BranchFinanceSettings>
): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseAdminConfigured()) {
    return { success: false, error: 'Database not configured' };
  }

  const { error } = await supabaseAdmin!
    .from('branches')
    .update(settings)
    .eq('id', branchId);

  if (error) {
    console.error('Error updating branch finance settings:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}
