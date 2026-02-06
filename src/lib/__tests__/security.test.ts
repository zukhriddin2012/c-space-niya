// ============================================
// TST-025: Security Utilities Tests
// Tests for src/lib/security.ts
// Covers: C-01, C-02, C-05, H-02, H-03, H-04, H-07, M-02, M-10
// ============================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { User } from '@/types';
import { PERMISSIONS } from '@/lib/permissions';

// Mock the supabase connection — must be before import
vi.mock('@/lib/db/connection', () => ({
  supabaseAdmin: null,
  isSupabaseAdminConfigured: vi.fn(() => false),
}));

import {
  escapeIlike,
  validateStringLength,
  validateFileMetadata,
  validateBranchAccess,
  validateRecordBranchAccess,
  validateOperatorSession,
  parsePagination,
  validateEnum,
  validateRequiredEnum,
  MAX_LENGTH,
  MAX_FILE_SIZE,
  ALLOWED_FILE_TYPES,
} from '@/lib/security';

// ═══ Test Helpers ═══

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user-1',
    email: 'test@example.com',
    name: 'Test User',
    role: 'employee',
    branchId: 'branch-1',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function makeAdmin(overrides: Partial<User> = {}): User {
  return makeUser({ role: 'general_manager', ...overrides });
}

// ═══ C-05: escapeIlike ═══

describe('escapeIlike', () => {
  it('escapes percent wildcard', () => {
    expect(escapeIlike('100%')).toBe('100\\%');
  });

  it('escapes underscore wildcard', () => {
    expect(escapeIlike('file_name')).toBe('file\\_name');
  });

  it('escapes backslash', () => {
    expect(escapeIlike('path\\to')).toBe('path\\\\to');
  });

  it('escapes all wildcards in a mixed string', () => {
    expect(escapeIlike('%_\\test_%')).toBe('\\%\\_\\\\test\\_\\%');
  });

  it('returns unchanged string with no special chars', () => {
    expect(escapeIlike('normal search')).toBe('normal search');
  });

  it('handles empty string', () => {
    expect(escapeIlike('')).toBe('');
  });

  it('prevents wildcard-only search from matching all records', () => {
    const result = escapeIlike('%');
    expect(result).not.toBe('%');
    expect(result).toBe('\\%');
  });
});

// ═══ H-04: validateStringLength ═══

describe('validateStringLength', () => {
  it('returns null for valid string within limit', () => {
    expect(validateStringLength('hello', 'name', 100)).toBeNull();
  });

  it('returns error for string exceeding max length', () => {
    const result = validateStringLength('a'.repeat(101), 'name', 100);
    expect(result).toContain('exceeds maximum length');
  });

  it('returns null for undefined when not required', () => {
    expect(validateStringLength(undefined, 'name', 100)).toBeNull();
  });

  it('returns null for null when not required', () => {
    expect(validateStringLength(null, 'name', 100)).toBeNull();
  });

  it('returns error for undefined when required', () => {
    const result = validateStringLength(undefined, 'name', 100, true);
    expect(result).toContain('is required');
  });

  it('returns error for empty string when required', () => {
    const result = validateStringLength('', 'name', 100, true);
    expect(result).toContain('is required');
  });

  it('returns error for whitespace-only when required', () => {
    const result = validateStringLength('   ', 'name', 100, true);
    expect(result).toContain('is required');
  });

  it('returns error for non-string types', () => {
    const result = validateStringLength(123, 'name', 100);
    expect(result).toContain('must be a string');
  });

  it('returns error for object type', () => {
    const result = validateStringLength({ foo: 'bar' }, 'name', 100);
    expect(result).toContain('must be a string');
  });

  it('allows string exactly at max length', () => {
    expect(validateStringLength('a'.repeat(100), 'name', 100)).toBeNull();
  });
});

// ═══ H-07 / M-10: validateFileMetadata ═══

describe('validateFileMetadata', () => {
  const validFile = {
    fileName: 'document.pdf',
    fileType: 'application/pdf',
    fileSize: 1024,
    fileUrl: 'https://storage.example.com/files/document.pdf',
  };

  it('accepts valid file metadata', () => {
    expect(validateFileMetadata(validFile)).toEqual([]);
  });

  describe('fileName validation', () => {
    it('rejects missing fileName', () => {
      const errors = validateFileMetadata({ ...validFile, fileName: undefined });
      expect(errors).toContain('File name is required');
    });

    it('rejects empty fileName', () => {
      const errors = validateFileMetadata({ ...validFile, fileName: '' });
      expect(errors).toContain('File name is required');
    });

    it('rejects fileName exceeding max length', () => {
      const errors = validateFileMetadata({ ...validFile, fileName: 'a'.repeat(256) });
      expect(errors.some(e => e.includes('exceeds'))).toBe(true);
    });

    it('rejects fileName with path traversal characters', () => {
      const errors = validateFileMetadata({ ...validFile, fileName: '../../../etc/passwd' });
      expect(errors.some(e => e.includes('invalid characters'))).toBe(true);
    });

    it('rejects fileName with angle brackets', () => {
      const errors = validateFileMetadata({ ...validFile, fileName: '<script>.txt' });
      expect(errors.some(e => e.includes('invalid characters'))).toBe(true);
    });
  });

  describe('fileType validation', () => {
    it('rejects disallowed file type', () => {
      const errors = validateFileMetadata({ ...validFile, fileType: 'application/x-executable' });
      expect(errors.some(e => e.includes('not allowed'))).toBe(true);
    });

    it('accepts all allowed file types', () => {
      for (const type of ALLOWED_FILE_TYPES) {
        const errors = validateFileMetadata({ ...validFile, fileType: type });
        expect(errors.filter(e => e.includes('file type') || e.includes('File type'))).toEqual([]);
      }
    });
  });

  describe('fileSize validation', () => {
    it('rejects fileSize exceeding 10MB', () => {
      const errors = validateFileMetadata({ ...validFile, fileSize: MAX_FILE_SIZE + 1 });
      expect(errors.some(e => e.includes('exceeds maximum'))).toBe(true);
    });

    it('rejects zero fileSize', () => {
      const errors = validateFileMetadata({ ...validFile, fileSize: 0 });
      expect(errors.some(e => e.includes('positive'))).toBe(true);
    });

    it('rejects negative fileSize', () => {
      const errors = validateFileMetadata({ ...validFile, fileSize: -100 });
      expect(errors.some(e => e.includes('positive'))).toBe(true);
    });

    it('rejects non-number fileSize', () => {
      const errors = validateFileMetadata({ ...validFile, fileSize: 'large' });
      expect(errors.some(e => e.includes('positive'))).toBe(true);
    });

    it('accepts exactly MAX_FILE_SIZE', () => {
      const errors = validateFileMetadata({ ...validFile, fileSize: MAX_FILE_SIZE });
      expect(errors.filter(e => e.toLowerCase().includes('size'))).toEqual([]);
    });
  });

  describe('fileUrl validation', () => {
    it('rejects HTTP URL (non-HTTPS)', () => {
      const errors = validateFileMetadata({ ...validFile, fileUrl: 'http://example.com/file.pdf' });
      expect(errors.some(e => e.includes('HTTPS'))).toBe(true);
    });

    it('rejects invalid URL', () => {
      const errors = validateFileMetadata({ ...validFile, fileUrl: 'not-a-url' });
      expect(errors.some(e => e.includes('not a valid URL'))).toBe(true);
    });

    it('rejects URL exceeding max length', () => {
      const errors = validateFileMetadata({
        ...validFile,
        fileUrl: 'https://example.com/' + 'a'.repeat(MAX_LENGTH.FILE_URL),
      });
      expect(errors.some(e => e.includes('exceeds'))).toBe(true);
    });
  });
});

// ═══ C-02 / H-02: validateBranchAccess ═══

describe('validateBranchAccess', () => {
  describe('non-admin users', () => {
    it('returns user branchId when no branchId requested', () => {
      const user = makeUser({ branchId: 'branch-1' });
      const result = validateBranchAccess(user, null);
      expect(result).toEqual({ branchId: 'branch-1', error: null, status: 200 });
    });

    it('returns user branchId when matching branchId requested', () => {
      const user = makeUser({ branchId: 'branch-1' });
      const result = validateBranchAccess(user, 'branch-1');
      expect(result).toEqual({ branchId: 'branch-1', error: null, status: 200 });
    });

    it('returns 404 when different branchId requested (prevents enumeration)', () => {
      const user = makeUser({ branchId: 'branch-1' });
      const result = validateBranchAccess(user, 'branch-2');
      expect(result.error).toBe('Not found');
      expect(result.status).toBe(404);
    });

    it('returns 403 when user has no branch assignment', () => {
      const user = makeUser({ branchId: undefined });
      const result = validateBranchAccess(user, null);
      expect(result.error).toContain('no branch assignment');
      expect(result.status).toBe(403);
    });
  });

  describe('admin users with VIEW_ALL permission', () => {
    it('allows specifying any branchId', () => {
      const admin = makeAdmin();
      const result = validateBranchAccess(admin, 'branch-99', PERMISSIONS.LEGAL_REQUESTS_VIEW_ALL);
      expect(result).toEqual({ branchId: 'branch-99', error: null, status: 200 });
    });

    it('returns null branchId when no branch specified (all branches)', () => {
      const admin = makeAdmin();
      const result = validateBranchAccess(admin, null, PERMISSIONS.LEGAL_REQUESTS_VIEW_ALL);
      expect(result).toEqual({ branchId: null, error: null, status: 200 });
    });
  });

  describe('H-02: ignores client-supplied branchId for non-admin', () => {
    it('employee cannot see another branch data', () => {
      const user = makeUser({ branchId: 'branch-1', role: 'employee' });
      const result = validateBranchAccess(user, 'branch-2');
      expect(result.branchId).toBeNull();
      expect(result.status).toBe(404);
    });
  });
});

// ═══ C-02: validateRecordBranchAccess ═══

describe('validateRecordBranchAccess', () => {
  it('allows access when record branch matches user branch', () => {
    const user = makeUser({ branchId: 'branch-1' });
    expect(validateRecordBranchAccess(user, 'branch-1')).toBe(true);
  });

  it('denies access when record branch differs', () => {
    const user = makeUser({ branchId: 'branch-1' });
    expect(validateRecordBranchAccess(user, 'branch-2')).toBe(false);
  });

  it('denies access when user has no branch', () => {
    const user = makeUser({ branchId: undefined });
    expect(validateRecordBranchAccess(user, 'branch-1')).toBe(false);
  });

  it('denies access when record has no branch', () => {
    const user = makeUser({ branchId: 'branch-1' });
    expect(validateRecordBranchAccess(user, null)).toBe(false);
  });

  it('allows admin with VIEW_ALL to access any branch record', () => {
    const admin = makeAdmin();
    expect(validateRecordBranchAccess(admin, 'branch-99', PERMISSIONS.MAINTENANCE_VIEW_ALL)).toBe(true);
  });
});

// ═══ C-01: validateOperatorSession ═══

describe('validateOperatorSession', () => {
  it('returns valid with null operatorId when no operator specified', async () => {
    const result = await validateOperatorSession(null, 'user-1', 'branch-1');
    expect(result).toEqual({ valid: true, operatorId: null });
  });

  it('returns valid with null operatorId when operator is session user', async () => {
    const result = await validateOperatorSession('user-1', 'user-1', 'branch-1');
    expect(result).toEqual({ valid: true, operatorId: null });
  });

  it('returns valid with null operatorId for undefined operator', async () => {
    const result = await validateOperatorSession(undefined, 'user-1', 'branch-1');
    expect(result).toEqual({ valid: true, operatorId: null });
  });

  it('rejects operator claim when Supabase is not configured', async () => {
    const result = await validateOperatorSession('operator-1', 'user-1', 'branch-1');
    expect(result).toEqual({ valid: false, operatorId: null });
  });
});

// ═══ M-02: parsePagination ═══

describe('parsePagination', () => {
  it('returns defaults for null params', () => {
    expect(parsePagination(null, null)).toEqual({ page: 1, pageSize: 20 });
  });

  it('parses valid page and pageSize', () => {
    expect(parsePagination('3', '50')).toEqual({ page: 3, pageSize: 50 });
  });

  it('clamps page to minimum of 1', () => {
    expect(parsePagination('0', '20')).toEqual({ page: 1, pageSize: 20 });
    expect(parsePagination('-5', '20')).toEqual({ page: 1, pageSize: 20 });
  });

  it('clamps page to maximum of 10000', () => {
    expect(parsePagination('999999', '20')).toEqual({ page: 10_000, pageSize: 20 });
  });

  it('clamps pageSize to minimum of 1', () => {
    expect(parsePagination('1', '0')).toEqual({ page: 1, pageSize: 1 });
    expect(parsePagination('1', '-10')).toEqual({ page: 1, pageSize: 1 });
  });

  it('clamps pageSize to max of 100', () => {
    expect(parsePagination('1', '500')).toEqual({ page: 1, pageSize: 100 });
  });

  it('returns defaults for NaN inputs', () => {
    expect(parsePagination('abc', 'xyz')).toEqual({ page: 1, pageSize: 20 });
  });

  it('returns defaults for empty strings', () => {
    expect(parsePagination('', '')).toEqual({ page: 1, pageSize: 20 });
  });

  it('accepts custom defaults', () => {
    const result = parsePagination(null, null, { page: 5, pageSize: 10, maxPageSize: 50 });
    expect(result).toEqual({ page: 5, pageSize: 10 });
  });

  it('respects custom maxPageSize', () => {
    const result = parsePagination('1', '100', { page: 1, pageSize: 10, maxPageSize: 50 });
    expect(result).toEqual({ page: 1, pageSize: 50 });
  });
});

// ═══ H-03: validateEnum ═══

describe('validateEnum', () => {
  const STATUSES = ['open', 'in_progress', 'resolved'] as const;

  it('returns valid value for allowed enum', () => {
    expect(validateEnum('open', STATUSES, 'status')).toEqual({ value: 'open', error: null });
  });

  it('returns null value with no error for undefined (optional)', () => {
    expect(validateEnum(undefined, STATUSES, 'status')).toEqual({ value: null, error: null });
  });

  it('returns null value with no error for null (optional)', () => {
    expect(validateEnum(null, STATUSES, 'status')).toEqual({ value: null, error: null });
  });

  it('returns error for invalid value', () => {
    const result = validateEnum('invalid', STATUSES, 'status');
    expect(result.error).toContain('Invalid status');
    expect(result.error).toContain('Allowed values');
  });

  it('returns error for non-string type', () => {
    const result = validateEnum(42, STATUSES, 'status');
    expect(result.error).toContain('must be a string');
  });
});

describe('validateRequiredEnum', () => {
  const URGENCIES = ['critical', 'high', 'medium', 'low'] as const;

  it('returns error for undefined', () => {
    const result = validateRequiredEnum(undefined, URGENCIES, 'urgency');
    expect(result.error).toContain('is required');
  });

  it('returns error for null', () => {
    const result = validateRequiredEnum(null, URGENCIES, 'urgency');
    expect(result.error).toContain('is required');
  });

  it('returns error for empty string', () => {
    const result = validateRequiredEnum('', URGENCIES, 'urgency');
    expect(result.error).toContain('is required');
  });

  it('validates against allowed values', () => {
    expect(validateRequiredEnum('critical', URGENCIES, 'urgency')).toEqual({ value: 'critical', error: null });
  });

  it('rejects invalid enum value', () => {
    const result = validateRequiredEnum('urgent', URGENCIES, 'urgency');
    expect(result.error).toContain('Invalid urgency');
  });
});

// ═══ MAX_LENGTH constants ═══

describe('MAX_LENGTH constants', () => {
  it('has all required field limits defined', () => {
    expect(MAX_LENGTH.DESCRIPTION).toBe(10_000);
    expect(MAX_LENGTH.COMMENT).toBe(5_000);
    expect(MAX_LENGTH.NOTES).toBe(2_000);
    expect(MAX_LENGTH.REASON).toBe(2_000);
    expect(MAX_LENGTH.LOCATION).toBe(1_000);
    expect(MAX_LENGTH.SEARCH_QUERY).toBe(200);
    expect(MAX_LENGTH.FILE_NAME).toBe(255);
    expect(MAX_LENGTH.FILE_URL).toBe(2_048);
  });
});
