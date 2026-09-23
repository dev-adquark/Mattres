import { NextResponse } from 'next/server';
import { scoreEngine } from '@/lib/scoreEngine';
import catalog from '@/lib/data/mattress-catalog.json';

/**
 * POST /api/match
 * Body: a Sleep Profile object (see lib/scoreEngine.js / lib/rules/0.1.json).
 * Returns every catalog mattress that survives the type/budget filters,
 * each scored with the real scoring engine, sorted by score, with a
 * "badge" (sponsored / top match / algorithmic pick) assigned the same
 * way the original single-file version did it: sponsored listings never
 * count as the "top match", and the first non-sponsored entry after
 * sorting gets that label.
 *
 * This is the one meaningful architecture improvement over the original
 * project during this React port: the original was a single static HTML
 * file with no server, so it had to duplicate the scoring engine's logic
 * client-side by hand. Here there is a real server, so this route can
 * import and run the actual lib/scoreEngine.js directly - one
 * implementation, not two copies that could quietly drift apart.
 */
function displayTitle(entry) {
  const firstBrandWord = entry.brand.split(' ')[0].toLowerCase();
  if (entry.model.toLowerCase().indexOf(firstBrandWord) === 0) return entry.model;
  return `${entry.brand} ${entry.model}`;
}

function filterCatalog(profile) {
  return catalog.filter((entry) => {
    if (profile.mattressTypePreference && profile.mattressTypePreference.length &&
        profile.mattressTypePreference.indexOf(entry.type) === -1) return false;
    if (profile.budgetUsd && (entry.priceUsd < profile.budgetUsd.min || entry.priceUsd > profile.budgetUsd.max)) return false;
    return true;
  });
}

function badgeFor(entry, isTopMatch) {
  if (entry.sponsored) return { label: 'Sponsored Verified', className: 'badge-sponsored' };
  if (isTopMatch) return { label: 'Top match — Algorithmic Pick', className: 'badge-top' };
  return { label: 'Algorithmic Pick', className: 'badge-none' };
}

function buildWhyThisMatch(scored) {
  const bullets = [];
  scored.trace.categoryRulesUsed.forEach((r) => {
    if (r.delta === 0) return;
    const sign = r.delta > 0 ? '+' : '';
    bullets.push(`${r.category || 'overall'}: ${sign}${r.delta} — ${r.note}`);
  });
  scored.trace.riskRulesUsed.forEach((r) => {
    if (!r.triggered) return;
    bullets.push(`Flagged: ${r.ruleId.replace(/_/g, ' ').toLowerCase()}`);
  });
  return bullets;
}

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

  const filtered = filterCatalog(profile);
  if (filtered.length === 0) {
    return NextResponse.json({ results: [], modelVersion: null });
  }

  let scored;
  try {
    scored = filtered.map((entry) => ({ entry, result: scoreEngine('0.1', profile, entry) }));
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Scoring failed.' }, { status: 500 });
  }

  scored.sort((a, b) => b.result.overallScore - a.result.overallScore);

  let firstNonSponsoredSeen = false;
  const results = scored.map((item, index) => {
    const { entry, result } = item;
    const isTopMatch = !entry.sponsored && !firstNonSponsoredSeen;
    if (!entry.sponsored) firstNonSponsoredSeen = true;
    const badge = badgeFor(entry, isTopMatch);
    return {
      entry,
      result,
      badge,
      displayTitle: displayTitle(entry),
      whyThisMatch: buildWhyThisMatch(result),
      preselect: index < 3,
    };
  });

  return NextResponse.json({
    results,
    modelVersion: results[0]?.result.modelVersion ?? '0.1',
    all: results.map((r) => ({ id: r.entry.id, brand: r.entry.brand, model: r.entry.model, score: r.result.overallScore })),
  });
}
