/**
 * Curated head-to-head pages: /compare/<a>-vs-<b>.
 *
 * This is the ONLY place a pair page can come from. There is no mass
 * generation: a pair exists because it answers a real shopping question and
 * passes the gate in lib/comparePairs.test.ts:
 *   - both ids exist in the catalog,
 *   - each mattress has at least MIN_MEASURED_DIMENSIONS independent ratings,
 *   - at least one engine sub-score differs by MIN_SUBSCORE_DELTA (1.0 on the
 *     engine's 0-10 scale, shown as 10 points out of 100) for some reference
 *     sleeper. A pair that stops passing is removed, not padded.
 *
 * Nothing here is a score, a ranking or a product claim. `angle` frames the
 * question in words that the test checks against the catalog (type, brand,
 * price, firmness); every number on a pair page comes from the catalog or
 * from matchProfile() at render time.
 *
 * Pure data + helpers: safe in server and client components and in tests.
 */

import { PAIR_DEFS } from './comparePairs.data.mts';
import type { FirmnessLabel, MattressEntry, SleepPosition, SleepProfile, VsPage } from './types';

/**
 * A demo profile for matchProfile(): a reference sleeper (or a pair's
 * spotlight sleeper). The reference sleeper states no firmness preference,
 * so `preferredFirmnessLabel` is optional; a spotlight sleeper may set one.
 */
export type PairProfile = Omit<SleepProfile, 'painFocus' | 'preferredFirmnessLabel'> & { preferredFirmnessLabel?: FirmnessLabel };

export interface PairPosition {
  id: SleepPosition;
  label: string;
}

/** A catalog rating field (out of 10) that counts as an independent measurement. */
export type RatingField = 'coolingRatingOutOf10' | 'motionIsolationRatingOutOf10' | 'edgeSupportRatingOutOf10' | 'durabilityRatingOutOf10';

export interface RatingFieldDef {
  field: RatingField;
  dimension: 'heat' | 'motion' | 'edge' | 'durability';
  label: string;
}

/**
 * The reference sleeper every pair is scored for (only the position changes).
 * Disclosed on the page. It is the SAME sleeper as the product, category and
 * brand pages (components/product/referenceScores REFERENCE_BASE): 160 lb,
 * neutral temperature, sleeps alone, no stated firmness preference - so a
 * mattress shows one reference score per position everywhere on the site
 * (guarded by lib/comparePairs.test.ts).
 */
export const PAIR_REFERENCE_PROFILE: Readonly<Omit<PairProfile, 'sleepPosition'>> = Object.freeze({
  weightLb: 160,
  sleepTemperature: 'neutral',
  motionSensitivity: 'single',
});

export const PAIR_POSITIONS: readonly PairPosition[] = Object.freeze([
  { id: 'side', label: 'Side sleeper' },
  { id: 'back', label: 'Back sleeper' },
  { id: 'stomach', label: 'Stomach sleeper' },
  { id: 'combination', label: 'Combination sleeper' },
]);

export const MIN_MEASURED_DIMENSIONS = 3;
export const MIN_SUBSCORE_DELTA = 1.0;

/** Independent rating fields (out of 10) a pair needs at least MIN_MEASURED_DIMENSIONS of. */
export const RATING_FIELDS: readonly RatingFieldDef[] = Object.freeze([
  { field: 'coolingRatingOutOf10', dimension: 'heat', label: 'Cooling' },
  { field: 'motionIsolationRatingOutOf10', dimension: 'motion', label: 'Motion isolation' },
  { field: 'edgeSupportRatingOutOf10', dimension: 'edge', label: 'Edge support' },
  { field: 'durabilityRatingOutOf10', dimension: 'durability', label: 'Durability' },
]);

export const pairSlug = (a: string, b: string): string => `${a}-vs-${b}`;

/** [{ slug, title, a, b, href, short, angle, claims, spotlight, guides }] - read by search, sitemap, nav tests. */
export const COMPARE_PAIRS: readonly VsPage[] = Object.freeze(
  PAIR_DEFS.map((p): VsPage => Object.freeze({ ...p, slug: pairSlug(p.a, p.b), href: `/compare/${pairSlug(p.a, p.b)}` }))
);

/** Alias used by nav/sitemap/search callers. */
export const VS_PAGES = COMPARE_PAIRS;

export const PAIR_SLUGS: string[] = COMPARE_PAIRS.map((p) => p.slug);

const BY_SLUG = new Map(COMPARE_PAIRS.map((p) => [p.slug, p]));
const BY_REVERSED = new Map(COMPARE_PAIRS.map((p) => [pairSlug(p.b, p.a), p]));

/** The pair for a canonical slug, or null. */
export function getPair(slug: string): VsPage | null {
  return BY_SLUG.get(slug) || null;
}

/** For a slug in the wrong order ("b-vs-a"), the canonical pair (so the page can redirect); else null. */
export function getReversedPair(slug: string): VsPage | null {
  return BY_REVERSED.get(slug) || null;
}

export function isPairSlug(slug: string): boolean {
  return BY_SLUG.has(slug) || BY_REVERSED.has(slug);
}

/** Pairs that include a mattress id (for a "Compared with" module on /mattress/[id]). */
export function pairsFor(id: string): VsPage[] {
  return COMPARE_PAIRS.filter((p) => p.a === id || p.b === id);
}

/** Pairs where both mattresses are from one brand ("Inside the lineup" on /brands/[brand]). */
export function pairsForBrand(entries: readonly Pick<MattressEntry, 'id' | 'brand'>[] | null | undefined, brand: string | null | undefined): VsPage[] {
  if (!brand || !Array.isArray(entries)) return [];
  const brandOf = new Map(entries.map((e) => [e.id, e.brand]));
  const want = String(brand).toLowerCase();
  return COMPARE_PAIRS.filter((p) => String(brandOf.get(p.a) || '').toLowerCase() === want && String(brandOf.get(p.b) || '').toLowerCase() === want);
}

/** How many independent ratings (out of 10) a catalog entry has on file. */
export function measuredCount(entry: Partial<Pick<MattressEntry, RatingField>> | null | undefined): number {
  if (!entry) return 0;
  return RATING_FIELDS.filter(({ field }) => {
    const v = entry[field];
    return typeof v === 'number' && Number.isFinite(v);
  }).length;
}

/**
 * Up to `max` ids of one brand's best-documented models (most independent
 * ratings first, then id) - for "Compare the whole lineup". It never ranks by
 * score: it only prefers the records with the most measured data.
 */
export function lineupIdsForBrand(entries: readonly MattressEntry[] | null | undefined, brand: string | null | undefined, max = 3): string[] {
  const want = String(brand || '').toLowerCase();
  return (Array.isArray(entries) ? entries : [])
    .filter((e) => String(e.brand || '').toLowerCase() === want && measuredCount(e) > 0)
    .sort((x, y) => measuredCount(y) - measuredCount(x) || String(x.id).localeCompare(String(y.id)))
    .slice(0, max)
    .map((e) => e.id);
}

/** The full demo profile for a reference position, or for a pair's spotlight sleeper. */
export function referenceProfile(position: SleepPosition): PairProfile {
  return { ...PAIR_REFERENCE_PROFILE, sleepPosition: position };
}

export function spotlightProfile(pair: Pick<VsPage, 'spotlight'> | null | undefined): PairProfile | null {
  if (!pair || !pair.spotlight) return null;
  return { ...PAIR_REFERENCE_PROFILE, sleepPosition: 'combination', ...pair.spotlight.profile };
}
