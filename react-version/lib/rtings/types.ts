/**
 * Shared contract for the RTINGS evidence pipeline (lib/rtings/*).
 *
 * Source: Apify actor crawlerbros/rtings-scraper (id dCa1uCOn8ZtEkUamC).
 * Tables: supabase/migrations/0005_rtings_pipeline.sql. Every *Row type
 * below mirrors one table column for column (snake_case, as PostgREST
 * returns it); every camelCase type is the in-app shape.
 *
 * RTINGS is evidence only. Nothing in this folder may feed the Match Score
 * engine (lib/scoreEngine.ts, lib/rules/*.json).
 *
 * Runtime rules for this file: erasable TypeScript only (no enums, no
 * namespaces) so scripts/lib/app-modules.js can load it through Node's type
 * stripping, and no imports with side effects. The `as const` arrays are the
 * single source for both the unions and runtime checks.
 */

// ---------------------------------------------------------------------------
// Source constants
// ---------------------------------------------------------------------------

/** The only actor this pipeline may call. APIFY_RTINGS_ACTOR_ID overrides it only for the same actor's id/slug. */
export const RTINGS_ACTOR_ID = 'dCa1uCOn8ZtEkUamC';
export const RTINGS_ACTOR_SLUG = 'crawlerbros/rtings-scraper';
export const RTINGS_SOURCE = 'RTINGS';
export const RTINGS_SOURCE_TYPE = 'independent_review';
/** Hosts a review/product URL may use. Anything else is rejected at validation. */
export const RTINGS_REVIEW_HOSTS = ['www.rtings.com'] as const;
/** Hosts a source image URL may use (seen in the real sample: i.rtings.com). */
export const RTINGS_IMAGE_HOSTS = ['i.rtings.com'] as const;
/** Cache tag for every cached read of published evidence; revalidated after a publish. */
export const RTINGS_EVIDENCE_CACHE_TAG = 'rtings-evidence';
/** Primary cadence (brief section 22/41): a daily tick runs the sync only when this much time has passed since the last successful one. */
export const RTINGS_SYNC_INTERVAL_DAYS = 14;
export const FINGERPRINT_VERSION = 1;

// ---------------------------------------------------------------------------
// Raw actor output (exactly what Apify returns)
// ---------------------------------------------------------------------------

/**
 * Fields observed in a real run (data/raw/rtings-mattresses-raw.json,
 * 20 records, scraped 2026-09-25). Present on all 20: productId, name,
 * brand, reviewUrl, productUrl, category, brandSlug, modelSlug, publishedAt,
 * publishedYear, testBenchName, testBenchId, mainImageUrl, testScoresFlat,
 * featuredTests, recommendedFor, recordType, scrapedAt. On some only:
 * commentCount (8/20), firstPublishedAt (2/20).
 *
 * NOT returned for mattresses in that run: any verdict, summary, pros,
 * cons, mixed text, or numeric overall/category score. They normalize to
 * null unless a run returns the documented fields below with the right type. featuredTests[].score was 0 on every item (a placeholder, not a
 * rating) and must never be read as a score.
 */
export const RTINGS_RAW_KNOWN_FIELDS = [
  'productId',
  'name',
  'brand',
  'reviewUrl',
  'productUrl',
  'category',
  'brandSlug',
  'modelSlug',
  'publishedAt',
  'firstPublishedAt',
  'publishedYear',
  'testBenchName',
  'testBenchId',
  'mainImageUrl',
  'testScoresFlat',
  'featuredTests',
  'recommendedFor',
  'recordType',
  'scrapedAt',
  'commentCount',
] as const;

/**
 * Optional fields the actor DOCUMENTS (Apify Store page of
 * crawlerbros/rtings-scraper, read 2026-10-07: "overallScore" 0-10,
 * "verdict" string, "pros"/"cons" string arrays, plus "reviewId",
 * "usageRatings", "reviewedVariation", "variantCount", "skuIds" and
 * "authors") but that the mattress runs so far have NOT returned (the
 * detail-page parser logs "no ProductVuePage payload"). They are known, so
 * their appearance is not schema drift. validate.ts type-checks the ones
 * normalize.ts reads (overallScore, verdict, pros, cons); a wrong type is a
 * MALFORMED_FIELD warning, which does count toward SCHEMA_DRIFT. The rest
 * stay in the raw payload only. The actor's page names a "mixed notes"
 * summary without documenting its field name, so mixedSummary is not mapped
 * from any guessed key: an unlisted key surfaces as a NEW_OPTIONAL_FIELDS
 * warning naming it, for a person to map after inspecting real output.
 */
export const RTINGS_RAW_DOCUMENTED_OPTIONAL_FIELDS = [
  'reviewId',
  'overallScore',
  'usageRatings',
  'verdict',
  'pros',
  'cons',
  'reviewedVariation',
  'variantCount',
  'skuIds',
  'authors',
] as const;

/** Fields whose absence makes a record unusable (validate.ts rejects it). */
export const RTINGS_RAW_REQUIRED_FIELDS = ['productId', 'name', 'brand', 'reviewUrl'] as const;

export interface RawFeaturedTest {
  name?: unknown;
  value?: unknown;
  score?: unknown;
}

/**
 * One dataset item as returned. Every field is `unknown`-safe: the actor is
 * an external system, so validate.ts narrows before anything is trusted.
 * Unlisted keys are kept in the raw payload (rtings_raw_records.payload)
 * and reported as schema drift, never dropped silently.
 */
export interface RawRtingsRecord {
  productId?: unknown; // string in the sample, e.g. "57836"
  name?: unknown; // "Allswell Hybrid" (brand + model)
  brand?: unknown; // "Allswell"
  reviewUrl?: unknown; // "https://www.rtings.com/mattress/reviews/allswell/hybrid-mattress"
  productUrl?: unknown; // equal to reviewUrl in every sample item
  category?: unknown; // "mattress"
  brandSlug?: unknown;
  modelSlug?: unknown;
  publishedAt?: unknown; // "2026-01-30 12:38:27 -0500" (latest publish/update)
  firstPublishedAt?: unknown; // only when RTINGS re-published; earlier than publishedAt
  publishedYear?: unknown;
  testBenchName?: unknown; // "1.2"
  testBenchId?: unknown; // "236"
  mainImageUrl?: unknown; // "https://i.rtings.com/assets/products/.../design-small.jpg"
  /** Label -> display text, e.g. { "Firmness Level": "Medium-Firm (54 Pa/mm)" }. */
  testScoresFlat?: unknown;
  featuredTests?: unknown; // RawFeaturedTest[]
  recommendedFor?: unknown; // string[] of plain tags, no ratings attached
  recordType?: unknown; // "review"
  scrapedAt?: unknown; // ISO timestamp from the actor
  commentCount?: unknown;
  // Documented by the actor, not yet returned for mattresses (see RTINGS_RAW_DOCUMENTED_OPTIONAL_FIELDS).
  overallScore?: unknown; // number 0-10
  verdict?: unknown; // string
  pros?: unknown; // string[]
  cons?: unknown; // string[]
  [extra: string]: unknown;
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export const VALIDATION_PROBLEM_CODES = [
  'NOT_AN_OBJECT',
  'MISSING_PRODUCT_ID',
  'MISSING_NAME',
  'MISSING_BRAND',
  'MISSING_MODEL', // name minus brand leaves nothing
  'INVALID_REVIEW_URL', // not https, not www.rtings.com, or not a /mattress/ path
  'INVALID_PRODUCT_URL',
  'WRONG_CATEGORY', // category present and not "mattress"
  'INVALID_DATE', // unparseable, before 2010-01-01, or more than 1 day in the future
  'INVALID_SCORE', // NaN, negative, or outside the metric's scale
  'INVALID_IMAGE_URL', // not https, not an RTINGS image host, or not an image extension
  'MALFORMED_FIELD', // a known field has the wrong JSON type
] as const;
export type ValidationProblemCode = (typeof VALIDATION_PROBLEM_CODES)[number];

export interface ValidationProblem {
  code: ValidationProblemCode;
  field: string;
  message: string;
  /** Fatal problems reject the record; non-fatal ones drop only that field (it becomes null). */
  fatal: boolean;
}

export type ValidationResult =
  | { ok: true; record: ValidatedRawRecord; warnings: ValidationProblem[] }
  | { ok: false; problems: ValidationProblem[] };

/** A raw record whose identity fields are proven present and well-formed. */
export interface ValidatedRawRecord extends RawRtingsRecord {
  productId: string;
  name: string;
  brand: string;
  reviewUrl: string;
}

// ---------------------------------------------------------------------------
// Normalized review
// ---------------------------------------------------------------------------

export const REVIEW_STATUSES = ['pending', 'validated', 'published', 'rejected', 'changed', 'new_candidate', 'source_missing'] as const;
/**
 * pending         valid, but the catalog match is ambiguous; needs a human
 * validated       valid and matched with confidence; not yet promoted
 * published       visible on the site (requires mattress_id + exact/high match)
 * rejected        failed validation (only stored when the review URL is valid)
 * changed         fingerprint changed while publication was held by the safety gate
 * new_candidate   valid RTINGS review for a product not in the catalog; never auto-published
 * source_missing  a run with full coverage no longer returned it; history kept, hidden from the site
 */
export type ReviewStatus = (typeof REVIEW_STATUSES)[number];

/** The only statuses the website may render. */
export const SITE_VISIBLE_STATUSES = ['published'] as const satisfies readonly ReviewStatus[];

export const MATCH_METHODS = ['review_url', 'product_id_alias', 'brand_model', 'manual'] as const;
export type MatchMethod = (typeof MATCH_METHODS)[number];

export const MATCH_CONFIDENCES = ['exact', 'high', 'ambiguous', 'none'] as const;
export type MatchConfidence = (typeof MATCH_CONFIDENCES)[number];

export const SCORE_VALUE_KINDS = ['score_0_10', 'measurement', 'label', 'boolean'] as const;
export type ScoreValueKind = (typeof SCORE_VALUE_KINDS)[number];

/** One metric as normalized from testScoresFlat (and any future numeric score field). */
export interface NormalizedScore {
  /** snake_case of the RTINGS label: "Firmness Level" -> "firmness_level". */
  metricKey: string;
  /** The RTINGS label verbatim. */
  metricLabel: string;
  /** The RTINGS text verbatim, e.g. "Medium-Firm (54 Pa/mm)". */
  rawValue: string | null;
  /** Parsed number; null when the metric is not numeric. Never 0 for "missing". */
  value: number | null;
  /** '0-10' for ratings, the unit (e.g. 'Pa/mm') for measurements, null for labels. */
  scale: string | null;
  valueKind: ScoreValueKind;
}

export interface NormalizedImage {
  /** The RTINGS review page the image belongs to. */
  sourceUrl: string;
  imageUrl: string;
  /** Actor field it came from, e.g. 'mainImageUrl'. */
  sourceField: string;
  /** Only when the actor returns alt text; never generated. */
  alt: string | null;
}

/** Provenance carried by every RTINGS-derived row (brief section 8). */
export interface RtingsProvenance {
  source: typeof RTINGS_SOURCE;
  sourceType: typeof RTINGS_SOURCE_TYPE;
  sourceUrl: string;
  apifyActorId: string;
  /** Null only when Apify did not report one; never invented. */
  apifyRunId: string | null;
  datasetId: string | null;
  /** When our pipeline received it (actor scrapedAt when valid, else the run's receive time). */
  retrievedAt: string;
}

/** Application-safe representation of one RTINGS review, before matching. */
export interface NormalizedReview {
  productId: string;
  brand: string;
  /** Model name with the brand prefix removed ("Allswell Hybrid" -> "Hybrid"). */
  model: string;
  /** RTINGS product name verbatim ("Allswell Hybrid"). */
  productName: string;
  /** Deterministic dedupe keys (see normalize.ts toBrandKey/toModelKey). */
  brandKey: string;
  modelKey: string;
  brandSlug: string | null;
  modelSlug: string | null;
  /** Canonical: https, lowercase host, no query/hash, no trailing slash. */
  reviewUrl: string;
  productUrl: string | null;
  category: string | null;
  recordType: string | null;
  testBenchName: string | null;
  testBenchId: string | null;
  overallScore: number | null;
  verdict: string | null;
  pros: string[] | null;
  cons: string[] | null;
  mixedSummary: string | null;
  recommendedFor: string[];
  /** firstPublishedAt when returned, else publishedAt (ISO). */
  publishedAt: string | null;
  /** The actor's publishedAt, i.e. RTINGS' latest publish/update (ISO). */
  sourceUpdatedAt: string | null;
  scores: NormalizedScore[];
  images: NormalizedImage[];
  provenance: RtingsProvenance;
}

export type NormalizeResult =
  | { ok: true; review: NormalizedReview; warnings: ValidationProblem[] }
  | { ok: false; problems: ValidationProblem[] };

// ---------------------------------------------------------------------------
// Matching + dedupe
// ---------------------------------------------------------------------------

/** A curated, human-checked mapping (lib/rtings/aliases.json). Never generated by code. */
export interface RtingsAlias {
  rtingsProductId: string;
  reviewUrl: string;
  catalogId: string;
  /** Why this mapping is correct, with the evidence used. */
  note: string;
  addedAt: string;
}

export type CatalogMatchResult =
  | { kind: 'matched'; mattressId: string; method: MatchMethod; confidence: 'exact' | 'high' }
  | { kind: 'ambiguous'; candidates: string[]; reason: string }
  | { kind: 'new_candidate'; reason: string };

export interface DedupeResult {
  /** One review per product_id / canonical review_url, last occurrence wins. */
  unique: NormalizedReview[];
  /** Items dropped as in-batch duplicates (same product or same URL). */
  duplicates: { productId: string; reviewUrl: string; keptIndex: number; droppedIndex: number }[];
}

// ---------------------------------------------------------------------------
// Fingerprint + change detection
// ---------------------------------------------------------------------------

/** Exactly what the fingerprint hashes (canonical JSON, keys sorted, arrays sorted where order is not meaningful). */
export interface FingerprintInput {
  v: typeof FINGERPRINT_VERSION;
  productId: string;
  reviewUrl: string;
  brand: string;
  productName: string;
  overallScore: number | null;
  verdict: string | null;
  pros: string[] | null;
  cons: string[] | null;
  mixedSummary: string | null;
  recommendedFor: string[];
  publishedAt: string | null;
  sourceUpdatedAt: string | null;
  scores: { metricKey: string; rawValue: string | null; value: number | null }[];
  images: string[];
}

export type ChangeKind = 'created' | 'updated' | 'unchanged';

export interface ReviewChange {
  kind: ChangeKind;
  oldFingerprint: string | null;
  newFingerprint: string;
  /** Field paths, e.g. ['scores.firmness_level', 'images', 'verdict']. Empty unless kind = 'updated'. */
  changedFields: string[];
  oldValues: Record<string, unknown>;
  newValues: Record<string, unknown>;
}

export interface ChangeLogEntry {
  reviewId: number;
  oldFingerprint: string;
  newFingerprint: string;
  changedFields: string[];
  oldValues: Record<string, unknown>;
  newValues: Record<string, unknown>;
  detectedAt: string;
  apifyRunId: string | null;
  syncRunId: number | null;
  outcome: 'published' | 'held' | 'recorded';
}

// ---------------------------------------------------------------------------
// Safety gate
// ---------------------------------------------------------------------------

export const SAFETY_FLAG_CODES = [
  'MALFORMED_RESPONSE', // dataset was not an array of objects
  'EMPTY_DATASET', // 0 items while something is already published
  'COUNT_DROP', // far fewer items than the last comparable successful run
  'HIGH_REJECTION_RATE', // too many items failed validation
  'INVALID_DOMAIN', // many review URLs outside www.rtings.com
  'SCHEMA_DRIFT', // required fields missing broadly / known fields changed type
  'SCORES_DISAPPEARED', // previously published reviews lost their metrics
  'IMAGES_DISAPPEARED', // every image missing where images existed before
  'VERDICTS_DISAPPEARED', // every verdict missing where verdicts existed before
] as const;
export type SafetyFlagCode = (typeof SAFETY_FLAG_CODES)[number];

export interface SafetyFlag {
  code: SafetyFlagCode;
  message: string;
  /** Numbers behind the decision, e.g. { previous: 20, received: 3 }. */
  detail: Record<string, number | string | null>;
}

/** Non-blocking observations about a run: recorded and reported, never a reason to hold it. */
export const SAFETY_WARNING_CODES = [
  'NEW_OPTIONAL_FIELDS', // items carried keys outside the known + documented field lists
] as const;
export type SafetyWarningCode = (typeof SAFETY_WARNING_CODES)[number];

export interface SafetyWarning {
  code: SafetyWarningCode;
  message: string;
  detail: Record<string, number | string | null>;
}

export interface SafetyVerdict {
  /** false = do not publish anything from this run; keep the previous snapshot. */
  publishable: boolean;
  flags: SafetyFlag[];
  /** Non-blocking; absent on verdicts built before warnings existed. Persisted in error_summary, never in safety_flags. */
  warnings?: SafetyWarning[];
}

// ---------------------------------------------------------------------------
// Sync runs
// ---------------------------------------------------------------------------

export const SYNC_RUN_STATUSES = ['running', 'awaiting_apify', 'success', 'partial', 'held', 'failed'] as const;
export type SyncRunStatus = (typeof SYNC_RUN_STATUSES)[number];

export const SYNC_TRIGGERS = ['cron', 'manual'] as const;
export type SyncTrigger = (typeof SYNC_TRIGGERS)[number];
/** Finer-grained origin kept in the legacy trigger_source column. */
export type SyncTriggerSource = 'cron' | 'admin' | 'cli';

export const SYNC_COVERAGES = ['full_category', 'targeted_urls', 'partial'] as const;
/**
 * full_category  byCategory run that returned fewer items than maxItems (the whole list)
 * targeted_urls  url-mode run; only the targeted URLs can be marked source_missing
 * partial        anything else; source_missing is never set from a partial run
 */
export type SyncCoverage = (typeof SYNC_COVERAGES)[number];

export interface SyncErrorEntry {
  code: string;
  message: string;
  /** Records affected (product ids or item indexes as strings). */
  affected: string[];
  retryable: boolean;
}

export interface SyncCounts {
  received: number;
  valid: number;
  rejected: number;
  created: number;
  updated: number;
  unchanged: number;
  failed: number;
  pending: number;
  newCandidate: number;
  sourceMissing: number;
  published: number;
}

/** What the cron/admin endpoints return (inside the admin envelope for /api/admin/*). */
export interface SyncSummary {
  syncRunId: number | null;
  status: SyncRunStatus;
  trigger: SyncTrigger;
  triggerSource: SyncTriggerSource;
  actorId: string;
  apifyRunId: string | null;
  datasetId: string | null;
  coverage: SyncCoverage | null;
  startedAt: string;
  completedAt: string | null;
  counts: SyncCounts;
  safety: SafetyVerdict;
  errors: SyncErrorEntry[];
  /** From Apify's run usage when reported; never estimated by us. */
  estimatedCostUsd: number | null;
  /** Which store took the writes: 'supabase' | 'file' | 'memory'. */
  store: RepositoryKind;
}

/** Why a daily tick did or did not run (freshness.ts). */
export type SyncDueReason = 'never_synced' | 'interval_elapsed' | 'resume_awaiting_apify';
/**
 * Why a due sync is still skipped:
 *   not_due               < 14 days since the last success|partial run
 *   held_awaiting_review  the latest finished run was held by the safety gate; the same data would be
 *                         held again, so the cron waits 14 days (an admin manual sync can run any time)
 *   failed_backoff        the latest finished run(s) failed; exponential backoff 1, 2, 4, 7 days, and
 *                         after RTINGS_MAX_AUTO_FAILURES consecutive failures only every 14 days
 */
export type SyncSkipReason = 'not_due' | 'held_awaiting_review' | 'failed_backoff';

/** The newest finished run (success|partial|held|failed), as the gate saw it. */
export interface SyncLastAttempt {
  runId: number;
  status: SyncRunStatus;
  completedAt: string | null;
  /** Consecutive failed runs ending with the newest one (0 unless it failed). */
  consecutiveFailures: number;
}

export type SyncDueDecision =
  | { due: true; reason: SyncDueReason; lastSuccessAt: string | null; resumeApifyRunId?: string; lastAttempt?: SyncLastAttempt | null }
  | { due: false; reason: SyncSkipReason; lastSuccessAt: string | null; nextDueAt: string; lastAttempt?: SyncLastAttempt | null };

// ---------------------------------------------------------------------------
// Database rows (snake_case, 1:1 with 0005_rtings_pipeline.sql)
// ---------------------------------------------------------------------------

export interface RtingsSyncRunRow {
  id: number;
  started_at: string;
  finished_at: string | null; // legacy, kept in sync with completed_at
  status: SyncRunStatus;
  trigger_source: SyncTriggerSource | null;
  trigger: SyncTrigger | null;
  actor_id: string | null;
  actor_input: Record<string, unknown> | null;
  apify_run_id: string | null;
  dataset_id: string | null;
  apify_status: string | null;
  coverage: SyncCoverage | null;
  records_received: number | null;
  records_valid: number | null;
  records_rejected: number | null;
  records_created: number | null;
  records_updated: number | null;
  records_unchanged: number | null;
  records_failed: number | null;
  records_pending: number | null;
  records_new_candidate: number | null;
  records_source_missing: number | null;
  records_published: number | null;
  safety_flags: SafetyFlag[];
  error_summary: SyncErrorEntry[] | null;
  error_message: string | null; // legacy one-line summary
  estimated_cost_usd: number | null;
  completed_at: string | null;
}

export interface RtingsReviewRow {
  id: number;
  mattress_id: string | null;
  source: typeof RTINGS_SOURCE;
  source_type: typeof RTINGS_SOURCE_TYPE;
  brand: string;
  model: string;
  product_name: string;
  brand_key: string;
  model_key: string;
  brand_slug: string | null;
  model_slug: string | null;
  product_id: string;
  review_url: string;
  product_url: string | null;
  category: string | null;
  record_type: string | null;
  test_bench_name: string | null;
  test_bench_id: string | null;
  overall_score: number | null;
  verdict: string | null;
  pros: string[] | null;
  cons: string[] | null;
  mixed_summary: string | null;
  recommended_for: string[];
  published_at: string | null;
  source_updated_at: string | null;
  retrieved_at: string;
  apify_actor_id: string;
  apify_run_id: string | null;
  dataset_id: string | null;
  sync_run_id: number | null;
  fingerprint: string;
  fingerprint_version: number;
  status: ReviewStatus;
  status_reason: string | null;
  match_method: MatchMethod | null;
  match_confidence: MatchConfidence | null;
  match_candidates: string[] | null;
  resolution_note: string | null;
  first_seen_at: string;
  last_seen_at: string;
  site_published_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface RtingsScoreRow {
  id: number;
  review_id: number;
  metric_key: string;
  metric_label: string;
  raw_value: string | null;
  value: number | null;
  scale: string | null;
  value_kind: ScoreValueKind;
  source: typeof RTINGS_SOURCE;
  retrieved_at: string;
  apify_run_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface RtingsRawRecordRow {
  id: number;
  sync_run_id: number;
  item_index: number;
  apify_actor_id: string;
  apify_run_id: string | null;
  dataset_id: string | null;
  product_id: string | null;
  review_url: string | null;
  payload: unknown;
  payload_sha256: string;
  validation_status: 'valid' | 'rejected';
  validation_problems: string[];
  received_at: string;
}

export const IMAGE_USAGE_STATUSES = ['source_only', 'licensed'] as const;
/** source_only = reference kept for provenance, never displayed; licensed = displayable, needs license_note. */
export type ImageUsageStatus = (typeof IMAGE_USAGE_STATUSES)[number];

export interface RtingsImageRow {
  id: number;
  review_id: number;
  source: typeof RTINGS_SOURCE;
  source_url: string;
  image_url: string;
  source_field: string;
  alt: string | null;
  scraped_at: string;
  usage_status: ImageUsageStatus;
  license_note: string | null;
  created_at: string;
  updated_at: string;
}

export interface RtingsChangeLogRow {
  id: number;
  review_id: number;
  old_fingerprint: string;
  new_fingerprint: string;
  changed_fields: string[];
  old_values: Record<string, unknown>;
  new_values: Record<string, unknown>;
  detected_at: string;
  apify_run_id: string | null;
  sync_run_id: number | null;
  outcome: 'published' | 'held' | 'recorded';
}

// ---------------------------------------------------------------------------
// Write shapes (what the pipeline hands the repository)
// ---------------------------------------------------------------------------

export type ReviewWrite = Omit<RtingsReviewRow, 'id' | 'created_at' | 'updated_at' | 'first_seen_at'> & {
  /** Set only on insert; the repository keeps the original on update. */
  first_seen_at?: string;
};
export type ScoreWrite = Omit<RtingsScoreRow, 'id' | 'review_id' | 'created_at' | 'updated_at'>;
export type ImageWrite = Omit<RtingsImageRow, 'id' | 'review_id' | 'created_at' | 'updated_at' | 'usage_status' | 'license_note'>;
export type RawRecordWrite = Omit<RtingsRawRecordRow, 'id' | 'received_at'>;

export interface StartRunInput {
  trigger: SyncTrigger;
  triggerSource: SyncTriggerSource;
  actorId: string;
  /** The actor input sent (never contains the token). */
  actorInput: Record<string, unknown>;
}

export type FinishRunPatch = Partial<
  Omit<RtingsSyncRunRow, 'id' | 'started_at' | 'trigger' | 'trigger_source' | 'actor_id' | 'actor_input'>
> & { status: Exclude<SyncRunStatus, 'running'> };

export type StartRunResult = { ok: true; run: RtingsSyncRunRow } | { ok: false; reason: 'already_running' };

/** A stored review plus its child rows, as the pipeline and the site read it. */
export interface StoredReview {
  review: RtingsReviewRow;
  scores: RtingsScoreRow[];
  images: RtingsImageRow[];
}

// ---------------------------------------------------------------------------
// Repository
// ---------------------------------------------------------------------------

export type RepositoryKind = 'supabase' | 'file' | 'memory';

/**
 * Persistence boundary for the pipeline and the site. Implementations live
 * in lib/rtings/repository.ts:
 *   - SupabaseRtingsRepository  production (SUPABASE_URL + SUPABASE_SECRET_KEY)
 *   - FileRtingsRepository      local CLI only (repo-root data/rtings/); refuses
 *                               to write when process.env.VERCEL is set
 *   - InMemoryRtingsRepository  tests and dev
 * Every method throws RtingsRepositoryError on a storage failure; callers
 * never receive partial writes silently.
 */
export interface RtingsRepository {
  readonly kind: RepositoryKind;

  // Runs ------------------------------------------------------------------
  /** Marks 'running' rows older than the threshold as failed (crash recovery). Returns how many. */
  failStaleRuns(olderThanMinutes: number, now: Date): Promise<number>;
  /** Atomic lock: ok:false when another run holds status='running'. */
  startRun(input: StartRunInput): Promise<StartRunResult>;
  finishRun(syncRunId: number, patch: FinishRunPatch): Promise<RtingsSyncRunRow>;
  getRun(syncRunId: number): Promise<RtingsSyncRunRow | null>;
  listRecentRuns(limit: number): Promise<RtingsSyncRunRow[]>;
  getLastSuccessfulRun(): Promise<RtingsSyncRunRow | null>;
  /** Latest run left in 'awaiting_apify', to resume without paying for a new scrape. */
  getAwaitingApifyRun(): Promise<RtingsSyncRunRow | null>;

  // Raw (append-only) -----------------------------------------------------
  appendRawRecords(rows: RawRecordWrite[]): Promise<void>;

  // Reviews ---------------------------------------------------------------
  /** Existing reviews whose product_id OR review_url is in the given sets. */
  findReviewsByIdentity(keys: { productIds: string[]; reviewUrls: string[] }): Promise<StoredReview[]>;
  listReviews(filter: { statuses?: ReviewStatus[]; mattressId?: string }): Promise<RtingsReviewRow[]>;
  countReviews(filter: { statuses?: ReviewStatus[] }): Promise<number>;
  /** Insert or update by product_id (falling back to review_url). Returns the stored row. */
  upsertReview(write: ReviewWrite): Promise<RtingsReviewRow>;
  /** Upserts by metric_key and removes metrics no longer returned (their old values are already in the change log). */
  replaceScores(reviewId: number, scores: ScoreWrite[]): Promise<RtingsScoreRow[]>;
  /** Upserts by image_url; never changes usage_status/license_note of an existing image. */
  upsertImages(reviewId: number, images: ImageWrite[]): Promise<RtingsImageRow[]>;
  setReviewStatus(reviewIds: number[], status: ReviewStatus, reason: string | null): Promise<void>;
  appendChangeLog(entries: ChangeLogEntry[]): Promise<void>;

  // Site reads ------------------------------------------------------------
  /** Published review(s) for one catalog mattress with scores and images. Never calls Apify. */
  getPublishedForMattress(mattressId: string): Promise<StoredReview[]>;
}

export class RtingsRepositoryError extends Error {
  readonly operation: string;
  readonly retryable: boolean;
  constructor(operation: string, message: string, retryable: boolean) {
    super(`${operation}: ${message}`);
    this.name = 'RtingsRepositoryError';
    this.operation = operation;
    this.retryable = retryable;
  }
}

// ---------------------------------------------------------------------------
// Site read model (lib/rtings/evidence.ts)
// ---------------------------------------------------------------------------

export interface EvidenceMetric {
  key: string;
  label: string;
  /** Verbatim RTINGS text; the UI shows this, not a reformatted number. */
  rawValue: string | null;
  value: number | null;
  scale: string | null;
  kind: ScoreValueKind;
}

/**
 * What a product page receives. Only status='published' rows reach this
 * shape; metrics RTINGS did not return are absent (never zero); images are
 * included only when usage_status = 'licensed'; `photo` is the credited RTINGS product photo.
 */
export interface RtingsEvidence {
  mattressId: string;
  source: typeof RTINGS_SOURCE;
  sourceType: typeof RTINGS_SOURCE_TYPE;
  reviewUrl: string;
  productName: string;
  overallScore: number | null;
  verdict: string | null;
  pros: string[] | null;
  cons: string[] | null;
  mixedSummary: string | null;
  recommendedFor: string[];
  metrics: EvidenceMetric[];
  licensedImages: { imageUrl: string; alt: string | null; licenseNote: string }[];
  /** Credited RTINGS product photo for this mattress (see lib/rtings/photo.ts), or null. */
  photo: import('./photo').EntryPhoto | null;
  /** RTINGS dates (label "Published/updated by RTINGS") ... */
  publishedAt: string | null;
  sourceUpdatedAt: string | null;
  /** ... kept apart from our retrieval date (label "Data retrieved"). */
  retrievedAt: string;
  testBenchName: string | null;
  provenance: { apifyActorId: string; apifyRunId: string | null; datasetId: string | null };
}
