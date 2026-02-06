/**
 * SEC-011: CORS configuration tests
 * Tests for origin allowlist enforcement
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// We need to test with different env values, so we use dynamic imports
describe('getCorsHeaders (SEC-011)', () => {
  const originalEnv = process.env.NEXT_PUBLIC_APP_URL;

  afterEach(() => {
    process.env.NEXT_PUBLIC_APP_URL = originalEnv;
  });

  // Helper to get a fresh module import
  async function freshImport() {
    // Reset module cache
    vi.resetModules();
    return import('@/lib/cors');
  }

  it('should return the requesting origin when it is in the allowlist', async () => {
    const { getCorsHeaders } = await freshImport();
    const headers = getCorsHeaders('https://web.telegram.org');
    expect(headers['Access-Control-Allow-Origin']).toBe('https://web.telegram.org');
  });

  it('should return the requesting origin for Vercel deployment', async () => {
    const { getCorsHeaders } = await freshImport();
    const headers = getCorsHeaders('https://c-space-niya.vercel.app');
    expect(headers['Access-Control-Allow-Origin']).toBe('https://c-space-niya.vercel.app');
  });

  it('should return default origin for null origin', async () => {
    const { getCorsHeaders } = await freshImport();
    const headers = getCorsHeaders(null);
    // Should fall back to ALLOWED_ORIGINS[0]
    expect(headers['Access-Control-Allow-Origin']).not.toBe('*');
  });

  it('should NOT return wildcard (*) for any origin', async () => {
    const { getCorsHeaders } = await freshImport();

    const testOrigins = [
      null,
      'https://evil.com',
      'https://niya.cspace.uz.evil.com',
      'http://localhost:3000',
      '*',
      '',
    ];

    for (const origin of testOrigins) {
      const headers = getCorsHeaders(origin);
      expect(headers['Access-Control-Allow-Origin']).not.toBe('*');
    }
  });

  it('should reject disallowed origins by returning fallback (not the malicious origin)', async () => {
    const { getCorsHeaders } = await freshImport();
    const headers = getCorsHeaders('https://evil.com');
    expect(headers['Access-Control-Allow-Origin']).not.toBe('https://evil.com');
  });

  it('should reject subdomain attacks (startsWith bypass)', async () => {
    const { getCorsHeaders } = await freshImport();
    // This tests the fix for C-01: CORS startsWith() bypass
    const headers = getCorsHeaders('https://niya.cspace.uz.evil.com');
    expect(headers['Access-Control-Allow-Origin']).not.toBe('https://niya.cspace.uz.evil.com');
  });

  it('should include expected CORS methods', async () => {
    const { getCorsHeaders } = await freshImport();
    const headers = getCorsHeaders('https://web.telegram.org');
    expect(headers['Access-Control-Allow-Methods']).toContain('GET');
    expect(headers['Access-Control-Allow-Methods']).toContain('POST');
    expect(headers['Access-Control-Allow-Methods']).toContain('DELETE');
    expect(headers['Access-Control-Allow-Methods']).toContain('OPTIONS');
  });

  it('should include Authorization in allowed headers', async () => {
    const { getCorsHeaders } = await freshImport();
    const headers = getCorsHeaders('https://web.telegram.org');
    expect(headers['Access-Control-Allow-Headers']).toContain('Authorization');
    expect(headers['Access-Control-Allow-Headers']).toContain('Content-Type');
  });

  it('should have a reasonable max-age cache', async () => {
    const { getCorsHeaders } = await freshImport();
    const headers = getCorsHeaders('https://web.telegram.org');
    const maxAge = parseInt(headers['Access-Control-Max-Age']);
    expect(maxAge).toBeGreaterThan(0);
    expect(maxAge).toBeLessThanOrEqual(86400); // max 24 hours
  });

  it('should use NEXT_PUBLIC_APP_URL from environment', async () => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://custom.example.com';
    const { getCorsHeaders } = await freshImport();
    const headers = getCorsHeaders('https://custom.example.com');
    expect(headers['Access-Control-Allow-Origin']).toBe('https://custom.example.com');
  });
});
