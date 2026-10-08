import { describe, expect, it, vi } from 'vitest';

// next/cache's unstable_cache needs the Next runtime; the uncached loader is what is under test.
vi.mock('next/cache', () => ({ unstable_cache: (fn: unknown) => fn }));

import catalog from '@/lib/data/mattress-catalog.json';
import { loadPublishedPhotoMap } from './photos';

describe('loadPublishedPhotoMap against the committed RTINGS snapshot', () => {
  it('gives every published, exactly matched review a credited photo that belongs to it', async () => {
    const map = await loadPublishedPhotoMap();
    const ids = Object.keys(map);
    expect(ids.length).toBe(14);
    const catalogIds = new Set((catalog as { id: string }[]).map((e) => e.id));
    for (const id of ids) {
      const photo = map[id]!;
      expect(catalogIds.has(id)).toBe(true);
      expect(photo.src).toMatch(/^https:\/\/i\.rtings\.com\/assets\/products\/[A-Za-z0-9]+\/[a-z0-9-]+\/[^/]+\.jpe?g$/);
      expect(photo.creditUrl).toMatch(/^https:\/\/www\.rtings\.com\/mattress\/reviews\/[a-z0-9-]+\/[a-z0-9-]+$/);
      expect(photo.credit).toBe('Photo: RTINGS');
      expect(photo.alt).toMatch(/photographed by RTINGS$/);
    }
  });

  it('never assigns the same photo to two different mattresses', async () => {
    const map = await loadPublishedPhotoMap();
    const srcs = Object.values(map).map((p) => p.src);
    expect(new Set(srcs).size).toBe(srcs.length);
  });

  it('gives no photo to mattresses without a published match (they keep the render)', async () => {
    const map = await loadPublishedPhotoMap();
    expect(map['tuft-and-needle-mint-ii']).toBeUndefined();
    expect(map['helix-midnight']).toBeUndefined();
    expect(map['helix-midnight-luxe']).toBeUndefined();
  });
});
