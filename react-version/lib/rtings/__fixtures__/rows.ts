/**
 * TEST-ONLY row factories. Values are synthetic placeholders for the test
 * clock; they never describe a real sync run.
 */
import type { RtingsSyncRunRow, SyncSummary } from '../types';

export function makeRunRow(overrides: Partial<RtingsSyncRunRow> = {}): RtingsSyncRunRow {
  return {
    id: 1,
    started_at: '2026-09-01T06:30:00.000Z',
    finished_at: '2026-09-01T06:35:00.000Z',
    status: 'success',
    trigger_source: 'cron',
    trigger: 'cron',
    actor_id: 'dCa1uCOn8ZtEkUamC',
    actor_input: { mode: 'byCategory', category: 'mattress', sortBy: 'newest', maxItems: 50 },
    apify_run_id: null,
    dataset_id: null,
    apify_status: 'SUCCEEDED',
    coverage: 'full_category',
    records_received: 20,
    records_valid: 20,
    records_rejected: 0,
    records_created: 0,
    records_updated: 0,
    records_unchanged: 20,
    records_failed: 0,
    records_pending: 0,
    records_new_candidate: 0,
    records_source_missing: 0,
    records_published: 0,
    safety_flags: [],
    error_summary: null,
    error_message: null,
    estimated_cost_usd: null,
    completed_at: '2026-09-01T06:35:00.000Z',
    ...overrides,
  };
}


/** A SyncSummary as the pipeline would return it (synthetic test values). */
export function makeSummary(overrides: Partial<SyncSummary> = {}): SyncSummary {
  return {
    syncRunId: 1,
    status: 'success',
    trigger: 'cron',
    triggerSource: 'cron',
    actorId: 'dCa1uCOn8ZtEkUamC',
    apifyRunId: 'TEST_APIFY_RUN_1',
    datasetId: 'TEST_DATASET_1',
    coverage: 'full_category',
    startedAt: '2026-10-07T06:30:00.000Z',
    completedAt: '2026-10-07T06:33:00.000Z',
    counts: { received: 0, valid: 0, rejected: 0, created: 0, updated: 0, unchanged: 0, failed: 0, pending: 0, newCandidate: 0, sourceMissing: 0, published: 0 },
    safety: { publishable: true, flags: [] },
    errors: [],
    estimatedCostUsd: null,
    store: 'memory',
    ...overrides,
  };
}
