import { describe, expect, it } from 'vitest';
import { RETRY_TICK_TOLERANCE_MS, RTINGS_MAX_AUTO_FAILURES, decideSyncDue, failureBackoffDays, lastAttemptOf, nextDueAt } from './freshness';
import { makeRunRow } from './__fixtures__/rows';

const DAY = 24 * 60 * 60 * 1000;
const LAST = '2026-09-01T06:35:00.000Z';
const at = (ms: number) => new Date(Date.parse(LAST) + ms);

describe('freshness: 14-day gate', () => {
  it('is due when nothing has ever synced', () => {
    const d = decideSyncDue(null, null, new Date(LAST));
    expect(d).toMatchObject({ due: true, reason: 'never_synced', lastSuccessAt: null });
  });

  it('is not due 13 days after a successful run and reports nextDueAt = +14 days', () => {
    const d = decideSyncDue(makeRunRow({ completed_at: LAST }), null, at(13 * DAY));
    expect(d.due).toBe(false);
    if (!d.due) expect(d.nextDueAt).toBe(new Date(Date.parse(LAST) + 14 * DAY).toISOString());
  });

  it('is due exactly 14 days after a successful run', () => {
    expect(decideSyncDue(makeRunRow({ completed_at: LAST }), null, at(14 * DAY))).toMatchObject({ due: true, reason: 'interval_elapsed' });
  });

  it('counts partial as successful', () => {
    expect(decideSyncDue(makeRunRow({ status: 'partial', completed_at: LAST }), null, at(DAY)).due).toBe(false);
  });

  it.each(['held', 'failed'] as const)('does not count a %s run as successful', (status) => {
    expect(decideSyncDue(makeRunRow({ status, completed_at: LAST }), null, at(DAY))).toMatchObject({ due: true, reason: 'never_synced' });
  });

  it('resumes an awaiting_apify run instead of paying for a new scrape', () => {
    const awaiting = makeRunRow({ id: 7, status: 'awaiting_apify', apify_run_id: 'TEST_APIFY_RUN_awaiting', completed_at: null });
    const d = decideSyncDue(makeRunRow({ completed_at: LAST }), awaiting, at(DAY));
    expect(d).toMatchObject({ due: true, reason: 'resume_awaiting_apify', resumeApifyRunId: 'TEST_APIFY_RUN_awaiting' });
  });

  it('nextDueAt is null for a missing or unparseable date', () => {
    expect(nextDueAt(null)).toBeNull();
    expect(nextDueAt('not-a-date')).toBeNull();
  });
});

/** A finished run that started 5 minutes before it completed. */
function finished(id: number, status: 'success' | 'partial' | 'held' | 'failed', completedAt: Date, trigger: 'cron' | 'manual' = 'cron') {
  const c = completedAt.toISOString();
  return makeRunRow({ id, status, trigger, started_at: new Date(completedAt.getTime() - 5 * 60_000).toISOString(), completed_at: c, finished_at: c });
}

describe('freshness: backoff after held runs', () => {
  const SUCCESS = makeRunRow({ id: 1, completed_at: LAST, finished_at: LAST });
  const heldAt = at(14 * DAY); // the day-14 cron run was held by the safety gate

  it('a held run waits 14 days instead of re-scraping on every daily tick', () => {
    const runs = [finished(2, 'held', heldAt), SUCCESS];
    for (const day of [1, 2, 7, 13]) {
      const d = decideSyncDue(SUCCESS, null, new Date(heldAt.getTime() + day * DAY), runs);
      expect(d).toMatchObject({ due: false, reason: 'held_awaiting_review', lastAttempt: { runId: 2, status: 'held', consecutiveFailures: 0 } });
      if (!d.due) expect(d.nextDueAt).toBe(new Date(heldAt.getTime() + 14 * DAY - RETRY_TICK_TOLERANCE_MS).toISOString());
    }
    expect(decideSyncDue(SUCCESS, null, new Date(heldAt.getTime() + 14 * DAY), runs)).toMatchObject({ due: true, reason: 'interval_elapsed' });
  });

  it('a held run with no success ever also waits (never_synced does not bypass it)', () => {
    const runs = [finished(1, 'held', new Date(LAST))];
    expect(decideSyncDue(null, null, at(DAY), runs)).toMatchObject({ due: false, reason: 'held_awaiting_review' });
    expect(decideSyncDue(null, null, at(14 * DAY), runs)).toMatchObject({ due: true, reason: 'never_synced' });
  });

  it('a later successful run (e.g. an admin manual sync) clears the hold', () => {
    const manualOk = finished(3, 'success', new Date(heldAt.getTime() + DAY), 'manual');
    const runs = [manualOk, finished(2, 'held', heldAt), SUCCESS];
    const d = decideSyncDue(manualOk, null, new Date(heldAt.getTime() + 2 * DAY), runs);
    expect(d).toMatchObject({ due: false, reason: 'not_due', lastAttempt: { runId: 3, status: 'success' } });
  });

  it('a lasting hold costs one scrape per 14 days, not one per daily tick', () => {
    let runs = [SUCCESS];
    let scrapes = 0;
    for (let day = 14; day < 44; day++) {
      const tick = new Date(Date.UTC(2026, 8, 1, 6, 30) + day * DAY);
      if (decideSyncDue(SUCCESS, null, tick, runs).due) {
        scrapes += 1;
        runs = [finished(100 + day, 'held', new Date(tick.getTime() + 3 * 60_000)), ...runs];
      }
    }
    // Ticks on days 15 (first due), 29 and 43 over 30 daily ticks; before the backoff it was 29.
    expect(scrapes).toBe(3);
  });
});

describe('freshness: exponential backoff after failed runs', () => {
  const failedAt = new Date('2026-09-20T06:33:00.000Z');

  it('backs off 1, 2, 4, 7 days, then 14 after the cap', () => {
    expect([1, 2, 3, 4, 5, 6].map(failureBackoffDays)).toEqual([1, 2, 4, 7, 14, 14]);
    expect(RTINGS_MAX_AUTO_FAILURES).toBe(5);
    expect(failureBackoffDays(0)).toBe(0);
  });

  it('after one failure the next daily tick (06:30, 23h57m later) retries', () => {
    const runs = [finished(1, 'failed', failedAt)];
    expect(decideSyncDue(null, null, new Date(failedAt.getTime() + 12 * 3600_000), runs)).toMatchObject({ due: false, reason: 'failed_backoff' });
    expect(decideSyncDue(null, null, new Date('2026-09-21T06:30:00.000Z'), runs)).toMatchObject({ due: true, reason: 'never_synced' });
  });

  it('counts consecutive failures since the newest non-failed run', () => {
    const runs = [
      finished(5, 'failed', failedAt),
      finished(4, 'failed', new Date(failedAt.getTime() - 4 * DAY)),
      finished(3, 'failed', new Date(failedAt.getTime() - 6 * DAY)),
      finished(2, 'success', new Date(failedAt.getTime() - 20 * DAY)),
      finished(1, 'failed', new Date(failedAt.getTime() - 40 * DAY)),
    ];
    expect(lastAttemptOf(runs)).toMatchObject({ runId: 5, status: 'failed', consecutiveFailures: 3 });
    const success = runs[3]!;
    const d = decideSyncDue(success, null, new Date(failedAt.getTime() + 3 * DAY), runs);
    expect(d).toMatchObject({ due: false, reason: 'failed_backoff' });
    if (!d.due) expect(d.nextDueAt).toBe(new Date(failedAt.getTime() + 4 * DAY - RETRY_TICK_TOLERANCE_MS).toISOString());
    expect(decideSyncDue(success, null, new Date(failedAt.getTime() + 4 * DAY), runs)).toMatchObject({ due: true, reason: 'interval_elapsed' });
  });

  it('a month of permanent failure costs at most 8 scrapes instead of 30', () => {
    let runs: ReturnType<typeof finished>[] = [];
    let scrapes = 0;
    for (let day = 0; day < 30; day++) {
      const tick = new Date(Date.UTC(2026, 8, 1, 6, 30) + day * DAY);
      if (decideSyncDue(null, null, tick, runs).due) {
        scrapes += 1;
        runs = [finished(100 + day, 'failed', new Date(tick.getTime() + 3 * 60_000)), ...runs];
      }
    }
    // Ticks on days 0, 1, 3, 7, 14, then every 14 days: 0,1,3,7,14,28.
    expect(scrapes).toBe(6);
  });

  it('resuming an awaiting_apify run is never blocked by backoff (it costs no new scrape)', () => {
    const awaiting = makeRunRow({ id: 9, status: 'awaiting_apify', apify_run_id: 'TEST_APIFY_RUN_awaiting', completed_at: null });
    const runs = [finished(8, 'failed', failedAt)];
    expect(decideSyncDue(null, awaiting, new Date(failedAt.getTime() + 3600_000), runs)).toMatchObject({ due: true, reason: 'resume_awaiting_apify' });
  });

  it('running and awaiting rows are ignored when finding the last attempt', () => {
    const runs = [makeRunRow({ id: 3, status: 'running', completed_at: null, started_at: '2026-09-30T06:30:00.000Z' }), finished(2, 'failed', failedAt)];
    expect(lastAttemptOf(runs)).toMatchObject({ runId: 2, consecutiveFailures: 1 });
    expect(lastAttemptOf([])).toBeNull();
  });
});
