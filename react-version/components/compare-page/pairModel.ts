/**
 * Data for a head-to-head page (/compare/<a>-vs-<b>). Server-safe and pure
 * except buildPairData(), which runs the real engine (matchProfile) for each
 * disclosed reference sleeper. Every number returned comes from the catalog
 * entry or from the engine output; nothing is estimated here.
 */
import { toReferenceVoice } from '@/lib/explain';
import { tierFor } from '@/lib/scoreTiers';
import { firmnessFor, firmnessRangeText } from '@/lib/firmness';
import { formatUsd } from '@/lib/format';
import { comparableQueenPriceUsd, queenPriceOf, queenPriceText } from '@/lib/commerce';
import { profileChips } from '@/lib/compareTopics';
import { MIN_SUBSCORE_DELTA, PAIR_POSITIONS, RATING_FIELDS, referenceProfile, spotlightProfile, type PairProfile } from '@/lib/comparePairs';
import type { MatchItem, MattressEntry, ReviewSource, ScoreCategory, VsPage } from '@/lib/types';
import { COMPARE_DIMENSIONS, columnName, formatCheckedDate, isNum, salePriceNote, slimItem, typeLabel } from './compareModel';
import { rankForProfile } from './engine';
import { eligibleRanks } from '@/components/catalog/referenceRankings';
import type { ChooseItem, PairData, PairEntries, PairRow, PairSide, PairSideKey, PairSleeperKind, RatingRow, SpecRow, SpecValue } from './types';

export { formatCheckedDate };

const pct = (sub: number): number => Math.round(sub * 10);
const DIMENSION_LABEL: Record<ScoreCategory, string> = Object.fromEntries(COMPARE_DIMENSIONS.map((d) => [d.id, d.label])) as Record<ScoreCategory, string>;

/** Plain-language source of a firmness number (never the raw internal code). */
export function firmnessSourceLabel(code: string | null | undefined): string {
  const c = String(code || '');
  if (c.startsWith('independent_numeric')) return 'Independent reviewer rating';
  if (c.startsWith('stated_numeric')) return "Manufacturer's stated number";
  if (c.startsWith('label_mapped')) return "Converted from the manufacturer's firmness label";
  if (c.startsWith('brand_')) return "Converted from the brand's own firmness scale";
  return 'Source not yet verified';
}

/** Manufacturer construction notes with any research-workflow wording removed. */
export function constructionText(entry: Pick<MattressEntry, 'coreMaterialNotes'> | null | undefined): string | null {
  const raw = entry && typeof entry.coreMaterialNotes === 'string' ? entry.coreMaterialNotes.trim() : '';
  if (!raw) return null;
  return raw
    .replace(/No layer-by-layer[^.]*\./gi, 'The manufacturer does not publish a layer-by-layer breakdown.')
    .replace(/\s*\((?:manufacturer|per [^)]*)\)/gi, '')
    .trim();
}

function side(item: MatchItem, ranks: { rankOf: Map<string, number>; total: number }): PairSide {
  const { result, explanation } = slimItem(item);
  return {
    score: result.overallScore,
    tier: tierFor(result.overallScore).label,
    subScores: result.subScores,
    provenance: result.dimensionProvenance || {},
    firmnessFit: result.firmnessFit || null,
    explanation,
    rank: ranks.rankOf.get(item.entry.id) ?? null,
    total: ranks.total,
  };
}

interface Sleeper {
  id: string;
  label: string;
  kind: PairSleeperKind;
  profile: PairProfile;
}

/**
 * Runs the engine for the four reference positions (+ the pair's spotlight
 * sleeper) and returns the two mattresses' results for each, or null when
 * either mattress is not scored (it left the catalog).
 */
export async function buildPairData(pair: VsPage): Promise<PairData | null> {
  const sleepers: Sleeper[] = PAIR_POSITIONS.map((p) => ({ id: p.id, label: p.label, kind: 'reference', profile: referenceProfile(p.id) }));
  const spot = spotlightProfile(pair);
  if (spot && pair.spotlight) sleepers.push({ id: `spotlight-${pair.spotlight.id}`, label: pair.spotlight.label, kind: 'spotlight', profile: spot });

  let modelVersion: string | null = null;
  let entries: PairEntries | null = null;
  const rows: PairRow[] = [];
  for (const s of sleepers) {
    const out = await rankForProfile(s.profile);
    modelVersion = modelVersion || out.modelVersion;
    const A = out.results.find((r) => r.entry.id === pair.a);
    const B = out.results.find((r) => r.entry.id === pair.b);
    if (!A || !B) return null;
    const ranks = eligibleRanks(out.results);
    entries = entries || { a: A.entry, b: B.entry };
    rows.push({
      id: s.id,
      label: s.label,
      kind: s.kind,
      chips: profileChips(s.profile),
      a: side(A, ranks),
      b: side(B, ranks),
    });
  }
  if (!entries) return null;
  return { rows, modelVersion, entries };
}

export interface LargestGap {
  dimension: ScoreCategory;
  label: string;
  row: PairRow;
  a: number;
  b: number;
  delta: number;
  leader: PairSideKey | null;
  positionDependent: boolean;
}

/** Biggest engine sub-score gap across every sleeper scored on the page. */
export function largestGap(rows: readonly PairRow[]): LargestGap | null {
  let best: Omit<LargestGap, 'leader' | 'positionDependent'> | null = null;
  for (const row of rows) {
    for (const d of COMPARE_DIMENSIONS) {
      const a = row.a.subScores[d.id];
      const b = row.b.subScores[d.id];
      if (!isNum(a) || !isNum(b)) continue;
      const delta = Math.abs(a - b);
      if (!best || delta > best.delta + 1e-9) best = { dimension: d.id, label: d.label, row, a, b, delta };
    }
  }
  if (!best) return null;
  const found = best;
  // Is the gap the same for every sleeper (a rating-driven dimension) or does it depend on position?
  const same = rows.every((r) => {
    const ra = r.a.subScores[found.dimension];
    return isNum(ra) && Math.abs(ra - r.b.subScores[found.dimension] - (found.a - found.b)) < 1e-9;
  });
  return { ...found, leader: found.a > found.b ? 'a' : found.b > found.a ? 'b' : null, positionDependent: !same };
}

export interface PositionTally {
  a: number;
  b: number;
  tie: number;
  total: number;
}

/** Across the four reference positions: how many each mattress scores higher for. */
export function positionTally(rows: readonly PairRow[]): PositionTally {
  const ref = rows.filter((r) => r.kind === 'reference');
  const t: PositionTally = { a: 0, b: 0, tie: 0, total: ref.length };
  for (const r of ref) {
    if (r.a.score > r.b.score) t.a += 1;
    else if (r.b.score > r.a.score) t.b += 1;
    else t.tie += 1;
  }
  return t;
}

const CHOOSE_IF: Record<ScoreCategory, string> = {
  pressureRelief: 'you want more cushioning at the shoulders and hips',
  support: 'you need steadier support for the way you sleep',
  heat: 'you sleep hot',
  motion: 'you share the bed and wake easily',
  edge: 'you sit on the edge or sleep near it',
  durability: 'you want the stronger durability rating',
};

interface FactualChoice {
  id: string;
  get: (e: MattressEntry) => number | null | undefined;
  better: 'higher' | 'lower';
  condition: string;
  fmt: (v: number) => string;
}

const FACTUAL_CHOICES: readonly FactualChoice[] = [
  { id: 'price', get: (e) => comparableQueenPriceUsd(e), better: 'lower', condition: 'you want the lower published Queen price', fmt: formatUsd },
  { id: 'trial', get: (e) => e.trialDays, better: 'higher', condition: 'you want the longer sleep trial', fmt: (v) => `${v} nights` },
  {
    id: 'warranty',
    get: (e) => (e.warrantyLifetime === true ? Infinity : e.warrantyYears),
    better: 'higher',
    condition: 'you want the longer warranty',
    fmt: (v) => (v === Infinity ? 'lifetime' : `${v} years`),
  },
];

/**
 * "Choose A if / Choose B if". One line per dimension where that mattress
 * leads by MIN_SUBSCORE_DELTA or more for some sleeper (taking the sleeper
 * where the gap is largest), with the engine's own reason text when the
 * dimension is measured, plus factual leads on price, trial and warranty.
 */
export function chooseLists(rows: readonly PairRow[], entries: PairEntries): Record<PairSideKey, ChooseItem[]> {
  const out: Record<PairSideKey, ChooseItem[]> = { a: [], b: [] };
  for (const d of COMPARE_DIMENSIONS) {
    for (const who of ['a', 'b'] as const) {
      const other: PairSideKey = who === 'a' ? 'b' : 'a';
      let best: { row: PairRow; delta: number; mine: number; theirs: number } | null = null;
      for (const row of rows) {
        const mine = row[who].subScores[d.id];
        const theirs = row[other].subScores[d.id];
        if (!isNum(mine) || !isNum(theirs)) continue;
        const delta = mine - theirs;
        if (delta >= MIN_SUBSCORE_DELTA - 1e-9 && (!best || delta > best.delta + 1e-9)) best = { row, delta, mine, theirs };
      }
      if (!best) continue;
      const found = best;
      const estimated = found.row[who].provenance[d.id] === 'estimated';
      const explanation = found.row[who].explanation;
      const reason = ((explanation && explanation.reasons) || []).find((r) => r.dimension === d.id);
      const sameForAll = rows.every((r) => Math.abs((r[who].subScores[d.id] ?? NaN) - (r[other].subScores[d.id] ?? NaN) - found.delta) < 1e-9);
      out[who].push({
        id: d.id,
        condition: CHOOSE_IF[d.id],
        evidence: `${DIMENSION_LABEL[d.id]}: ${pct(found.mine)} vs ${pct(found.theirs)} out of 100${sameForAll ? '' : ` for a ${found.row.label.toLowerCase()}`}${estimated ? ' (estimated)' : ''}.`,
        reason: reason && !estimated ? toReferenceVoice(reason.text) : null,
        context: sameForAll ? null : found.row.label,
      });
    }
  }
  const ok = (v: number | null | undefined): v is number => typeof v === 'number' && (Number.isFinite(v) || v === Infinity);
  for (const f of FACTUAL_CHOICES) {
    const va = f.get(entries.a);
    const vb = f.get(entries.b);
    if (!ok(va) || !ok(vb) || va === vb) continue;
    const aWins = f.better === 'lower' ? va < vb : va > vb;
    const who: PairSideKey = aWins ? 'a' : 'b';
    out[who].push({ id: f.id, condition: f.condition, evidence: `${f.fmt(aWins ? va : vb)} vs ${f.fmt(aWins ? vb : va)}.`, reason: null, context: null });
  }
  return out;
}

/** Independent ratings (out of 10) with the sources on file. */
export function ratingRows(a: MattressEntry, b: MattressEntry): RatingRow[] {
  return RATING_FIELDS.map(({ field, label, dimension }) => {
    const va = a[field];
    const vb = b[field];
    return { id: dimension, label, a: isNum(va) ? va : null, b: isNum(vb) ? vb : null };
  });
}

export function sourcesFor(entry: Pick<MattressEntry, 'reviewSources'>): ReviewSource[] {
  const seen = new Set<string>();
  return (Array.isArray(entry.reviewSources) ? entry.reviewSources : []).filter((s) => {
    if (!s || !s.sourceName || !s.sourceUrl || !/^https:\/\//.test(s.sourceUrl) || seen.has(s.sourceUrl)) return false;
    seen.add(s.sourceUrl);
    return true;
  });
}

const NOT_VERIFIED: SpecValue = { text: null, missing: 'Not yet verified' };

interface SpecDef {
  id: string;
  label: string;
  long?: boolean;
  get: (e: MattressEntry) => SpecValue;
}

const SPEC_DEFS: readonly SpecDef[] = [
  { id: 'type', label: 'Type', get: (e) => (e.type ? { text: typeLabel(e.type) } : { ...NOT_VERIFIED }) },
  {
    id: 'firmness',
    label: 'Firmness',
    get: (e) => {
      const f = firmnessFor(e);
      if (!f) return { ...NOT_VERIFIED };
      return { text: `${f.label} · ${firmnessRangeText(e)}`, note: firmnessSourceLabel(e.firmnessSource) };
    },
  },
  { id: 'height', label: 'Height', get: (e) => (isNum(e.heightIn) ? { text: `${e.heightIn} in` } : { ...NOT_VERIFIED }) },
  {
    id: 'construction',
    label: 'Construction',
    long: true,
    get: (e) => {
      const text = constructionText(e);
      return text ? { text, note: 'As described by the manufacturer' } : { ...NOT_VERIFIED };
    },
  },
  { id: 'trial', label: 'Sleep trial', get: (e) => (isNum(e.trialDays) ? { text: `${e.trialDays} nights` } : { ...NOT_VERIFIED }) },
  {
    id: 'warranty',
    label: 'Warranty',
    get: (e) => {
      if (e.warrantyLifetime === true) return { text: 'Lifetime' };
      if (isNum(e.warrantyYears)) return { text: `${e.warrantyYears} ${e.warrantyYears === 1 ? 'year' : 'years'}` };
      return { ...NOT_VERIFIED };
    },
  },
  {
    id: 'price',
    label: 'Queen price',
    get: (e) => {
      const queen = queenPriceOf(e);
      if (queen && queen.status !== 'confirmed') {
        return { text: queenPriceText(e), note: queen.status === 'provisional' ? 'Due a re-check; confirm on the brand’s site' : 'Currency not stated by the source' };
      }
      if (queen) {
        const d = formatCheckedDate(e.priceUpdatedAt);
        const kind = salePriceNote(e.priceNote) || 'Price on the brand’s page';
        return { text: formatUsd(queen.amount), note: d ? `${kind}, checked ${d}` : kind };
      }
      return { text: null, missing: 'No published price' };
    },
  },
];

/** Spec rows: { id, label, a: {text, note?, missing?}, b } */
export function specRows(a: MattressEntry, b: MattressEntry): SpecRow[] {
  return SPEC_DEFS.map((r) => ({ id: r.id, label: r.label, long: !!r.long, a: r.get(a), b: r.get(b) }));
}

export interface PriceGap {
  cheaperId: string;
  amount: number;
  text: string;
}

/** Price difference sentence, only when both prices are published. */
export function priceGap(a: MattressEntry, b: MattressEntry): PriceGap | null {
  const pa = comparableQueenPriceUsd(a);
  const pb = comparableQueenPriceUsd(b);
  if (pa === null || pb === null || pa === pb) return null;
  const cheaper = pa < pb ? a : b;
  const dearer = cheaper === a ? b : a;
  const amount = Math.abs(pa - pb);
  return { cheaperId: cheaper.id, amount, text: `${columnName(dearer)} costs ${formatUsd(amount)} more (published Queen prices).` };
}

export { pct as subToPoints };
