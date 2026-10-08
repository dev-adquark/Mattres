import { describe, expect, it } from 'vitest';
import { formatPrice, formatShortDate, formatUsd } from './format';

describe('formatUsd', () => {
  it('prints whole-dollar prices without cents', () => {
    expect(formatUsd(1299)).toBe('$1,299');
  });

  it('prints fractional prices with exactly two decimals, never a raw float', () => {
    expect(formatUsd(1598.8)).toBe('$1,598.80');
    expect(formatUsd(899.99)).toBe('$899.99');
  });

  it('returns an empty string for non-numbers', () => {
    expect(formatUsd(null)).toBe('');
    expect(formatUsd(Number.NaN)).toBe('');
  });
});

describe('formatPrice', () => {
  it('uses the Queen price, never a lowest-size "from" price, else an honest missing label', () => {
    expect(formatPrice({ priceUsd: 1598.8 })).toBe('$1,598.80');
    expect(formatPrice({ priceUsd: null, priceFromUsd: 699 })).toBe('Price not yet verified');
    expect(formatPrice({ priceUsd: null })).toBe('Price not yet verified');
  });
  it('withholds a figure flagged for a re-check and qualifies a currency-unconfirmed one', () => {
    expect(formatPrice({ priceUsd: 3214, priceNeedsReverification: true })).toBe('Price not yet verified');
    expect(formatPrice({ priceUsd: 658.75, priceCurrency: 'unconfirmed_likely_CAD' })).toBe('$658.75 (currency not confirmed)');
    expect(formatPrice({ priceUsd: 899, priceCurrency: 'USD' })).toBe('$899');
  });
});

describe('formatShortDate', () => {
  it('formats ISO dates as "25 Sep 2026" in UTC', () => {
    expect(formatShortDate('2026-09-25')).toBe('25 Sep 2026');
    expect(formatShortDate('2026-01-03T23:59:00-08:00')).toBe('3 Jan 2026');
  });
  it('returns null for anything that is not an ISO date', () => {
    expect(formatShortDate('Sep 25, 2026')).toBeNull();
    expect(formatShortDate(null)).toBeNull();
  });
});
