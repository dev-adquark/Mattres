/**
 * Commerce fields for a catalog entry - the affiliate-ready data model
 * (brief v2 §17, §32), read from whatever the entry actually carries.
 *
 * Every field is OPTIONAL on a catalog entry and nothing here invents a
 * value. Today no entry has an affiliate relationship, so every entry
 * resolves to affiliateStatus 'none'.
 *
 *   brandUrl         the manufacturer's own product page. Falls back to the
 *                    catalog's existing `officialProductUrl`.
 *   retailerUrl      a real third-party retailer listing. Falls back to the
 *                    first entry of the catalog's existing `retailerUrls`.
 *   retailerName     the retailer's name. Falls back to the first entry of
 *                    `retailPartners`. A name with no URL stays a name only.
 *   affiliateUrl     a tracked affiliate destination. Only ever used when
 *                    affiliateStatus is 'active'.
 *   affiliateStatus  'none' | 'pending' | 'active'. Anything else is 'none'.
 *   sponsored        true only when the entry says so. A sponsored entry is
 *                    labelled everywhere it appears and never changes a score
 *                    or a ranking (see lib/sponsored.test.ts).
 */

import type { MattressEntry } from '@/lib/types';

export const AFFILIATE_STATUSES = ['none', 'pending', 'active'] as const;
export type AffiliateStatus = (typeof AFFILIATE_STATUSES)[number];

/**
 * The commerce-relevant fields an entry MAY carry. Catalog records only have
 * the MattressEntry ones today; brandUrl / retailerUrl / retailerName are
 * accepted when a future data source supplies them. Values are read
 * defensively because they can come from JSON or the database.
 */
export type CommerceSource = Partial<
  Pick<MattressEntry, 'officialProductUrl' | 'retailerUrls' | 'retailPartners' | 'affiliateUrl' | 'affiliateStatus' | 'sponsored' | 'brand'>
> & {
  brandUrl?: string | null;
  retailerUrl?: string | null;
  retailerName?: string | null;
};

export interface Commerce {
  brandUrl: string | null;
  retailerUrl: string | null;
  retailerName: string | null;
  affiliateUrl: string | null;
  affiliateStatus: AffiliateStatus;
  sponsored: boolean;
}

// Hosts reserved for documentation/examples. A URL on one of these is a
// placeholder by definition, so it is never treated as a real destination.
const PLACEHOLDER_HOST = /(^|\.)(example\.(com|org|net)|localhost|invalid|test)$/i;

/** A real, absolute http(s) URL, or null. */
export function safeUrl(value: unknown): string | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
  if (!url.hostname || PLACEHOLDER_HOST.test(url.hostname)) return null;
  return url.toString();
}

export function hostOf(href: string): string | null {
  try {
    return new URL(href).hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

function firstString(list: unknown): string | null {
  if (!Array.isArray(list)) return null;
  const hit: unknown = list.find((v: unknown) => typeof v === 'string' && v.trim());
  return typeof hit === 'string' ? hit.trim() : null;
}

function cleanName(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function isAffiliateStatus(value: unknown): value is AffiliateStatus {
  return typeof value === 'string' && (AFFILIATE_STATUSES as readonly string[]).includes(value);
}

export function commerceFor(entry: CommerceSource | null | undefined): Commerce {
  if (!entry || typeof entry !== 'object') {
    return { brandUrl: null, retailerUrl: null, retailerName: null, affiliateUrl: null, affiliateStatus: 'none', sponsored: false };
  }
  const brandUrl = safeUrl(entry.brandUrl) || safeUrl(entry.officialProductUrl);
  const retailerUrl = safeUrl(entry.retailerUrl) || safeUrl(firstString(entry.retailerUrls));
  const retailerName = cleanName(entry.retailerName) || firstString(entry.retailPartners);
  const affiliateStatus: AffiliateStatus = isAffiliateStatus(entry.affiliateStatus) ? entry.affiliateStatus : 'none';
  const affiliateUrl = safeUrl(entry.affiliateUrl);
  return {
    brandUrl,
    retailerUrl,
    retailerName,
    affiliateUrl,
    affiliateStatus,
    sponsored: entry.sponsored === true,
  };
}

/* ---------------------------------------------------------------------- */
/* Queen price: one honest reading shared by every surface                 */
/* ---------------------------------------------------------------------- */

/**
 * How far a catalog Queen price (priceUsd) can be trusted:
 *   confirmed            a published Queen price in US dollars
 *   currency-unconfirmed on file, but the source never stated the currency
 *                        (priceCurrency set to anything other than 'USD')
 *
 * A figure flagged for a re-check (priceNeedsReverification) is WITHHELD:
 * queenPriceOf() returns null for it, so every surface renders it exactly
 * like a missing price ("Price not yet verified"). The catalog's own notes
 * call those figures a likely fetch mixup, and a "provisional" label does
 * not make publishing a probably-wrong price honest. The figure stays in the
 * data only, until someone re-checks it on the brand's page; see
 * priceAwaitingRecheck(). 'provisional' remains in QueenPriceStatus only so
 * existing status checks keep compiling; queenPriceOf() never returns it.
 *
 * Only a 'confirmed' price is comparable: price buckets, budget pages, price
 * sorts, brand price ranges, "lowest price" leads and Offer JSON-LD use
 * comparableQueenPriceUsd() and nothing else. priceFromUsd (a lowest-size
 * "from" price) is never a Queen price and is not read here.
 */
export type QueenPriceStatus = 'confirmed' | 'provisional' | 'currency-unconfirmed';

export type QueenPriceSource = {
  priceUsd?: number | null;
  priceCurrency?: string | null;
  priceNeedsReverification?: boolean | null;
};

export interface QueenPrice {
  amount: number;
  status: QueenPriceStatus;
}

export function queenPriceOf(entry: QueenPriceSource | null | undefined): QueenPrice | null {
  const amount = entry?.priceUsd;
  if (typeof amount !== 'number' || !Number.isFinite(amount)) return null;
  // Flagged for a re-check: withheld, never displayed (see above).
  if (entry?.priceNeedsReverification === true) return null;
  const currency = entry?.priceCurrency;
  if (typeof currency === 'string' && currency.trim() && currency.trim().toUpperCase() !== 'USD') {
    return { amount, status: 'currency-unconfirmed' };
  }
  return { amount, status: 'confirmed' };
}

/**
 * True when a Queen figure is on file but withheld because it is flagged for
 * a re-check. Lets a surface say why no price is shown, without the figure.
 */
export function priceAwaitingRecheck(entry: QueenPriceSource | null | undefined): boolean {
  const amount = entry?.priceUsd;
  return typeof amount === 'number' && Number.isFinite(amount) && entry?.priceNeedsReverification === true;
}

/** The Queen price in USD when it can be compared with other entries, else null. */
export function comparableQueenPriceUsd(entry: QueenPriceSource | null | undefined): number | null {
  const price = queenPriceOf(entry);
  return price && price.status === 'confirmed' ? price.amount : null;
}

/** Short reader-facing qualifier for a price that is on file but not comparable. */
export const QUEEN_PRICE_QUALIFIER: Record<QueenPriceStatus, string | null> = {
  confirmed: null,
  provisional: 'provisional',
  'currency-unconfirmed': 'currency not confirmed',
};

/**
 * "$1,299", "$658.75 (currency not confirmed)", or null when no Queen price
 * is on file or the figure on file is withheld pending a re-check. The amount is printed as published -
 * a currency-unconfirmed figure keeps its bare "$" because that is what the
 * source showed, and the qualifier says the currency is unknown.
 */
export function queenPriceText(entry: QueenPriceSource | null | undefined): string | null {
  const price = queenPriceOf(entry);
  if (!price) return null;
  const n = Math.round(price.amount * 100) / 100;
  const amount = `$${n.toLocaleString('en-US', { minimumFractionDigits: Number.isInteger(n) ? 0 : 2, maximumFractionDigits: 2 })}`;
  const qualifier = QUEEN_PRICE_QUALIFIER[price.status];
  return qualifier ? `${amount} (${qualifier})` : amount;
}
