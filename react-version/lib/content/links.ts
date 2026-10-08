/**
 * Internal linking map: for each guide and sleep-position page, the few
 * destinations a reader on that page plausibly wants next. Kept small and
 * topical on purpose - two or three related guides, the positions the
 * topic actually concerns, and an engine-ranked comparison where one
 * exists for the same profile family. Every slug here is checked against
 * the real registries in lib/content/content.test.ts.
 */

import { GUIDES, getGuide } from './guides';
import { compareTopics } from '@/lib/compareTopics';
import { SLEEP_POSITIONS } from '@/lib/site';
import { getCategoryPage, REFERENCE_PROFILE } from '@/lib/categoryPages';
import { isPositionSlug } from './positions';
import type { Guide, SleepPosition } from '@/lib/types';
import type { ComparisonLink, LinkItem, LinkSpec, PositionLink, RelatedDestinations } from './types';

/** Only the title is read here; typed minimally so the compare registry's own shape can evolve. */
const TOPICS: Record<string, { title: string } | undefined> = compareTopics;

export const GUIDE_LINKS: Record<string, Required<LinkSpec>> = {
  'how-to-choose-mattress-firmness': {
    guides: ['pressure-relief-for-side-sleepers', 'back-support-for-heavier-sleepers', 'mattress-types-explained'],
    positions: ['side', 'back', 'stomach', 'combination'],
    compare: [],
  },
  'mattress-types-explained': {
    guides: ['mattress-materials-explained', 'how-to-choose-mattress-firmness', 'edge-support-explained'],
    positions: [],
    compare: ['cooling-hybrids-for-couples'],
  },
  'pressure-relief-for-side-sleepers': {
    guides: ['how-to-choose-mattress-firmness', 'mattress-types-explained', 'motion-isolation-for-couples'],
    positions: ['side', 'combination'],
    compare: ['pressure-relief-for-side-sleepers', 'side-sleepers-under-1000'],
  },
  'back-support-for-heavier-sleepers': {
    guides: ['how-to-choose-mattress-firmness', 'edge-support-explained', 'mattress-buying-checklist'],
    positions: ['back', 'stomach'],
    compare: ['back-support-for-heavier-sleepers'],
  },
  'mattresses-for-hot-sleepers': {
    guides: ['cooling-mattress-comparison', 'sleep-position-and-temperature', 'mattress-materials-explained'],
    positions: [],
    compare: ['cooling-hybrids-for-couples'],
  },
  'cooling-mattress-comparison': {
    guides: ['mattresses-for-hot-sleepers', 'mattress-types-explained'],
    positions: [],
    compare: ['cooling-hybrids-for-couples'],
  },
  'motion-isolation-for-couples': {
    guides: ['edge-support-explained', 'mattresses-for-hot-sleepers', 'mattress-types-explained'],
    positions: ['combination'],
    compare: ['motion-isolation-for-couples', 'cooling-hybrids-for-couples'],
  },
  'edge-support-explained': {
    guides: ['motion-isolation-for-couples', 'mattress-materials-explained', 'back-support-for-heavier-sleepers'],
    positions: [],
    compare: [],
  },
  'mattress-buying-checklist': {
    guides: ['how-to-choose-mattress-firmness', 'mattress-types-explained', 'mattress-materials-explained'],
    positions: [],
    compare: [],
  },
  'mattress-materials-explained': {
    guides: ['mattress-types-explained', 'mattresses-for-hot-sleepers', 'motion-isolation-for-couples'],
    positions: [],
    compare: ['cooling-hybrids-for-couples'],
  },
  'sleep-position-and-temperature': {
    guides: ['mattresses-for-hot-sleepers', 'how-to-choose-mattress-firmness', 'pressure-relief-for-side-sleepers'],
    positions: ['side', 'back', 'stomach', 'combination'],
    compare: ['pressure-relief-for-side-sleepers'],
  },
};

export const POSITION_LINKS: Record<SleepPosition, Required<Pick<LinkSpec, 'guides' | 'compare'>>> = {
  side: {
    guides: ['pressure-relief-for-side-sleepers', 'how-to-choose-mattress-firmness', 'motion-isolation-for-couples'],
    compare: ['pressure-relief-for-side-sleepers', 'side-sleepers-under-1000'],
  },
  back: {
    guides: ['back-support-for-heavier-sleepers', 'how-to-choose-mattress-firmness', 'edge-support-explained'],
    compare: ['back-support-for-heavier-sleepers', 'motion-isolation-for-couples'],
  },
  stomach: {
    guides: ['how-to-choose-mattress-firmness', 'sleep-position-and-temperature', 'back-support-for-heavier-sleepers'],
    compare: [],
  },
  combination: {
    guides: ['how-to-choose-mattress-firmness', 'sleep-position-and-temperature', 'mattress-types-explained'],
    compare: ['cooling-hybrids-for-couples'],
  },
};

function resolve({ guides = [], positions = [], compare = [] }: LinkSpec, excludeGuide?: string): RelatedDestinations {
  const comparisons: ComparisonLink[] = [];
  for (const slug of compare) {
    const topic = TOPICS[slug];
    if (topic) comparisons.push({ slug, title: topic.title, href: `/compare/${slug}` });
  }
  return {
    guides: guides
      .filter((s) => s !== excludeGuide)
      .map(getGuide)
      .filter((g): g is Guide => g !== null),
    positions: positions
      .map((slug) => SLEEP_POSITIONS.find((p) => p.slug === slug))
      .filter((p): p is PositionLink => p !== undefined),
    comparisons,
  };
}

/** Related destinations for a guide page. Falls back to same-category guides. */
export function relatedForGuide(slug: string): RelatedDestinations {
  const entry = GUIDE_LINKS[slug];
  if (entry) return resolve(entry, slug);
  const guide = getGuide(slug);
  const sameCategory = guide ? GUIDES.filter((g) => g.category === guide.category && g.slug !== slug).map((g) => g.slug) : [];
  return resolve({ guides: sameCategory }, slug);
}

/** Related destinations for a sleep-position page (other positions are added by the page). */
export function relatedForPosition(position: string): RelatedDestinations {
  return resolve(isPositionSlug(position) ? POSITION_LINKS[position] : {});
}

/**
 * The ranked /mattresses list for a sleep position. Combination sleepers have
 * no dedicated category page: /mattresses/best is ranked for a combination
 * reference sleeper (lib/categoryPages REFERENCE_PROFILE), so that is the
 * honest ranked list for them. Returns { href, label } or null.
 */
export function rankingForPosition(slug: string): LinkItem | null {
  const direct = getCategoryPage(`${slug}-sleepers`);
  if (direct) return { href: direct.href, label: direct.title };
  if (REFERENCE_PROFILE.sleepPosition === slug) {
    const best = getCategoryPage('best');
    if (best) return { href: best.href, label: `${best.title}, ranked for a combination sleeper` };
  }
  return null;
}
