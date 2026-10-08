/**
 * Normalization: one validated RTINGS item -> NormalizedReview (brief
 * sections 5-8). Pure, deterministic, no I/O.
 *
 * Built on fields the actor actually returned in a real run (see
 * RTINGS_RAW_KNOWN_FIELDS in ./types) plus the editorial fields it documents
 * (RTINGS_RAW_DOCUMENTED_OPTIONAL_FIELDS): overallScore, verdict, pros and
 * cons are mapped verbatim only when present and correctly typed (validate.ts
 * drops anything else), and stay null otherwise. No mattress run has returned
 * them yet. mixedSummary stays null: its field name is undocumented and is
 * never guessed. Nothing is derived, summarized or invented. A metric RTINGS
 * did not return produces no score row at all (never a 0).
 */

import { RTINGS_SOURCE, RTINGS_SOURCE_TYPE } from './types';
import type { NormalizeResult, NormalizedImage, NormalizedReview, NormalizedScore, ScoreValueKind, ValidatedRawRecord, ValidationProblem } from './types';
import { canonicalRtingsPageUrl, isRtingsImageUrl, modelFromName, parseSourceDate, validateRawRecord } from './validate';
import { normalizeText, tokensWithoutBrandAndFiller } from '../apify/rtingsIdentity';
import { realRecommendedFor } from './sectionTags';

export { modelFromName };

export interface NormalizeContext {
  apifyActorId: string;
  apifyRunId: string | null;
  datasetId: string | null;
  /** When this pipeline received the dataset (ISO). Used when scrapedAt is absent/invalid. */
  receivedAt: string;
  /** Reference "now" for date sanity checks; defaults to receivedAt. */
  now?: Date;
}

/** Deterministic brand key: "Tuft & Needle" -> "tuft-and-needle". */
export function toBrandKey(brand: string): string {
  return normalizeText(brand).join('-');
}

/**
 * Deterministic model key: the model's tokens without the brand and filler
 * words ("the", "mattress"), in order. "The Purple Mattress" falls back to
 * all of its tokens when nothing else is left, so the key is never empty
 * for a non-empty model.
 */
export function toModelKey(model: string, brand: string): string {
  const tokens = Array.from(tokensWithoutBrandAndFiller(model, brand));
  if (tokens.length > 0) return tokens.join('-');
  return normalizeText(model).join('-');
}

/** "Upper Comfort Foam @ Lumbar" -> "upper_comfort_foam_at_lumbar"; "Bed-In-A-Box" -> "bed_in_a_box". */
export function metricKeyFromLabel(label: string): string {
  return label
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/@/g, ' at ')
    .replace(/%/g, ' pct ')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

export type ParsedMetric =
  | { ok: true; rawValue: string; value: number | null; scale: string | null; valueKind: ScoreValueKind }
  | { ok: false; reason: string }
  | null;

const NUMBER_ONLY_RE = /^-?\d+(?:\.\d+)?$/;
const MEASUREMENT_RE = /\(\s*(-?\d+(?:\.\d+)?)\s*([A-Za-z%°µ][^()]*?)\s*\)\s*$/;

/**
 * Parses one RTINGS metric value.
 *   null / '' / whitespace          -> null (no row; missing is never 0)
 *   "Yes" / "No" / true / false     -> boolean 1 / 0
 *   "8.4" / 8.4 (0-10)              -> score_0_10, scale '0-10'
 *   "Medium-Firm (54 Pa/mm)"        -> measurement 54, scale 'Pa/mm'
 *   any other text                  -> label, value null
 * Numbers outside 0-10, NaN or negatives are invalid (ok: false).
 */
export function parseMetricValue(raw: unknown): ParsedMetric {
  if (raw == null) return null;
  if (typeof raw === 'boolean') {
    return { ok: true, rawValue: raw ? 'Yes' : 'No', value: raw ? 1 : 0, scale: null, valueKind: 'boolean' };
  }
  if (typeof raw === 'number') {
    if (!Number.isFinite(raw) || raw < 0 || raw > 10) return { ok: false, reason: `numeric score ${String(raw)} is outside 0-10` };
    return { ok: true, rawValue: String(raw), value: raw, scale: '0-10', valueKind: 'score_0_10' };
  }
  if (typeof raw !== 'string') return { ok: false, reason: 'value is not a string, number or boolean' };
  const text = raw.trim();
  if (text === '') return null;
  if (/^(yes|no)$/i.test(text)) {
    return { ok: true, rawValue: text, value: /^yes$/i.test(text) ? 1 : 0, scale: null, valueKind: 'boolean' };
  }
  if (NUMBER_ONLY_RE.test(text)) {
    const n = Number(text);
    if (!Number.isFinite(n) || n < 0 || n > 10) return { ok: false, reason: `numeric score "${text}" is outside 0-10` };
    return { ok: true, rawValue: text, value: n, scale: '0-10', valueKind: 'score_0_10' };
  }
  const m = MEASUREMENT_RE.exec(text);
  if (m) {
    const n = Number(m[1]);
    const unit = (m[2] ?? '').trim();
    if (!Number.isFinite(n) || n < 0) return { ok: false, reason: `measurement "${text}" is negative or not a number` };
    return { ok: true, rawValue: text, value: n, scale: unit, valueKind: 'measurement' };
  }
  return { ok: true, rawValue: text, value: null, scale: null, valueKind: 'label' };
}

function optionalString(v: unknown): string | null {
  if (typeof v === 'number' && Number.isFinite(v)) return String(v);
  if (typeof v !== 'string') return null;
  const t = v.trim();
  return t === '' ? null : t;
}

function warn(field: string, message: string, code: ValidationProblem['code'] = 'INVALID_SCORE'): ValidationProblem {
  return { code, field, message, fatal: false };
}

function collectScores(record: ValidatedRawRecord, warnings: ValidationProblem[]): NormalizedScore[] {
  const scores: NormalizedScore[] = [];
  const seen = new Set<string>();

  const add = (label: string, rawValue: unknown, field: string): void => {
    const metricLabel = label.trim();
    const metricKey = metricKeyFromLabel(metricLabel);
    if (metricKey === '') {
      warnings.push(warn(field, 'Metric label has no letters or digits; dropped.', 'MALFORMED_FIELD'));
      return;
    }
    if (seen.has(metricKey)) return; // first occurrence wins (testScoresFlat before featuredTests)
    const parsed = parseMetricValue(rawValue);
    if (parsed === null) return;
    if (!parsed.ok) {
      seen.add(metricKey); // an invalid testScoresFlat value is not replaced by the featuredTests copy
      warnings.push(warn(field, `${parsed.reason}; metric dropped.`));
      return;
    }
    seen.add(metricKey);
    scores.push({ metricKey, metricLabel, rawValue: parsed.rawValue, value: parsed.value, scale: parsed.scale, valueKind: parsed.valueKind });
  };

  const flat = record.testScoresFlat;
  if (flat && typeof flat === 'object' && !Array.isArray(flat)) {
    for (const [label, value] of Object.entries(flat as Record<string, unknown>)) add(label, value, `testScoresFlat.${label}`);
  }

  const featured = record.featuredTests;
  if (Array.isArray(featured)) {
    featured.forEach((test, i) => {
      if (!test || typeof test !== 'object') return;
      const { name, value, score } = test as { name?: unknown; value?: unknown; score?: unknown };
      if (typeof name !== 'string') return;
      // The value text duplicates testScoresFlat in every real item; add it only when the flat map lacks it.
      add(name, value, `featuredTests[${i}].value`);
      // score === 0 is the actor's placeholder (0 on every real item): never a rating.
      if (typeof score === 'number' && Number.isFinite(score) && score > 0 && score <= 10) {
        add(`${name} (score)`, score, `featuredTests[${i}].score`);
      }
    });
  }
  return scores;
}

function collectImages(record: ValidatedRawRecord, reviewUrl: string): NormalizedImage[] {
  const images: NormalizedImage[] = [];
  if (typeof record.mainImageUrl === 'string' && isRtingsImageUrl(record.mainImageUrl)) {
    images.push({ sourceUrl: reviewUrl, imageUrl: record.mainImageUrl.trim(), sourceField: 'mainImageUrl', alt: null });
  }
  return images;
}

/** Verbatim text (trimmed); null when absent, not a string, or blank. */
function optionalText(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const t = v.trim();
  return t === '' ? null : t;
}

/** Verbatim bullet list (trimmed, blanks and exact duplicates dropped, order kept); null when absent or empty. */
function optionalTextList(v: unknown): string[] | null {
  if (!Array.isArray(v)) return null;
  const out = collectTags(v);
  return out.length > 0 ? out : null;
}

function optionalOverallScore(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 10 ? v : null;
}

function collectTags(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  const out: string[] = [];
  for (const tag of v) {
    if (typeof tag !== 'string') continue;
    const t = tag.trim();
    if (t !== '' && !out.includes(t)) out.push(t);
  }
  return out;
}

/**
 * Normalizes an item that already passed validateRawRecord. It re-checks the
 * identity invariants so a hand-built record cannot slip through.
 */
export function normalizeRecord(validated: ValidatedRawRecord, ctx: NormalizeContext): NormalizeResult {
  const now = ctx.now ?? new Date(ctx.receivedAt);
  const check = validateRawRecord(validated, now);
  if (!check.ok) return { ok: false, problems: check.problems };
  const record = check.record;
  const warnings: ValidationProblem[] = [...check.warnings];

  const brand = record.brand;
  const productName = record.name;
  const model = modelFromName(productName, brand);
  const reviewUrl = record.reviewUrl;

  const firstPublished = parseSourceDate(record.firstPublishedAt, now);
  const lastPublished = parseSourceDate(record.publishedAt, now);
  const scraped = parseSourceDate(record.scrapedAt, now);

  const review: NormalizedReview = {
    productId: record.productId,
    brand,
    model,
    productName,
    brandKey: toBrandKey(brand),
    modelKey: toModelKey(model, brand),
    brandSlug: optionalString(record.brandSlug),
    modelSlug: optionalString(record.modelSlug),
    reviewUrl,
    productUrl: record.productUrl == null ? null : canonicalRtingsPageUrl(record.productUrl),
    category: optionalString(record.category)?.toLowerCase() ?? null,
    recordType: optionalString(record.recordType),
    testBenchName: optionalString(record.testBenchName),
    testBenchId: optionalString(record.testBenchId),
    // Documented by the actor; null unless returned with the right type (see module comment).
    overallScore: optionalOverallScore(record.overallScore),
    verdict: optionalText(record.verdict),
    pros: optionalTextList(record.pros),
    cons: optionalTextList(record.cons),
    mixedSummary: null,
    recommendedFor: realRecommendedFor(collectTags(record.recommendedFor)),
    publishedAt: firstPublished ?? lastPublished,
    sourceUpdatedAt: lastPublished,
    scores: collectScores(record, warnings),
    images: collectImages(record, reviewUrl),
    provenance: {
      source: RTINGS_SOURCE,
      sourceType: RTINGS_SOURCE_TYPE,
      sourceUrl: reviewUrl,
      apifyActorId: ctx.apifyActorId,
      apifyRunId: ctx.apifyRunId,
      datasetId: ctx.datasetId,
      retrievedAt: scraped ?? new Date(ctx.receivedAt).toISOString(),
    },
  };
  return { ok: true, review, warnings };
}
