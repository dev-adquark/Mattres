/**
 * Site read model for RTINGS evidence (brief sections 18, 30, 42, 43).
 *
 * Server-only. A product page reads published RTINGS evidence from the
 * repository (Supabase when configured, else the read-only snapshot file
 * lib/data/rtings-evidence.json) through a tagged data cache. Nothing here
 * talks to Apify: a page visit can never start a scrape. This module must
 * never import lib/apify/apifyClient.
 *
 * Rules enforced here, not in the UI:
 *   - only status 'published' rows matched to this mattress with exact or
 *     high confidence reach the page;
 *   - a metric appears only when RTINGS returned it (no zero-filling);
 *   - images appear only when usage_status = 'licensed' with a license note
 *     (RTINGS images default to 'source_only' and are never displayed);
 *   - RTINGS' own publish/update dates stay apart from our retrieval date;
 *   - any repository error returns null, so the page still renders.
 */
import { unstable_cache } from 'next/cache';
import type { MattressEntry } from '@/lib/types';
import { getRtingsRepository } from './repository';
import { eligiblePhoto } from './photo';
import { realRecommendedFor } from './sectionTags';
import {
  RTINGS_EVIDENCE_CACHE_TAG,
  RTINGS_REVIEW_HOSTS,
  RTINGS_SOURCE,
  RTINGS_SOURCE_TYPE,
  SITE_VISIBLE_STATUSES,
  type EvidenceMetric,
  type RepositoryKind,
  type RtingsEvidence,
  type RtingsRepository,
  type RtingsScoreRow,
  type StoredReview,
} from './types';

const VISIBLE = new Set<string>(SITE_VISIBLE_STATUSES);
const PUBLISHABLE_CONFIDENCE = new Set(['exact', 'high']);

/** 6 hours; a sync that publishes also calls revalidateTag(RTINGS_EVIDENCE_CACHE_TAG). */
export const EVIDENCE_REVALIDATE_SECONDS = 21600;

function isRtingsReviewUrl(url: unknown): url is string {
  if (typeof url !== 'string') return false;
  try {
    const u = new URL(url);
    return u.protocol === 'https:' && (RTINGS_REVIEW_HOSTS as readonly string[]).includes(u.hostname);
  } catch {
    return false;
  }
}

function isHttpsUrl(url: unknown): url is string {
  if (typeof url !== 'string') return false;
  try {
    return new URL(url).protocol === 'https:';
  } catch {
    return false;
  }
}

function toMetric(row: RtingsScoreRow): EvidenceMetric | null {
  const rawValue = typeof row.raw_value === 'string' && row.raw_value.trim() ? row.raw_value.trim() : null;
  const value = typeof row.value === 'number' && Number.isFinite(row.value) ? row.value : null;
  // A metric with neither text nor number was not really returned: omit it.
  if (rawValue === null && value === null) return null;
  if (!row.metric_key || !row.metric_label) return null;
  return { key: row.metric_key, label: row.metric_label, rawValue, value, scale: row.scale ?? null, kind: row.value_kind };
}

export function isVisible(stored: StoredReview, mattressId: string): boolean {
  const r = stored.review;
  return (
    VISIBLE.has(r.status) &&
    r.mattress_id === mattressId &&
    r.match_confidence !== null &&
    PUBLISHABLE_CONFIDENCE.has(r.match_confidence) &&
    r.source === RTINGS_SOURCE &&
    isRtingsReviewUrl(r.review_url)
  );
}

/** Latest RTINGS update first, so a re-reviewed model shows its current review. */
function newestFirst(a: StoredReview, b: StoredReview): number {
  const ka = a.review.source_updated_at || a.review.published_at || '';
  const kb = b.review.source_updated_at || b.review.published_at || '';
  return kb.localeCompare(ka);
}

/** Pure mapping from stored rows to the page's read model. Exported for tests. */
export function toEvidence(stored: StoredReview, mattressId: string): RtingsEvidence {
  const r = stored.review;
  const metrics = [...stored.scores]
    .sort((a, b) => a.id - b.id)
    .map(toMetric)
    .filter((m): m is EvidenceMetric => m !== null);
  const licensedImages = stored.images
    .filter((img) => img.usage_status === 'licensed' && typeof img.license_note === 'string' && img.license_note.trim() && isHttpsUrl(img.image_url))
    .map((img) => ({ imageUrl: img.image_url, alt: img.alt, licenseNote: (img.license_note as string).trim() }));
  const overall = typeof r.overall_score === 'number' && Number.isFinite(r.overall_score) ? r.overall_score : null;
  return {
    mattressId,
    source: RTINGS_SOURCE,
    sourceType: RTINGS_SOURCE_TYPE,
    reviewUrl: r.review_url,
    productName: r.product_name,
    overallScore: overall,
    verdict: r.verdict,
    pros: r.pros && r.pros.length ? r.pros : null,
    cons: r.cons && r.cons.length ? r.cons : null,
    mixedSummary: r.mixed_summary,
    recommendedFor: Array.isArray(r.recommended_for) ? realRecommendedFor(r.recommended_for) : [],
    metrics,
    licensedImages,
    photo: eligiblePhoto(stored),
    publishedAt: r.published_at,
    sourceUpdatedAt: r.source_updated_at,
    retrievedAt: r.retrieved_at,
    testBenchName: r.test_bench_name,
    provenance: { apifyActorId: r.apify_actor_id, apifyRunId: r.apify_run_id, datasetId: r.dataset_id },
  };
}

/**
 * Uncached read: the published RTINGS evidence for one catalog mattress, or
 * null when there is none or the store cannot be read.
 */
export async function loadPublishedEvidence(mattressId: string, repo?: RtingsRepository): Promise<RtingsEvidence | null> {
  if (!mattressId) return null;
  try {
    const store = repo ?? getRtingsRepository();
    const rows = await store.getPublishedForMattress(mattressId);
    const visible = rows.filter((s) => isVisible(s, mattressId)).sort(newestFirst);
    const first = visible[0];
    return first ? toEvidence(first, mattressId) : null;
  } catch (err) {
    console.warn(`[rtings-evidence] read failed for ${mattressId}: ${err instanceof Error ? err.message : String(err)}`);
    return null;
  }
}

/** Cached read for product pages; invalidated by revalidateTag(RTINGS_EVIDENCE_CACHE_TAG). */
export const getPublishedEvidence: (mattressId: string) => Promise<RtingsEvidence | null> = unstable_cache(
  async (mattressId: string) => loadPublishedEvidence(mattressId),
  ['rtings-evidence-v1'],
  { tags: [RTINGS_EVIDENCE_CACHE_TAG], revalidate: EVIDENCE_REVALIDATE_SECONDS },
);

// ---------------------------------------------------------------------------
// Catalog fallback: RTINGS cross-check fields already curated in the catalog
// ---------------------------------------------------------------------------

/**
 * RTINGS figures that were cross-checked by hand into the catalog before the
 * pipeline existed (firmness measurement, firmness label, "recommended for"
 * list, the RTINGS review link and the cross-check date). Shown only when no
 * published pipeline record exists. The catalog holds no RTINGS publish
 * date, so none is shown.
 */
export interface CatalogRtingsCrossCheck {
  mattressId: string;
  reviewUrl: string;
  firmnessLabel: string | null;
  firmnessPaPerMm: number | null;
  recommendedFor: string[];
  /** When the catalog value was checked against RTINGS (our date, not theirs). */
  crossCheckedAt: string;
}

export function catalogRtingsCrossCheck(entry: MattressEntry): CatalogRtingsCrossCheck | null {
  const link = (entry.reviewSources || []).find((s) => s?.sourceName === RTINGS_SOURCE && isRtingsReviewUrl(s.sourceUrl));
  if (!link || !entry.rtingsCrossCheckedAt) return null;
  const firmnessPaPerMm = typeof entry.firmnessPaPerMm === 'number' && Number.isFinite(entry.firmnessPaPerMm) && entry.firmnessPaPerMm > 0 ? entry.firmnessPaPerMm : null;
  const firmnessLabel = typeof entry.firmnessLabelFromRtings === 'string' && entry.firmnessLabelFromRtings.trim() ? entry.firmnessLabelFromRtings.trim() : null;
  const recommendedFor = Array.isArray(entry.rtingsRecommendedFor)
    ? realRecommendedFor(entry.rtingsRecommendedFor.filter((s): s is string => typeof s === 'string' && Boolean(s.trim())))
    : [];
  // Nothing to show beyond a link: not a panel.
  if (firmnessPaPerMm === null && firmnessLabel === null && !recommendedFor.length) return null;
  return { mattressId: entry.id, reviewUrl: link.sourceUrl as string, firmnessLabel, firmnessPaPerMm, recommendedFor, crossCheckedAt: entry.rtingsCrossCheckedAt };
}

// ---------------------------------------------------------------------------
// Pipeline status for the methodology page (no Apify call)
// ---------------------------------------------------------------------------

export interface RtingsPipelineStatus {
  /** Which store the site reads; 'file' means the read-only snapshot shipped with the build. */
  store: RepositoryKind | null;
  /** True only when Supabase credentials are configured. */
  databaseConnected: boolean;
  /** Published RTINGS records the site can show; null when the store could not be read. */
  publishedReviews: number | null;
}

export async function loadRtingsPipelineStatus(repo?: RtingsRepository): Promise<RtingsPipelineStatus> {
  try {
    const store = repo ?? getRtingsRepository();
    const publishedReviews = await store.countReviews({ statuses: ['published'] });
    return { store: store.kind, databaseConnected: store.kind === 'supabase', publishedReviews };
  } catch {
    return { store: null, databaseConnected: false, publishedReviews: null };
  }
}
