/**
 * TEST-ONLY helpers that push fixture records through the real validate +
 * normalize modules, so downstream tests exercise the same shapes the
 * pipeline produces.
 */
import { normalizeRecord } from '../normalize';
import { validateRawRecord } from '../validate';
import type { NormalizedReview, RtingsImageRow, RtingsReviewRow, RtingsScoreRow, StoredReview } from '../types';
import { NORMALIZE_CTX } from './records';

export function toNormalized(
  raw: unknown,
  ctx: { apifyActorId?: string; apifyRunId?: string | null; datasetId?: string | null; receivedAt?: string } = {}
): NormalizedReview {
  const v = validateRawRecord(raw);
  if (!v.ok) throw new Error(`fixture failed validation: ${JSON.stringify(v.problems)}`);
  const n = normalizeRecord(v.record, { ...NORMALIZE_CTX, ...ctx });
  if (!n.ok) throw new Error(`fixture failed normalization: ${JSON.stringify(n.problems)}`);
  return n.review;
}

/**
 * A StoredReview as the repository would hold it after `review` was stored
 * (test-side mapping of NormalizedReview -> row shapes; ids are synthetic).
 */
export function storedFrom(review: NormalizedReview, fingerprint: string, overrides: Partial<RtingsReviewRow> = {}): StoredReview {
  const now = review.provenance.retrievedAt;
  const row: RtingsReviewRow = {
    id: 1,
    mattress_id: null,
    source: 'RTINGS',
    source_type: 'independent_review',
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
    retrieved_at: now,
    apify_actor_id: review.provenance.apifyActorId,
    apify_run_id: review.provenance.apifyRunId,
    dataset_id: review.provenance.datasetId,
    sync_run_id: 1,
    fingerprint,
    fingerprint_version: 1,
    status: 'validated',
    status_reason: null,
    match_method: null,
    match_confidence: null,
    match_candidates: null,
    resolution_note: null,
    first_seen_at: now,
    last_seen_at: now,
    site_published_at: null,
    created_at: now,
    updated_at: now,
    ...overrides,
  };
  const scores: RtingsScoreRow[] = review.scores.map((s, i) => ({
    id: i + 1,
    review_id: row.id,
    metric_key: s.metricKey,
    metric_label: s.metricLabel,
    raw_value: s.rawValue,
    value: s.value,
    scale: s.scale,
    value_kind: s.valueKind,
    source: 'RTINGS',
    retrieved_at: now,
    apify_run_id: review.provenance.apifyRunId,
    created_at: now,
    updated_at: now,
  }));
  const images: RtingsImageRow[] = review.images.map((img, i) => ({
    id: i + 1,
    review_id: row.id,
    source: 'RTINGS',
    source_url: img.sourceUrl,
    image_url: img.imageUrl,
    source_field: img.sourceField,
    alt: img.alt,
    scraped_at: now,
    usage_status: 'source_only',
    license_note: null,
    created_at: now,
    updated_at: now,
  }));
  return { review: row, scores, images };
}
