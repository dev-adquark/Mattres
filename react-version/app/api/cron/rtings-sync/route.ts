import { NextResponse } from 'next/server';
import { guardCronRequest } from '@/lib/cronGuard';
import {
  checkSyncBudget,
  logRouteError,
  readFreshness,
  routeRepository,
  runSync,
  SCHEDULE_INFO,
  syncPreconditionError,
} from '@/app/api/admin/rtings/_lib/syncRuntime';
import { buildRtingsInput } from '@/lib/apify/apifyClient';
import { RTINGS_SYNC_INTERVAL_DAYS } from '@/lib/rtings/types';

/**
 * Scheduled RTINGS sync. vercel.json calls this DAILY ("30 6 * * *"); it is
 * not an every-N-days cron expression and does not pretend to be one. The
 * RTINGS_SYNC_INTERVAL_DAYS cadence is enforced here by lib/rtings/freshness.ts:
 *
 *   - never synced, or >= RTINGS_SYNC_INTERVAL_DAYS since the last success|partial run -> run
 *   - an `awaiting_apify` run exists -> resume it (no second scrape is paid for)
 *   - otherwise -> 200 { skipped: 'not_due', nextDueAt } and nothing is spent
 *   - newest finished run was held -> 200 { skipped: 'held_awaiting_review', nextDueAt }:
 *     no automatic retry for RTINGS_SYNC_INTERVAL_DAYS (an admin manual sync can run sooner)
 *   - newest finished run(s) failed -> 200 { skipped: 'failed_backoff', nextDueAt }:
 *     1, 2, 4, 7 days, then every RTINGS_SYNC_INTERVAL_DAYS after 5 failures in a row
 *
 * Even when due, a run only starts once checkSyncBudget() confirms this
 * month's Apify spend plus the per-run cost cap still fits the account's
 * monthly limit (a free, read-only check; see syncRuntime.ts) - if not, the
 * tick is skipped and logged the same as any other "not due" result, and no
 * actor run is started and no charge is incurred.
 *
 * Security: CRON_SECRET bearer token, fail-closed (500 when unset, 401 when
 * missing/wrong, 429 after repeated bad tokens; lib/cronGuard.ts), the same convention as /api/cron/verify-catalog. No body,
 * no query parameters, no caller-controlled URL: the actor input is always
 * the fixed mattress-category run.
 *
 * Responses: 200 success|partial|held|awaiting_apify|not_due, 409 already
 * running, 503 Apify, budget or store not configured/exhausted, 502 failed.
 * A failed or skipped run never deletes or unpublishes anything; the site
 * keeps the last published data.
 */
export const maxDuration = 300;
export const dynamic = 'force-dynamic';

export async function GET(request: Request): Promise<NextResponse> {
  const denied = await guardCronRequest(request);
  if (denied) return denied;

  const now = new Date();
  const ranAt = now.toISOString();
  const repo = routeRepository();

  const precondition = syncPreconditionError(repo);
  if (precondition) {
    return NextResponse.json({ ranAt, store: repo.kind, error: precondition.error }, { status: precondition.status });
  }

  let freshness;
  try {
    freshness = await readFreshness(repo, now);
  } catch (caught) {
    logRouteError('cron/rtings-sync freshness', caught);
    return NextResponse.json(
      { ranAt, store: repo.kind, error: { code: 'STORE_READ_FAILED', message: 'Could not read the last sync from the store; nothing was run.', retryable: true } },
      { status: 502 }
    );
  }

  const { decision } = freshness;
  if (!decision.due) {
    return NextResponse.json({
      ranAt,
      skipped: decision.reason,
      lastSuccessfulSyncAt: decision.lastSuccessAt,
      nextDueAt: decision.nextDueAt,
      lastAttempt: freshness.lastAttempt,
      nextScheduledSyncAt: freshness.nextScheduledSyncAt,
      schedule: SCHEDULE_INFO,
    });
  }

  const due = { reason: decision.reason, lastSuccessfulSyncAt: decision.lastSuccessAt };

  const budget = await checkSyncBudget('cron/rtings-sync');
  if (budget) {
    return NextResponse.json({ ranAt, due, schedule: SCHEDULE_INFO, intervalDays: RTINGS_SYNC_INTERVAL_DAYS, error: budget.error }, { status: budget.status });
  }

  const outcome = await runSync({
    trigger: 'cron',
    triggerSource: 'cron',
    input: buildRtingsInput({ mode: 'byCategory', sortBy: 'newest' }),
    repo,
  });

  if (outcome.kind === 'error') {
    return NextResponse.json({ ranAt, due, error: outcome.error }, { status: outcome.httpStatus });
  }
  return NextResponse.json({ ranAt, due, summary: outcome.summary }, { status: outcome.httpStatus });
}
