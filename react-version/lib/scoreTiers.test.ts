import { describe, it, expect } from 'vitest';
import { tierFor, dimensionLabel, TIERS } from '@/lib/scoreTiers';

describe('tierFor', () => {
  it('maps each boundary to the agreed tier', () => {
    expect(tierFor(100).id).toBe('excellent');
    expect(tierFor(90).label).toBe('Excellent match');
    expect(tierFor(89).label).toBe('Strong match');
    expect(tierFor(80).id).toBe('strong');
    expect(tierFor(79).label).toBe('Good match');
    expect(tierFor(70).id).toBe('good');
    expect(tierFor(69).label).toBe('Fair match');
    expect(tierFor(60).id).toBe('fair');
    expect(tierFor(59).label).toBe('Weak match');
    expect(tierFor(0).id).toBe('weak');
  });
  it('returns id, label and description', () => {
    const t = tierFor(85);
    expect(t).toMatchObject({ id: 'strong', label: 'Strong match' });
    expect(t.description.length).toBeGreaterThan(10);
  });
  it('never labels a missing score as a weak match', () => {
    expect(tierFor(null).id).toBe('unscored');
    expect(tierFor(undefined).label).toBe('Not scored');
    expect(tierFor(NaN).id).toBe('unscored');
  });
  it('returns a copy so callers cannot mutate the table', () => {
    tierFor(95).label = 'mutated';
    expect(TIERS[0]?.label).toBe('Excellent match');
  });
});

describe('dimensionLabel', () => {
  it('labels sub-scores', () => {
    expect(dimensionLabel(10)).toBe('Excellent');
    expect(dimensionLabel(9)).toBe('Excellent');
    expect(dimensionLabel(8.9)).toBe('Strong');
    expect(dimensionLabel(8)).toBe('Strong');
    expect(dimensionLabel(7)).toBe('Good');
    expect(dimensionLabel(5.5)).toBe('Moderate');
    expect(dimensionLabel(5.4)).toBe('Weak');
    expect(dimensionLabel(0)).toBe('Weak');
    expect(dimensionLabel(null)).toBe('Unknown');
  });
});
