/**
 * 14-day freshness gate for the RTINGS sync (brief sections 22 and 41).
 *
 * Vercel Cron cannot express "every 14 days" exactly, so vercel.json
 * schedules a DAILY tick (RTINGS_CRON_SCHEDULE) and this module decides on
 * each tick whether a sync is actually due:
 *
 *   - an `awaiting_apify` run exists      -> due (resume it; no new scrape is paid for)
 *   - no successful run has ever finished -> due ('never_synced')
 *   - now - last successful completion >= 14 days -> due ('interval_elapsed')
 *   - otherwise                           -> not due (the tick spends nothing)
 *
 * Only `success` and `partial` runs count as successful. `held` and `failed`
 * runs do not reset the clock, but they do back the cron off so a lasting
 * problem never turns into a paid scrape every day (brief sections 22, 34):
 *
 *   - newest finished run is `held`   -> the same data would be held again; wait
 *     14 days from it ('held_awaiting_review'). An admin manual sync bypasses
 *     the gate whenever a person has looked at the flags.
 *   - newest finished run(s) `failed` -> exponential backoff from the last
 *     failure: 1, 2, 4, then 7 days ('failed_backoff'). After
 *     RTINGS_MAX_AUTO_FAILURES consecutive failures the cron retries only
 *     every 14 days until a run succeeds.
 *
 * Backoff windows end RETRY_TICK_TOLERANCE_MS early so a run that finished a
 * few minutes after 06:30 UTC is retried on the intended tick, not a day late.
 *
 * Pure functions (no I/O, no Next imports), erasable TypeScript only.
 */
import { RTINGS_SYNC_INTERVAL_DAYS } from './types';
import type { RtingsSyncRunRow, SyncDueDecision, SyncLastAttempt, SyncRunStatus } from './types';

/** The vercel.json schedule for /api/cron/rtings-sync: daily at 06:30 UTC. Not a 14-day expression; the gate above is. */
export const RTINGS_CRON_SCHEDULE = '30 6 * * *';
const CRON_HOUR_UTC = 6;
const CRON_MINUTE_UTC = 30;

const DAY_MS = 24 * 60 * 60 * 1000;
export const RTINGS_SYNC_INTERVAL_MS = RTINGS_SYNC_INTERVAL_DAYS * DAY_MS;

/** Run statuses that reset the 14-day clock. */
export const SUCCESSFUL_SYNC_STATUSES = ['success', 'partial'] as const satisfies readonly SyncRunStatus[];

export function isSuccessfulRun(run: Pick<RtingsSyncRunRow, 'status'> | null | undefined): boolean {
  return Boolean(run) && (SUCCESSFUL_SYNC_STATUSES as readonly string[]).includes(run!.status);
}

function toTime(value: string | null | undefined): number | null {
  if (typeof value !== 'string' || value.length === 0) return null;
  const t = Date.parse(value);
  return Number.isFinite(t) ? t : null;
}

/** When a successful run finished (completed_at, else the legacy finished_at). Null if neither parses. */
export function successfulRunCompletedAt(run: RtingsSyncRunRow | null | undefined): string | null {
  if (!run || !isSuccessfulRun(run)) return null;
  for (const candidate of [run.completed_at, run.finished_at]) {
    const t = toTime(candidate);
    if (t !== null) return new Date(t).toISOString();
  }
  return null;
}

/** Earliest instant the gate allows the next sync: last success + 14 days. Null when never synced or unparseable. */
export function nextDueAt(lastSuccessAt: string | null | undefined): string | null {
  const t = toTime(lastSuccessAt);
  return t === null ? null : new Date(t + RTINGS_SYNC_INTERVAL_MS).toISOString();
}

/**
 * The first daily cron tick (06:30 UTC) at or after `from`. Combined with
 * nextDueAt this answers "when will the scheduler actually run next".
 */
export function nextCronTickAt(from: Date): string {
  const tick = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate(), CRON_HOUR_UTC, CRON_MINUTE_UTC, 0, 0));
  if (tick.getTime() < from.getTime()) tick.setUTCDate(tick.getUTCDate() + 1);
  return tick.toISOString();
}

/**
 * When the scheduler will next start a sync, assuming the deployment's cron
 * is active: the first daily tick at or after max(now, nextDueAt).
 */
export function nextScheduledSyncAt(lastSuccessAt: string | null | undefined, now: Date): string {
  const dueAt = toTime(nextDueAt(lastSuccessAt));
  const from = dueAt !== null && dueAt > now.getTime() ? new Date(dueAt) : now;
  return nextCronTickAt(from);
}

/** Backoff after the 1st, 2nd, 3rd and 4th+ consecutive failed run, in days. */
export const RTINGS_FAILURE_BACKOFF_DAYS = [1, 2, 4, 7] as const;
/** After this many consecutive failed runs the cron retries only every RTINGS_SYNC_INTERVAL_DAYS. */
export const RTINGS_MAX_AUTO_FAILURES = 5;
/** How many recent runs the gate reads to find the newest finished run and count consecutive failures. */
export const RTINGS_BACKOFF_LOOKBACK_RUNS = 10;
/** Backoff windows close this much early so the daily tick that follows a run is not missed by minutes. */
export const RETRY_TICK_TOLERANCE_MS = 60 * 60 * 1000;

const FINISHED_STATUSES: readonly SyncRunStatus[] = ['success', 'partial', 'held', 'failed'];

function finishedAt(run: RtingsSyncRunRow): number | null {
  return toTime(run.completed_at) ?? toTime(run.finished_at) ?? toTime(run.started_at);
}

/**
 * The newest finished run and how many failed runs in a row end with it.
 * `recentRuns` may come in any order (sorted here by started_at, then id).
 */
export function lastAttemptOf(recentRuns: readonly RtingsSyncRunRow[]): SyncLastAttempt | null {
  const finished = recentRuns
    .filter((r) => FINISHED_STATUSES.includes(r.status))
    .sort((a, b) => (toTime(b.started_at) ?? 0) - (toTime(a.started_at) ?? 0) || b.id - a.id);
  const newest = finished[0];
  if (!newest) return null;
  let consecutiveFailures = 0;
  for (const run of finished) {
    if (run.status !== 'failed') break;
    consecutiveFailures += 1;
  }
  const t = finishedAt(newest);
  return { runId: newest.id, status: newest.status, completedAt: t === null ? null : new Date(t).toISOString(), consecutiveFailures };
}

/** Days to wait after `failures` consecutive failed runs (0 when none). */
export function failureBackoffDays(failures: number): number {
  if (failures <= 0) return 0;
  if (failures >= RTINGS_MAX_AUTO_FAILURES) return RTINGS_SYNC_INTERVAL_DAYS;
  return RTINGS_FAILURE_BACKOFF_DAYS[Math.min(failures, RTINGS_FAILURE_BACKOFF_DAYS.length) - 1] as number;
}

/**
 * When the cron may retry after the newest finished run, or null when that
 * run imposes no wait (it succeeded, or nothing has finished).
 */
export function retryNotBefore(attempt: SyncLastAttempt | null): { reason: 'held_awaiting_review' | 'failed_backoff'; at: string } | null {
  if (!attempt || attempt.completedAt === null) return null;
  const from = Date.parse(attempt.completedAt);
  if (attempt.status === 'held') {
    return { reason: 'held_awaiting_review', at: new Date(from + RTINGS_SYNC_INTERVAL_MS - RETRY_TICK_TOLERANCE_MS).toISOString() };
  }
  if (attempt.status === 'failed' && attempt.consecutiveFailures > 0) {
    const days = failureBackoffDays(attempt.consecutiveFailures);
    return { reason: 'failed_backoff', at: new Date(from + days * DAY_MS - RETRY_TICK_TOLERANCE_MS).toISOString() };
  }
  return null;
}

/**
 * Decide whether this tick should run a sync.
 *
 * @param lastSuccess the latest run with status success|partial (repository.getLastSuccessfulRun()).
 *   A row with any other status is ignored, as if no successful run existed.
 * @param awaiting    the latest run left in 'awaiting_apify' (repository.getAwaitingApifyRun()).
 * @param recentRuns  the newest runs (repository.listRecentRuns(RTINGS_BACKOFF_LOOKBACK_RUNS)); they
 *   drive the held/failed backoff. Omitted or empty means no backoff.
 */
export function decideSyncDue(
  lastSuccess: RtingsSyncRunRow | null,
  awaiting: RtingsSyncRunRow | null,
  now: Date,
  recentRuns: readonly RtingsSyncRunRow[] = []
): SyncDueDecision {
  const lastSuccessAt = successfulRunCompletedAt(lastSuccess);
  const lastAttempt = lastAttemptOf(recentRuns);

  if (awaiting && awaiting.status === 'awaiting_apify' && typeof awaiting.apify_run_id === 'string' && awaiting.apify_run_id.length > 0) {
    // Resuming costs nothing new: it only collects a run Apify already finished.
    return { due: true, reason: 'resume_awaiting_apify', lastSuccessAt, resumeApifyRunId: awaiting.apify_run_id, lastAttempt };
  }

  if (lastSuccessAt !== null) {
    const elapsed = now.getTime() - Date.parse(lastSuccessAt);
    if (elapsed < RTINGS_SYNC_INTERVAL_MS) {
      // nextDueAt cannot be null here: lastSuccessAt parsed above.
      return { due: false, reason: 'not_due', lastSuccessAt, nextDueAt: nextDueAt(lastSuccessAt) as string, lastAttempt };
    }
  }

  const wait = retryNotBefore(lastAttempt);
  if (wait && now.getTime() < Date.parse(wait.at)) {
    return { due: false, reason: wait.reason, lastSuccessAt, nextDueAt: wait.at, lastAttempt };
  }

  if (lastSuccessAt === null) return { due: true, reason: 'never_synced', lastSuccessAt: null, lastAttempt };
  return { due: true, reason: 'interval_elapsed', lastSuccessAt, lastAttempt };
}
