/**
 * Deterministic fingerprint of the RTINGS evidence for one review (brief
 * section 15): SHA-256 over canonical JSON of identity + scores + review
 * text + dates + images + source URL. Keys are sorted at every level, scores
 * sorted by metric key, images and recommendedFor sorted, so formatting or
 * ordering noise never looks like a change. Retrieval times, comment counts
 * and run ids are excluded on purpose: a re-scrape of unchanged evidence
 * must produce the same fingerprint.
 */

import { createHash } from 'node:crypto';
import { FINGERPRINT_VERSION } from './types';
import type { FingerprintInput, NormalizedReview } from './types';

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(value as Record<string, unknown>).sort()) {
      const v = (value as Record<string, unknown>)[key];
      if (v !== undefined) out[key] = canonicalize(v);
    }
    return out;
  }
  if (typeof value === 'number' && !Number.isFinite(value)) return null;
  return value;
}

/** JSON with object keys sorted recursively (array order preserved). */
export function canonicalJson(value: unknown): string {
  return JSON.stringify(canonicalize(value));
}

export function sha256Hex(text: string): string {
  return createHash('sha256').update(text, 'utf8').digest('hex');
}

const byString = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

export function fingerprintInputOf(review: NormalizedReview): FingerprintInput {
  return {
    v: FINGERPRINT_VERSION,
    productId: review.productId,
    reviewUrl: review.reviewUrl,
    brand: review.brand,
    productName: review.productName,
    overallScore: review.overallScore,
    verdict: review.verdict,
    pros: review.pros ? [...review.pros] : null,
    cons: review.cons ? [...review.cons] : null,
    mixedSummary: review.mixedSummary,
    recommendedFor: [...review.recommendedFor].sort(byString),
    publishedAt: review.publishedAt,
    sourceUpdatedAt: review.sourceUpdatedAt,
    scores: [...review.scores]
      .sort((a, b) => byString(a.metricKey, b.metricKey))
      .map((s) => ({ metricKey: s.metricKey, rawValue: s.rawValue, value: s.value })),
    images: review.images.map((img) => img.imageUrl).sort(byString),
  };
}

/** 64 lowercase hex characters. */
export function computeFingerprint(review: NormalizedReview): string {
  return sha256Hex(canonicalJson(fingerprintInputOf(review)));
}
