/**
 * SEC-016: CSRF protection tests
 * Tests for double-submit cookie pattern
 */
import { describe, it, expect, vi } from 'vitest';
import { generateCsrfToken, validateCsrf } from '@/lib/csrf';

// Mock NextRequest for CSRF validation testing
function createMockRequest(opts: {
  method: string;
  pathname: string;
  cookieToken?: string;
  headerToken?: string;
}): any {
  return {
    method: opts.method,
    nextUrl: { pathname: opts.pathname },
    cookies: {
      get: (name: string) => {
        if (name === 'csrf-token' && opts.cookieToken) {
          return { value: opts.cookieToken };
        }
        return undefined;
      },
    },
    headers: {
      get: (name: string) => {
        if (name === 'x-csrf-token') return opts.headerToken || null;
        return null;
      },
    },
  };
}

describe('CSRF protection (SEC-016)', () => {
  describe('generateCsrfToken', () => {
    it('should generate a hex string', () => {
      const token = generateCsrfToken();
      expect(token).toMatch(/^[a-f0-9]+$/);
    });

    it('should generate 64-character tokens (32 bytes hex)', () => {
      const token = generateCsrfToken();
      expect(token.length).toBe(64);
    });

    it('should generate unique tokens each time', () => {
      const tokens = new Set<string>();
      for (let i = 0; i < 100; i++) {
        tokens.add(generateCsrfToken());
      }
      expect(tokens.size).toBe(100);
    });
  });

  describe('validateCsrf', () => {
    describe('safe methods (GET, HEAD, OPTIONS)', () => {
      it('should skip CSRF for GET requests', () => {
        const req = createMockRequest({ method: 'GET', pathname: '/api/employees' });
        expect(validateCsrf(req)).toBe(true);
      });

      it('should skip CSRF for HEAD requests', () => {
        const req = createMockRequest({ method: 'HEAD', pathname: '/api/employees' });
        expect(validateCsrf(req)).toBe(true);
      });

      it('should skip CSRF for OPTIONS requests', () => {
        const req = createMockRequest({ method: 'OPTIONS', pathname: '/api/employees' });
        expect(validateCsrf(req)).toBe(true);
      });
    });

    describe('exempt routes', () => {
      const exemptRoutes = [
        '/api/auth/login',
        '/api/auth/refresh',
        '/api/telegram-bot/webhook',
        '/api/telegram-action',
        '/api/attendance/ip-checkin',
        '/api/admin/import-employees',
      ];

      for (const route of exemptRoutes) {
        it(`should skip CSRF for ${route}`, () => {
          const req = createMockRequest({
            method: 'POST',
            pathname: route,
          });
          expect(validateCsrf(req)).toBe(true);
        });
      }
    });

    describe('protected methods (POST, PUT, PATCH, DELETE)', () => {
      const protectedMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];

      for (const method of protectedMethods) {
        it(`should require CSRF token for ${method}`, () => {
          const req = createMockRequest({
            method,
            pathname: '/api/employees',
          });
          expect(validateCsrf(req)).toBe(false);
        });
      }

      it('should validate matching cookie and header tokens', () => {
        const token = generateCsrfToken();
        const req = createMockRequest({
          method: 'POST',
          pathname: '/api/employees',
          cookieToken: token,
          headerToken: token,
        });
        expect(validateCsrf(req)).toBe(true);
      });

      it('should reject mismatched tokens', () => {
        const req = createMockRequest({
          method: 'POST',
          pathname: '/api/employees',
          cookieToken: generateCsrfToken(),
          headerToken: generateCsrfToken(),
        });
        expect(validateCsrf(req)).toBe(false);
      });

      it('should reject when cookie token is missing', () => {
        const req = createMockRequest({
          method: 'POST',
          pathname: '/api/employees',
          headerToken: generateCsrfToken(),
        });
        expect(validateCsrf(req)).toBe(false);
      });

      it('should reject when header token is missing', () => {
        const req = createMockRequest({
          method: 'POST',
          pathname: '/api/employees',
          cookieToken: generateCsrfToken(),
        });
        expect(validateCsrf(req)).toBe(false);
      });

      it('should reject when both tokens are missing', () => {
        const req = createMockRequest({
          method: 'POST',
          pathname: '/api/employees',
        });
        expect(validateCsrf(req)).toBe(false);
      });

      it('should reject tokens of different lengths (timing attack prevention)', () => {
        const req = createMockRequest({
          method: 'POST',
          pathname: '/api/employees',
          cookieToken: 'short',
          headerToken: 'muchlongertoken',
        });
        expect(validateCsrf(req)).toBe(false);
      });
    });
  });
});
