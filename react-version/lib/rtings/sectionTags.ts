/**
 * RTINGS' mattress reviews have a fixed set of test sections (Side Sleeping,
 * Back Sleeping, ..., Edge Support). The scraper's `recommendedFor` field
 * returns those section headings - the review's page navigation - not a
 * per-product recommendation: every scraped review carries the same list.
 * Showing it as "RTINGS lists it as suited to" would claim RTINGS
 * recommends every mattress for every position, so a tag list made only of
 * section headings is dropped here. A list with any tag outside this set is
 * kept as RTINGS published it.
 */
export const RTINGS_SECTION_HEADINGS: ReadonlySet<string> = new Set(
  [
    'Side Sleeping',
    'Back Sleeping',
    'Stomach Sleeping',
    'Combination Sleeping',
    'Firmness',
    'Longevity',
    'Pressure Relief',
    'Support',
    'Cooling',
    'Motion Dissipation',
    'Motion Isolation',
    'Responsiveness',
    'Edge Support',
    'Ease of Moving',
    'Off-Gassing',
    'Body Weight',
    'Sleeping Position',
  ].map((t) => t.toLowerCase()),
);

/** True when every tag is one of RTINGS' review section headings. */
export function isSectionNavigation(tags: readonly string[]): boolean {
  return tags.length > 0 && tags.every((t) => RTINGS_SECTION_HEADINGS.has(t.trim().toLowerCase()));
}

/** The tags, or [] when they are only RTINGS' section navigation. */
export function realRecommendedFor(tags: readonly string[]): string[] {
  return isSectionNavigation(tags) ? [] : [...tags];
}
