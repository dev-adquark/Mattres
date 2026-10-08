import { displayTitle } from '@/lib/format';
import { getCategoryPage, entriesForCategory, getCategoryEditorial, BUDGET_MAX_USD, BUDGET_NEXT_STEP_USD } from '@/lib/categories';
import type { CategoryEditorial, CategoryRankingMethod, ReferenceProfileId } from '@/lib/categories';
import { tierFor } from '@/lib/scoreTiers';
import type { MattressEntry, MattressType } from '@/lib/types';
import { REFERENCE_PROFILES, MEAN_POSITIONS, MEAN_TEXT, MIN_MEASURED, scoreReferenceProfiles, meanScores } from './referenceRankings';
import type { MeanPosition, ProfileScores, ScoredProfiles } from './referenceRankings';
import { catalogRating, CATALOG_RATING_FIELDS, isMultiFirmness, hasQueenPrice } from './catalogData';
import { priceAwaitingRecheck, queenPriceOf } from '@/lib/commerce';

/**
 * Builds everything a /mattresses/<category> page shows, from the catalog
 * and the scoring engine. No copy in here invents a number: every score,
 * rating and reason is read from the engine output or the entry itself.
 */

export type CategoryMetric =
  | { kind: 'score'; value: number; display: string; label: string; tier: string }
  | { kind: 'rating'; value: number; display: string; label: string; tier?: undefined };

export interface CategoryColumn {
  label: string;
  value: number | null;
  display: string | null;
}

export interface CategoryRow {
  id: string;
  entry: MattressEntry;
  title: string;
  measured: number;
  metric: CategoryMetric | null;
  column: CategoryColumn | null;
  positions: { id: MeanPosition; label: string; score: number | null }[] | null;
  explainedFor: string | null;
  headline: string | null;
  reasons: string[];
  watchOut: { title: string | null; text: string | null } | null;
  flag: string | null;
  sources: { name: string; url: string | null }[];
}

/** A row on the ranking: always has a metric, and a 1-based rank. */
export interface RankedRow extends CategoryRow {
  metric: CategoryMetric;
  rank: number;
}

export interface CategoryList {
  id: string;
  title: string | null;
  intro: string | null;
  /**
   * True when every member meets the category's own definition. False for a
   * comparison group shown alongside it (the budget page's "next step up"),
   * which must never be published as part of the category (e.g. in JSON-LD).
   */
  inCategory: boolean;
  ranked: RankedRow[];
  unranked: CategoryRow[];
}

export interface PositionPick {
  position: MeanPosition;
  label: string;
  entry: MattressEntry;
  title: string;
  score: number;
  headline: string | null;
  href: string | null;
}

export interface ProfileRow {
  rank: number;
  id: string;
  entry: MattressEntry;
  title: string;
  score: number;
  tier: string;
  headline: string | null;
}

export type CategorySecondaryView =
  | { kind: 'positions'; items: PositionPick[] }
  | { kind: 'profile'; title: readonly [string, string]; intro: string; profileText: string; rows: ProfileRow[] };

export interface CategoryView {
  slug: string;
  href: string;
  category: { slug: string; title: string; chip: string; description: string; group: string };
  editorial: CategoryEditorial;
  modelVersion: string | null;
  method: CategoryRankingMethod;
  profileText: string;
  eligibleCount: number;
  shown: number;
  rankedCount: number;
  total: number;
  lists: CategoryList[];
  podium: RankedRow[];
  /** Which list the podium was taken from (its first rows are not repeated), or null. */
  podiumList: string | null;
  secondary: CategorySecondaryView | null;
  excluded: { ratedBelow: number; unrated: number } | null;
}

interface RowContext {
  profiles: ScoredProfiles;
  mean: Record<string, number>;
}

const byTitle = (a: MattressEntry, b: MattressEntry): number => displayTitle(a).localeCompare(displayTitle(b));
const formatOutOf10 = (v: number): string => `${Number.isInteger(v) ? v : v.toFixed(1)}/10`;
const isRanked = (r: CategoryRow): r is CategoryRow & { metric: CategoryMetric } => r.metric !== null;

/** The secondary-list profile a rating page explains with, defaulting to the combination sleeper. */
function secondaryProfile(ed: CategoryEditorial): ReferenceProfileId {
  return ed.secondary?.kind === 'profile' ? ed.secondary.profile : 'combination';
}

function profilesNeeded(ed: CategoryEditorial): ReferenceProfileId[] {
  const ids = new Set<ReferenceProfileId>();
  const r = ed.ranking;
  if (r.method === 'mean' || r.method === 'price-mean') MEAN_POSITIONS.forEach((p) => ids.add(p));
  if (r.method === 'profile') ids.add(r.profile);
  if (r.method === 'rating') ids.add(secondaryProfile(ed));
  if (ed.secondary?.kind === 'positions') MEAN_POSITIONS.forEach((p) => ids.add(p));
  if (ed.secondary?.kind === 'profile') ids.add(ed.secondary.profile);
  if (!ids.size) ids.add('combination');
  return [...ids];
}

/** The engine explanation shown on podium modules: which profile it describes. */
function explainProfileFor(ed: CategoryEditorial): ReferenceProfileId {
  if (ed.ranking.method === 'profile') return ed.ranking.profile;
  if (ed.ranking.method === 'rating') return secondaryProfile(ed);
  return 'combination';
}

function makeRow(entry: MattressEntry, ctx: RowContext, ed: CategoryEditorial): CategoryRow {
  const { profiles, mean } = ctx;
  const explainId = explainProfileFor(ed);
  const ex = profiles[explainId]?.[entry.id] || null;
  const anyProfile: ProfileScores = Object.values(profiles)[0] || {};
  const measured = anyProfile[entry.id]?.measured ?? 0;

  let metric: CategoryMetric | null = null;
  const r = ed.ranking;
  if (r.method === 'profile') {
    const s = profiles[r.profile]?.[entry.id];
    if (s) metric = { kind: 'score', value: s.score, display: String(s.score), label: 'Match Score', tier: tierFor(s.score).label };
  } else if (r.method === 'mean' || r.method === 'price-mean') {
    const v = mean[entry.id];
    if (typeof v === 'number') metric = { kind: 'score', value: v, display: v.toFixed(1), label: 'Average reference score', tier: tierFor(v).label };
  } else if (r.method === 'rating') {
    const v = catalogRating(entry, r.rating);
    if (v !== null) metric = { kind: 'rating', value: v, display: formatOutOf10(v), label: `Independent ${CATALOG_RATING_FIELDS[r.rating].noun} rating` };
  }

  let column: CategoryColumn | null = null;
  if (ed.column) {
    const v = catalogRating(entry, ed.column);
    column = { label: `${CATALOG_RATING_FIELDS[ed.column].label} rating`, value: v, display: v === null ? null : formatOutOf10(v) };
  }

  const positions =
    r.method === 'mean' || r.method === 'price-mean'
      ? MEAN_POSITIONS.map((p) => ({ id: p, label: REFERENCE_PROFILES[p].label, score: profiles[p]?.[entry.id]?.score ?? null }))
      : null;

  return {
    id: entry.id,
    entry,
    title: displayTitle(entry),
    measured,
    metric,
    column,
    positions,
    explainedFor: REFERENCE_PROFILES[explainId]?.label || null,
    headline: ex?.headline || null,
    reasons: ex ? ex.reasons.slice(0, 2) : [],
    watchOut: ex && ex.watchOuts.length ? (ex.watchOuts[0] ?? null) : null,
    flag: ed.flag && ed.flag.when === 'multi-firmness' && isMultiFirmness(entry) ? ed.flag.text : null,
    sources: Array.isArray(entry.reviewSources)
      ? entry.reviewSources
          .filter((s) => s && s.sourceName)
          .map((s) => ({ name: s.sourceName, url: typeof s.sourceUrl === 'string' && /^https:\/\//.test(s.sourceUrl) ? s.sourceUrl : null }))
      : [],
  };
}

type MetricRow = CategoryRow & { metric: CategoryMetric };

/** Splits rows into ranked (integrity rule) and unranked, and orders both. */
function rankRows(rows: CategoryRow[], ed: CategoryEditorial, ctx: RowContext): { ranked: MetricRow[]; unranked: CategoryRow[] } {
  if (ed.ranking.method === 'rating') {
    const hot = ctx.profiles[secondaryProfile(ed)] || {};
    const ranked = rows
      .filter(isRanked)
      .sort((a, b) => b.metric.value - a.metric.value || (hot[b.id]?.score ?? 0) - (hot[a.id]?.score ?? 0) || a.id.localeCompare(b.id));
    const unranked = rows.filter((r) => !r.metric).sort((a, b) => byTitle(a.entry, b.entry));
    return { ranked, unranked };
  }
  const eligible = (r: CategoryRow): r is MetricRow => isRanked(r) && r.measured >= MIN_MEASURED;
  const ranked = rows.filter(eligible).sort((a, b) => b.metric.value - a.metric.value || b.measured - a.measured || a.id.localeCompare(b.id));
  const unranked = rows.filter((r) => !eligible(r)).sort((a, b) => byTitle(a.entry, b.entry));
  return { ranked, unranked };
}

function number(rows: MetricRow[]): RankedRow[] {
  return rows.map((r, i) => ({ ...r, rank: i + 1 }));
}

/** The best-scoring entry (with enough measured data) for one profile, ties by id. */
function rankedByProfile(entries: readonly MattressEntry[], scores: ProfileScores): MattressEntry[] {
  const scoreOf = (e: MattressEntry): number => scores[e.id]?.score ?? 0;
  return entries
    .filter((e) => (scores[e.id]?.measured ?? 0) >= MIN_MEASURED)
    .sort((a, b) => scoreOf(b) - scoreOf(a) || a.id.localeCompare(b.id));
}

interface DraftList {
  id: string;
  title: string | null;
  intro: string | null;
  inCategory: boolean;
  members: MattressEntry[];
}

function matchesSplitType(type: MattressType, splitType: string): boolean {
  return splitType.startsWith('!') ? type !== splitType.slice(1) : type === splitType;
}

/** @returns null for an unknown slug. */
export async function buildCategoryView(slug: string, entries: readonly MattressEntry[]): Promise<CategoryView | null> {
  const cat = getCategoryPage(slug);
  const ed = getCategoryEditorial(slug);
  if (!cat || !ed) return null;

  const { modelVersion, profiles } = await scoreReferenceProfiles(profilesNeeded(ed));
  const mean = meanScores(profiles);
  const ctx: RowContext = { profiles, mean };
  const eligible: MattressEntry[] = entriesForCategory(cat, [...entries]);
  const m = ed.ranking.method;

  // Lists: one by default; type splits (latex); price bands (budget).
  let lists: DraftList[];
  if (ed.split) {
    lists = ed.split.map((s) => ({ id: s.id, title: s.title, intro: s.intro, inCategory: true, members: eligible.filter((e) => matchesSplitType(e.type, s.type)) }));
  } else if (m === 'price-mean') {
    const next = entries.filter((e) => hasQueenPrice(e) && (e.priceUsd ?? 0) >= BUDGET_MAX_USD && (e.priceUsd ?? 0) < BUDGET_NEXT_STEP_USD);
    lists = [
      { id: 'under-1000', title: 'Under $1,000', intro: 'Published Queen price below $1,000.', inCategory: true, members: eligible },
      { id: 'under-1500', title: '$1,000 to $1,499', intro: 'The next step up, for comparison.', inCategory: false, members: next },
    ];
  } else {
    lists = [{ id: 'all', title: null, intro: null, inCategory: true, members: eligible }];
  }

  const builtLists: CategoryList[] = lists.map((l) => {
    const rows = l.members.map((e) => makeRow(e, ctx, ed));
    const { ranked, unranked } = rankRows(rows, ed, ctx);
    return { id: l.id, title: l.title, intro: l.intro, inCategory: l.inCategory, ranked: number(ranked), unranked };
  });

  const shown = builtLists.reduce((n, l) => n + l.ranked.length + l.unranked.length, 0);
  const rankedCount = builtLists.reduce((n, l) => n + l.ranked.length, 0);

  // Podium: the top three of the first list; across a type split, the top
  // three of all groups together (the groups below then list everyone).
  const podium = ed.split
    ? builtLists
        .flatMap((l) => l.ranked)
        .sort((a, b) => b.metric.value - a.metric.value || b.measured - a.measured || a.id.localeCompare(b.id))
        .slice(0, 3)
        .map((r, i) => ({ ...r, rank: i + 1 }))
    : (builtLists[0]?.ranked.slice(0, 3) ?? []);
  const podiumList = ed.split ? null : (builtLists[0]?.id ?? null);

  let secondary: CategorySecondaryView | null = null;
  const sec = ed.secondary;
  if (sec?.kind === 'positions') {
    const items: PositionPick[] = [];
    for (const p of MEAN_POSITIONS) {
      const scores = profiles[p] ?? {};
      const best = rankedByProfile(entries, scores)[0];
      const s = best ? scores[best.id] : undefined;
      if (best && s) {
        items.push({ position: p, label: REFERENCE_PROFILES[p].label, entry: best, title: displayTitle(best), score: s.score, headline: s.headline, href: p === 'combination' ? null : `/mattresses/${p}-sleepers` });
      }
    }
    secondary = { kind: 'positions', items };
  } else if (sec?.kind === 'profile') {
    const scores = profiles[sec.profile] ?? {};
    const rows: ProfileRow[] = rankedByProfile(entries, scores)
      .slice(0, sec.limit || 6)
      .map((e, i) => {
        const score = scores[e.id]?.score ?? 0;
        return { rank: i + 1, id: e.id, entry: e, title: displayTitle(e), score, tier: tierFor(score).label, headline: scores[e.id]?.headline ?? null };
      });
    secondary = { kind: 'profile', title: sec.title, intro: sec.intro, profileText: REFERENCE_PROFILES[sec.profile].text, rows };
  }

  // What "ranked for" means on this page, in plain words.
  const r = ed.ranking;
  const profileText =
    r.method === 'profile'
      ? REFERENCE_PROFILES[r.profile].text
      : r.method === 'rating'
        ? `Independent ${CATALOG_RATING_FIELDS[r.rating].noun} ratings from the review sources linked on each mattress page. Podium notes describe a reference hot sleeper.`
        : MEAN_TEXT;

  // Entries left off a rating page, so the page can say how many and why.
  let excluded: CategoryView['excluded'] = null;
  if (r.method === 'rating') {
    const rated = entries.filter((e) => catalogRating(e, r.rating) !== null);
    excluded = {
      ratedBelow: rated.filter((e) => !eligible.includes(e)).length,
      unrated: entries.length - rated.length,
    };
  }

  const nextList = builtLists[1];
  const counts: Record<string, string | number> = {
    budgetCount: eligible.length,
    nextCount: nextList ? nextList.ranked.length + nextList.unranked.length : 0,
    unpricedNote: unpricedNote(entries),
  };
  const intro = ed.intro.replace(/\{(\w+)\}/g, (_, k: string) => (k in counts ? String(counts[k]) : ''));

  return {
    slug,
    href: cat.href,
    category: { slug: cat.slug, title: cat.title, chip: cat.chip, description: cat.description, group: cat.group },
    editorial: { ...ed, intro },
    modelVersion,
    method: m,
    profileText,
    eligibleCount: eligible.length,
    shown,
    rankedCount,
    total: entries.length,
    lists: builtLists,
    podium,
    podiumList,
    secondary,
    excluded,
  };
}

/**
 * The sentence on a price page that accounts for entries it cannot place:
 * no published Queen price at all, versus a price on file that is not yet
 * comparable (due a re-check and withheld, or currency not confirmed). Counted separately so
 * a mattress with a price on its own page is never described as unpriced.
 */
export function unpricedNote(entries: ReadonlyArray<Parameters<typeof queenPriceOf>[0]>): string {
  let none = 0;
  let pending = 0;
  for (const e of entries) {
    const price = queenPriceOf(e);
    if (priceAwaitingRecheck(e)) pending += 1;
    else if (!price) none += 1;
    else if (price.status !== 'confirmed') pending += 1;
  }
  const parts: string[] = [];
  if (none) parts.push(`${none} ${none === 1 ? 'has' : 'have'} no published Queen price`);
  if (pending) parts.push(`${pending} ${pending === 1 ? 'has a price' : 'have a price'} we can’t compare yet (due a re-check, or currency not confirmed)`);
  if (!parts.length) return '';
  const total = none + pending;
  const lead = parts.join(' and ');
  const tail = parts.length > 1 ? `, so those ${total} can’t be placed here.` : ` and can’t be placed here.`;
  return `${lead.charAt(0).toUpperCase()}${lead.slice(1)}${tail}`;
}
