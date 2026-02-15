// ============================================
// RECEPTION MODULE TYPES
// Based on current spreadsheets + Admin-configurable
// ============================================

// ============================================
// ADMIN CONFIGURATION TYPES
// ============================================

export interface ServiceType {
  id: string;
  name: string;      // "Meeting", "Day Pass"
  code: string;      // "meeting", "day_pass"
  icon?: string;     // "👥", "🗓️"
  description?: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface ExpenseType {
  id: string;
  name: string;      // "Goods", "Utility"
  code: string;      // "goods", "utility"
  icon?: string;     // "🛒", "⚡"
  description?: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentMethodConfig {
  id: string;
  name: string;      // "Cash", "Payme"
  code: string;      // "cash", "payme"
  icon?: string;     // "💵", "📱"
  requiresCode: boolean;  // Whether transaction code is required
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// ADMIN INPUT TYPES
// ============================================

export interface CreateServiceTypeInput {
  name: string;
  code: string;
  icon?: string;
  description?: string;
  sortOrder?: number;
}

export interface UpdateServiceTypeInput {
  name?: string;
  code?: string;
  icon?: string;
  description?: string;
  isActive?: boolean;
  sortOrder?: number;
}

export interface CreateExpenseTypeInput {
  name: string;
  code: string;
  icon?: string;
  description?: string;
  sortOrder?: number;
}

export interface UpdateExpenseTypeInput {
  name?: string;
  code?: string;
  icon?: string;
  description?: string;
  isActive?: boolean;
  sortOrder?: number;
}

export interface CreatePaymentMethodInput {
  name: string;
  code: string;
  icon?: string;
  requiresCode?: boolean;
  sortOrder?: number;
}

export interface UpdatePaymentMethodInput {
  name?: string;
  code?: string;
  icon?: string;
  requiresCode?: boolean;
  isActive?: boolean;
  sortOrder?: number;
}

// ============================================
// TRANSACTIONS (Primary - replaces current spreadsheet)
// Maps to: Date, Name, Servis turi, To'lov, Payment method, code's, Agent, Notes
// ============================================

export interface Transaction {
  id: string;
  transactionNumber: string;  // Auto-generated: TXN-YYYYMM-XXXX

  // Customer (Name column)
  customerName: string;
  customerPhone?: string;
  customerCompany?: string;

  // Service (FK to service_types)
  serviceTypeId: string;
  serviceType?: ServiceType;  // Joined from service_types

  // Payment (FK to payment_methods)
  amount: number;
  paymentMethodId: string;
  paymentMethod?: PaymentMethodConfig;  // Joined from payment_methods
  transactionCode?: string;  // Payme/Click/Uzum codes

  // Location & Agent
  branchId: string;
  branchName?: string;
  agentId: string;      // Who recorded the transaction (Agent column)
  agentName?: string;

  // Notes (Столбец 1 - room numbers, periods, etc.)
  notes?: string;

  // Cash management (PR2-066)
  isInkasso?: boolean | null;  // null=non-cash, false=cash-no-receipt, true=cash-with-receipt

  // Voiding
  isVoided: boolean;
  voidedAt?: string;
  voidedBy?: string;
  voidReason?: string;

  transactionDate: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTransactionInput {
  customerName: string;
  clientId?: string;  // Link to clients table if selected from autocomplete
  customerPhone?: string;
  customerCompany?: string;
  serviceTypeId: string;
  amount: number;
  paymentMethodId: string;
  transactionCode?: string;
  branchId?: string;  // Optional - will default to user's branch
  notes?: string;
  transactionDate?: string;
  isInkasso?: boolean;  // Cash only: true = has official receipt
}

export interface UpdateTransactionInput {
  customerName?: string;
  customerPhone?: string;
  customerCompany?: string;
  serviceTypeId?: string;
  amount?: number;
  paymentMethodId?: string;
  transactionCode?: string;
  notes?: string;
}

export interface VoidTransactionInput {
  reason: string;
}

// ============================================
// EXPENSES (Based on "All Payments - LABZAK" spreadsheet)
// Maps to: Full date, Subject, Price, Type, Comments (Cash/Bank)
// ============================================

// Expense payment method (simpler - just Cash or Bank)
export type ExpensePaymentMethod = 'cash' | 'bank';

export interface Expense {
  id: string;
  expenseNumber: string;  // Auto-generated: EXP-YYYYMM-XXXX

  // From spreadsheet
  subject: string;         // "Subject" column - vendor/description
  description?: string;    // Additional details
  amount: number;          // "Price" column

  // Type (FK to expense_types)
  expenseTypeId: string;
  expenseType?: ExpenseType;  // Joined from expense_types

  paymentMethod: ExpensePaymentMethod;  // "Comments" column (Cash/Bank)

  // Location & User
  branchId: string;
  branchName?: string;
  recordedBy: string;
  recordedByName?: string;

  // Voiding
  isVoided: boolean;
  voidedAt?: string;
  voidedBy?: string;
  voidReason?: string;

  expenseDate: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateExpenseInput {
  subject: string;
  description?: string;
  amount: number;
  expenseTypeId: string;
  paymentMethod: ExpensePaymentMethod;
  branchId?: string;  // Optional - will default to user's branch
  expenseDate?: string;
}

export interface UpdateExpenseInput {
  subject?: string;
  amount?: number;
  expenseTypeId?: string;
  paymentMethod?: ExpensePaymentMethod;
}

export interface VoidExpenseInput {
  reason: string;
}

// ============================================
// FILTER TYPES
// ============================================

export interface TransactionFilters {
  branchId?: string;
  serviceTypeId?: string;
  paymentMethodId?: string;
  agentId?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  includeVoided?: boolean;
}

export interface ExpenseFilters {
  branchId?: string;
  expenseTypeId?: string;
  paymentMethod?: ExpensePaymentMethod;
  recordedBy?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  includeVoided?: boolean;
}

// ============================================
// SUMMARY TYPES
// ============================================

export interface TransactionSummary {
  totalAmount: number;
  count: number;
  byServiceType: {
    serviceTypeId: string;
    serviceTypeName: string;
    amount: number;
    count: number;
  }[];
  byPaymentMethod: {
    paymentMethodId: string;
    paymentMethodName: string;
    amount: number;
    count: number;
  }[];
  byAgent: {
    agentId: string;
    agentName: string;
    amount: number;
    count: number;
  }[];
}

export interface ExpenseSummary {
  totalAmount: number;
  count: number;
  byCash: number;
  byBank: number;
  byExpenseType: {
    expenseTypeId: string;
    expenseTypeName: string;
    amount: number;
    count: number;
  }[];
}

// ============================================
// API RESPONSE TYPES
// ============================================

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ApiError {
  error: string;
  details?: string | string[];
}

// ============================================
// DATABASE ROW TYPES (for Supabase queries)
// ============================================

export interface ServiceTypeRow {
  id: string;
  name: string;
  code: string;
  icon: string | null;
  description: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface ExpenseTypeRow {
  id: string;
  name: string;
  code: string;
  icon: string | null;
  description: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface PaymentMethodRow {
  id: string;
  name: string;
  code: string;
  icon: string | null;
  requires_code: boolean;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface TransactionRow {
  id: string;
  transaction_number: string;
  customer_name: string;
  customer_phone: string | null;
  customer_company: string | null;
  service_type_id: string;
  amount: number;
  payment_method_id: string;
  transaction_code: string | null;
  branch_id: string;
  agent_id: string;
  notes: string | null;
  is_voided: boolean;
  voided_at: string | null;
  voided_by: string | null;
  void_reason: string | null;
  transaction_date: string;
  created_at: string;
  updated_at: string;
}

export interface ExpenseRow {
  id: string;
  expense_number: string;
  subject: string;
  description: string | null;
  amount: number;
  expense_type_id: string;
  payment_method: ExpensePaymentMethod;
  branch_id: string;
  recorded_by: string;
  is_voided: boolean;
  voided_at: string | null;
  voided_by: string | null;
  void_reason: string | null;
  expense_date: string;
  created_at: string;
  updated_at: string;
}

// ============================================
// UTILITY FUNCTIONS FOR TRANSFORMING ROW TO INTERFACE
// ============================================

export function transformServiceType(row: ServiceTypeRow): ServiceType {
  return {
    id: row.id,
    name: row.name,
    code: row.code,
    icon: row.icon ?? undefined,
    description: row.description ?? undefined,
    isActive: row.is_active,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function transformExpenseType(row: ExpenseTypeRow): ExpenseType {
  return {
    id: row.id,
    name: row.name,
    code: row.code,
    icon: row.icon ?? undefined,
    description: row.description ?? undefined,
    isActive: row.is_active,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function transformPaymentMethod(row: PaymentMethodRow): PaymentMethodConfig {
  return {
    id: row.id,
    name: row.name,
    code: row.code,
    icon: row.icon ?? undefined,
    requiresCode: row.requires_code,
    isActive: row.is_active,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function transformTransaction(row: TransactionRow): Transaction {
  return {
    id: row.id,
    transactionNumber: row.transaction_number,
    customerName: row.customer_name,
    customerPhone: row.customer_phone ?? undefined,
    customerCompany: row.customer_company ?? undefined,
    serviceTypeId: row.service_type_id,
    amount: Number(row.amount),
    paymentMethodId: row.payment_method_id,
    transactionCode: row.transaction_code ?? undefined,
    branchId: row.branch_id,
    agentId: row.agent_id,
    notes: row.notes ?? undefined,
    isVoided: row.is_voided,
    voidedAt: row.voided_at ?? undefined,
    voidedBy: row.voided_by ?? undefined,
    voidReason: row.void_reason ?? undefined,
    transactionDate: row.transaction_date,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function transformExpense(row: ExpenseRow): Expense {
  return {
    id: row.id,
    expenseNumber: row.expense_number,
    subject: row.subject,
    description: row.description ?? undefined,
    amount: Number(row.amount),
    expenseTypeId: row.expense_type_id,
    paymentMethod: row.payment_method,
    branchId: row.branch_id,
    recordedBy: row.recorded_by,
    isVoided: row.is_voided,
    voidedAt: row.voided_at ?? undefined,
    voidedBy: row.voided_by ?? undefined,
    voidReason: row.void_reason ?? undefined,
    expenseDate: row.expense_date,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ============================================
// BRANCH ACCESS TYPES
// ============================================

export interface ReceptionBranchAccess {
  id: string;
  userId: string;
  branchId: string;
  grantedBy: string;
  grantedAt: string;
  notes?: string;
  // Joined data
  userName?: string;
  branchName?: string;
  grantedByName?: string;
  // CSN-029: Auto-grant tracking
  autoGrantedFrom?: string;  // UUID of source assignment
}

export interface BranchOption {
  id: string;
  name: string;
  code?: string;
  isAllBranches?: boolean;  // For "All Branches" option (executives only)
  isAssigned?: boolean;      // Is this the user's assigned branch?
  isGranted?: boolean;       // Was access granted via reception_branch_access?
  // CSN-029: Assignment fields
  isFromAssignment?: boolean;  // Is this branch available via assignment?
  assignmentType?: AssignmentType;
  assignmentEndsAt?: string;   // ISO datetime string
}

export interface ReceptionBranchAccessRow {
  id: string;
  user_id: string;
  branch_id: string;
  granted_by: string;
  granted_at: string;
  notes: string | null;
  auto_granted_from: string | null;
}

export function transformBranchAccess(row: ReceptionBranchAccessRow): ReceptionBranchAccess {
  return {
    id: row.id,
    userId: row.user_id,
    branchId: row.branch_id,
    grantedBy: row.granted_by,
    grantedAt: row.granted_at,
    notes: row.notes ?? undefined,
    autoGrantedFrom: row.auto_granted_from ?? undefined,
  };
}

// ============================================
// OPERATOR SWITCH TYPES (R6a)
// ============================================

export interface OperatorIdentity {
  id: string;
  name: string;
  branchId: string;
  isCrossBranch: boolean;
  homeBranchId?: string;
  homeBranchName?: string;
}

export interface OperatorSwitchInput {
  pin: string;       // 6-digit PIN as string
  branchId: string;  // current terminal branch
}

export interface CrossBranchSwitchInput {
  employeeId: string;  // selected from search
  pin: string;
  branchId: string;    // current terminal branch
}

export interface OperatorSwitchResult {
  success: boolean;
  operator?: OperatorIdentity;
  error?: 'invalid_pin' | 'locked' | 'no_pin_set' | 'employee_not_found';
  lockoutRemainingSeconds?: number;
  attemptsRemaining?: number;
}

export interface SetOperatorPinInput {
  pin: string;  // 6-digit string
  employeeId?: string;  // admin can set for others
}

// ═══ Operator Switch Log ═══

export interface OperatorSwitchLog {
  id: string;
  branchId: string;
  sessionUserId: string;
  switchedToId: string;
  switchedToName?: string;
  isCrossBranch: boolean;
  homeBranchId?: string;
  ipAddress?: string;
  createdAt: string;
}

export interface OperatorSwitchLogRow {
  id: string;
  branch_id: string;
  session_user_id: string;
  switched_to_id: string;
  is_cross_branch: boolean;
  home_branch_id: string | null;
  ip_address: string | null;
  created_at: string;
}

export function transformOperatorSwitchLog(row: OperatorSwitchLogRow): OperatorSwitchLog {
  return {
    id: row.id,
    branchId: row.branch_id,
    sessionUserId: row.session_user_id,
    switchedToId: row.switched_to_id,
    isCrossBranch: row.is_cross_branch,
    homeBranchId: row.home_branch_id ?? undefined,
    ipAddress: row.ip_address ?? undefined,
    createdAt: row.created_at,
  };
}

// ═══ Branch Employee Assignment (cross-branch coverage) ═══

// CSN-029: Assignment types
export type AssignmentType = 'temporary' | 'regular' | 'permanent_transfer';

export interface BranchAssignment {
  id: string;
  employeeId: string;
  employeeName?: string;
  employeeTelegramId?: string;
  homeBranchId: string;
  homeBranchName?: string;
  assignedBranchId: string;
  assignedBranchName?: string;
  assignedBy: string;
  assignedByName?: string;
  startsAt: string;
  endsAt?: string;
  removedAt?: string;
  createdAt: string;
  // CSN-029: New fields
  assignmentType: AssignmentType;
  notes?: string;
}

export interface BranchAssignmentRow {
  id: string;
  employee_id: string;
  home_branch_id: string;
  assigned_branch_id: string;
  assigned_by: string;
  starts_at: string;
  ends_at: string | null;
  removed_at: string | null;
  created_at: string;
  // CSN-029: New fields
  assignment_type: string;
  notes: string | null;
}

export function transformBranchAssignment(row: BranchAssignmentRow): BranchAssignment {
  return {
    id: row.id,
    employeeId: row.employee_id,
    homeBranchId: row.home_branch_id,
    assignedBranchId: row.assigned_branch_id,
    assignedBy: row.assigned_by,
    startsAt: row.starts_at,
    endsAt: row.ends_at ?? undefined,
    removedAt: row.removed_at ?? undefined,
    createdAt: row.created_at,
    assignmentType: row.assignment_type as AssignmentType,
    notes: row.notes ?? undefined,
  };
}

// CSN-029 AT-6: Branch Briefing
export interface BranchBriefing {
  branchId: string;
  branchName: string;
  todaySummary: {
    transactionCount: number;
    transactionTotal: number;
    expenseCount: number;
    expenseTotal: number;
    netAmount: number;
  };
  activeOperators: Array<{
    employeeId: string;
    employeeName: string;
    switchedAt: string;
    isCrossBranch: boolean;
  }>;
  branchSettings: {
    serviceTypeCount: number;
    expenseTypeCount: number;
    paymentMethodCount: number;
    serviceTypeNames: string[];
    expenseTypeNames: string[];
    paymentMethodNames: string[];
  };
  recentActivity: Array<{
    type: 'transaction' | 'expense';
    id: string;
    description: string;
    amount: number;
    operatorName: string;
    timestamp: string;
  }>;
}

// ═══ Employee search result (for cross-branch) ═══

export interface EmployeeSearchResult {
  id: string;
  name: string;
  branchId: string;
  branchName: string;
  role: string;
  hasPinSet: boolean;
}

// ============================================
// CASH MANAGEMENT (PR2-066: AT-1 through AT-9)
// ============================================

// Branch cash settings (AT-3)
export interface BranchCashSettings {
  branchId: string;
  opexPercentage: number;
  marketingPercentage: number;
  transferThreshold: number;
}

export interface UpdateCashSettingsInput {
  branchId: string;
  marketingPercentage: 2.5 | 5.0;
  transferThreshold: number;
}

// Cash allocation balance (AT-4)
export interface AllocationBox {
  allocated: number;
  spent: number;
  available: number;
  percentage: number;
}

export interface CashAllocationBalance {
  branchId: string;
  lastTransferDate: string | null;
  totalNonInkassoCash: number;
  settings: BranchCashSettings;
  allocation: {
    opex: AllocationBox;
    marketing: AllocationBox;
    dividend: AllocationBox;
  };
  thresholdExceeded: boolean;
  inkassoPending: { amount: number; count: number };
}

// Inkasso delivery (AT-6)
export interface InkassoDelivery {
  id: string;
  branchId: string;
  deliveredDate: string;
  deliveredByName: string;
  totalAmount: number;
  transactionCount: number;
  notes?: string;
  createdAt: string;
}

export interface CreateInkassoDeliveryInput {
  branchId: string;
  transactionIds: string[];
  deliveredDate?: string;
  notes?: string;
}

// Cash transfer (AT-7)
export interface CashTransfer {
  id: string;
  branchId: string;
  branchName?: string;
  dividendAmount: number;
  marketingAmount: number;
  totalAmount: number;
  transferredByName: string;
  transferDate: string;
  notes?: string;
  createdAt: string;
}

export interface CreateCashTransferInput {
  branchId: string;
  dividendAmount: number;
  marketingAmount: number;
  transferDate?: string;
  notes?: string;
}

// Dividend spend request (AT-8)
export type DividendSpendStatus = 'pending' | 'approved' | 'rejected';

export interface DividendSpendRequest {
  id: string;
  branchId: string;
  branchName?: string;
  expenseSubject: string;
  expenseAmount: number;
  expenseTypeId: string;
  expenseTypeName?: string;
  expenseDate: string;
  opexPortion: number;
  dividendPortion: number;
  reason: string;
  requestedBy: string;
  requestedByName?: string;
  requestedAt: string;
  status: DividendSpendStatus;
  reviewedBy?: string;
  reviewedByName?: string;
  reviewedAt?: string;
  reviewNote?: string;
  expenseId?: string;
}

export interface CreateDividendSpendInput {
  branchId: string;
  expenseSubject: string;
  expenseAmount: number;
  expenseTypeId: string;
  expenseDate?: string;
  opexPortion: number;
  dividendPortion: number;
  reason: string;
}

export interface ReviewDividendSpendInput {
  requestId: string;
  action: 'approve' | 'reject';
  reviewNote?: string;
}

// Cash position summary (AT-9)
export interface CashPositionSummary {
  balance: CashAllocationBalance;
  inkasso: {
    pending: { amount: number; count: number };
    deliveredThisMonth: { amount: number; count: number };
  };
  recentTransfers: CashTransfer[];
  pendingDividendRequests: { count: number; totalAmount: number };
}
