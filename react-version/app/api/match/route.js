import { NextResponse } from 'next/server';
import { matchProfile } from '@/lib/matchLogic';

/**
 * POST /api/match
 * Body: a Sleep Profile object (see lib/scoreEngine.js / lib/rules/0.1.json).
 * Thin HTTP wrapper around lib/matchLogic.js's matchProfile() - the actual
 * filter/score/sort/badge logic lives there so it's shared with the
 * Compare page's server-side render, not duplicated.
 */
export async function POST(request) {
  let profile;
  try {
    profile = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  if (!profile || !profile.sleepPosition || !profile.weightLb || !profile.preferredFirmnessLabel || !profile.sleepTemperature) {
    return NextResponse.json(
      { error: 'Missing required profile fields: sleepPosition, weightLb, preferredFirmnessLabel, sleepTemperature.' },
      { status: 400 }
    );
  }

  let payload;
  try {
    payload = await matchProfile(profile);
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Scoring failed.' }, { status: 500 });
  }

  return NextResponse.json(payload);
}
