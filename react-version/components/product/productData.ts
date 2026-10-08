import { displayTitle, formatUsd as formatUsdExact } from '@/lib/format';
import { firmnessFor as firmnessForEntry, firmnessRangeText, MATTRESS_TYPE_LABEL, type FirmnessInfo } from '@/lib/firmness';
import { getVerificationLevel, type IntegrityRecord } from '@/lib/dataIntegrity';
import { slugify } from '@/lib/searchIndex';
import { comparableQueenPriceUsd, priceAwaitingRecheck, queenPriceText } from '@/lib/commerce';
import type { Guide, MattressEntry, MattressType, VerificationLevel } from '@/lib/types';

/**
 * Pure, client-safe helpers shared by /mattresses, /mattress/[id] and
 * /brands. Everything here is derived from fields actually on the catalog
 * entry - nothing is estimated or filled in.
 */

/**
 * Any subset of a catalog entry, with any field possibly null: list pages
 * pass slimEntry() / listing objects, and every helper here checks the value
 * it reads before using it.
 */
export type EntryLike = { [K in keyof MattressEntry]?: MattressEntry[K] | null };

/** The fields displayTitle() reads. */
type Titled = Pick<MattressEntry, 'brand' | 'model'>;

export type RatingKey = 'cooling' | 'motion' | 'edge';
type RatingField = 'coolingRatingOutOf10' | 'motionIsolationRatingOutOf10' | 'edgeSupportRatingOutOf10';

export const RATING_FIELDS: Record<RatingKey, { field: RatingField; label: string; noun: string }> = {
  cooling: { field: 'coolingRatingOutOf10', label: 'Cooling', noun: 'cooling' },
  motion: { field: 'motionIsolationRatingOutOf10', label: 'Motion isolation', noun: 'motion isolation' },
  edge: { field: 'edgeSupportRatingOutOf10', label: 'Edge support', noun: 'edge support' },
};

const TYPE_LABEL: Readonly<Record<string, string | undefined>> = MATTRESS_TYPE_LABEL;

/** lib/firmness for any EntryLike (its firmnessRange may be missing or null). */
function firmnessFor(entry: EntryLike | null | undefined): FirmnessInfo | null {
  return firmnessForEntry({ firmnessRange: entry?.firmnessRange ?? null, firmnessSource: entry?.firmnessSource ?? null });
}

export function ratingOf(entry: EntryLike | null | undefined, key: RatingKey): number | null {
  const value = entry ? entry[RATING_FIELDS[key].field] : null;
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

export function formatRating(value: number): string {
  return `${Number.isInteger(value) ? value : value.toFixed(1)}/10`;
}

export function formatUsd(value: number | null | undefined): string {
  return formatUsdExact(value);
}

/**
 * True when a comparable Queen price is on file: published, in confirmed US
 * dollars and not flagged for a re-check (lib/commerce queenPriceOf). Price
 * buckets, sorts, ranges and leads all gate on this. Narrows priceUsd to number.
 * A provisional or currency-unconfirmed figure is still shown, qualified,
 * through queenPriceText().
 */
export function hasQueenPrice<T extends EntryLike>(entry: T | null | undefined): entry is T & { priceUsd: number } {
  return comparableQueenPriceUsd(entry) !== null;
}

export { queenPriceText };

export function brandSlug(brand: string): string {
  return slugify(brand);
}

export function brandHref(brand: string): string {
  return `/brands/${brandSlug(brand)}`;
}

export function mattressHref(entry: Pick<MattressEntry, 'id'>): string {
  return `/mattress/${encodeURIComponent(entry.id)}`;
}

export function typeLabel(entry: EntryLike | null | undefined): string {
  const type = entry?.type;
  return (type ? TYPE_LABEL[type] : undefined) || type || 'Mattress';
}

/** The client payload slimEntry() produces. */
export interface SlimEntry {
  id: string;
  brand: string;
  model: string;
  type: MattressType;
  firmnessRange: MattressEntry['firmnessRange'];
  heightIn: number | null;
  priceUsd: number | null;
  priceFromUsd: number | null;
  /** Carried so every surface reads the same price status (lib/commerce queenPriceOf). */
  priceCurrency: string | null;
  priceNeedsReverification: boolean;
  trialDays: number | null;
  warrantyYears: number | null;
  warrantyLifetime: boolean;
  coolingRatingOutOf10: number | null;
  motionIsolationRatingOutOf10: number | null;
  edgeSupportRatingOutOf10: number | null;
  sourceUrl: string | null;
  lastVerified: string | null;
  /** Verification bookkeeping getVerificationLevel() reads (lib/dataIntegrity sourceConfirmsRequiredFields). */
  verificationStatus?: string;
  verifiedFields?: string[];
  sponsored: boolean;
  /** Credited RTINGS photo (lib/rtings/photo), when this mattress has an eligible one. */
  photo: MattressEntry['photo'];
}

/**
 * The fields the catalog explorer and ProductCard need - keeps the client
 * payload small. Includes every field getVerificationLevel() reads, so the
 * badge is computed from the same facts as on the server.
 */
export function slimEntry(entry: MattressEntry): SlimEntry {
  return {
    id: entry.id,
    brand: entry.brand,
    model: entry.model,
    type: entry.type,
    firmnessRange: entry.firmnessRange || null,
    heightIn: entry.heightIn ?? null,
    // A figure flagged for a re-check is withheld (lib/commerce) and is not
    // shipped to the client either: it stays in the catalog data only.
    priceUsd: priceAwaitingRecheck(entry) ? null : entry.priceUsd ?? null,
    priceFromUsd: entry.priceFromUsd ?? null,
    priceCurrency: entry.priceCurrency ?? null,
    priceNeedsReverification: entry.priceNeedsReverification === true,
    trialDays: entry.trialDays ?? null,
    warrantyYears: entry.warrantyYears ?? null,
    warrantyLifetime: entry.warrantyLifetime === true,
    coolingRatingOutOf10: entry.coolingRatingOutOf10 ?? null,
    motionIsolationRatingOutOf10: entry.motionIsolationRatingOutOf10 ?? null,
    edgeSupportRatingOutOf10: entry.edgeSupportRatingOutOf10 ?? null,
    sourceUrl: entry.sourceUrl ?? null,
    lastVerified: entry.lastVerified ?? null,
    verificationStatus: entry.verificationStatus,
    verifiedFields: entry.verifiedFields,
    sponsored: entry.sponsored === true,
    photo: entry.photo ?? null,
  };
}

/** "6/10" or "5–7/10", with a proper en dash. */
export function firmnessText(entry: EntryLike | null | undefined): string | null {
  const text = firmnessRangeText({ firmnessRange: entry?.firmnessRange ?? null });
  return text ? text.replace('-', '–') : null;
}

/** Number of distinct firmness points a model is sold across (null when unknown). */
export function firmnessSpan(entry: EntryLike | null | undefined): number | null {
  const r = entry?.firmnessRange;
  if (!r || typeof r.min !== 'number' || typeof r.max !== 'number') return null;
  return r.max - r.min;
}

/**
 * The manufacturer's construction notes, split into the separate components
 * the catalog lists (semicolon separated, in the order recorded).
 */
export function materialsList(entry: EntryLike | null | undefined): string[] {
  const notes = entry?.coreMaterialNotes;
  if (typeof notes !== 'string' || !notes.trim()) return [];
  return notes
    .split(';')
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Warranty in words, or null when not on file. */
export function warrantyText(entry: EntryLike | null | undefined): string | null {
  if (entry?.warrantyLifetime === true) return 'Lifetime';
  if (typeof entry?.warrantyYears === 'number') return `${entry.warrantyYears} years`;
  return null;
}

/**
 * Where a firmness number came from, in reader words, when it is NOT a
 * number someone actually rated or stated (those return null and may be
 * called "rated"). Mirrors firmnessSourceLabel() on the head-to-head page.
 */
export function firmnessDerivation(source: unknown): string | null {
  const c = typeof source === 'string' ? source : '';
  if (c.startsWith('independent_numeric') || c.startsWith('stated_numeric')) return null;
  if (c.startsWith('label_mapped')) return "converted from the brand's own firmness label";
  if (c.startsWith('brand_')) return "converted from the brand's own firmness scale";
  return 'source of that number not yet verified';
}

/**
 * One factual positioning line for the hero, assembled from fields on file:
 * type, firmness and how many firmness options. No adjectives we can't back,
 * and a firmness number converted from a word label is never called a rating.
 */
export function positioningFor(entry: Pick<MattressEntry, 'brand'> & EntryLike): string {
  const firm = firmnessFor(entry);
  const type = typeLabel(entry).toLowerCase();
  const an = (word: string) => (/^[aeiou]/i.test(word) ? 'An' : 'A');
  if (!firm) return `${an(type)} ${type} mattress from ${entry.brand}. Its firmness isn't published yet.`;
  const derived = firmnessDerivation(entry.firmnessSource);
  if (firm.multi) {
    const tail = derived ? ` (${derived})` : '';
    return `${an(type)} ${type} mattress from ${entry.brand}, sold in firmness options spanning ${firmnessText(entry)}${tail}.`;
  }
  const feel = firm.label.toLowerCase();
  if (derived) return `${an(feel)} ${feel} ${type} mattress from ${entry.brand}: about ${firmnessText(entry)} for firmness, ${derived}.`;
  return `${an(feel)} ${feel} ${type} mattress from ${entry.brand}, rated ${firmnessText(entry)} for firmness.`;
}

export interface RatingOnFile {
  key: RatingKey;
  label: string;
  value: number;
}

/** Independent ratings on file, highest first. */
export function ratingsOnFile(entry: EntryLike | null | undefined): RatingOnFile[] {
  return (Object.keys(RATING_FIELDS) as RatingKey[])
    .map((key) => ({ key, label: RATING_FIELDS[key].label, value: ratingOf(entry, key) }))
    .filter((r): r is RatingOnFile => r.value !== null)
    .sort((a, b) => b.value - a.value);
}

/** Mattresses from other brands with the same type and the nearest firmness. */
export function similarFromOtherBrands<T extends MattressEntry>(entry: MattressEntry, entries: readonly T[], limit = 3): T[] {
  const target = firmnessFor(entry);
  return entries
    .filter((e) => e.id !== entry.id && e.brand !== entry.brand && e.type === entry.type)
    .map((e) => {
      const f = firmnessFor(e);
      const distance = target && f ? Math.abs(f.rating - target.rating) : 99;
      return { e, distance };
    })
    .sort((a, b) => a.distance - b.distance || displayTitle(a.e).localeCompare(displayTitle(b.e)))
    .slice(0, limit)
    .map((x) => x.e);
}

export interface BrandGroup<T> {
  slug: string;
  name: string;
  entries: T[];
}

/** Brand groups for /brands, alphabetical. */
export function groupByBrand<T extends Titled>(entries: readonly (T | null | undefined)[]): BrandGroup<T>[] {
  const map = new Map<string, T[]>();
  for (const entry of entries) {
    if (!entry?.brand) continue;
    const list = map.get(entry.brand) ?? [];
    if (!map.has(entry.brand)) map.set(entry.brand, list);
    list.push(entry);
  }
  return [...map.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([name, list]) => ({
      slug: brandSlug(name),
      name,
      entries: [...list].sort((a, b) => displayTitle(a).localeCompare(displayTitle(b))),
    }));
}

export interface LineupFacts {
  count: number;
  types: { type: string; label: string; count: number }[];
  pricedCount: number;
  priceMin: number | null;
  priceMax: number | null;
  levels: Record<VerificationLevel, number>;
  trialMin: number | null;
  trialMax: number | null;
}

/**
 * Real facts about a set of entries (one brand's lineup): counts by type,
 * Queen price range from published prices only, verification coverage.
 */
export function lineupFacts(entries: readonly IntegrityRecord[]): LineupFacts {
  const types = new Map<string, number>();
  for (const e of entries) if (e.type) types.set(e.type, (types.get(e.type) || 0) + 1);
  const prices = entries.filter((e) => hasQueenPrice(e)).map((e) => e.priceUsd as number);
  const levels: Record<VerificationLevel, number> = { verified: 0, partially_verified: 0, unverified: 0, unknown: 0 };
  for (const e of entries) levels[getVerificationLevel(e)] += 1;
  const trials = entries.map((e) => e.trialDays).filter((d): d is number => typeof d === 'number');
  return {
    count: entries.length,
    types: [...types.entries()].sort((a, b) => b[1] - a[1]).map(([type, count]) => ({ type, label: TYPE_LABEL[type] || type, count })),
    pricedCount: prices.length,
    priceMin: prices.length ? Math.min(...prices) : null,
    priceMax: prices.length ? Math.max(...prices) : null,
    levels,
    trialMin: trials.length ? Math.min(...trials) : null,
    trialMax: trials.length ? Math.max(...trials) : null,
  };
}

/** "4 all-foam and 1 hybrid" */
export function typeSummary(types: readonly { count: number; label: string }[]): string {
  const parts = types.map((t) => `${t.count} ${t.label.toLowerCase()}`);
  if (parts.length <= 1) return parts.join('');
  return `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`;
}

export function priceRangeText(facts: Pick<LineupFacts, 'pricedCount' | 'priceMin' | 'priceMax'>): string | null {
  if (!facts.pricedCount) return null;
  if (facts.priceMin === facts.priceMax) return formatUsd(facts.priceMin);
  return `${formatUsd(facts.priceMin)}–${formatUsd(facts.priceMax)}`;
}

/**
 * Up to `limit` guides worth reading next for this mattress, chosen by the
 * topics its own data raises (firmness band, construction type) - a short
 * list rather than the whole library.
 */
export function relevantGuides<G extends Pick<Guide, 'slug'>>(entry: EntryLike, guides: readonly G[], limit = 4): G[] {
  const firm = firmnessFor(entry);
  const slugs = ['how-to-choose-mattress-firmness'];
  if (firm && firm.rating <= 6) slugs.push('pressure-relief-for-side-sleepers');
  if (firm && firm.rating >= 6.5) slugs.push('back-support-for-heavier-sleepers');
  slugs.push('mattress-types-explained');
  if (entry.type === 'foam') slugs.push('mattresses-for-hot-sleepers');
  slugs.push('motion-isolation-for-couples', 'mattress-buying-checklist');
  const bySlug = new Map(guides.map((g) => [g.slug, g]));
  const picked = slugs.map((s) => bySlug.get(s)).filter((g): g is G => Boolean(g));
  for (const g of guides) if (!picked.includes(g)) picked.push(g);
  return picked.slice(0, limit);
}
