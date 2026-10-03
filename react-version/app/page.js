import HomeClient from '@/components/HomeClient';
import { getCatalog } from '@/lib/db/mattressRepo';
import { matchProfile } from '@/lib/matchLogic';

// Without this, Next statically prerenders this page once at build time
// (getCatalog() itself doesn't use any dynamic API, so nothing here
// signals otherwise) - meaning a catalog change made only in the
// database (e.g. the weekly RTINGS sync auto-applying new evidence)
// wouldn't show up here until the next full redeploy. Revalidating
// hourly means it shows up on its own well within that cadence, without
// needing every DB write to also trigger a redeploy.
export const revalidate = 3600;

// Same fixed, disclosed demo profile app/compare/page.js uses - reused
// (not duplicated with different values) so the hero's illustrative
// "example match" card and the /compare demo page always agree with each
// other, and so this is a real scoreEngine output for a real catalog
// entry under a stated profile, never an invented score.
const HERO_EXAMPLE_PROFILE = {
  sleepPosition: 'side',
  weightLb: 155,
  preferredFirmnessLabel: 'medium-firm',
  sleepTemperature: 'hot',
  motionSensitivity: 'single',
  painFocus: [],
  mattressTypePreference: [],
  budgetUsd: { min: 0, max: 2000 },
};

// A few more disclosed demo profiles for the homepage's "Interactive
// result preview" - each is a real, stated sleep profile scored live by
// the real scoreEngine, never an invented result. Kept small (3) since
// this is a taste of the real quiz, not a replacement for it.
const PREVIEW_PROFILES = [
  { key: 'side', label: 'Side sleeper', profile: HERO_EXAMPLE_PROFILE },
  {
    key: 'back',
    label: 'Back sleeper',
    profile: {
      sleepPosition: 'back',
      weightLb: 180,
      preferredFirmnessLabel: 'medium-firm',
      sleepTemperature: 'neutral',
      motionSensitivity: 'single',
      painFocus: [],
      mattressTypePreference: [],
      budgetUsd: { min: 0, max: 2000 },
    },
  },
  {
    key: 'couple',
    label: 'Couple, motion-sensitive',
    profile: {
      sleepPosition: 'side',
      weightLb: 155,
      preferredFirmnessLabel: 'medium',
      sleepTemperature: 'neutral',
      motionSensitivity: 'couple-high',
      painFocus: [],
      mattressTypePreference: [],
      budgetUsd: { min: 0, max: 2000 },
    },
  },
];

export default async function HomePage() {
  const { entries: catalog } = await getCatalog();
  const { results: exampleResults } = await matchProfile(HERO_EXAMPLE_PROFILE);
  const heroExample = exampleResults[0] ?? null;

  const previewExamples = await Promise.all(
    PREVIEW_PROFILES.map(async ({ key, label, profile }) => {
      const { results } = await matchProfile(profile);
      return { key, label, example: results[0] ?? null };
    })
  );

  return <HomeClient catalog={catalog} heroExample={heroExample} previewExamples={previewExamples} />;
}
