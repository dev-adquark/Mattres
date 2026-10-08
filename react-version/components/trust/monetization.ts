import type { OutboundKind } from '@/lib/types';
import { ctaFor } from '@/lib/outbound';
import { commerceFor, type CommerceSource } from '@/lib/commerce';

export interface MonetizationStatus {
  total: number;
  /** How many entries get each kind of outbound button (lib/outbound ctaFor). */
  links: Record<OutboundKind, number>;
  affiliatePending: number;
  sponsored: number;
  earnsCommission: boolean;
  hasSponsored: boolean;
  commissionLine: string;
  shortLine: string;
}

function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

/**
 * How the site earns money, derived from the same per-entry commerce
 * config that decides every outbound button (lib/outbound ctaFor).
 * Nothing here is hand-written: the moment one catalog entry gains an
 * active affiliate link or a sponsored flag, every trust line that reads
 * this (footer, /disclosures, /methodology#money) changes with it.
 *
 * Pure and server-safe.
 */
export function monetizationStatus(entries: readonly CommerceSource[] | null | undefined): MonetizationStatus {
  const list = Array.isArray(entries) ? entries : [];
  const links: Record<OutboundKind, number> = { affiliate: 0, retailer: 0, brand: 0, unavailable: 0 };
  let affiliatePending = 0;
  let sponsored = 0;
  for (const entry of list) {
    links[ctaFor(entry).kind] += 1;
    const c = commerceFor(entry);
    if (c.affiliateStatus === 'pending') affiliatePending += 1;
    if (c.sponsored) sponsored += 1;
  }
  const earnsCommission = links.affiliate > 0;
  const hasSponsored = sponsored > 0;

  let commissionLine: string;
  if (!earnsCommission && !hasSponsored) {
    commissionLine = 'We don’t earn commissions today; scores can’t be bought.';
  } else if (earnsCommission && !hasSponsored) {
    commissionLine = `We may earn a commission on ${plural(links.affiliate, 'labeled affiliate link', 'labeled affiliate links')}; it never changes a score.`;
  } else if (!earnsCommission && hasSponsored) {
    commissionLine = `${plural(sponsored, 'mattress carries', 'mattresses carry')} a labeled sponsored placement; it never changes a score.`;
  } else {
    commissionLine = 'We may earn commissions on labeled affiliate links, and sponsored placements are labeled; neither changes a score.';
  }

  const shortLine = earnsCommission ? 'Affiliate links labeled. Scores cannot be bought.' : 'We earn nothing today. Scores cannot be bought.';

  return { total: list.length, links, affiliatePending, sponsored, earnsCommission, hasSponsored, commissionLine, shortLine };
}
