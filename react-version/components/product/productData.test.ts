import { describe, expect, it } from 'vitest';
import catalog from '@/lib/data/mattress-catalog.json';
import { comparableQueenPriceUsd, priceAwaitingRecheck, queenPriceOf, queenPriceText } from '@/lib/commerce';
import { displayTitle, formatPrice } from '@/lib/format';
import { displayTitle as engineDisplayTitle } from '@/lib/matchLogic';
import { firmnessCardText, firmnessFor, MULTI_FIRMNESS_LABEL } from '@/lib/firmness';
import type { MattressEntry } from '@/lib/types';
import { hasQueenPrice, lineupFacts, positioningFor, slimEntry } from './productData';
import { publicNote } from './productDisplay';
import { contentsPhrase, describeMattress, independentEvidenceFor } from './productPageModel';

const ENTRIES = catalog as unknown as MattressEntry[];
const byId = (id: string): MattressEntry => {
  const e = ENTRIES.find((x) => x.id === id);
  if (!e) throw new Error(`missing ${id}`);
  return e;
};

describe('Queen price status (lib/commerce)', () => {
  it('only a confirmed-USD, unflagged price is comparable', () => {
    expect(queenPriceOf({ priceUsd: 899 })?.status).toBe('confirmed');
    expect(queenPriceOf({ priceUsd: 899, priceCurrency: 'USD' })?.status).toBe('confirmed');
    expect(queenPriceOf({ priceUsd: 658.75, priceCurrency: 'unconfirmed_likely_CAD' })?.status).toBe('currency-unconfirmed');
    // Flagged for a re-check: withheld entirely, displayed like a missing price.
    expect(queenPriceOf({ priceUsd: 3214, priceNeedsReverification: true })).toBeNull();
    expect(queenPriceText({ priceUsd: 3214, priceNeedsReverification: true })).toBeNull();
    expect(priceAwaitingRecheck({ priceUsd: 3214, priceNeedsReverification: true })).toBe(true);
    expect(priceAwaitingRecheck({ priceUsd: null, priceNeedsReverification: true })).toBe(false);
    expect(priceAwaitingRecheck({ priceUsd: 899 })).toBe(false);
    expect(queenPriceOf({ priceUsd: null })).toBeNull();
    expect(comparableQueenPriceUsd({ priceUsd: 3214, priceNeedsReverification: true })).toBeNull();
    expect(comparableQueenPriceUsd({ priceUsd: 658.75, priceCurrency: 'CAD' })).toBeNull();
  });

  it('real catalog: Silk & Snow is shown qualified, the flagged Saatva prices are withheld, and none is compared', () => {
    for (const id of ['silk-and-snow-mattress', 'saatva-rx', 'saatva-hd']) {
      const e = byId(id);
      expect(hasQueenPrice(e)).toBe(false);
      expect(hasQueenPrice(slimEntry(e))).toBe(false);
    }
    for (const id of ['saatva-rx', 'saatva-hd']) {
      expect(queenPriceText(byId(id))).toBeNull();
      expect(queenPriceText(slimEntry(byId(id)))).toBeNull();
      expect(formatPrice(slimEntry(byId(id)))).toBe('Price not yet verified');
    }
    expect(queenPriceText(byId('silk-and-snow-mattress'))).toBe('$658.75 (currency not confirmed)');
    expect(lineupFacts(ENTRIES.filter((e) => e.brand === 'Saatva')).priceMax).toBeLessThan(3214);
  });

  it('a lowest-size "from" price is never a Queen price', () => {
    for (const id of ['leesa-original', 'leesa-original-hybrid', 'leesa-sapira-chill-hybrid', 'bear-elite-hybrid']) {
      expect(queenPriceText(byId(id))).toBeNull();
      expect(describeMattress(byId(id))).not.toMatch(/\$/);
    }
  });

  it('meta copy never quotes a non-comparable price', () => {
    expect(describeMattress(byId('silk-and-snow-mattress'))).not.toMatch(/\$/);
    expect(describeMattress(byId('saatva-rx'))).not.toMatch(/\$/);
  });
});

describe('displayTitle', () => {
  it('does not prepend a brand the model already names', () => {
    for (const fn of [displayTitle, engineDisplayTitle]) {
      expect(fn({ brand: 'Purple', model: 'The Purple Mattress' })).toBe('The Purple Mattress');
      expect(fn({ brand: 'Purple', model: 'PurplePlus' })).toBe('PurplePlus');
      expect(fn({ brand: 'Purple', model: 'Restore Hybrid' })).toBe('Purple Restore Hybrid');
      expect(fn({ brand: 'Silk & Snow', model: 'Mattress' })).toBe('Silk & Snow Mattress');
      expect(fn({ brand: 'Tempur-Pedic', model: 'TEMPUR-Adapt' })).toBe('Tempur-Pedic TEMPUR-Adapt');
    }
  });
});

describe('firmness wording', () => {
  it('a label-mapped number is never called a rating', () => {
    const line = positioningFor(byId('novaform-comfortgrande-plus'));
    expect(line).not.toMatch(/\brated\b/);
    expect(line).toMatch(/converted from the brand's own firmness label/);
    expect(positioningFor(byId('casper-the-one'))).toMatch(/rated 6\/10/);
  });
});

describe('publicNote on return policies', () => {
  it('keeps the shopper facts and drops research wording', () => {
    for (const e of ENTRIES) {
      const text = publicNote(e.returnPolicy).text || '';
      expect(text).not.toMatch(/fetched|captured|excerpt|CONFLICT|recorded here/i);
    }
    expect(publicNote(byId('silk-and-snow-mattress').returnPolicy).text).toBe('Free shipping and easy returns.');
  });
});

describe('multi-option firmness is never shown as one midpoint word', () => {
  const MULTI = [
    'saatva-classic',
    'saatva-loom-and-leaf',
    'silk-and-snow-mattress',
    'avocado-green-mattress',
    'leesa-sapira-chill-hybrid',
    'bear-elite-hybrid',
    'brooklyn-bedding-signature-hybrid',
    'sleep-on-latex-hybrid',
    'plushbeds-botanical-bliss',
  ];
  const SINGLE = ['saatva-hd', 'saatva-rx', 'leesa-original-hybrid', 'casper-the-one', 'helix-plus'];

  it.each(MULTI)('%s reads as several options with its range', (id) => {
    const e = byId(id);
    const f = firmnessFor(e);
    expect(f?.multi).toBe(true);
    expect(f?.label).toBe(MULTI_FIRMNESS_LABEL);
    expect(firmnessCardText(e)?.replace(/[\u00a0\u2060]/g, (c) => (c === '\u00a0' ? ' ' : ''))).toMatch(/^Several options · \d+(\.\d+)?–\d+(\.\d+)?\/10$/);
    expect(positioningFor(e)).toContain('sold in firmness options spanning');
    expect(describeMattress(e)).toContain('sold in several firmness options');
  });

  it.each(SINGLE)('%s keeps its single firmness word', (id) => {
    const f = firmnessFor(byId(id));
    expect(f?.multi).toBe(false);
    expect(f?.label).toBe(f?.pointLabel);
    expect(positioningFor(byId(id))).not.toContain('options');
  });

  it('the engine-facing midpoint is unchanged', () => {
    const f = firmnessFor(byId('saatva-classic'));
    expect(f).toMatchObject({ id: 'medium', pointLabel: 'Medium', rating: 5.5 });
  });

  it('every catalog entry with a 3+ point range is flagged multi', () => {
    for (const e of ENTRIES) {
      const r = e.firmnessRange;
      if (r && r.max - r.min >= 3) expect(firmnessFor(e)?.multi, e.id).toBe(true);
    }
  });
});

describe('independent-ratings claim in meta/OG copy', () => {
  const RATED = ['coolingRatingOutOf10', 'motionIsolationRatingOutOf10', 'edgeSupportRatingOutOf10', 'durabilityRatingOutOf10'] as const;
  const hasRating = (e: MattressEntry) => RATED.some((f) => typeof e[f] === 'number');

  it('claims independent ratings only for entries with at least one rating on file', () => {
    for (const e of ENTRIES) {
      const text = describeMattress(e);
      if (hasRating(e)) expect(text, e.id).toContain('independent ratings');
      else expect(text, e.id).not.toMatch(/independent ratings/);
    }
  });

  it('unrated entries without RTINGS evidence say ratings are missing', () => {
    for (const id of ['saatva-classic', 'helix-midnight-luxe', 'purple-rejuvenate-plus']) {
      expect(independentEvidenceFor(byId(id)), id).toBe('none');
      expect(describeMattress(byId(id)), id).toContain('with missing ratings');
      expect(contentsPhrase(independentEvidenceFor(byId(id)), { short: true })).not.toMatch(/independent/);
    }
  });

  it('published RTINGS evidence with a metric counts as RTINGS evidence, an empty record does not', () => {
    const e = byId('casper-cooling-select');
    const base = { overallScore: null, metrics: [] } as unknown as Parameters<typeof independentEvidenceFor>[1];
    expect(independentEvidenceFor(e, base)).toBe('none');
    const withMetric = { overallScore: null, metrics: [{}] } as unknown as Parameters<typeof independentEvidenceFor>[1];
    expect(independentEvidenceFor(e, withMetric)).toBe('rtings');
    expect(describeMattress(e, 'rtings')).toContain('RTINGS review evidence');
    expect(describeMattress(e, 'rtings')).not.toMatch(/independent ratings/);
  });
});
