/**
 * Run-level safety gate (brief sections 25-27). Pure.
 *
 * A run is publishable only when no flag is raised. A flagged run is still
 * recorded in full (raw records, normalized rows, change log), but nothing
 * it produced goes live and every previously published row stays as it was:
 * the site keeps serving the last known good evidence.
 */

import { currentImages } from './changes';
import { RTINGS_RAW_DOCUMENTED_OPTIONAL_FIELDS, RTINGS_RAW_KNOWN_FIELDS, RTINGS_RAW_REQUIRED_FIELDS } from './types';
import type { NormalizedReview, RtingsSyncRunRow, SafetyFlag, SafetyVerdict, SafetyWarning, StoredReview, ValidationProblem } from './types';

/** Flag when a run returns fewer than this share of the last comparable run's items. */
export const COUNT_DROP_RATIO = 0.5;
/** Flag when more than this share of items fail validation (only with at least MIN_REJECTION_SAMPLE items). */
export const MAX_REJECTION_RATE = 0.5;
export const MIN_REJECTION_SAMPLE = 5;
/** Flag when more than this share of items carry a review URL outside www.rtings.com/mattress. */
export const INVALID_DOMAIN_RATE = 0.2;
/**
 * Flag when more than this share of items lack required fields or carry a
 * known field with the wrong type. Unknown (new) fields alone never flag:
 * they are a non-blocking NEW_OPTIONAL_FIELDS warning, because an actor that
 * starts returning more data must not freeze publication.
 */
export const SCHEMA_DRIFT_RATE = 0.5;
/** Flag when more than this share of previously published reviews (present again) lost every metric. */
export const SCORES_DISAPPEARED_RATE = 0.3;

export interface RunSafetyInput {
  /** The dataset exactly as Apify returned it (may not even be an array). */
  items: unknown;
  validCount: number;
  /** Fatal problems, one array per rejected item. */
  rejectedProblems: ValidationProblem[][];
  /** Non-fatal problems, one array per valid item (optional; used for type drift). */
  warnings?: ValidationProblem[][];
  /** Stored published reviews that this batch returned again (by product id or review URL). */
  previousPublished: StoredReview[];
  /**
   * How many reviews were published before this run within its scope (all
   * published rows for a category run, the targeted URL's rows for a URL
   * run). Defaults to previousPublished.length.
   */
  previousPublishedCount?: number;
  /** The latest successful/partial run with the same actor input mode, or null. */
  lastComparableRun: RtingsSyncRunRow | null;
  normalized: NormalizedReview[];
}

function flag(code: SafetyFlag['code'], message: string, detail: SafetyFlag['detail']): SafetyFlag {
  return { code, message, detail };
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function rate(part: number, whole: number): number {
  return whole > 0 ? part / whole : 0;
}

const KNOWN = new Set<string>([...RTINGS_RAW_KNOWN_FIELDS, ...RTINGS_RAW_DOCUMENTED_OPTIONAL_FIELDS]);

export function evaluateRunSafety(input: RunSafetyInput): SafetyVerdict {
  const flags: SafetyFlag[] = [];
  const warnings: SafetyWarning[] = [];
  const { items, normalized, previousPublished, lastComparableRun } = input;
  const previousCount = input.previousPublishedCount ?? previousPublished.length;

  // Malformed response ------------------------------------------------------
  if (!Array.isArray(items)) {
    flags.push(flag('MALFORMED_RESPONSE', 'The dataset was not a JSON array.', { type: items === null ? 'null' : typeof items }));
    return { publishable: false, flags, warnings };
  }
  const received = items.length;
  const objects = items.filter(isPlainObject);
  if (received > 0 && objects.length === 0) {
    flags.push(flag('MALFORMED_RESPONSE', 'No dataset item was a JSON object.', { received }));
  }

  // Empty / shrinking dataset -----------------------------------------------
  if (received === 0 && previousCount > 0) {
    flags.push(flag('EMPTY_DATASET', 'Apify returned 0 items while reviews are already published; keeping the previous data.', { previous: previousCount, received }));
  }
  const previousReceived = lastComparableRun?.records_received ?? null;
  if (received > 0 && previousReceived != null && previousReceived > 0 && received < previousReceived * COUNT_DROP_RATIO) {
    flags.push(
      flag('COUNT_DROP', `Received ${received} items, under ${COUNT_DROP_RATIO * 100}% of the last comparable run (${previousReceived}).`, {
        previous: previousReceived,
        received,
        lastComparableRunId: lastComparableRun?.id ?? null,
      })
    );
  }

  // Rejections and domains --------------------------------------------------
  const rejected = input.rejectedProblems.length;
  if (received >= MIN_REJECTION_SAMPLE && rate(rejected, received) > MAX_REJECTION_RATE) {
    flags.push(flag('HIGH_REJECTION_RATE', `${rejected} of ${received} items failed validation.`, { rejected, received }));
  }
  const badDomain = input.rejectedProblems.filter((problems) => problems.some((p) => p.code === 'INVALID_REVIEW_URL')).length;
  if (received > 0 && rate(badDomain, received) > INVALID_DOMAIN_RATE) {
    flags.push(flag('INVALID_DOMAIN', `${badDomain} of ${received} items have a review URL outside https://www.rtings.com/mattress/.`, { invalid: badDomain, received }));
  }

  // Schema drift ------------------------------------------------------------
  if (objects.length > 0) {
    const missingRequired = objects.filter((item) => RTINGS_RAW_REQUIRED_FIELDS.some((field) => item[field] == null)).length;
    const unknownFields = new Set<string>();
    let withUnknown = 0;
    for (const item of objects) {
      const extra = Object.keys(item).filter((key) => !KNOWN.has(key));
      if (extra.length > 0) withUnknown += 1;
      extra.forEach((key) => unknownFields.add(key));
    }
    const typeDrift = (input.warnings ?? []).filter((problems) => problems.some((p) => p.code === 'MALFORMED_FIELD')).length
      + input.rejectedProblems.filter((problems) => problems.some((p) => p.code === 'MALFORMED_FIELD')).length;
    const unknownList = Array.from(unknownFields).sort().slice(0, 20).join(', ') || null;
    const worst = Math.max(missingRequired, typeDrift);
    if (rate(worst, objects.length) > SCHEMA_DRIFT_RATE) {
      flags.push(
        flag('SCHEMA_DRIFT', 'The actor output no longer matches the known schema for most items (required fields missing or known fields with a changed type).', {
          items: objects.length,
          missingRequired,
          withUnknownFields: withUnknown,
          wrongTypes: typeDrift,
          unknownFields: unknownList,
        })
      );
    }
    if (withUnknown > 0) {
      warnings.push({
        code: 'NEW_OPTIONAL_FIELDS',
        message: `${withUnknown} of ${objects.length} items carried fields outside the known schema; they are kept in the raw records but not mapped.`,
        detail: { items: objects.length, withUnknownFields: withUnknown, unknownFields: unknownList },
      });
    }
  }

  // Evidence that disappeared from reviews we already publish -----------------
  if (previousPublished.length > 0) {
    const byProductId = new Map(normalized.map((r) => [r.productId, r]));
    const byUrl = new Map(normalized.map((r) => [r.reviewUrl, r]));
    const pairs = previousPublished
      .map((stored) => ({ stored, next: byProductId.get(stored.review.product_id) ?? byUrl.get(stored.review.review_url) ?? null }))
      .filter((pair): pair is { stored: StoredReview; next: NormalizedReview } => pair.next !== null);

    const hadScores = pairs.filter((p) => p.stored.scores.length > 0);
    const lostScores = hadScores.filter((p) => p.next.scores.length === 0).length;
    if (hadScores.length > 0 && rate(lostScores, hadScores.length) > SCORES_DISAPPEARED_RATE) {
      flags.push(flag('SCORES_DISAPPEARED', `${lostScores} of ${hadScores.length} published reviews came back with no metrics.`, { lost: lostScores, compared: hadScores.length }));
    }
    const hadImages = pairs.filter((p) => currentImages(p.stored).length > 0);
    if (hadImages.length > 0 && hadImages.every((p) => p.next.images.length === 0)) {
      flags.push(flag('IMAGES_DISAPPEARED', `Every one of ${hadImages.length} published reviews with images came back without any.`, { compared: hadImages.length }));
    }
    const hadVerdict = pairs.filter((p) => p.stored.review.verdict != null && p.stored.review.verdict !== '');
    if (hadVerdict.length > 0 && hadVerdict.every((p) => p.next.verdict == null)) {
      flags.push(flag('VERDICTS_DISAPPEARED', `Every one of ${hadVerdict.length} published reviews with a verdict came back without one.`, { compared: hadVerdict.length }));
    }
  }

  return { publishable: flags.length === 0, flags, warnings };
}
