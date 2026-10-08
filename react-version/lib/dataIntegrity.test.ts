import { describe, it, expect } from 'vitest';
import catalog from '@/lib/data/mattress-catalog.json';
import { getVerificationLevel, isRecordVerified, type IntegrityRecord } from '@/lib/dataIntegrity';

const complete: IntegrityRecord = {
  id: 'fixture',
  brand: 'Brand',
  model: 'Model',
  type: 'hybrid',
  heightIn: 12,
  trialDays: 100,
  warrantyYears: 10,
  firmnessRange: { min: 6, max: 6 },
  priceUsd: 1000,
  sourceUrl: 'https://example.com/product',
  lastVerified: '2026-09-25',
};
const ALL_FIELDS = ['type', 'firmnessDescription', 'heightIn', 'trialDays', 'warrantyYears', 'priceUsd'];

describe('getVerificationLevel', () => {
  it('stays verified for a complete, sourced record without bookkeeping (older rows, fixtures)', () => {
    expect(getVerificationLevel(complete)).toBe('verified');
    expect(isRecordVerified(complete)).toBe(true);
  });

  it('is verified when every required field is in verifiedFields and the stored status agrees', () => {
    const e = { ...complete, verificationStatus: 'verified', verifiedFields: ALL_FIELDS };
    expect(getVerificationLevel(e)).toBe('verified');
  });

  it('never rises above a stored partially_verified status', () => {
    const e = { ...complete, verificationStatus: 'partially_verified', verifiedFields: ALL_FIELDS };
    expect(getVerificationLevel(e)).toBe('partially_verified');
    expect(isRecordVerified(e)).toBe(false);
  });

  it('is not verified when a required field is on file but not confirmed against the source', () => {
    const e = { ...complete, verificationStatus: 'verified', verifiedFields: ALL_FIELDS.filter((f) => f !== 'warrantyYears') };
    expect(getVerificationLevel(e)).toBe('partially_verified');
  });

  it('accepts warrantyLifetime as confirming the warranty', () => {
    const e = { ...complete, warrantyYears: null, warrantyLifetime: true, verificationStatus: 'verified', verifiedFields: [...ALL_FIELDS.filter((f) => f !== 'warrantyYears'), 'warrantyLifetime'] };
    expect(getVerificationLevel(e)).toBe('verified');
  });

  it('never labels a catalog entry Verified when the catalog itself does not', () => {
    for (const e of catalog as IntegrityRecord[]) {
      if (getVerificationLevel(e) === 'verified') expect(e.verificationStatus, e.id).toBe('verified');
    }
    const ids = (catalog as IntegrityRecord[]).filter((e) => getVerificationLevel(e) === 'verified').map((e) => e.id);
    for (const id of ['casper-cloud-one', 'purple-restore-plus', 'purple-rejuvenate-plus', 'tuft-and-needle-mint-ii', 'saatva-latex-hybrid', 'leesa-sapira-hybrid']) {
      expect(ids).not.toContain(id);
    }
  });
});
