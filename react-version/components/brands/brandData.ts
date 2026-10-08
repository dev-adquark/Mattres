import { displayTitle } from '@/lib/format';
import { ctaFor } from '@/lib/outbound';
import { firmnessFor } from '@/lib/firmness';
import { hasQueenPrice, lineupFacts, priceRangeText, relevantGuides, typeSummary } from '@/components/product/productData';
import type { BrandGroup as ProductBrandGroup, LineupFacts } from '@/components/product/productData';
import type { MattressEntry, MattressType, OutboundCta, OutboundKind } from '@/lib/types';
import { CATEGORY_PAGES, entriesForCategory } from '@/lib/categories';
import { positionLabel } from './brandCopy';

export { POSITION_LABELS, POSITION_SHORT, TYPE_WORD, positionLabel, positionShort, typeWord } from './brandCopy';

/**
 * Pure helpers for /brands and /brands/[brand]. Every statement they produce
 * is derived from catalog fields or from scoreEngine output for the
 * disclosed reference sleepers - never written by hand, never estimated.
 * Each derived claim carries a `basis` string so the page can show how it
 * was reached.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type BrandRatingKey = 'cooling' | 'motion' | 'edge' | 'durability';
export type BrandRatingField = 'coolingRatingOutOf10' | 'motionIsolationRatingOutOf10' | 'edgeSupportRatingOutOf10' | 'durabilityRatingOutOf10';

export interface BrandRatingDim {
  key: BrandRatingKey;
  field: BrandRatingField;
  label: string;
  noun: string;
}

/** One row of lineupFacts().types (components/product/productData). */
export type LineupTypeCount = LineupFacts['types'][number];

/** A construction micro-bar segment. */
export interface TypeMixItem extends LineupTypeCount {
  share: number;
}

/** One brand of groupByBrand() (components/product/productData). */
export type BrandGroup = ProductBrandGroup<MattressEntry>;

/**
 * The part of a getReferenceScores() score this module reads. `rank`/`total`
 * are the integrity-rule ranking (components/catalog/referenceRankings
 * eligibleRanks: only entries with MIN_MEASURED+ backed dimensions are
 * ranked), the same rank the product and category pages show. A missing or
 * null rank means "not ranked".
 */
export interface ReferenceScore {
  score: number | null;
  rank?: number | null;
  total?: number;
}
/** getReferenceScores().byPosition: position -> mattress id -> score. */
export type ReferenceByPosition = Partial<Record<string, Partial<Record<string, ReferenceScore>>>>;

export type RatingVerdict = 'strength' | 'weakness' | 'even' | 'unrated';

export interface RatingStanding extends BrandRatingDim {
  avg: number | null;
  rated: number;
  of: number;
  median: number | null;
  catalogRated: number;
  delta: number | null;
  verdict: RatingVerdict;
}

/** The brand's best RANKED model for one reference sleeper. */
export interface RankedStanding {
  entry: MattressEntry;
  score: number;
  /** Place among the ranked set (same as the product and category pages). */
  rank: number;
}

export interface ReferenceStanding {
  position: string;
  /** The brand's highest-scoring model for this sleeper, ranked or not. */
  entry: MattressEntry;
  score: number;
  /** The brand's best ranked model, or null when no model has enough backed data to be ranked. */
  ranked: RankedStanding | null;
  /** How many mattresses in the whole catalog are ranked for this sleeper. */
  total: number;
}

export interface VerdictItem {
  id: string;
  title: string;
  detail: string;
  basis: string;
}

export interface BrandVerdicts {
  strengths: VerdictItem[];
  weaknesses: VerdictItem[];
  gaps: string[];
}

export interface ReferenceMatrixRow {
  entry: MattressEntry;
  scores: Record<string, number | null>;
}

export interface ReferenceMatrix {
  positions: string[];
  rows: ReferenceMatrixRow[];
  best: Record<string, number>;
}

export interface CommerceItem {
  entry: MattressEntry;
  cta: OutboundCta;
}

export type CommerceSummary = { ctas: CommerceItem[] } & Record<OutboundKind, number>;

export interface BrandPairLink {
  slug: string;
  title: string;
  href: string;
}

export interface IndexMeta {
  models: string;
  price: string;
  verified: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Independent third-party ratings on file (out of 10). */
export const BRAND_RATING_DIMS: readonly BrandRatingDim[] = [
  { key: 'cooling', field: 'coolingRatingOutOf10', label: 'Cooling', noun: 'cooling' },
  { key: 'motion', field: 'motionIsolationRatingOutOf10', label: 'Motion isolation', noun: 'motion isolation' },
  { key: 'edge', field: 'edgeSupportRatingOutOf10', label: 'Edge support', noun: 'edge support' },
  { key: 'durability', field: 'durabilityRatingOutOf10', label: 'Durability', noun: 'durability' },
];

/** A brand average this far above / below the catalog median counts as a strength / watch-out. */
export const RATING_MARGIN = 0.5;
/** A best reference rank at or inside this counts as a strength. */
export const TOP_RANK = 5;
/** No model reaching this reference score for a position counts as a watch-out (below the 'Good match' tier). */
export const GOOD_SCORE = 70;

/** Construction types in a fixed order, so every micro-bar reads the same way. */
export const TYPE_ORDER: readonly MattressType[] = ['hybrid', 'foam', 'latex', 'innerspring'];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const round1 = (v: number): number => Math.round(v * 10) / 10;

export const fmt10 = (v: number): string => `${Number.isInteger(v) ? v : v.toFixed(1)}/10`;

export function median(values: readonly unknown[]): number | null {
  const list = values.map(num).filter((v): v is number => v !== null).sort((a, b) => a - b);
  if (!list.length) return null;
  const mid = Math.floor(list.length / 2);
  const hi = list[mid] as number;
  return list.length % 2 ? hi : ((list[mid - 1] as number) + hi) / 2;
}

/** Most common construction type in a lineup (ties: TYPE_ORDER). */
export function dominantType(entries: readonly Pick<MattressEntry, 'type'>[]): MattressType | null {
  const counts = new Map<MattressType, number>();
  for (const e of entries) counts.set(e.type, (counts.get(e.type) || 0) + 1);
  let best: MattressType | null = null;
  for (const t of [...TYPE_ORDER, ...counts.keys()]) {
    const c = counts.get(t);
    if (c === undefined) continue;
    if (best === null || c > (counts.get(best) ?? 0)) best = t;
  }
  return best;
}

/** [{ type, label, count, share }] in TYPE_ORDER, for the construction micro-bar. */
export function typeMix(facts: Pick<LineupFacts, 'types' | 'count'>): TypeMixItem[] {
  const order = (t: string): number => {
    const i = (TYPE_ORDER as readonly string[]).indexOf(t);
    return i === -1 ? 99 : i;
  };
  return [...facts.types].sort((a, b) => order(a.type) - order(b.type)).map((t) => ({ ...t, share: facts.count ? t.count / facts.count : 0 }));
}

/**
 * One sentence (two at most) that tells the brand story from the catalog:
 * lineup size and construction, published Queen prices, trial length.
 * Missing data is mentioned once, briefly - it never gets its own stat.
 */
export function brandSentence(name: string, facts: LineupFacts): string {
  const n = facts.count;
  const lineup = n === 1 ? `one ${(facts.types[0]?.label ?? '').toLowerCase()} mattress` : `${n} mattresses: ${typeSummary(facts.types)}`;
  const parts = [`We track ${lineup} from ${name}.`];
  const range = priceRangeText(facts);
  const clauses: string[] = [];
  if (range) {
    const verb = facts.priceMin === facts.priceMax ? 'is' : 'runs';
    clauses.push(facts.pricedCount === n ? `the published Queen price ${verb} ${range}` : `where a Queen price is published (${facts.pricedCount} of ${n}) it ${verb} ${range}`);
  }
  if (facts.trialMin !== null) {
    clauses.push(facts.trialMin === facts.trialMax ? `trials are ${facts.trialMin} nights` : `trials run ${facts.trialMin}–${facts.trialMax} nights`);
  }
  if (clauses.length) {
    const s = clauses.join(', and ');
    parts.push(`${s.charAt(0).toUpperCase()}${s.slice(1)}.`);
  } else {
    parts.push(`${name} didn't publish a comparable Queen price or trial length on the pages we checked.`);
  }
  return parts.join(' ');
}

/** Short meta strings for the index row. */
export function indexMeta(facts: LineupFacts): IndexMeta {
  const range = priceRangeText(facts);
  return {
    models: facts.count === 1 ? '1 model' : `${facts.count} models`,
    price: range ? `Queen ${range}` : 'No confirmed Queen price',
    verified: `${facts.levels.verified} of ${facts.count} verified`,
  };
}

const ratingsFor = (entries: readonly MattressEntry[], field: BrandRatingField): number[] =>
  entries.map((e) => num(e[field])).filter((v): v is number => v !== null);

/** Catalog medians for each independent rating dimension. */
export function catalogRatingMedians(allEntries: readonly MattressEntry[]): Record<BrandRatingKey, { median: number | null; rated: number }> {
  const out = {} as Record<BrandRatingKey, { median: number | null; rated: number }>;
  for (const d of BRAND_RATING_DIMS) {
    const values = ratingsFor(allEntries, d.field);
    out[d.key] = { median: median(values), rated: values.length };
  }
  return out;
}

/** Brand average vs catalog median for each rating dimension. */
export function ratingStandings(brandEntries: readonly MattressEntry[], allEntries: readonly MattressEntry[]): RatingStanding[] {
  const medians = catalogRatingMedians(allEntries);
  return BRAND_RATING_DIMS.map((d): RatingStanding => {
    const values = ratingsFor(brandEntries, d.field);
    const { median: med, rated: catalogRated } = medians[d.key];
    if (!values.length || med === null) {
      return { ...d, avg: null, rated: 0, of: brandEntries.length, median: med, catalogRated, delta: null, verdict: 'unrated' };
    }
    const avg = round1(values.reduce((s, v) => s + v, 0) / values.length);
    const delta = round1(avg - med);
    const verdict: RatingVerdict = delta >= RATING_MARGIN ? 'strength' : delta <= -RATING_MARGIN ? 'weakness' : 'even';
    return { ...d, avg, rated: values.length, of: brandEntries.length, median: med, catalogRated, delta, verdict };
  });
}

/**
 * The brand's best reference score per sleep position, plus its best RANKED
 * model and that model's place among the ranked set. The rank is read from
 * getReferenceScores() (eligibleRanks), never recomputed here, so a brand
 * page says "3rd of 26 ranked" exactly where the product and category pages do.
 * byPosition: getReferenceScores().byPosition
 */
export function referenceStandings(brandEntries: readonly MattressEntry[], byPosition: ReferenceByPosition | null | undefined): ReferenceStanding[] {
  const out: ReferenceStanding[] = [];
  for (const [position, scores = {}] of Object.entries(byPosition || {})) {
    let best: { entry: MattressEntry; score: number } | null = null;
    let ranked: RankedStanding | null = null;
    for (const e of brandEntries) {
      const s = num(scores[e.id]?.score);
      if (s === null) continue;
      if (!best || s > best.score) best = { entry: e, score: s };
      const rank = num(scores[e.id]?.rank);
      if (rank !== null && (!ranked || rank < ranked.rank)) ranked = { entry: e, score: s, rank };
    }
    if (!best) continue;
    const total = Object.values(scores).reduce((max, v) => Math.max(max, num(v?.total) ?? 0), 0);
    out.push({ position, entry: best.entry, score: best.score, ranked, total });
  }
  return out;
}

/** Engine-derived headline numbers for one brand, for the brand carousel. */
export interface BrandSnapshot {
  /** The brand's single highest reference score, any position. */
  top: { position: string; entry: MattressEntry; score: number } | null;
  /** The brand's best placing among the ranked set, any position (lowest rank; ties: higher score, then position order). */
  bestPlace: { position: string; entry: MattressEntry; score: number; rank: number; total: number } | null;
}

export function brandSnapshot(standings: readonly ReferenceStanding[]): BrandSnapshot {
  let top: BrandSnapshot['top'] = null;
  let bestPlace: BrandSnapshot['bestPlace'] = null;
  for (const s of standings) {
    if (!top || s.score > top.score) top = { position: s.position, entry: s.entry, score: s.score };
    const r = s.ranked;
    if (r && (!bestPlace || r.rank < bestPlace.rank || (r.rank === bestPlace.rank && r.score > bestPlace.score))) {
      bestPlace = { position: s.position, entry: r.entry, score: r.score, rank: r.rank, total: s.total };
    }
  }
  return { top, bestPlace };
}

export function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] || s[v] || s[0]}`;
}

const capitalise = (s: string): string => `${s.charAt(0).toUpperCase()}${s.slice(1)}`;
const points = (n: number): string => `${n} ${n === 1 ? 'point' : 'points'}`;

/** Gap between two ratings computed from the one-decimal values the page shows, so the arithmetic on screen always adds up. */
const shownGap = (a: number, b: number): number => Math.round((Math.round(a * 10) - Math.round(b * 10))) / 10;

/** Strengths and watch-outs, each with the basis it was derived from. */
export function brandVerdicts(
  name: string,
  brandEntries: readonly MattressEntry[],
  allEntries: readonly MattressEntry[],
  byPosition: ReferenceByPosition | null | undefined,
): BrandVerdicts {
  const strengths: VerdictItem[] = [];
  const weaknesses: VerdictItem[] = [];
  const gaps: string[] = [];
  const first = brandEntries[0];
  const single = brandEntries.length === 1 && first !== undefined;
  const subject = single ? displayTitle(first) : `${name}'s lineup`;

  for (const r of ratingStandings(brandEntries, allEntries)) {
    if (r.verdict === 'unrated' || r.avg === null || r.median === null || r.delta === null) continue;
    const scope = single ? `rated ${fmt10(r.avg)}` : `averages ${fmt10(r.avg)} across ${r.rated} rated ${r.rated === 1 ? 'model' : 'models'}`;
    const basis = `Independent rating; catalog median ${fmt10(r.median)} across ${r.catalogRated} rated mattresses.`;
    if (r.verdict === 'strength') {
      strengths.push({ id: `rating-${r.key}`, title: r.label, detail: `${subject} ${scope}, ${points(shownGap(r.avg, r.median))} above the catalog median.`, basis });
    } else if (r.verdict === 'weakness') {
      weaknesses.push({ id: `rating-${r.key}`, title: r.label, detail: `${subject} ${scope}, ${points(shownGap(r.median, r.avg))} below the catalog median.`, basis });
    }
  }

  for (const s of referenceStandings(brandEntries, byPosition)) {
    const who = positionLabel(s.position);
    const model = displayTitle(s.entry);
    const basis = `Engine score for the reference ${who} sleeper. Ranked among the ${s.total} mattresses with at least three of six scored dimensions backed by a published spec or an independent rating, as on the category and product pages.`;
    if (s.ranked && s.ranked.rank <= TOP_RANK) {
      strengths.push({
        id: `ref-${s.position}`,
        title: `${capitalise(who)} sleepers`,
        detail: `${displayTitle(s.ranked.entry)} scores ${s.ranked.score}/100, ${ordinal(s.ranked.rank)} of ${s.total} ranked.`,
        basis,
      });
    } else if (s.score < GOOD_SCORE) {
      weaknesses.push({
        id: `ref-${s.position}`,
        title: `${capitalise(who)} sleepers`,
        detail: single
          ? `${model} scores ${s.score}/100 for this sleeper, below a Good match (${GOOD_SCORE}+).`
          : `No ${name} model reaches a Good match (${GOOD_SCORE}+); the best is ${model} at ${s.score}/100.`,
        basis,
      });
    }
  }

  const ratedAny = brandEntries.filter((e) => BRAND_RATING_DIMS.some((d) => num(e[d.field]) !== null)).length;
  if (ratedAny === 0)
    gaps.push(`No independent ratings are on file for ${single ? 'this model' : `any ${name} model`}, so we can't compare cooling, motion isolation, edge support or durability.`);
  else if (ratedAny < brandEntries.length)
    gaps.push(`${brandEntries.length - ratedAny} of ${brandEntries.length} ${name} models have no independent ratings on file; the averages above leave them out.`);
  const unpriced = brandEntries.filter((e) => !hasQueenPrice(e)).length;
  if (unpriced && !single) {
    gaps.push(
      unpriced === brandEntries.length
        ? `No ${name} model has a confirmed US-dollar Queen price on the pages we checked.`
        : `${unpriced} of ${brandEntries.length} ${name} models have no confirmed US-dollar Queen price on the pages we checked.`,
    );
  }

  return { strengths, weaknesses, gaps };
}

/** Per-model reference scores for the matrix (best = highest score per column, -1 when none). */
export function referenceMatrix(brandEntries: readonly MattressEntry[], byPosition: ReferenceByPosition | null | undefined): ReferenceMatrix {
  const source = byPosition || {};
  const positions = Object.keys(source);
  const rows = brandEntries.map((entry) => ({
    entry,
    scores: Object.fromEntries(positions.map((p) => [p, num(source[p]?.[entry.id]?.score)])),
  }));
  const best = Object.fromEntries(positions.map((p) => [p, Math.max(...rows.map((r) => r.scores[p] ?? -1))]));
  return { positions, rows, best };
}

/** Lineup ordered by the reference combination score (engine), best first; falls back to title. */
export function lineupByReference(brandEntries: readonly MattressEntry[], byPosition: ReferenceByPosition | null | undefined, position = 'combination'): MattressEntry[] {
  const scores = byPosition?.[position] || {};
  return [...brandEntries].sort((a, b) => (scores[b.id]?.score ?? -1) - (scores[a.id]?.score ?? -1) || displayTitle(a).localeCompare(displayTitle(b)));
}

/**
 * Where-to-buy facts, honestly: how many models have an affiliate,
 * retailer or manufacturer link, and none invented.
 */
export function commerceSummary(brandEntries: readonly MattressEntry[]): CommerceSummary {
  const ctas: CommerceItem[] = brandEntries.map((e) => ({ entry: e, cta: ctaFor(e) }));
  const count = (k: OutboundKind): number => ctas.filter((c) => c.cta.kind === k).length;
  return { ctas, affiliate: count('affiliate'), retailer: count('retailer'), brand: count('brand'), unavailable: count('unavailable') };
}

const joinNames = (names: readonly string[]): string =>
  names.length <= 1 ? names.join('') : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;

/**
 * The "Where to buy" lead sentence, built from the CTA kinds actually rendered
 * (affiliate / retailer / brand / unavailable) so it never claims a link goes
 * somewhere it does not.
 */
export function buyLeadCopy(name: string, commerce: CommerceSummary): string {
  const linked = commerce.affiliate + commerce.retailer + commerce.brand;
  const missing =
    commerce.unavailable > 0 && linked > 0
      ? ` ${commerce.unavailable} ${commerce.unavailable === 1 ? 'model has' : 'models have'} no retailer or brand link on file yet.`
      : '';

  if (linked === 0) {
    return `No affiliate relationship with ${name}, and no retailer or brand links are on file yet.`;
  }

  if (commerce.affiliate > 0) {
    const a = commerce.affiliate;
    return `${a} of ${linked} ${linked === 1 ? 'link' : 'links'} ${a === 1 ? 'is an affiliate link' : 'are affiliate links'} and ${a === 1 ? 'is' : 'are'} labeled. It never changes a score.${missing}`;
  }

  const retailers = [
    ...new Set(
      commerce.ctas
        .filter((c) => c.cta.kind === 'retailer')
        .map((c) => c.cta.retailerName || c.cta.host)
        .filter((n): n is string => Boolean(n)),
    ),
  ];
  const subject = linked > 1 ? 'these links go to' : 'this link goes to';
  let destination: string;
  if (commerce.retailer > 0 && commerce.brand > 0) {
    destination = `${name}’s own ${commerce.brand > 1 ? 'pages' : 'page'} or ${commerce.retailer === 1 ? 'a listing' : 'listings'} at ${joinNames(retailers)}`;
  } else if (commerce.retailer > 0) {
    destination = `${commerce.retailer === 1 ? `the ${name} listing` : `${name} listings`} at ${joinNames(retailers)}`;
  } else {
    destination = commerce.brand > 1 ? `${name}’s own pages` : `${name}’s own page`;
  }
  return `No affiliate relationship with ${name}: we earn nothing if you buy, and ${subject} ${destination}.${missing}`;
}

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;

/** Curated A-vs-B pages that involve one of the brand's models. Tolerates an empty / partial / malformed pair list. */
export function pairsForBrand(brandEntries: readonly Pick<MattressEntry, 'id' | 'slug'>[], pairs: unknown): BrandPairLink[] {
  const ids = new Set(brandEntries.map((e) => e.id));
  const slugs = new Set(brandEntries.map((e) => e.slug).filter(Boolean));
  const has = (set: Set<string>, v: unknown): boolean => typeof v === 'string' && set.has(v);
  const hit = (v: unknown): boolean => (typeof v === 'string' && (ids.has(v) || slugs.has(v))) || (isRecord(v) && (has(ids, v.id) || has(slugs, v.slug)));
  const out: BrandPairLink[] = [];
  for (const p of Array.isArray(pairs) ? (pairs as unknown[]) : []) {
    if (!isRecord(p) || typeof p.slug !== 'string' || !p.slug || !(hit(p.a) || hit(p.b))) continue;
    out.push({
      slug: p.slug,
      title: typeof p.title === 'string' && p.title ? p.title : p.slug,
      href: typeof p.href === 'string' && p.href ? p.href : `/compare/${p.slug}`,
    });
  }
  return out;
}

/** Closest models from other brands to the given model: same type, nearest firmness. */
export function rivalsFor(entry: MattressEntry | null | undefined, allEntries: readonly MattressEntry[], limit = 3): MattressEntry[] {
  if (!entry) return [];
  const target: { rating: number } | null = firmnessFor(entry);
  return allEntries
    .filter((e) => e.brand !== entry.brand && e.type === entry.type)
    .map((e) => {
      const f: { rating: number } | null = firmnessFor(e);
      return { e, d: target && f ? Math.abs(f.rating - target.rating) : 99 };
    })
    .sort((a, b) => a.d - b.d || displayTitle(a.e).localeCompare(displayTitle(b.e)))
    .slice(0, limit)
    .map((x) => x.e);
}

/** Guides worth reading, unioned across a lineup (first model's picks first). */
export function guidesForLineup<G extends { slug: string }>(brandEntries: readonly MattressEntry[], guides: readonly G[], limit = 3): G[] {
  const out: G[] = [];
  for (const e of brandEntries) {
    for (const g of relevantGuides(e, guides, limit + 2)) {
      if (!out.includes(g)) out.push(g);
    }
  }
  return out.slice(0, limit);
}

/** One category page (lib/categories) a brand's models appear on. */
export interface BrandCategoryLink {
  slug: string;
  href: string;
  label: string;
  /** How many of the brand's models are on that page. */
  count: number;
  /** How many models the page lists in total. */
  of: number;
}

/**
 * The category pages (/mattresses/<slug>) the brand's models belong to, by
 * the same predicates the category pages use. 'best' lists everything, so it
 * says nothing about the brand and is left out. Registry order.
 */
export function categoriesForBrand(brandEntries: readonly MattressEntry[], allEntries: readonly MattressEntry[]): BrandCategoryLink[] {
  const ids = new Set(brandEntries.map((e) => e.id));
  const out: BrandCategoryLink[] = [];
  for (const c of CATEGORY_PAGES) {
    if (c.slug === 'best') continue;
    const members = entriesForCategory(c, allEntries);
    const count = members.filter((e) => ids.has(e.id)).length;
    if (count) out.push({ slug: c.slug, href: c.href, label: c.chip, count, of: members.length });
  }
  return out;
}

/** A curated head-to-head involving the nearest rival of a brand with none of its own. */
export interface NearestPairLink extends BrandPairLink {
  rival: MattressEntry;
}

/**
 * For a brand with no curated pair of its own: the curated pairs that involve
 * its lead model's closest other-brand rivals (rivalsFor order: same
 * construction, nearest firmness), nearest first. Empty when none exists.
 */
export function nearestPairs(lead: MattressEntry | null | undefined, allEntries: readonly MattressEntry[], pairs: readonly { a: string; b: string; slug: string; title: string; href: string }[], limit = 1): NearestPairLink[] {
  if (!lead) return [];
  const out: NearestPairLink[] = [];
  for (const rival of rivalsFor(lead, allEntries, allEntries.length)) {
    for (const p of pairs) {
      if (out.length >= limit) return out;
      if ((p.a === rival.id || p.b === rival.id) && !out.some((o) => o.slug === p.slug)) out.push({ slug: p.slug, title: p.title, href: p.href, rival });
    }
  }
  return out;
}

/** Same URL shape as lib/compareStore compareHref (that module is client-only). */
export function compareHref(ids: readonly string[]): string {
  return `/compare?ids=${ids.map(encodeURIComponent).join(',')}`;
}

export { lineupFacts };
export type { LineupFacts };
