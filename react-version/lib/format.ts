import type { MattressEntry, MattressType } from '@/lib/types';
import { queenPriceText, type QueenPriceSource } from '@/lib/commerce';

/**
 * De-duplicates brand+model names (e.g. "Nimbus Nimbus Pocket Coil" ->
 * "Nimbus Pocket Coil") - ported as-is from the original project's
 * displayTitle().
 */
export function displayTitle(entry: Pick<MattressEntry, 'brand' | 'model'>): string {
  const firstBrandWord = (entry.brand.split(' ')[0] as string).toLowerCase();
  if (entry.model.toLowerCase().indexOf(firstBrandWord) === 0) return entry.model;
  // The model already names the whole brand as a word ("The Purple Mattress").
  const brandWord = new RegExp(`(^|[^a-z0-9])${entry.brand.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}($|[^a-z0-9])`, 'i');
  if (brandWord.test(entry.model)) return entry.model;
  return `${entry.brand} ${entry.model}`;
}

export const MATTRESS_THUMB_COLORS: Record<MattressType, readonly [string, string]> = {
  foam: ['#8ff2e4', '#22c9b0'],
  hybrid: ['#3fd4ff', '#3b6cf6'],
  innerspring: ['#5b8dff', '#6d3ff5'],
  latex: ['#c8e6a0', '#6d9c3f'],
};

/**
 * Real catalog entries can have a null priceUsd - either because the
 * manufacturer's price is rendered client-side and couldn't be captured
 * (Helix), or because only a "from" lowest-size price was found and using
 * it as a like-for-like Queen-size comparison price would be misleading
 * (Leesa). Every UI spot that displays a catalog entry's price goes
 * through this so none of them can silently call .toLocaleString() on
 * null and crash, or show a lowest-size price as if it were the size
 * being compared.
 */
export function formatPrice(entry: QueenPriceSource & { priceFromUsd?: number | null }): string {
  // A lowest-size "from" price (priceFromUsd) is never shown as the Queen
  // price; a provisional or currency-unconfirmed figure carries its qualifier.
  return queenPriceText(entry) ?? 'Price not yet verified';
}

/**
 * Formats a USD amount exactly as published: whole dollars print without
 * cents ("$1,299"), fractional amounts always print two decimals
 * ("$1,598.80") - never a raw float like "$1,598.8", and never rounded
 * into a price the retailer didn't publish.
 */
export function formatUsd(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === '') return '';
  const n = Number(value);
  if (!Number.isFinite(n)) return '';
  const cents = Math.round(n * 100);
  const whole = cents % 100 === 0;
  return `$${(cents / 100).toLocaleString('en-US', {
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: whole ? 0 : 2,
  })}`;
}

const SHORT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * The one reader-facing date format: "2026-09-25" -> "25 Sep 2026" (UTC, so
 * server and client agree). Null for anything that is not an ISO date.
 */
export function formatShortDate(iso: unknown): string | null {
  if (typeof iso !== 'string' || !/^\d{4}-\d{2}-\d{2}/.test(iso)) return null;
  const d = new Date(`${iso.slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return null;
  return `${d.getUTCDate()} ${SHORT_MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}
