/**
 * Server-only Apify client for the RTINGS actor (crawlerbros/rtings-scraper,
 * id dCa1uCOn8ZtEkUamC). Never import this from a 'use client' component or
 * from site read paths (lib/rtings/evidence.ts must not import it): it reads
 * APIFY_API_TOKEN from process.env.
 *
 * The pipeline talks to Apify only through ApifyPort, so tests inject a fake
 * port and never call the network. The HTTP port uses the asynchronous run
 * API, which survives a serverless time budget:
 *   POST /v2/acts/{actorId}/runs                    start a run
 *   GET  /v2/actor-runs/{runId}?waitForFinish=60     poll (blocks up to 60 s)
 *   GET  /v2/datasets/{datasetId}/items?limit=N      read the items
 * The token travels only in the Authorization header, never in a URL, log
 * line or error message.
 *
 * Plain ES module with only Node built-ins at runtime, so the repo-root CLI
 * (scripts/sync-rtings.js) can load it through Node's type stripping.
 */

import { RTINGS_ACTOR_ID, RTINGS_ACTOR_SLUG } from '../rtings/types';
import { canonicalReviewUrl } from '../rtings/validate';

export type ApifyErrorCode =
  | 'APIFY_NOT_CONFIGURED'
  | 'APIFY_ACTOR_MISMATCH'
  | 'APIFY_TIMEOUT'
  | 'APIFY_NETWORK_ERROR'
  | 'APIFY_UNAUTHORIZED'
  | 'APIFY_RUN_FAILED'
  | 'APIFY_MALFORMED_RESPONSE';

export interface ApifyError {
  success: false;
  code: ApifyErrorCode;
  message: string;
  retryable: boolean;
  httpStatus?: number;
}

/** Thrown by ApifyPort methods; the pipeline records it on the run row. */
export class ApifyCallError extends Error {
  readonly code: ApifyErrorCode;
  readonly retryable: boolean;
  readonly httpStatus: number | null;
  constructor(code: ApifyErrorCode, message: string, retryable: boolean, httpStatus: number | null = null) {
    super(message);
    this.name = 'ApifyCallError';
    this.code = code;
    this.retryable = retryable;
    this.httpStatus = httpStatus;
  }
}

/** A raw dataset item exactly as the actor returned it (validated later by lib/rtings/validate). */
export type RawActorItem = Record<string, unknown>;

export type RtingsMode = 'byCategory' | 'search' | 'url';

export interface RtingsInputOptions {
  mode?: RtingsMode | string;
  sortBy?: string;
  maxItems?: number;
  searchQuery?: string;
  reviewUrl?: string;
}

export type RtingsActorInput =
  | { mode: 'byCategory'; category: 'mattress'; sortBy: string; maxItems: number }
  | { mode: 'search'; category: 'mattress'; searchQuery: string; maxItems: number }
  | { mode: 'url'; url: string };

/** Apify run status, as the API reports it. */
export type ApifyRunStatus = 'READY' | 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'TIMING-OUT' | 'TIMED-OUT' | 'ABORTING' | 'ABORTED' | (string & {});

export const APIFY_TERMINAL_STATUSES: readonly string[] = ['SUCCEEDED', 'FAILED', 'TIMED-OUT', 'ABORTED'];

export interface ApifyRunInfo {
  runId: string;
  status: ApifyRunStatus;
  defaultDatasetId: string | null;
  /** Apify's own usage figure for the run when reported; never estimated here. */
  usageTotalUsd: number | null;
  startedAt: string | null;
  finishedAt: string | null;
}

/** Everything the pipeline needs from Apify. Methods throw ApifyCallError. */
export interface ApifyPort {
  readonly actorId: string;
  startRun(input: RtingsActorInput): Promise<ApifyRunInfo>;
  getRun(runId: string): Promise<ApifyRunInfo>;
  /** The parsed JSON body as returned (normally an array; the pipeline checks). */
  getDatasetItems(datasetId: string, options: { limit: number }): Promise<unknown>;
}

const API_BASE = 'https://api.apify.com/v2';
const DEFAULT_TIMEOUT_MS = 90_000;
const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_BASE_DELAY_MS = 500;
const RETRYABLE_STATUS = new Set([408, 429, 500, 502, 503, 504]);

/** The only actor this project runs. */
export const ACTOR_ID = RTINGS_ACTOR_ID;

/**
 * Hard ceiling on items per run, whatever a caller or env var asks for, so
 * one sync can never request an unbounded, costly scrape.
 */
export const MAX_ITEMS_CAP = 200;
export const DEFAULT_MAX_ITEMS = 50;

/**
 * APIFY_RTINGS_ACTOR_ID may only name the same actor (its id or its slug, in
 * either owner/name or owner~name form). Anything else is refused so a typo
 * or a tampered env var can never point the sync at a different scraper.
 */
export function resolveActorId(env: Record<string, string | undefined> = process.env): { ok: true; actorId: string } | ApifyError {
  const raw = (env.APIFY_RTINGS_ACTOR_ID ?? '').trim();
  if (raw === '' || raw === RTINGS_ACTOR_ID || raw === RTINGS_ACTOR_SLUG || raw === RTINGS_ACTOR_SLUG.replace('/', '~')) {
    return { ok: true, actorId: RTINGS_ACTOR_ID };
  }
  return {
    success: false,
    code: 'APIFY_ACTOR_MISMATCH',
    message: `APIFY_RTINGS_ACTOR_ID must be ${RTINGS_ACTOR_ID} (${RTINGS_ACTOR_SLUG}); refusing to run a different actor.`,
    retryable: false,
  };
}

/**
 * True only when an Apify token is configured. The app keeps working when
 * this is false; callers check it before attempting a sync.
 */
export function isApifyConfigured(): boolean {
  const token = process.env.APIFY_API_TOKEN;
  return typeof token === 'string' && token.trim().length > 0;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function asString(v: unknown): string | null {
  return typeof v === 'string' && v.trim() !== '' ? v : null;
}

function runInfoFrom(body: unknown): ApifyRunInfo {
  const data = body && typeof body === 'object' ? (body as { data?: unknown }).data : null;
  if (!data || typeof data !== 'object') throw new ApifyCallError('APIFY_MALFORMED_RESPONSE', 'Apify run response has no data object.', false);
  const d = data as Record<string, unknown>;
  const runId = asString(d.id);
  const status = asString(d.status);
  if (!runId || !status) throw new ApifyCallError('APIFY_MALFORMED_RESPONSE', 'Apify run response lacks id or status.', false);
  const usage = d.usageTotalUsd;
  return {
    runId,
    status,
    defaultDatasetId: asString(d.defaultDatasetId),
    usageTotalUsd: typeof usage === 'number' && Number.isFinite(usage) && usage >= 0 ? usage : null,
    startedAt: asString(d.startedAt),
    finishedAt: asString(d.finishedAt),
  };
}

export interface ApifyHttpPortOptions {
  token: string;
  actorId?: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
  maxRetries?: number;
  baseDelayMs?: number;
  /** Apify's per-run ceiling on pay-per-event charges (USD); null/omitted sends none. */
  maxTotalChargeUsd?: number | null;
}

/**
 * The input exactly as the actor's published input schema names it
 * (crawlerbros/rtings-scraper build 1.0.1, checked against
 * GET /v2/acts/dCa1uCOn8ZtEkUamC/builds/{latest}.inputSchema on 2026-10-07):
 *   mode: search | byCategory | byUrls | byBrand
 *   category: 'mattress'; sortBy: score-desc | score-asc | newest | oldest | alphabetical
 *   searchQuery (mode=search); reviewUrls: string[] (mode=byUrls)
 *   includeVerdict, includeSummaries (booleans, default true); maxItems (1-500, hard cap)
 * Our internal 'url' mode maps to the actor's 'byUrls'. Verdict and
 * pros/cons/mixed summaries are requested explicitly so a changed actor
 * default cannot silently drop them.
 */
export interface RtingsActorWireInput {
  mode: 'byCategory' | 'search' | 'byUrls';
  category: 'mattress';
  sortBy?: string;
  searchQuery?: string;
  reviewUrls?: string[];
  includeVerdict: true;
  includeSummaries: true;
  maxItems: number;
}

export function toActorRunInput(input: RtingsActorInput): RtingsActorWireInput {
  const common = { category: 'mattress' as const, includeVerdict: true as const, includeSummaries: true as const };
  if (input.mode === 'url') return { mode: 'byUrls', ...common, reviewUrls: [input.url], maxItems: 1 };
  if (input.mode === 'search') return { mode: 'search', ...common, searchQuery: input.searchQuery, maxItems: Math.min(input.maxItems, MAX_ITEMS_CAP) };
  return { mode: 'byCategory', ...common, sortBy: input.sortBy, maxItems: Math.min(input.maxItems, MAX_ITEMS_CAP) };
}

/** Default per-run charge ceiling: the cap of 200 results at the actor's highest (free-tier) price is about $1.02. */
export const DEFAULT_MAX_TOTAL_CHARGE_USD = 1.5;

/** RTINGS_SYNC_MAX_CHARGE_USD when it is a positive number (at most 10), else DEFAULT_MAX_TOTAL_CHARGE_USD. */
export function maxChargeUsd(env: Record<string, string | undefined> = process.env): number {
  const n = Number((env.RTINGS_SYNC_MAX_CHARGE_USD ?? '').trim());
  return Number.isFinite(n) && n > 0 ? Math.min(n, 10) : DEFAULT_MAX_TOTAL_CHARGE_USD;
}

/** The real HTTP port. Retries only transient statuses; never retries a 401/403/400. */
export function createApifyHttpPort(options: ApifyHttpPortOptions): ApifyPort {
  const token = options.token.trim();
  if (token === '') throw new ApifyCallError('APIFY_NOT_CONFIGURED', 'APIFY_API_TOKEN is empty.', false);
  const actorId = options.actorId ?? RTINGS_ACTOR_ID;
  const doFetch = options.fetchImpl ?? fetch;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES;
  const baseDelayMs = options.baseDelayMs ?? DEFAULT_BASE_DELAY_MS;

  /**
   * @param retryNetwork false for the POST that starts a paid run: a timeout
   *   there is ambiguous (the run may have started), so it is never retried
   *   blindly; only a 429 (definitely not started) is repeated.
   */
  async function request(method: 'GET' | 'POST', url: string, body: unknown, retryNetwork: boolean, requestTimeoutMs: number): Promise<unknown> {
    let lastError: ApifyCallError | null = null;
    for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
      if (attempt > 0) await sleep(baseDelayMs * 2 ** (attempt - 1) + Math.floor(Math.random() * 200));
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), requestTimeoutMs);
      let response: Response;
      try {
        response = await doFetch(url, {
          method,
          headers: { Authorization: `Bearer ${token}`, ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) },
          body: body === undefined ? undefined : JSON.stringify(body),
          signal: controller.signal,
        });
      } catch (caught) {
        clearTimeout(timer);
        const isTimeout = (caught as Error).name === 'AbortError';
        lastError = new ApifyCallError(
          isTimeout ? 'APIFY_TIMEOUT' : 'APIFY_NETWORK_ERROR',
          isTimeout ? `Apify request timed out after ${requestTimeoutMs} ms.` : `Network error contacting Apify: ${(caught as Error).message}`,
          true
        );
        if (!retryNetwork) throw lastError;
        continue;
      }
      clearTimeout(timer);

      if (!response.ok) {
        const text = await response.text().catch(() => '');
        const retryable = RETRYABLE_STATUS.has(response.status);
        lastError = new ApifyCallError(
          response.status === 401 || response.status === 403 ? 'APIFY_UNAUTHORIZED' : 'APIFY_RUN_FAILED',
          `Apify returned HTTP ${response.status}${text ? `: ${text.split(token).join('[redacted]').slice(0, 300)}` : ''}`,
          retryable,
          response.status
        );
        if (!retryable || (!retryNetwork && response.status !== 429)) throw lastError;
        continue;
      }
      try {
        return await response.json();
      } catch (caught) {
        lastError = new ApifyCallError('APIFY_MALFORMED_RESPONSE', `Apify response was not valid JSON: ${(caught as Error).message}`, true);
        if (!retryNetwork) throw lastError;
      }
    }
    throw lastError ?? new ApifyCallError('APIFY_RUN_FAILED', 'Apify request failed for an unknown reason.', true);
  }

  const maxTotalChargeUsd = options.maxTotalChargeUsd ?? null;

  return {
    actorId,
    async startRun(input) {
      const wire = toActorRunInput(input);
      // Apify-side caps on a paid run: maxItems bounds billed results, and
      // maxTotalChargeUsd bounds the pay-per-event charge (the actor is PPE).
      const params = new URLSearchParams({ maxItems: String(wire.maxItems) });
      if (maxTotalChargeUsd !== null) params.set('maxTotalChargeUsd', String(maxTotalChargeUsd));
      return runInfoFrom(await request('POST', `${API_BASE}/acts/${encodeURIComponent(actorId)}/runs?${params.toString()}`, wire, false, timeoutMs));
    },
    async getRun(runId) {
      return runInfoFrom(await request('GET', `${API_BASE}/actor-runs/${encodeURIComponent(runId)}?waitForFinish=60`, undefined, true, Math.max(timeoutMs, 75_000)));
    },
    async getDatasetItems(datasetId, { limit }) {
      const safeLimit = Math.max(1, Math.min(Math.floor(limit), MAX_ITEMS_CAP));
      return request('GET', `${API_BASE}/datasets/${encodeURIComponent(datasetId)}/items?format=json&limit=${safeLimit}`, undefined, true, timeoutMs);
    },
  };
}

/** The configured port, or a structured reason why there is none. */
export function getApifyPort(): { ok: true; port: ApifyPort } | ApifyError {
  const actor = resolveActorId();
  if (!('ok' in actor)) return actor;
  if (!isApifyConfigured()) {
    return { success: false, code: 'APIFY_NOT_CONFIGURED', message: 'APIFY_API_TOKEN is not set on this deployment.', retryable: false };
  }
  return { ok: true, port: createApifyHttpPort({ token: process.env.APIFY_API_TOKEN as string, actorId: actor.actorId, maxTotalChargeUsd: maxChargeUsd() }) };
}

/** RTINGS_SYNC_MAX_ITEMS when it is a positive integer, else 50; never above MAX_ITEMS_CAP. */
export function defaultMaxItems(env: Record<string, string | undefined> = process.env): number {
  const n = Number((env.RTINGS_SYNC_MAX_ITEMS ?? '').trim());
  if (Number.isInteger(n) && n > 0) return Math.min(n, MAX_ITEMS_CAP);
  return DEFAULT_MAX_ITEMS;
}

function capItems(requested: number | undefined, fallback: number): number {
  if (requested === undefined) return Math.min(fallback, MAX_ITEMS_CAP);
  if (!Number.isFinite(requested) || requested < 1) throw new Error('buildRtingsInput: maxItems must be a positive number.');
  return Math.min(Math.floor(requested), MAX_ITEMS_CAP);
}

/**
 * Builds a validated RTINGS actor input. Modes: 'byCategory' (the scheduled
 * default), 'search', and 'url' (one canonical www.rtings.com/mattress review).
 */
export function buildRtingsInput(options: RtingsInputOptions = {}): RtingsActorInput {
  const mode = options.mode || 'byCategory';
  if (mode === 'byCategory') {
    return { mode: 'byCategory', category: 'mattress', sortBy: options.sortBy || 'newest', maxItems: capItems(options.maxItems, defaultMaxItems()) };
  }
  if (mode === 'search') {
    const query = typeof options.searchQuery === 'string' ? options.searchQuery.trim() : '';
    if (query === '' || query.length > 120) throw new Error('buildRtingsInput: mode "search" requires a searchQuery of 1-120 characters.');
    return { mode: 'search', category: 'mattress', searchQuery: query, maxItems: capItems(options.maxItems, Math.min(20, defaultMaxItems())) };
  }
  if (mode === 'url') {
    const url = canonicalReviewUrl(options.reviewUrl);
    if (!url) throw new Error('buildRtingsInput: mode "url" requires an https://www.rtings.com/mattress/ review URL.');
    return { mode: 'url', url };
  }
  throw new Error(`buildRtingsInput: unsupported mode "${mode}".`);
}
