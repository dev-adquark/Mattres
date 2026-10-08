import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import catalog from '@/lib/data/mattress-catalog.json';
import type { MattressEntry } from '@/lib/types';
import { buildSearchIndex } from '@/lib/searchIndex';
import { ProductCard } from '@/components/ui/ProductCard';
import { SponsoredTag } from './SponsoredTag';

const entries = (Array.isArray(catalog) ? catalog : (catalog as { entries: unknown[] }).entries) as MattressEntry[];
const base = entries[0] as MattressEntry;
// A test-only copy with the flag flipped; the real catalog is never modified.
const sponsoredCopy: MattressEntry = { ...base, sponsored: true };

describe('Sponsored label', () => {
  it('renders only for a sponsored entry', () => {
    expect(renderToStaticMarkup(<SponsoredTag sponsored />)).toContain('Sponsored');
    expect(renderToStaticMarkup(<SponsoredTag sponsored={false} />)).toBe('');
    expect(renderToStaticMarkup(<SponsoredTag sponsored={undefined} />)).toBe('');
  });

  it('is shown on the shared product card (brand lineups, guide rankings, related mattresses)', () => {
    expect(renderToStaticMarkup(<ProductCard entry={sponsoredCopy} compare={false} />)).toContain('>Sponsored<');
    expect(renderToStaticMarkup(<ProductCard entry={{ ...base, sponsored: false }} compare={false} />)).not.toContain('Sponsored');
  });

  it('is part of the search result text for a sponsored mattress', () => {
    const index = buildSearchIndex([sponsoredCopy, ...entries.slice(1)]);
    const item = index.mattresses.find((m) => m.id === base.id);
    expect(item?.meta.startsWith('Sponsored · ')).toBe(true);
    const plain = buildSearchIndex(entries).mattresses.find((m) => m.id === base.id);
    expect(plain?.meta).not.toContain('Sponsored');
  });
});
