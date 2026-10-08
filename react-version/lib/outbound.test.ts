import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { commerceFor, safeUrl } from './commerce';
import type { MattressEntry } from './types';
import { ctaFor, outboundLinkFor, clickEventFor, utmFrom, AFFILIATE_DISCLOSURE, UNAVAILABLE_LABEL } from './outbound';

// Synthetic fixtures only - none of these destinations exist in the catalog.
const BASE = { id: 'fixture-mattress', brand: 'Fixture Brand', model: 'One' };

const AFFILIATE_FIXTURE = {
  ...BASE,
  officialProductUrl: 'https://fixture-brand.test-shop.co/one',
  retailerUrl: 'https://retailer-fixture.co/listing/one',
  retailerName: 'Fixture Retailer',
  affiliateUrl: 'https://track.affiliate-fixture.co/c?id=1&utm_source=mms&utm_medium=affiliate&utm_campaign=one',
  affiliateStatus: 'active',
};
const RETAILER_FIXTURE = {
  ...BASE,
  officialProductUrl: 'https://fixture-brand.test-shop.co/one',
  retailerUrls: ['https://retailer-fixture.co/listing/one'],
  retailPartners: ['Fixture Retailer'],
};
const BRAND_FIXTURE = { ...BASE, officialProductUrl: 'https://fixture-brand.test-shop.co/one' };
const NONE_FIXTURE = { ...BASE, officialProductUrl: null, retailPartners: ['Name Only Retailer'], retailerUrls: [] };

describe('ctaFor', () => {
  it('affiliate: only when status is active and an affiliate URL exists', () => {
    const cta = ctaFor(AFFILIATE_FIXTURE);
    expect(cta.kind).toBe('affiliate');
    expect(cta.href).toBe(AFFILIATE_FIXTURE.affiliateUrl);
    expect(cta.label).toBe('Check Price at Fixture Retailer');
    expect(cta.rel).toBe('sponsored noopener noreferrer');
    expect(cta.disclosure).toBe(AFFILIATE_DISCLOSURE);
    expect(cta.event).toBe('affiliate_click');
  });

  it('a pending or missing affiliate status never produces an affiliate CTA', () => {
    expect(ctaFor({ ...AFFILIATE_FIXTURE, affiliateStatus: 'pending' }).kind).toBe('retailer');
    expect(ctaFor({ ...AFFILIATE_FIXTURE, affiliateStatus: undefined }).kind).toBe('retailer');
    expect(ctaFor({ ...AFFILIATE_FIXTURE, affiliateStatus: 'ACTIVE' }).kind).toBe('retailer');
    expect(ctaFor({ ...AFFILIATE_FIXTURE, affiliateUrl: null }).kind).toBe('retailer');
  });

  it('retailer: a real retailer URL, named, non-affiliate rel', () => {
    const cta = ctaFor(RETAILER_FIXTURE);
    expect(cta.kind).toBe('retailer');
    expect(cta.label).toBe('View at Fixture Retailer');
    expect(cta.retailerName).toBe('Fixture Retailer');
    expect(cta.rel).toBe('noopener noreferrer nofollow');
    expect(cta.rel).not.toContain('sponsored');
    expect(cta.disclosure).toBeNull();
    expect(cta.event).toBe('outbound_click');
  });

  it('brand: the manufacturer page, labelled "Visit {Brand}"', () => {
    const cta = ctaFor(BRAND_FIXTURE);
    expect(cta.kind).toBe('brand');
    expect(cta.href).toBe('https://fixture-brand.test-shop.co/one');
    expect(cta.label).toBe('Visit Fixture Brand');
    expect(cta.rel).toBe('noopener noreferrer nofollow');
    expect(cta.event).toBe('outbound_click');
  });

  it('unavailable: no real destination, no href, honest label', () => {
    const cta = ctaFor(NONE_FIXTURE);
    expect(cta.kind).toBe('unavailable');
    expect(cta.href).toBeNull();
    expect(cta.label).toBe(UNAVAILABLE_LABEL);
    expect(cta.event).toBeNull();
    expect(outboundLinkFor(NONE_FIXTURE)).toBeNull();
  });

  it('never treats placeholder or non-http URLs as real destinations', () => {
    expect(ctaFor({ ...BASE, officialProductUrl: 'https://example.com/x' }).kind).toBe('unavailable');
    expect(ctaFor({ ...BASE, officialProductUrl: 'javascript:alert(1)' }).kind).toBe('unavailable');
    expect(ctaFor({ ...BASE, retailerUrls: ['not a url'] }).kind).toBe('unavailable');
    expect(safeUrl('https://www.example.org/a')).toBeNull();
  });
});

describe('outboundLinkFor', () => {
  it('returns the CTA destination for every real kind', () => {
    expect(outboundLinkFor(RETAILER_FIXTURE)).toMatchObject({ kind: 'retailer', retailerName: 'Fixture Retailer' });
    expect(outboundLinkFor(BRAND_FIXTURE)).toMatchObject({ kind: 'brand', label: 'Visit Fixture Brand' });
  });
});

describe('clickEventFor', () => {
  const now = new Date('2026-10-06T12:00:00.000Z');

  it('affiliate_click carries product, retailer, placement, page, timestamp and the URL\'s own UTM data', () => {
    const event = clickEventFor(ctaFor(AFFILIATE_FIXTURE), { mattressId: 'fixture-mattress', placement: 'hero', page: '/mattress/fixture-mattress', now });
    if (!event) throw new Error('expected an affiliate_click event');
    expect(event.name).toBe('affiliate_click');
    expect(event.props).toEqual({
      product: 'fixture-mattress',
      retailer: 'Fixture Retailer',
      placement: 'hero',
      page: '/mattress/fixture-mattress',
      timestamp: '2026-10-06T12:00:00.000Z',
      utm_source: 'mms',
      utm_medium: 'affiliate',
      utm_campaign: 'one',
    });
  });

  it('brand and retailer links fire outbound_click, never affiliate_click', () => {
    expect(clickEventFor(ctaFor(BRAND_FIXTURE), { mattressId: 'x', brand: 'Fixture Brand' })?.name).toBe('outbound_click');
    const retailer = clickEventFor(ctaFor(RETAILER_FIXTURE), { mattressId: 'x', placement: 'glance' });
    if (!retailer) throw new Error('expected an outbound_click event');
    expect(retailer.name).toBe('outbound_click');
    expect(retailer.props).toMatchObject({ link_kind: 'retailer', retailer: 'Fixture Retailer', destination_host: 'retailer-fixture.co', placement: 'glance' });
  });

  it('no event for an unavailable CTA', () => {
    expect(clickEventFor(ctaFor(NONE_FIXTURE), {})).toBeNull();
  });

  it('utmFrom only reports parameters that are really on the URL', () => {
    expect(utmFrom('https://shop.co/a?utm_source=x')).toEqual({ utm_source: 'x' });
    expect(utmFrom('https://shop.co/a')).toEqual({});
  });
});

describe('the real catalog', () => {
  const catalog: MattressEntry[] = JSON.parse(readFileSync(join(import.meta.dirname, 'data', 'mattress-catalog.json'), 'utf8'));

  it('has no active affiliate relationships, so no entry gets an affiliate CTA', () => {
    for (const entry of catalog) {
      expect(commerceFor(entry).affiliateStatus).toBe('none');
      expect(ctaFor(entry).kind).not.toBe('affiliate');
    }
  });

  it('every non-unavailable CTA points at a URL recorded on the entry itself', () => {
    for (const entry of catalog) {
      const cta = ctaFor(entry);
      if (cta.kind === 'unavailable') continue;
      const recorded = [entry.officialProductUrl, ...(entry.retailerUrls || [])].filter((u): u is string => Boolean(u)).map((u) => new URL(u).toString());
      expect(recorded).toContain(cta.href);
    }
  });
});
