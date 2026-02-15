// Audit logging utility for security-sensitive actions
// SEC-024: Centralized audit trail for login, logout, password changes, and admin actions.

import { supabaseAdmin } from './supabase';

export type AuditAction =
  | 'auth.login'
  | 'auth.login_failed'
  | 'auth.logout'
  | 'auth.token_refresh'
  | 'auth.password_change'
  | 'auth.password_reset_forced'
  | 'admin.run_sql'
  | 'admin.import_employees'
  | 'employee.create'
  | 'employee.update'
  | 'employee.delete'
  | 'employee.terminate'
  | 'role.change'
  | 'permission.denied'
  // Cash Management (PR2-066)
  | 'cash.settings_updated'
  | 'cash.inkasso_delivery_created'
  | 'cash.transfer_created'
  | 'cash.dividend_spend_requested'
  | 'cash.dividend_spend_approved'
  | 'cash.dividend_spend_rejected'
  // Expenses (PR2-066 security alignment)
  | 'expense.created'
  // Branch Assignments (CSN-029)
  | 'assignment.created'
  | 'assignment.updated'
  | 'assignment.removed'
  | 'assignment.bulk_created'
  | 'assignment.access_auto_granted'
  | 'assignment.access_auto_revoked'
  | 'assignment.permanent_transfer';

export type AuditSeverity = 'info' | 'warning' | 'critical' | 'high' | 'medium';

interface AuditLogEntry {
  user_id?: string;
  action: AuditAction;
  resource_type?: string;
  resource_id?: string;
  ip_address?: string;
  user_agent?: string;
  details?: Record<string, unknown>;
  severity: AuditSeverity;
}

// Determine severity from action
function getDefaultSeverity(action: AuditAction): AuditSeverity {
  const criticalActions: AuditAction[] = [
    'admin.run_sql',
    'auth.password_change',
    'auth.password_reset_forced',
    'employee.delete',
    'employee.terminate',
    'role.change',
  ];
  const warningActions: AuditAction[] = [
    'auth.login_failed',
    'permission.denied',
    'admin.import_employees',
  ];

  if (criticalActions.includes(action)) return 'critical';
  if (warningActions.includes(action)) return 'warning';
  return 'info';
}

/**
 * Log an audit event to the audit_log table.
 * Non-blocking: errors are logged to console but never thrown.
 */
export async function audit(entry: Omit<AuditLogEntry, 'severity'> & { severity?: AuditSeverity }): Promise<void> {
  try {
    if (!supabaseAdmin) return;

    await supabaseAdmin.from('audit_log').insert({
      user_id: entry.user_id || null,
      action: entry.action,
      resource_type: entry.resource_type || null,
      resource_id: entry.resource_id || null,
      ip_address: entry.ip_address || null,
      user_agent: entry.user_agent || null,
      details: entry.details || null,
      severity: entry.severity || getDefaultSeverity(entry.action),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    // Never let audit failures break the main flow
    console.error('[Audit] Failed to log:', error);
  }
}

/**
 * Helper to extract IP and user agent from a Request object
 */
export function getRequestMeta(request: Request): { ip_address: string; user_agent: string } {
  const ip = (request.headers.get('x-forwarded-for')?.split(',')[0]?.trim())
    || request.headers.get('x-real-ip')
    || 'unknown';
  const ua = request.headers.get('user-agent') || 'unknown';
  return { ip_address: ip, user_agent: ua };
}
