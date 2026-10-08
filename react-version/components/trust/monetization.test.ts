import { describe, expect, it } from 'vitest';
import { monetizationStatus } from './monetization';
import { loadJsonFallback } from '@/lib/db/mattressRepo';

const entries = loadJsonFallback();

describe('monetizationStatus', () => {
  it('reports no commissions for the current catalog', () => {
    const m = monetizationStatus(entries);
    expect(m.total).toBe(entries.length);
    expect(m.earnsCommission).toBe(false);
    expect(m.links.affiliate).toBe(0);
    expect(m.commissionLine).toMatch(/don.t earn commissions today/);
  });

  it('flips the line as soon as one entry has an active affiliate link', () => {
    const live = [...entries.slice(0, 3), { ...entries[0], affiliateStatus: 'active', affiliateUrl: 'https://retailer.example/p?aff=1', retailerName: 'Example' }];
    const m = monetizationStatus(live);
    expect(m.earnsCommission).toBe(true);
    expect(m.links.affiliate).toBe(1);
    expect(m.commissionLine).not.toMatch(/don.t earn/);
    expect(m.commissionLine).toMatch(/commission/);
  });

  it('a pending affiliate status alone does not count as earning', () => {
    const m = monetizationStatus([{ ...entries[0], affiliateStatus: 'pending', affiliateUrl: 'https://retailer.example/p' }]);
    expect(m.earnsCommission).toBe(false);
    expect(m.affiliatePending).toBe(1);
  });

  it('reports sponsored placements', () => {
    const m = monetizationStatus([{ ...entries[0], sponsored: true }]);
    expect(m.hasSponsored).toBe(true);
    expect(m.commissionLine).toMatch(/sponsored/);
  });
});
