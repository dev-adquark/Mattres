/**
 * Representative Sleep Profiles used to rank "related mattresses" on guide
 * and sleep-position pages. Each one is run through the real engine via
 * matchProfile() at render time - nothing here is a score. The profile is
 * always disclosed next to the ranking (see components/content/RankedMattresses),
 * because a ranking is only meaningful for the profile that produced it.
 *
 * Each weight falls inside one engine weight band (lib/rules/0.2.json
 * weightBands); any weight in the same band gives the same comfort band.
 * Only fields the engine actually reads are set.
 */

import type {
  EdgeImportance,
  FirmnessLabel,
  MotionSensitivity,
  PainFocus,
  SleepPosition,
  SleepProfile,
  SleepTemperature,
} from '@/lib/types';
import type { RepresentativeProfile } from './types';

export const REPRESENTATIVE_PROFILES: Record<string, RepresentativeProfile> = {
  'side-160': {
    profile: { sleepPosition: 'side', weightLb: 160, preferredFirmnessLabel: 'medium-soft', sleepTemperature: 'neutral' },
  },
  'back-180': {
    profile: { sleepPosition: 'back', weightLb: 180, preferredFirmnessLabel: 'medium-firm', sleepTemperature: 'neutral' },
  },
  'stomach-170': {
    profile: { sleepPosition: 'stomach', weightLb: 170, preferredFirmnessLabel: 'firm', sleepTemperature: 'neutral' },
  },
  'combination-170': {
    profile: { sleepPosition: 'combination', weightLb: 170, preferredFirmnessLabel: 'medium', sleepTemperature: 'neutral' },
  },
  'side-shoulders-150': {
    profile: { sleepPosition: 'side', weightLb: 150, preferredFirmnessLabel: 'medium-soft', sleepTemperature: 'neutral', painFocus: 'shoulders' },
  },
  'heavier-back-250': {
    profile: { sleepPosition: 'back', weightLb: 250, preferredFirmnessLabel: 'firm', sleepTemperature: 'neutral', painFocus: 'lower-back' },
  },
  'hot-side-170': {
    profile: { sleepPosition: 'side', weightLb: 170, preferredFirmnessLabel: 'medium', sleepTemperature: 'hot' },
  },
  'hot-back-190': {
    profile: { sleepPosition: 'back', weightLb: 190, preferredFirmnessLabel: 'medium-firm', sleepTemperature: 'hot' },
  },
  'couple-side-170': {
    profile: { sleepPosition: 'side', weightLb: 170, preferredFirmnessLabel: 'medium', sleepTemperature: 'neutral', motionSensitivity: 'couple-high' },
  },
  'edge-back-190': {
    profile: { sleepPosition: 'back', weightLb: 190, preferredFirmnessLabel: 'medium-firm', sleepTemperature: 'neutral', edgeImportance: 'high' },
  },
};

export function getRepresentativeProfile(key: string | null | undefined): SleepProfile | null {
  const found = key ? REPRESENTATIVE_PROFILES[key] : undefined;
  return found ? found.profile : null;
}

const POSITION_TEXT: Record<SleepPosition, string> = {
  side: 'Side sleeper',
  back: 'Back sleeper',
  stomach: 'Stomach sleeper',
  combination: 'Combination sleeper',
};
const FIRMNESS_TEXT: Record<FirmnessLabel, string> = {
  soft: 'Prefers soft',
  'medium-soft': 'Prefers medium-soft',
  medium: 'Prefers medium',
  'medium-firm': 'Prefers medium-firm',
  firm: 'Prefers firm',
  'extra-firm': 'Prefers extra-firm',
};
const TEMP_TEXT: Record<SleepTemperature, string> = { hot: 'Sleeps hot', cold: 'Sleeps cold', neutral: 'Neutral temperature' };
const MOTION_TEXT: Record<MotionSensitivity, string> = {
  single: 'Sleeps alone',
  'couple-low': 'Shares the bed',
  'couple-high': 'Shares the bed, wakes easily',
};
const PAIN_TEXT: Partial<Record<PainFocus, string>> = {
  shoulders: 'Shoulder discomfort',
  hips: 'Hip discomfort',
  'lower-back': 'Lower-back discomfort',
  'whole-body': 'General aches',
};
const EDGE_TEXT: Record<EdgeImportance, string> = {
  low: 'Edge support: low priority',
  medium: 'Edge support: some priority',
  high: 'Edge support: high priority',
};

/** Human-readable chips describing a profile, in the order the quiz asks. */
export function profileChips(profile: Partial<SleepProfile> | null | undefined): string[] {
  if (!profile) return [];
  return [
    profile.sleepPosition ? POSITION_TEXT[profile.sleepPosition] : null,
    typeof profile.weightLb === 'number' ? `${profile.weightLb} lb` : null,
    profile.preferredFirmnessLabel ? FIRMNESS_TEXT[profile.preferredFirmnessLabel] : null,
    profile.sleepTemperature ? TEMP_TEXT[profile.sleepTemperature] : null,
    profile.motionSensitivity ? MOTION_TEXT[profile.motionSensitivity] : null,
    typeof profile.painFocus === 'string' ? PAIN_TEXT[profile.painFocus] : null,
    profile.edgeImportance ? EDGE_TEXT[profile.edgeImportance] : null,
  ].filter((chip): chip is string => Boolean(chip));
}

/** Query string that pre-fills the quiz with what we know (position only). */
export function findMatchHref(position?: string | null): string {
  return position ? `/find-match?position=${encodeURIComponent(position)}` : '/find-match';
}
