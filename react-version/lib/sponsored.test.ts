import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { matchProfile } from './matchLogic';
import { commerceFor } from './commerce';

// Brief v2 §31: a sponsored listing is labelled, but it must never move a
// Match Score or a ranking. These tests run the real engine over the real
// catalog twice - once as stored, once with every entry flagged sponsored
// (and once with only the lowest-ranked entries flagged) - and require the
// scores and the order to be identical.
vi.mock('@/lib/db/mattressRepo', () => ({ getCatalog: vi.fn() }));
import { getCatalog } from '@/lib/db/mattressRepo';
import type { MatchProfileInput } from '@/lib/matchLogic';
import type { MatchResponse, MattressEntry } from '@/lib/types';

const mockedGetCatalog = vi.mocked(getCatalog);

const CATALOG: MattressEntry[] = JSON.parse(readFileSync(join(import.meta.dirname, 'data', 'mattress-catalog.json'), 'utf8'));

const PROFILES: MatchProfileInput[] = [
  { sleepPosition: 'side', weightLb: 160, preferredFirmnessLabel: 'medium-soft', sleepTemperature: 'hot', motionSensitivity: 'couple-high' },
  { sleepPosition: 'back', weightLb: 240, preferredFirmnessLabel: 'firm', sleepTemperature: 'neutral', edgeImportance: 'high' },
  { sleepPosition: 'stomach', weightLb: 120, preferredFirmnessLabel: 'medium-firm', sleepTemperature: 'cold' },
];

function ranking(output: MatchResponse) {
  return output.results.map((r) => [r.entry.id, r.result.overallScore, JSON.stringify(r.result.subScores)]);
}

async function run(profile: MatchProfileInput, catalog: MattressEntry[], scoreVersion: string) {
  mockedGetCatalog.mockResolvedValue({ entries: catalog, source: 'json_fallback', error: null });
  return matchProfile(profile, { scoreVersion });
}

describe('sponsored flag never affects scoring or ranking', () => {
  beforeEach(() => mockedGetCatalog.mockReset());

  for (const scoreVersion of ['0.2', '0.1']) {
    for (const profile of PROFILES) {
      it(`v${scoreVersion} ${profile.sleepPosition} sleeper: all-sponsored catalog ranks identically`, async () => {
        const baseline = await run(profile, CATALOG.map((e) => ({ ...e, sponsored: false })), scoreVersion);
        const allSponsored = await run(profile, CATALOG.map((e) => ({ ...e, sponsored: true, placementSlot: 'sponsored' })), scoreVersion);
        expect(ranking(allSponsored)).toEqual(ranking(baseline));
      });

      it(`v${scoreVersion} ${profile.sleepPosition} sleeper: sponsoring the bottom entries does not lift them`, async () => {
        const baseline = await run(profile, CATALOG, scoreVersion);
        const bottomIds = new Set(baseline.results.slice(-5).map((r) => r.entry.id));
        const partly = await run(profile, CATALOG.map((e) => (bottomIds.has(e.id) ? { ...e, sponsored: true } : e)), scoreVersion);
        expect(ranking(partly)).toEqual(ranking(baseline));
        // ...and they are still disclosed as sponsored rather than as a pick.
        for (const r of partly.results) {
          if (bottomIds.has(r.entry.id)) expect(r.badge.label).toMatch(/sponsored/i);
        }
      });
    }
  }

  it('the catalog itself currently has no sponsored entries', () => {
    expect(CATALOG.filter((e) => commerceFor(e).sponsored)).toEqual([]);
  });
});
