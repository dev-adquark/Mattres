import { describe, expect, it } from 'vitest';
import catalog from '@/lib/data/mattress-catalog.json';
import snapshot from '@/lib/data/rtings-evidence.json';
import type { MattressEntry } from '@/lib/types';
import { catalogRtingsCrossCheck, toEvidence } from './evidence';
import { isSectionNavigation, realRecommendedFor } from './sectionTags';

describe('RTINGS section navigation is never shown as a recommendation', () => {
  it('treats the scraped section-heading list as navigation', () => {
    const nav = ['Side Sleeping', 'Back Sleeping', 'Stomach Sleeping', 'Longevity', 'Pressure Relief', 'Support', 'Cooling', 'Motion Dissipation', 'Responsiveness'];
    expect(isSectionNavigation(nav)).toBe(true);
    expect(isSectionNavigation([...nav, 'Firmness', 'Edge Support'])).toBe(true);
    expect(realRecommendedFor(nav)).toEqual([]);
    expect(realRecommendedFor(['Side Sleepers'])).toEqual(['Side Sleepers']);
    expect(isSectionNavigation([])).toBe(false);
  });

  it('the catalog holds no section-navigation list as rtingsRecommendedFor', () => {
    for (const e of catalog as MattressEntry[]) {
      const tags = e.rtingsRecommendedFor ?? [];
      expect(isSectionNavigation(tags), e.id).toBe(false);
      expect(catalogRtingsCrossCheck(e)?.recommendedFor ?? [], e.id).toEqual(realRecommendedFor(tags));
    }
  });

  it('no displayed recommendedFor list is shared by more than half of the reviews', () => {
    type Row = Parameters<typeof toEvidence>[0];
    const published = (snapshot as unknown as { published: Row[] }).published;
    const lists = [
      ...published.map((row) => toEvidence(row, 'any').recommendedFor),
      ...(catalog as MattressEntry[]).map((e) => catalogRtingsCrossCheck(e)?.recommendedFor ?? []),
    ];
    const total = published.length + (catalog as MattressEntry[]).filter((e) => catalogRtingsCrossCheck(e)).length;
    const counts = new Map<string, number>();
    for (const l of lists) {
      if (!l.length) continue;
      const key = [...l].sort().join('|');
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    for (const [key, n] of counts) expect(n, key).toBeLessThanOrEqual(total / 2);
  });
});
