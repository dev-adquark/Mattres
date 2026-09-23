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
};
