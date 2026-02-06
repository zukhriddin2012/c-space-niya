import { SignJWT, jwtVerify } from 'jose';
import { JWT_SECRET } from './auth';

export const KIOSK_COOKIE_NAME = 'reception-kiosk';

// Kiosk sessions persist for 1 year (effectively permanent for a reception tablet)
const KIOSK_SESSION_SECONDS = 365 * 24 * 60 * 60;

export const KIOSK_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  maxAge: KIOSK_SESSION_SECONDS,
  path: '/',
};

interface KioskTokenPayload {
  branchId: string;
  authenticatedAt: number;
}

/**
 * Create a kiosk session JWT for a branch
 */
export async function createKioskToken(branchId: string): Promise<{
  token: string;
  expiresAt: string;
}> {
  const now = Math.floor(Date.now() / 1000);
  const expiresAt = new Date((now + KIOSK_SESSION_SECONDS) * 1000);

  const token = await new SignJWT({
    sub: `kiosk:${branchId}`,
    type: 'kiosk',
    branchId,
    authenticatedAt: now,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('365d')
    .sign(JWT_SECRET);

  return { token, expiresAt: expiresAt.toISOString() };
}

/**
 * Verify a kiosk session JWT and return the payload
 */
export async function verifyKioskToken(token: string): Promise<KioskTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);

    if (payload.type !== 'kiosk' || !payload.branchId) {
      return null;
    }

    return {
      branchId: payload.branchId as string,
      authenticatedAt: payload.authenticatedAt as number,
    };
  } catch {
    return null;
  }
}
