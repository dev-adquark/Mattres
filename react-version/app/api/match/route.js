import { NextResponse } from 'next/server';
import { matchProfile } from '@/lib/matchLogic';

const POSITIONS = new Set(['side', 'back', 'stomach', 'combination']);
const FIRMNESS = new Set(['soft', 'medium-soft', 'medium', 'medium-firm', 'firm', 'extra-firm']);
const TEMPERATURES = new Set(['cold', 'neutral', 'hot']);
const MOTION = new Set(['single', 'couple-low', 'couple-high']);
const MATTRESS_TYPES = new Set(['foam', 'hybrid', 'innerspring', 'latex']);

function invalidProfile(profile) {
  if (!profile || typeof profile !== 'object' || Array.isArray(profile)) return 'Profile must be a JSON object.';
  if (!POSITIONS.has(profile.sleepPosition)) return 'Choose a valid sleep position.';
  if (!Number.isFinite(profile.weightLb) || profile.weightLb < 50 || profile.weightLb > 700) return 'Weight must be a number between 50 and 700 lb.';
  if (!FIRMNESS.has(profile.preferredFirmnessLabel)) return 'Choose a valid firmness preference.';
  if (!TEMPERATURES.has(profile.sleepTemperature)) return 'Choose a valid sleep temperature.';
  if (profile.motionSensitivity !== undefined && !MOTION.has(profile.motionSensitivity)) return 'Choose a valid motion sensitivity.';
  if (profile.mattressTypePreference !== undefined &&
      (!Array.isArray(profile.mattressTypePreference) ||
       profile.mattressTypePreference.some((type) => !MATTRESS_TYPES.has(type)))) {
    return 'Mattress type preferences must be a list of supported types.';
  }
  if (profile.budgetUsd !== undefined) {
    const budget = profile.budgetUsd;
    if (!budget || typeof budget !== 'object' || Array.isArray(budget)) return 'Budget must be an object.';
    const min = budget.min ?? 0;
    const max = budget.max;
    if (!Number.isFinite(min) || min < 0 || min > 100000 ||
        (max !== undefined && max !== null && (!Number.isFinite(max) || max < 0 || max > 100000)) ||
        (max !== undefined && max !== null && max < min)) {
      return 'Budget must use valid amounts between $0 and $100,000, with maximum not below minimum.';
    }
  }
  return null;
}

/** POST /api/match — validated wrapper around the shared scoring engine. */
export async function POST(request) {
  let profile;
  try {
    profile = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const validationError = invalidProfile(profile);
  if (validationError) return NextResponse.json({ error: validationError }, { status: 400 });

  try {
    const payload = await matchProfile(profile);
    return NextResponse.json(payload);
  } catch {
    // Avoid returning internal exception details or implementation paths to clients.
    return NextResponse.json({ error: 'Scoring is temporarily unavailable. Please try again.' }, { status: 500 });
  }
}
