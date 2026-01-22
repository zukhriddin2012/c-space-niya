// ============================================
// ACCOUNTING MODULE CONSTANTS
// ============================================

// Approval thresholds in UZS
export const APPROVAL_THRESHOLDS = {
  STANDARD: 2_000_000,    // 2M - needs Chief Accountant
  HIGH: 10_000_000,       // 10M - needs GM/CEO
} as const;

// SLA durations in business days
export const SLA_DURATIONS = {
  normal: 3,
  urgent: 1,
} as const;

// Payment categories with labels
export const PAYMENT_CATEGORIES = {
  office_supplies: { en: 'Office Supplies', ru: 'Канцтовары' },
  rent: { en: 'Rent', ru: 'Аренда' },
  utilities: { en: 'Utilities', ru: 'Коммунальные услуги' },
  services: { en: 'Services', ru: 'Услуги' },
  equipment: { en: 'Equipment', ru: 'Оборудование' },
  marketing: { en: 'Marketing', ru: 'Маркетинг' },
  salary_hr: { en: 'Salary/HR', ru: 'Зарплата/Кадры' },
  other: { en: 'Other', ru: 'Другое' },
} as const;

// Request type labels
export const REQUEST_TYPE_LABELS = {
  reconciliation: { en: 'Reconciliation', ru: 'Акт сверки' },
  payment: { en: 'Payment', ru: 'Оплата' },
  confirmation: { en: 'Confirmation', ru: 'Подтверждение оплаты' },
} as const;

// Status labels
export const STATUS_LABELS = {
  pending: { en: 'Pending', ru: 'Ожидает' },
  in_progress: { en: 'In Progress', ru: 'В работе' },
  needs_info: { en: 'Needs Info', ru: 'Нужна информация' },
  pending_approval: { en: 'Pending Approval', ru: 'На согласовании' },
  approved: { en: 'Approved', ru: 'Согласовано' },
  completed: { en: 'Completed', ru: 'Завершено' },
  rejected: { en: 'Rejected', ru: 'Отклонено' },
  cancelled: { en: 'Cancelled', ru: 'Отменено' },
} as const;

// Priority labels
export const PRIORITY_LABELS = {
  normal: { en: 'Normal', ru: 'Обычный' },
  urgent: { en: 'Urgent', ru: 'Срочно' },
} as const;

// Confirmation response labels
export const CONFIRMATION_RESPONSE_LABELS = {
  paid: { en: 'Paid', ru: 'Оплачено' },
  not_paid: { en: 'Not Paid', ru: 'Не оплачено' },
  partial: { en: 'Partially Paid', ru: 'Частично оплачено' },
} as const;

// Status colors for badges
export const STATUS_COLORS = {
  pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  in_progress: 'bg-blue-100 text-blue-800 border-blue-200',
  needs_info: 'bg-orange-100 text-orange-800 border-orange-200',
  pending_approval: 'bg-purple-100 text-purple-800 border-purple-200',
  approved: 'bg-teal-100 text-teal-800 border-teal-200',
  completed: 'bg-green-100 text-green-800 border-green-200',
  rejected: 'bg-red-100 text-red-800 border-red-200',
  cancelled: 'bg-gray-100 text-gray-800 border-gray-200',
} as const;

// Request type colors
export const REQUEST_TYPE_COLORS = {
  reconciliation: 'bg-blue-100 text-blue-800 border-blue-200',
  payment: 'bg-green-100 text-green-800 border-green-200',
  confirmation: 'bg-purple-100 text-purple-800 border-purple-200',
} as const;

// Priority colors
export const PRIORITY_COLORS = {
  normal: 'bg-gray-100 text-gray-700 border-gray-200',
  urgent: 'bg-red-100 text-red-800 border-red-200',
} as const;

// Valid file types for attachments
export const ALLOWED_FILE_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // xlsx
  'application/vnd.ms-excel', // xls
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // docx
  'application/msword', // doc
  'image/jpeg',
  'image/png',
] as const;

export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

// Status transitions
export const VALID_STATUS_TRANSITIONS = {
  pending: ['in_progress', 'cancelled'],
  in_progress: ['needs_info', 'pending_approval', 'completed', 'rejected'],
  needs_info: ['in_progress', 'cancelled'],
  pending_approval: ['approved', 'rejected'],
  approved: ['completed'],
  completed: [],
  rejected: ['pending'], // Resubmit
  cancelled: [],
} as const;
