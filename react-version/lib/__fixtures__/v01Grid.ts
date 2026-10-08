// Shared grid for the v0.1 byte-identical regression test
// (lib/scoreEngine.regression.test.ts). The snapshot in
// scoreEngine-v0.1-snapshot.json was generated from this exact grid with
// the v0.1 engine and v0.1 adapter BEFORE the v0.2 work began, so any
// accidental change to v0.1 behavior fails that test.

import type { ScoringInputV01, EngineProfile } from '@/lib/scoreEngine';
import type { MattressEntry } from '@/lib/types';

export const SYNTHETIC_V01_INPUTS: ScoringInputV01[] = [
  // The real catalog has no topFoamDensityLbFt3 values, so these cover the
  // durability branches and the non-catalog types explicitly.
  { id: 'syn-foam-lowdensity', type: 'foam', firmnessRating: 3, hasCoolingCover: false, edgeSupportReinforced: false, topFoamDensityLbFt3: 1.5 },
  { id: 'syn-foam-highdensity', type: 'foam', firmnessRating: 7.5, hasCoolingCover: true, edgeSupportReinforced: false, topFoamDensityLbFt3: 2.5 },
  { id: 'syn-hybrid-middensity', type: 'hybrid', firmnessRating: 9, hasCoolingCover: false, edgeSupportReinforced: true, topFoamDensityLbFt3: 2.0 },
  { id: 'syn-innerspring', type: 'innerspring', firmnessRating: 6, hasCoolingCover: false, edgeSupportReinforced: true, topFoamDensityLbFt3: null },
  { id: 'syn-latex', type: 'latex', firmnessRating: 5, hasCoolingCover: true, edgeSupportReinforced: false, topFoamDensityLbFt3: 1.8 },
  { id: 'syn-unknown-type', type: 'airbed', firmnessRating: 1, hasCoolingCover: false, edgeSupportReinforced: false, topFoamDensityLbFt3: null },
  { type: 'foam', firmnessRating: 10, hasCoolingCover: true, edgeSupportReinforced: true, topFoamDensityLbFt3: 1.79 },
];

export function buildV01Inputs(
  catalog: readonly MattressEntry[],
  adapt: (entry: MattressEntry) => { scoringInput: ScoringInputV01 }
): ScoringInputV01[] {
  return [...catalog.map((e) => adapt(e).scoringInput), ...SYNTHETIC_V01_INPUTS];
}

export function buildV01Profiles(): EngineProfile[] {
  const out: EngineProfile[] = [];
  for (const sleepPosition of ['side', 'back', 'stomach', 'combination']) {
    for (const weightLb of [100, 129.9, 130, 179, 180, 200, 229, 230, 320]) {
      for (const preferredFirmnessLabel of ['soft', 'medium-soft', 'medium', 'medium-firm', 'firm', 'extra-firm', undefined]) {
        for (const sleepTemperature of ['cold', 'neutral', 'hot']) {
          for (const motionSensitivity of ['single', 'couple-low', 'couple-high']) {
            const p: EngineProfile = { sleepPosition, weightLb, sleepTemperature, motionSensitivity };
            if (preferredFirmnessLabel) p.preferredFirmnessLabel = preferredFirmnessLabel;
            out.push(p);
          }
        }
      }
    }
  }
  // A couple of odd shapes: numeric preference, unknown position.
  out.push({ sleepPosition: 'side', weightLb: 160, preferredFirmness: 3, sleepTemperature: 'hot', motionSensitivity: 'couple-high' });
  out.push({ sleepPosition: 'hammock', weightLb: 160, preferredFirmnessLabel: 'medium', sleepTemperature: 'neutral' });
  return out;
}
