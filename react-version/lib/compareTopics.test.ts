import { describe, expect, it } from 'vitest';
import { matchProfile } from '@/lib/matchLogic';
import { validateProfile } from '@/lib/profileValidation';
import { compareTopics, MIN_TOPIC_CANDIDATES, profileChips, profileFilters } from '@/lib/compareTopics';
import { getGuide } from '@/lib/content/guides';
import { annotateRow, buildRowGroups, compareVerdict, parseIdsParam, slimItem } from '@/components/compare-page/compareModel';
import type { CompareColumn, CompareCell } from '@/components/compare-page/types';
import type { MattressEntry } from '@/lib/types';

describe('compare topics', () => {
  for (const [slug, topic] of Object.entries(compareTopics)) {
    it(`${slug}: valid demo profile with at least ${MIN_TOPIC_CANDIDATES} real candidates`, async () => {
      expect(validateProfile(topic.profile)).toBeNull();
      const { results } = await matchProfile(topic.profile);
      expect(results.length).toBeGreaterThanOrEqual(MIN_TOPIC_CANDIDATES);
      for (const g of topic.guides) expect(getGuide(g), `guide ${g}`).toBeTruthy();
    });
  }

  it('the budget topic title matches its real budget, and every candidate fits it', async () => {
    const topic = compareTopics['side-sleepers-under-1000'];
    expect(topic.profile.budgetUsd?.max).toBe(1000);
    expect(topic.title).toContain('$1,000');
    expect(topic.h1).toContain('$1,000');
    expect(topic.chips).toContain('Queen up to $1,000');
    const { results } = await matchProfile(topic.profile);
    for (const r of results) expect(r.entry.priceUsd).toBeLessThanOrEqual(1000);
  });

  it('chips and filters are derived from the profile', () => {
    expect(profileChips({ sleepPosition: 'back', weightLb: 240, preferredFirmnessLabel: 'firm', sleepTemperature: 'neutral', painFocus: 'lower-back' })).toEqual([
      'Back sleeper',
      '240 lb',
      'Prefers firm',
      'Neutral temperature',
      'Focus: lower back',
    ]);
    expect(profileFilters({ mattressTypePreference: ['hybrid'] })[0]?.chip).toBe('Hybrid only');
    // A min-only budget (as the quiz sends) is not a real filter.
    expect(profileFilters({ budgetUsd: { min: 0 } as { min: number; max: number } })).toEqual([]);
  });
});

describe('compare model', () => {
  it('parses ids defensively', () => {
    expect(parseIdsParam('a-1, b-2,a-1,,C-3,d-4')).toEqual(['a-1', 'b-2', 'c-3']);
    expect(parseIdsParam(['x', 'y'])).toEqual(['x', 'y']);
    expect(parseIdsParam('<script>,ok')).toEqual(['ok']);
    expect(parseIdsParam(undefined)).toEqual([]);
  });

  it('marks leaders only among known values and never on ties of all', () => {
    const row = annotateRow({ better: 'lower', cells: [{ value: 999, key: 1 }, { value: null, key: 'x' }, { value: 899, key: 2 }] });
    expect(row.leaders).toEqual([2]);
    const same = annotateRow({ better: 'higher', cells: [{ value: 5, key: 5 }, { value: 5, key: 5 }] });
    expect(same.leaders).toEqual([]);
    expect(same.same).toBe(true);
    const tied = annotateRow({ better: 'higher', cells: [{ value: 8, key: 8 }, { value: 8, key: 8 }, { value: 6, key: 6 }] });
    expect(tied.leaders).toEqual([0, 1]);
    expect(tied.tied).toBe(true);
    const lonely = annotateRow({ better: 'higher', cells: [{ value: 8, key: 8 }, { value: null, key: 'm' }] });
    expect(lonely.leaders).toEqual([]);
  });

  it('builds a verdict from engine scores: winner, tie, or no profile', async () => {
    const { results } = await matchProfile(compareTopics['motion-isolation-for-couples'].profile);
    const cols: (CompareColumn & { item: NonNullable<CompareColumn['item']> })[] = results.slice(0, 3).map((r) => ({ id: r.entry.id, entry: r.entry, item: slimItem(r) }));
    const v = compareVerdict(cols);
    const top = Math.max(...cols.map((c) => c.item.result.overallScore));
    if (cols.filter((c) => c.item.result.overallScore === top).length > 1) expect(v.kind).toBe('tie');
    else {
      expect(v.kind).toBe('winner');
      expect(v.kind === 'winner' && v.score).toBe(top);
      expect(v.kind === 'winner' ? v.margin : 0).toBeGreaterThan(0);
    }

    const [first, second] = cols as [typeof cols[number], typeof cols[number]];
    const tieCols = [first, { ...second, item: { ...second.item, result: { ...second.item.result, overallScore: first.item.result.overallScore } } }];
    expect(compareVerdict(tieCols).kind).toBe('tie');

    const unscored: CompareColumn[] = cols.map((c) => ({ ...c, item: null }));
    expect(compareVerdict(unscored).kind).toBe('no-profile');
    const groups = buildRowGroups(unscored);
    expect(groups.map((g) => g.id)).toEqual(['ratings', 'build', 'buying']);
    expect(buildRowGroups(cols).map((g) => g.id)).toEqual(['match', 'dimensions', 'build', 'buying']);
  });

  it('never fabricates a price: unpriced mattresses render as missing', () => {
    // Fixture: only the fields the price row reads.
    const entry = { id: 'x', brand: 'B', model: 'M', type: 'foam', priceUsd: null } as unknown as MattressEntry;
    const groups = buildRowGroups([{ id: 'x', entry, item: null }, { id: 'y', entry: { ...entry, id: 'y', priceUsd: 900 }, item: null }]);
    const price = groups.find((g) => g.id === 'buying')?.rows.find((r) => r.id === 'price');
    const cell = price?.cells[0] as (CompareCell & { missing?: string; missingText?: string }) | undefined;
    expect(cell?.missing).toBe('unverified');
    expect(cell?.missingText).toBeUndefined();
    expect(price?.leaders).toEqual([]);
  });
});
