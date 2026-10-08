/**
 * Pure comparison model shared by /compare and /compare/[topic].
 * No React, no hooks: safe in server and client components and in tests.
 *
 * A "column" is { id, entry, item } where `entry` is the catalog record and
 * `item` is a matchProfile() result item for a sleep profile (or null when
 * there is no profile). Every score shown comes from `item.result` /
 * `item.explanation`; every fact comes from `entry`. Missing values stay
 * missing (rendered as "Not yet verified" / "Data unavailable").
 */
import { DIMENSIONS, type DimensionDef } from '@/lib/explain';
import { dimensionLabel, tierFor } from '@/lib/scoreTiers';
import { firmnessFor, firmnessRangeText, MATTRESS_TYPE_LABEL } from '@/lib/firmness';
import { getVerificationLevel } from '@/lib/dataIntegrity';
import { displayTitle, formatShortDate, formatUsd } from '@/lib/format';
import { comparableQueenPriceUsd, queenPriceOf } from '@/lib/commerce';
import type { MattressEntry, MatchItem } from '@/lib/types';
import type { MissingKind } from '@/components/ui/DataValue';
import type { ProfileLike } from '@/lib/compareTopics';
import type {
  Better,
  CellKey,
  CompareCell,
  CompareColumn,
  CompareRowDraft,
  CompareRowGroup,
  CompareVerdict,
  RowAnnotation,
  SlimItem,
  ValueCell,
  VerdictDifference,
} from './types';

export const MAX_COMPARE_COLUMNS = 3;
const ID_PATTERN = /^[a-z0-9][a-z0-9-]{0,80}$/;

export type { DimensionDef };

/** The six scored dimensions, in display order (lib/explain DIMENSIONS). */
export const COMPARE_DIMENSIONS: readonly DimensionDef[] = DIMENSIONS;

/** Display label for a catalog type, falling back to the raw value. */
export function typeLabel(type: string | null | undefined): string {
  if (!type) return '';
  return Object.prototype.hasOwnProperty.call(MATTRESS_TYPE_LABEL, type) ? MATTRESS_TYPE_LABEL[type as keyof typeof MATTRESS_TYPE_LABEL] : type;
}

/** Parses `?ids=a,b,c` (string or string[]) into at most 3 unique, well-formed ids. */
export function parseIdsParam(raw: string | readonly string[] | null | undefined, max: number = MAX_COMPARE_COLUMNS): string[] {
  const joined = Array.isArray(raw) ? raw.join(',') : typeof raw === 'string' ? raw : '';
  const out: string[] = [];
  for (const part of joined.split(',')) {
    const id = part.trim().toLowerCase();
    if (id && ID_PATTERN.test(id) && !out.includes(id)) out.push(id);
    if (out.length >= max) break;
  }
  return out;
}

/** Drops engine bookkeeping that the UI never renders (keeps payloads small across the server/client boundary). */
export function slimItem(item: MatchItem): SlimItem;
export function slimItem(item: MatchItem | null | undefined): SlimItem | null;
export function slimItem(item: MatchItem | null | undefined): SlimItem | null {
  if (!item) return null;
  const { trace, ...result } = item.result;
  void trace;
  return {
    result,
    explanation: item.explanation || null,
    dataProvenance: item.dataProvenance || null,
    verificationLevel: item.verificationLevel || null,
  };
}

/** Display name without repeating the brand ("Purple The Purple Mattress" -> "The Purple Mattress"). */
export function columnName(entry: Pick<MattressEntry, 'brand' | 'model'>): string {
  if (entry && entry.brand && entry.model && entry.model.toLowerCase().includes(entry.brand.toLowerCase())) return entry.model;
  return displayTitle(entry);
}

export function isNum(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

const money = formatUsd;

/** "2026-05-04..." -> "4 May 2026", the same reader-facing date format as the rest of the site (lib/format). */
export function formatCheckedDate(iso: string | null | undefined): string | null {
  return formatShortDate(iso);
}

/**
 * "Sale price · $2,229 regular" when the catalog's price note says the Queen
 * price on file was a sale or promo price; null otherwise. Only the price
 * kind and the regular/list figure the note itself quotes are surfaced,
 * never the research wording around them.
 */
export function salePriceNote(note: string | null | undefined): string | null {
  if (typeof note !== 'string') return null;
  const kind = /\b(sale|promo)\s+pric(?:e|ing)\b/i.exec(note);
  if (!kind || !kind[1]) return null;
  const label = kind[1].toLowerCase() === 'sale' ? 'Sale price' : 'Promo price';
  const regular = /\$([\d,]+(?:\.\d{2})?)\s+(regular|list)\b|\b(regular|list)\s+\$([\d,]+(?:\.\d{2})?)/i.exec(note);
  if (!regular) return label;
  const amount = regular[1] || regular[4];
  const word = (regular[2] || regular[3] || 'regular').toLowerCase();
  return `${label} · $${amount} ${word}`;
}

/* ---------------------------------------------------------------- cells -- */

type CellOptions = Partial<Omit<ValueCell, 'kind' | 'text' | 'value'>> & { value?: number | null };

function cell(text: string | null | undefined, opts: CellOptions = {}): ValueCell {
  return { ...opts, text: text ?? null, value: isNum(opts.value) ? opts.value : null, key: opts.key ?? text ?? null };
}

function missingCell(missing: MissingKind = 'unverified', missingText?: string): ValueCell {
  return { text: null, value: null, key: `__missing:${missing}`, missing, missingText };
}

const FIRMNESS_FIT_TEXT: Partial<Record<string, string>> = {
  'in-band': 'Inside your range',
  softer: 'Softer than your range',
  firmer: 'Firmer than your range',
};

function watchOutCell(item: SlimItem): ValueCell {
  const list = (item.explanation && item.explanation.watchOuts) || [];
  const serious = list.filter((w) => w.severity === 'warning' || w.severity === 'caution');
  if (!list.length) return cell('None flagged', { value: 0, key: 'none', tone: 'success' });
  return cell(serious.length ? `${serious.length} to read` : 'Notes only', {
    value: serious.length,
    key: list
      .map((w) => w.code)
      .sort()
      .join('|'),
    list: list.map((w) => ({ title: w.title, severity: w.severity })),
    tone: serious.length ? 'warning' : null,
  });
}

/** The engine result of a column already checked to be scored. */
function scoredItem(col: CompareColumn): SlimItem {
  if (!col.item) throw new Error(`Column ${col.id} has no engine result`);
  return col.item;
}

type RatingField = 'coolingRatingOutOf10' | 'motionIsolationRatingOutOf10' | 'edgeSupportRatingOutOf10' | 'durabilityRatingOutOf10';

/** The independent ratings shown (and led) in the table when there is no sleep profile. Shared by the table and the verdict so they can't disagree. */
const RATING_ROWS: readonly { id: string; label: string; field: RatingField }[] = [
  { id: 'r-cooling', label: 'Cooling', field: 'coolingRatingOutOf10' },
  { id: 'r-motion', label: 'Motion isolation', field: 'motionIsolationRatingOutOf10' },
  { id: 'r-edge', label: 'Edge support', field: 'edgeSupportRatingOutOf10' },
  { id: 'r-durability', label: 'Durability', field: 'durabilityRatingOutOf10' },
];

/* ----------------------------------------------------------------- rows -- */

export interface RowGroupOptions {
  /** The sleep profile the items were scored with (adds budget notes). */
  profile?: ProfileLike | null;
}

type DraftGroup = Omit<CompareRowGroup, 'rows'> & { rows: CompareRowDraft[] };

/**
 * Builds grouped rows for the table:
 * [{ id, label, note?, rows: [{ id, label, hint?, better?, leaderWord?, cells[], same, leaders, tied }] }].
 */
export function buildRowGroups(columns: readonly CompareColumn[], options: RowGroupOptions = {}): CompareRowGroup[] {
  const { profile } = options;
  const scored = columns.length > 0 && columns.every((c) => c.item && c.item.result);
  const groups: DraftGroup[] = [];

  if (scored) {
    groups.push({
      id: 'match',
      label: 'Your match',
      rows: [
        {
          id: 'score',
          label: 'Match score',
          hint: 'Out of 100, for this sleep profile',
          better: 'higher',
          leaderWord: 'Highest',
          emphasis: true,
          cells: columns.map((col) => {
            const s = scoredItem(col).result.overallScore;
            return cell(`${s}`, { value: s, suffix: '/100', note: tierFor(s).label });
          }),
        },
        {
          id: 'watchouts',
          label: 'Watch-outs',
          hint: 'Fit and data risks the engine flagged',
          better: 'lower',
          leaderWord: 'Fewest',
          cells: columns.map((col) => watchOutCell(scoredItem(col))),
        },
        {
          id: 'firmness-fit',
          label: 'Firmness fit',
          hint: 'Against the range recommended for your position and weight',
          cells: columns.map((col) => {
            const fit = scoredItem(col).result.firmnessFit;
            const text = fit ? FIRMNESS_FIT_TEXT[fit.bandDirection] : undefined;
            if (!fit || !text) return missingCell('unavailable', 'Firmness not on file');
            const tone = fit.bandDirection === 'in-band' ? 'success' : 'warning';
            return cell(text, { key: fit.bandDirection, tone });
          }),
        },
      ],
    });

    groups.push({
      id: 'dimensions',
      label: 'Six dimensions, scored for you',
      rows: COMPARE_DIMENSIONS.map(
        (d): CompareRowDraft => ({
          id: `dim-${d.id}`,
          label: d.label,
          better: 'higher',
          leaderWord: 'Leads',
          cells: columns.map((col) => {
            const { result } = scoredItem(col);
            const sub = result.subScores && result.subScores[d.id];
            if (!isNum(sub)) return missingCell('unavailable');
            const pct = Math.round(sub * 10);
            const prov = result.dimensionProvenance ? result.dimensionProvenance[d.id] : undefined;
            return cell(`${pct}`, {
              value: pct,
              suffix: '/100',
              note: dimensionLabel(sub),
              bar: pct,
              estimated: prov === 'estimated',
            });
          }),
        })
      ),
    });
  } else {
    const ratingRow = (id: string, label: string, field: RatingField): CompareRowDraft => ({
      id,
      label,
      better: 'higher',
      leaderWord: 'Leads',
      cells: columns.map(({ entry }) => {
        const v = entry[field];
        return isNum(v) ? cell(`${v}`, { value: v, suffix: '/10' }) : missingCell('unavailable');
      }),
    });
    groups.push({
      id: 'ratings',
      label: 'Independent ratings on file',
      note: 'Reviewer ratings out of 10 from the sources listed on each mattress page. They are not Match Scores; a Match Score needs your sleep profile.',
      rows: RATING_ROWS.map((r) => ratingRow(r.id, r.label, r.field)),
    });
  }

  groups.push({
    id: 'build',
    label: 'Feel and construction',
    rows: [
      {
        id: 'firmness',
        label: 'Firmness',
        hint: 'On a 1–10 scale',
        cells: columns.map(({ entry }) => {
          const f = firmnessFor(entry);
          if (!f) return missingCell('unverified');
          const range = firmnessRangeText(entry);
          // Key on the label AND the published number/range: two "Medium-firm" beds at 5–8.75 vs 7 are not the same.
          return cell(f.label, { key: `${f.id}:${range ?? ''}`, note: range });
        }),
      },
      {
        id: 'type',
        label: 'Type',
        cells: columns.map(({ entry }) => (entry.type ? cell(typeLabel(entry.type), { key: entry.type }) : missingCell('unverified'))),
      },
      {
        id: 'height',
        label: 'Height',
        cells: columns.map(({ entry }) => (isNum(entry.heightIn) ? cell(`${entry.heightIn}`, { value: entry.heightIn, suffix: ' in' }) : missingCell('unverified'))),
      },
      {
        id: 'materials',
        label: 'Layers',
        hint: 'As described by the manufacturer',
        long: true,
        cells: columns.map(({ entry }) => (entry.coreMaterialNotes ? cell(entry.coreMaterialNotes) : missingCell('unverified'))),
      },
    ],
  });

  const budget = profile ? profile.budgetUsd : undefined;
  const budgetMax = budget && isNum(budget.max) ? budget.max : null;
  groups.push({
    id: 'buying',
    label: 'Price and policies',
    rows: [
      {
        id: 'price',
        label: 'Queen price',
        hint: 'Price on the brand’s page when checked; may be a sale price',
        better: 'lower',
        leaderWord: 'Lowest',
        cells: columns.map(({ entry }) => {
          // A lowest-size "from" price is never a Queen price. A provisional or
          // currency-unconfirmed figure is shown, qualified, with no value, so it
          // never leads the row or meets the budget check (lib/commerce).
          const queen = queenPriceOf(entry);
          if (!queen) return missingCell('unverified');
          if (queen.status !== 'confirmed') {
            const why = queen.status === 'provisional' ? 'Provisional: due a re-check' : 'Currency not confirmed; not compared with USD prices';
            return cell(money(queen.amount), { key: `${queen.status}:${queen.amount}`, note: why, tone: 'warning' });
          }
          const checked = formatCheckedDate(entry.priceUpdatedAt);
          const sale = salePriceNote(entry.priceNote);
          let note = [sale, checked ? `${sale ? 'checked' : 'Checked'} ${checked}` : null].filter(Boolean).join(', ') || null;
          let tone: ValueCell['tone'] = null;
          if (budgetMax !== null && queen.amount > budgetMax) {
            note = `Above your ${money(budgetMax)} budget`;
            tone = 'warning';
          }
          return cell(money(queen.amount), { value: queen.amount, note, tone });
        }),
      },
      {
        id: 'trial',
        label: 'Sleep trial',
        better: 'higher',
        leaderWord: 'Longest',
        cells: columns.map(({ entry }) => (isNum(entry.trialDays) ? cell(`${entry.trialDays}`, { value: entry.trialDays, suffix: ' nights' }) : missingCell('unverified'))),
      },
      {
        id: 'warranty',
        label: 'Warranty',
        better: 'higher',
        leaderWord: 'Longest',
        cells: columns.map(({ entry }) => {
          if (entry.warrantyLifetime === true) return cell('Lifetime', { value: 1000, key: 'lifetime' });
          if (isNum(entry.warrantyYears)) return cell(`${entry.warrantyYears}`, { value: entry.warrantyYears, suffix: entry.warrantyYears === 1 ? ' year' : ' years' });
          return missingCell('unverified');
        }),
      },
      {
        id: 'verification',
        label: 'Data status',
        hint: 'How much of this record is checked',
        cells: columns.map(({ entry }): CompareCell => {
          const level = getVerificationLevel(entry);
          return { kind: 'verification', level, key: level, text: null, value: null };
        }),
      },
    ],
  });

  return groups.map((g) => ({ ...g, rows: g.rows.map((row) => annotateRow(row)) }));
}

interface AnnotatableRow {
  better?: Better;
  cells: readonly { key: CellKey; value: number | null }[];
}

/** Sets row.same (all cells equivalent) and row.leaders (indexes of the best real values). Mutates and returns the row. */
export function annotateRow<R extends AnnotatableRow>(row: R): R & RowAnnotation {
  const out: R & RowAnnotation = Object.assign(row, { same: false, leaders: [] as number[], tied: false });
  const keys = row.cells.map((c) => JSON.stringify(c.key));
  out.same = row.cells.length > 1 && keys.every((k) => k === keys[0]);
  if (!row.better || row.cells.length < 2) return out;
  const values = row.cells.map((c) => (isNum(c.value) ? c.value : null));
  const known = values.filter((v): v is number => v !== null);
  if (known.length < 2) return out;
  const best = row.better === 'lower' ? Math.min(...known) : Math.max(...known);
  if (known.every((v) => v === best)) return out; // no difference among known values: no leader
  out.leaders = values.map((v, i) => (v === best ? i : -1)).filter((i) => i >= 0);
  out.tied = out.leaders.length > 1;
  return out;
}

/* -------------------------------------------------------------- verdict -- */

interface Leader {
  index: number;
  value: number;
  next: number;
}

interface FactualLead {
  id: string;
  label: string;
  get: (e: MattressEntry) => number | null | undefined;
  better: Better;
  fmt: (v: number) => string;
}

const FACTUAL_LEADS: readonly FactualLead[] = [
  { id: 'price', label: 'Lowest Queen price', get: (e) => comparableQueenPriceUsd(e), better: 'lower', fmt: money },
  { id: 'trial', label: 'Longest sleep trial', get: (e) => e.trialDays, better: 'higher', fmt: (v) => `${v} nights` },
  {
    id: 'warranty',
    label: 'Longest warranty',
    get: (e) => (e.warrantyLifetime ? 1000 : e.warrantyYears),
    better: 'higher',
    fmt: (v) => (v === 1000 ? 'lifetime' : `${v} years`),
  },
];

/**
 * The honest "best for you" verdict. Never invents a winner:
 *  - { kind: 'no-profile' } when columns aren't scored
 *  - { kind: 'tie', score, tiedIds } when the top score is shared
 *  - { kind: 'winner', winnerId, score, margin, runnerUpId }
 * plus `differences`: per column, the scored dimensions it uniquely leads,
 * and factual leads (lowest price, longest trial/warranty).
 */
export function compareVerdict(columns: readonly CompareColumn[]): CompareVerdict {
  const differences: VerdictDifference[] = columns.map((col) => ({ id: col.id, name: columnName(col.entry), leads: [] }));
  const scored = columns.length >= 2 && columns.every((c) => c.item && c.item.result && isNum(c.item.result.overallScore));

  if (scored) {
    for (const d of COMPARE_DIMENSIONS) {
      const vals = columns.map((c) => {
        const subs = scoredItem(c).result.subScores;
        const v = subs ? subs[d.id] : undefined;
        return isNum(v) ? Math.round(v * 10) : null;
      });
      const lead = uniqueLeader(vals, 'higher');
      const leadCol = lead ? columns[lead.index] : undefined;
      const diff = lead ? differences[lead.index] : undefined;
      if (lead && leadCol && diff) {
        const est = (scoredItem(leadCol).result.dimensionProvenance || {})[d.id] === 'estimated';
        diff.leads.push({
          id: d.id,
          text: `${d.label}: ${lead.value}/100 vs ${lead.next}/100 for the next best${est ? ' (estimated)' : ''}`,
        });
      }
    }
  } else {
    // No profile: the table shows independent ratings instead of scored dimensions, so the verdict leads come from those same rows.
    for (const r of RATING_ROWS) {
      const vals = columns.map((c) => {
        const v = c.entry[r.field];
        return isNum(v) ? v : null;
      });
      const lead = uniqueLeader(vals, 'higher');
      const diff = lead ? differences[lead.index] : undefined;
      if (lead && diff) diff.leads.push({ id: r.id, text: `${r.label}: ${lead.value}/10 vs ${lead.next}/10 (independent rating)` });
    }
  }
  for (const f of FACTUAL_LEADS) {
    const vals = columns.map((c) => {
      const v = f.get(c.entry);
      return isNum(v) ? v : null;
    });
    const lead = uniqueLeader(vals, f.better);
    const diff = lead ? differences[lead.index] : undefined;
    if (lead && diff) diff.leads.push({ id: f.id, text: `${f.label}: ${f.fmt(lead.value)} vs ${f.fmt(lead.next)}` });
  }

  if (!scored) return { kind: 'no-profile', differences };

  const ranked = columns.map((c, i) => ({ i, id: c.id, score: scoredItem(c).result.overallScore })).sort((a, b) => b.score - a.score);
  const [first, second] = ranked;
  if (!first || !second) return { kind: 'no-profile', differences }; // unreachable: `scored` requires two columns
  const top = first.score;
  const tied = ranked.filter((r) => r.score === top);
  if (tied.length > 1) return { kind: 'tie', score: top, tiedIds: tied.map((t) => t.id), differences };
  return {
    kind: 'winner',
    winnerId: first.id,
    score: top,
    runnerUpId: second.id,
    runnerUpScore: second.score,
    margin: top - second.score,
    differences,
  };
}

function uniqueLeader(values: readonly (number | null)[], better: Better): Leader | null {
  const known = values.map((v, i) => ({ v, i })).filter((x): x is { v: number; i: number } => x.v !== null);
  known.sort((a, b) => (better === 'lower' ? a.v - b.v : b.v - a.v));
  const [first, second] = known;
  if (!first || !second) return null;
  if (first.v === second.v) return null;
  return { index: first.i, value: first.v, next: second.v };
}
