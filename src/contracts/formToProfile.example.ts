/**
 * formToProfile.example.ts
 * ------------------------
 * Demonstrates both form shapes normalizing into one SleepProfile, and
 * exercises every SleepProfile field so mattress-match.ts has no unused
 * fields. This is the shape an API handler (e.g. POST /api/profile) would
 * implement; it's written here as a plain function so it type-checks
 * without any framework.
 */

import {
  QuickMatchFormInput,
  SleepProfileFormInput,
  SleepProfile,
} from './mattress-match';

/** Minimal RNG-free id generator so this stays deterministic in tests/examples. */
function generateProfileId(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return `profile_${hash.toString(16)}`;
}

/** Quick Match -> SleepProfile. Fields the quick form doesn't collect get safe, explicit defaults. */
export function fromQuickMatch(input: QuickMatchFormInput, createdAt: string): SleepProfile {
  return {
    profileId: generateProfileId(`${createdAt}:${JSON.stringify(input)}`),
    sleepPosition: input.sleepPosition,
    weightLb: input.weightLb,
    preferredFirmnessLabel: input.firmnessPreference,
    sleepTemperature: input.sleepTemperature,
    motionSensitivity: 'single', // Quick Match doesn't ask; "single" is the least assumption-laden default.
    painFocus: [],
    source: 'quick',
    createdAt,
  };
}

/** Full form -> SleepProfile. A straight field-for-field mapping; nothing to default. */
export function fromFullForm(input: SleepProfileFormInput, createdAt: string): SleepProfile {
  return {
    profileId: generateProfileId(`${createdAt}:${JSON.stringify(input)}`),
    sleepPosition: input.sleepPosition,
    weightLb: input.weightLb,
    preferredFirmnessLabel: input.firmnessPreference,
    sleepTemperature: input.sleepTemperature,
    motionSensitivity: input.motionSensitivity,
    painFocus: input.painFocus,
    heightIn: input.heightIn,
    mattressTypePreference: input.mattressTypePreference,
    budgetUsd: input.budgetUsd,
    source: 'full',
    createdAt,
  };
}

/**
 * Builds the human-readable "priority chips" the results page header shows
 * (e.g. the compare mockup's "Side sleeper · 130-180 lb · Medium-firm ·
 * Sleeps warm" row) — this is what actually reads painFocus/heightIn/
 * mattressTypePreference/budgetUsd off the profile, proving they're not
 * dead fields.
 */
export function buildProfileSummaryChips(profile: SleepProfile): string[] {
  const chips: string[] = [
    `${profile.sleepPosition[0].toUpperCase()}${profile.sleepPosition.slice(1)} sleeper`,
    `${profile.weightLb} lb`,
    profile.preferredFirmnessLabel,
    profile.sleepTemperature === 'hot' ? 'Sleeps warm' : profile.sleepTemperature === 'cold' ? 'Sleeps cold' : 'Neutral sleeper',
  ];

  if (profile.heightIn) {
    chips.push(`${profile.heightIn}" tall`);
  }
  if (profile.painFocus.length > 0) {
    chips.push(`${profile.painFocus.join('/')} relief priority`);
  }
  if (profile.mattressTypePreference && profile.mattressTypePreference.length > 0) {
    chips.push(`Prefers ${profile.mattressTypePreference.join(' or ')}`);
  }
  if (profile.budgetUsd) {
    chips.push(`$${profile.budgetUsd.min}-$${profile.budgetUsd.max}`);
  }
  if (profile.motionSensitivity === 'couple-high') {
    chips.push('Light sleeper / shares the bed');
  }

  return chips;
}
