/**
 * Server-only glue shared by the RTINGS route handlers:
 *   GET  /api/cron/rtings-sync     (CRON_SECRET, daily tick + 14-day gate)
 *   GET  /api/cron/rtings-check    (CRON_SECRET, report-only freshness)
 *   POST /api/admin/rtings/sync    (ADMIN_API_SECRET, manual, ignores the gate)
 *   GET  /api/admin/rtings/status  (ADMIN_API_SECRET, observability, never calls Apify)
 *
 * `_lib` is a private folder: nothing here is routable. Business logic lives
 * in lib/rtings/* (pipeline, repository, freshness); this file only wires
 * request -> pipeline -> response, validates the admin body, maps outcomes to
 * HTTP codes, and scrubs every response of secret values.
 */
import 'server-only';
import { revalidateTag } from 'next/cache';
import { getCatalog } from '@/lib/db/mattressRepo';
import { isDbConfigured } from '@/lib/db/supabaseClient';
import { buildRtingsInput, getApifyPort, isApifyConfigured, MAX_ITEMS_CAP, resolveActorId } from '@/lib/apify/apifyClient';
import type { RtingsActorInput } from '@/lib/apify/apifyClient';
import { getRtingsRepository, isWritableRepository } from '@/lib/rtings/repository';
import { runRtingsPipeline, syncSummaryHttpStatus } from '@/lib/rtings/syncPipeline';
import { canonicalReviewUrl } from '@/lib/rtings/validate';
import { decideSyncDue, nextCronTickAt, nextDueAt, RTINGS_BACKOFF_LOOKBACK_RUNS, RTINGS_CRON_SCHEDULE } from '@/lib/rtings/freshness';
import aliasesJson from '@/lib/rtings/aliases.json';
import { REVIEW_STATUSES, RTINGS_EVIDENCE_CACHE_TAG, RTINGS_SYNC_INTERVAL_DAYS } from '@/lib/rtings/types';
import type {
  RepositoryKind,
  ReviewStatus,
  RtingsAlias,
  RtingsRepository,
  RtingsSyncRunRow,
  SafetyFlag,
  SyncDueDecision,
  SyncLastAttempt,
  SyncErrorEntry,
  SyncRunStatus,
  SyncSummary,
  SyncTrigger,
  SyncTriggerSource,
} from '@/lib/rtings/types';

/** Vercel function budget for the sync routes (see `maxDuration` in each route). */
export const SYNC_ROUTE_MAX_DURATION_S = 300;
/** How long the pipeline may wait on Apify before parking the run as awaiting_apify (leaves headroom under maxDuration). */
const PIPELINE_WAIT_BUDGET_MS = 240_000;
/** Largest admin JSON body accepted. */
const MAX_BODY_BYTES = 2_048;

export interface RouteError {
  code: string;
  message: string;
  retryable: boolean;
}

// ---------------------------------------------------------------------------
// Secret scrubbing
// ---------------------------------------------------------------------------

/** Env vars whose values must never appear in a response or log line. */
const SECRET_ENV_NAMES = [
  'APIFY_API_TOKEN',
  'CRON_SECRET',
  'ADMIN_API_SECRET',
  'SUPABASE_SECRET_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'DIRECT_URL',
  'DATABASE_URL',
] as const;

/**
 * Deep-copies a JSON-serializable value with every configured secret value
 * replaced by "[redacted]". Defense in depth: nothing should carry a secret
 * in the first place, but an upstream error message (e.g. an Apify or
 * PostgREST error body) is not ours to trust.
 */
export function redactSecrets<T>(value: T): T {
  const secrets = SECRET_ENV_NAMES.map((name) => process.env[name]).filter(
    (v): v is string => typeof v === 'string' && v.trim().length >= 6
  );
  let json = JSON.stringify(value);
  if (json === undefined) return value;
  // Also catch the token if anything ever put it into a URL query string.
  json = json.replace(/([?&]token=)[^&"\s]+/gi, '$1[redacted]');
  for (const secret of secrets) {
    const escaped = JSON.stringify(secret).slice(1, -1);
    json = json.split(escaped).join('[redacted]');
  }
  return JSON.parse(json) as T;
}

/** One log line without stack traces or secret values. */
export function logRouteError(route: string, caught: unknown): void {
  const name = caught instanceof Error ? caught.name : 'Error';
  const message = caught instanceof Error ? caught.message : String(caught);
  console.error(`[${route}] ${name}: ${redactSecrets(message).slice(0, 300)}`);
}

/** Error code carried by a thrown error (e.g. APIFY_ACTOR_MISMATCH from apifyClient), if any. */
function errorCode(caught: unknown): string | null {
  if (caught && typeof caught === 'object' && 'code' in caught && typeof (caught as { code: unknown }).code === 'string') {
    return (caught as { code: string }).code;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Preconditions shared by cron + admin sync
// ---------------------------------------------------------------------------

/**
 * Checks that a server-side sync could persist anything before a single
 * Apify call is paid for. Returns an error to send with its HTTP status, or
 * null when the sync may proceed.
 */
export function syncPreconditionError(repo: RtingsRepository): { status: number; error: RouteError } | null {
  const actor = resolveActorId();
  if (!('ok' in actor)) {
    return { status: 503, error: { code: actor.code, message: actor.message, retryable: false } };
  }
  if (!isApifyConfigured()) {
    return {
      status: 503,
      error: { code: 'APIFY_NOT_CONFIGURED', message: 'Apify credentials are not configured on this deployment.', retryable: false },
    };
  }
  // getRtingsRepository() only returns a read-only file store when Supabase
  // isn't configured. Scraping into a store that can't be written would
  // spend Apify credit for nothing, so refuse up front.
  if (!isWritableRepository(repo)) {
    return {
      status: 503,
      error: {
        code: 'STORE_NOT_CONFIGURED',
        message: 'Database credentials are not configured, so this deployment has no writable RTINGS store. Run the CLI sync (node scripts/sync-rtings.js) instead.',
        retryable: false,
      },
    };
  }
  return null;
}

// ---------------------------------------------------------------------------
// Running the pipeline
// ---------------------------------------------------------------------------

export interface RunSyncArgs {
  trigger: SyncTrigger;
  triggerSource: SyncTriggerSource;
  input: RtingsActorInput;
  repo: RtingsRepository;
  now?: () => Date;
}

export type RunSyncOutcome =
  | { kind: 'summary'; httpStatus: number; summary: SyncSummary }
  | { kind: 'error'; httpStatus: number; error: RouteError };

/** HTTP status for a finished pipeline summary (contract: 200 / 409 / 503 / 502); the pipeline owns the mapping. */
export function httpStatusForSummary(summary: SyncSummary): number {
  return syncSummaryHttpStatus(summary);
}

/** Published-set changes that make cached product-page evidence stale. */
export function summaryChangesSite(summary: SyncSummary): boolean {
  return summary.counts.published > 0 || summary.counts.sourceMissing > 0;
}

/** Runs the shared pipeline once and maps the result. Never throws. */
export async function runSync(args: RunSyncArgs): Promise<RunSyncOutcome> {
  try {
    const port = getApifyPort();
    if (!('ok' in port)) {
      return { kind: 'error', httpStatus: 503, error: { code: port.code, message: port.message, retryable: port.retryable } };
    }
    const apify = port.port;
    const { entries: catalog } = await getCatalog();
    const summary = await runRtingsPipeline({
      trigger: args.trigger,
      triggerSource: args.triggerSource,
      input: args.input,
      repo: args.repo,
      apify,
      catalog,
      aliases: aliasesJson as RtingsAlias[],
      now: args.now,
      waitBudgetMs: PIPELINE_WAIT_BUDGET_MS,
    });

    if (summaryChangesSite(summary)) {
      try {
        revalidateTag(RTINGS_EVIDENCE_CACHE_TAG, 'max');
      } catch (caught) {
        // The data is committed either way; pages pick it up at the 6h revalidate.
        logRouteError('rtings-sync revalidate', caught);
      }
    }
    return { kind: 'summary', httpStatus: httpStatusForSummary(summary), summary: redactSecrets(summary) };
  } catch (caught) {
    const code = errorCode(caught);
    if (code === 'SYNC_ALREADY_RUNNING') {
      return { kind: 'error', httpStatus: 409, error: { code, message: 'Another RTINGS sync is already running.', retryable: true } };
    }
    if (code === 'APIFY_ACTOR_MISMATCH') {
      return {
        kind: 'error',
        httpStatus: 503,
        error: { code, message: 'APIFY_RTINGS_ACTOR_ID is set to an actor other than crawlerbros/rtings-scraper; the sync was refused.', retryable: false },
      };
    }
    if (code === 'APIFY_NOT_CONFIGURED') {
      return { kind: 'error', httpStatus: 503, error: { code, message: 'Apify credentials are not configured on this deployment.', retryable: false } };
    }
    logRouteError('rtings-sync', caught);
    return { kind: 'error', httpStatus: 502, error: { code: 'SYNC_FAILED', message: 'The RTINGS sync failed before it could record a summary.', retryable: true } };
  }
}

// ---------------------------------------------------------------------------
// Freshness (cron gate, status, check)
// ---------------------------------------------------------------------------

export interface FreshnessSnapshot {
  decision: SyncDueDecision;
  lastSuccessfulSyncAt: string | null;
  /** Earliest instant the cron may start a sync: the 14-day due date, or the held/failed backoff end when later. */
  nextDueAt: string | null;
  nextScheduledSyncAt: string;
  awaitingApifyRunId: string | null;
  /** Newest finished run and its consecutive-failure count (drives the held/failed backoff). */
  lastAttempt: SyncLastAttempt | null;
}

/** Reads the rows the 14-day gate and its held/failed backoff need. Throws the repository's error. */
export async function readFreshness(repo: RtingsRepository, now: Date): Promise<FreshnessSnapshot> {
  const [lastSuccess, awaiting, recent] = await Promise.all([
    repo.getLastSuccessfulRun(),
    repo.getAwaitingApifyRun(),
    repo.listRecentRuns(RTINGS_BACKOFF_LOOKBACK_RUNS),
  ]);
  const decision = decideSyncDue(lastSuccess, awaiting, now, recent);
  const dueAt = decision.due ? nextDueAt(decision.lastSuccessAt) : decision.nextDueAt;
  const from = dueAt !== null && Date.parse(dueAt) > now.getTime() ? new Date(dueAt) : now;
  return {
    decision,
    lastSuccessfulSyncAt: decision.lastSuccessAt,
    nextDueAt: dueAt,
    nextScheduledSyncAt: nextCronTickAt(from),
    awaitingApifyRunId: awaiting?.apify_run_id ?? null,
    lastAttempt: decision.lastAttempt ?? null,
  };
}

export const SCHEDULE_INFO = {
  cron: RTINGS_CRON_SCHEDULE,
  cronDescription:
    'Daily tick at 06:30 UTC; a sync runs only when 14 days have passed since the last successful sync (or none exists). After a held run the cron waits 14 days (an admin manual sync can run sooner); after failed runs it backs off 1, 2, 4, then 7 days, and every 14 days after 5 failures in a row.',
  intervalDays: RTINGS_SYNC_INTERVAL_DAYS,
} as const;

// ---------------------------------------------------------------------------
// Admin sync body
// ---------------------------------------------------------------------------

export interface AdminSyncRequest {
  input: RtingsActorInput;
  /** What the caller asked for, echoed back (never contains the token). */
  requested: { mode: 'byCategory' | 'search' | 'url'; maxItems: number | null; reviewUrl: string | null; searchQuery: string | null };
}

const ALLOWED_BODY_KEYS = new Set(['maxItems', 'reviewUrl', 'searchQuery']);
const SEARCH_QUERY_PATTERN = /^[\p{L}\p{N} .,'&+\-]{2,80}$/u;

function invalid(message: string): { ok: false; error: RouteError } {
  return { ok: false, error: { code: 'INVALID_INPUT', message, retryable: false } };
}

/** Reads the request body as JSON with a size cap. An empty body means {}. */
export async function readJsonBody(request: Request): Promise<{ ok: true; body: unknown } | { ok: false; error: RouteError }> {
  const declared = Number(request.headers.get('content-length'));
  if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) return invalid(`Request body must be at most ${MAX_BODY_BYTES} bytes.`);
  let text: string;
  try {
    text = await request.text();
  } catch {
    return invalid('Request body could not be read.');
  }
  if (Buffer.byteLength(text, 'utf8') > MAX_BODY_BYTES) return invalid(`Request body must be at most ${MAX_BODY_BYTES} bytes.`);
  if (text.trim().length === 0) return { ok: true, body: {} };
  try {
    return { ok: true, body: JSON.parse(text) as unknown };
  } catch {
    return invalid('Request body must be valid JSON.');
  }
}

/**
 * RTINGS review URLs a manual url-mode sync may target: the catalog's own
 * RTINGS review sources plus URLs RTINGS itself already returned (stored
 * reviews). Nothing else - the admin endpoint never forwards an arbitrary
 * URL to the scraper.
 */
async function isAllowlistedReviewUrl(canonical: string, repo: RtingsRepository): Promise<boolean> {
  const { entries } = await getCatalog();
  for (const entry of entries) {
    for (const source of entry.reviewSources ?? []) {
      if (typeof source?.sourceUrl === 'string' && canonicalReviewUrl(source.sourceUrl) === canonical) return true;
    }
  }
  const known = await repo.findReviewsByIdentity({ productIds: [], reviewUrls: [canonical] });
  return known.some((stored) => stored.review.review_url === canonical);
}

/**
 * Validates POST /api/admin/rtings/sync's body:
 *   {}                                -> category run (default maxItems)
 *   { maxItems }                      -> category run, integer 1..MAX_ITEMS_CAP
 *   { searchQuery, maxItems? }        -> search run within the mattress category
 *   { reviewUrl }                     -> one review; must canonicalize to https://www.rtings.com/mattress/...
 *                                        AND be a known RTINGS review URL (catalog or stored review)
 * Unknown keys, wrong types and combined modes are rejected (400).
 */
export async function parseAdminSyncBody(
  body: unknown,
  repo: RtingsRepository
): Promise<{ ok: true; value: AdminSyncRequest } | { ok: false; error: RouteError }> {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) return invalid('Request body must be a JSON object.');
  const record = body as Record<string, unknown>;
  const unknownKeys = Object.keys(record).filter((key) => !ALLOWED_BODY_KEYS.has(key));
  if (unknownKeys.length > 0) return invalid(`Unknown field(s): ${unknownKeys.slice(0, 5).join(', ')}. Allowed: maxItems, reviewUrl, searchQuery.`);

  let maxItems: number | null = null;
  if (record.maxItems !== undefined) {
    const n = record.maxItems;
    if (typeof n !== 'number' || !Number.isInteger(n) || n < 1 || n > MAX_ITEMS_CAP) {
      return invalid(`maxItems must be an integer from 1 to ${MAX_ITEMS_CAP}.`);
    }
    maxItems = n;
  }

  if (record.reviewUrl !== undefined && record.searchQuery !== undefined) {
    return invalid('Send either reviewUrl or searchQuery, not both.');
  }

  if (record.reviewUrl !== undefined) {
    if (typeof record.reviewUrl !== 'string' || record.reviewUrl.length > 300) return invalid('reviewUrl must be a string of at most 300 characters.');
    if (maxItems !== null) return invalid('maxItems does not apply to a reviewUrl sync.');
    // canonicalReviewUrl accepts only https://www.rtings.com/mattress/... (no query, hash, port or credentials).
    const canonical = canonicalReviewUrl(record.reviewUrl);
    if (!canonical) {
      return invalid('reviewUrl must be an RTINGS mattress review URL (https://www.rtings.com/mattress/...).');
    }
    if (!(await isAllowlistedReviewUrl(canonical, repo))) {
      return invalid('reviewUrl is not a known RTINGS review for this catalog. Use a category sync to discover new reviews.');
    }
    return {
      ok: true,
      value: { input: buildRtingsInput({ mode: 'url', reviewUrl: canonical }), requested: { mode: 'url', maxItems: null, reviewUrl: canonical, searchQuery: null } },
    };
  }

  if (record.searchQuery !== undefined) {
    if (typeof record.searchQuery !== 'string') return invalid('searchQuery must be a string.');
    const query = record.searchQuery.trim().replace(/\s+/g, ' ');
    if (!SEARCH_QUERY_PATTERN.test(query)) {
      return invalid("searchQuery must be 2-80 characters of letters, numbers, spaces and . , ' & + -");
    }
    return {
      ok: true,
      value: {
        input: buildRtingsInput({ mode: 'search', searchQuery: query, ...(maxItems !== null ? { maxItems } : {}) }),
        requested: { mode: 'search', maxItems, reviewUrl: null, searchQuery: query },
      },
    };
  }

  return {
    ok: true,
    value: {
      input: buildRtingsInput({ mode: 'byCategory', sortBy: 'newest', ...(maxItems !== null ? { maxItems } : {}) }),
      requested: { mode: 'byCategory', maxItems, reviewUrl: null, searchQuery: null },
    },
  };
}

// ---------------------------------------------------------------------------
// Status report
// ---------------------------------------------------------------------------

export interface RunReport {
  id: number;
  status: SyncRunStatus;
  trigger: SyncTrigger | null;
  triggerSource: SyncTriggerSource | null;
  actorId: string | null;
  apifyRunId: string | null;
  datasetId: string | null;
  apifyStatus: string | null;
  coverage: RtingsSyncRunRow['coverage'];
  startedAt: string;
  completedAt: string | null;
  counts: {
    received: number | null;
    valid: number | null;
    rejected: number | null;
    created: number | null;
    updated: number | null;
    unchanged: number | null;
    failed: number | null;
    pending: number | null;
    newCandidate: number | null;
    sourceMissing: number | null;
    published: number | null;
  };
  safetyFlags: SafetyFlag[];
  errorSummary: SyncErrorEntry[] | null;
  errorMessage: string | null;
  estimatedCostUsd: number | null;
}

export function toRunReport(run: RtingsSyncRunRow): RunReport {
  return {
    id: run.id,
    status: run.status,
    trigger: run.trigger,
    triggerSource: run.trigger_source,
    actorId: run.actor_id,
    apifyRunId: run.apify_run_id,
    datasetId: run.dataset_id,
    apifyStatus: run.apify_status,
    coverage: run.coverage,
    startedAt: run.started_at,
    completedAt: run.completed_at ?? run.finished_at,
    counts: {
      received: run.records_received,
      valid: run.records_valid,
      rejected: run.records_rejected,
      created: run.records_created,
      updated: run.records_updated,
      unchanged: run.records_unchanged,
      failed: run.records_failed,
      pending: run.records_pending,
      newCandidate: run.records_new_candidate,
      sourceMissing: run.records_source_missing,
      published: run.records_published,
    },
    safetyFlags: Array.isArray(run.safety_flags) ? run.safety_flags : [],
    errorSummary: run.error_summary,
    errorMessage: run.error_message,
    estimatedCostUsd: run.estimated_cost_usd,
  };
}

export interface StatusReport {
  apifyConfigured: boolean;
  dbConfigured: boolean;
  store: RepositoryKind;
  /** Whether the server routes can run a sync against this store (the CLI writes the file store). */
  serverSyncAvailable: boolean;
  schedule: typeof SCHEDULE_INFO;
  lastSuccessfulSyncAt: string | null;
  nextDueAt: string | null;
  nextScheduledSyncAt: string | null;
  dueNow: boolean | null;
  dueReason: SyncDueDecision['reason'] | null;
  /** Newest finished run and consecutive failures; explains a held_awaiting_review / failed_backoff dueReason. */
  lastAttempt: SyncLastAttempt | null;
  awaitingApifyRunId: string | null;
  lastRun: RunReport | null;
  recentRuns: RunReport[];
  reviewCounts: Partial<Record<ReviewStatus, number>>;
  /** Repository reads that failed; the rest of the report is still real. */
  storeErrors: RouteError[];
}

/** Builds the observability report. Never calls Apify; each read degrades independently. */
export async function buildStatusReport(repo: RtingsRepository, now: Date): Promise<StatusReport> {
  const storeErrors: RouteError[] = [];
  const guard = async <T>(operation: string, fn: () => Promise<T>, fallback: T): Promise<T> => {
    try {
      return await fn();
    } catch (caught) {
      logRouteError(`rtings-status ${operation}`, caught);
      storeErrors.push({ code: 'STORE_READ_FAILED', message: `Could not read ${operation} from the ${repo.kind} store.`, retryable: true });
      return fallback;
    }
  };

  const [freshness, recentRows, countEntries] = await Promise.all([
    guard('freshness', () => readFreshness(repo, now), null),
    guard('recent runs', () => repo.listRecentRuns(5), [] as RtingsSyncRunRow[]),
    guard(
      'review counts',
      () => Promise.all(REVIEW_STATUSES.map(async (status) => [status, await repo.countReviews({ statuses: [status] })] as const)),
      [] as (readonly [ReviewStatus, number])[]
    ),
  ]);

  const recentRuns = recentRows.map(toRunReport);
  const precondition = syncPreconditionError(repo);
  return redactSecrets({
    apifyConfigured: isApifyConfigured(),
    dbConfigured: isDbConfigured(),
    store: repo.kind,
    serverSyncAvailable: precondition === null,
    schedule: SCHEDULE_INFO,
    lastSuccessfulSyncAt: freshness?.lastSuccessfulSyncAt ?? null,
    nextDueAt: freshness?.nextDueAt ?? null,
    nextScheduledSyncAt: freshness?.nextScheduledSyncAt ?? null,
    dueNow: freshness ? freshness.decision.due : null,
    dueReason: freshness ? freshness.decision.reason : null,
    lastAttempt: freshness?.lastAttempt ?? null,
    awaitingApifyRunId: freshness?.awaitingApifyRunId ?? null,
    lastRun: recentRuns[0] ?? null,
    recentRuns,
    reviewCounts: Object.fromEntries(countEntries) as Partial<Record<ReviewStatus, number>>,
    storeErrors,
  });
}

/** The store the routes use (Supabase when configured, else the read-only committed snapshot). */
export function routeRepository(): RtingsRepository {
  return getRtingsRepository();
}
