/**
 * De-duplicates brand+model names (e.g. "Nimbus Nimbus Pocket Coil" ->
 * "Nimbus Pocket Coil") - ported as-is from the original project's
 * displayTitle().
 */
export function displayTitle(entry) {
  const firstBrandWord = entry.brand.split(' ')[0].toLowerCase();
  if (entry.model.toLowerCase().indexOf(firstBrandWord) === 0) return entry.model;
  return `${entry.brand} ${entry.model}`;
}

export const MATTRESS_THUMB_COLORS = {
  foam: ['#8ff2e4', '#22c9b0'],
  hybrid: ['#3fd4ff', '#3b6cf6'],
  innerspring: ['#5b8dff', '#6d3ff5'],
  latex: ['#c8e6a0', '#6d9c3f'],
};

/**
 * Real catalog entries can have a null priceUsd - either because the
 * manufacturer's price is rendered client-side and couldn't be captured
 * (Helix), or because only a "from" lowest-size price was found and using
 * it as a like-for-like Queen-size comparison price would be misleading
 * (Leesa). Every UI spot that displays a catalog entry's price goes
 * through this so none of them can silently call .toLocaleString() on
 * null and crash, or show a lowest-size price as if it were the size
 * being compared.
 */
export function formatPrice(entry) {
  if (typeof entry.priceUsd === 'number') return `$${entry.priceUsd.toLocaleString()}`;
  if (typeof entry.priceFromUsd === 'number') return `From $${entry.priceFromUsd.toLocaleString()}`;
  return 'Price not published';
}
