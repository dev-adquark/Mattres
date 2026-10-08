import { describe, expect, it } from 'vitest';
import catalog from '@/lib/data/mattress-catalog.json';
import type { MattressEntry } from '@/lib/types';

const entries = catalog as unknown as MattressEntry[];

describe('committed catalog: wording and attribution rules the pages depend on', () => {
  it('review highlights are paraphrases: no quotation marks (pages say "our paraphrase, not quotes")', () => {
    for (const e of entries) {
      for (const h of e.reviewHighlights ?? []) {
        expect(h.snippet, `${e.id}: "${h.snippet}"`).not.toMatch(/["“”]/);
      }
    }
  });

  it('every entry with review highlights also names at least one review source', () => {
    for (const e of entries) {
      if ((e.reviewHighlights ?? []).length > 0) {
        expect((e.reviewSources ?? []).length, e.id).toBeGreaterThan(0);
      }
    }
  });

  it('every review source link is https', () => {
    for (const e of entries) {
      for (const s of e.reviewSources ?? []) {
        expect(s.sourceUrl, `${e.id}: ${s.sourceName}`).toMatch(/^https:\/\//);
      }
    }
  });
});
