// ============================================
// CSN-186: System Adoption — Usage Tracking
// ============================================

import { supabaseAdmin, isSupabaseAdminConfigured } from './connection';

// ============================================
// MODULE MAP — ordered, specific prefixes first
// ============================================

export const MODULE_MAP: Array<{
  prefix: string;
  module: string;
}> = [
  // ServiceHub sub-modules (more specific first)
  { prefix: '/api/reception/transactions', module: 'servicehub_transactions' },
  { prefix: '/api/reception/expenses', module: 'servicehub_expenses' },
  { prefix: '/api/reception/accounting-requests', module: 'accounting_requests' },
  { prefix: '/api/reception/legal-requests', module: 'legal_requests' },
  { prefix: '/api/reception/cash-management', module: 'cash_management' },
  { prefix: '/api/reception/inkasso', module: 'cash_management' },
  { prefix: '/api/reception/maintenance', module: 'maintenance' },

  // Standalone domain routes
  { prefix: '/api/accounting-requests', module: 'accounting_requests' },
  { prefix: '/api/legal-requests', module: 'legal_requests' },
  { prefix: '/api/maintenance', module: 'maintenance' },
  { prefix: '/api/employees', module: 'employees' },
  { prefix: '/api/attendance', module: 'attendance' },
  { prefix: '/api/payroll', module: 'payroll' },
  { prefix: '/api/wages', module: 'payroll' },
  { prefix: '/api/leaves', module: 'leave' },
  { prefix: '/api/shifts', module: 'shifts' },
  { prefix: '/api/candidates', module: 'recruitment' },
  { prefix: '/api/recruitment', module: 'recruitment' },
  { prefix: '/api/finances', module: 'finance' },
  { prefix: '/api/metronome', module: 'metronome' },
];

// Paths that should NEVER be tracked
const EXCLUDED_PREFIXES = [
  '/api/auth',
  '/api/adoption',
  '/api/config',
  '/api/cron',
  '/api/admin',
];

// HTTP method → action type mapping
const METHOD_ACTION_MAP: Record<string, string> = {
  GET: 'view',
  POST: 'create',
  PUT: 'edit',
  PATCH: 'edit',
  DELETE: 'delete',
};

// ============================================
// HUMAN-READABLE MODULE LABELS
// ============================================

export const MODULE_LABELS: Record<string, string> = {
  employees: 'Employees',
  attendance: 'Attendance',
  payroll: 'Payroll',
  leave: 'Leave',
  shifts: 'Shifts',
  recruitment: 'Recruitment',
  servicehub_transactions: 'ServiceHub Transactions',
  servicehub_expenses: 'ServiceHub Expenses',
  accounting_requests: 'Accounting Requests',
  legal_requests: 'Legal Requests',
  maintenance: 'Maintenance',
  cash_management: 'Cash Management',
  finance: 'Finance',
  metronome: 'Metronome Sync',
};

export const ALL_MODULES = Object.keys(MODULE_LABELS);
export const TOTAL_MODULES = ALL_MODULES.length; // 14

// ============================================
// ROLE-BASED CONFIGURATION
// ============================================

export const ROLE_MODULE_ACCESS: Record<string, string[]> = {
  general_manager: ALL_MODULES,
  ceo: ALL_MODULES,
  hr: [
    'employees', 'attendance', 'payroll', 'leave', 'shifts', 'recruitment',
    'accounting_requests', 'metronome',
  ],
  branch_manager: [
    'employees', 'attendance', 'leave', 'shifts',
    'servicehub_transactions', 'servicehub_expenses', 'accounting_requests',
    'legal_requests', 'maintenance', 'cash_management', 'finance', 'metronome',
  ],
  chief_accountant: [
    'employees', 'accounting_requests', 'finance',
    'servicehub_transactions', 'servicehub_expenses', 'cash_management',
  ],
  accountant: [
    'employees', 'accounting_requests', 'finance',
    'servicehub_transactions', 'servicehub_expenses',
  ],
  legal_manager: ['employees', 'accounting_requests', 'legal_requests'],
  reports_manager: ['employees', 'accounting_requests', 'finance'],
  recruiter: ['employees', 'attendance', 'recruitment', 'accounting_requests'],
  employee: ['employees', 'attendance', 'leave', 'payroll', 'shifts', 'maintenance'],
};

// Daily action targets by role (used in frequency score calculation)
export const ROLE_DAILY_TARGETS: Record<string, number> = {
  general_manager: 15,
  branch_manager: 15,
  hr: 12,
  chief_accountant: 12,
  accountant: 12,
  recruiter: 12,
  legal_manager: 12,
  ceo: 8,
  reports_manager: 8,
  employee: 5,
};

// ============================================
// CLASSIFICATION FUNCTIONS
// ============================================

/**
 * Classify an HTTP request into a module + action type.
 * Returns null if the path shouldn't be tracked.
 */
export function classifyAction(
  method: string,
  pathname: string
): { module: string; actionType: string } | null {
  // Check exclusions first
  if (EXCLUDED_PREFIXES.some(p => pathname.startsWith(p))) {
    return null;
  }

  // Find matching module
  const match = MODULE_MAP.find(m => pathname.startsWith(m.prefix));
  if (!match) return null;

  // Determine action type from HTTP method
  const actionType = METHOD_ACTION_MAP[method.toUpperCase()] || 'view';

  // Override for specific path patterns
  if (pathname.includes('/export')) return { module: match.module, actionType: 'export' };
  if (pathname.includes('/approve')) return { module: match.module, actionType: 'approve' };

  return { module: match.module, actionType };
}

// ============================================
// TRACKING FUNCTION
// ============================================

/**
 * Record a usage event. Fire-and-forget, never throws.
 * Deduplicates: skips if identical event exists within last 5 seconds.
 */
export async function trackUsage(
  userId: string,
  module: string,
  actionType: string,
  endpoint: string,
  branchId?: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  try {
    if (!isSupabaseAdminConfigured()) return;

    // Dedupe check: skip if same user+module+action+endpoint in last 5s
    const fiveSecondsAgo = new Date(Date.now() - 5000).toISOString();
    const { data: existing } = await supabaseAdmin!
      .from('usage_events')
      .select('id')
      .eq('user_id', userId)
      .eq('module', module)
      .eq('action_type', actionType)
      .eq('endpoint', endpoint)
      .gte('created_at', fiveSecondsAgo)
      .limit(1);

    if (existing && existing.length > 0) return;

    await supabaseAdmin!.from('usage_events').insert({
      user_id: userId,
      module,
      action_type: actionType,
      endpoint,
      branch_id: branchId || null,
      metadata: metadata || {},
    });
  } catch (error) {
    // Never let tracking failures break the main flow
    console.error('[UsageTracking] Failed to log:', error);
  }
}
