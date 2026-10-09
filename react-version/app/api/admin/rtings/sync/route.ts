import { NextResponse } from 'next/server';
import { adminError, guardAdminRequest } from '@/lib/adminAuth';
import type { AdminEnvelope } from '@/lib/adminAuth';
import { checkSyncBudget, parseAdminSyncBody, readJsonBody, routeRepository, runSync, syncPreconditionError } from '../_lib/syncRuntime';
import type { SyncSummary } from '@/lib/rtings/types';

/**
 * Manual RTINGS sync for administrators (POST, ADMIN_API_SECRET bearer,
 * rate-limited by guardAdminRequest). Runs the same pipeline as the cron
 * route immediately, ignoring the freshness gate (RTINGS_SYNC_INTERVAL_DAYS,
 * held/failed backoff); trigger 'manual', trigger_source 'admin'. There is
 * no public button for this.
 *
 * It does NOT bypass checkSyncBudget(): the freshness gate is a cadence
 * policy an administrator may knowingly override, but the monthly Apify
 * budget is a real financial limit, so a manual sync is refused the same way
 * a cron tick would be when there is no headroom left.
 *
 * Body (all optional, validated strictly; unknown keys -> 400):
 *   { maxItems }               category run, integer 1..200 (default RTINGS_SYNC_MAX_ITEMS or 50)
 *   { searchQuery, maxItems? } search within the RTINGS mattress category
 *   { reviewUrl }              one review; must be https://www.rtings.com/mattress/... AND already
 *                              known (a catalog review source or a stored RTINGS review). The actor is
 *                              never pointed at an arbitrary URL.
 *
 * Responses use the admin envelope. 200 success|partial|held|awaiting_apify,
 * 400 invalid body, 401/429/500 from the guard, 409 already running, 503 Apify,
 * budget or store not configured/exhausted, 502 failed.
 */
export const maxDuration = 300;
export const dynamic = 'force-dynamic';

export async function POST(request: Request): Promise<NextResponse<AdminEnvelope<SyncSummary>>> {
  const denied = await guardAdminRequest(request, 'sync');
  if (denied) return denied;

  const repo = routeRepository();
  const precondition = syncPreconditionError(repo);
  if (precondition) return adminError(precondition.status, precondition.error);

  const body = await readJsonBody(request);
  if (!body.ok) return adminError(400, body.error);

  let parsed;
  try {
    parsed = await parseAdminSyncBody(body.body, repo);
  } catch {
    return adminError(502, { code: 'STORE_READ_FAILED', message: 'Could not check reviewUrl against the known RTINGS reviews.', retryable: true });
  }
  if (!parsed.ok) return adminError(400, parsed.error);

  const budget = await checkSyncBudget('admin/rtings/sync');
  if (budget) return adminError(budget.status, budget.error);

  const outcome = await runSync({ trigger: 'manual', triggerSource: 'admin', input: parsed.value.input, repo });
  const meta = { ranAt: new Date().toISOString(), requested: parsed.value.requested, gate: 'bypassed (manual sync); budget cap still enforced' };

  if (outcome.kind === 'error') {
    return NextResponse.json<AdminEnvelope<SyncSummary>>({ success: false, data: null, meta, error: outcome.error }, { status: outcome.httpStatus });
  }

  const ok = outcome.httpStatus === 200;
  const firstError = outcome.summary.errors[0];
  return NextResponse.json<AdminEnvelope<SyncSummary>>(
    {
      success: ok,
      data: outcome.summary,
      meta,
      error: ok
        ? null
        : {
            code: firstError?.code ?? 'SYNC_FAILED',
            message: firstError?.message ?? `RTINGS sync finished with status ${outcome.summary.status}.`,
            retryable: firstError?.retryable ?? true,
          },
    },
    { status: outcome.httpStatus }
  );
}
