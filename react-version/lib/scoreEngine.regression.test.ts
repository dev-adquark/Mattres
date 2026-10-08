import { describe, it, expect } from 'vitest';
import crypto from 'crypto';
import { scoreEngine } from '@/lib/scoreEngine';
import snapshotJson from '@/lib/__fixtures__/scoreEngine-v0.1-snapshot.json';
import type { EngineProfile, ScoringInputV01 } from '@/lib/scoreEngine';
import { buildV01Profiles } from '@/lib/__fixtures__/v01Grid';

// Exhaustive grid x catalog sweeps: tens of thousands of engine runs. They
// finish in ~1-2 s on an idle machine but exceed vitest's 5 s default under
// load (parallel workers, other processes), so give them an explicit budget.
const EXHAUSTIVE_TIMEOUT_MS = 60_000;

// The snapshot was captured from the v0.1 engine BEFORE v0.2 was added
// (see the fixture's `note`). v0.1 must stay byte-identical: same JSON
// output, field order included, for every profile x input combination.
/** The captured fixture: the grid's profiles, the engine inputs, per-profile hashes and a few full outputs. */
const snapshot = snapshotJson as unknown as {
  profiles: EngineProfile[];
  inputs: ScoringInputV01[];
  hashes: string[];
  full: Record<string, string[]>;
};

describe('scoreEngine v0.1 regression (byte-identical to the pre-v0.2 engine)', () => {
  const profiles = buildV01Profiles();

  it('covers the same grid the snapshot was generated from', () => {
    expect(profiles.length).toBe(snapshot.hashes.length);
    expect(JSON.parse(JSON.stringify(profiles))).toEqual(snapshot.profiles);
    expect(snapshot.inputs.length).toBeGreaterThanOrEqual(44);
  });

  it('every profile x input output hashes identically', () => {
    const mismatches: number[] = [];
    profiles.forEach((profile, i) => {
      const outs = snapshot.inputs.map((m) => JSON.stringify(scoreEngine('0.1', profile, m)));
      const hash = crypto.createHash('sha256').update(outs.join('\n')).digest('hex').slice(0, 24);
      if (hash !== snapshot.hashes[i]) mismatches.push(i);
    });
    expect(mismatches).toEqual([]);
  }, EXHAUSTIVE_TIMEOUT_MS);

  it('full stored outputs match string-for-string', () => {
    for (const [index, outs] of Object.entries(snapshot.full)) {
      const profile = profiles[Number(index)] as EngineProfile;
      snapshot.inputs.forEach((m, j) => {
        expect(JSON.stringify(scoreEngine('0.1', profile, m))).toBe(outs[j]);
      });
    }
  }, EXHAUSTIVE_TIMEOUT_MS);
});
