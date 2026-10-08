/**
 * One RTINGS sync run, end to end (brief sections 2, 12-17, 24-27, 31-34):
 *
 *   failStaleRuns -> startRun (lock) -> Apify start/poll/dataset (or resume an
 *   awaiting_apify run) -> validate -> normalize -> appendRawRecords (every
 *   item, append-only) -> dedupe -> match -> fingerprint/diff -> safety gate
 *   -> upserts + change log -> source_missing (full coverage only) -> finishRun
 *
 * Guarantees:
 *   - Never deletes a review, never writes to the Match Score engine inputs,
 *     never touches the local filesystem (the repository decides storage).
 *   - Never throws: every failure ends as a recorded run (status 'failed')
 *     or, when no run row could be created, a summary with the error code.
 *   - A held run (safety flag) changes nothing the site shows.
 *   - Cost comes only from Apify's usageTotalUsd; never estimated.
 */

import { APIFY_TERMINAL_STATUSES, ApifyCallError, MAX_ITEMS_CAP } from '../apify/apifyClient';
import type { ApifyPort, ApifyRunInfo, RtingsActorInput } from '../apify/apifyClient';
import { RtingsRepositoryError } from './types';
import type {
  CatalogMatchResult,
  ChangeLogEntry,
  NormalizedReview,
  RawRecordWrite,
  ReviewChange,
  ReviewStatus,
  RtingsAlias,
  RtingsRepository,
  RtingsSyncRunRow,
  SafetyVerdict,
  StoredReview,
  SyncCounts,
  SyncCoverage,
  SyncErrorEntry,
  SyncRunStatus,
  SyncSummary,
  SyncTrigger,
  SyncTriggerSource,
  ValidationProblem,
} from './types';
import { validateRawRecord, canonicalReviewUrl } from './validate';
import { normalizeRecord } from './normalize';
import { dedupeBatch } from './dedupe';
import { matchToCatalog } from './match';
import type { CatalogIdentity } from './match';
import { canonicalJson, computeFingerprint, sha256Hex } from './fingerprint';
import { diffReview } from './changes';
import { evaluateRunSafety } from './safety';
import { buildImageWrites, buildReviewWrite, buildScoreWrites, decideStatus, statusReason } from './publish';

/** A 'running' row older than this is a crashed run and loses the lock. */
export const STALE_RUN_MINUTES = 30;
/** An awaiting_apify run is resumed (not re-scraped) for this long. */
export const RESUME_WINDOW_HOURS = 48;
/** Default time spent waiting for Apify inside one invocation (cron maxDuration is 300 s). */
export const DEFAULT_WAIT_BUDGET_MS = 200_000;

export interface RunPipelineOptions {
  trigger: SyncTrigger;
  triggerSource: SyncTriggerSource;
  input: RtingsActorInput;
  repo: RtingsRepository;
  apify: ApifyPort;
  catalog: readonly CatalogIdentity[];
  aliases: readonly RtingsAlias[];
  now?: () => Date;
  /** How long to keep polling Apify before parking the run as awaiting_apify. */
  waitBudgetMs?: number;
  /** Upper bound on getRun polls (each blocks up to 60 s at Apify). */
  maxPolls?: number;
}

function emptyCounts(): SyncCounts {
  return { received: 0, valid: 0, rejected: 0, created: 0, updated: 0, unchanged: 0, failed: 0, pending: 0, newCandidate: 0, sourceMissing: 0, published: 0 };
}

function messageOf(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

function errorEntry(err: unknown, fallbackCode: string, affected: string[] = []): SyncErrorEntry {
  if (err instanceof ApifyCallError) return { code: err.code, message: err.message, affected, retryable: err.retryable };
  if (err instanceof RtingsRepositoryError) return { code: 'DB_ERROR', message: err.message, affected, retryable: err.retryable };
  return { code: fallbackCode, message: messageOf(err), affected, retryable: false };
}

/**
 * Size of one RTINGS category listing page as the actor emits it. The first
 * live run (Apify run UfDUazV8gNM2kE3Zh, 2026-10-07, maxItems 200) logged
 * "category=mattress -> 20 from listing" and "sitemap -> 93 review URLs",
 * then found no product payload on the 93 detail pages and emitted only the
 * 20 listing items. So "fewer items than maxItems" does not prove the whole
 * category came back: a run that returns no more than one listing page is
 * 'partial', and only 'full_category' runs may mark reviews source_missing.
 */
export const CATEGORY_LISTING_PAGE_SIZE = 20;

function coverageOf(input: RtingsActorInput, received: number): SyncCoverage {
  if (input.mode === 'url') return 'targeted_urls';
  if (input.mode === 'byCategory' && received < input.maxItems && received > CATEGORY_LISTING_PAGE_SIZE) return 'full_category';
  return 'partial';
}

function itemLimit(input: RtingsActorInput): number {
  return input.mode === 'url' ? MAX_ITEMS_CAP : input.maxItems;
}

function sameInput(a: unknown, b: unknown): boolean {
  return canonicalJson(a) === canonicalJson(b);
}

function rawField(item: unknown, field: string): unknown {
  return item && typeof item === 'object' && !Array.isArray(item) ? (item as Record<string, unknown>)[field] : undefined;
}

function rawProductId(item: unknown): string | null {
  const v = rawField(item, 'productId');
  if (typeof v === 'string' && v.trim() !== '') return v.trim().slice(0, 300);
  if (typeof v === 'number' && Number.isFinite(v)) return String(v);
  return null;
}

/** HTTP status the cron/admin routes return for a summary. */
export function syncSummaryHttpStatus(summary: SyncSummary): number {
  const codes = new Set(summary.errors.map((e) => e.code));
  if (codes.has('SYNC_ALREADY_RUNNING')) return 409;
  if (codes.has('APIFY_NOT_CONFIGURED') || codes.has('APIFY_ACTOR_MISMATCH') || codes.has('STORE_READ_ONLY')) return 503;
  if (codes.has('INVALID_INPUT')) return 400;
  if (summary.status === 'failed') return 502;
  return 200;
}

/** A summary for a run that was refused before any run row existed. */
export function refusedSummary(opts: {
  trigger: SyncTrigger;
  triggerSource: SyncTriggerSource;
  actorId: string;
  store: SyncSummary['store'];
  error: SyncErrorEntry;
  now?: Date;
}): SyncSummary {
  const at = (opts.now ?? new Date()).toISOString();
  return {
    syncRunId: null,
    status: 'failed',
    trigger: opts.trigger,
    triggerSource: opts.triggerSource,
    actorId: opts.actorId,
    apifyRunId: null,
    datasetId: null,
    coverage: null,
    startedAt: at,
    completedAt: at,
    counts: emptyCounts(),
    safety: { publishable: false, flags: [] },
    errors: [opts.error],
    estimatedCostUsd: null,
    store: opts.store,
  };
}

interface Processed {
  review: NormalizedReview;
  existing: StoredReview | null;
  match: CatalogMatchResult;
  fingerprint: string;
  change: ReviewChange;
}

export async function runRtingsPipeline(opts: RunPipelineOptions): Promise<SyncSummary> {
  const clock = opts.now ?? (() => new Date());
  const { repo, apify, input } = opts;
  const startedAt = clock().toISOString();
  const errors: SyncErrorEntry[] = [];
  const counts = emptyCounts();
  let safety: SafetyVerdict = { publishable: false, flags: [] };
  let apifyInfo: ApifyRunInfo | null = null;
  let coverage: SyncCoverage | null = null;

  const base = { trigger: opts.trigger, triggerSource: opts.triggerSource, actorId: apify.actorId, store: repo.kind };

  // 1. Lock ------------------------------------------------------------------
  let run: RtingsSyncRunRow;
  try {
    await repo.failStaleRuns(STALE_RUN_MINUTES, clock());
    const started = await repo.startRun({ trigger: opts.trigger, triggerSource: opts.triggerSource, actorId: apify.actorId, actorInput: { ...input } });
    if (!started.ok) {
      return refusedSummary({
        ...base,
        now: clock(),
        error: { code: 'SYNC_ALREADY_RUNNING', message: `Another RTINGS sync is running (runs older than ${STALE_RUN_MINUTES} minutes are released automatically).`, affected: [], retryable: true },
      });
    }
    run = started.run;
  } catch (err) {
    const entry = errorEntry(err, 'DB_ERROR');
    if (err instanceof RtingsRepositoryError && /read-only/.test(err.message)) entry.code = 'STORE_READ_ONLY';
    return refusedSummary({ ...base, now: clock(), error: entry });
  }

  const summary = (status: SyncRunStatus, completedAt: string | null): SyncSummary => ({
    syncRunId: run.id,
    status,
    trigger: opts.trigger,
    triggerSource: opts.triggerSource,
    actorId: apify.actorId,
    apifyRunId: apifyInfo?.runId ?? null,
    datasetId: apifyInfo?.defaultDatasetId ?? null,
    coverage,
    startedAt: run.started_at ?? startedAt,
    completedAt,
    counts: { ...counts },
    safety,
    errors: [...errors],
    estimatedCostUsd: apifyInfo?.usageTotalUsd ?? null,
    store: repo.kind,
  });

  const finish = async (status: Exclude<SyncRunStatus, 'running'>): Promise<SyncSummary> => {
    const completedAt = status === 'awaiting_apify' ? null : clock().toISOString();
    const firstError = errors[0];
    // Non-blocking safety warnings are recorded with the errors (error_summary) but never in
    // safety_flags (which only ever holds a run) and never as the one-line error_message.
    const notices: SyncErrorEntry[] = (safety.warnings ?? []).map((w) => ({
      code: w.code,
      message: w.message,
      affected: typeof w.detail.unknownFields === 'string' ? w.detail.unknownFields.split(', ') : [],
      retryable: false,
    }));
    const errorSummary = [...errors, ...notices];
    try {
      await repo.finishRun(run.id, {
        status,
        completed_at: completedAt,
        finished_at: completedAt,
        apify_run_id: apifyInfo?.runId ?? null,
        dataset_id: apifyInfo?.defaultDatasetId ?? null,
        apify_status: apifyInfo?.status ?? null,
        coverage,
        records_received: counts.received,
        records_valid: counts.valid,
        records_rejected: counts.rejected,
        records_created: counts.created,
        records_updated: counts.updated,
        records_unchanged: counts.unchanged,
        records_failed: counts.failed,
        records_pending: counts.pending,
        records_new_candidate: counts.newCandidate,
        records_source_missing: counts.sourceMissing,
        records_published: counts.published,
        safety_flags: safety.flags,
        error_summary: errorSummary.length > 0 ? errorSummary : null,
        error_message: firstError ? `${firstError.code}: ${firstError.message}`.slice(0, 500) : null,
        estimated_cost_usd: apifyInfo?.usageTotalUsd ?? null,
      });
    } catch (err) {
      errors.push(errorEntry(err, 'DB_ERROR'));
      return summary(status === 'awaiting_apify' ? 'awaiting_apify' : 'failed', completedAt);
    }
    return summary(status, completedAt);
  };

  try {
    // 2. Apify: resume a parked run with the same input, or start a new one ---
    let resumedFrom: RtingsSyncRunRow | null = null;
    const awaiting = await repo.getAwaitingApifyRun();
    if (awaiting?.apify_run_id && sameInput(awaiting.actor_input, input) && clock().getTime() - Date.parse(awaiting.started_at) < RESUME_WINDOW_HOURS * 3_600_000) {
      resumedFrom = awaiting;
    }
    try {
      apifyInfo = resumedFrom ? await apify.getRun(resumedFrom.apify_run_id as string) : await apify.startRun(input);
    } catch (err) {
      errors.push(errorEntry(err, 'APIFY_RUN_FAILED'));
      return await finish('failed');
    }
    if (resumedFrom) {
      await repo.finishRun(resumedFrom.id, {
        status: 'failed',
        completed_at: clock().toISOString(),
        error_message: `RESUMED_BY_RUN: Apify run ${resumedFrom.apify_run_id} handed over to sync run #${run.id}.`,
        error_summary: [{ code: 'RESUMED_BY_RUN', message: `Apify run handed over to sync run #${run.id}.`, affected: [], retryable: false }],
      });
    }

    const deadline = Date.now() + (opts.waitBudgetMs ?? DEFAULT_WAIT_BUDGET_MS);
    const maxPolls = opts.maxPolls ?? Math.max(1, Math.ceil((opts.waitBudgetMs ?? DEFAULT_WAIT_BUDGET_MS) / 60_000) + 1);
    let polls = 0;
    while (!APIFY_TERMINAL_STATUSES.includes(apifyInfo.status) && polls < maxPolls && Date.now() < deadline) {
      polls += 1;
      try {
        apifyInfo = await apify.getRun(apifyInfo.runId);
      } catch (err) {
        if (err instanceof ApifyCallError && err.retryable) break; // park it; the next tick resumes
        errors.push(errorEntry(err, 'APIFY_RUN_FAILED'));
        return await finish('failed');
      }
    }
    if (!APIFY_TERMINAL_STATUSES.includes(apifyInfo.status)) {
      errors.push({ code: 'APIFY_STILL_RUNNING', message: `Apify run ${apifyInfo.runId} is ${apifyInfo.status}; the next scheduled tick resumes it.`, affected: [], retryable: true });
      return await finish('awaiting_apify');
    }
    if (apifyInfo.status !== 'SUCCEEDED') {
      errors.push({ code: 'APIFY_RUN_FAILED', message: `Apify run ${apifyInfo.runId} ended with status ${apifyInfo.status}; previous data kept.`, affected: [], retryable: true });
      return await finish('failed');
    }
    if (!apifyInfo.defaultDatasetId) {
      errors.push({ code: 'APIFY_MALFORMED_RESPONSE', message: 'Apify reported no dataset for a succeeded run.', affected: [], retryable: false });
      return await finish('failed');
    }

    let items: unknown;
    try {
      items = await apify.getDatasetItems(apifyInfo.defaultDatasetId, { limit: itemLimit(input) });
    } catch (err) {
      errors.push(errorEntry(err, 'APIFY_RUN_FAILED'));
      return await finish('failed');
    }

    const receivedAt = clock().toISOString();
    if (!Array.isArray(items)) {
      safety = evaluateRunSafety({ items, validCount: 0, rejectedProblems: [], previousPublished: [], lastComparableRun: null, normalized: [] });
      errors.push({ code: 'APIFY_MALFORMED_RESPONSE', message: 'The dataset was not a JSON array; nothing was processed.', affected: [], retryable: true });
      return await finish('failed');
    }
    counts.received = items.length;
    coverage = coverageOf(input, items.length);

    // 3. Validate + normalize every item (pure) ------------------------------
    const ctx = { apifyActorId: apify.actorId, apifyRunId: apifyInfo.runId, datasetId: apifyInfo.defaultDatasetId, receivedAt, now: clock() };
    const normalized: NormalizedReview[] = [];
    const rejectedProblems: ValidationProblem[][] = [];
    const warnings: ValidationProblem[][] = [];
    const rawRows: RawRecordWrite[] = [];
    const rejectedAffected: string[] = [];

    items.forEach((item, index) => {
      const validated = validateRawRecord(item, ctx.now);
      const result = validated.ok ? normalizeRecord(validated.record, ctx) : null;
      const problems = !validated.ok ? validated.problems : result && !result.ok ? result.problems : [];
      const ok = Boolean(result && result.ok);
      if (result && result.ok) {
        normalized.push(result.review);
        warnings.push(result.warnings);
      } else {
        rejectedProblems.push(problems);
        rejectedAffected.push(rawProductId(item) ?? `item#${index}`);
      }
      const reviewUrl = canonicalReviewUrl(rawField(item, 'reviewUrl'));
      const rawUrl = rawField(item, 'reviewUrl');
      rawRows.push({
        sync_run_id: run.id,
        item_index: index,
        apify_actor_id: apify.actorId,
        apify_run_id: apifyInfo?.runId ?? null,
        dataset_id: apifyInfo?.defaultDatasetId ?? null,
        product_id: rawProductId(item),
        review_url: reviewUrl ?? (typeof rawUrl === 'string' ? rawUrl.slice(0, 500) : null),
        payload: item === undefined ? null : item,
        payload_sha256: sha256Hex(canonicalJson(item === undefined ? null : item)),
        validation_status: ok ? 'valid' : 'rejected',
        validation_problems: (ok && result && result.ok ? result.warnings : problems).map((p) => `${p.code}:${p.field}`),
      });
    });
    counts.valid = normalized.length;
    counts.rejected = rejectedProblems.length;
    if (counts.rejected > 0) {
      const codes = Array.from(new Set(rejectedProblems.flat().filter((p) => p.fatal).map((p) => p.code))).join(', ');
      errors.push({ code: 'VALIDATION_REJECTED', message: `${counts.rejected} of ${counts.received} items failed validation (${codes}); kept as raw records only.`, affected: rejectedAffected, retryable: false });
    }

    // 4. Raw evidence first, append-only -------------------------------------
    try {
      if (rawRows.length > 0) await repo.appendRawRecords(rawRows);
    } catch (err) {
      errors.push(errorEntry(err, 'DB_ERROR'));
      return await finish('failed');
    }

    // 5. Dedupe, look up what we already hold, match, diff --------------------
    const { unique, duplicates } = dedupeBatch(normalized);
    if (duplicates.length > 0) {
      errors.push({
        code: 'DUPLICATE_IN_BATCH',
        message: `${duplicates.length} duplicate item(s) in the dataset; the last occurrence of each was kept.`,
        affected: duplicates.map((d) => d.productId),
        retryable: false,
      });
    }

    let existingAll: StoredReview[];
    let previousPublishedCount: number;
    let lastComparableRun: RtingsSyncRunRow | null;
    try {
      const targetUrl = input.mode === 'url' ? canonicalReviewUrl(input.url) : null;
      existingAll = await repo.findReviewsByIdentity({
        productIds: unique.map((r) => r.productId),
        reviewUrls: [...unique.map((r) => r.reviewUrl), ...(targetUrl ? [targetUrl] : [])],
      });
      previousPublishedCount = targetUrl
        ? existingAll.filter((s) => s.review.review_url === targetUrl && s.review.status === 'published').length
        : await repo.countReviews({ statuses: ['published'] });
      const recent = await repo.listRecentRuns(25);
      lastComparableRun =
        recent.find(
          (r) =>
            r.id !== run.id &&
            (r.status === 'success' || r.status === 'partial') &&
            (input.mode === 'byCategory' ? (r.actor_input as { mode?: unknown } | null)?.mode === 'byCategory' : sameInput(r.actor_input, input))
        ) ?? null;
    } catch (err) {
      errors.push(errorEntry(err, 'DB_ERROR'));
      return await finish('failed');
    }

    const findExisting = (review: NormalizedReview): StoredReview | null =>
      existingAll.find((s) => s.review.product_id === review.productId) ?? existingAll.find((s) => s.review.review_url === review.reviewUrl) ?? null;

    const processed: Processed[] = unique.map((review) => {
      const existing = findExisting(review);
      const prior = existing?.review;
      // A human resolution (match_method 'manual') outranks automatic matching.
      const match: CatalogMatchResult =
        prior && prior.match_method === 'manual' && prior.mattress_id
          ? { kind: 'matched', mattressId: prior.mattress_id, method: 'manual', confidence: 'exact' }
          : matchToCatalog(review, opts.catalog, opts.aliases);
      const fingerprint = computeFingerprint(review);
      return { review, existing, match, fingerprint, change: diffReview(existing, review, fingerprint) };
    });

    // 6. Safety gate -----------------------------------------------------------
    safety = evaluateRunSafety({
      items,
      validCount: counts.valid,
      rejectedProblems,
      warnings,
      previousPublished: processed.filter((p) => p.existing?.review.status === 'published').map((p) => p.existing as StoredReview),
      previousPublishedCount,
      lastComparableRun,
      normalized: unique,
    });

    // 7. Writes, one review at a time; a failure is recorded, not fatal --------
    const now = clock().toISOString();
    const failedAffected: string[] = [];
    const changeLog: ChangeLogEntry[] = [];
    let lastWriteError: unknown = null;

    for (const p of processed) {
      const existingStatus: ReviewStatus | null = p.existing?.review.status ?? null;
      const status = decideStatus(p.match, safety, p.change, existingStatus);
      // Held run over a published review: keep exactly what the site shows unless nothing at all changed.
      const keepPublishedContent = !safety.publishable && existingStatus === 'published' && (p.change.kind !== 'unchanged' || p.match.kind !== 'matched');
      const reason = !safety.publishable && existingStatus === 'published' && !keepPublishedContent ? null : statusReason(status, p.match, safety, run.id);
      try {
        let reviewId: number;
        if (keepPublishedContent && p.existing) {
          // Held run: the published evidence stays exactly as it was; the newer read lives in the change log.
          reviewId = p.existing.review.id;
          await repo.setReviewStatus([reviewId], 'published', reason);
        } else {
          const write = buildReviewWrite({ review: p.review, fingerprint: p.fingerprint, match: p.match, status, statusReason: reason, syncRunId: run.id, existing: p.existing, change: p.change, now });
          const row = await repo.upsertReview(write);
          reviewId = row.id;
          await repo.replaceScores(reviewId, buildScoreWrites(p.review));
          await repo.upsertImages(reviewId, buildImageWrites(p.review));
        }
        if (p.change.kind === 'updated' && p.change.oldFingerprint) {
          changeLog.push({
            reviewId,
            oldFingerprint: p.change.oldFingerprint,
            newFingerprint: p.change.newFingerprint,
            changedFields: p.change.changedFields,
            oldValues: p.change.oldValues,
            newValues: p.change.newValues,
            detectedAt: now,
            apifyRunId: apifyInfo.runId,
            syncRunId: run.id,
            outcome: !safety.publishable ? 'held' : status === 'published' ? 'published' : 'recorded',
          });
        }
        counts[p.change.kind] += 1;
        if (status === 'pending') counts.pending += 1;
        if (status === 'new_candidate') counts.newCandidate += 1;
        if (status === 'published' && safety.publishable) counts.published += 1;
      } catch (err) {
        counts.failed += 1;
        failedAffected.push(p.review.productId);
        lastWriteError = err;
      }
    }
    if (counts.failed > 0) {
      const entry = errorEntry(lastWriteError, 'DB_ERROR', failedAffected);
      errors.push({ ...entry, message: `${counts.failed} review write(s) failed; last error: ${entry.message}` });
    }

    try {
      if (changeLog.length > 0) await repo.appendChangeLog(changeLog);
    } catch (err) {
      errors.push(errorEntry(err, 'DB_ERROR', changeLog.map((c) => String(c.reviewId))));
      counts.failed += changeLog.length;
    }

    // 8. Products RTINGS no longer lists (only with full coverage, only when publishable)
    if (safety.publishable && ((coverage === 'full_category' && unique.length > 0) || coverage === 'targeted_urls')) {
      try {
        // Every item RTINGS returned counts as present, including ones that failed validation.
        const seenIds = new Set([...unique.map((r) => r.productId), ...rawRows.map((r) => r.product_id).filter((v): v is string => v !== null)]);
        const seenUrls = new Set([...unique.map((r) => r.reviewUrl), ...rawRows.map((r) => r.review_url).filter((v): v is string => v !== null)]);
        const candidates =
          coverage === 'full_category'
            ? await repo.listReviews({ statuses: ['published', 'validated', 'pending', 'changed', 'new_candidate'] })
            : existingAll.map((s) => s.review).filter((r) => input.mode === 'url' && r.review_url === canonicalReviewUrl(input.url) && r.status !== 'source_missing' && r.status !== 'rejected');
        const missing = candidates.filter((r) => !seenIds.has(r.product_id) && !seenUrls.has(r.review_url));
        if (missing.length > 0) {
          await repo.setReviewStatus(
            missing.map((r) => r.id),
            'source_missing',
            `Not returned by ${coverage === 'full_category' ? 'a full mattress-category' : 'a targeted URL'} sync (run #${run.id}); history kept.`
          );
          counts.sourceMissing = missing.length;
        }
      } catch (err) {
        errors.push(errorEntry(err, 'DB_ERROR'));
        counts.failed += 1;
      }
    }

    // 9. Outcome ---------------------------------------------------------------
    const allWritesFailed = processed.length > 0 && counts.failed >= processed.length;
    if (allWritesFailed) return await finish('failed');
    if (!safety.publishable) return await finish('held');
    return await finish(counts.rejected > 0 || counts.failed > 0 ? 'partial' : 'success');
  } catch (err) {
    errors.push(errorEntry(err, 'PIPELINE_ERROR'));
    return finish('failed');
  }
}
