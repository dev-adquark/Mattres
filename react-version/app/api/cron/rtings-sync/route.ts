import { NextResponse } from 'next/server';
import { guardCronRequest } from '@/lib/cronGuard';
import {
  logRouteError,
  readFreshness,
  routeRepository,
  runSync,
  SCHEDULE_INFO,
  syncPreconditionError,
} from '@/app/api/admin/rtings/_lib/syncRuntime';
import { buildRtingsInput } from '@/lib/apify/apifyClient';

/**
 * Scheduled RTINGS sync. vercel.json calls this DAILY ("30 6 * * *"); it is
 * not a 14-day cron expression and does not pretend to be one. The 14-day
 * cadence is enforced here by lib/rtings/freshness.ts:
 *
 *   - never synced, or >= 14 days since the last success|partial run -> run
 *   - an `awaiting_apify` run exists -> resume it (no second scrape is paid for)
 *   - otherwise -> 200 { skipped: 'not_due', nextDueAt } and nothing is spent
 *   - newest finished run was held -> 200 { skipped: 'held_awaiting_review', nextDueAt }:
 *     no automatic retry for 14 days (an admin manual sync can run sooner)
 *   - newest finished run(s) failed -> 200 { skipped: 'failed_backoff', nextDueAt }:
 *     1, 2, 4, 7 days, then every 14 days after 5 failures in a row
 *
 * Security: CRON_SECRET bearer token, fail-closed (500 when unset, 401 when
 * missing/wrong, 429 after repeated bad tokens; lib/cronGuard.ts), the same convention as /api/cron/verify-catalog. No body,
 * no query parameters, no caller-controlled URL: the actor input is always
 * the fixed mattress-category run.
 *
 * Responses: 200 success|partial|held|awaiting_apify|not_due, 409 already
 * running, 503 Apify or store not configured, 502 failed. A failed run never
 * deletes or unpublishes anything; the site keeps the last published data.
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

  const outcome = await runSync({
    trigger: 'cron',
    triggerSource: 'cron',
    input: buildRtingsInput({ mode: 'byCategory', sortBy: 'newest' }),
    repo,
  });
  const due = { reason: decision.reason, lastSuccessfulSyncAt: decision.lastSuccessAt };

  if (outcome.kind === 'error') {
    return NextResponse.json({ ranAt, due, error: outcome.error }, { status: outcome.httpStatus });
  }
  return NextResponse.json({ ranAt, due, summary: outcome.summary }, { status: outcome.httpStatus });
}
