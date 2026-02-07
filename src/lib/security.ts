// ============================================
// SECURITY UTILITIES
// Shared validation, sanitization, and access control
// SEC-025 remediation — Phase 1 + Phase 2
// ============================================

import { hasPermission, type Permission } from './permissions';
import { supabaseAdmin, isSupabaseAdminConfigured } from './db/connection';
import type { User, UserRole } from '@/types';

// ═══ Input Sanitization ═══

/**
 * C-05: Escape ILIKE wildcard characters to prevent wildcard injection.
 * Supabase PostgREST uses parameterized queries (no SQL injection),
 * but unescaped % and _ allow matching all records.
 */
export function escapeIlike(input: string): string {
  return input.replace(/[%_\\]/g, '\\$&');
}

// ═══ String Length Limits (H-04) ═══

export const MAX_LENGTH = {
  DESCRIPTION: 10_000,
  COMMENT: 5_000,
  NOTES: 2_000,
  REASON: 2_000,
  LOCATION: 1_000,
  FILE_NAME: 255,
  FILE_URL: 2_048,
  SEARCH_QUERY: 200,
  COMPANY_NAME: 500,
  PERSON_NAME: 300,
  CONTRACT_NUMBER: 100,
  PHONE: 50,
  INN: 20,
  ADDITIONAL_CONDITIONS: 5_000,
  CHANGE_DESCRIPTION: 5_000,
} as const;

/**
 * H-04: Validate string length and return error if exceeded.
 * Returns null if valid, error message string if invalid.
 */
export function validateStringLength(
  value: unknown,
  fieldName: string,
  maxLength: number,
  required: boolean = false
): string | null {
  if (required && (!value || (typeof value === 'string' && value.trim().length === 0))) {
    return `${fieldName} is required`;
  }

  if (value !== undefined && value !== null) {
    if (typeof value !== 'string') {
      return `${fieldName} must be a string`;
    }
    if (value.length > maxLength) {
      return `${fieldName} exceeds maximum length of ${maxLength} characters`;
    }
  }

  return null;
}

// ═══ File Upload Validation (H-07 / M-10) ═══

export const MAX_FILE_SIZE = 10_485_760; // 10 MB

export const ALLOWED_FILE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'text/csv',
] as const;

/**
 * H-07 + M-10: Validate file metadata fields.
 * Returns array of error strings, empty if valid.
 */
export function validateFileMetadata(body: {
  fileName?: unknown;
  fileType?: unknown;
  fileSize?: unknown;
  fileUrl?: unknown;
}): string[] {
  const errors: string[] = [];

  // fileName
  if (!body.fileName || typeof body.fileName !== 'string' || body.fileName.trim().length === 0) {
    errors.push('File name is required');
  } else if (body.fileName.length > MAX_LENGTH.FILE_NAME) {
    errors.push(`File name exceeds ${MAX_LENGTH.FILE_NAME} characters`);
  } else if (/[<>:"/\\|?*\x00-\x1F]/.test(body.fileName)) {
    errors.push('File name contains invalid characters');
  }

  // fileType
  if (!body.fileType || typeof body.fileType !== 'string' || body.fileType.trim().length === 0) {
    errors.push('File type is required');
  } else if (!ALLOWED_FILE_TYPES.includes(body.fileType as typeof ALLOWED_FILE_TYPES[number])) {
    errors.push(`File type "${body.fileType}" is not allowed`);
  }

  // fileSize
  if (body.fileSize === undefined || body.fileSize === null) {
    errors.push('File size is required');
  } else if (typeof body.fileSize !== 'number' || body.fileSize <= 0) {
    errors.push('File size must be a positive number');
  } else if (body.fileSize > MAX_FILE_SIZE) {
    errors.push(`File size exceeds maximum of ${MAX_FILE_SIZE / (1024 * 1024)}MB`);
  }

  // fileUrl
  if (!body.fileUrl || typeof body.fileUrl !== 'string' || body.fileUrl.trim().length === 0) {
    errors.push('File URL is required');
  } else if (body.fileUrl.length > MAX_LENGTH.FILE_URL) {
    errors.push(`File URL exceeds ${MAX_LENGTH.FILE_URL} characters`);
  } else {
    // Basic URL validation — must start with https://
    try {
      const url = new URL(body.fileUrl);
      if (url.protocol !== 'https:') {
        errors.push('File URL must use HTTPS');
      }
    } catch {
      errors.push('File URL is not a valid URL');
    }
  }

  return errors;
}

// ═══ Branch Access Validation (C-02 / H-02) ═══

/**
 * C-02 / H-02: Validate that a user has access to a specific branch.
 * Non-admin users can only access their own branch.
 * Users with VIEW_ALL permission can access any branch.
 * Returns validated branchId or null if access denied.
 */
export function validateBranchAccess(
  user: User,
  requestedBranchId: string | null | undefined,
  viewAllPermission?: Permission
): { branchId: string | null; error: string | null; status: number } {
  // If user has VIEW_ALL permission, allow any branch
  if (viewAllPermission && hasPermission(user.role as UserRole, viewAllPermission)) {
    // Admin can specify any branch
    if (requestedBranchId) {
      return { branchId: requestedBranchId, error: null, status: 200 };
    }
    // Admin without specifying a branch — return null to indicate "all branches"
    return { branchId: null, error: null, status: 200 };
  }

  // Non-admin: derive branchId from user profile, ignore client-supplied value
  const userBranchId = user.branchId;

  if (!userBranchId) {
    return {
      branchId: null,
      error: 'User has no branch assignment',
      status: 403,
    };
  }

  // If client supplied a different branch, deny access (return 404 to prevent enumeration)
  if (requestedBranchId && requestedBranchId !== userBranchId) {
    return {
      branchId: null,
      error: 'Not found',
      status: 404,
    };
  }

  return { branchId: userBranchId, error: null, status: 200 };
}

/**
 * C-02: Validate that a record belongs to the user's branch (IDOR prevention).
 * Used on [id] detail endpoints to ensure the fetched record is within the user's scope.
 * Returns true if access is allowed, false if denied.
 */
export function validateRecordBranchAccess(
  user: User,
  recordBranchId: string | null | undefined,
  viewAllPermission?: Permission
): boolean {
  // Users with VIEW_ALL can access any record
  if (viewAllPermission && hasPermission(user.role as UserRole, viewAllPermission)) {
    return true;
  }

  // Otherwise, record must belong to user's branch
  return !!user.branchId && recordBranchId === user.branchId;
}

// ═══ Operator Session Validation (C-01) ═══

/**
 * C-01: Validate that an X-Operator-Id header corresponds to a legitimate recent switch.
 * Looks up the most recent operator_switch_log entry for the session user
 * and verifies the switched_to_id matches the header value.
 * Max session age: 8 hours.
 */
export async function validateOperatorSession(
  operatorId: string | null | undefined,
  sessionUserId: string,
  branchId: string
): Promise<{ valid: boolean; operatorId: string | null }> {
  // If no operator ID provided, the session user is the operator
  if (!operatorId || operatorId === sessionUserId) {
    return { valid: true, operatorId: null };
  }

  if (!isSupabaseAdminConfigured()) {
    // Cannot validate — reject operator claims
    return { valid: false, operatorId: null };
  }

  // Look up the most recent switch log for this session user at this branch
  const eightHoursAgo = new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabaseAdmin!
    .from('operator_switch_log')
    .select('switched_to_id, created_at')
    .eq('session_user_id', sessionUserId)
    .eq('branch_id', branchId)
    .gte('created_at', eightHoursAgo)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error || !data) {
    // No recent switch found — reject operator claim
    return { valid: false, operatorId: null };
  }

  // Verify the most recent switch matches the claimed operator
  if (data.switched_to_id !== operatorId) {
    return { valid: false, operatorId: null };
  }

  return { valid: true, operatorId };
}

// ═══ Operator → Employee Resolution (centralized) ═══

export interface ResolvedEmployee {
  id: string;
  branchId: string;
}

/**
 * Resolves the actual employee performing an action, handling:
 * 1. Kiosk PIN-switched operators (X-Operator-Id header)
 * 2. Direct-login users (employee ID match or auth_user_id lookup)
 * 3. Email fallback with auto-linking
 *
 * Called automatically by withAuth when allowKiosk is true,
 * but can also be called directly from endpoints.
 */
export async function resolveOperatorEmployee(
  request: Request | { headers: { get(name: string): string | null } },
  user: User
): Promise<ResolvedEmployee | null> {
  try {
    if (!isSupabaseAdminConfigured()) {
      console.warn('[resolveOperatorEmployee] supabaseAdmin not configured');
      return null;
    }

    const db = supabaseAdmin!;
    let rawOperatorId = request.headers.get('X-Operator-Id') || undefined;
    const branchId = request.headers.get('X-Branch-Id') || user.branchId || '';

    // Filter out non-valid operator IDs (e.g. 'self', empty strings, kiosk IDs)
    if (rawOperatorId && (rawOperatorId === 'self' || rawOperatorId.startsWith('kiosk:') || rawOperatorId.length < 5)) {
      rawOperatorId = undefined;
    }

    const opValidation = await validateOperatorSession(rawOperatorId, user.id, branchId);

    // 1. Operator switched via PIN — look up by their employee ID
    if (opValidation.valid && opValidation.operatorId) {
      const { data } = await db
        .from('employees')
        .select('id, branch_id')
        .eq('id', opValidation.operatorId)
        .single();
      if (data) return { id: data.id, branchId: data.branch_id };
      console.warn('[resolveOperatorEmployee] Operator ID validated but employee not found:', opValidation.operatorId);
    }

    // 2. Direct login — look up by employee ID directly (JWT sub = employee.id)
    if (user.id && !user.id.startsWith('kiosk:')) {
      const { data } = await db
        .from('employees')
        .select('id, branch_id')
        .eq('id', user.id)
        .single();
      if (data) return { id: data.id, branchId: data.branch_id };

      // Also try auth_user_id for legacy compatibility
      const { data: dataByAuth } = await db
        .from('employees')
        .select('id, branch_id')
        .eq('auth_user_id', user.id)
        .single();
      if (dataByAuth) return { id: dataByAuth.id, branchId: dataByAuth.branch_id };
    }

    // 3. Fallback — email lookup with auto-link
    if (user.email) {
      const { data } = await db
        .from('employees')
        .select('id, branch_id')
        .eq('email', user.email)
        .single();
      if (data) {
        // Auto-link for future lookups (skip for kiosk synthetic users)
        if (user.id && !user.id.startsWith('kiosk:')) {
          await db
            .from('employees')
            .update({ auth_user_id: user.id })
            .eq('id', data.id);
        }
        return { id: data.id, branchId: data.branch_id };
      }
    }

    console.warn('[resolveOperatorEmployee] Could not resolve employee. user.id=%s, user.email=%s, operatorId=%s, branchId=%s, opValid=%s',
      user.id, user.email || '(empty)', rawOperatorId || '(none)', branchId, opValidation.valid);
    return null;
  } catch (error) {
    console.error('[resolveOperatorEmployee] Unexpected error:', error);
    return null;
  }
}

// ═══ Pagination Validation (M-02 / L-05) ═══

/**
 * M-02 / L-05: Safely parse and bound pagination parameters.
 */
export function parsePagination(
  pageParam: string | null,
  pageSizeParam: string | null,
  defaults: { page: number; pageSize: number; maxPageSize: number } = {
    page: 1,
    pageSize: 20,
    maxPageSize: 100,
  }
): { page: number; pageSize: number } {
  const rawPage = parseInt(pageParam || '', 10);
  const rawPageSize = parseInt(pageSizeParam || '', 10);

  const page = Number.isFinite(rawPage) ? Math.max(1, Math.min(rawPage, 10_000)) : defaults.page;
  const pageSize = Number.isFinite(rawPageSize)
    ? Math.max(1, Math.min(rawPageSize, defaults.maxPageSize))
    : defaults.pageSize;

  return { page, pageSize };
}

// ═══ Enum Validation (H-03) ═══

/**
 * H-03: Validate a value against an allowed enum array.
 * Returns the validated value or null if invalid.
 */
export function validateEnum<T extends string>(
  value: unknown,
  allowed: readonly T[],
  fieldName: string
): { value: T | null; error: string | null } {
  if (value === undefined || value === null) {
    return { value: null, error: null }; // optional field
  }

  if (typeof value !== 'string') {
    return { value: null, error: `${fieldName} must be a string` };
  }

  if (!allowed.includes(value as T)) {
    return {
      value: null,
      error: `Invalid ${fieldName}: "${value}". Allowed values: ${allowed.join(', ')}`,
    };
  }

  return { value: value as T, error: null };
}

/**
 * H-03: Validate required enum field.
 */
export function validateRequiredEnum<T extends string>(
  value: unknown,
  allowed: readonly T[],
  fieldName: string
): { value: T | null; error: string | null } {
  if (value === undefined || value === null || value === '') {
    return { value: null, error: `${fieldName} is required` };
  }

  return validateEnum(value, allowed, fieldName);
}
