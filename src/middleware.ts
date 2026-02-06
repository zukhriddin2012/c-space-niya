import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { rateLimit } from '@/lib/rate-limiter';
import { validateCsrf, setCsrfCookie } from '@/lib/csrf';

// SEC-003: JWT_SECRET must come from env — no fallback (matches auth.ts behavior)
const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret && process.env.NODE_ENV === 'production') {
  throw new Error('FATAL: JWT_SECRET environment variable is not set in middleware.');
}
const JWT_SECRET = new TextEncoder().encode(jwtSecret || 'dev-only-fallback-not-for-production');

// Routes that do NOT require authentication
const PUBLIC_ROUTES = new Set([
  '/api/auth/login',
  '/api/auth/refresh',
  '/api/auth/logout',
  '/api/telegram-bot/webhook',  // Has its own secret_token auth
  '/api/config',                // Public config endpoint
]);

// Routes with custom auth (not JWT)
const CUSTOM_AUTH_ROUTES = new Set([
  '/api/admin/import-employees',  // x-admin-secret header
  '/api/telegram-action',         // Telegram initData auth
  '/api/attendance/ip-checkin',   // Telegram-based auth
]);

// Public page routes (not API)
const PUBLIC_PAGES = ['/login', '/reset-password'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Non-API routes: set CSRF cookie if missing, then pass through
  if (!pathname.startsWith('/api/')) {
    const response = NextResponse.next();
    if (!request.cookies.get('csrf-token')) {
      return setCsrfCookie(response);
    }
    return response;
  }

  // SEC-015: Rate limiting on login endpoint
  if (pathname === '/api/auth/login' && request.method === 'POST') {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || request.headers.get('x-real-ip')
      || 'unknown';
    const result = rateLimit(`login:${ip}`, 5, 15 * 60 * 1000);
    if (!result.allowed) {
      return NextResponse.json(
        { error: 'Too many login attempts. Please try again later.', retryAfter: result.retryAfter },
        { status: 429, headers: { 'Retry-After': String(result.retryAfter || 900) } }
      );
    }
  }

  // Public routes: allow through
  if (PUBLIC_ROUTES.has(pathname)) {
    return NextResponse.next();
  }

  // Custom auth routes: allow through (they handle their own auth)
  if (CUSTOM_AUTH_ROUTES.has(pathname)) {
    return NextResponse.next();
  }

  // SEC-016: CSRF validation for state-changing methods
  if (!validateCsrf(request)) {
    return NextResponse.json(
      { error: 'Invalid or missing CSRF token. Please refresh the page.' },
      { status: 403 }
    );
  }

  // All other API routes: require valid JWT
  const token = request.cookies.get('c-space-auth')?.value;
  if (!token) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    );
  }

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);

    // Forward user ID to route handlers via header
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-user-id', payload.sub as string);

    return NextResponse.next({
      request: { headers: requestHeaders },
    });
  } catch {
    return NextResponse.json(
      { error: 'Invalid or expired token' },
      { status: 401 }
    );
  }
}

export const config = {
  matcher: [
    '/api/:path*',
    '/((?!_next/static|_next/image|favicon\\.svg|logo|.*\\.png$).*)',
  ],
};
