import { NextResponse } from 'next/server';
import { guardCronRequest } from '@/lib/cronGuard';
import { logRouteError, readFreshness, routeRepository, SCHEDULE_INFO } from '@/app/api/admin/rtings/_lib/syncRuntime';
import { RTINGS_SYNC_INTERVAL_DAYS } from '@/lib/rtings/types';

/** Days past the due date (RTINGS_SYNC_INTERVAL_DAYS) after which the daily tick has evidently not been refreshing the data. */
const OVERDUE_GRACE_DAYS = 2;
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Report-only freshness check (CRON_SECRET, fail-closed). Reads the last
 * successful run from the RTINGS repository via lib/rtings/freshness.ts; it
 * never calls Apify and never touches the filesystem. Not scheduled in
 * vercel.json: it exists for uptime monitors and humans.
 *
 * status:
 *   never_synced    no success|partial run recorded
 *   awaiting_apify  a run is parked waiting for Apify; the next daily tick resumes it
 *   fresh           last success < RTINGS_SYNC_INTERVAL_DAYS days ago
 *   due             >= RTINGS_SYNC_INTERVAL_DAYS days; the next daily tick will run a sync
 *   overdue         more than RTINGS_SYNC_INTERVAL_DAYS + OVERDUE_GRACE_DAYS days; the scheduled sync is not succeeding
 *   held_awaiting_review  the newest finished run was held by the safety gate; the cron waits
 *                   RTINGS_SYNC_INTERVAL_DAYS from it, so a person should read its safety flags (and may run an admin sync)
 *   failed_backoff  the newest finished run(s) failed; the cron is backing off (lastAttempt has the count)
 */
export const dynamic = 'force-dynamic';

export async function GET(request: Request): Promise<NextResponse> {
  const denied = await guardCronRequest(request);
  if (denied) return denied;

  const now = new Date();
  const repo = routeRepository();
  try {
    const freshness = await readFreshness(repo, now);
    const last = freshness.lastSuccessfulSyncAt;
    const ageDays = last ? Math.floor((now.getTime() - Date.parse(last)) / DAY_MS) : null;

    let status: 'never_synced' | 'awaiting_apify' | 'fresh' | 'due' | 'overdue' | 'held_awaiting_review' | 'failed_backoff';
    const reason = freshness.decision.reason;
    if (reason === 'resume_awaiting_apify') status = 'awaiting_apify';
    else if (reason === 'held_awaiting_review' || reason === 'failed_backoff') status = reason;
    else if (ageDays === null) status = 'never_synced';
    else if (!freshness.decision.due) status = 'fresh';
    else if (ageDays > RTINGS_SYNC_INTERVAL_DAYS + OVERDUE_GRACE_DAYS) status = 'overdue';
    else status = 'due';

    return NextResponse.json({
      ranAt: now.toISOString(),
      store: repo.kind,
      status,
      lastSuccessfulSyncAt: last,
      ageDays,
      intervalDays: RTINGS_SYNC_INTERVAL_DAYS,
      overdueAfterDays: RTINGS_SYNC_INTERVAL_DAYS + OVERDUE_GRACE_DAYS,
      nextDueAt: freshness.nextDueAt,
      nextScheduledSyncAt: freshness.nextScheduledSyncAt,
      awaitingApifyRunId: freshness.awaitingApifyRunId,
      lastAttempt: freshness.lastAttempt,
      schedule: SCHEDULE_INFO,
    });
  } catch (caught) {
    logRouteError('cron/rtings-check', caught);
    return NextResponse.json(
      { ranAt: now.toISOString(), store: repo.kind, error: { code: 'STORE_READ_FAILED', message: 'Could not read sync runs from the store.', retryable: true } },
      { status: 502 }
    );
  }
}
