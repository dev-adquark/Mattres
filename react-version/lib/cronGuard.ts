/**
 * Guard for the scheduled routes (/api/cron/*). Server-only.
 *
 * 500 when CRON_SECRET is unset (fail closed), 401 for a missing/wrong bearer
 * token, and 429 (Retry-After: 60) once one client IP has sent more than 10
 * bad tokens in a minute - the same lockout the admin routes use
 * (lib/adminAuth.ts). Only failed attempts are counted, so the platform
 * scheduler's authorized calls never use up the budget.
 */
import 'server-only';
import { NextResponse } from 'next/server';
import { isAuthorizedCronRequest } from '@/lib/cronAuth';
import { checkRateLimit } from '@/lib/rateLimit';
import { clientIpFrom } from '@/lib/requestIp';

export const CRON_AUTH_FAILURE_LIMIT = 10;

export async function guardCronRequest(request: Request): Promise<NextResponse | null> {
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    return NextResponse.json({ error: 'CRON_SECRET is not configured on this deployment.' }, { status: 500 });
  }
  if (isAuthorizedCronRequest(request.headers, expected)) return null;
  const failures = await checkRateLimit(`cron-auth:${clientIpFrom(request.headers) || 'unknown'}`, {
    limit: CRON_AUTH_FAILURE_LIMIT,
    windowMs: 60_000,
  });
  if (failures.limited) {
    return NextResponse.json({ error: 'Too many attempts. Please wait a minute and try again.' }, { status: 429, headers: { 'Retry-After': '60' } });
  }
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
