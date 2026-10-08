/**
 * Display-layer helpers for /mattress/[id]. Pure and client-safe.
 *
 * The catalog carries research provenance written for editors ("apex domain
 * returned 403 on fetch", "CAVEAT: ... flagged for manual re-verification").
 * That stays in the data; the product page shows a reader-facing version
 * built here. Nothing is invented: sentences are kept, dropped or have a
 * pipeline phrase swapped for its plain equivalent, and a flagged figure is
 * always disclosed as provisional rather than silently shown.
 */

import { hostOf, safeUrl } from '@/lib/commerce';
import type { MattressEntry, MattressType, ScoreCategory, SleepPosition } from '@/lib/types';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "2026-09-25" -> "25 Sep 2026" (UTC, so server and client agree). */
export function shortDate(iso: unknown): string | null {
  if (typeof iso !== 'string' || !/^\d{4}-\d{2}-\d{2}/.test(iso)) return null;
  const d = new Date(`${iso.slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return null;
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

/**
 * Reader-facing source line for the spec block.
 * "Helix Sleep (checkout-subdomain mirror ...; apex domain returned 403 on fetch)"
 *   -> { name: 'Helix Sleep', kind: 'official product page', href, date: '25 Sep 2026' }
 * kind is 'official product page' when the catalog marks the source official
 * or the source host is the brand's own product-page host; otherwise
 * 'retailer product page'.
 */
export interface SourceLabel {
  name: string;
  kind: 'official product page' | 'retailer product page';
  href: string;
  date: string | null;
}

type SourceFields = Partial<Pick<MattressEntry, 'sourceUrl' | 'sourceName' | 'officialProductUrl' | 'brand' | 'lastVerified'>>;

export function sourceLabel(entry: SourceFields | null | undefined): SourceLabel | null {
  const href = safeUrl(entry?.sourceUrl);
  if (!href) return null;
  if (!entry) return null;
  const raw = typeof entry.sourceName === 'string' ? entry.sourceName.trim() : '';
  const base = raw.replace(/\s*\(.*$/, '').trim();
  const host = hostOf(href);
  const officialHost = hostOf(safeUrl(entry.officialProductUrl) || '');
  const sameSite = Boolean(host && officialHost && rootDomain(host) === rootDomain(officialHost));
  const official = /\bofficial\b/i.test(raw) || sameSite;
  return {
    name: base || host || entry.brand || 'Source page',
    kind: official ? 'official product page' : 'retailer product page',
    href,
    date: shortDate(entry.lastVerified),
  };
}

function rootDomain(host: string): string {
  return String(host).split('.').slice(-2).join('.');
}

// Pipeline vocabulary that never belongs in front of a shopper. A sentence
// (or em-dash clause) containing any of these is dropped from display.
const JARGON =
  /\b(fetch(ed|ing)?|caveat|flagged|research pass|automated|client-side|JS|JS-rendered|priceUsd|priceFromUsd|mixup|policy|ISO|URL|unconfirmed|featured|scrap(e|ed|er)|403|apex|subdomain|mirror)\b|\s\/[a-z]/i;

const SWAPS: readonly [RegExp, string][] = [
  [/^\s*[A-Z/ ]+CONFLICT:\s*/, ''],
  [/\s*\(recorded here[^)]*\)/gi, ''],
  [/\bon the fetched official page\b/gi, "on the brand's page"],
  [/\b(in|on) the fetched excerpt\b/gi, "on the brand's page"],
  [/\bnot captured beyond that on the fetched page\b/gi, "not listed on the brand's page"],
  [/\bnot captured beyond\b/gi, 'not listed beyond'],
  [/\b(in|on) the fetched page content\b/gi, "on the brand's page"],
  [/\b(in|on) the fetched page\b/gi, "on the brand's page"],
  [/\bnot captured\b/gi, 'not listed'],
  [/\bnot exposed\b/gi, 'not shown'],
];

/** Split into sentences / em-dash clauses, keeping terminal punctuation. */
function clauses(text: string): string[] {
  return String(text)
    .split(/(?<=[.!?])\s+(?=[A-Z"'(])|\s+[—–]\s+|;\s+(?![^(]*\))/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Reader-facing version of a catalog note (priceNote, heightNote,
 * returnPolicy, firmnessDescription).
 * Returns { text, provisional } where text may be null (nothing safe to
 * show) and provisional is true when the note flags the figure for a
 * re-check - the page must then say so.
 */
export interface PublicNote {
  text: string | null;
  provisional: boolean;
}

export function publicNote(note: unknown): PublicNote {
  if (typeof note !== 'string' || !note.trim()) return { text: null, provisional: false };
  const provisional = /\b(caveat|flagged|re-?verif|re-?check)\b/i.test(note);
  let text = note;
  // Parentheticals that are pure pipeline detail go first, so the rest of
  // the sentence can survive: "(likely rendered by a JS size-selector widget)".
  text = text.replace(/\s*\(([^()]*)\)/g, (m: string, inner: string) => (JARGON.test(inner) ? '' : m));
  for (const [re, to] of SWAPS) text = text.replace(re, to);
  // A clause that starts lower-case continues the one before it, so it goes
  // when that one went: "CAVEAT: ... — implausible for ..." shows nothing.
  const kept: string[] = [];
  let droppedPrev = false;
  for (const c of clauses(text)) {
    const drop: boolean = JARGON.test(c) || (droppedPrev && /^[a-z]/.test(c));
    if (!drop) kept.push(c);
    droppedPrev = drop;
  }
  const joined = kept
    .map((c) => c.charAt(0).toUpperCase() + c.slice(1))
    .map((c) => (/[.!?]["')\u201d]?$/.test(c) ? c : `${c}.`))
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
  return { text: joined || null, provisional };
}

/* ---------------------------------------------------------------------- */
/* Materials -> the four X-ray layers                                      */
/* ---------------------------------------------------------------------- */

export const LAYER_IDS = ['cover', 'comfort', 'transition', 'support'] as const;
export type LayerId = (typeof LAYER_IDS)[number];
export type LayerMaterials = Record<LayerId, string[]>;

const COVER_RE = /\b(cover|ticking|quilt(ed|ing)?|knit|cashmere|tencel|encasing|fire barrier)\b/i;
const COIL_RE = /\b(coils?|springs?|innerspring|microcoils?)\b/i;
const TRANSITION_WORD_RE = /\btransition(al)?\b/i;
const BASE_RE = /\b(base|core|foundation|high-density|edge)\b/i;
const TRANSITION_RE = /\b(response|responsive|dynamic|zoned|lumbar|support (foam|layer)|bounce)\b/i;
// Catalog annotations that are not a component name.
const NOT_A_COMPONENT_RE = /^(manufacturer states|requires|handcrafted|certipur|no layer|exact per-layer)/i;

/** Split on a separator at parenthesis depth 0 only. */
type SeparatorTest = (text: string, i: number) => number;

function splitTopLevel(text: string, isSep: SeparatorTest): string[] {
  const parts: string[] = [];
  let depth = 0;
  let buf = '';
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (ch === '(') depth += 1;
    if (ch === ')') depth = Math.max(0, depth - 1);
    const skip = depth === 0 ? isSep(text, i) : 0;
    if (skip) {
      parts.push(buf);
      buf = '';
      i += skip - 1;
      continue;
    }
    buf += ch;
  }
  parts.push(buf);
  return parts.map((p) => p.trim()).filter(Boolean);
}
const PLUS_SEP: SeparatorTest = (t, i) => (t[i] === '+' && t[i - 1] === ' ' && t[i + 1] === ' ' ? 2 : 0);
const SEMI_SEP: SeparatorTest = (t, i) => (t[i] === ';' ? 1 : 0);

/**
 * The brand's published components, in catalog order, split on ';' and
 * ' + ' (never inside parentheses), each cleaned by componentName().
 */
export function componentsFor(entry: Partial<Pick<MattressEntry, 'coreMaterialNotes'>> | null | undefined): string[] {
  const notes = entry?.coreMaterialNotes;
  if (typeof notes !== 'string' || !notes.trim()) return [];
  return splitTopLevel(notes, SEMI_SEP)
    .flatMap((part) => splitTopLevel(part, PLUS_SEP))
    .map(componentName)
    .filter((c): c is string => Boolean(c));
}

/**
 * A materials-list item as a clean component name: first sentence only (the
 * catalog sometimes appends research notes), with list-source prefixes like
 * 'Costco spec sheet:' removed. Null when the item is an annotation.
 */
export function componentName(item: unknown): string | null {
  if (typeof item !== 'string') return null;
  let t = (item.trim().split(/\.["\u201d]?\s+(?=[A-Z"\u201c])/)[0] ?? '').replace(/\.$/, '');
  t = t.replace(/^(costco spec sheet|marketing bullets add)\s*:?\s*/i, '').trim();
  if (/^["\u201c]/.test(t)) t = t.replace(/^["\u201c]/, '').replace(/["\u201d]$/, '').trim();
  if (!t || NOT_A_COMPONENT_RE.test(t)) return null;
  return t.charAt(0).toUpperCase() + t.slice(1);
}

/**
 * Assign each component of the brand's published materials list to the
 * generic layer it most plausibly belongs to, BY NAME ONLY. The page labels
 * the result "From manufacturer materials list" and says it is matched by
 * name, because thickness and density are not published.
 *
 * @param components from componentsFor(entry), top to bottom where the brand gives an order
 * @param type catalog type
 */
export function mapMaterialsToLayers(components: unknown, type: MattressType | string | null | undefined): LayerMaterials {
  const out: LayerMaterials = { cover: [], comfort: [], transition: [], support: [] };
  if (!Array.isArray(components)) return out;
  const coilBuild = type === 'hybrid' || type === 'innerspring';
  for (const m of components) {
    if (typeof m !== 'string' || !m.trim()) continue;
    let layer: LayerId;
    if (COIL_RE.test(m)) layer = 'support';
    else if (COVER_RE.test(m)) layer = 'cover';
    else if (TRANSITION_WORD_RE.test(m)) layer = 'transition';
    else if (BASE_RE.test(m)) layer = 'support';
    else if (TRANSITION_RE.test(m)) layer = coilBuild || !/\bsupport\b/i.test(m) ? 'transition' : 'support';
    else layer = 'comfort';
    if (!out[layer].includes(m)) out[layer].push(m);
  }
  return out;
}

/**
 * Which engine dimensions each generic layer mainly drives (the inverse of
 * lib/categories DIMENSION_TO_LAYER). Educational, not a teardown claim.
 */
export const LAYER_DIMENSIONS: Record<LayerId, ScoreCategory[]> = {
  cover: ['heat'],
  comfort: ['pressureRelief'],
  transition: ['motion'],
  support: ['support', 'edge', 'durability'],
};

/** Catalog field holding an independent 0-10 rating for a dimension, if any. */
export type RatedDimension = 'heat' | 'motion' | 'edge' | 'durability';
type RatingField = 'coolingRatingOutOf10' | 'motionIsolationRatingOutOf10' | 'edgeSupportRatingOutOf10' | 'durabilityRatingOutOf10';

export const DIMENSION_RATING_FIELD: Record<RatedDimension, RatingField> = {
  heat: 'coolingRatingOutOf10',
  motion: 'motionIsolationRatingOutOf10',
  edge: 'edgeSupportRatingOutOf10',
  durability: 'durabilityRatingOutOf10',
};

export function independentRating(entry: Partial<Pick<MattressEntry, RatingField>> | null | undefined, dimension: string): number | null {
  const field = (DIMENSION_RATING_FIELD as Partial<Record<string, RatingField>>)[dimension];
  const v = field ? entry?.[field] : null;
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

/* ---------------------------------------------------------------------- */
/* Positioning                                                             */
/* ---------------------------------------------------------------------- */

const POSITION_PLURAL: Record<string, string> = { side: 'side sleepers', back: 'back sleepers', stomach: 'stomach sleepers', combination: 'combination sleepers' };

/**
 * The reference position this mattress scores highest for, from engine
 * output: { id, score, rank, total } or null.
 */
export interface PositionScoreLike {
  id: SleepPosition | string;
  score: number | null;
  rank?: number | null;
  total?: number | null;
}

export function bestPosition<R extends PositionScoreLike>(rows: readonly R[] | null | undefined): (R & { score: number }) | null {
  const scored = (rows || []).filter((r): r is R & { score: number } => typeof r.score === 'number');
  if (!scored.length) return null;
  return scored.reduce((a, b) => (b.score > a.score ? b : a));
}

export function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] || s[v] || s[0]}`;
}

/**
 * One factual sentence for the hero built from engine output and
 * independent ratings: "Scores highest for stomach sleepers: 90/100, 1st of
 * 26 ranked." (rank among the mattresses with enough data to rank, as on the
 * category pages). Null when nothing scored.
 */
export function scoreLineFor(rows: readonly PositionScoreLike[] | null | undefined): string | null {
  const best = bestPosition(rows);
  if (!best) return null;
  // The rank joins the sentence only when it is a highlight (top third);
  // every rank is still shown with the position bars.
  const { rank: place, total } = best;
  const notable = typeof place === 'number' && typeof total === 'number' && place <= Math.ceil(total / 3);
  const rank = notable ? `, ${ordinal(place)} of ${total} ranked` : '';
  return `Scores highest for ${POSITION_PLURAL[best.id] || best.id}: ${best.score}/100${rank}.`;
}

/** Independent ratings of 8/10 or more, as short strengths: ['Edge support 9/10', ...]. */
export interface Standout {
  id: RatedDimension;
  label: string;
  value: number;
}

export function standoutRatings(entry: Partial<Pick<MattressEntry, RatingField>> | null | undefined, min = 8): Standout[] {
  const LABEL: Record<RatedDimension, string> = { heat: 'Cooling', motion: 'Motion isolation', edge: 'Edge support', durability: 'Durability' };
  return (Object.keys(DIMENSION_RATING_FIELD) as RatedDimension[])
    .map((d) => ({ d, v: independentRating(entry, d) }))
    .filter((x): x is { d: RatedDimension; v: number } => x.v !== null && x.v >= min)
    .sort((a, b) => b.v - a.v)
    .map((x) => ({ id: x.d, label: LABEL[x.d], value: x.v }));
}
