import {
  STATUS_LABELS,
  STATUS_COLORS,
  REQUEST_TYPE_LABELS,
  REQUEST_TYPE_COLORS,
  PRIORITY_LABELS,
  PRIORITY_COLORS,
  PAYMENT_CATEGORIES,
  CONFIRMATION_RESPONSE_LABELS,
  APPROVAL_THRESHOLDS,
} from './constants';
import type {
  AccountingRequestStatus,
  AccountingRequestType,
  RequestPriority,
  PaymentCategory,
  ConfirmationResponse,
  ApprovalLevel,
} from '../types';

type Language = 'en' | 'ru';

// ============================================
// LABEL GETTERS
// ============================================

export function getStatusLabel(status: AccountingRequestStatus, lang: Language = 'en'): string {
  return STATUS_LABELS[status]?.[lang] ?? status;
}

export function getStatusColor(status: AccountingRequestStatus): string {
  return STATUS_COLORS[status] ?? 'bg-gray-100 text-gray-800 border-gray-200';
}

export function getRequestTypeLabel(type: AccountingRequestType, lang: Language = 'en'): string {
  return REQUEST_TYPE_LABELS[type]?.[lang] ?? type;
}

export function getRequestTypeColor(type: AccountingRequestType): string {
  return REQUEST_TYPE_COLORS[type] ?? 'bg-gray-100 text-gray-800 border-gray-200';
}

export function getPriorityLabel(priority: RequestPriority, lang: Language = 'en'): string {
  return PRIORITY_LABELS[priority]?.[lang] ?? priority;
}

export function getPriorityColor(priority: RequestPriority): string {
  return PRIORITY_COLORS[priority] ?? 'bg-gray-100 text-gray-700 border-gray-200';
}

export function getPaymentCategoryLabel(category: PaymentCategory, lang: Language = 'en'): string {
  return PAYMENT_CATEGORIES[category]?.[lang] ?? category;
}

export function getConfirmationResponseLabel(response: ConfirmationResponse, lang: Language = 'en'): string {
  return CONFIRMATION_RESPONSE_LABELS[response]?.[lang] ?? response;
}

// ============================================
// FORMATTING UTILITIES
// ============================================

export function formatCurrency(amount: number, lang: Language = 'en'): string {
  const formatted = new Intl.NumberFormat(lang === 'ru' ? 'ru-RU' : 'en-US', {
    style: 'decimal',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
  return `${formatted} UZS`;
}

export function formatCompactCurrency(amount: number): string {
  if (amount >= 1_000_000_000) return `${(amount / 1_000_000_000).toFixed(1)}B`;
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `${(amount / 1_000).toFixed(0)}K`;
  return String(amount);
}

export function formatDate(dateStr: string, lang: Language = 'en'): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString(lang === 'ru' ? 'ru-RU' : 'en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatDateTime(dateStr: string, lang: Language = 'en'): string {
  const date = new Date(dateStr);
  return date.toLocaleString(lang === 'ru' ? 'ru-RU' : 'en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatRelativeTime(dateStr: string, lang: Language = 'en'): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (lang === 'ru') {
    if (diffMins < 1) return 'только что';
    if (diffMins < 60) return `${diffMins} мин. назад`;
    if (diffHours < 24) return `${diffHours} ч. назад`;
    if (diffDays < 7) return `${diffDays} дн. назад`;
    return formatDate(dateStr, 'ru');
  }

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDate(dateStr, 'en');
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ============================================
// SLA UTILITIES
// ============================================

export type SlaStatus = 'ok' | 'warning' | 'breached' | 'na';

export function getSlaStatus(deadline: string | null, status: AccountingRequestStatus): SlaStatus {
  if (!deadline || ['completed', 'rejected', 'cancelled'].includes(status)) {
    return 'na';
  }

  const deadlineDate = new Date(deadline);
  const now = new Date();
  const remainingMs = deadlineDate.getTime() - now.getTime();
  const remainingHours = remainingMs / (1000 * 60 * 60);

  if (remainingHours < 0) return 'breached';
  if (remainingHours < 8) return 'warning';
  return 'ok';
}

export function getSlaRemainingText(deadline: string | null, lang: Language = 'en'): string {
  if (!deadline) return lang === 'ru' ? 'Н/Д' : 'N/A';

  const deadlineDate = new Date(deadline);
  const now = new Date();
  const diffMs = deadlineDate.getTime() - now.getTime();

  if (diffMs < 0) {
    const overMs = Math.abs(diffMs);
    const overHours = Math.floor(overMs / (1000 * 60 * 60));
    if (lang === 'ru') {
      return overHours < 24 ? `Просрочено ${overHours}ч` : `Просрочено ${Math.floor(overHours / 24)}д`;
    }
    return overHours < 24 ? `${overHours}h overdue` : `${Math.floor(overHours / 24)}d overdue`;
  }

  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  if (hours < 24) {
    return lang === 'ru' ? `${hours}ч осталось` : `${hours}h left`;
  }
  const days = Math.floor(hours / 24);
  return lang === 'ru' ? `${days}д осталось` : `${days}d left`;
}

export function getSlaColor(slaStatus: SlaStatus): string {
  switch (slaStatus) {
    case 'ok': return 'text-green-600';
    case 'warning': return 'text-yellow-600';
    case 'breached': return 'text-red-600';
    default: return 'text-gray-400';
  }
}

// ============================================
// APPROVAL UTILITIES
// ============================================

export function getRequiredApprovalLevel(amount: number): ApprovalLevel | null {
  if (amount >= APPROVAL_THRESHOLDS.HIGH) return 'executive';
  if (amount >= APPROVAL_THRESHOLDS.STANDARD) return 'chief_accountant';
  return null;
}

export function getApprovalLevelLabel(level: ApprovalLevel, lang: Language = 'en'): string {
  const labels: Record<ApprovalLevel, { en: string; ru: string }> = {
    chief_accountant: { en: 'Chief Accountant', ru: 'Главный бухгалтер' },
    executive: { en: 'GM/CEO', ru: 'Генеральный директор/CEO' },
  };
  return labels[level]?.[lang] ?? level;
}

export function needsApproval(amount: number): boolean {
  return amount >= APPROVAL_THRESHOLDS.STANDARD;
}

// ============================================
// VALIDATION UTILITIES
// ============================================

export function isValidInn(inn: string): boolean {
  return /^\d{9}$/.test(inn);
}

export function generateRequestTitle(
  type: AccountingRequestType,
  data: { tenantName?: string; recipientName?: string; clientName?: string }
): string {
  switch (type) {
    case 'reconciliation':
      return `Акт сверки: ${data.tenantName || 'N/A'}`;
    case 'payment':
      return `Оплата: ${data.recipientName || 'N/A'}`;
    case 'confirmation':
      return `Подтверждение: ${data.clientName || 'N/A'}`;
    default:
      return 'Accounting Request';
  }
}

// ============================================
// DATA TRANSFORMATION
// ============================================

// Transform API response (snake_case) to frontend format (camelCase)
export function transformRequestFromApi(data: Record<string, unknown>): Record<string, unknown> {
  return {
    id: data.id,
    requestNumber: data.request_number,
    requestType: data.request_type,
    status: data.status,
    priority: data.priority,
    requesterId: data.requester_id,
    requesterName: (data.requester as any)?.full_name,
    branchId: data.branch_id,
    branchName: (data.branch as any)?.name,
    fromEntityId: data.from_entity_id,
    fromEntityName: (data.from_entity as any)?.name,
    title: data.title,
    description: data.description,
    notes: data.notes,
    // Reconciliation
    tenantName: data.tenant_name,
    tenantInn: data.tenant_inn,
    contractNumber: data.contract_number,
    contractStartDate: data.contract_start_date,
    contractEndDate: data.contract_end_date,
    reconciliationPeriodStart: data.reconciliation_period_start,
    reconciliationPeriodEnd: data.reconciliation_period_end,
    // Payment
    recipientName: data.recipient_name,
    recipientInn: data.recipient_inn,
    amount: data.amount,
    paymentCategory: data.payment_category,
    paymentPurpose: data.payment_purpose,
    invoiceNumber: data.invoice_number,
    // Confirmation
    clientName: data.client_name,
    clientInn: data.client_inn,
    expectedAmount: data.expected_amount,
    expectedDate: data.expected_date,
    // Response
    confirmationResponse: data.confirmation_response,
    confirmedAmount: data.confirmed_amount,
    paymentDate: data.payment_date,
    responseNotes: data.response_notes,
    // Processing
    assignedTo: data.assigned_to,
    assigneeName: (data.assignee as any)?.full_name,
    assignedAt: data.assigned_at,
    // Approval
    requiresApproval: data.requires_approval,
    approvalLevel: data.approval_level,
    currentApprovalStep: data.current_approval_step,
    // Resolution
    resolutionNotes: data.resolution_notes,
    completedAt: data.completed_at,
    completedBy: data.completed_by,
    // Rejection
    rejectedAt: data.rejected_at,
    rejectedBy: data.rejected_by,
    rejectionReason: data.rejection_reason,
    // Edit
    editRequested: data.edit_requested,
    editRequestReason: data.edit_request_reason,
    // Cancellation
    cancelledAt: data.cancelled_at,
    cancelledBy: data.cancelled_by,
    cancellationReason: data.cancellation_reason,
    // SLA
    slaDeadline: data.sla_deadline,
    slaBreached: data.sla_breached,
    // Timestamps
    createdAt: data.created_at,
    updatedAt: data.updated_at,
    // Relations
    attachments: data.attachments,
    comments: (data.comments as any[])?.map(c => ({
      id: c.id,
      requestId: c.request_id,
      authorId: c.author_id,
      authorName: c.author?.full_name,
      content: c.content,
      isInternal: c.is_internal,
      createdAt: c.created_at,
    })),
    approvals: data.approvals,
    history: data.history,
  };
}

// Transform list item from API response
export function transformRequestListItem(data: Record<string, unknown>): Record<string, unknown> {
  return {
    id: data.id,
    requestNumber: data.request_number,
    requestType: data.request_type,
    status: data.status,
    priority: data.priority,
    requesterId: data.requester_id,
    requesterName: (data.requester as any)?.full_name,
    branchId: data.branch_id,
    branchName: (data.branch as any)?.name,
    fromEntityId: data.from_entity_id,
    fromEntityName: (data.from_entity as any)?.name,
    title: data.title,
    amount: data.amount,
    assignedTo: data.assigned_to,
    assigneeName: (data.assignee as any)?.full_name,
    slaDeadline: data.sla_deadline,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
    // Include raw relations for table display
    requester: data.requester,
    assignee: data.assignee,
    branch: data.branch,
    from_entity: data.from_entity,
  };
}
