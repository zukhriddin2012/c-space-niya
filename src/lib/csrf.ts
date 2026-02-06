// SEC-016: CSRF protection using double-submit cookie pattern
// ADR-002: Stateless — no DB table needed. SameSite=strict is primary defense.

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

const CSRF_COOKIE = 'csrf-token';
const CSRF_HEADER = 'x-csrf-token';

// Methods that need CSRF protection
const PROTECTED_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

// Routes exempt from CSRF (they have their own auth)
const CSRF_EXEMPT_ROUTES = new Set([
  '/api/auth/login',
  '/api/auth/refresh',
  '/api/telegram-bot/webhook',
  '/api/telegram-action',
  '/api/attendance/ip-checkin',
  '/api/admin/import-employees',
]);

export function generateCsrfToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function validateCsrf(request: NextRequest): boolean {
  // Skip for safe methods
  if (!PROTECTED_METHODS.has(request.method)) return true;

  // Skip for exempt routes
  if (CSRF_EXEMPT_ROUTES.has(request.nextUrl.pathname)) return true;

  const cookieToken = request.cookies.get(CSRF_COOKIE)?.value;
  const headerToken = request.headers.get(CSRF_HEADER);

  if (!cookieToken || !headerToken) return false;

  // Constant-time comparison to prevent timing attacks
  if (cookieToken.length !== headerToken.length) return false;
  return crypto.timingSafeEqual(
    Buffer.from(cookieToken),
    Buffer.from(headerToken)
  );
}

export function setCsrfCookie(response: NextResponse): NextResponse {
  const token = generateCsrfToken();
  response.cookies.set(CSRF_COOKIE, token, {
    httpOnly: false, // Must be readable by client JS
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 60 * 60 * 24, // 24 hours
  });
  return response;
}
