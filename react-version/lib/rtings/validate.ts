/**
 * Validation for one raw RTINGS actor item (brief section 13).
 *
 * Pure functions, no I/O. Fatal problems reject the record (it never reaches
 * rtings_reviews; its raw payload is still kept in rtings_raw_records with
 * validation_status = 'rejected'). Non-fatal problems drop only the bad field,
 * which then normalizes to null - a broken value is never repaired or guessed.
 *
 * Erasable TypeScript only, extension-less relative imports: the repo-root CLI
 * loads this through Node's type stripping (scripts/lib/app-modules.js).
 */

import { RTINGS_IMAGE_HOSTS, RTINGS_REVIEW_HOSTS } from './types';
import type { RawRtingsRecord, ValidatedRawRecord, ValidationProblem, ValidationProblemCode, ValidationResult } from './types';
import { normalizeText } from '../apify/rtingsIdentity';

/** Earliest date a mattress review date may carry (RTINGS mattress reviews start well after this). */
export const MIN_SOURCE_DATE = '2010-01-01T00:00:00.000Z';
/** A source date may be at most this far ahead of "now" (clock skew / time zones). */
export const MAX_FUTURE_SKEW_MS = 24 * 60 * 60 * 1000;

const IMAGE_EXTENSION_RE = /\.(jpe?g|png|webp|gif|avif)$/i;
const MAX_IDENTITY_LENGTH = 300;

function problem(code: ValidationProblemCode, field: string, message: string, fatal: boolean): ValidationProblem {
  return { code, field, message, fatal };
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function nonEmptyTrimmed(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const t = v.trim();
  return t.length > 0 ? t : null;
}

function parseHttpsUrl(url: unknown): URL | null {
  if (typeof url !== 'string' || url.trim() === '') return null;
  let parsed: URL;
  try {
    parsed = new URL(url.trim());
  } catch {
    return null;
  }
  if (parsed.protocol !== 'https:') return null;
  if (parsed.username || parsed.password || parsed.port) return null;
  return parsed;
}

function canonicalRtingsUrl(url: unknown, requireMattressPath: boolean): string | null {
  const parsed = parseHttpsUrl(url);
  if (!parsed) return null;
  const host = parsed.hostname.toLowerCase();
  if (!(RTINGS_REVIEW_HOSTS as readonly string[]).includes(host)) return null;
  let pathname = parsed.pathname.replace(/\/{2,}/g, '/');
  if (pathname.length > 1) pathname = pathname.replace(/\/+$/, '');
  if (requireMattressPath && !/^\/mattress\/./i.test(pathname)) return null;
  if (pathname === '' || pathname === '/') return null;
  return `https://${host}${pathname}`;
}

/**
 * Canonical RTINGS mattress review URL: https, host www.rtings.com, a path
 * under /mattress/, no query, no hash, no trailing slash. Null for anything
 * else (http, other hosts, credentials, ports, non-mattress paths).
 */
export function canonicalReviewUrl(url: unknown): string | null {
  return canonicalRtingsUrl(url, true);
}

/** Like canonicalReviewUrl but any www.rtings.com path is accepted (productUrl). */
export function canonicalRtingsPageUrl(url: unknown): string | null {
  return canonicalRtingsUrl(url, false);
}

/** https, an RTINGS image host (i.rtings.com) and an image file extension. */
export function isRtingsImageUrl(url: unknown): boolean {
  const parsed = parseHttpsUrl(url);
  if (!parsed) return false;
  if (!(RTINGS_IMAGE_HOSTS as readonly string[]).includes(parsed.hostname.toLowerCase())) return false;
  return IMAGE_EXTENSION_RE.test(parsed.pathname);
}

const SOURCE_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2})(?:\.(\d+))?)?)?\s*(Z|[+-]\d{2}:?\d{2})?$/i;

/**
 * Parses an actor date ("2026-01-30 12:38:27 -0500", ISO 8601 with or without
 * fractional seconds, or a plain YYYY-MM-DD) into an ISO string. A date
 * without an offset is read as UTC. Returns null for anything unparseable,
 * impossible (2026-02-30), before 2010-01-01, or more than one day after now.
 */
export function parseSourceDate(v: unknown, now: Date = new Date()): string | null {
  if (typeof v !== 'string') return null;
  const m = SOURCE_DATE_RE.exec(v.trim());
  if (!m) return null;
  const [, y, mo, d, hh = '00', mi = '00', ss = '00', frac = '', tzRaw] = m;
  const year = Number(y);
  const month = Number(mo);
  const day = Number(d);
  const hour = Number(hh);
  const minute = Number(mi);
  const second = Number(ss);
  if (month < 1 || month > 12 || day < 1 || hour > 23 || minute > 59 || second > 59) return null;
  const probe = new Date(Date.UTC(year, month - 1, day));
  if (probe.getUTCFullYear() !== year || probe.getUTCMonth() !== month - 1 || probe.getUTCDate() !== day) return null;

  let offset = 'Z';
  if (tzRaw && tzRaw.toUpperCase() !== 'Z') {
    const digits = tzRaw.replace(':', '');
    const oh = Number(digits.slice(1, 3));
    const om = Number(digits.slice(3, 5));
    if (oh > 14 || om > 59) return null;
    offset = `${digits.slice(0, 3)}:${digits.slice(3, 5)}`;
  }
  const ms = (frac + '000').slice(0, 3);
  const iso = `${y}-${mo}-${d}T${hh}:${mi}:${ss}.${ms}${offset}`;
  const time = Date.parse(iso);
  if (!Number.isFinite(time)) return null;
  if (time < Date.parse(MIN_SOURCE_DATE)) return null;
  if (time > now.getTime() + MAX_FUTURE_SKEW_MS) return null;
  return new Date(time).toISOString();
}

/**
 * Model name with the brand prefix removed, word by word, comparing
 * normalized tokens so "Tuft and Needle Mint" / brand "Tuft & Needle" works.
 * "Allswell Hybrid" + "Allswell" -> "Hybrid". When the name does not start
 * with the brand, the whole name is the model. Returns '' when nothing is left.
 */
export function modelFromName(name: string, brand: string): string {
  const brandTokens = normalizeText(brand);
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (brandTokens.length === 0) return words.join(' ');
  let consumed = 0;
  let wordIndex = 0;
  while (wordIndex < words.length && consumed < brandTokens.length) {
    const wordTokens = normalizeText(words[wordIndex]);
    if (wordTokens.length === 0) {
      wordIndex += 1;
      continue;
    }
    for (const token of wordTokens) {
      if (token !== brandTokens[consumed]) return words.join(' ');
      consumed += 1;
    }
    wordIndex += 1;
  }
  if (consumed < brandTokens.length) return words.join(' ');
  return words.slice(wordIndex).join(' ').trim();
}

function identityString(raw: Record<string, unknown>, field: 'productId' | 'name' | 'brand'): string | null {
  const v = raw[field];
  if (field === 'productId' && typeof v === 'number' && Number.isInteger(v) && v >= 0) return String(v);
  const s = nonEmptyTrimmed(v);
  if (s === null || s.length > MAX_IDENTITY_LENGTH) return null;
  return s;
}

const MISSING_CODE = { productId: 'MISSING_PRODUCT_ID', name: 'MISSING_NAME', brand: 'MISSING_BRAND' } as const;

/**
 * Validates one dataset item. On success the returned record is a copy with
 * trimmed identity fields, a canonical reviewUrl, and every field that failed
 * a non-fatal check set to null. The input is never mutated.
 */
export function validateRawRecord(input: unknown, now: Date = new Date()): ValidationResult {
  if (!isPlainObject(input)) {
    return { ok: false, problems: [problem('NOT_AN_OBJECT', '(record)', 'Dataset item is not a JSON object.', true)] };
  }
  const raw = input as RawRtingsRecord;
  const problems: ValidationProblem[] = [];
  const record: Record<string, unknown> = { ...raw };

  // Identity ----------------------------------------------------------------
  const identity: Partial<Record<'productId' | 'name' | 'brand', string>> = {};
  for (const field of ['productId', 'name', 'brand'] as const) {
    const value = identityString(raw, field);
    if (value === null) problems.push(problem(MISSING_CODE[field], field, `${field} is missing, empty, or not a string.`, true));
    else identity[field] = value;
  }
  if (identity.name && identity.brand && modelFromName(identity.name, identity.brand) === '') {
    problems.push(problem('MISSING_MODEL', 'name', 'Product name contains only the brand; no model is left.', true));
  }

  const reviewUrl = canonicalReviewUrl(raw.reviewUrl);
  if (reviewUrl === null) {
    problems.push(problem('INVALID_REVIEW_URL', 'reviewUrl', 'reviewUrl is not an https://www.rtings.com/mattress/ URL.', true));
  }

  if (raw.category != null) {
    if (typeof raw.category !== 'string') {
      problems.push(problem('MALFORMED_FIELD', 'category', 'category is not a string.', false));
      record.category = null;
    } else if (raw.category.trim().toLowerCase() !== 'mattress') {
      problems.push(problem('WRONG_CATEGORY', 'category', `category is "${raw.category.slice(0, 60)}", not "mattress".`, true));
    }
  }

  // URLs --------------------------------------------------------------------
  if (raw.productUrl != null) {
    const productUrl = canonicalRtingsPageUrl(raw.productUrl);
    if (productUrl === null) {
      problems.push(problem('INVALID_PRODUCT_URL', 'productUrl', 'productUrl is not an https://www.rtings.com/ URL; dropped.', false));
      record.productUrl = null;
    } else {
      record.productUrl = productUrl;
    }
  }
  if (raw.mainImageUrl != null) {
    if (!isRtingsImageUrl(raw.mainImageUrl)) {
      problems.push(problem('INVALID_IMAGE_URL', 'mainImageUrl', 'mainImageUrl is not an https RTINGS image URL; dropped.', false));
      record.mainImageUrl = null;
    }
  }

  // Dates -------------------------------------------------------------------
  for (const field of ['publishedAt', 'firstPublishedAt', 'scrapedAt'] as const) {
    const v = raw[field];
    if (v == null) continue;
    if (parseSourceDate(v, now) === null) {
      problems.push(problem('INVALID_DATE', field, `${field} is unparseable, before 2010, or in the future; dropped.`, false));
      record[field] = null;
    }
  }
  if (raw.publishedYear != null) {
    const year = raw.publishedYear;
    const maxYear = now.getUTCFullYear() + 1;
    if (typeof year !== 'number' || !Number.isInteger(year) || year < 2010 || year > maxYear) {
      problems.push(problem('MALFORMED_FIELD', 'publishedYear', 'publishedYear is not a plausible year; dropped.', false));
      record.publishedYear = null;
    }
  }

  // Scalar strings ----------------------------------------------------------
  for (const field of ['brandSlug', 'modelSlug', 'recordType'] as const) {
    const v = raw[field];
    if (v != null && typeof v !== 'string') {
      problems.push(problem('MALFORMED_FIELD', field, `${field} is not a string; dropped.`, false));
      record[field] = null;
    }
  }
  for (const field of ['testBenchName', 'testBenchId'] as const) {
    const v = raw[field];
    if (v != null && typeof v !== 'string' && !(typeof v === 'number' && Number.isFinite(v))) {
      problems.push(problem('MALFORMED_FIELD', field, `${field} is not a string or number; dropped.`, false));
      record[field] = null;
    }
  }

  // Scores ------------------------------------------------------------------
  if (raw.testScoresFlat != null) {
    if (!isPlainObject(raw.testScoresFlat)) {
      problems.push(problem('MALFORMED_FIELD', 'testScoresFlat', 'testScoresFlat is not an object; dropped.', false));
      record.testScoresFlat = null;
    } else {
      const kept: Record<string, unknown> = {};
      for (const [label, value] of Object.entries(raw.testScoresFlat)) {
        if (value == null || typeof value === 'string' || typeof value === 'boolean') {
          kept[label] = value;
        } else if (typeof value === 'number' && Number.isFinite(value) && value >= 0) {
          kept[label] = value;
        } else {
          problems.push(problem('INVALID_SCORE', `testScoresFlat.${label}`, 'Score is NaN, negative, infinite, or not a scalar; dropped.', false));
        }
      }
      record.testScoresFlat = kept;
    }
  }
  if (raw.featuredTests != null) {
    if (!Array.isArray(raw.featuredTests)) {
      problems.push(problem('MALFORMED_FIELD', 'featuredTests', 'featuredTests is not an array; dropped.', false));
      record.featuredTests = null;
    } else {
      const kept: unknown[] = [];
      raw.featuredTests.forEach((test, i) => {
        if (!isPlainObject(test) || typeof test.name !== 'string') {
          problems.push(problem('MALFORMED_FIELD', `featuredTests[${i}]`, 'featuredTests entry has no string name; dropped.', false));
          return;
        }
        const score = test.score;
        if (score != null && !(typeof score === 'number' && Number.isFinite(score) && score >= 0 && score <= 10)) {
          problems.push(problem('INVALID_SCORE', `featuredTests[${i}].score`, 'featuredTests score is not a number between 0 and 10; score dropped.', false));
          kept.push({ ...test, score: null });
          return;
        }
        kept.push(test);
      });
      record.featuredTests = kept;
    }
  }

  if (raw.recommendedFor != null) {
    if (!Array.isArray(raw.recommendedFor)) {
      problems.push(problem('MALFORMED_FIELD', 'recommendedFor', 'recommendedFor is not an array; dropped.', false));
      record.recommendedFor = null;
    } else if (raw.recommendedFor.some((tag) => typeof tag !== 'string')) {
      problems.push(problem('MALFORMED_FIELD', 'recommendedFor', 'recommendedFor has non-string entries; those were dropped.', false));
      record.recommendedFor = raw.recommendedFor.filter((tag) => typeof tag === 'string');
    }
  }

  // Documented editorial fields (RTINGS_RAW_DOCUMENTED_OPTIONAL_FIELDS) -------
  // Kept only when correctly typed; anything else is dropped (null), never coerced.
  if (raw.overallScore != null) {
    const v = raw.overallScore;
    if (!(typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 10)) {
      problems.push(problem('MALFORMED_FIELD', 'overallScore', 'overallScore is not a number between 0 and 10; dropped.', false));
      record.overallScore = null;
    }
  }
  if (raw.verdict != null && typeof raw.verdict !== 'string') {
    problems.push(problem('MALFORMED_FIELD', 'verdict', 'verdict is not a string; dropped.', false));
    record.verdict = null;
  }
  for (const field of ['pros', 'cons'] as const) {
    const v = raw[field];
    if (v != null && !(Array.isArray(v) && v.every((entry) => typeof entry === 'string'))) {
      problems.push(problem('MALFORMED_FIELD', field, `${field} is not an array of strings; dropped.`, false));
      record[field] = null;
    }
  }

  if (problems.some((p) => p.fatal)) return { ok: false, problems };

  record.productId = identity.productId;
  record.name = identity.name;
  record.brand = identity.brand;
  record.reviewUrl = reviewUrl;
  return { ok: true, record: record as ValidatedRawRecord, warnings: problems };
}
