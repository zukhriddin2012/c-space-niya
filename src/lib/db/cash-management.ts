// ============================================
// PR2-066: Cash Management Database Module
// ============================================
// Covers: AT-1 through AT-9
// Settings, balance calculation, inkasso deliveries,
// cash transfers, dividend spend requests, summary
// ============================================

import { supabaseAdmin } from '@/lib/supabase';
import type {
  BranchCashSettings,
  UpdateCashSettingsInput,
  CashAllocationBalance,
  InkassoDelivery,
  CreateInkassoDeliveryInput,
  CashTransfer,
  CreateCashTransferInput,
  DividendSpendRequest,
  DividendSpendStatus,
  CreateDividendSpendInput,
  ReviewDividendSpendInput,
  CashPositionSummary,
} from '@/modules/reception/types';

// ============================================
// Settings (AT-3)
// ============================================

export async function getCashSettings(branchId: string): Promise<BranchCashSettings> {
  const { data, error } = await supabaseAdmin!
    .from('branches')
    .select('id, cash_opex_percentage, cash_marketing_percentage, cash_transfer_threshold')
    .eq('id', branchId)
    .single();

  if (error) throw new Error(`Failed to get cash settings: ${error.message}`);

  return {
    branchId: data.id,
    opexPercentage: Number(data.cash_opex_percentage),
    marketingPercentage: Number(data.cash_marketing_percentage),
    transferThreshold: Number(data.cash_transfer_threshold),
  };
}

export async function updateCashSettings(
  branchId: string,
  settings: UpdateCashSettingsInput
): Promise<BranchCashSettings> {
  const { data, error } = await supabaseAdmin!
    .from('branches')
    .update({
      cash_marketing_percentage: settings.marketingPercentage,
      cash_transfer_threshold: settings.transferThreshold,
    })
    .eq('id', branchId)
    .select('id, cash_opex_percentage, cash_marketing_percentage, cash_transfer_threshold')
    .single();

  if (error) throw new Error(`Failed to update cash settings: ${error.message}`);

  return {
    branchId: data.id,
    opexPercentage: Number(data.cash_opex_percentage),
    marketingPercentage: Number(data.cash_marketing_percentage),
    transferThreshold: Number(data.cash_transfer_threshold),
  };
}

// ============================================
// Balance Calculation (AT-4) — Core Logic
// ============================================

export async function getCashAllocationBalance(branchId: string): Promise<CashAllocationBalance> {
  // Step 1: Get last transfer date
  const { data: lastTransfer } = await supabaseAdmin!
    .from('cash_transfers')
    .select('transfer_date')
    .eq('branch_id', branchId)
    .order('transfer_date', { ascending: false })
    .limit(1)
    .single();

  const lastTransferDate = lastTransfer?.transfer_date || null;

  // Step 2: Get branch settings
  const settings = await getCashSettings(branchId);

  // Step 3: Get cash payment method ID
  const { data: cashPm } = await supabaseAdmin!
    .from('payment_methods')
    .select('id')
    .eq('code', 'cash')
    .limit(1)
    .single();

  const cashPaymentMethodId = cashPm?.id;

  // Step 4: Sum non-inkasso cash transactions since last transfer
  let txnQuery = supabaseAdmin!
    .from('transactions')
    .select('amount')
    .eq('branch_id', branchId)
    .eq('is_inkasso', false)
    .eq('is_voided', false);

  if (cashPaymentMethodId) {
    txnQuery = txnQuery.eq('payment_method_id', cashPaymentMethodId);
  }
  if (lastTransferDate) {
    txnQuery = txnQuery.gt('transaction_date', lastTransferDate.split('T')[0]);
  }

  const { data: txnRows } = await txnQuery;
  const totalNonInkassoCash = (txnRows || []).reduce((sum, r) => sum + Number(r.amount), 0);

  // Step 5: Sum cash expenses since last transfer
  let expQuery = supabaseAdmin!
    .from('expenses')
    .select('amount')
    .eq('branch_id', branchId)
    .eq('payment_method', 'cash')
    .eq('is_voided', false);

  if (lastTransferDate) {
    expQuery = expQuery.gt('expense_date', lastTransferDate.split('T')[0]);
  }

  const { data: expRows } = await expQuery;
  const totalCashExpenses = (expRows || []).reduce((sum, r) => sum + Number(r.amount), 0);

  // Step 6: Sum approved dividend spends since last transfer
  let divQuery = supabaseAdmin!
    .from('dividend_spend_requests')
    .select('dividend_portion')
    .eq('branch_id', branchId)
    .eq('status', 'approved');

  if (lastTransferDate) {
    divQuery = divQuery.gt('requested_at', lastTransferDate);
  }

  const { data: divRows } = await divQuery;
  const totalDividendSpends = (divRows || []).reduce((sum, r) => sum + Number(r.dividend_portion), 0);

  // Step 7: Inkasso pending (manual calculation)
  let inkassoPendingAmount = 0;
  let inkassoPendingCount = 0;

  const { data: pendingInkasso } = await supabaseAdmin!
    .from('transactions')
    .select('id, amount')
    .eq('branch_id', branchId)
    .eq('is_inkasso', true)
    .eq('is_voided', false);

  if (pendingInkasso && pendingInkasso.length > 0) {
    // Filter out those already delivered
    const { data: deliveredItems } = await supabaseAdmin!
      .from('inkasso_delivery_items')
      .select('transaction_id');

    const deliveredSet = new Set((deliveredItems || []).map(d => d.transaction_id));

    for (const txn of pendingInkasso) {
      if (!deliveredSet.has(txn.id)) {
        inkassoPendingAmount += Number(txn.amount);
        inkassoPendingCount++;
      }
    }
  }

  // Calculate allocations
  const opexAllocated = totalNonInkassoCash * (settings.opexPercentage / 100);
  const marketingAllocated = totalNonInkassoCash * (settings.marketingPercentage / 100);
  const dividendAllocated = totalNonInkassoCash - opexAllocated - marketingAllocated;

  // Normal expenses are charged to OpEx (expenses that aren't dividend-funded)
  const normalExpenses = totalCashExpenses - totalDividendSpends;
  const opexAvailable = opexAllocated - normalExpenses;
  const marketingAvailable = marketingAllocated; // Untouched until transfer
  const dividendAvailable = dividendAllocated - totalDividendSpends;

  return {
    branchId,
    lastTransferDate,
    totalNonInkassoCash,
    settings,
    allocation: {
      opex: {
        allocated: opexAllocated,
        spent: normalExpenses,
        available: opexAvailable,
        percentage: settings.opexPercentage,
      },
      marketing: {
        allocated: marketingAllocated,
        spent: 0,
        available: marketingAvailable,
        percentage: settings.marketingPercentage,
      },
      dividend: {
        allocated: dividendAllocated,
        spent: totalDividendSpends,
        available: dividendAvailable,
        percentage: 100 - settings.opexPercentage - settings.marketingPercentage,
      },
    },
    thresholdExceeded: totalNonInkassoCash > settings.transferThreshold,
    inkassoPending: { amount: inkassoPendingAmount, count: inkassoPendingCount },
  };
}

// ============================================
// Inkasso Deliveries (AT-6)
// ============================================

export async function getUndeliveredInkassoTransactions(branchId: string) {
  // Get all inkasso=true transactions for this branch
  const { data: txns, error } = await supabaseAdmin!
    .from('transactions')
    .select(`
      id, transaction_number, customer_name, amount, transaction_date,
      service_type:service_types(name),
      agent:employees!agent_id(full_name)
    `)
    .eq('branch_id', branchId)
    .eq('is_inkasso', true)
    .eq('is_voided', false)
    .order('transaction_date', { ascending: true });

  if (error) throw new Error(`Failed to get inkasso transactions: ${error.message}`);

  // Filter out already-delivered ones
  const { data: deliveredItems } = await supabaseAdmin!
    .from('inkasso_delivery_items')
    .select('transaction_id');

  const deliveredSet = new Set((deliveredItems || []).map(d => d.transaction_id));

  const undelivered = (txns || []).filter(t => !deliveredSet.has(t.id));

  const transactions = undelivered.map((row: Record<string, unknown>) => ({
    id: row.id,
    transactionNumber: row.transaction_number,
    customerName: row.customer_name,
    serviceTypeName: (row.service_type as { name: string } | null)?.name,
    amount: Number(row.amount),
    agentName: (row.agent as { full_name: string } | null)?.full_name,
    transactionDate: row.transaction_date,
  }));

  const totalAmount = transactions.reduce((sum, t) => sum + t.amount, 0);

  return { transactions, totalAmount, count: transactions.length };
}

export async function getInkassoDeliveries(
  branchId: string,
  page: number = 1,
  pageSize: number = 20
) {
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, error, count } = await supabaseAdmin!
    .from('inkasso_deliveries')
    .select(`
      *,
      delivered_by_employee:employees!delivered_by(full_name)
    `, { count: 'exact' })
    .eq('branch_id', branchId)
    .order('delivered_date', { ascending: false })
    .range(from, to);

  if (error) throw new Error(`Failed to get inkasso deliveries: ${error.message}`);

  const deliveries: InkassoDelivery[] = (data || []).map((row: Record<string, unknown>) => ({
    id: row.id as string,
    branchId: row.branch_id as string,
    deliveredDate: row.delivered_date as string,
    deliveredByName: (row.delivered_by_employee as { full_name: string } | null)?.full_name || '',
    totalAmount: Number(row.total_amount),
    transactionCount: row.transaction_count as number,
    notes: (row.notes as string) || undefined,
    createdAt: row.created_at as string,
  }));

  return {
    data: deliveries,
    pagination: {
      total: count || 0,
      page,
      pageSize,
      totalPages: Math.ceil((count || 0) / pageSize),
    },
  };
}

export async function createInkassoDelivery(
  input: CreateInkassoDeliveryInput,
  employeeId: string
): Promise<InkassoDelivery> {
  // 1. Verify all transactions exist, are inkasso=true, not voided, not already delivered
  const { data: txns, error: txnError } = await supabaseAdmin!
    .from('transactions')
    .select('id, amount, is_inkasso, is_voided, branch_id')
    .in('id', input.transactionIds);

  if (txnError) throw new Error(`Failed to verify transactions: ${txnError.message}`);
  if (!txns || txns.length !== input.transactionIds.length) {
    throw new Error('Some transactions were not found');
  }

  for (const txn of txns) {
    if (!txn.is_inkasso) throw new Error(`Transaction ${txn.id} is not inkasso`);
    if (txn.is_voided) throw new Error(`Transaction ${txn.id} is voided`);
    if (txn.branch_id !== input.branchId) throw new Error(`Transaction ${txn.id} belongs to another branch`);
  }

  // Check for already-delivered
  const { data: existing } = await supabaseAdmin!
    .from('inkasso_delivery_items')
    .select('transaction_id')
    .in('transaction_id', input.transactionIds);

  if (existing && existing.length > 0) {
    throw new Error(`Transactions already delivered: ${existing.map(e => e.transaction_id).join(', ')}`);
  }

  const totalAmount = txns.reduce((sum, t) => sum + Number(t.amount), 0);

  // 2. Create delivery
  const { data: delivery, error: deliveryError } = await supabaseAdmin!
    .from('inkasso_deliveries')
    .insert({
      branch_id: input.branchId,
      delivered_date: input.deliveredDate || new Date().toISOString().split('T')[0],
      delivered_by: employeeId,
      total_amount: totalAmount,
      transaction_count: input.transactionIds.length,
      notes: input.notes || null,
    })
    .select('*')
    .single();

  if (deliveryError) throw new Error(`Failed to create delivery: ${deliveryError.message}`);

  // 3. Create delivery items
  const items = input.transactionIds.map(txnId => ({
    delivery_id: delivery.id,
    transaction_id: txnId,
    amount: Number(txns.find(t => t.id === txnId)?.amount || 0),
  }));

  const { error: itemsError } = await supabaseAdmin!
    .from('inkasso_delivery_items')
    .insert(items);

  if (itemsError) throw new Error(`Failed to create delivery items: ${itemsError.message}`);

  return {
    id: delivery.id,
    branchId: delivery.branch_id,
    deliveredDate: delivery.delivered_date,
    deliveredByName: '', // Will be resolved by caller
    totalAmount: Number(delivery.total_amount),
    transactionCount: delivery.transaction_count,
    notes: delivery.notes || undefined,
    createdAt: delivery.created_at,
  };
}

// ============================================
// Cash Transfers (AT-7)
// ============================================

export async function getCashTransfers(
  branchId: string,
  page: number = 1,
  pageSize: number = 20
) {
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, error, count } = await supabaseAdmin!
    .from('cash_transfers')
    .select(`
      *,
      transferred_by_employee:employees!transferred_by(full_name),
      branch:branches!branch_id(name)
    `, { count: 'exact' })
    .eq('branch_id', branchId)
    .order('transfer_date', { ascending: false })
    .range(from, to);

  if (error) throw new Error(`Failed to get cash transfers: ${error.message}`);

  const transfers: CashTransfer[] = (data || []).map((row: Record<string, unknown>) => ({
    id: row.id as string,
    branchId: row.branch_id as string,
    branchName: (row.branch as { name: string } | null)?.name,
    dividendAmount: Number(row.dividend_amount),
    marketingAmount: Number(row.marketing_amount),
    totalAmount: Number(row.total_amount),
    transferredByName: (row.transferred_by_employee as { full_name: string } | null)?.full_name || '',
    transferDate: row.transfer_date as string,
    notes: (row.notes as string) || undefined,
    createdAt: row.created_at as string,
  }));

  return {
    data: transfers,
    pagination: {
      total: count || 0,
      page,
      pageSize,
      totalPages: Math.ceil((count || 0) / pageSize),
    },
  };
}

export async function createCashTransfer(
  input: CreateCashTransferInput,
  employeeId: string
): Promise<CashTransfer> {
  // SEC-066-03: Use atomic RPC with advisory lock to prevent TOCTOU race condition
  // The PG function checks balance AND inserts under an advisory lock
  const { data: transferId, error: rpcError } = await supabaseAdmin!
    .rpc('create_cash_transfer_atomic', {
      p_branch_id: input.branchId,
      p_dividend_amount: input.dividendAmount,
      p_marketing_amount: input.marketingAmount,
      p_transferred_by: employeeId,
      p_transfer_date: input.transferDate || new Date().toISOString(),
      p_notes: input.notes || null,
    });

  if (rpcError) {
    // Map PG exceptions to safe error messages (SEC-066-08)
    if (rpcError.message?.includes('Insufficient dividend')) {
      throw new Error('Insufficient dividend balance');
    }
    if (rpcError.message?.includes('Insufficient marketing')) {
      throw new Error('Insufficient marketing balance');
    }
    throw new Error('Failed to create cash transfer');
  }

  // Fetch the created transfer with joins
  const { data, error } = await supabaseAdmin!
    .from('cash_transfers')
    .select(`
      *,
      transferred_by_employee:employees!transferred_by(full_name),
      branch:branches!branch_id(name)
    `)
    .eq('id', transferId)
    .single();

  if (error) throw new Error('Failed to fetch created transfer');

  return {
    id: data.id,
    branchId: data.branch_id,
    branchName: data.branch?.name,
    dividendAmount: Number(data.dividend_amount),
    marketingAmount: Number(data.marketing_amount),
    totalAmount: Number(data.total_amount),
    transferredByName: data.transferred_by_employee?.full_name || '',
    transferDate: data.transfer_date,
    notes: data.notes || undefined,
    createdAt: data.created_at,
  };
}

// ============================================
// Dividend Spend Requests (AT-8)
// ============================================

export async function getDividendSpendRequests(
  branchId: string,
  status?: DividendSpendStatus,
  page: number = 1,
  pageSize: number = 20
) {
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabaseAdmin!
    .from('dividend_spend_requests')
    .select(`
      *,
      requested_by_employee:employees!requested_by(full_name),
      reviewed_by_employee:employees!reviewed_by(full_name),
      expense_type:expense_types!expense_type_id(name),
      branch:branches!branch_id(name)
    `, { count: 'exact' })
    .eq('branch_id', branchId)
    .order('requested_at', { ascending: false });

  if (status) {
    query = query.eq('status', status);
  }

  query = query.range(from, to);

  const { data, error, count } = await query;

  if (error) throw new Error(`Failed to get dividend requests: ${error.message}`);

  // Get counts for all statuses
  const { data: countData } = await supabaseAdmin!
    .from('dividend_spend_requests')
    .select('status')
    .eq('branch_id', branchId);

  const counts = { pending: 0, approved: 0, rejected: 0 };
  (countData || []).forEach((r: { status: string }) => {
    if (r.status in counts) {
      counts[r.status as DividendSpendStatus]++;
    }
  });

  const requests: DividendSpendRequest[] = (data || []).map((row: Record<string, unknown>) => ({
    id: row.id as string,
    branchId: row.branch_id as string,
    branchName: (row.branch as { name: string } | null)?.name,
    expenseSubject: row.expense_subject as string,
    expenseAmount: Number(row.expense_amount),
    expenseTypeId: row.expense_type_id as string,
    expenseTypeName: (row.expense_type as { name: string } | null)?.name,
    expenseDate: row.expense_date as string,
    opexPortion: Number(row.opex_portion),
    dividendPortion: Number(row.dividend_portion),
    reason: row.reason as string,
    requestedBy: row.requested_by as string,
    requestedByName: (row.requested_by_employee as { full_name: string } | null)?.full_name,
    requestedAt: row.requested_at as string,
    status: row.status as DividendSpendStatus,
    reviewedBy: (row.reviewed_by as string) || undefined,
    reviewedByName: (row.reviewed_by_employee as { full_name: string } | null)?.full_name || undefined,
    reviewedAt: (row.reviewed_at as string) || undefined,
    reviewNote: (row.review_note as string) || undefined,
    expenseId: (row.expense_id as string) || undefined,
  }));

  return {
    data: requests,
    pagination: {
      total: count || 0,
      page,
      pageSize,
      totalPages: Math.ceil((count || 0) / pageSize),
    },
    counts,
  };
}

export async function createDividendSpendRequest(
  input: CreateDividendSpendInput,
  employeeId: string
): Promise<DividendSpendRequest> {
  // Verify balance availability
  const balance = await getCashAllocationBalance(input.branchId);

  if (input.opexPortion > balance.allocation.opex.available) {
    // SEC-066-08: Don't leak exact balance amounts in errors
    throw new Error('Insufficient OpEx balance for requested portion');
  }

  const { data, error } = await supabaseAdmin!
    .from('dividend_spend_requests')
    .insert({
      branch_id: input.branchId,
      expense_subject: input.expenseSubject,
      expense_amount: input.expenseAmount,
      expense_type_id: input.expenseTypeId,
      expense_date: input.expenseDate || new Date().toISOString().split('T')[0],
      opex_portion: input.opexPortion,
      dividend_portion: input.dividendPortion,
      reason: input.reason,
      requested_by: employeeId,
    })
    .select('*')
    .single();

  if (error) throw new Error(`Failed to create dividend request: ${error.message}`);

  return {
    id: data.id,
    branchId: data.branch_id,
    expenseSubject: data.expense_subject,
    expenseAmount: Number(data.expense_amount),
    expenseTypeId: data.expense_type_id,
    expenseDate: data.expense_date,
    opexPortion: Number(data.opex_portion),
    dividendPortion: Number(data.dividend_portion),
    reason: data.reason,
    requestedBy: data.requested_by,
    requestedAt: data.requested_at,
    status: data.status,
  };
}

export async function reviewDividendSpendRequest(
  input: ReviewDividendSpendInput,
  reviewerId: string
): Promise<DividendSpendRequest> {
  // Get the request first (for return data and pre-validation)
  const { data: request, error: fetchError } = await supabaseAdmin!
    .from('dividend_spend_requests')
    .select('*')
    .eq('id', input.requestId)
    .single();

  if (fetchError || !request) throw new Error('Dividend spend request not found');
  if (request.status !== 'pending') throw new Error('Request is no longer pending');

  if (input.action === 'approve') {
    // SEC-066-02: Use atomic RPC function (single PG transaction with row lock)
    const { data: rpcResult, error: rpcError } = await supabaseAdmin!
      .rpc('approve_dividend_spend', {
        p_request_id: input.requestId,
        p_reviewer_id: reviewerId,
        p_review_note: input.reviewNote || null,
      });

    if (rpcError) {
      if (rpcError.message?.includes('not found or no longer pending')) {
        throw new Error('Request is no longer pending');
      }
      throw new Error('Failed to approve dividend spend');
    }

    const result = rpcResult as { request_id: string; expense_id: string; status: string };

    return {
      id: request.id,
      branchId: request.branch_id,
      expenseSubject: request.expense_subject,
      expenseAmount: Number(request.expense_amount),
      expenseTypeId: request.expense_type_id,
      expenseDate: request.expense_date,
      opexPortion: Number(request.opex_portion),
      dividendPortion: Number(request.dividend_portion),
      reason: request.reason,
      requestedBy: request.requested_by,
      requestedAt: request.requested_at,
      status: 'approved',
      reviewedBy: reviewerId,
      reviewedAt: new Date().toISOString(),
      reviewNote: input.reviewNote,
      expenseId: result.expense_id,
    };
  } else {
    // Reject — single update, no atomicity concern
    const { error: updateError } = await supabaseAdmin!
      .from('dividend_spend_requests')
      .update({
        status: 'rejected',
        reviewed_by: reviewerId,
        reviewed_at: new Date().toISOString(),
        review_note: input.reviewNote || null,
      })
      .eq('id', input.requestId);

    if (updateError) throw new Error('Failed to reject dividend spend');

    return {
      id: request.id,
      branchId: request.branch_id,
      expenseSubject: request.expense_subject,
      expenseAmount: Number(request.expense_amount),
      expenseTypeId: request.expense_type_id,
      expenseDate: request.expense_date,
      opexPortion: Number(request.opex_portion),
      dividendPortion: Number(request.dividend_portion),
      reason: request.reason,
      requestedBy: request.requested_by,
      requestedAt: request.requested_at,
      status: 'rejected',
      reviewedBy: reviewerId,
      reviewedAt: new Date().toISOString(),
      reviewNote: input.reviewNote,
    };
  }
}

// ============================================
// Cash Position Summary (AT-9)
// ============================================

export async function getCashPositionSummary(branchId: string): Promise<CashPositionSummary> {
  // 1. Get balance (includes inkasso pending)
  const balance = await getCashAllocationBalance(branchId);

  // 2. Get inkasso delivered this month
  const monthStart = new Date();
  monthStart.setDate(1);
  const monthStartStr = monthStart.toISOString().split('T')[0];

  const { data: deliveredThisMonth } = await supabaseAdmin!
    .from('inkasso_deliveries')
    .select('total_amount, transaction_count')
    .eq('branch_id', branchId)
    .gte('delivered_date', monthStartStr);

  const deliveredStats = {
    amount: (deliveredThisMonth || []).reduce((sum, d) => sum + Number(d.total_amount), 0),
    count: (deliveredThisMonth || []).reduce((sum, d) => sum + d.transaction_count, 0),
  };

  // 3. Get recent transfers (last 5)
  const { data: recentTransfersData } = await supabaseAdmin!
    .from('cash_transfers')
    .select(`
      *,
      transferred_by_employee:employees!transferred_by(full_name),
      branch:branches!branch_id(name)
    `)
    .eq('branch_id', branchId)
    .order('transfer_date', { ascending: false })
    .limit(5);

  const recentTransfers: CashTransfer[] = (recentTransfersData || []).map((row: Record<string, unknown>) => ({
    id: row.id as string,
    branchId: row.branch_id as string,
    branchName: (row.branch as { name: string } | null)?.name,
    dividendAmount: Number(row.dividend_amount),
    marketingAmount: Number(row.marketing_amount),
    totalAmount: Number(row.total_amount),
    transferredByName: (row.transferred_by_employee as { full_name: string } | null)?.full_name || '',
    transferDate: row.transfer_date as string,
    notes: (row.notes as string) || undefined,
    createdAt: row.created_at as string,
  }));

  // 4. Get pending dividend requests
  const { data: pendingRequests } = await supabaseAdmin!
    .from('dividend_spend_requests')
    .select('dividend_portion')
    .eq('branch_id', branchId)
    .eq('status', 'pending');

  const pendingDividendRequests = {
    count: (pendingRequests || []).length,
    totalAmount: (pendingRequests || []).reduce((sum, r) => sum + Number(r.dividend_portion), 0),
  };

  return {
    balance,
    inkasso: {
      pending: balance.inkassoPending,
      deliveredThisMonth: deliveredStats,
    },
    recentTransfers,
    pendingDividendRequests,
  };
}
