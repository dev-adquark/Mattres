import { displayTitle } from '@/lib/format';
import { firmnessFor, MATTRESS_TYPE_LABEL } from '@/lib/firmness';
import { normalise, TAG_WORDS } from '@/lib/searchIndex';
import { CATEGORY_PAGES, categoryTagsFor } from '@/lib/categoryPages';
import { TIERS } from '@/lib/scoreTiers';
import type { CatalogRatingKey } from '@/lib/categories';
import type { CategoryPage, MattressEntry, MattressType } from '@/lib/types';
import { hasQueenPrice } from './productData';
import { CATALOG_RATING_FIELDS, CATALOG_RATING_KEYS, catalogRating, isCatalogRatingKey, MATERIAL_TAGS, materialTagsFor } from '@/components/catalog/catalogData';
import type { ListingEntry, MaterialTagId } from '@/components/catalog/catalogData';
import type { CatalogReference } from '@/components/catalog/referenceRankings';
import { RANKING_RULE_CLAUSE, UNRANKED_TITLE } from '@/lib/categories';

/**
 * Pure search / filter / sort for /mattresses. Only fields the catalog
 * really carries are filterable, and every sort that depends on a field some
 * entries lack puts those entries in a separate, labelled group at the end
 * instead of guessing where they belong.
 *
 * State (all optional in the URL):
 *   q          free text: brand, model, type, firmness, materials, category words
 *              ("cooling", "firm", "latex", "budget"), and side | back | stomach
 *              (= a Strong match for that reference sleeper, like ?fit=)
 *   type       comma list of foam | hybrid | innerspring | latex
 *   firmness   comma list of firmness band ids (FIRMNESS_BANDS)
 *   price      one PRICE_BUCKETS id (Queen price)
 *   brand      comma list of brand slugs
 *   rated      comma list of cooling | motion | edge | durability ("rated 7+ by a third party")
 *   fit        comma list of side | back | stomach (engine: Strong match or better for that reference sleeper)
 *   material   comma list of MATERIAL_TAGS ids (named in the manufacturer's construction notes)
 *   sort       one SORTS id
 *
 * Reference context (ctx.reference, computed server-side by
 * components/catalog/referenceRankings#getCatalogReference):
 *   { mean, side, back, stomach, couples, pressure, measured } maps of id -> number
 */

export type FirmnessBandId = 'soft' | 'medium-soft' | 'medium' | 'medium-firm' | 'firm' | 'extra-firm';
export type PriceBucketId = 'under-1000' | '1000-2000' | '2000-3000' | '3000-plus';
export type FitPosition = 'side' | 'back' | 'stomach';
export type ReferenceSortId = 'side' | 'back' | 'stomach' | 'pressure' | 'couples';
export type SortId = 'recommended' | ReferenceSortId | 'price-asc' | 'price-desc' | CatalogRatingKey | 'az';
/** Facets the explorer can toggle, plus the free-text query. */
export type ListFacet = 'types' | 'firmness' | 'brands' | 'rated' | 'fit' | 'material';
export type Facet = ListFacet | 'q' | 'price';

/** The explorer's whole filter/sort state; mirrored in the URL. */
export interface CatalogState {
  q: string;
  types: MattressType[];
  firmness: FirmnessBandId[];
  price: PriceBucketId | '';
  brands: string[];
  rated: CatalogRatingKey[];
  fit: FitPosition[];
  material: MaterialTagId[];
  sort: SortId;
}

/** What the sort/filter code needs beyond the entries themselves. */
export interface QueryContext {
  /** { [id]: score } from the visitor's own quiz result. */
  matchScores?: Record<string, number> | null;
  reference?: CatalogReference | null;
}

/** Brand name -> URL slug. */
export type SlugOf = (brand: string) => string;

export const TYPE_ORDER: readonly MattressType[] = ['foam', 'hybrid', 'innerspring', 'latex'];

export interface FirmnessBand {
  id: FirmnessBandId;
  label: string;
  lo: number;
  hi: number;
}

// Band edges sit halfway between the firmness scale's label points
// (lib/firmness.ts: 2, 4, 5.5, 7, 8.5, 10). A model sold in several
// firmness options matches every band its range touches.
export const FIRMNESS_BANDS: readonly FirmnessBand[] = [
  { id: 'soft', label: 'Soft', lo: 0, hi: 3 },
  { id: 'medium-soft', label: 'Medium-soft', lo: 3, hi: 4.75 },
  { id: 'medium', label: 'Medium', lo: 4.75, hi: 6.25 },
  { id: 'medium-firm', label: 'Medium-firm', lo: 6.25, hi: 7.75 },
  { id: 'firm', label: 'Firm', lo: 7.75, hi: 9.25 },
  { id: 'extra-firm', label: 'Extra-firm', lo: 9.25, hi: 10.01 },
];

export interface PriceBucket {
  id: PriceBucketId;
  label: string;
  min: number;
  max: number;
}

export const PRICE_BUCKETS: readonly PriceBucket[] = [
  { id: 'under-1000', label: 'Under $1,000', min: 0, max: 1000 },
  { id: '1000-2000', label: '$1,000–$1,999', min: 1000, max: 2000 },
  { id: '2000-3000', label: '$2,000–$2,999', min: 2000, max: 3000 },
  { id: '3000-plus', label: '$3,000 and up', min: 3000, max: Infinity },
];

export const RATED_THRESHOLD = 7;
export const RATED_KEYS: readonly CatalogRatingKey[] = CATALOG_RATING_KEYS;

/** Sleep-position fit: the engine's "Strong match" floor for that reference sleeper. */
export const FIT_THRESHOLD: number = strongTierFloor();

function strongTierFloor(): number {
  const strong = TIERS.find((t: { id: string; min: number }) => t.id === 'strong');
  if (!strong) throw new Error('lib/scoreTiers has no "strong" tier');
  return strong.min;
}
export const FIT_POSITIONS: readonly { id: FitPosition; label: string }[] = [
  { id: 'side', label: 'Side sleepers' },
  { id: 'back', label: 'Back sleepers' },
  { id: 'stomach', label: 'Stomach sleepers' },
];
export const MATERIAL_IDS: readonly MaterialTagId[] = MATERIAL_TAGS.map((m) => m.id);

/** Only entries with at least this many dimensions backed by a published spec or an independent rating are ranked by a reference sort. */
export const MIN_MEASURED = 3;

export const DEFAULT_SORT: SortId = 'recommended';

export interface SortDef {
  id: SortId;
  label: string;
  /** 'reference' = needs the server-computed reference scores. */
  requires?: 'reference';
}

/**
 * Labels never change after hydration: "Recommended" stays "Recommended"
 * whether it ranks by the visitor's own quiz result or the reference sleeper.
 */
export const SORTS: readonly SortDef[] = [
  { id: 'recommended', label: 'Recommended' },
  { id: 'side', label: 'Best for side sleepers', requires: 'reference' },
  { id: 'back', label: 'Best for back sleepers', requires: 'reference' },
  { id: 'stomach', label: 'Best for stomach sleepers', requires: 'reference' },
  { id: 'pressure', label: 'Best pressure relief', requires: 'reference' },
  { id: 'couples', label: 'Best for couples', requires: 'reference' },
  { id: 'price-asc', label: 'Price: low to high' },
  { id: 'price-desc', label: 'Price: high to low' },
  { id: 'cooling', label: 'Highest cooling rating' },
  { id: 'motion', label: 'Highest motion isolation rating' },
  { id: 'edge', label: 'Highest edge support rating' },
  { id: 'durability', label: 'Highest durability rating' },
  { id: 'az', label: 'Brand A–Z' },
];

/** Plain-language profile behind each reference sort (shown in the sort note). */
export const REFERENCE_SORT_TEXT: Readonly<Record<'recommended' | ReferenceSortId, string>> = {
  recommended: 'the average of four reference sleepers (side, back, stomach and combination; 160 lb, neutral temperature, sleeping alone, no firmness preference)',
  side: 'a reference side sleeper (160 lb, neutral temperature, sleeping alone, no firmness preference)',
  back: 'a reference back sleeper (160 lb, neutral temperature, sleeping alone, no firmness preference)',
  stomach: 'a reference stomach sleeper (160 lb, neutral temperature, sleeping alone, no firmness preference)',
  pressure: 'the pressure-relief sub-score for a reference side sleeper (160 lb, neutral temperature, sleeping alone, no firmness preference)',
  couples: 'a reference couple (combination sleeper, 160 lb, a partner who wakes easily, neutral temperature, no firmness preference)',
};

const SORT_IDS: ReadonlySet<string> = new Set(SORTS.map((s) => s.id));
const LEGACY_SORT: Readonly<Record<string, SortId>> = { price: 'price-asc', match: 'recommended', name: 'az', featured: 'recommended' };
const LEGACY_TYPE: Readonly<Record<string, MattressType>> = { 'memory-foam': 'foam', memoryfoam: 'foam', 'all-foam': 'foam' };

export const EMPTY_STATE: Readonly<CatalogState> = Object.freeze({ q: '', types: [], firmness: [], price: '', brands: [], rated: [], fit: [], material: [], sort: DEFAULT_SORT });

/** A raw search-param value as Next hands it to a page. */
export type ParamValue = string | string[] | undefined;
export type SearchParamsRecord = Record<string, ParamValue>;

function list(value: ParamValue): string[] {
  const raw = Array.isArray(value) ? value.join(',') : typeof value === 'string' ? value : '';
  return [
    ...new Set(
      raw
        .split(',')
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean)
    ),
  ];
}

function first(value: ParamValue): string {
  if (Array.isArray(value)) return typeof value[0] === 'string' ? value[0] : '';
  return typeof value === 'string' ? value : '';
}

const oneOf =
  <T extends string>(allowed: readonly T[]) =>
  (value: string): value is T =>
    (allowed as readonly string[]).includes(value);

const isType = oneOf(TYPE_ORDER);
const isFirmnessBand = oneOf(FIRMNESS_BANDS.map((b) => b.id));
const isPriceBucket = oneOf(PRICE_BUCKETS.map((b) => b.id));
const isFitPosition = oneOf(FIT_POSITIONS.map((p) => p.id));
const isMaterial = oneOf(MATERIAL_IDS);
export const isSortId = (value: string): value is SortId => SORT_IDS.has(value);

function toggleIn<T extends string>(list: readonly T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

/**
 * The state patch that adds `value` to a list facet, or removes it when it is
 * already selected. Values that aren't valid for the facet change nothing.
 */
export function toggleFacetValue(state: CatalogState, facet: ListFacet, value: string): Partial<CatalogState> {
  switch (facet) {
    case 'types':
      return isType(value) ? { types: toggleIn(state.types, value) } : {};
    case 'firmness':
      return isFirmnessBand(value) ? { firmness: toggleIn(state.firmness, value) } : {};
    case 'brands':
      return { brands: toggleIn(state.brands, value) };
    case 'rated':
      return isCatalogRatingKey(value) ? { rated: toggleIn(state.rated, value) } : {};
    case 'fit':
      return isFitPosition(value) ? { fit: toggleIn(state.fit, value) } : {};
    case 'material':
      return isMaterial(value) ? { material: toggleIn(state.material, value) } : {};
  }
}

/**
 * Reads a plain object of search params (Next's page `searchParams`, or
 * Object.fromEntries(URLSearchParams)) into a validated state. Unknown values
 * are dropped rather than trusted.
 */
export function parseState(params: SearchParamsRecord = {}, { brandSlugs = null }: { brandSlugs?: readonly string[] | null } = {}): CatalogState {
  const q = first(params.q).slice(0, 80);
  const types = list(params.type)
    .map((t) => LEGACY_TYPE[t] || t)
    .filter(isType);
  const firmness = list(params.firmness).filter(isFirmnessBand);
  const priceRaw = first(params.price);
  const price = isPriceBucket(priceRaw) ? priceRaw : '';
  const brands = list(params.brand).filter((slug) => !brandSlugs || brandSlugs.includes(slug));
  const rated = list(params.rated).filter(isCatalogRatingKey);
  const fit = list(params.fit).filter(isFitPosition);
  const material = list(params.material).filter(isMaterial);
  const sortRaw = first(params.sort).toLowerCase();
  const sortId = LEGACY_SORT[sortRaw] || sortRaw;
  const sort = isSortId(sortId) ? sortId : DEFAULT_SORT;
  return { q, types: [...new Set(types)], firmness, price, brands, rated, fit, material, sort };
}

/** State -> query string (no leading "?"), omitting defaults so the base URL stays clean. */
export function serializeState(state: CatalogState): string {
  const p = new URLSearchParams();
  if (state.q && state.q.trim()) p.set('q', state.q.trim());
  if (state.types.length) p.set('type', state.types.join(','));
  if (state.firmness.length) p.set('firmness', state.firmness.join(','));
  if (state.price) p.set('price', state.price);
  if (state.brands.length) p.set('brand', state.brands.join(','));
  if (state.rated.length) p.set('rated', state.rated.join(','));
  if (state.fit?.length) p.set('fit', state.fit.join(','));
  if (state.material?.length) p.set('material', state.material.join(','));
  if (state.sort && state.sort !== DEFAULT_SORT) p.set('sort', state.sort);
  return p.toString();
}

export function activeFilterCount(state: CatalogState): number {
  return (
    state.types.length +
    state.firmness.length +
    (state.price ? 1 : 0) +
    state.brands.length +
    state.rated.length +
    (state.fit?.length || 0) +
    (state.material?.length || 0)
  );
}

export function isPristine(state: CatalogState): boolean {
  return !state.q.trim() && activeFilterCount(state) === 0;
}

/* ---------- matching ---------- */

const MATERIAL_WORDS = Object.fromEntries(MATERIAL_TAGS.map((m) => [m.id, m.label])) as Record<MaterialTagId, string>;
const TYPE_LABEL: Partial<Record<MattressType, string>> = MATTRESS_TYPE_LABEL;

/** Material tags: precomputed on a slim listing entry, derived from the notes on a full one. */
function materialsOf(entry: ListingEntry): readonly MaterialTagId[] {
  return entry.materials ?? materialTagsFor(entry);
}

/** Category tags: precomputed on a slim listing entry, derived from the real fields on a full one. */
function tagsOf(entry: ListingEntry): readonly string[] {
  // The category predicates only read fields a ListingEntry carries (type, firmness, ratings, price, notes).
  return entry.tags ?? categoryTagsFor(entry as MattressEntry);
}

/** Words that carry no meaning in a catalog query ("best mattress for side sleepers"). */
const QUERY_STOP_WORDS: ReadonlySet<string> = new Set(['a', 'an', 'the', 'for', 'with', 'and', 'best', 'mattress', 'mattresses', 'bed', 'beds', 'sleeper', 'sleepers', 'sleeping']);
/** Position words answer with the same engine rule as ?fit= (a Strong match for that reference sleeper). */
const POSITION_WORDS: Readonly<Record<string, FitPosition>> = { side: 'side', back: 'back', stomach: 'stomach' };

export function queryTokens(q: string): string[] {
  return normalise(q)
    .split(' ')
    .filter((t) => t && !QUERY_STOP_WORDS.has(t));
}

export function searchText(entry: ListingEntry, brandSlug: string): string {
  const firm = firmnessFor(entry);
  const materials = materialsOf(entry);
  return normalise(
    [
      entry.brand,
      entry.model,
      displayTitle(entry),
      entry.type,
      TYPE_LABEL[entry.type],
      firm ? firm.label : '',
      brandSlug,
      ...materials.map((m) => MATERIAL_WORDS[m]),
      ...tagsOf(entry).map((t) => TAG_WORDS[t] || ''),
    ].join(' ')
  );
}

/**
 * Every meaningful token must match: a word in the entry's text (brand,
 * model, type, firmness, materials, category tags such as "cooling", which
 * only an independent cooling rating of 7/10+ earns), or a position word the
 * engine backs with a Strong match for that reference sleeper.
 */
export function matchesQuery(entry: ListingEntry, q: string, brandSlug: string, reference: CatalogReference | null = null): boolean {
  const tokens = queryTokens(q);
  if (!tokens.length) return true;
  const hay = searchText(entry, brandSlug);
  return tokens.every((t) => {
    if (hay.includes(t)) return true;
    const position = POSITION_WORDS[t];
    return position !== undefined && fitsPosition(entry, position, reference);
  });
}

/**
 * The category page a query names ("cooling", "side sleeper", "budget"), so
 * the listing can point to its ranked page. The catch-all 'best' page is
 * never suggested. Null when no token is a category word.
 */
export function queryCategory(q: string): { category: CategoryPage; position: FitPosition | null } | null {
  const tokens = queryTokens(q);
  for (const t of tokens) {
    const position = POSITION_WORDS[t];
    if (position) {
      const category = CATEGORY_PAGES.find((c) => c.slug === `${position}-sleepers`);
      if (category) return { category, position };
    }
  }
  for (const t of tokens) {
    const category = CATEGORY_PAGES.find((c) => c.slug !== 'best' && (c.slug === t || (TAG_WORDS[c.slug] || '').split(' ').includes(t)));
    if (category) return { category, position: null };
  }
  return null;
}

export function inFirmnessBand(entry: Pick<ListingEntry, 'firmnessRange'>, bandId: string): boolean {
  const band = FIRMNESS_BANDS.find((b) => b.id === bandId);
  const r = entry.firmnessRange;
  if (!band || !r || typeof r.min !== 'number' || typeof r.max !== 'number') return false;
  return r.min < band.hi && r.max >= band.lo;
}

export function inPriceBucket(entry: Pick<ListingEntry, 'priceUsd'>, bucketId: string): boolean {
  const bucket = PRICE_BUCKETS.find((b) => b.id === bucketId);
  const price = entry.priceUsd;
  if (!bucket || !hasQueenPrice(entry) || typeof price !== 'number') return false;
  return price >= bucket.min && price < bucket.max;
}

export function ratedAtLeast(entry: ListingEntry, key: CatalogRatingKey, threshold: number = RATED_THRESHOLD): boolean {
  const v = catalogRating(entry, key);
  return v !== null && v >= threshold;
}

export function fitsPosition(entry: Pick<ListingEntry, 'id'>, position: FitPosition, reference: CatalogReference | null | undefined): boolean {
  const score = reference?.[position]?.[entry.id];
  return typeof score === 'number' && score >= FIT_THRESHOLD;
}

export function hasMaterial(entry: ListingEntry, id: MaterialTagId): boolean {
  return materialsOf(entry).includes(id);
}

/**
 * Does `entry` pass every filter in `state`, optionally ignoring one facet
 * (used for facet counts, so each option shows how many results it would give).
 */
export function passes(entry: ListingEntry, state: CatalogState, slugOf: SlugOf, ignore: Facet | null = null, ctx: QueryContext = {}): boolean {
  if (ignore !== 'q' && !matchesQuery(entry, state.q, slugOf(entry.brand), ctx.reference ?? null)) return false;
  if (ignore !== 'types' && state.types.length && !state.types.includes(entry.type)) return false;
  if (ignore !== 'firmness' && state.firmness.length && !state.firmness.some((id) => inFirmnessBand(entry, id))) return false;
  if (ignore !== 'price' && state.price && !inPriceBucket(entry, state.price)) return false;
  if (ignore !== 'brands' && state.brands.length && !state.brands.includes(slugOf(entry.brand))) return false;
  if (ignore !== 'rated' && state.rated.length && !state.rated.every((k) => ratedAtLeast(entry, k))) return false;
  if (ignore !== 'fit' && state.fit?.length && !state.fit.every((p) => fitsPosition(entry, p, ctx.reference))) return false;
  if (ignore !== 'material' && state.material?.length && !state.material.every((m) => hasMaterial(entry, m))) return false;
  return true;
}

export interface FacetCounts {
  types: Record<MattressType, number>;
  firmness: Record<FirmnessBandId, number>;
  price: Record<PriceBucketId, number>;
  /** brand slug -> count */
  brands: Record<string, number>;
  rated: Record<CatalogRatingKey, number>;
  fit: Record<FitPosition, number>;
  material: Record<MaterialTagId, number>;
}

function countsBy<K extends string>(keys: readonly K[], fn: (key: K) => number): Record<K, number> {
  return Object.fromEntries(keys.map((k) => [k, fn(k)])) as Record<K, number>;
}

/** Live option counts for every facet, given the other active filters. */
export function facetCounts(entries: readonly ListingEntry[], state: CatalogState, slugOf: SlugOf, ctx: QueryContext = {}): FacetCounts {
  const count = (facet: Facet, test: (e: ListingEntry) => boolean): number => entries.filter((e) => passes(e, state, slugOf, facet, ctx) && test(e)).length;
  return {
    types: countsBy(TYPE_ORDER, (t) => count('types', (e) => e.type === t)),
    firmness: countsBy(
      FIRMNESS_BANDS.map((b) => b.id),
      (id) => count('firmness', (e) => inFirmnessBand(e, id))
    ),
    price: countsBy(
      PRICE_BUCKETS.map((b) => b.id),
      (id) => count('price', (e) => inPriceBucket(e, id))
    ),
    brands: Object.fromEntries([...new Set(entries.map((e) => e.brand))].map((name) => [slugOf(name), count('brands', (e) => e.brand === name)])),
    rated: countsBy(RATED_KEYS, (k) => count('rated', (e) => ratedAtLeast(e, k))),
    fit: countsBy(
      FIT_POSITIONS.map((p) => p.id),
      (id) => count('fit', (e) => fitsPosition(e, id, ctx.reference))
    ),
    material: countsBy(MATERIAL_IDS, (m) => count('material', (e) => hasMaterial(e, m))),
  };
}

export interface LimitingFilter {
  facet: Facet;
  value: string;
  results: number;
}

/**
 * When filters return nothing: for each active filter, how many results
 * removing just that one would give. Most helpful first.
 */
export function limitingFilters(entries: readonly ListingEntry[], state: CatalogState, slugOf: SlugOf, ctx: QueryContext = {}): LimitingFilter[] {
  const out: LimitingFilter[] = [];
  const tryWithout = (facet: Facet, value: string, patch: Partial<CatalogState>): void => {
    const next: CatalogState = { ...state, ...patch };
    out.push({ facet, value, results: entries.filter((e) => passes(e, next, slugOf, null, ctx)).length });
  };
  if (state.q.trim()) tryWithout('q', state.q.trim(), { q: '' });
  const facets: readonly ListFacet[] = ['types', 'firmness', 'brands', 'rated', 'fit', 'material'];
  for (const facet of facets) {
    const values: readonly string[] = state[facet] || [];
    for (const value of values) tryWithout(facet, value, { [facet]: values.filter((v) => v !== value) });
  }
  if (state.price) tryWithout('price', state.price, { price: '' });
  return out.filter((o) => o.results > 0).sort((a, b) => b.results - a.results);
}

/* ---------- sorting ---------- */

export interface SortItem<E extends ListingEntry = ListingEntry> {
  entry: E;
  annotation: string | null;
  /** The engine score the row leads with (see headlineScore), or null when there is none to show. */
  headline?: HeadlineScore | null;
}

/**
 * The one engine number a listing row leads with. It always follows the
 * order on screen: the visitor's own Match Score when the list is ranked by
 * it, the matching reference sleeper's score for a position/couples sort,
 * otherwise the visitor's score when they have one, else the four-sleeper
 * reference average. Never computed here: every value is a scoreEngine
 * output passed in through ctx.
 */
export interface HeadlineScore {
  /** 0-100 engine score, or null when the entry is listed but not scored/ranked for this basis. */
  value: number | null;
  basis: 'match' | 'reference';
  /** Who the number is for, e.g. "Avg. reference sleeper". */
  caption: string;
  /**
   * Display precision. The four-sleeper average is always shown to one
   * decimal (85.0, 84.8), matching the category pages; single-profile and
   * match scores are whole numbers.
   */
  decimals: 0 | 1;
}

const HEADLINE_CAPTION: Readonly<Record<'mean' | 'side' | 'back' | 'stomach' | 'couples', string>> = {
  mean: 'Avg. reference sleeper',
  side: 'Reference side sleeper',
  back: 'Reference back sleeper',
  stomach: 'Reference stomach sleeper',
  couples: 'Reference couple',
};

export function headlineScore(entry: Pick<ListingEntry, 'id'>, sort: SortId, ctx: QueryContext = {}): HeadlineScore | null {
  const match = ctx.matchScores;
  const key = sort === 'side' || sort === 'back' || sort === 'stomach' || sort === 'couples' ? sort : 'mean';
  if (match && key === 'mean') {
    const v = match[entry.id];
    return typeof v === 'number' ? { value: v, basis: 'match', caption: 'Your Match Score', decimals: 0 } : { value: null, basis: 'match', caption: 'Not in your quiz results', decimals: 0 };
  }
  const ref = ctx.reference;
  const v = ref?.[key]?.[entry.id];
  if (!ref || typeof v !== 'number') return null;
  const decimals = key === 'mean' ? 1 : 0;
  if ((ref.measured?.[entry.id] ?? 0) < MIN_MEASURED) return { value: null, basis: 'reference', caption: 'Too little independent data', decimals };
  return { value: v, basis: 'reference', caption: HEADLINE_CAPTION[key], decimals };
}

export interface SortGroup<E extends ListingEntry = ListingEntry> {
  id: string;
  title: string | null;
  note: string | null;
  items: SortItem<E>[];
}

export type SortBasis = 'match' | 'reference' | null;

export interface SortedGroups<E extends ListingEntry = ListingEntry> {
  sort: SortId;
  basis: SortBasis;
  groups: SortGroup<E>[];
}

const byName = (a: ListingEntry, b: ListingEntry): number => a.brand.localeCompare(b.brand) || displayTitle(a).localeCompare(displayTitle(b));
const fmt10 = (v: number): string => `${Number.isInteger(v) ? v : v.toFixed(1)}/10`;

function isReferenceSort(sort: SortId): sort is ReferenceSortId {
  return sort === 'side' || sort === 'back' || sort === 'stomach' || sort === 'pressure' || sort === 'couples';
}

/** The plain-language reference profile behind a reference-based sort, or null for other sorts. */
export function referenceSortText(sort: SortId): string | null {
  return sort === 'recommended' || isReferenceSort(sort) ? REFERENCE_SORT_TEXT[sort] : null;
}

/** The sort that will actually be applied (falls back to A–Z when its data isn't available). */
export function effectiveSort(sort: string, { reference }: QueryContext = {}): SortId {
  const def = SORTS.find((s) => s.id === sort);
  if (!def) return DEFAULT_SORT;
  if (isReferenceSort(def.id) && !reference?.[def.id]) return 'az';
  return def.id;
}

function referenceGroups<E extends ListingEntry>(
  entries: readonly E[],
  scores: Record<string, number | null>,
  measured: Record<string, number> | null | undefined,
  annotate: ((v: number) => string) | null
): SortGroup<E>[] {
  const m = measured || {};
  const scoreOf = (e: E): number | null => {
    const v = scores[e.id];
    return typeof v === 'number' ? v : null;
  };
  const ok = (e: E): boolean => scoreOf(e) !== null && (m[e.id] ?? 0) >= MIN_MEASURED;
  const ranked = entries.filter(ok).sort((a, b) => (scoreOf(b) ?? 0) - (scoreOf(a) ?? 0) || (m[b.id] ?? 0) - (m[a.id] ?? 0) || byName(a, b));
  const rest = entries.filter((e) => !ok(e)).sort(byName);
  const groups: SortGroup<E>[] = [
    { id: 'ranked', title: null, note: null, items: ranked.map((entry) => ({ entry, annotation: annotate ? annotate(scoreOf(entry) ?? 0) : null })) },
    {
      id: 'unranked',
      title: UNRANKED_TITLE,
      note: `${RANKING_RULE_CLAUSE.charAt(0).toUpperCase()}${RANKING_RULE_CLAUSE.slice(1)}, so these are listed alphabetically rather than placed in the ranking.`,
      items: rest.map((entry) => ({ entry, annotation: null })),
    },
  ];
  return groups.filter((g) => g.items.length);
}

/**
 * Splits `entries` into ordered groups for display.
 * ctx.matchScores: { [id]: number } from the visitor's own quiz result, or null.
 * ctx.reference: see the header comment, or null.
 */
export function sortIntoGroups<E extends ListingEntry>(entries: readonly E[], sortRequested: string, ctx: QueryContext = {}): SortedGroups<E> {
  const sorted = groupEntries(entries, sortRequested, ctx);
  const headlineSort: SortId = sorted.basis === 'match' ? 'recommended' : sorted.sort;
  return {
    ...sorted,
    groups: sorted.groups.map((g) => ({ ...g, items: g.items.map((item) => ({ ...item, headline: headlineScore(item.entry, headlineSort, ctx) })) })),
  };
}

function groupEntries<E extends ListingEntry>(entries: readonly E[], sortRequested: string, ctx: QueryContext): SortedGroups<E> {
  const sort = effectiveSort(sortRequested, ctx);
  const plain = (items: readonly E[]): SortItem<E>[] => items.map((entry) => ({ entry, annotation: null }));
  const one = (items: readonly E[]): SortGroup<E>[] => [{ id: 'all', title: null, note: null, items: plain(items) }];
  const nonEmpty = (groups: SortGroup<E>[]): SortGroup<E>[] => groups.filter((g) => g.items.length);
  const ref = ctx.reference;

  if (sort === 'recommended') {
    const scores = ctx.matchScores;
    if (scores) {
      const scoreOf = (e: E): number => scores[e.id] ?? 0;
      const has = (e: E): boolean => typeof scores[e.id] === 'number';
      const scored = entries.filter(has).sort((a, b) => scoreOf(b) - scoreOf(a) || byName(a, b));
      const rest = entries.filter((e) => !has(e)).sort(byName);
      return {
        sort,
        basis: 'match',
        groups: nonEmpty([
          { id: 'matched', title: null, note: null, items: plain(scored) },
          {
            id: 'unmatched',
            title: 'Outside your quiz results',
            note: 'Your quiz answers (for example a budget or mattress type) filtered these out, so they have no Match Score for you.',
            items: plain(rest),
          },
        ]),
      };
    }
    if (ref?.mean) {
      return { sort, basis: 'reference', groups: referenceGroups(entries, ref.mean, ref.measured, null) };
    }
    return { sort: 'az', basis: null, groups: one([...entries].sort(byName)) };
  }

  if (sort === 'az') {
    return { sort, basis: null, groups: one([...entries].sort(byName)) };
  }

  if (sort === 'price-asc' || sort === 'price-desc') {
    const dir = sort === 'price-asc' ? 1 : -1;
    const price = (e: E): number => e.priceUsd ?? 0;
    const priced = entries.filter(hasQueenPrice).sort((a, b) => dir * (price(a) - price(b)) || byName(a, b));
    const rest = entries.filter((e) => !hasQueenPrice(e)).sort(byName);
    return {
      sort,
      basis: null,
      groups: nonEmpty([
        { id: 'priced', title: null, note: null, items: plain(priced) },
        {
          id: 'unpriced',
          title: 'No comparable Queen price',
          note: 'No confirmed US-dollar Queen price was on file when we checked (missing, due a re-check, or in an unconfirmed currency), so these are not ranked by price.',
          items: plain(rest),
        },
      ]),
    };
  }

  if (isCatalogRatingKey(sort)) {
    const { noun } = CATALOG_RATING_FIELDS[sort];
    const rating = (e: E): number | null => catalogRating(e, sort);
    const rated = entries.filter((e) => rating(e) !== null).sort((a, b) => (rating(b) ?? 0) - (rating(a) ?? 0) || byName(a, b));
    const rest = entries.filter((e) => rating(e) === null).sort(byName);
    return {
      sort,
      basis: null,
      groups: nonEmpty([
        {
          id: 'rated',
          title: null,
          note: null,
          items: rated.map((entry) => ({ entry, annotation: `Independent ${noun} rating: ${fmt10(rating(entry) ?? 0)}` })),
        },
        {
          id: 'unrated',
          title: `No independent ${noun} rating yet`,
          note: `We haven't found a third-party ${noun} rating for these, so they are listed alphabetically rather than guessed.`,
          items: plain(rest),
        },
      ]),
    };
  }

  // Reference sorts: side | back | stomach | pressure | couples. effectiveSort
  // only returns one of these when ctx.reference carries its scores.
  if (!isReferenceSort(sort) || !ref) return { sort: 'az', basis: null, groups: one([...entries].sort(byName)) };
  const scores = ref[sort];
  // 0-100 sorts lead each row with the score itself (headlineScore); only the 0-10 sub-score needs a line.
  const annotate = sort === 'pressure' ? (v: number) => `Pressure-relief sub-score for a reference side sleeper: ${fmt10(v)}` : null;
  return { sort, basis: 'reference', groups: referenceGroups(entries, scores, ref.measured, annotate) };
}

const BEST_FIT_POSITIONS = [
  { id: 'side', label: 'side sleepers' },
  { id: 'back', label: 'back sleepers' },
  { id: 'stomach', label: 'stomach sleepers' },
  { id: 'combination', label: 'combination sleepers' },
] as const;

export interface BestFit {
  position: (typeof BEST_FIT_POSITIONS)[number]['id'];
  /** e.g. "back sleepers". */
  label: string;
  /** The engine's 0-100 score for that reference sleeper. */
  score: number;
  /** Fewer than MIN_MEASURED dimensions are backed by published data, so the score leans on estimates. */
  estimated: boolean;
}

/**
 * A card's one-line positioning: the reference sleeper position (160 lb,
 * neutral, sleeps alone, no firmness preference) the engine scores highest
 * for this mattress. Ties keep the first position in side, back, stomach,
 * combination order. Never computed here: it only picks among engine outputs
 * in ctx.reference, and returns null when there are none.
 */
export function bestFitFor(id: string, reference: CatalogReference | null | undefined): BestFit | null {
  if (!reference) return null;
  let best: BestFit | null = null;
  for (const p of BEST_FIT_POSITIONS) {
    const v = reference[p.id]?.[id];
    if (typeof v !== 'number' || !Number.isFinite(v)) continue;
    if (!best || v > best.score) best = { position: p.id, label: p.label, score: v, estimated: false };
  }
  if (best) best.estimated = (reference.measured?.[id] ?? 0) < MIN_MEASURED;
  return best;
}

export interface PositionScore {
  position: (typeof BEST_FIT_POSITIONS)[number]['id'];
  /** Short column label, e.g. "Side". */
  short: string;
  /** The engine's 0-100 score for that reference sleeper. */
  score: number;
}

const POSITION_SHORT: Readonly<Record<PositionScore['position'], string>> = { side: 'Side', back: 'Back', stomach: 'Stomach', combination: 'Combo' };

/**
 * Every reference sleeper position the engine scored for this mattress, in
 * side, back, stomach, combination order: the secondary detail a gallery card
 * reveals on hover/focus. Only engine outputs from ctx.reference; positions
 * without a score are left out, and an empty list becomes null.
 */
export function positionScoresFor(id: string, reference: CatalogReference | null | undefined): PositionScore[] | null {
  if (!reference) return null;
  const out: PositionScore[] = [];
  for (const p of BEST_FIT_POSITIONS) {
    const v = reference[p.id]?.[id];
    if (typeof v === 'number' && Number.isFinite(v)) out.push({ position: p.id, short: POSITION_SHORT[p.id], score: v });
  }
  return out.length ? out : null;
}
