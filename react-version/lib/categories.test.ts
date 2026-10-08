import { describe, it, expect } from 'vitest';
import catalogJson from '@/lib/data/mattress-catalog.json';
import type { MattressEntry } from '@/lib/types';
import { CATEGORY_SLUGS, CATEGORY_EDITORIAL, MIN_CATEGORY_ENTRIES, CATEGORIES } from '@/lib/categories';
import { getGuide } from '@/lib/content/guides';
import { buildCategoryView } from '@/components/catalog/buildCategory';
import type { CategoryView } from '@/components/catalog/buildCategory';
import { MIN_MEASURED } from '@/components/catalog/referenceRankings';

// JSON imports are typed structurally from the file; lib/types MattressEntry is the audited shape of the same records.
const catalog = catalogJson as unknown as MattressEntry[];

const views: Record<string, CategoryView> = {};
async function view(slug: string): Promise<CategoryView> {
  const cached = views[slug];
  if (cached) return cached;
  const built = await buildCategoryView(slug, catalog);
  if (!built) throw new Error(`No category view for ${slug}`);
  views[slug] = built;
  return built;
}

describe('category editorial registry', () => {
  it('keeps the scoring-dimension exports', () => {
    expect(CATEGORIES.map((c) => c.key)).toEqual(['pressureRelief', 'support', 'heat', 'motion', 'edge', 'durability']);
  });

  it('every registry category has editorial copy, and nothing else does', () => {
    expect(Object.keys(CATEGORY_EDITORIAL).sort()).toEqual([...CATEGORY_SLUGS].sort());
  });

  it('related guides and categories all exist', () => {
    for (const [slug, ed] of Object.entries(CATEGORY_EDITORIAL)) {
      for (const g of ed.guides) expect(getGuide(g), `${slug} -> guide ${g}`).toBeTruthy();
      for (const r of ed.related) expect(CATEGORY_SLUGS, `${slug} -> ${r}`).toContain(r);
    }
  });
});

describe('category pages (built from the engine)', () => {
  it.each(CATEGORY_SLUGS)('%s never ships thin', async (slug: string) => {
    const v = await view(slug);
    expect(v).toBeTruthy();
    expect(v.shown).toBeGreaterThanOrEqual(MIN_CATEGORY_ENTRIES);
    expect(v.podium.length).toBe(3);
    expect(v.editorial.intro).not.toMatch(/\{\w+\}/);
  });

  it.each(CATEGORY_SLUGS)('%s ranks only entries with enough independent data, unranked alphabetically', async (slug: string) => {
    const v = await view(slug);
    for (const list of v.lists) {
      if (v.method !== 'rating') for (const r of list.ranked) expect(r.measured).toBeGreaterThanOrEqual(MIN_MEASURED);
      const values = list.ranked.map((r) => r.metric.value);
      expect(values).toEqual([...values].sort((a, b) => b - a));
      const titles = list.unranked.map((r) => r.title);
      expect(titles).toEqual([...titles].sort((a, b) => a.localeCompare(b)));
    }
  });

  it('matches the audited engine rankings', async () => {
    const top = async (slug: string, n = 3) => (await view(slug)).lists[0]?.ranked.slice(0, n).map((r) => r.id);
    expect(await top('side-sleepers')).toEqual(['purple-restore', 'casper-snow', 'avocado-green-mattress']);
    expect((await top('back-sleepers', 1))?.[0]).toBe('helix-plus');
    expect(await top('stomach-sleepers', 2)).toEqual(['helix-plus', 'big-fig-classic']);
    expect(await top('couples', 2)).toEqual(['helix-plus', 'casper-snow']);
    expect(await top('heavier-sleepers', 2)).toEqual(['big-fig-classic', 'helix-plus']);
    expect((await view('soft')).lists[0]?.ranked[0]?.metric.value).toBeLessThan(80);
  });

  it('cooling ranks by the third-party rating, never by a claim', async () => {
    const v = await view('cooling');
    for (const r of v.lists[0]?.ranked ?? []) expect(r.metric.value).toBe(r.entry.coolingRatingOutOf10);
    expect(v.secondary?.kind).toBe('profile');
    expect((v.excluded?.unrated ?? NaN) + (v.excluded?.ratedBelow ?? NaN) + v.eligibleCount).toBe(catalog.length);
  });

  it('latex is split into all-latex and latex hybrids; budget shows the next price step', async () => {
    const latex = await view('latex');
    expect(latex.lists.map((l) => l.id)).toEqual(['all-latex', 'latex-hybrid']);
    const allLatex = latex.lists[0];
    expect(allLatex && [...allLatex.ranked, ...allLatex.unranked].every((r) => r.entry.type === 'latex')).toBe(true);
    const budget = await view('under-1000');
    const [under, next] = budget.lists;
    for (const r of [...(under?.ranked ?? []), ...(under?.unranked ?? [])]) expect(r.entry.priceUsd).toBeLessThan(1000);
    for (const r of [...(next?.ranked ?? []), ...(next?.unranked ?? [])]) {
      expect(r.entry.priceUsd).toBeGreaterThanOrEqual(1000);
      expect(r.entry.priceUsd).toBeLessThan(1500);
    }
  });

  it('firm and soft pages flag multi-firmness models', async () => {
    const firm = await view('firm');
    const first = firm.lists[0];
    const flagged = [...(first?.ranked ?? []), ...(first?.unranked ?? [])].filter((r) => r.flag);
    expect(flagged.length).toBeGreaterThan(0);
    for (const r of flagged) {
      const range = r.entry.firmnessRange;
      expect(range ? range.max - range.min : 0).toBeGreaterThanOrEqual(2);
    }
  });
});

describe('category membership and rank consistency', () => {
  it('marks only lists that meet the category definition as in-category (budget "next step up" is not)', async () => {
    const v = await view('under-1000');
    const own = v.lists.filter((l) => l.inCategory);
    expect(own.map((l) => l.id)).toEqual(['under-1000']);
    for (const l of own) for (const r of [...l.ranked, ...l.unranked]) expect(r.entry.priceUsd).toBeLessThan(1000);
    expect(v.lists.find((l) => l.id === 'under-1500')?.inCategory).toBe(false);
  });

  it('product-page ranks match the position category rankings, and sparse entries are unranked', async () => {
    const { getReferenceScores } = await import('@/components/product/referenceScores');
    const ref = await getReferenceScores(['side', 'back', 'stomach']);
    for (const position of ['side', 'back', 'stomach'] as const) {
      const v = await view(`${position}-sleepers`);
      const byId = ref.byPosition[position] ?? {};
      const ranked = v.lists.flatMap((l) => l.ranked);
      for (const r of ranked) {
        expect(byId[r.id]?.rank).toBe(r.rank);
        expect(byId[r.id]?.total).toBe(v.rankedCount);
      }
      for (const r of v.lists.flatMap((l) => l.unranked)) {
        expect(byId[r.id]?.rank).toBeNull();
        expect(r.measured).toBeLessThan(MIN_MEASURED);
      }
    }
  });
});

describe('cooling page states its cutoff', () => {
  it('interpolates COOLING_MIN_RATING into the visible intro and rule', async () => {
    const { COOLING_MIN_RATING } = await import('@/lib/categories');
    const ed = CATEGORY_EDITORIAL.cooling;
    expect(ed?.intro).toContain(`${COOLING_MIN_RATING}/10 or higher`);
    expect(ed?.rule).toContain(`${COOLING_MIN_RATING}/10 or higher`);
    const v = await view('cooling');
    const listed = v.lists[0]?.ranked ?? [];
    for (const r of listed) expect(r.entry.coolingRatingOutOf10 ?? 0).toBeGreaterThanOrEqual(COOLING_MIN_RATING);
  });
});

describe('under-1000 unpriced accounting', () => {
  it('separates entries with no Queen price from prices that are on file but not comparable', async () => {
    const none = catalog.filter((e) => typeof e.priceUsd !== 'number').length;
    const v = await view('under-1000');
    expect(v.editorial.intro).toContain(`${none} have no published Queen price`);
    expect(v.editorial.intro).toMatch(/\d+ have a price we can’t compare yet \(due a re-check, or currency not confirmed\)/);
    expect(v.editorial.intro).not.toMatch(/\{\w+\}/);
  });
});
