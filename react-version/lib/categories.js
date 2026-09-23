/**
 * The six real scoring dimensions the engine returns, and how they're
 * labeled/iconified across the UI. Ported from the original project's
 * CATEGORY_LABELS / CATEGORY_DISPLAY constants - kept as one shared source
 * so the gallery, the quiz reasoning, and any future consumer can't drift
 * out of sync with each other or with lib/scoreEngine.js's actual
 * `rules.categories` order (pressureRelief, support, heat, motion, edge,
 * durability).
 */
export const CATEGORIES = [
  { key: 'pressureRelief', label: 'Pressure Relief', short: 'Pressure', icon: 'pressure' },
  { key: 'support', label: 'Support', short: 'Support', icon: 'support' },
  { key: 'heat', label: 'Cooling', short: 'Cooling', icon: 'cooling' },
  { key: 'motion', label: 'Motion Isolation', short: 'Motion', icon: 'motion' },
  { key: 'edge', label: 'Edge Support', short: 'Edge', icon: 'edge' },
  { key: 'durability', label: 'Durability', short: 'Durability', icon: 'durability' },
];

export const CATEGORY_BLURB = {
  pressureRelief: 'Contact points where the surface yields to your shape.',
  support: 'An even base keeps your spine level, not sagging or arching.',
  heat: 'Airflow through the surface carries heat away as you sleep.',
  motion: 'Movement on one side fades out before it reaches the other.',
  edge: 'A reinforced perimeter so the edge holds when you sit or sleep near it.',
  durability: 'Material density holds its shape instead of sagging over years of use.',
};

/**
 * Ported exactly from the original project's DIMENSION_TO_LAYER: which
 * X-Ray layer a score dimension jumps to when clicked. Illustrative
 * (which layer a dimension mainly relates to in a typical hybrid
 * construction), not a claim about the specific recommended mattress's
 * exact internal materials, which the catalog doesn't carry yet - same
 * caveat the original project documented alongside this mapping.
 */
export const DIMENSION_TO_LAYER = {
  pressureRelief: 'comfort',
  support: 'support',
  heat: 'cover',
  motion: 'transition',
  edge: 'support',
  durability: 'support',
};
