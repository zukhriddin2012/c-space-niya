// ============================================
// BRANCH PROFIT DEALS
// ============================================

export interface BranchProfitDeal {
  id: string;
  branchId: string;
  branchName?: string;
  investorName: string;
  cspacePercentage: number;
  investorPercentage: number;
  effectiveFrom: string;      // ISO date string YYYY-MM-DD
  effectiveUntil: string | null; // null = active
  notes: string | null;
  createdAt: string;
  createdBy: string | null;
  createdByName?: string;
}

export interface BranchProfitDealRow {
  id: string;
  branch_id: string;
  investor_name: string;
  cspace_percentage: number;
  investor_percentage: number;
  effective_from: string;
  effective_until: string | null;
  notes: string | null;
  created_at: string;
  created_by: string | null;
}

export interface CreateBranchProfitDealInput {
  branchId: string;
  investorName: string;
  cspacePercentage: number;
  investorPercentage: number;
  effectiveFrom: string;       // YYYY-MM-DD
  notes?: string;
}

export function transformBranchProfitDeal(row: BranchProfitDealRow): BranchProfitDeal {
  return {
    id: row.id,
    branchId: row.branch_id,
    investorName: row.investor_name,
    cspacePercentage: Number(row.cspace_percentage),
    investorPercentage: Number(row.investor_percentage),
    effectiveFrom: row.effective_from,
    effectiveUntil: row.effective_until,
    notes: row.notes,
    createdAt: row.created_at,
    createdBy: row.created_by,
  };
}

// ============================================
// FINANCE DASHBOARD API RESPONSE
// ============================================

export type TrendDirection = 'up' | 'down' | 'flat';

export interface PeriodTotals {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  cspaceProfit: number;
  investorPayouts: number;
}

export interface PeriodComparison {
  current: PeriodTotals;
  previous: PeriodTotals;
  deltas: {
    revenue: { percentage: number; trend: TrendDirection };
    expenses: { percentage: number; trend: TrendDirection };
    netProfit: { percentage: number; trend: TrendDirection };
    cspaceProfit: { percentage: number; trend: TrendDirection };
    investorPayouts: { percentage: number; trend: TrendDirection };
  };
}

export interface BranchFinancials {
  branchId: string;
  branchName: string;
  investorName: string;
  revenue: number;
  expenses: number;
  netProfit: number;
  cspacePercentage: number;
  investorPercentage: number;
  cspaceShare: number;       // netProfit * cspacePercentage / 100
  investorShare: number;     // netProfit * investorPercentage / 100
  transactionCount: number;
  expenseCount: number;
  trend: {
    percentage: number;
    direction: TrendDirection;
  };
}

export interface BreakdownItem {
  id: string;
  name: string;
  icon?: string;
  amount: number;
  count: number;
  percentage: number;        // percentage of total
}

export interface PaymentMethodBreakdown {
  branchId: string;
  branchName: string;
  methods: {
    id: string;
    name: string;
    amount: number;
    percentage: number;
  }[];
}

export interface FinanceDashboardResponse {
  period: {
    startDate: string;
    endDate: string;
  };
  comparison: PeriodComparison;
  branches: BranchFinancials[];
  breakdowns: {
    revenueByServiceType: BreakdownItem[];    // top 5 + Other
    expensesByCategory: BreakdownItem[];       // all categories
    revenueByPaymentMethod: BreakdownItem[];   // all methods
    paymentMethodsByBranch: PaymentMethodBreakdown[];
  };
}

// ============================================
// SUMMARY FOOTER TYPES (for transactions/expenses pages)
// ============================================

export interface TransactionSummaryTotals {
  totalRevenue: number;
  transactionCount: number;
  cashTotal: number;
  digitalTotal: number;     // Payme + Click + Uzum + Terminal
  bankTotal: number;
}

export interface ExpenseSummaryTotals {
  totalExpenses: number;
  expenseCount: number;
  cashTotal: number;
  bankTotal: number;
}
