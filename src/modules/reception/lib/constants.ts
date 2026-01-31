// ============================================
// RECEPTION MODULE CONSTANTS
// ============================================

// Expense payment method options (simple - just Cash or Bank)
export const EXPENSE_PAYMENT_METHODS = {
  cash: { en: 'Cash', ru: 'Наличные', uz: 'Naqd' },
  bank: { en: 'Bank', ru: 'Банк', uz: 'Bank' },
} as const;

// Status labels for transactions/expenses
export const TRANSACTION_STATUS = {
  active: { en: 'Active', ru: 'Активный' },
  voided: { en: 'Voided', ru: 'Аннулировано' },
} as const;

// Status colors
export const STATUS_COLORS = {
  active: 'bg-green-100 text-green-800 border-green-200',
  voided: 'bg-red-100 text-red-800 border-red-200',
  inactive: 'bg-gray-100 text-gray-600 border-gray-200',
} as const;

// Default items for admin configuration
export const DEFAULT_SERVICE_TYPES = [
  { name: 'Meeting', code: 'meeting', icon: '👥', sortOrder: 1 },
  { name: 'Hour', code: 'hour', icon: '🪑', sortOrder: 2 },
  { name: 'Day Pass', code: 'day_pass', icon: '🗓️', sortOrder: 3 },
  { name: 'Conference', code: 'conference', icon: '🎤', sortOrder: 4 },
  { name: 'Office', code: 'office', icon: '🏢', sortOrder: 5 },
  { name: 'Dedicated', code: 'dedicated', icon: '🖥️', sortOrder: 6 },
  { name: 'Flex', code: 'flex', icon: '🔄', sortOrder: 7 },
  { name: 'Week Pass', code: 'weekpass', icon: '📅', sortOrder: 8 },
  { name: '15 Days', code: '15_days', icon: '📆', sortOrder: 9 },
  { name: 'Demo', code: 'demo', icon: '🎓', sortOrder: 10 },
  { name: 'Other', code: 'other', icon: '📦', sortOrder: 99 },
] as const;

export const DEFAULT_EXPENSE_TYPES = [
  { name: 'Goods', code: 'goods', icon: '🛒', sortOrder: 1 },
  { name: 'Utility', code: 'utility', icon: '⚡', sortOrder: 2 },
  { name: 'Staff', code: 'staff', icon: '👷', sortOrder: 3 },
  { name: 'Tax', code: 'tax', icon: '🧾', sortOrder: 4 },
  { name: 'Maintenance', code: 'maintenance', icon: '🔧', sortOrder: 5 },
  { name: 'Marketing', code: 'marketing', icon: '📢', sortOrder: 6 },
  { name: 'CapEx', code: 'capex', icon: '🏗️', sortOrder: 7 },
  { name: 'Charity', code: 'charity', icon: '❤️', sortOrder: 8 },
  { name: 'Other', code: 'other', icon: '📦', sortOrder: 99 },
] as const;

export const DEFAULT_PAYMENT_METHODS = [
  { name: 'Cash', code: 'cash', icon: '💵', requiresCode: false, sortOrder: 1 },
  { name: 'Payme', code: 'payme', icon: '📱', requiresCode: true, sortOrder: 2 },
  { name: 'Click', code: 'click', icon: '🖱️', requiresCode: true, sortOrder: 3 },
  { name: 'Uzum', code: 'uzum', icon: '🍇', requiresCode: true, sortOrder: 4 },
  { name: 'Terminal', code: 'terminal', icon: '💳', requiresCode: false, sortOrder: 5 },
  { name: 'Bank', code: 'bank', icon: '🏦', requiresCode: false, sortOrder: 6 },
] as const;

// Currency formatting
export const CURRENCY = {
  code: 'UZS',
  symbol: "so'm",
  locale: 'uz-UZ',
} as const;

// Format currency amount
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('uz-UZ', {
    style: 'decimal',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount) + " so'm";
}

// Format date for display
export function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

// Format date for input fields
export function formatDateForInput(date: string): string {
  return new Date(date).toISOString().split('T')[0];
}
