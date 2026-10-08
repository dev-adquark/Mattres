/**
 * Publication decisions and write shapes (brief sections 17, 31-32). Pure.
 *
 * Status rules:
 *   ambiguous match                     -> pending (a human picks the product)
 *   no catalog product                  -> new_candidate (never auto-published)
 *   matched + publishable run           -> published
 *   matched + held run:
 *     already published                 -> stays published; the pipeline keeps
 *                                          the previous content and records the
 *                                          newer evidence in the change log only
 *     new                               -> validated
 *     changed                           -> changed
 *     unchanged                         -> keeps 'changed', otherwise validated
 * A held run never changes what the site shows.
 */

import { FINGERPRINT_VERSION, RTINGS_SOURCE, RTINGS_SOURCE_TYPE } from './types';
import type {
  CatalogMatchResult,
  ImageWrite,
  NormalizedReview,
  ReviewChange,
  ReviewStatus,
  ReviewWrite,
  SafetyVerdict,
  ScoreWrite,
  StoredReview,
} from './types';

export function decideStatus(match: CatalogMatchResult, safety: SafetyVerdict, change: ReviewChange, existingStatus: ReviewStatus | null = null): ReviewStatus {
  if (!safety.publishable && existingStatus === 'published') return 'published';
  if (match.kind === 'ambiguous') return 'pending';
  if (match.kind === 'new_candidate') return 'new_candidate';
  if (safety.publishable) return 'published';
  if (change.kind === 'created') return 'validated';
  if (change.kind === 'updated') return 'changed';
  return existingStatus === 'changed' ? 'changed' : 'validated';
}

/** Human-readable reason stored in rtings_reviews.status_reason. */
export function statusReason(status: ReviewStatus, match: CatalogMatchResult, safety: SafetyVerdict, syncRunId: number | null): string | null {
  const run = syncRunId == null ? 'this sync' : `sync run #${syncRunId}`;
  const held = safety.flags.map((f) => f.code).join(', ');
  switch (status) {
    case 'pending':
      return match.kind === 'ambiguous' ? `Ambiguous catalog match: ${match.reason}. Candidates: ${match.candidates.join(', ') || 'none'}.` : null;
    case 'new_candidate':
      return match.kind === 'new_candidate' ? `Not in the catalog: ${match.reason}.` : null;
    case 'validated':
      return `Validated and matched; publication held by the safety gate in ${run} (${held}).`;
    case 'changed':
      return `RTINGS data changed; publication held by the safety gate in ${run} (${held}).`;
    case 'published':
      if (!safety.publishable) return `Newer RTINGS data held by the safety gate in ${run} (${held}); previous published evidence kept.`;
      return null;
    default:
      return null;
  }
}

export interface BuildReviewWriteInput {
  review: NormalizedReview;
  fingerprint: string;
  match: CatalogMatchResult;
  status: ReviewStatus;
  statusReason: string | null;
  syncRunId: number | null;
  existing: StoredReview | null;
  change: ReviewChange;
  /** ISO time of this run's processing. */
  now: string;
}

export function buildReviewWrite(input: BuildReviewWriteInput): ReviewWrite {
  const { review, match, status, existing, change, now } = input;
  const matched = match.kind === 'matched' ? match : null;
  const prior = existing?.review ?? null;

  let sitePublishedAt: string | null = null;
  if (status === 'published') {
    const stillSame = prior?.status === 'published' && change.kind === 'unchanged' && prior.site_published_at;
    sitePublishedAt = stillSame ? (prior.site_published_at as string) : now;
  }

  const write: ReviewWrite = {
    mattress_id: matched ? matched.mattressId : null,
    source: RTINGS_SOURCE,
    source_type: RTINGS_SOURCE_TYPE,
    brand: review.brand,
    model: review.model,
    product_name: review.productName,
    brand_key: review.brandKey,
    model_key: review.modelKey,
    brand_slug: review.brandSlug,
    model_slug: review.modelSlug,
    product_id: review.productId,
    review_url: review.reviewUrl,
    product_url: review.productUrl,
    category: review.category,
    record_type: review.recordType,
    test_bench_name: review.testBenchName,
    test_bench_id: review.testBenchId,
    overall_score: review.overallScore,
    verdict: review.verdict,
    pros: review.pros,
    cons: review.cons,
    mixed_summary: review.mixedSummary,
    recommended_for: review.recommendedFor,
    published_at: review.publishedAt,
    source_updated_at: review.sourceUpdatedAt,
    retrieved_at: review.provenance.retrievedAt,
    apify_actor_id: review.provenance.apifyActorId,
    apify_run_id: review.provenance.apifyRunId,
    dataset_id: review.provenance.datasetId,
    sync_run_id: input.syncRunId,
    fingerprint: input.fingerprint,
    fingerprint_version: FINGERPRINT_VERSION,
    status,
    status_reason: input.statusReason,
    match_method: matched ? matched.method : null,
    match_confidence: matched ? matched.confidence : match.kind === 'ambiguous' ? 'ambiguous' : 'none',
    match_candidates: match.kind === 'ambiguous' ? match.candidates : null,
    resolution_note: prior?.resolution_note ?? null,
    last_seen_at: now,
    site_published_at: sitePublishedAt,
  };
  if (!prior) write.first_seen_at = now;
  return write;
}

export function buildScoreWrites(review: NormalizedReview): ScoreWrite[] {
  return review.scores.map((s) => ({
    metric_key: s.metricKey,
    metric_label: s.metricLabel,
    raw_value: s.rawValue,
    value: s.value,
    scale: s.scale,
    value_kind: s.valueKind,
    source: RTINGS_SOURCE,
    retrieved_at: review.provenance.retrievedAt,
    apify_run_id: review.provenance.apifyRunId,
  }));
}

export function buildImageWrites(review: NormalizedReview): ImageWrite[] {
  return review.images.map((img) => ({
    source: RTINGS_SOURCE,
    source_url: img.sourceUrl,
    image_url: img.imageUrl,
    source_field: img.sourceField,
    alt: img.alt,
    scraped_at: review.provenance.retrievedAt,
  }));
}
