import { commerceFor, hostOf, type CommerceSource } from '@/lib/commerce';
import type { AnalyticsEventName, OutboundCta, OutboundKind } from '@/lib/types';

/**
 * Which outbound call-to-action a mattress gets, decided from real data only
 * (lib/commerce.ts). Pure and server-safe: pages compute it once and hand the
 * plain object to components/product/CommerceCta.
 *
 * Priority, highest first:
 *   affiliate    affiliateStatus === 'active' AND a real affiliateUrl.
 *                "Check Price at {retailer}", rel="sponsored noopener noreferrer",
 *                disclosed inline, tracked as affiliate_click.
 *   retailer     a real retailerUrl. "View at {retailer}", tracked as outbound_click.
 *   brand        the manufacturer's own page. "Visit {Brand}", tracked as outbound_click.
 *   unavailable  nothing real on file. Rendered as non-interactive text.
 */

export const AFFILIATE_DISCLOSURE = 'Affiliate link — we may earn a commission';
export const UNAVAILABLE_LABEL = 'Retailer link not available yet';

const REL_AFFILIATE = 'sponsored noopener noreferrer';
const REL_OUTBOUND = 'noopener noreferrer nofollow';

export function ctaFor(entry: CommerceSource | null | undefined): OutboundCta {
  const c = commerceFor(entry);
  const brand = entry && typeof entry.brand === 'string' ? entry.brand : null;

  if (c.affiliateStatus === 'active' && c.affiliateUrl) {
    const host = hostOf(c.affiliateUrl);
    const retailerName = c.retailerName || host;
    return {
      kind: 'affiliate',
      href: c.affiliateUrl,
      label: `Check Price at ${retailerName}`,
      retailerName,
      host,
      rel: REL_AFFILIATE,
      disclosure: AFFILIATE_DISCLOSURE,
      event: 'affiliate_click',
    };
  }

  if (c.retailerUrl) {
    const host = hostOf(c.retailerUrl);
    const retailerName = c.retailerName || host;
    return {
      kind: 'retailer',
      href: c.retailerUrl,
      label: `View at ${retailerName}`,
      retailerName,
      host,
      rel: REL_OUTBOUND,
      disclosure: null,
      event: 'outbound_click',
    };
  }

  if (c.brandUrl) {
    const host = hostOf(c.brandUrl);
    const name = brand || host;
    return {
      kind: 'brand',
      href: c.brandUrl,
      label: `Visit ${name}`,
      retailerName: name,
      host,
      rel: REL_OUTBOUND,
      disclosure: null,
      event: 'outbound_click',
    };
  }

  return {
    kind: 'unavailable',
    href: null,
    label: UNAVAILABLE_LABEL,
    retailerName: null,
    host: null,
    rel: null,
    disclosure: null,
    event: null,
  };
}

export interface OutboundLinkInfo {
  href: string;
  label: string;
  retailerName: string | null;
  kind: Exclude<OutboundKind, 'unavailable'>;
  rel: string;
}

/** Convenience wrapper around ctaFor(): the real outbound destination for a mattress, or null when there isn't one. */
export function outboundLinkFor(entry: CommerceSource | null | undefined): OutboundLinkInfo | null {
  const cta = ctaFor(entry);
  if (cta.kind === 'unavailable' || !cta.href || !cta.rel) return null;
  return { href: cta.href, label: cta.label, retailerName: cta.retailerName, kind: cta.kind, rel: cta.rel };
}

const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'] as const;
export type UtmKey = (typeof UTM_KEYS)[number];
export type UtmParams = Partial<Record<UtmKey, string>>;

/** The utm_* parameters already present on a destination URL (never invented). */
export function utmFrom(href: string): UtmParams {
  const out: UtmParams = {};
  try {
    const url = new URL(href);
    for (const key of UTM_KEYS) {
      const value = url.searchParams.get(key);
      if (value) out[key] = value;
    }
  } catch {
    // Not a URL - no UTM data.
  }
  return out;
}

export interface ClickContext {
  mattressId?: string | null;
  brand?: string | null;
  placement?: string | null;
  page?: string | null;
  now?: Date;
}

export interface ClickEvent {
  name: Extract<AnalyticsEventName, 'affiliate_click' | 'outbound_click'>;
  props: Record<string, string | null>;
}

/**
 * Analytics payload for a click on a CTA from ctaFor(). Primitive values only.
 * affiliate_click: { product, retailer, placement, page, timestamp, utm_* }
 * outbound_click:  { mattress_id, brand, link_kind, retailer, destination_host, placement, page }
 */
export function clickEventFor(
  cta: OutboundCta | null | undefined,
  { mattressId, brand, placement, page, now = new Date() }: ClickContext = {}
): ClickEvent | null {
  if (!cta || !cta.event || !cta.href) return null;
  if (cta.kind === 'affiliate') {
    return {
      name: 'affiliate_click',
      props: {
        product: mattressId || null,
        retailer: cta.retailerName || null,
        placement: placement || null,
        page: page || null,
        timestamp: now.toISOString(),
        ...utmFrom(cta.href),
      },
    };
  }
  return {
    name: 'outbound_click',
    props: {
      mattress_id: mattressId || null,
      brand: brand || null,
      link_kind: cta.kind,
      retailer: cta.retailerName || null,
      destination_host: cta.host || null,
      placement: placement || null,
      page: page || null,
    },
  };
}
