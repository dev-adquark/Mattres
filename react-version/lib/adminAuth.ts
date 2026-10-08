/**
 * Shared guard for the secret-protected RTINGS admin endpoints
 * (app/api/admin/rtings/*). Not an account system: the only credential is
 * the ADMIN_API_SECRET bearer token, checked with the same exact-match
 * helper the cron routes use (lib/cronAuth.ts). Server-only.
 */
import 'server-only';
import { NextResponse } from 'next/server';
import { isAuthorizedCronRequest } from '@/lib/cronAuth';
import { checkRateLimit } from '@/lib/rateLimit';
import { clientIpFrom } from '@/lib/requestIp';

/** The admin API's response envelope. */
export interface AdminEnvelope<T> {
  success: boolean;
  data: T | null;
  meta: Record<string, unknown>;
  error: { code: string; message: string; retryable?: boolean } | null;
}

export type AdminScope = 'status' | 'sync';

/** A failed admin response: `{ success: false, data: null, meta: {}, error }`. */
export function adminError(
  status: number,
  error: NonNullable<AdminEnvelope<never>['error']>,
  init?: { headers?: Record<string, string> }
): NextResponse<AdminEnvelope<never>> {
  return NextResponse.json<AdminEnvelope<never>>(
    { success: false, data: null, meta: {}, error },
    { status, ...(init?.headers ? { headers: init.headers } : {}) }
  );
}

/**
 * Rate-limits auth attempts per client IP (10/min per endpoint), then checks
 * the bearer token. Returns the error response to send, or null when the
 * request is authorized.
 */
export async function guardAdminRequest(request: Request, scope: AdminScope): Promise<NextResponse<AdminEnvelope<never>> | null> {
  const clientIp = clientIpFrom(request.headers);
  const authLimit = await checkRateLimit(`admin-auth:${scope}:${clientIp || 'unknown'}`, { limit: 10, windowMs: 60_000 });
  if (authLimit.limited) {
    return adminError(
      429,
      { code: 'TOO_MANY_ATTEMPTS', message: 'Too many attempts. Please wait a minute and try again.' },
      { headers: { 'Retry-After': '60' } }
    );
  }

  const expected = process.env.ADMIN_API_SECRET;

  if (!expected) {
    return adminError(500, { code: 'ADMIN_API_SECRET_NOT_CONFIGURED', message: 'ADMIN_API_SECRET is not configured on this deployment.' });
  }
  if (!isAuthorizedCronRequest(request.headers, expected)) {
    return adminError(401, { code: 'UNAUTHORIZED', message: 'Missing or invalid admin bearer token.' });
  }
  return null;
}
