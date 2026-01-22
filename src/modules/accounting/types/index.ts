// ============================================
// ACCOUNTING MODULE TYPES
// ============================================

export type AccountingRequestType = 'reconciliation' | 'payment' | 'confirmation';

export type AccountingRequestStatus =
  | 'pending'
  | 'in_progress'
  | 'needs_info'
  | 'pending_approval'
  | 'approved'
  | 'completed'
  | 'rejected'
  | 'cancelled';

export type RequestPriority = 'normal' | 'urgent';

export type PaymentCategory =
  | 'office_supplies'
  | 'rent'
  | 'utilities'
  | 'services'
  | 'equipment'
  | 'marketing'
  | 'salary_hr'
  | 'other';

export type ConfirmationResponse = 'paid' | 'not_paid' | 'partial';

export type ApprovalLevel = 'chief_accountant' | 'executive';

export type AttachmentType = 'supporting' | 'result' | 'proof';

// ============================================
// MAIN ACCOUNTING REQUEST INTERFACE
// ============================================

export interface AccountingRequest {
  id: string;
  requestNumber: string;
  requestType: AccountingRequestType;
  status: AccountingRequestStatus;
  priority: RequestPriority;

  // Requester Info
  requesterId: string;
  requesterName?: string;
  branchId: string;
  branchName?: string;

  // Entity
  fromEntityId: string;
  fromEntityName?: string;

  // Common Fields
  title: string;
  description?: string;
  notes?: string;

  // Reconciliation Fields
  tenantName?: string;
  tenantInn?: string;
  contractNumber?: string;
  contractStartDate?: string;
  contractEndDate?: string;
  reconciliationPeriodStart?: string;
  reconciliationPeriodEnd?: string;

  // Payment Fields
  recipientName?: string;
  recipientInn?: string;
  amount?: number;
  paymentCategory?: PaymentCategory;
  paymentPurpose?: string;
  invoiceNumber?: string;

  // Confirmation Fields
  clientName?: string;
  clientInn?: string;
  expectedAmount?: number;
  expectedDate?: string;

  // Response Fields
  confirmationResponse?: ConfirmationResponse;
  confirmedAmount?: number;
  paymentDate?: string;
  responseNotes?: string;

  // Processing
  assignedTo?: string;
  assigneeName?: string;
  assignedAt?: string;

  // Approval
  requiresApproval: boolean;
  approvalLevel?: ApprovalLevel;
  currentApprovalStep: number;

  // Resolution
  resolutionNotes?: string;
  completedAt?: string;
  completedBy?: string;

  // Rejection
  rejectedAt?: string;
  rejectedBy?: string;
  rejectionReason?: string;

  // Edit Request
  editRequested: boolean;
  editRequestReason?: string;

  // Cancellation
  cancelledAt?: string;
  cancelledBy?: string;
  cancellationReason?: string;

  // SLA
  slaDeadline?: string;
  slaBreached: boolean;

  // Timestamps
  createdAt: string;
  updatedAt: string;

  // Relations (when fetched)
  attachments?: AccountingAttachment[];
  comments?: AccountingComment[];
  approvals?: AccountingApproval[];
}

export interface AccountingAttachment {
  id: string;
  requestId: string;
  uploadedBy: string;
  uploaderName?: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  fileUrl: string;
  attachmentType: AttachmentType;
  createdAt: string;
}

export interface AccountingComment {
  id: string;
  requestId: string;
  authorId: string;
  authorName?: string;
  content: string;
  isInternal: boolean;
  createdAt: string;
}

export interface AccountingApproval {
  id: string;
  requestId: string;
  approvalStep: number;
  approvalLevel: ApprovalLevel;
  status: 'pending' | 'approved' | 'rejected';
  approvedBy?: string;
  approverName?: string;
  approvedAt?: string;
  rejectedBy?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  comments?: string;
  createdAt: string;
}

// ============================================
// FORM INPUT TYPES
// ============================================

export interface CreateReconciliationInput {
  requestType: 'reconciliation';
  fromEntityId: string;
  branchId: string;
  priority: RequestPriority;
  tenantName: string;
  tenantInn: string;
  contractNumber?: string;
  contractStartDate?: string;
  contractEndDate?: string;
  reconciliationPeriodStart: string;
  reconciliationPeriodEnd: string;
  notes?: string;
}

export interface CreatePaymentInput {
  requestType: 'payment';
  fromEntityId: string;
  branchId: string;
  priority: RequestPriority;
  recipientName: string;
  recipientInn?: string;
  amount: number;
  paymentCategory: PaymentCategory;
  paymentPurpose: string;
  contractNumber?: string;
  invoiceNumber?: string;
  notes?: string;
}

export interface CreateConfirmationInput {
  requestType: 'confirmation';
  fromEntityId: string;
  branchId: string;
  priority: RequestPriority;
  clientName: string;
  clientInn?: string;
  expectedAmount?: number;
  expectedDate?: string;
  invoiceNumber?: string;
  notes?: string;
}

export type CreateAccountingRequestInput =
  | CreateReconciliationInput
  | CreatePaymentInput
  | CreateConfirmationInput;

// ============================================
// FILTER & DASHBOARD TYPES
// ============================================

export interface AccountingRequestFilters {
  status?: AccountingRequestStatus[];
  requestType?: AccountingRequestType[];
  branchId?: string;
  priority?: RequestPriority;
  requesterId?: string;
  assignedTo?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}

export interface AccountingDashboardStats {
  total: number;
  pending: number;
  inProgress: number;
  completed: number;
  rejected: number;
  slaBreached: number;
  byType: {
    reconciliation: number;
    payment: number;
    confirmation: number;
  };
  byBranch: {
    branchId: string;
    branchName: string;
    count: number;
  }[];
}
