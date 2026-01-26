import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'c-space-hr-secret-key-change-in-production'
);

const publicPaths = [
  '/login',
  '/api/auth/login',
  '/telegram',
  '/api/attendance/ip-checkin',
  '/api/attendance/checkout-check', // Telegram mini app checkout reminder
  '/api/attendance/checkout-action', // Telegram mini app checkout action
  '/api/telegram-bot', // All telegram bot APIs
  '/api/employees/language', // Language preference API (for bot)
  '/sign', // Document signing page for candidates (no auth required)
  '/api/documents/sign', // Document signing API (no auth required)
];

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths
  if (publicPaths.some((path) => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  // Allow static files and api routes (except protected ones)
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/images') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // Check for auth cookie
  const token = request.cookies.get('c-space-auth')?.value;

  if (!token) {
    // Redirect to login if not authenticated
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  try {
    // Verify token
    await jwtVerify(token, JWT_SECRET);
    return NextResponse.next();
  } catch {
    // Token invalid - redirect to login
    const loginUrl = new URL('/login', request.url);
    const response = NextResponse.redirect(loginUrl);
    response.cookies.delete('c-space-auth');
    return response;
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     */
    '/((?!_next/static|_next/image|favicon.ico|images).*)',
  ],
};
