// Shared database connection and utilities
export {
  supabaseAdmin,
  isSupabaseAdminConfigured,
} from '../supabase';

export type {
  Employee,
  Attendance,
  Branch,
  LeaveRequest,
  Department,
  Position,
  BotLearningContent,
  BotMessageTemplate,
  BotButtonLabel,
  BotSettings,
  LocalizedContent,
} from '../supabase';

// Get current date string in Tashkent timezone (UTC+5) - consistent with bot
export function getTashkentDateString(): string {
  const now = new Date();
  const tashkentTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Tashkent' }));
  const year = tashkentTime.getFullYear();
  const month = String(tashkentTime.getMonth() + 1).padStart(2, '0');
  const day = String(tashkentTime.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Tax rate - 12% is added ON TOP of net salary
export const TAX_RATE = 0.12;

// Calculate gross from net: gross = net + (net * tax_rate) = net * 1.12
export function calculateGrossFromNet(net: number): number {
  return Math.round(net * (1 + TAX_RATE));
}

export function calculateTaxFromNet(net: number): number {
  return Math.round(net * TAX_RATE);
}
