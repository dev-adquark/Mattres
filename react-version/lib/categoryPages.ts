/**
 * Category landing pages (/mattresses/<slug>): ONE registry shared by the
 * mega-navigation, global search, the sitemap and the category route.
 *
 * Every category is defined by a predicate over REAL catalog fields, so a
 * count shown anywhere ("23 hybrids scored") is computed, never typed in.
 * Categories the data cannot support are deliberately absent:
 *   - organic (no structured certifications), extra-firm and true soft
 *     (0 entries), innerspring (1 entry), "highest rated overall" (no field).
 *
 * Shape of an entry:
 *   slug, href, title (page title / H1 seed), navLabel (mega-nav),
 *   chip (short label for chips / search), group, description (honest one
 *   liner), terms (search words), filter(entry) -> boolean,
 *   (How each page is RANKED lives in lib/categories CATEGORY_EDITORIAL and
 *   components/catalog/referenceRankings REFERENCE_PROFILES - one source, so
 *   the home cards and the category pages cannot drift apart.)
 *   countNoun (singular/plural used in "<n> <noun> scored").
 *
 * Pure and client-safe (no catalog import): pass entries in.
 */

import { comparableQueenPriceUsd } from '@/lib/commerce';
import type { CategoryPage, FirmnessRange, MattressEntry, SleepProfile } from './types';

/** A registry entry before its href is derived from the slug. */
type CategoryDef = Omit<CategoryPage, 'href'>;

const num = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const range = (e: MattressEntry | null | undefined): FirmnessRange | null => (e && e.firmnessRange && num(e.firmnessRange.min) && num(e.firmnessRange.max) ? e.firmnessRange : null);
const notes = (e: MattressEntry | null | undefined): string => String((e && e.coreMaterialNotes) || '').toLowerCase();

/** Cooling threshold shared by the category page and the search "cooling" tag. */
export const COOLING_MIN_RATING = 7;
/** Published price (priceUsd, the Queen comparison price) strictly below this. */
export const BUDGET_MAX_USD = 1000;

/** Default reference sleeper for content links (lib/content/links). Category rankings use REFERENCE_PROFILES. */
export const REFERENCE_PROFILE: Readonly<SleepProfile> = Object.freeze({
  sleepPosition: 'combination',
  weightLb: 160,
  preferredFirmnessLabel: 'medium',
  sleepTemperature: 'neutral',
  motionSensitivity: 'single',
  mattressTypePreference: [],
});

const all = (): boolean => true;

export const CATEGORY_PAGES: readonly CategoryPage[] = Object.freeze(([

  {
    slug: 'best',
    title: 'Best mattresses',
    navLabel: 'Best Mattresses',
    chip: 'Best overall',
    group: 'best',
    description: 'Every mattress in the catalog, ranked by Match Score for a reference sleeper. Change the profile to re-rank.',
    terms: 'best top ranked overall all mattresses',
    filter: all,
    countNoun: ['mattress', 'mattresses'],
  },
  {
    slug: 'side-sleepers',
    title: 'Mattresses for side sleepers',
    navLabel: 'Side sleepers',
    chip: 'Side sleepers',
    group: 'position',
    description: 'Ranked for a side sleeper, where pressure relief at the shoulders and hips carries the most weight.',
    terms: 'side sleeper sleepers sleeping shoulder hip pressure',
    filter: all,
    countNoun: ['mattress', 'mattresses'],
  },
  {
    slug: 'back-sleepers',
    title: 'Mattresses for back sleepers',
    navLabel: 'Back sleepers',
    chip: 'Back sleepers',
    group: 'position',
    description: 'Ranked for a back sleeper, where even support that keeps the lower back level matters most.',
    terms: 'back sleeper sleepers sleeping lumbar support',
    filter: all,
    countNoun: ['mattress', 'mattresses'],
  },
  {
    slug: 'stomach-sleepers',
    title: 'Mattresses for stomach sleepers',
    navLabel: 'Stomach sleepers',
    chip: 'Stomach sleepers',
    group: 'position',
    description: 'Ranked for a stomach sleeper, where a firmer surface keeps the hips from sinking.',
    terms: 'stomach sleeper sleepers sleeping front',
    filter: all,
    countNoun: ['mattress', 'mattresses'],
  },
  {
    slug: 'couples',
    title: 'Mattresses for couples',
    navLabel: 'Mattresses for couples',
    chip: 'Couples',
    group: 'feature',
    description: 'Ranked for two people sharing a bed with a partner who is easily woken, so motion isolation counts for more.',
    terms: 'couples couple partner motion isolation two sleepers',
    filter: all,
    countNoun: ['mattress', 'mattresses'],
  },
  {
    slug: 'heavier-sleepers',
    title: 'Mattresses for heavier sleepers',
    navLabel: 'Heavier sleepers',
    chip: 'Heavier sleepers',
    group: 'feature',
    description: 'Ranked for a 260 lb back sleeper, where support and durability carry more of the score.',
    terms: 'heavy heavier sleepers plus size weight support durable',
    filter: all,
    countNoun: ['mattress', 'mattresses'],
  },
  {
    slug: 'cooling',
    title: 'Cooling mattresses',
    navLabel: 'Cooling',
    chip: 'Cooling',
    group: 'feature',
    description: `Mattresses with an independent cooling rating of ${COOLING_MIN_RATING}/10 or higher on file. Mattresses without a rating are not included.`,
    terms: 'cool cooling cooler hot sleeper sleepers temperature heat breathable',
    filter: (e) => num(e.coolingRatingOutOf10) && e.coolingRatingOutOf10 >= COOLING_MIN_RATING,
    countNoun: ['cooling mattress', 'cooling mattresses'],
  },
  {
    slug: 'firm',
    title: 'Firm mattresses',
    navLabel: 'Firm',
    chip: 'Firm',
    group: 'firmness',
    description: 'Mattresses whose published firmness range reaches 8/10 or firmer.',
    terms: 'firm firmer hard supportive stiff',
    filter: (e) => {
      const r = range(e);
      return Boolean(r && r.max >= 8);
    },
    countNoun: ['firm mattress', 'firm mattresses'],
  },
  {
    slug: 'soft',
    title: 'Softer mattresses',
    navLabel: 'Softer',
    chip: 'Softer',
    group: 'firmness',
    description: 'Mattresses whose published firmness range reaches medium-soft (4.5/10) or softer. No mattress in the catalog is rated truly soft.',
    terms: 'soft softer plush medium soft cushion',
    filter: (e) => {
      const r = range(e);
      return Boolean(r && r.min <= 4.5);
    },
    countNoun: ['softer mattress', 'softer mattresses'],
  },
  {
    slug: 'hybrid',
    title: 'Hybrid mattresses',
    navLabel: 'Hybrid',
    chip: 'Hybrid',
    group: 'type',
    description: 'Coil support cores under foam or latex comfort layers. Every hybrid we track, with firmness, a Queen price where published and its Match Score for a reference sleeper.',
    terms: 'hybrid hybrids coil coils spring springs',
    filter: (e) => e.type === 'hybrid',
    countNoun: ['hybrid', 'hybrids'],
  },
  {
    slug: 'foam',
    title: 'All-foam mattresses',
    navLabel: 'All-foam',
    chip: 'All-foam',
    group: 'type',
    description: 'Mattresses built entirely from foam layers, with no coils. Every all-foam model we track, with firmness, a Queen price where published and its Match Score for a reference sleeper.',
    terms: 'foam all foam allfoam',
    filter: (e) => e.type === 'foam',
    countNoun: ['all-foam mattress', 'all-foam mattresses'],
  },
  {
    slug: 'memory-foam',
    title: 'Memory foam mattresses',
    navLabel: 'Memory foam',
    chip: 'Memory foam',
    group: 'type',
    description: 'Mattresses whose published construction notes list a memory foam layer, in a foam or hybrid build.',
    terms: 'memory foam viscoelastic contour hug',
    filter: (e) => /memory[\s-]?foam/.test(notes(e)),
    countNoun: ['memory foam mattress', 'memory foam mattresses'],
  },
  {
    slug: 'latex',
    title: 'Mattresses with latex',
    navLabel: 'Latex',
    chip: 'Latex',
    group: 'type',
    description: 'Mattresses whose published construction notes list a latex layer. Only two are all-latex builds.',
    terms: 'latex natural rubber dunlop talalay',
    filter: (e) => e.type === 'latex' || /latex/.test(notes(e)),
    countNoun: ['mattress with latex', 'mattresses with latex'],
  },
  {
    slug: 'under-1000',
    title: 'Mattresses under $1,000',
    navLabel: 'Under $1,000',
    chip: 'Under $1,000',
    group: 'feature',
    description: 'Mattresses with a published Queen price below $1,000. Mattresses without a published price are not included.',
    terms: 'under 1000 $1000 cheap budget affordable value price',
    filter: (e) => {
      // Only a comparable price: confirmed USD and not flagged for a re-check (lib/commerce).
      const price = comparableQueenPriceUsd(e);
      return price !== null && price < BUDGET_MAX_USD;
    },
    countNoun: ['mattress', 'mattresses'],
  },
] satisfies CategoryDef[]).map((c): CategoryPage => Object.freeze({ ...c, href: `/mattresses/${c.slug}` })));

export const CATEGORY_SLUGS: string[] = CATEGORY_PAGES.map((c) => c.slug);

export function getCategoryPage(slug: string): CategoryPage | null {
  return CATEGORY_PAGES.find((c) => c.slug === slug) || null;
}

/** Catalog entries that belong on a category page (unranked). */
export function entriesForCategory<T extends MattressEntry>(slugOrCategory: string | CategoryPage | null | undefined, entries: readonly T[] = []): T[] {
  const cat = typeof slugOrCategory === 'string' ? getCategoryPage(slugOrCategory) : slugOrCategory;
  if (!cat) return [];
  return entries.filter((e) => {
    try {
      return Boolean(cat.filter(e));
    } catch {
      return false;
    }
  });
}

/** { slug: count } for every category. */
export function categoryCounts(entries: readonly MattressEntry[] = []): Record<string, number> {
  return Object.fromEntries(CATEGORY_PAGES.map((c) => [c.slug, entriesForCategory(c, entries).length]));
}

/** "23 hybrids" / "1 hybrid" */
export function countLabel(slugOrCategory: string | CategoryPage | null | undefined, n: number): string {
  const cat = typeof slugOrCategory === 'string' ? getCategoryPage(slugOrCategory) : slugOrCategory;
  const [one, many] = (cat && cat.countNoun) || ['mattress', 'mattresses'];
  return `${n} ${n === 1 ? one : many}`;
}

/**
 * Category tags derived from real data, for search terms and chips.
 * Only tags whose underlying field is on file are emitted.
 */
export function categoryTagsFor(entry: MattressEntry | null | undefined): string[] {
  if (!entry) return [];
  return CATEGORY_PAGES.filter((c) => c.filter !== all && c.filter(entry)).map((c) => c.slug);
}
