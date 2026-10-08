/**
 * Curated comparison topics for /compare/[topic].
 *
 * Each topic is a documented demo Sleep Profile that is run through the real
 * scoring engine (matchProfile) when the page renders. Nothing here is a
 * score, a ranking or a product claim: the ranking, the sub-scores, the
 * reasons and the watch-outs all come from the engine output for the profile.
 *
 * weightLb values are representative points inside a weight band; the engine
 * reads weight through a band lookup, so any value in the same band gives the
 * same result.
 *
 * Copy rules: `intro` and `why` describe the sleeper and how the engine's
 * rules (lib/rules/0.2.json) treat them. They never name or praise a product.
 *
 * Every topic must yield at least MIN_TOPIC_CANDIDATES real catalog matches
 * (enforced by lib/compareTopics.test.ts); a topic that can't is removed.
 */

import { formatUsd } from '@/lib/format';
import type {
  CompareTopic,
  EdgeImportance,
  FirmnessLabel,
  LegacyPainFocusArea,
  MattressType,
  MotionSensitivity,
  PainFocus,
  SleepPosition,
  SleepProfile,
  SleepTemperature,
} from '@/lib/types';

export const MIN_TOPIC_CANDIDATES = 2;

/** How many engine-ranked mattresses a topic page puts side by side. */
export const TOPIC_COMPARE_COUNT = 3;

/**
 * Pain focus as the engine accepts it (lib/profileValidation.ts): one v0.2
 * value, or an array mixing v0.2 and legacy values (normalised by the engine).
 */
export type ProfilePainFocus = PainFocus | readonly (PainFocus | LegacyPainFocusArea | 'back')[];

/** A sleep profile as topics and stored quiz payloads carry it. */
export type ProfileInput = Omit<SleepProfile, 'painFocus'> & { painFocus?: ProfilePainFocus };

/** Any (possibly partial) profile the chip/filter helpers describe. */
export type ProfileLike = Partial<ProfileInput>;

/** A topic as authored below; `chips` is derived from `profile`. */
export type CompareTopicDef = Omit<CompareTopic, 'profile' | 'chips'> & { profile: ProfileInput };

/** A topic as exported: its demo profile plus chips derived from it. */
export type CompareTopicConfig = CompareTopicDef & { chips: string[] };

export interface ProfileFilter {
  id: 'type' | 'budget';
  chip: string;
  text: string;
}

const POSITION_LABEL: Record<SleepPosition, string> = {
  side: 'Side sleeper',
  back: 'Back sleeper',
  stomach: 'Stomach sleeper',
  combination: 'Combination sleeper',
};
const FIRMNESS_LABEL: Record<FirmnessLabel, string> = {
  soft: 'Prefers soft',
  'medium-soft': 'Prefers medium-soft',
  medium: 'Prefers medium',
  'medium-firm': 'Prefers medium-firm',
  firm: 'Prefers firm',
  'extra-firm': 'Prefers extra-firm',
};
const TEMP_LABEL: Record<SleepTemperature, string> = { cold: 'Sleeps cold', neutral: 'Neutral temperature', hot: 'Sleeps hot' };
const MOTION_LABEL: Record<MotionSensitivity, string> = {
  single: 'Sleeps alone',
  'couple-low': 'Shares the bed',
  'couple-high': 'Shares the bed, wakes easily',
};
const EDGE_LABEL: Record<EdgeImportance, string> = {
  low: 'Edge support: low priority',
  medium: 'Edge support: medium priority',
  high: 'Edge support: high priority',
};
const PAIN_LABEL: Partial<Record<string, string>> = { shoulders: 'shoulders', hips: 'hips', 'lower-back': 'lower back', 'whole-body': 'whole body' };
const TYPE_LABEL: Record<MattressType, string> = { foam: 'all-foam', hybrid: 'hybrid', innerspring: 'innerspring', latex: 'latex' };

/**
 * Label lookup that tolerates values outside the vocabulary (a stored quiz
 * payload is untrusted input): unknown keys give undefined, as before.
 */
function labelOf<K extends string>(map: Record<K, string>, key: K | null | undefined): string | undefined {
  if (key === null || key === undefined) return undefined;
  return Object.prototype.hasOwnProperty.call(map, key) ? map[key] : undefined;
}

const money = formatUsd;

/** The hard filters a profile applies before scoring (type, budget). Pure; safe on client and server. */
export function profileFilters(profile: ProfileLike | null | undefined): ProfileFilter[] {
  const out: ProfileFilter[] = [];
  if (!profile) return out;
  const types = profile.mattressTypePreference || [];
  if (types.length) {
    const label = types.map((t) => labelOf(TYPE_LABEL, t) || t).join(' or ');
    out.push({
      id: 'type',
      chip: `${label.charAt(0).toUpperCase()}${label.slice(1)} only`,
      text: `Only ${label} mattresses are considered. Other types are left out before scoring.`,
    });
  }
  const max = profile.budgetUsd && profile.budgetUsd.max;
  if (typeof max === 'number' && Number.isFinite(max)) {
    out.push({
      id: 'budget',
      chip: `Queen up to ${money(max)}`,
      text: `Only mattresses with a published Queen price of ${money(max)} or less are considered. A mattress without a published price is left out, because we can't confirm it fits the budget.`,
    });
  }
  return out;
}

/** Plain-language chips describing a profile, derived from the profile itself so they can't drift. */
export function profileChips(profile: ProfileLike | null | undefined): string[] {
  if (!profile) return [];
  const chips: string[] = [];
  const position = labelOf(POSITION_LABEL, profile.sleepPosition);
  if (position) chips.push(position);
  if (typeof profile.weightLb === 'number') chips.push(`${profile.weightLb} lb`);
  const firmness = labelOf(FIRMNESS_LABEL, profile.preferredFirmnessLabel);
  if (firmness) chips.push(firmness);
  const temperature = labelOf(TEMP_LABEL, profile.sleepTemperature);
  if (temperature) chips.push(temperature);
  const motion = labelOf(MOTION_LABEL, profile.motionSensitivity);
  if (motion) chips.push(motion);
  const edge = labelOf(EDGE_LABEL, profile.edgeImportance);
  if (edge) chips.push(edge);
  const focus: readonly unknown[] = Array.isArray(profile.painFocus) ? profile.painFocus : [profile.painFocus];
  const pain = focus.map((p) => (typeof p === 'string' ? PAIN_LABEL[p] : undefined)).filter((p): p is string => Boolean(p));
  if (pain.length) chips.push(`Focus: ${pain.join(' and ')}`);
  for (const f of profileFilters(profile)) chips.push(f.chip);
  return chips;
}

const TOPIC_DEFS = {
  'side-sleepers-under-1000': {
    title: 'Side sleepers under $1,000',
    h1: 'Side-sleeper mattresses under $1,000',
    metaTitle: 'Side-sleeper mattresses under $1,000, compared',
    description:
      'Mattresses with a published Queen price of $1,000 or less, ranked by Match Score for a side sleeper who sleeps hot. Compare pressure relief, support, cooling, price and policies side by side.',
    intro:
      'A side sleeper on a firm budget: 155 lb, sleeps hot, and wants to spend $1,000 or less on a Queen. Only mattresses with a published Queen price at or below that line are scored.',
    why: [
      {
        title: 'Shoulders and hips carry the load',
        text: 'On your side, most of your weight rests on two narrow points. Pressure relief counts for more for side sleepers, and support is checked against the firmness range that keeps the spine level at this weight.',
      },
      {
        title: 'Heat counts double',
        text: 'Because this sleeper runs hot, cooling carries twice its default weight. Where no independent cooling rating is on file, the score uses an estimate and marks it.',
      },
      {
        title: 'Budget is a filter, not a score',
        text: 'Price never raises or lowers a Match Score. It only decides which mattresses are eligible, using the published Queen price.',
      },
    ],
    guides: ['pressure-relief-for-side-sleepers', 'cooling-mattress-comparison'],
    profile: {
      sleepPosition: 'side',
      weightLb: 155,
      preferredFirmnessLabel: 'medium-firm',
      sleepTemperature: 'hot',
      motionSensitivity: 'single',
      mattressTypePreference: [],
      budgetUsd: { min: 0, max: 1000 },
    },
  },
  'cooling-hybrids-for-couples': {
    title: 'Cooling hybrids for couples',
    h1: 'Cooling hybrid mattresses for couples',
    metaTitle: 'Cooling hybrid mattresses for couples, compared',
    description:
      'Hybrid mattresses ranked by Match Score for a couple who sleeps hot and is easily woken by a partner moving. Compare cooling, motion isolation, edge support and price.',
    intro:
      'Two people sharing a bed, one a light sleeper, both running warm. Only hybrids are considered: the coil-and-foam builds that couples who sleep hot often shortlist.',
    why: [
      {
        title: 'Cooling and motion pull in different directions',
        text: 'Cooling and motion isolation both count double for this profile. Coils move air but can pass movement along, so the engine flags a mattress that is likely to transfer motion.',
      },
      {
        title: 'Hybrid is a filter',
        text: 'Other construction types are left out before scoring. Your own match can include every type.',
      },
    ],
    guides: ['cooling-mattress-comparison', 'pressure-relief-for-side-sleepers'],
    profile: {
      sleepPosition: 'side',
      weightLb: 180,
      preferredFirmnessLabel: 'medium-firm',
      sleepTemperature: 'hot',
      motionSensitivity: 'couple-high',
      mattressTypePreference: ['hybrid'],
    },
  },
  'motion-isolation-for-couples': {
    title: 'Motion isolation for couples',
    h1: 'Mattresses for couples who wake easily',
    metaTitle: 'Best motion isolation for couples, compared',
    description:
      'Every mattress in the catalog ranked by Match Score for a back-sleeping couple sensitive to a partner moving. Compare motion isolation, support and edge support side by side.',
    intro:
      'A back sleeper who shares the bed and wakes when a partner turns over. Every type is eligible, and motion isolation counts for twice its default weight.',
    why: [
      {
        title: 'Movement travels through some builds more than others',
        text: 'For a light-sleeping couple, motion isolation gets double weight. Where only a construction-based estimate exists, the comparison marks it as estimated.',
      },
      {
        title: 'Back sleepers need the middle held up',
        text: 'Support counts for more on the back, and it is checked against the firmness range that keeps the lower back level at this weight.',
      },
    ],
    guides: ['back-support-for-heavier-sleepers'],
    profile: {
      sleepPosition: 'back',
      weightLb: 180,
      preferredFirmnessLabel: 'medium-firm',
      sleepTemperature: 'neutral',
      motionSensitivity: 'couple-high',
      mattressTypePreference: [],
    },
  },
  'pressure-relief-for-side-sleepers': {
    title: 'Pressure relief for side sleepers',
    h1: 'Pressure relief for side sleepers',
    metaTitle: 'Best pressure relief for side sleepers, compared',
    description:
      'Every mattress in the catalog ranked by Match Score for a side sleeper with sore shoulders and hips who prefers a soft feel. Compare pressure relief, support and firmness fit.',
    intro:
      'A side sleeper who wakes with sore shoulders and hips and likes a soft bed. There is no budget or type filter, so every mattress in the catalog is scored.',
    why: [
      {
        title: 'Pressure relief leads',
        text: 'Side sleeping, shoulder focus and hip focus each add weight to pressure relief, so it is the largest part of this score.',
      },
      {
        title: 'Soft is not automatically better',
        text: 'Too soft and the hips sink out of line. Support still counts, and the firmness-fit row shows whether each mattress sits inside, below or above the recommended range.',
      },
    ],
    guides: ['pressure-relief-for-side-sleepers'],
    profile: {
      sleepPosition: 'side',
      weightLb: 160,
      preferredFirmnessLabel: 'soft',
      sleepTemperature: 'neutral',
      motionSensitivity: 'single',
      painFocus: ['shoulders', 'hips'],
      mattressTypePreference: [],
    },
  },
  'back-support-for-heavier-sleepers': {
    title: 'Back support for heavier sleepers',
    h1: 'Back support for heavier back sleepers',
    metaTitle: 'Back support mattresses for heavier back sleepers, compared',
    description:
      'Every mattress in the catalog ranked by Match Score for a 240 lb back sleeper with lower-back focus and a firm preference. Compare support, durability, edge support and price.',
    intro:
      'A 240 lb back sleeper who wants a firm bed and has lower-back focus. Every type is eligible; support and durability carry extra weight.',
    why: [
      {
        title: 'Support has to hold more weight',
        text: 'Above 230 lb the recommended firmness range moves up, and back sleeping, lower-back focus and body weight each add weight to support.',
      },
      {
        title: 'Durability gets a closer look',
        text: 'Durability counts for one and a half times its default weight. A sag-risk warning appears when an independent durability rating falls below the heavier-sleeper threshold; it is never raised on an estimate alone.',
      },
    ],
    guides: ['back-support-for-heavier-sleepers'],
    profile: {
      sleepPosition: 'back',
      weightLb: 240,
      preferredFirmnessLabel: 'firm',
      sleepTemperature: 'neutral',
      motionSensitivity: 'single',
      painFocus: 'lower-back',
      mattressTypePreference: [],
    },
  },
} satisfies Record<string, CompareTopicDef>;

export type CompareTopicSlug = keyof typeof TOPIC_DEFS;

// Chips are derived (not hand-written) so they always describe the real profile.
export const compareTopics = Object.fromEntries(
  Object.entries(TOPIC_DEFS).map(([slug, def]) => [slug, { ...def, chips: profileChips(def.profile) }])
) as Record<CompareTopicSlug, CompareTopicConfig>;

export const COMPARE_TOPIC_SLUGS = Object.keys(compareTopics) as CompareTopicSlug[];

export function isCompareTopicSlug(slug: string): slug is CompareTopicSlug {
  return Object.prototype.hasOwnProperty.call(compareTopics, slug);
}

export function getCompareTopic(slug: string): CompareTopicConfig | null {
  return isCompareTopicSlug(slug) ? compareTopics[slug] : null;
}

/**
 * Curated head-to-head pages (/compare/<a>-vs-<b>). The registry and its
 * gate live in lib/comparePairs.ts; re-exported here because the search
 * index, the sitemap and the nav route test read COMPARE_PAIRS from this
 * module. Shape: [{ slug, title, a, b, href, short, angle, ... }].
 */
export { COMPARE_PAIRS, VS_PAGES, PAIR_SLUGS, getPair, getReversedPair, pairsFor } from '@/lib/comparePairs';
