/**
 * Bearer-secret check shared by the scheduled routes (/api/cron/*, with
 * CRON_SECRET) and the admin routes (/api/admin/*, with ADMIN_API_SECRET,
 * via lib/adminAuth.ts). Server-only.
 *
 * Fails closed: a missing/empty secret, a missing header, or anything but
 * the exact `Bearer <secret>` string is rejected. The comparison hashes both
 * sides and uses a constant-time compare, so neither the secret's length nor
 * its prefix leaks through response timing.
 */
import 'server-only';
import { createHash, timingSafeEqual } from 'node:crypto';

/** Anything with a Headers-style get(); also tolerates a missing/odd headers object. */
export type HeaderSource = { get?: (name: string) => string | null | undefined } | null | undefined;

function sha256(value: string): Buffer {
  return createHash('sha256').update(value, 'utf8').digest();
}

/** Constant-time string equality (length-independent: both sides are hashed first). */
export function safeEqual(a: string, b: string): boolean {
  return timingSafeEqual(sha256(a), sha256(b));
}

/** Validate the bearer token sent by the platform scheduler (or an admin caller). */
export function isAuthorizedCronRequest(headers: HeaderSource, secret: string | null | undefined): boolean {
  if (typeof secret !== 'string' || secret.length === 0) return false;
  const authorization = typeof headers?.get === 'function' ? headers.get('authorization') : undefined;
  if (typeof authorization !== 'string') return false;
  return safeEqual(authorization, `Bearer ${secret}`);
}
