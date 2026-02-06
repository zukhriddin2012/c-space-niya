import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { rateLimit } from '@/lib/rate-limiter';
import { validateCsrf, setCsrfCookie } from '@/lib/csrf';

// SEC-003: JWT_SECRET must come from env — no fallback in production
const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret && process.env.NODE_ENV === 'production') {
  throw new Error('FATAL: JWT_SECRET environment variable is not set.');
}
const JWT_SECRET = new TextEncoder().encode(jwtSecret || 'dev-only-fallback-not-for-production');

// API routes that do NOT require authentication
const PUBLIC_API_ROUTES = new Set([
  '/api/auth/login',
  '/api/auth/refresh',
  '/api/auth/logout',
  '/api/telegram-bot/webhook',  // Has its own secret_token auth
  '/api/config',                // Public config endpoint
  '/api/documents/sign',        // Document signing API (no auth required)
  '/api/employees/language',    // Language preference API (for bot)
]);

// API routes that use startsWith matching (prefix-based public routes)
const PUBLIC_API_PREFIXES = [
  '/api/telegram-bot',          // All telegram bot APIs
  '/api/attendance/checkout-check',  // Telegram mini app checkout reminder
  '/api/attendance/checkout-action', // Telegram mini app checkout action
  '/api/reception/kiosk',       // Reception kiosk auth (has its own password/JWT auth)
];

// API routes with custom auth (not JWT — they handle their own authentication)
const CUSTOM_AUTH_ROUTES = new Set([
  '/api/admin/import-employees',  // x-admin-secret header
  '/api/telegram-action',         // Telegram initData auth
  '/api/attendance/ip-checkin',   // Telegram-based auth
]);

// Public page routes (not API) — no auth required
const PUBLIC_PAGES = ['/login', '/reset-password', '/telegram', '/sign', '/kiosk'];

/**
 * Next.js middleware — handles auth, CSRF, and rate limiting
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Static assets: always pass through
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/images') ||
    pathname.endsWith('.ico') ||
    pathname.endsWith('.svg') ||
    pathname.endsWith('.png') ||
    pathname.endsWith('.jpg') ||
    pathname.endsWith('.css') ||
    pathname.endsWith('.js')
  ) {
    return NextResponse.next();
  }

  // ─── API ROUTES ───────────────────────────────────────────────
  if (pathname.startsWith('/api/')) {
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

    // Public API routes: allow through (exact match)
    if (PUBLIC_API_ROUTES.has(pathname)) {
      return NextResponse.next();
    }

    // Public API routes: allow through (prefix match)
    if (PUBLIC_API_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
      return NextResponse.next();
    }

    // Custom auth routes: allow through (they handle their own auth)
    if (CUSTOM_AUTH_ROUTES.has(pathname)) {
      return NextResponse.next();
    }

    // All other API routes: require valid JWT (or kiosk token for reception routes)
    const token = request.cookies.get('c-space-auth')?.value;
    const kioskToken = request.cookies.get('reception-kiosk')?.value;

    // SEC-016: CSRF validation — skip for JWT/kiosk-authenticated requests
    // JWT in SameSite=strict cookie is already CSRF-proof; double-submit
    // is only needed for cookie-less form submissions (login page, etc.)
    if (!token && !kioskToken && !validateCsrf(request)) {
      return NextResponse.json(
        { error: 'Invalid or missing CSRF token. Please refresh the page.' },
        { status: 403 }
      );
    }

    // Try regular JWT auth first
    if (token) {
      try {
        const { payload } = await jwtVerify(token, JWT_SECRET);
        const requestHeaders = new Headers(request.headers);
        requestHeaders.set('x-user-id', payload.sub as string);
        return NextResponse.next({ request: { headers: requestHeaders } });
      } catch {
        // Token invalid — fall through to kiosk check or reject
      }
    }

    // Kiosk fallback: allow reception-kiosk cookie for /api/reception/* routes only
    if (kioskToken && pathname.startsWith('/api/reception/')) {
      try {
        const { payload } = await jwtVerify(kioskToken, JWT_SECRET);
        if (payload.type === 'kiosk' && payload.branchId) {
          const requestHeaders = new Headers(request.headers);
          requestHeaders.set('x-kiosk-branch', payload.branchId as string);
          return NextResponse.next({ request: { headers: requestHeaders } });
        }
      } catch {
        // Kiosk token invalid — reject below
      }
    }

    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    );
  }

  // ─── PAGE ROUTES ──────────────────────────────────────────────

  // Public pages: set CSRF cookie if missing, then pass through
  if (PUBLIC_PAGES.some((page) => pathname.startsWith(page))) {
    const response = NextResponse.next();
    if (!request.cookies.get('csrf-token')) {
      return setCsrfCookie(response);
    }
    return response;
  }

  // All other pages: require authentication
  // Set CSRF cookie if missing on every page response
  const token = request.cookies.get('c-space-auth')?.value;

  if (!token) {
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  try {
    await jwtVerify(token, JWT_SECRET);
    const response = NextResponse.next();
    if (!request.cookies.get('csrf-token')) {
      return setCsrfCookie(response);
    }
    return response;
  } catch {
    // Token invalid — redirect to login and clear cookie
    const loginUrl = new URL('/login', request.url);
    const response = NextResponse.redirect(loginUrl);
    response.cookies.delete('c-space-auth');
    return response;
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|favicon\\.svg|images).*)',
  ],
};
