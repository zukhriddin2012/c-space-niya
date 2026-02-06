import { SignJWT, jwtVerify } from 'jose';
import crypto from 'crypto';
import type { User, UserRole } from '@/types';
import { supabaseAdmin } from './supabase';

// SEC-003: JWT_SECRET MUST come from environment. No fallback.
const secret = process.env.JWT_SECRET;
if (!secret && typeof window === 'undefined') {
  // Only crash on server-side (not during client build)
  if (process.env.NODE_ENV === 'production' || process.env.NEXT_RUNTIME === 'nodejs') {
    throw new Error(
      'FATAL: JWT_SECRET environment variable is not set. ' +
      'Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
    );
  }
}
export const JWT_SECRET = new TextEncoder().encode(secret || 'dev-only-fallback-not-for-production');

// Helper function to determine role based on position
function getRoleFromPosition(position: string): UserRole {
  const positionLower = position.toLowerCase();
  if (positionLower === 'gm' || positionLower === 'general manager') {
    return 'general_manager';
  }
  if (positionLower === 'ceo' || positionLower === 'ceo assistant') {
    return 'ceo';
  }
  if (positionLower.includes('hr') || positionLower.includes('recruiter')) {
    return 'hr';
  }
  return 'employee';
}

// SEC-018: Minimal JWT — only sub (userId) and jti
export async function createAccessToken(userId: string): Promise<string> {
  const jti = crypto.randomUUID();
  return new SignJWT({ sub: userId, jti })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(JWT_SECRET);
}

// Legacy createToken — wraps createAccessToken for backward compat during migration
export async function createToken(user: User): Promise<string> {
  return createAccessToken(user.id);
}

// SEC-017: Create refresh token (stored hashed in DB)
export async function createRefreshToken(userId: string): Promise<string> {
  const token = crypto.randomBytes(32).toString('hex');
  const hash = crypto.createHash('sha256').update(token).digest('hex');

  if (supabaseAdmin) {
    await supabaseAdmin.from('refresh_tokens').insert({
      user_id: userId,
      token_hash: hash,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    });
  }

  return token;
}

// Revoke all tokens for a user (on logout, password change, termination)
export async function revokeAllUserTokens(userId: string): Promise<void> {
  if (!supabaseAdmin) return;

  await supabaseAdmin
    .from('refresh_tokens')
    .update({ revoked_at: new Date().toISOString() })
    .eq('user_id', userId)
    .is('revoked_at', null);
}

// Verify access token — returns minimal info
export async function verifyToken(token: string): Promise<User | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    const userId = payload.sub as string;

    if (!userId) return null;

    // SEC-018: Fetch user data from DB since JWT only has sub
    if (supabaseAdmin) {
      const { data: employee } = await supabaseAdmin
        .from('employees')
        .select('id, email, full_name, system_role, position, employee_id, branch_id')
        .eq('id', userId)
        .single();

      if (employee) {
        return {
          id: employee.id,
          email: employee.email || '',
          name: employee.full_name,
          role: (employee.system_role || 'employee') as UserRole,
          position: employee.position,
          employeeId: employee.employee_id,
          branchId: employee.branch_id || undefined,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
      }
    }

    // Fallback: return minimal user with just ID
    return {
      id: userId,
      email: '',
      name: '',
      role: 'employee' as UserRole,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  } catch {
    return null;
  }
}

// SEC-022: Consolidated — re-export from permissions.ts (the single source of truth)
export {
  ROLE_PERMISSIONS,
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  getRoleLabel,
  canManageRole,
  getPermissionsForRole,
} from './permissions';
