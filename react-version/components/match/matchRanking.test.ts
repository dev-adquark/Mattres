import { describe, expect, it } from 'vitest';
import type { WireMatchItem } from '@/lib/matchPayload';
import { isSponsored, pickTopMatch, rankedExcept } from './matchRanking';

function item(id: string, sponsored: boolean): WireMatchItem {
  return {
    entry: { id, sponsored },
    badge: sponsored
      ? { label: 'Sponsored', className: 'badge-sponsored' }
      : { label: 'Algorithmic Pick', className: 'badge-none' },
  } as unknown as WireMatchItem;
}

describe('match ranking with sponsored placements', () => {
  it('uses the first non-sponsored result as the top match', () => {
    const results = [item('a', true), item('b', false), item('c', false)];
    const top = pickTopMatch(results);
    expect(top?.item.entry.id).toBe('b');
    expect(top?.rank).toBe(2);
    expect(rankedExcept(results, top?.item).map((r) => [r.item.entry.id, r.rank])).toEqual([
      ['a', 1],
      ['c', 3],
    ]);
  });

  it('returns no recommendation when every result is sponsored', () => {
    expect(pickTopMatch([item('a', true), item('b', true)])).toBeNull();
    expect(pickTopMatch([])).toBeNull();
  });

  it('keeps engine order when nothing is sponsored', () => {
    const results = [item('a', false), item('b', false)];
    expect(pickTopMatch(results)).toEqual({ item: results[0], rank: 1 });
    expect(rankedExcept(results, results[0]).map((r) => r.rank)).toEqual([2]);
  });

  it('honours either the catalog flag or the engine badge', () => {
    const flagOnly = { entry: { id: 'x', sponsored: true }, badge: { label: 'Algorithmic Pick', className: 'badge-none' } };
    const badgeOnly = { entry: { id: 'y', sponsored: false }, badge: { label: 'Sponsored', className: 'badge-sponsored' } };
    expect(isSponsored(flagOnly as unknown as WireMatchItem)).toBe(true);
    expect(isSponsored(badgeOnly as unknown as WireMatchItem)).toBe(true);
  });
});
