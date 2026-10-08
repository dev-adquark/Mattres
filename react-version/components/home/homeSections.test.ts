import { describe, it, expect } from 'vitest';
import catalogJson from '@/lib/data/mattress-catalog.json';
import type { MattressEntry } from '@/lib/types';
import { getCategoryEditorial, getCategoryPage, entriesForCategory } from '@/lib/categories';
import { matchProfile } from '@/lib/matchLogic';
import { buildCategoryView } from '@/components/catalog/buildCategory';
import { REFERENCE_PROFILES, eligibleRanks } from '@/components/catalog/referenceRankings';
import { SLEEP_CATEGORY_SLUGS } from './homeConfig';
import { buildSleepCategory } from './homeSections';

const catalog = catalogJson as unknown as MattressEntry[];

describe('home "Discover by how you sleep" cards', () => {
  it.each(SLEEP_CATEGORY_SLUGS)('%s card shows the category page rank 1, score and ranked count', async (slug) => {
    const card = await buildSleepCategory(slug, catalog);
    const view = await buildCategoryView(slug, catalog);
    expect(card).not.toBeNull();
    expect(view).not.toBeNull();
    if (!card || !view) return;
    const rank1 = view.podium[0];
    expect(card.top?.id).toBe(rank1?.id);
    expect(card.top?.display).toBe(rank1?.metric.display);
    expect(card.ranked).toBe(view.rankedCount);
    expect(card.shown).toBe(view.shown);
    expect(card.profileText).toBe(view.profileText);
    expect(card.href).toBe(view.href);
  });

  // Independent of buildCategoryView: re-derive rank 1 from the reference
  // profile + integrity rule, so a drift in either builder is caught.
  it.each(SLEEP_CATEGORY_SLUGS.filter((s) => getCategoryEditorial(s)?.ranking.method === 'profile'))(
    '%s card top pick equals the integrity-rule rank 1 for its reference sleeper',
    async (slug) => {
      const ranking = getCategoryEditorial(slug)?.ranking;
      const cat = getCategoryPage(slug);
      if (!cat || ranking?.method !== 'profile') throw new Error(`${slug} is not profile-ranked`);
      const members = new Set(entriesForCategory(cat, catalog).map((e) => e.id));
      const run = await matchProfile({ ...REFERENCE_PROFILES[ranking.profile].profile });
      const inCategory = run.results.filter((r) => members.has(r.entry.id));
      const { rankOf, total } = eligibleRanks(inCategory);
      const first = inCategory.find((r) => rankOf.get(r.entry.id) === 1);
      const card = await buildSleepCategory(slug, catalog);
      expect(card?.top?.id).toBe(first?.entry.id);
      expect(card?.top?.display).toBe(String(first?.result.overallScore));
      expect(card?.ranked).toBe(total);
      expect(card?.profileLabel).toBe(REFERENCE_PROFILES[ranking.profile].label);
    }
  );
});
