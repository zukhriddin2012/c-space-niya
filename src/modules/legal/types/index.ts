// ============================================
// LEGAL MODULE TYPES
// Reception Mode v2 — Legal Request Lifecycle
// ============================================

// ═══ Enums ═══

export type LegalRequestType =
  | 'contract_preparation'
  | 'supplementary_agreement'
  | 'contract_termination'
  | 'website_registration'
  | 'guarantee_letter';

export type LegalRequestStatus =
  | 'submitted'
  | 'under_review'
  | 'in_progress'
  | 'ready'
  | 'completed'
  | 'rejected';

export type ContractTypeCode = 'А' | 'ОА' | 'EI' | 'C' | 'E' | 'N';
export type PaymentForm = 'wire' | 'cash' | 'usd';
export type PaymentPeriod = 'monthly' | 'quarterly' | 'prepaid' | 'one_time';
export type ChangeType = 'discount' | 'area' | 'office' | 'payment_format' | 'other';

// ═══ Metadata per request type (discriminated union) ═══

export interface ContractPreparationMetadata {
  contractType: ContractTypeCode;
  paymentForm: PaymentForm;
  serviceCost: number;
  paymentPeriod: PaymentPeriod;
  startDate: string;   // ISO date
  endDate: string;
  areaSqm?: number;
  officeNumber?: string;
  workstations?: number;
  tariff?: string;
  registrationRequired: boolean;
  additionalConditions?: string;
}

export interface SupplementaryAgreementMetadata {
  changeType: ChangeType;
  changeDescription: string;
  effectiveDate: string;
}

export interface ContractTerminationMetadata {
  terminationDate: string;
  hasDebt: boolean;
  debtAmount?: number;  // in UZS, required if hasDebt = true
}

export interface WebsiteRegistrationMetadata {
  companyName: string;
  inn: string;
  branchName: string;
  registrationPeriod: string;
  phone: string;
  monthlyAmount: number;
  paymentStatus: string;
  contractNumber: string;
}

export interface GuaranteeLetterMetadata {
  futureCompanyName: string;
  directorFullName: string;
  requiredAreaSqm: number;
}

export type LegalRequestMetadata =
  | ContractPreparationMetadata
  | SupplementaryAgreementMetadata
  | ContractTerminationMetadata
  | WebsiteRegistrationMetadata
  | GuaranteeLetterMetadata;

// ═══ Metadata-to-type mapping (for type narrowing) ═══

export const LEGAL_REQUEST_TYPE_LABELS: Record<LegalRequestType, string> = {
  contract_preparation: 'Contract Preparation',
  supplementary_agreement: 'Supplementary Agreement',
  contract_termination: 'Contract Termination',
  website_registration: 'Website Registration',
  guarantee_letter: 'Guarantee Letter',
};

export const LEGAL_STATUS_LABELS: Record<LegalRequestStatus, string> = {
  submitted: 'Submitted',
  under_review: 'Under Review',
  in_progress: 'In Progress',
  ready: 'Ready',
  completed: 'Completed',
  rejected: 'Rejected',
};

export const CONTRACT_TYPE_LABELS: Record<ContractTypeCode, string> = {
  'А': 'Аренда (Rent)',
  'ОА': 'Общая аренда (Shared Rent)',
  'EI': 'Единый платеж (Single Payment)',
  'C': 'Сервис (Service)',
  'E': 'Эвент (Event)',
  'N': 'Новый (New)',
};

// ═══ Status transition rules ═══

export const LEGAL_STATUS_TRANSITIONS: Record<LegalRequestStatus, LegalRequestStatus[]> = {
  submitted: ['under_review', 'rejected'],
  under_review: ['in_progress', 'rejected'],
  in_progress: ['ready', 'under_review'],
  ready: ['completed'],
  completed: [],
  rejected: [],
};

// ═══ Main domain type (camelCase) ═══

export interface LegalRequest {
  id: string;
  requestNumber: string;
  requestType: LegalRequestType;
  status: LegalRequestStatus;
  branchId: string;
  submittedBy: string;
  submittedByName?: string;
  submittedByOperator?: string;
  submittedByOperatorName?: string;
  assignedTo?: string;
  assignedToName?: string;
  assignedAt?: string;
  metadata: LegalRequestMetadata;
  resolutionNotes?: string;
  resolvedAt?: string;
  resolvedBy?: string;
  rejectionReason?: string;
  rejectedAt?: string;
  rejectedBy?: string;
  voidedAt?: string;
  voidedBy?: string;
  voidReason?: string;
  createdAt: string;
  updatedAt: string;
  // Relations (loaded on detail view)
  attachments?: LegalRequestAttachment[];
  comments?: LegalRequestComment[];
  statusHistory?: LegalRequestStatusChange[];
}

// ═══ Database row type (snake_case) ═══

export interface LegalRequestRow {
  id: string;
  request_number: string;
  request_type: LegalRequestType;
  status: LegalRequestStatus;
  branch_id: string;
  submitted_by: string;
  submitted_by_operator: string | null;
  assigned_to: string | null;
  assigned_at: string | null;
  metadata: Record<string, unknown>;  // raw JSONB
  resolution_notes: string | null;
  resolved_at: string | null;
  resolved_by: string | null;
  rejection_reason: string | null;
  rejected_at: string | null;
  rejected_by: string | null;
  voided_at: string | null;
  voided_by: string | null;
  void_reason: string | null;
  created_at: string;
  updated_at: string;
}

// ═══ Transform: metadata JSONB → typed metadata ═══

export function transformMetadata(
  requestType: LegalRequestType,
  raw: Record<string, unknown>
): LegalRequestMetadata {
  // The JSONB is stored with camelCase keys matching our TypeScript interfaces.
  // We cast based on request type for the discriminated union.
  switch (requestType) {
    case 'contract_preparation':
      return raw as unknown as ContractPreparationMetadata;
    case 'supplementary_agreement':
      return raw as unknown as SupplementaryAgreementMetadata;
    case 'contract_termination':
      return raw as unknown as ContractTerminationMetadata;
    case 'website_registration':
      return raw as unknown as WebsiteRegistrationMetadata;
    case 'guarantee_letter':
      return raw as unknown as GuaranteeLetterMetadata;
    default:
      return raw as unknown as LegalRequestMetadata;
  }
}

// ═══ Transform: DB row → domain type ═══

export function transformLegalRequest(row: LegalRequestRow): LegalRequest {
  return {
    id: row.id,
    requestNumber: row.request_number,
    requestType: row.request_type,
    status: row.status,
    branchId: row.branch_id,
    submittedBy: row.submitted_by,
    submittedByOperator: row.submitted_by_operator ?? undefined,
    assignedTo: row.assigned_to ?? undefined,
    assignedAt: row.assigned_at ?? undefined,
    metadata: transformMetadata(row.request_type, row.metadata),
    resolutionNotes: row.resolution_notes ?? undefined,
    resolvedAt: row.resolved_at ?? undefined,
    resolvedBy: row.resolved_by ?? undefined,
    rejectionReason: row.rejection_reason ?? undefined,
    rejectedAt: row.rejected_at ?? undefined,
    rejectedBy: row.rejected_by ?? undefined,
    voidedAt: row.voided_at ?? undefined,
    voidedBy: row.voided_by ?? undefined,
    voidReason: row.void_reason ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ═══ Input types ═══

export interface CreateLegalRequestInput {
  requestType: LegalRequestType;
  branchId: string;
  metadata: LegalRequestMetadata;
  attachments?: File[];
}

export interface UpdateLegalRequestInput {
  status?: LegalRequestStatus;
  assignedTo?: string;
  resolutionNotes?: string;
  rejectionReason?: string;
}

// ═══ Related types ═══

export interface LegalRequestAttachment {
  id: string;
  requestId: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  fileUrl: string;
  uploadedBy: string;
  uploadedByName?: string;
  createdAt: string;
}

export interface LegalRequestAttachmentRow {
  id: string;
  request_id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  file_url: string;
  uploaded_by: string;
  created_at: string;
}

export function transformLegalAttachment(row: LegalRequestAttachmentRow): LegalRequestAttachment {
  return {
    id: row.id,
    requestId: row.request_id,
    fileName: row.file_name,
    fileType: row.file_type,
    fileSize: row.file_size,
    fileUrl: row.file_url,
    uploadedBy: row.uploaded_by,
    createdAt: row.created_at,
  };
}

export interface LegalRequestComment {
  id: string;
  requestId: string;
  authorId: string;
  authorName?: string;
  content: string;
  isInternal: boolean;
  createdAt: string;
}

export interface LegalRequestCommentRow {
  id: string;
  request_id: string;
  author_id: string;
  content: string;
  is_internal: boolean;
  created_at: string;
}

export function transformLegalComment(row: LegalRequestCommentRow): LegalRequestComment {
  return {
    id: row.id,
    requestId: row.request_id,
    authorId: row.author_id,
    content: row.content,
    isInternal: row.is_internal,
    createdAt: row.created_at,
  };
}

export interface LegalRequestStatusChange {
  id: string;
  requestId: string;
  oldStatus: LegalRequestStatus | null;
  newStatus: LegalRequestStatus;
  changedBy: string;
  changedByName?: string;
  notes?: string;
  createdAt: string;
}

export interface LegalRequestStatusChangeRow {
  id: string;
  request_id: string;
  old_status: LegalRequestStatus | null;
  new_status: LegalRequestStatus;
  changed_by: string;
  notes: string | null;
  created_at: string;
}

export function transformLegalStatusChange(row: LegalRequestStatusChangeRow): LegalRequestStatusChange {
  return {
    id: row.id,
    requestId: row.request_id,
    oldStatus: row.old_status,
    newStatus: row.new_status,
    changedBy: row.changed_by,
    notes: row.notes ?? undefined,
    createdAt: row.created_at,
  };
}

// ═══ Filter types ═══

export interface LegalRequestFilters {
  status?: LegalRequestStatus[];
  requestType?: LegalRequestType[];
  branchId?: string;
  assignedTo?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
}

// ═══ Dashboard stats ═══

export interface LegalDashboardStats {
  total: number;
  byStatus: Record<LegalRequestStatus, number>;
  byType: Record<LegalRequestType, number>;
  byBranch: {
    branchId: string;
    branchName: string;
    count: number;
  }[];
}
