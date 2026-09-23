import { NextResponse } from 'next/server';
import { scoreEngine } from '@/lib/scoreEngine';
import catalog from '@/lib/data/mattress-catalog.json';

// lib/data/mattress-catalog.json here is the fully-processed, display-
// and-scoring-ready catalog (a flat array with priceUsd, sponsored,
// reviewHighlights, flat heightIn) - extracted directly from the real
// `CATALOG` array already embedded and verified working in the original
// project's index.html, NOT the raw ingest-pipeline output the same
// filename holds at the repo root (that raw shape is missing priceUsd/
// sponsored/reviewHighlights entirely and uses a nested height.inches).
// Confirmed this is the right one to use by cross-checking a known real
// result (Aurora Hybrid, side/210lb/medium-firm/hot -> 76/100) against
// what the live HTML site has produced for that exact profile throughout
// this project.

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

/**
 * Bridges a catalog entry (brand/model/type/firmnessRange/...) into the
 * shape the v0.1 scoring math expects (a single firmnessRating + a few
 * booleans/numbers). Ported exactly from the original project's
 * adaptCatalogEntryForScoring() in index.html - not reconstructed from
 * memory. This is the piece that was missing before: without it, raw
 * catalog entries have no firmnessRating/hasCoolingCover/
 * edgeSupportReinforced/topFoamDensityLbFt3 at all, so scoreEngine() would
 * have silently compared against `undefined` instead of throwing -
 * producing wrong scores with no error, not a crash. Caught by testing
 * an actual quiz submission end-to-end rather than trusting build/
 * typecheck alone.
 */
function adaptCatalogEntryForScoring(entry) {
  const firmnessRating = entry.firmnessRange
    ? (entry.firmnessRange.min + entry.firmnessRange.max) / 2
    : 5.5; // No firmness on file for this mattress; fall back to a neutral middle value.

  const notes = (entry.coreMaterialNotes || '').toLowerCase();
  const hasCoolingCover = notes.indexOf('gel') !== -1 || notes.indexOf('cooling') !== -1;
  const edgeSupportReinforced = entry.type !== 'foam'; // Heuristic: hybrids/innersprings assumed to have a supportive perimeter, foam assumed not.

  return {
    id: entry.id,
    type: entry.type,
    firmnessRating,
    hasCoolingCover,
    edgeSupportReinforced,
    topFoamDensityLbFt3: null, // Not in the catalog yet; durability rule is a no-op without it, same as the documented gap.
  };
}

function filterCatalog(profile) {
  return catalog.filter((entry) => {
    if (profile.mattressTypePreference && profile.mattressTypePreference.length &&
        profile.mattressTypePreference.indexOf(entry.type) === -1) return false;
    // budgetUsd.max is "no upper bound" when absent - a plain client-side
    // call could use Infinity for that, but this route receives the
    // profile as real JSON over HTTP, and Infinity isn't valid JSON (it
    // serializes to null). Treating a missing/null/non-finite max as "no
    // upper bound" (rather than comparing against null, which would
    // incorrectly exclude nearly everything) keeps this correct for a
    // real network round-trip, not just an in-memory call.
    if (profile.budgetUsd) {
      const { min, max } = profile.budgetUsd;
      if (typeof min === 'number' && entry.priceUsd < min) return false;
      if (typeof max === 'number' && Number.isFinite(max) && entry.priceUsd > max) return false;
    }
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
    scored = filtered.map((entry) => ({ entry, result: scoreEngine('0.1', profile, adaptCatalogEntryForScoring(entry)) }));
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
