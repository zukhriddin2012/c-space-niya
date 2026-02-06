/**
 * Security integration tests
 * Cross-module tests validating security requirements work together
 */
import { describe, it, expect, vi } from 'vitest';
import {
  PERMISSIONS,
  ROLE_HIERARCHY,
  hasPermission,
  ROLE_PERMISSIONS,
  getAllRoles,
} from '@/lib/permissions';
import { validatePassword } from '@/lib/password-validation';
import { sanitizeError } from '@/lib/error-messages';
import { getCorsHeaders } from '@/lib/cors';
import { rateLimit } from '@/lib/rate-limiter';
import { generateCsrfToken } from '@/lib/csrf';

describe('Security integration tests', () => {
  describe('SEC-001/SEC-008: Password policy enforcement', () => {
    it('should reject common weak passwords', () => {
      const weakPasswords = [
        'password',
        '12345678',
        'qwerty123',
        'admin',
        'letmein',
        '123456789',
        'abc123',
      ];
      for (const pass of weakPasswords) {
        const result = validatePassword(pass);
        expect(result.isValid).toBe(false);
      }
    });

    it('should accept passwords meeting all criteria', () => {
      const strongPasswords = [
        'C-Sp@ce2026!',
        'T4shk3nt!Uzb',
        'Secur1ty_T3st',
        'P@ssw0rd_Str0ng',
      ];
      for (const pass of strongPasswords) {
        const result = validatePassword(pass);
        expect(result.isValid).toBe(true);
      }
    });
  });

  describe('SEC-011: CORS cannot be bypassed', () => {
    it('should reject origin with trailing path', () => {
      const headers = getCorsHeaders('https://niya.cspace.uz/malicious');
      expect(headers['Access-Control-Allow-Origin']).not.toBe('https://niya.cspace.uz/malicious');
    });

    it('should reject origin with different protocol', () => {
      const headers = getCorsHeaders('http://niya.cspace.uz');
      expect(headers['Access-Control-Allow-Origin']).not.toBe('http://niya.cspace.uz');
    });

    it('should reject origin with port', () => {
      const headers = getCorsHeaders('https://niya.cspace.uz:8080');
      expect(headers['Access-Control-Allow-Origin']).not.toBe('https://niya.cspace.uz:8080');
    });
  });

  describe('SEC-015/SEC-016: Rate limiting + CSRF work together', () => {
    it('CSRF tokens should be cryptographically strong', () => {
      const token = generateCsrfToken();
      // 32 bytes = 64 hex chars — sufficient entropy
      expect(token.length).toBe(64);
      // Should be hex
      expect(token).toMatch(/^[a-f0-9]{64}$/);
    });

    it('rate limiter should not affect CSRF generation', () => {
      // Even when rate limited, CSRF tokens should still be generatable
      const key = 'csrf-test-' + Date.now();
      for (let i = 0; i < 10; i++) {
        rateLimit(key, 5, 60000);
      }
      // CSRF should still work
      const token = generateCsrfToken();
      expect(token.length).toBe(64);
    });
  });

  describe('SEC-020: Error messages never leak implementation details', () => {
    const sensitivePatterns = [
      'supabase',
      'postgresql',
      'postgres',
      '.ts',
      '.js',
      'node_modules',
      'src/',
      'password_hash',
      'bcrypt',
      'jwt_secret',
      'select',
      'insert',
      'update',
      'delete from',
      'table',
      'column',
      'schema',
    ];

    it('should not contain any sensitive patterns in sanitized errors', () => {
      const testErrors = [
        new Error('ECONNREFUSED postgres://localhost:5432/cspace'),
        new Error('bcrypt: data and hash must be strings'),
        new Error('JWT_SECRET is undefined'),
        new Error('TypeError at src/lib/auth.ts:42'),
        new Error('select * from employees where id = 1'),
        new Error('insert into audit_log failed: constraint violation'),
      ];

      for (const error of testErrors) {
        const result = sanitizeError(error);
        for (const pattern of sensitivePatterns) {
          expect(result.message.toLowerCase()).not.toContain(pattern.toLowerCase());
        }
      }
    });
  });

  describe('SEC-022: All roles have consistent permission sets', () => {
    it('every role in ROLE_HIERARCHY should have a permission set', () => {
      for (const role of Object.keys(ROLE_HIERARCHY)) {
        expect(ROLE_PERMISSIONS).toHaveProperty(role);
      }
    });

    it('every permission value should be a valid Permission constant', () => {
      const validPerms = new Set(Object.values(PERMISSIONS));
      for (const [role, perms] of Object.entries(ROLE_PERMISSIONS)) {
        for (const perm of perms) {
          expect(validPerms.has(perm)).toBe(true);
        }
      }
    });

    it('getAllRoles should match ROLE_HIERARCHY keys', () => {
      const hierarchyRoles = new Set(Object.keys(ROLE_HIERARCHY));
      const allRoles = new Set(getAllRoles());
      expect(allRoles).toEqual(hierarchyRoles);
    });

    it('every role should have at least dashboard view and feedback submit', () => {
      for (const role of getAllRoles()) {
        expect(hasPermission(role, PERMISSIONS.DASHBOARD_VIEW)).toBe(true);
        expect(hasPermission(role, PERMISSIONS.FEEDBACK_SUBMIT)).toBe(true);
      }
    });
  });

  describe('Security boundary tests', () => {
    it('employee cannot access admin-only permissions', () => {
      const adminPerms = [
        PERMISSIONS.EMPLOYEES_DELETE,
        PERMISSIONS.USERS_ASSIGN_ROLES,
        PERMISSIONS.USERS_DELETE,
        PERMISSIONS.SETTINGS_EDIT,
        PERMISSIONS.DASHBOARD_ADMIN,
        PERMISSIONS.BRANCHES_DELETE,
        PERMISSIONS.OPERATOR_PIN_MANAGE,
      ];
      for (const perm of adminPerms) {
        expect(hasPermission('employee', perm)).toBe(false);
      }
    });

    it('branch_manager cannot delete employees', () => {
      expect(hasPermission('branch_manager', PERMISSIONS.EMPLOYEES_DELETE)).toBe(false);
    });

    it('accountant cannot assign roles', () => {
      expect(hasPermission('accountant', PERMISSIONS.USERS_ASSIGN_ROLES)).toBe(false);
    });

    it('recruiter has limited scope', () => {
      expect(hasPermission('recruiter', PERMISSIONS.RECRUITMENT_MANAGE)).toBe(true);
      expect(hasPermission('recruiter', PERMISSIONS.PAYROLL_VIEW)).toBe(false);
      expect(hasPermission('recruiter', PERMISSIONS.EMPLOYEES_EDIT)).toBe(false);
    });
  });

  describe('CORS + Error handling: no information leakage path', () => {
    it('disallowed CORS origin should not see any internal data in error response', () => {
      const corsHeaders = getCorsHeaders('https://evil.com');
      // The error sanitizer would be used for any API errors
      const error = sanitizeError(new Error('DB connection failed to postgres:5432'));

      // Even with CORS headers set, the error should be sanitized
      expect(error.message).not.toContain('postgres');
      expect(error.message).not.toContain('5432');
      // CORS should not reflect the evil origin
      expect(corsHeaders['Access-Control-Allow-Origin']).not.toBe('https://evil.com');
    });
  });
});
