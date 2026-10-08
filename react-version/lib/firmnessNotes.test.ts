import { describe, expect, it } from 'vitest';
import catalog from '@/lib/data/mattress-catalog.json';
import type { MattressEntry } from '@/lib/types';
import { adaptCatalogEntryForScoring, adaptCatalogEntryForScoringV2 } from '@/lib/matchLogic';

/**
 * The engine always scores the midpoint of firmnessRange (lib/matchLogic.ts).
 * Catalog text that tells shoppers which firmness the score uses must say
 * exactly that, never a "representative" option the engine does not score.
 */
const entries = catalog as MattressEntry[];

function midpoint(e: MattressEntry): number | null {
  const r = e.firmnessRange;
  return r && typeof r.min === 'number' && typeof r.max === 'number' ? (r.min + r.max) / 2 : null;
}

describe('firmness notes describe what the engine actually scores', () => {
  it('the engine scores the midpoint of firmnessRange (v0.1 and v0.2)', () => {
    for (const e of entries) {
      const mid = midpoint(e);
      expect(adaptCatalogEntryForScoringV2(e).firmnessRating, e.id).toBe(mid);
      if (mid !== null) expect(adaptCatalogEntryForScoring(e).scoringInput.firmnessRating, e.id).toBe(mid);
    }
  });

  it('no note claims the score reflects one option or a representative value', () => {
    for (const e of entries) {
      const text = `${e.firmnessDescription ?? ''} ${e.firmnessNote ?? ''}`;
      expect(text, e.id).not.toMatch(/score below reflects (?!the overall range midpoint)/i);
      expect(text, e.id).not.toMatch(/used as the representative value/i);
    }
  });

  it('every stated scoring midpoint matches the engine midpoint', () => {
    let checked = 0;
    for (const e of entries) {
      const mid = midpoint(e);
      for (const text of [e.firmnessDescription, e.firmnessNote]) {
        if (!text) continue;
        for (const m of text.matchAll(/midpoint of (?:the )?(?:listed|full|converted) range[^()]*\((?:[\d.]+-[\d.]+\/10 = )?([\d.]+)\/10\)/gi)) {
          checked++;
          expect(Number(m[1]), e.id).toBe(mid);
        }
      }
    }
    expect(checked).toBeGreaterThanOrEqual(8);
  });
});
