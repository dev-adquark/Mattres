/**
 * Pair definitions for the curated head-to-head pages, kept in a module with
 * no runtime imports and erasable TypeScript only, so next.config.mts can load
 * it too (permanent redirects from a reversed "b-vs-a" slug to the canonical
 * page). lib/comparePairs.ts is the public API; import from there everywhere else.
 */

import type { PairClaims, PairSpotlight } from './types';

export interface PairDef {
  a: string;
  b: string;
  title: string;
  short: string;
  angle: string;
  claims: PairClaims;
  spotlight: PairSpotlight | null;
  guides: string[];
}

export interface PairRedirect {
  source: string;
  destination: string;
  permanent: true;
}

/**
 * a/b: catalog ids (canonical order: the slug is `${a}-vs-${b}`).
 * title: display names, checked against the catalog by the test.
 * angle: the question the page answers. Facts in it are asserted by `claims`.
 * claims: machine-checked statements behind the angle (see the test).
 * spotlight: an extra, disclosed demo sleeper whose result is the point of the pair.
 * guides: related guide slugs (must exist).
 */
export const PAIR_DEFS: readonly PairDef[] = [
  {
    a: 'casper-dream',
    b: 'casper-snow',
    title: 'Casper Dream vs Casper Snow',
    short: 'Is the cooling upgrade worth it?',
    angle:
      'Two Casper hybrids at the same listed firmness. The Snow costs more and lists its cooling package as standard; on the Dream it is an optional upgrade. What does the extra money change in the scores?',
    claims: { sameBrand: true, sameType: 'hybrid', sameFirmness: true, bPricier: true },
    spotlight: { id: 'hot', label: 'Combination sleeper who sleeps hot', profile: { sleepPosition: 'combination', sleepTemperature: 'hot' } },
    guides: ['cooling-mattress-comparison', 'mattresses-for-hot-sleepers'],
  },
  {
    a: 'casper-the-one',
    b: 'casper-dream',
    title: 'Casper The One vs Casper Dream',
    short: 'All-foam or hybrid, same brand.',
    angle: 'The same brand, two constructions: The One is all-foam, the Dream adds pocketed coils. Which feel does the engine favor for each sleeping position?',
    claims: { sameBrand: true, types: ['foam', 'hybrid'], aCheaper: true },
    spotlight: null,
    guides: ['mattress-types-explained', 'how-to-choose-mattress-firmness'],
  },
  {
    a: 'purple-mattress',
    b: 'purple-plus',
    title: 'The Purple Mattress vs PurplePlus',
    short: 'Two all-foam grids, one thicker and softer.',
    angle: "Purple's two all-foam grid mattresses. The PurplePlus is taller and listed softer. That difference matters more for some positions than others.",
    claims: { sameBrand: true, sameType: 'foam', aFirmer: true, bTaller: true, aCheaper: true },
    spotlight: null,
    guides: ['how-to-choose-mattress-firmness', 'pressure-relief-for-side-sleepers'],
  },
  {
    a: 'purple-plus',
    b: 'purple-restore',
    title: 'PurplePlus vs Purple Restore Hybrid',
    short: 'The same grid over foam, or over coils.',
    angle: 'Both start with the same GelFlex Grid on top. Underneath, the PurplePlus is all foam and the Purple Restore Hybrid uses coils. Here is what that trade does to cooling, motion and support.',
    claims: { sameBrand: true, types: ['foam', 'hybrid'], sameFirmness: true },
    spotlight: { id: 'couple', label: 'Back sleeper sharing the bed, wakes easily', profile: { sleepPosition: 'back', motionSensitivity: 'couple-high' } },
    guides: ['motion-isolation-for-couples', 'mattress-types-explained'],
  },
  {
    a: 'casper-the-one',
    b: 'tuft-and-needle-mint-ii',
    title: 'Casper The One vs Tuft & Needle Mint Mattress II',
    short: 'Two all-foam beds under $1,000.',
    angle: 'Two all-foam mattresses, both with a published Queen price under $1,000 and independent ratings on file for every dimension we score.',
    claims: { sameType: 'foam', bothUnder: 1000 },
    spotlight: { id: 'couple', label: 'Side sleeper sharing the bed, wakes easily', profile: { sleepPosition: 'side', motionSensitivity: 'couple-high' } },
    guides: ['pressure-relief-for-side-sleepers', 'motion-isolation-for-couples'],
  },
  {
    a: 'dreamcloud-classic-hybrid',
    b: 'casper-dream',
    title: 'DreamCloud Classic Hybrid Mattress vs Casper Dream',
    short: 'A firmer value hybrid against a medium one.',
    angle: 'Two hybrids at very different prices. The DreamCloud costs less and is listed firmer; the Casper Dream sits closer to medium. Position decides which one the engine prefers.',
    claims: { sameType: 'hybrid', aCheaper: true, aFirmer: true },
    spotlight: null,
    guides: ['how-to-choose-mattress-firmness', 'mattress-buying-checklist'],
  },
  {
    a: 'helix-plus',
    b: 'big-fig-classic',
    title: 'Helix Plus vs Big Fig Classic Mattress',
    short: 'Two hybrids built for heavier sleepers.',
    angle: 'Two hybrids their makers describe as built for heavier and larger sleepers. We score them for a 260 lb back sleeper as well as the usual reference sleepers.',
    claims: { sameType: 'hybrid' },
    spotlight: { id: 'heavy', label: 'Back sleeper, 260 lb, prefers firm', profile: { sleepPosition: 'back', weightLb: 260, preferredFirmnessLabel: 'firm' } },
    guides: ['back-support-for-heavier-sleepers', 'edge-support-explained'],
  },
  {
    a: 'tempur-pedic-tempur-adapt',
    b: 'purple-plus',
    title: 'Tempur-Pedic TEMPUR-Adapt vs PurplePlus',
    short: 'Two premium all-foam beds, one runs warmer.',
    angle: "Two premium all-foam mattresses at the same listed firmness: Tempur-Pedic's TEMPUR-Material against Purple's GelFlex Grid. Their independent cooling ratings are far apart.",
    claims: { sameType: 'foam', sameFirmness: true },
    spotlight: { id: 'hot', label: 'Side sleeper who sleeps hot', profile: { sleepPosition: 'side', sleepTemperature: 'hot' } },
    guides: ['mattresses-for-hot-sleepers', 'cooling-mattress-comparison'],
  },
];

/** next.config redirects: every reversed slug -> its canonical pair page (HTTP 308). */
export function reversedPairRedirects(): PairRedirect[] {
  return PAIR_DEFS.map((p) => ({
    source: `/compare/${p.b}-vs-${p.a}`,
    destination: `/compare/${p.a}-vs-${p.b}`,
    permanent: true,
  }));
}
