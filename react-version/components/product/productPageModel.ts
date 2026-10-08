import { displayTitle } from '@/lib/format';
import { firmnessFor } from '@/lib/firmness';
import { absoluteUrl } from '@/lib/site';
import { safeUrl } from '@/lib/commerce';
import type { MattressEntry, OutboundCta } from '@/lib/types';
import type { RtingsEvidence } from '@/lib/rtings/types';
import { catalogRtingsCrossCheck } from '@/lib/rtings/evidence';
import { firmnessText, formatUsd, hasQueenPrice, typeLabel } from './productData';
import type { PublicNote } from './productDisplay';

/**
 * Server-side view-model helpers for /mattress/[id]: page copy assembled from
 * catalog fields, the reader-facing review sources and the Product JSON-LD.
 * Nothing here adds a fact the catalog doesn't hold.
 */

export function productPath(entry: Pick<MattressEntry, 'id'>): string {
  return `/mattress/${encodeURIComponent(entry.id)}`;
}

const RATING_FIELDS = ['coolingRatingOutOf10', 'motionIsolationRatingOutOf10', 'edgeSupportRatingOutOf10', 'durabilityRatingOutOf10'] as const;

/**
 * What independent evidence is on file for this entry:
 *   'ratings' - at least one catalog *RatingOutOf10 is a real number;
 *   'rtings'  - no catalog rating, but a published RTINGS record (with a score
 *               or at least one metric) or the hand-curated RTINGS cross-check;
 *   'none'    - neither. Copy must not claim independent ratings.
 */
export type IndependentEvidence = 'ratings' | 'rtings' | 'none';

export function independentEvidenceFor(entry: MattressEntry, published: RtingsEvidence | null = null): IndependentEvidence {
  if (RATING_FIELDS.some((f) => typeof entry[f] === 'number' && Number.isFinite(entry[f]))) return 'ratings';
  if (published && (published.overallScore !== null || published.metrics.length > 0)) return 'rtings';
  if (catalogRtingsCrossCheck(entry)) return 'rtings';
  return 'none';
}

/** The "what's on this page" phrase, built from the evidence actually on file. */
export function contentsPhrase(evidence: IndependentEvidence, { short = false }: { short?: boolean } = {}): string {
  if (short) {
    if (evidence === 'ratings') return 'Specs, independent ratings and your personal Match Score';
    if (evidence === 'rtings') return 'Specs, RTINGS review evidence and your personal Match Score';
    return 'Specs, construction and your personal Match Score';
  }
  if (evidence === 'ratings') return 'Specs, independent ratings, layer-by-layer construction and your personal Match Score, with every unverified detail marked.';
  if (evidence === 'rtings') return 'Specs, RTINGS review evidence, layer-by-layer construction and your personal Match Score, with missing ratings and every unverified detail marked.';
  return 'Specs, layer-by-layer construction and your personal Match Score, with missing ratings and every unverified detail marked.';
}

/** Meta description, also used in the JSON-LD. */
export function describeMattress(entry: MattressEntry, evidence: IndependentEvidence = independentEvidenceFor(entry)): string {
  const firm = firmnessFor(entry);
  const parts = [`${typeLabel(entry)} mattress from ${entry.brand}`];
  if (firm) parts.push(firm.multi ? `sold in several firmness options (${firmnessText(entry)})` : `${firm.label.toLowerCase()} (${firmnessText(entry)})`);
  // Meta copy carries only a comparable (confirmed USD, unflagged) price.
  if (hasQueenPrice(entry)) parts.push(`Queen ${formatUsd(entry.priceUsd)}`);
  return `${displayTitle(entry)}: ${parts.join(', ')}. ${contentsPhrase(evidence)}`;
}

/** "all-foam" for foam builds, otherwise the lower-case type label. */
export function buildWord(entry: MattressEntry): string {
  return entry.type === 'foam' ? 'all-foam' : typeLabel(entry).toLowerCase();
}

/** Long or long-worded names get the smaller display size. */
export function isLongTitle(name: string): boolean {
  return name.length > 18 || name.split(' ').some((w) => w.length > 11);
}

/** "a", "a and b", "a, b and c". */
export function listText(items: readonly string[]): string {
  if (items.length <= 1) return items.join('');
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

/** Reader-facing names for dataIntegrity REQUIRED_FIELDS. */
export const FIELD_LABEL: Readonly<Record<string, string>> = {
  brand: 'brand',
  model: 'model',
  type: 'type',
  heightIn: 'height',
  trialDays: 'trial length',
  warrantyYears: 'warranty',
  firmnessRange: 'firmness',
  priceUsd: 'Queen price',
};

export interface ReviewSourceLink {
  name: string;
  url: string;
}

/** Review sources with a real URL; anything else is not shown. */
export function reviewSourceLinks(entry: MattressEntry): ReviewSourceLink[] {
  return (entry.reviewSources || [])
    .map((s) => ({ name: s.sourceName, url: safeUrl(s.sourceUrl) }))
    .filter((s): s is ReviewSourceLink => Boolean(s.name && s.url));
}

/**
 * schema.org Product. An Offer only when a real, non-provisional Queen price
 * in confirmed US dollars is on file (hasQueenPrice). No availability is claimed: the catalog doesn't record stock.
 */
export function productJsonLd(
  entry: MattressEntry,
  cta: OutboundCta,
  priceNote: PublicNote,
  evidence: IndependentEvidence = independentEvidenceFor(entry),
): Record<string, unknown> {
  const path = productPath(entry);
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: displayTitle(entry),
    brand: { '@type': 'Brand', name: entry.brand },
    ...(entry.manufacturer ? { manufacturer: { '@type': 'Organization', name: entry.manufacturer } } : {}),
    description: describeMattress(entry, evidence),
    image: absoluteUrl(`${path}/opengraph-image`),
    url: absoluteUrl(path),
    sku: entry.id,
    category: `${typeLabel(entry)} mattress`,
    ...(hasQueenPrice(entry) && !priceNote.provisional
      ? {
          offers: {
            '@type': 'Offer',
            price: entry.priceUsd,
            priceCurrency: 'USD',
            ...(cta.href ? { url: cta.href } : {}),
          },
        }
      : {}),
  };
}
