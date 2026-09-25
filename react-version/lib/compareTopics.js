/**
 * Each topic is a real, documented Sleep Profile run through the actual
 * scoreEngine via matchProfile() at request time - never a pre-baked
 * static score table. weightLb values are representative midpoints of
 * their stated band; the real scoring math only reads weight through a
 * band lookup (resolveWeightBand) and a 200lb durability threshold, so
 * any value within the stated band produces identical output - not a
 * guess that could silently change the real result.
 */
export const compareTopics = {
  'side-sleepers-under-1000': {
    title: 'Best mattresses for side sleepers under $1,000',
    chips: ['Side sleeper', '130–180 lb', 'Medium-firm', 'Sleeps warm'],
    profile: {
      sleepPosition: 'side',
      weightLb: 155,
      preferredFirmnessLabel: 'medium-firm',
      sleepTemperature: 'hot',
      motionSensitivity: 'single',
      painFocus: [],
      mattressTypePreference: [],
      budgetUsd: { min: 0, max: 1000 },
    },
  },
  'cooling-hybrids-for-couples': {
    title: 'Cooling hybrid mattresses for couples',
    chips: ['Couple', 'High motion sensitivity', 'Hybrid preferred', 'Sleeps hot'],
    profile: {
      sleepPosition: 'side',
      weightLb: 180,
      preferredFirmnessLabel: 'medium-firm',
      sleepTemperature: 'hot',
      motionSensitivity: 'couple-high',
      painFocus: [],
      mattressTypePreference: ['hybrid'],
    },
  },
  'motion-isolation-for-couples': {
    title: 'Best motion isolation for couples',
    chips: ['Couple', 'High motion sensitivity', 'Any type', 'Neutral temperature'],
    profile: {
      sleepPosition: 'back',
      weightLb: 180,
      preferredFirmnessLabel: 'medium-firm',
      sleepTemperature: 'neutral',
      motionSensitivity: 'couple-high',
      painFocus: [],
      mattressTypePreference: [],
    },
  },
  'pressure-relief-for-side-sleepers': {
    title: 'Best pressure relief for side sleepers',
    chips: ['Side sleeper', 'Shoulder/hip focus', 'Soft-to-medium', 'Any budget'],
    profile: {
      sleepPosition: 'side',
      weightLb: 160,
      preferredFirmnessLabel: 'soft',
      sleepTemperature: 'neutral',
      motionSensitivity: 'single',
      painFocus: ['shoulder', 'hip'],
      mattressTypePreference: [],
    },
  },
  'back-support-for-heavier-sleepers': {
    title: 'Back support mattresses for heavier back sleepers',
    chips: ['Back sleeper', '230+ lb', 'Firm', 'Durability focus'],
    profile: {
      sleepPosition: 'back',
      weightLb: 240,
      preferredFirmnessLabel: 'firm',
      sleepTemperature: 'neutral',
      motionSensitivity: 'single',
      painFocus: ['back'],
      mattressTypePreference: [],
    },
  },
};

export function getCompareTopic(slug) {
  return compareTopics[slug] || null;
}
