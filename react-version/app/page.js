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

export default async function HomePage() {
  const { entries: catalog } = await getCatalog();
  const { results: exampleResults } = await matchProfile(HERO_EXAMPLE_PROFILE);
  // Top 4 real results under the same disclosed demo profile - real
  // catalog entries, real computed scores, never invented mattresses.
  const heroExamples = exampleResults.slice(0, 4);
  return <HomeClient catalog={catalog} heroExamples={heroExamples} />;
}
