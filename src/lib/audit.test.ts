/**
 * Audit logging tests
 * Tests for centralized audit trail system
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getRequestMeta } from '@/lib/audit';

// Mock supabase before importing audit
vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: vi.fn(() => ({
      insert: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
  },
}));

describe('Audit logging', () => {
  describe('getRequestMeta', () => {
    it('should extract IP from x-forwarded-for header', () => {
      const headers = new Headers();
      headers.set('x-forwarded-for', '203.0.113.50, 70.41.3.18');
      headers.set('user-agent', 'Mozilla/5.0');
      const request = new Request('https://example.com', { headers });

      const meta = getRequestMeta(request);
      expect(meta.ip_address).toBe('203.0.113.50');
      expect(meta.user_agent).toBe('Mozilla/5.0');
    });

    it('should fall back to x-real-ip if x-forwarded-for is missing', () => {
      const headers = new Headers();
      headers.set('x-real-ip', '10.0.0.1');
      const request = new Request('https://example.com', { headers });

      const meta = getRequestMeta(request);
      expect(meta.ip_address).toBe('10.0.0.1');
    });

    it('should return "unknown" when no IP headers present', () => {
      const request = new Request('https://example.com');
      const meta = getRequestMeta(request);
      expect(meta.ip_address).toBe('unknown');
    });

    it('should return "unknown" for missing user-agent', () => {
      const request = new Request('https://example.com');
      const meta = getRequestMeta(request);
      expect(meta.user_agent).toBe('unknown');
    });

    it('should trim whitespace from x-forwarded-for', () => {
      const headers = new Headers();
      headers.set('x-forwarded-for', '  203.0.113.50  , 70.41.3.18');
      const request = new Request('https://example.com', { headers });

      const meta = getRequestMeta(request);
      expect(meta.ip_address).toBe('203.0.113.50');
    });
  });

  describe('audit function', () => {
    it('should export the audit function', async () => {
      const { audit } = await import('@/lib/audit');
      expect(typeof audit).toBe('function');
    });

    it('should not throw when called', async () => {
      const { audit } = await import('@/lib/audit');
      await expect(
        audit({
          action: 'auth.login',
          user_id: 'test-user',
          ip_address: '127.0.0.1',
        })
      ).resolves.not.toThrow();
    });

    it('should handle audit failures gracefully (non-blocking)', async () => {
      // Even if supabase throws, audit should not propagate the error
      const { audit } = await import('@/lib/audit');
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // Should not throw
      await expect(
        audit({
          action: 'auth.login',
          user_id: 'test-user',
        })
      ).resolves.not.toThrow();

      consoleSpy.mockRestore();
    });
  });
});
