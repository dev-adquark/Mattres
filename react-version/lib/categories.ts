/**
 * The six real scoring dimensions the engine returns, and how they're
 * labeled/iconified across the UI. Ported from the original project's
 * CATEGORY_LABELS / CATEGORY_DISPLAY constants - kept as one shared source
 * so the gallery, the quiz reasoning, and any future consumer can't drift
 * out of sync with each other or with lib/scoreEngine.ts's actual
 * `rules.categories` order (pressureRelief, support, heat, motion, edge,
 * durability).
 */
import type { ScoreCategory } from '@/lib/types';
import { COOLING_MIN_RATING } from './categoryPages';

/** Reference sleepers the category rankings and catalog sorts are computed for (components/catalog/referenceRankings). */
export type ReferenceProfileId = 'side' | 'back' | 'stomach' | 'combination' | 'couples' | 'hot' | 'firm' | 'soft' | 'heavy';

/** Third-party ratings the catalog carries out of 10 (components/catalog/catalogData CATALOG_RATING_FIELDS). */
export type CatalogRatingKey = 'cooling' | 'motion' | 'edge' | 'durability';

/** X-Ray layer ids (components/three/layers). */
export type DimensionLayerId = 'cover' | 'comfort' | 'transition' | 'support';

export interface ScoreCategoryDisplay {
  key: ScoreCategory;
  label: string;
  short: string;
  icon: string;
}

export const CATEGORIES: readonly ScoreCategoryDisplay[] = [
  { key: 'pressureRelief', label: 'Pressure Relief', short: 'Pressure', icon: 'pressure' },
  { key: 'support', label: 'Support', short: 'Support', icon: 'support' },
  { key: 'heat', label: 'Cooling', short: 'Cooling', icon: 'cooling' },
  { key: 'motion', label: 'Motion Isolation', short: 'Motion', icon: 'motion' },
  { key: 'edge', label: 'Edge Support', short: 'Edge', icon: 'edge' },
  { key: 'durability', label: 'Durability', short: 'Durability', icon: 'durability' },
];

export const CATEGORY_BLURB: Readonly<Record<ScoreCategory, string>> = {
  pressureRelief: 'Contact points where the surface yields to your shape.',
  support: 'An even base keeps your spine level, not sagging or arching.',
  heat: 'Airflow through the surface carries heat away as you sleep.',
  motion: 'Movement on one side fades out before it reaches the other.',
  edge: 'A reinforced perimeter so the edge holds when you sit or sleep near it.',
  durability: 'Material density holds its shape instead of sagging over years of use.',
};

/**
 * Ported exactly from the original project's DIMENSION_TO_LAYER: which
 * X-Ray layer a score dimension jumps to when clicked. Illustrative
 * (which layer a dimension mainly relates to in a typical hybrid
 * construction), not a claim about the specific recommended mattress's
 * exact internal materials, which the catalog doesn't carry yet - same
 * caveat the original project documented alongside this mapping.
 */
export const DIMENSION_TO_LAYER: Readonly<Record<ScoreCategory, DimensionLayerId>> = {
  pressureRelief: 'comfort',
  support: 'support',
  heat: 'cover',
  motion: 'transition',
  edge: 'support',
  durability: 'support',
};

/* ------------------------------------------------------------------------
 * Category landing pages (/mattresses/<slug>)
 *
 * lib/categoryPages.ts is the single registry of WHICH category pages exist
 * and which entries belong on each (nav, search and sitemap read it). The
 * editorial layer below says HOW each page is ranked and introduced. Both
 * are re-exported from here so a page builder needs one import.
 * --------------------------------------------------------------------- */

export {
  CATEGORY_PAGES,
  CATEGORY_SLUGS,
  getCategoryPage,
  entriesForCategory,
  categoryCounts,
  countLabel,
  COOLING_MIN_RATING,
  BUDGET_MAX_USD,
} from './categoryPages';

/**
 * The one wording of the integrity rule, used by the catalog, the category
 * pages and the product-page rank. MIN_MEASURED (components/catalog/referenceRankings) is three. A dimension
 * counts when a published spec (e.g. the manufacturer's firmness) or an
 * independent rating backs it, so "independently measured" would overstate it.
 */
export const RANKING_RULE_CLAUSE = 'fewer than three of the six scored dimensions backed by a published spec or an independent rating';
export const RANKING_RULE_TEXT = `Mattresses with ${RANKING_RULE_CLAUSE} are listed separately, not ranked.`;
export const UNRANKED_TITLE = 'Not enough data to rank';

/** A category page never ships with fewer entries than this (lib/categories.test.ts enforces it). */
export const MIN_CATEGORY_ENTRIES = 6;

/** Next published-price step shown on the budget page, so it is never a thin list of four. */
export const BUDGET_NEXT_STEP_USD = 1500;

export interface CategoryLink {
  href: string;
  label: string;
}

/** How a category page orders its list. */
export type CategoryRanking =
  | { method: 'mean' }
  | { method: 'price-mean' }
  | { method: 'profile'; profile: ReferenceProfileId }
  | { method: 'rating'; rating: CatalogRatingKey };

export type CategoryRankingMethod = CategoryRanking['method'];

export type CategorySecondary =
  | { kind: 'positions' }
  | { kind: 'profile'; profile: ReferenceProfileId; title: readonly [string, string]; intro: string; limit?: number };

export interface CategorySplit {
  id: string;
  title: string;
  intro: string;
  /** A catalog type, or '!type' for everything except that type. */
  type: string;
}

export interface CategoryEditorial {
  eyebrow: string;
  /** [plain, emphasised] */
  title: readonly [string, string];
  /** May hold {placeholders} filled from live counts by the page builder. */
  intro: string;
  note?: string;
  ranking: CategoryRanking;
  rule: string;
  column?: CatalogRatingKey;
  secondary?: CategorySecondary;
  split?: readonly CategorySplit[];
  flag?: { when: 'multi-firmness'; text: string };
  positionGuide?: CategoryLink;
  guides: readonly string[];
  related: readonly string[];
}

const POSITION_GUIDE: Readonly<Record<'side' | 'back' | 'stomach', CategoryLink>> = {
  side: { href: '/sleep-position/side', label: 'The side-sleeper guide' },
  back: { href: '/sleep-position/back', label: 'The back-sleeper guide' },
  stomach: { href: '/sleep-position/stomach', label: 'The stomach-sleeper guide' },
};

/**
 * slug -> editorial config.
 *   eyebrow, title [plain, emphasised], intro (may hold {placeholders} filled
 *   from live counts by the page), note? (extra honesty copy)
 *   ranking: { method: 'mean' | 'profile' | 'rating' | 'price-mean', profile?, rating? }
 *   rule: one sentence stating exactly how the list is ordered
 *   column?: extra third-party rating shown next to each row ('motion' | 'cooling')
 *   secondary?: { kind: 'positions' } | { kind: 'profile', profile, title, intro, limit }
 *   split?: [{ id, title, intro, type?: catalog type | '!type' }] - sub-lists by type
 *   flag?: { when: 'multi-firmness', text } - a quiet marker on qualifying rows
 *   positionGuide?: { href, label }
 *   guides: guide slugs (lib/content/guides) worth reading next
 *   related: sibling category slugs
 */
export const CATEGORY_EDITORIAL: Readonly<Record<string, CategoryEditorial>> = {
  best: {
    eyebrow: 'Ranked by Match Score',
    title: ['Best mattresses', 'by Match Score.'],
    intro:
      'Every mattress we track, ranked by the scoring engine for four reference sleepers at once. Not a list of favorites, not paid placement: the same rules, applied to every entry, with every score explained.',
    ranking: { method: 'mean' },
    rule: 'Ordered by the average of four reference scores (side, back, stomach and combination sleeper). Ties go to the entry with more dimensions backed by a published spec or an independent rating.',
    secondary: { kind: 'positions' },
    guides: ['how-to-choose-mattress-firmness', 'mattress-types-explained', 'mattress-buying-checklist'],
    related: ['side-sleepers', 'back-sleepers', 'stomach-sleepers', 'couples', 'cooling', 'hybrid'],
  },
  'side-sleepers': {
    eyebrow: 'Sleep position',
    title: ['Mattresses for', 'side sleepers.'],
    intro:
      'Side sleeping loads the shoulder and hip. The engine weights pressure relief up for this position and checks that firmness stays inside the band that keeps a 160 lb spine level.',
    ranking: { method: 'profile', profile: 'side' },
    rule: 'Ordered by Match Score for the reference side sleeper.',
    positionGuide: POSITION_GUIDE.side,
    guides: ['pressure-relief-for-side-sleepers', 'how-to-choose-mattress-firmness', 'mattress-types-explained'],
    related: ['soft', 'couples', 'memory-foam', 'back-sleepers', 'stomach-sleepers'],
  },
  'back-sleepers': {
    eyebrow: 'Sleep position',
    title: ['Mattresses for', 'back sleepers.'],
    intro:
      'Back sleepers need even support under the lower back more than deep cushioning. The engine checks firmness against the band for a 160 lb back sleeper and weights support accordingly.',
    ranking: { method: 'profile', profile: 'back' },
    rule: 'Ordered by Match Score for the reference back sleeper.',
    positionGuide: POSITION_GUIDE.back,
    guides: ['back-support-for-heavier-sleepers', 'how-to-choose-mattress-firmness', 'edge-support-explained'],
    related: ['firm', 'heavier-sleepers', 'hybrid', 'side-sleepers', 'stomach-sleepers'],
  },
  'stomach-sleepers': {
    eyebrow: 'Sleep position',
    title: ['Mattresses for', 'stomach sleepers.'],
    intro:
      'Face-down, the hips are the heaviest point and sink first. The engine rewards a firmer, flatter surface for this position and penalizes anything soft enough to let the lower back arch.',
    ranking: { method: 'profile', profile: 'stomach' },
    rule: 'Ordered by Match Score for the reference stomach sleeper.',
    positionGuide: POSITION_GUIDE.stomach,
    guides: ['how-to-choose-mattress-firmness', 'back-support-for-heavier-sleepers', 'mattress-types-explained'],
    related: ['firm', 'back-sleepers', 'hybrid', 'side-sleepers'],
  },
  couples: {
    eyebrow: 'Sharing a bed',
    title: ['Mattresses for', 'couples.'],
    intro:
      'For two people, the question is how much of one sleeper’s movement reaches the other. This ranking assumes a partner who wakes easily, so motion isolation carries far more of the score than it does for someone sleeping alone.',
    ranking: { method: 'profile', profile: 'couples' },
    rule: 'Ordered by Match Score for the reference couple. The independent motion-isolation rating is shown beside each score where one exists.',
    column: 'motion',
    guides: ['motion-isolation-for-couples', 'edge-support-explained', 'mattress-buying-checklist'],
    related: ['side-sleepers', 'memory-foam', 'hybrid', 'cooling'],
  },
  'heavier-sleepers': {
    eyebrow: 'Body weight',
    title: ['Mattresses for', 'heavier sleepers.'],
    intro:
      'Above 230 lb the engine moves to its heaviest weight band: the recommended firmness range shifts firmer, support counts for more, and low-durability builds are flagged for sagging risk.',
    ranking: { method: 'profile', profile: 'heavy' },
    rule: 'Ordered by Match Score for a 260 lb reference back sleeper.',
    guides: ['back-support-for-heavier-sleepers', 'edge-support-explained', 'how-to-choose-mattress-firmness'],
    related: ['firm', 'back-sleepers', 'hybrid', 'stomach-sleepers'],
  },
  cooling: {
    eyebrow: 'Temperature',
    title: ['Cooling', 'mattresses.'],
    intro:
      `Only mattresses an independent reviewer rated ${COOLING_MIN_RATING}/10 or higher for cooling are on this page, ranked by that rating. Lower-rated and unrated mattresses are left off. Marketing claims (“sleeps 4x cooler”) are not a rating, so they don’t count here.`,
    ranking: { method: 'rating', rating: 'cooling' },
    rule: `Only mattresses with an independent cooling rating of ${COOLING_MIN_RATING}/10 or higher appear, ordered by that rating, highest first. Ties go to the higher Match Score for the reference hot sleeper.`,
    secondary: {
      kind: 'profile',
      profile: 'hot',
      title: ['For a hot sleeper,', 'by Match Score.'],
      intro: 'Cooling is one of six things that matter to a hot sleeper. Here is the whole catalog ranked by the engine for one, where the cooling sub-score counts for more.',
      limit: 6,
    },
    guides: ['mattresses-for-hot-sleepers', 'cooling-mattress-comparison', 'mattress-types-explained'],
    related: ['latex', 'hybrid', 'couples', 'side-sleepers'],
  },
  firm: {
    eyebrow: 'Firmness',
    title: ['Firm', 'mattresses.'],
    intro:
      'Every mattress whose published firmness reaches 8/10. Most of them are sold in several firmness options and only one of those is firm, so each row says which kind it is.',
    ranking: { method: 'profile', profile: 'firm' },
    rule: 'Ordered by Match Score for a reference back sleeper who prefers a firm feel.',
    flag: { when: 'multi-firmness', text: 'Available in a firm option' },
    guides: ['how-to-choose-mattress-firmness', 'back-support-for-heavier-sleepers', 'mattress-types-explained'],
    related: ['back-sleepers', 'stomach-sleepers', 'heavier-sleepers', 'soft'],
  },
  soft: {
    eyebrow: 'Firmness',
    title: ['The softest mattresses', 'we track.'],
    intro:
      'Every mattress whose published firmness reaches medium-soft. None of the mattresses we track is rated below 3/10, so nothing here is truly soft, and we say so rather than stretch the word.',
    note: 'The best score here is a Good match, not Strong. A side sleeper who wants a soft feel sits outside the firmness band the engine recommends for supporting a 160 lb spine, so the preference costs points on every mattress. The ranking shows that cost rather than hiding it.',
    ranking: { method: 'profile', profile: 'soft' },
    rule: 'Ordered by Match Score for a reference side sleeper who prefers a soft feel.',
    flag: { when: 'multi-firmness', text: 'Available in a softer option' },
    guides: ['pressure-relief-for-side-sleepers', 'how-to-choose-mattress-firmness', 'mattress-types-explained'],
    related: ['side-sleepers', 'memory-foam', 'couples', 'firm'],
  },
  hybrid: {
    eyebrow: 'Construction',
    title: ['Hybrid', 'mattresses.'],
    intro: 'Coil support under foam or latex comfort layers: the most common build in the catalog, and the widest range of feels.',
    ranking: { method: 'mean' },
    rule: 'Ordered by the average of four reference scores (side, back, stomach and combination sleeper).',
    guides: ['mattress-types-explained', 'edge-support-explained', 'how-to-choose-mattress-firmness'],
    related: ['foam', 'latex', 'memory-foam', 'best'],
  },
  foam: {
    eyebrow: 'Construction',
    title: ['All-foam', 'mattresses.'],
    intro:
      'No coils, only foam layers. That includes Purple’s polymer-grid models, which are all-foam builds but not memory foam, so this page is called all-foam rather than memory foam.',
    ranking: { method: 'mean' },
    rule: 'Ordered by the average of four reference scores (side, back, stomach and combination sleeper).',
    guides: ['mattress-types-explained', 'motion-isolation-for-couples', 'mattresses-for-hot-sleepers'],
    related: ['memory-foam', 'hybrid', 'latex', 'couples'],
  },
  'memory-foam': {
    eyebrow: 'Materials',
    title: ['Memory foam', 'mattresses.'],
    intro:
      'Mattresses whose manufacturer construction notes list a memory foam layer, in all-foam and hybrid builds alike. We match the published words; we have not cut these open.',
    ranking: { method: 'mean' },
    rule: 'Ordered by the average of four reference scores (side, back, stomach and combination sleeper). Membership: construction notes list memory foam.',
    guides: ['mattress-materials-explained', 'mattresses-for-hot-sleepers', 'pressure-relief-for-side-sleepers'],
    related: ['foam', 'hybrid', 'latex', 'side-sleepers'],
  },
  latex: {
    eyebrow: 'Materials',
    title: ['Mattresses', 'with latex.'],
    intro:
      'Two are all-latex. The rest are hybrids with a latex comfort layer over coils. They are listed separately because they feel and behave differently.',
    ranking: { method: 'mean' },
    rule: 'Ordered by the average of four reference scores within each group. Membership: type is latex, or the construction notes list latex.',
    split: [
      { id: 'all-latex', title: 'All-latex', type: 'latex', intro: 'Latex from top to bottom, no coils.' },
      { id: 'latex-hybrid', title: 'Latex hybrids', type: '!latex', intro: 'A latex comfort layer over a coil support core.' },
    ],
    guides: ['mattress-materials-explained', 'mattress-types-explained', 'mattresses-for-hot-sleepers'],
    related: ['hybrid', 'foam', 'cooling', 'best'],
  },
  'under-1000': {
    eyebrow: 'Price',
    title: ['Under $1,000,', 'and the next step up.'],
    intro:
      'Only {budgetCount} mattresses have a published Queen price under $1,000, so the next {nextCount}, up to $1,500, are shown beneath them rather than padding the list. {unpricedNote}',
    ranking: { method: 'price-mean' },
    rule: 'Grouped by published Queen price, then ordered within each group by the average of four reference scores.',
    guides: ['mattress-buying-checklist', 'mattress-types-explained', 'how-to-choose-mattress-firmness'],
    related: ['best', 'hybrid', 'foam', 'couples'],
  },
};

export function getCategoryEditorial(slug: string): CategoryEditorial | null {
  return CATEGORY_EDITORIAL[slug] ?? null;
}
