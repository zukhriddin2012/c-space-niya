import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from './auth';
import { hasPermission, hasAnyPermission, Permission } from './permissions';
import { verifyKioskToken, KIOSK_COOKIE_NAME } from './kiosk-auth';
import { resolveOperatorEmployee, type ResolvedEmployee } from './security';
import type { User, UserRole } from '@/types';
import { classifyAction, trackUsage } from '@/lib/db';

const COOKIE_NAME = 'c-space-auth';

export interface AuthenticatedRequest extends NextRequest {
  user: User;
}

type ApiHandler = (
  request: NextRequest,
  context: { user: User; employee?: ResolvedEmployee; params?: Record<string, string> }
) => Promise<NextResponse>;

interface ProtectOptions {
  permission?: Permission;
  permissions?: Permission[];
  requireAll?: boolean;
  roles?: UserRole[];
  allowKiosk?: boolean;
}

/**
 * Middleware to protect API routes.
 *
 * When `allowKiosk: true`, the middleware automatically resolves the
 * real operator employee (via X-Operator-Id header, auth_user_id, or
 * email fallback) and provides it as `context.employee`.
 *
 * Usage:
 *
 * // Basic auth check
 * export const GET = withAuth(async (request, { user }) => {
 *   return NextResponse.json({ user });
 * });
 *
 * // Kiosk-enabled route with auto-resolved employee
 * export const POST = withAuth(
 *   async (request, { user, employee }) => {
 *     // employee is automatically resolved from operator headers
 *     if (!employee) return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
 *     return NextResponse.json({ agentId: employee.id });
 *   },
 *   { permission: 'reception:transactions:create', allowKiosk: true }
 * );
 *
 * // With role restriction
 * export const DELETE = withAuth(
 *   async (request, { user }) => {
 *     return NextResponse.json({ success: true });
 *   },
 *   { roles: ['general_manager'] }
 * );
 */
export function withAuth(
  handler: ApiHandler,
  options?: ProtectOptions
) {
  return async (
    request: NextRequest,
    context?: { params?: Promise<Record<string, string>> }
  ): Promise<NextResponse> => {
    try {
      // Get token from cookie
      const cookieStore = await cookies();
      const token = cookieStore.get(COOKIE_NAME)?.value;

      let user: User | null = null;

      if (token) {
        // Verify user token
        user = await verifyToken(token);
      }

      // If no valid user token and kiosk auth is allowed, try kiosk cookie
      if (!user && options?.allowKiosk) {
        const kioskToken = cookieStore.get(KIOSK_COOKIE_NAME)?.value;
        if (kioskToken) {
          const kioskPayload = await verifyKioskToken(kioskToken);
          if (kioskPayload) {
            // Create a synthetic kiosk user with reception-only permissions
            user = {
              id: `kiosk:${kioskPayload.branchId}`,
              email: '',
              name: 'Reception Kiosk',
              role: 'reception_kiosk' as UserRole,
              branchId: kioskPayload.branchId,
              createdAt: new Date(kioskPayload.authenticatedAt * 1000),
              updatedAt: new Date(),
            };
          }
        }
      }

      if (!user) {
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        );
      }

      // Check permissions if specified
      if (options) {
        const { permission, permissions, requireAll, roles } = options;

        // Check single permission
        if (permission && !hasPermission(user.role, permission)) {
          return NextResponse.json(
            { error: 'Insufficient permissions', required: permission },
            { status: 403 }
          );
        }

        // Check multiple permissions
        if (permissions && permissions.length > 0) {
          const hasPerms = requireAll
            ? permissions.every((p) => hasPermission(user.role, p))
            : hasAnyPermission(user.role, permissions);

          if (!hasPerms) {
            return NextResponse.json(
              { error: 'Insufficient permissions', required: permissions },
              { status: 403 }
            );
          }
        }

        // Check roles
        if (roles && roles.length > 0 && !roles.includes(user.role)) {
          return NextResponse.json(
            { error: 'Access denied for this role', allowedRoles: roles },
            { status: 403 }
          );
        }
      }

      // Resolve params if they exist
      const resolvedParams = context?.params ? await context.params : undefined;

      // Auto-resolve operator → employee for kiosk-enabled routes
      let employee: ResolvedEmployee | undefined;
      if (options?.allowKiosk) {
        try {
          const resolved = await resolveOperatorEmployee(request, user);
          if (resolved) {
            employee = resolved;
          }
        } catch (resolveError) {
          // Don't fail the entire request if employee resolution fails
          // The handler can decide what to do with employee === undefined
          console.error('[withAuth] Employee resolution failed:', resolveError);
        }
      }

      // Call the handler with authenticated user and resolved employee
      const response = await handler(request, { user, employee, params: resolvedParams });

      // CSN-186: Fire-and-forget usage tracking (non-blocking)
      const pathname = new URL(request.url).pathname;
      const classified = classifyAction(request.method, pathname);
      if (classified && user) {
        trackUsage(
          user.id,
          classified.module,
          classified.actionType,
          pathname,
          user.branchId,
          employee ? { operatorId: employee.id } : undefined
        ).catch((err) => {
          // SEC: Log tracking failures for observability (never block response)
          console.warn('[UsageTracking] Failed to record event:', err?.message || err);
        });
      }

      return response;
    } catch (error) {
      console.error('API auth error:', error);
      return NextResponse.json(
        { error: 'Authentication error' },
        { status: 500 }
      );
    }
  };
}

/**
 * Get current user from request (for routes that don't need protection)
 */
export async function getCurrentUser(): Promise<User | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return null;
    return verifyToken(token);
  } catch {
    return null;
  }
}

/**
 * Check if current user has permission (for use in server components/actions)
 */
export async function checkPermission(permission: Permission): Promise<boolean> {
  const user = await getCurrentUser();
  if (!user) return false;
  return hasPermission(user.role, permission);
}

/**
 * Require permission or throw (for server actions)
 */
export async function requirePermission(permission: Permission): Promise<User> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('Authentication required');
  }
  if (!hasPermission(user.role, permission)) {
    throw new Error(`Permission denied: ${permission}`);
  }
  return user;
}
