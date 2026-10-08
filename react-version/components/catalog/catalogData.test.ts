import { describe, it, expect } from 'vitest';
import catalogJson from '@/lib/data/mattress-catalog.json';
import type { MattressEntry } from '@/lib/types';
import { MATERIAL_TAGS, materialTagsFor, materialLine } from '@/components/catalog/catalogData';

const catalog = catalogJson as unknown as MattressEntry[];
const byId = (id: string): MattressEntry => {
  const e = catalog.find((m) => m.id === id);
  if (!e) throw new Error(`missing ${id}`);
  return e;
};

describe('material tags from construction notes', () => {
  it('never claims "pocketed": the notes often name a coil unit without saying so', () => {
    for (const tag of MATERIAL_TAGS) expect(tag.label.toLowerCase()).not.toContain('pocket');
  });

  it('a stated absence ("no springs") is not a material', () => {
    const bliss = byId('plushbeds-botanical-bliss');
    expect(bliss.coreMaterialNotes?.toLowerCase()).toContain('no springs');
    expect(materialTagsFor(bliss)).not.toContain('coils');
    expect(materialTagsFor(bliss)).toContain('latex');
    expect(materialLine(bliss)).toBe('Latex');
    expect(materialTagsFor({ coreMaterialNotes: 'Foam layers without coils' })).toEqual([]);
    expect(materialTagsFor({ coreMaterialNotes: 'zero coils; memory foam' })).toEqual(['memory-foam']);
  });

  it('Saatva Classic (dual-coil innerspring) is tagged "Coils", not "Pocketed coils"', () => {
    const classic = byId('saatva-classic');
    expect(materialTagsFor(classic)).toContain('coils');
    expect(materialLine(classic)).toContain('Coils');
    expect(materialLine(classic)).not.toMatch(/pocketed/i);
  });

  it('still tags entries that name springs or pocket-spring cores', () => {
    expect(materialTagsFor(byId('leesa-original-hybrid'))).toContain('coils');
    expect(materialTagsFor(byId('sleep-on-latex-hybrid'))).toContain('coils');
  });
});

describe('listing shots', () => {
  it('no tile shares its shot with the tile beside or above it in a 1-3 column grid', async () => {
    const { listingShot, LISTING_SHOTS } = await import('@/components/catalog/catalogData');
    expect(new Set(LISTING_SHOTS.map((s) => s.id)).size).toBe(LISTING_SHOTS.length);
    for (let i = 0; i < 40; i += 1) {
      for (const step of [1, 2, 3]) expect(listingShot(i + step).id, `slot ${i} +${step}`).not.toBe(listingShot(i).id);
    }
  });
});
