'use strict';

/**
 * Match Scoring Engine
 * --------------------
 * Versioned, rule-based scorer that takes a structured Sleep Profile and a
 * Mattress spec and returns an overall score, six category sub-scores, and
 * an array of risk flags (each with a machine-readable code, a human
 * rationale, and a mitigation suggestion).
 *
 * Design goals for this skeleton (v0.1):
 *  - Deterministic: same inputs always produce the same output. No RNG,
 *    no wall-clock time in the scoring math.
 *  - Transparent: every threshold/weight/baseline lives in a versioned JSON
 *    dataset under data/rules/<version>.json, not hardcoded in this file.
 *  - Explainable: every risk flag rationale references the actual numbers
 *    that triggered it, not just a static description.
 *
 * This is intentionally a v0.1 skeleton: the adjustment math is simple and
 * linear so it's easy to reason about and extend. It has NOT been
 * calibrated against real product or review data.
 */

const fs = require('fs');
const path = require('path');

const RULES_DIR = path.join(__dirname, '..', 'data', 'rules');

/** In-memory cache so repeated calls in the same process don't re-read disk. */
const rulesCache = new Map();

/**
 * Loads the rules dataset for a given scoring model version.
 * @param {string} version e.g. "0.1"
 * @returns {object} parsed rules dataset
 */
function loadRules(version) {
  if (rulesCache.has(version)) return rulesCache.get(version);

  const filePath = path.join(RULES_DIR, `${version}.json`);
  if (!fs.existsSync(filePath)) {
    throw new Error(
      `No rules dataset found for scoring model version "${version}" (expected ${filePath}).`
    );
  }
  const raw = fs.readFileSync(filePath, 'utf8');
  const parsed = JSON.parse(raw);
  rulesCache.set(version, parsed);
  return parsed;
}

/** Clamp a number into [min, max]. */
function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

/** Round to 1 decimal place, deterministic. */
function round1(value) {
  return Math.round(value * 10) / 10;
}

/**
 * Resolves a profile's weight-band key (e.g. "130-180") from the
 * weightBands table in the rules dataset.
 */
function resolveWeightBand(rules, weightLb) {
  for (const band of rules.weightBands) {
    const aboveMin = band.minLb === undefined || weightLb >= band.minLb;
    const belowMax = band.maxLb === undefined || weightLb < band.maxLb;
    if (aboveMin && belowMax) return band.key;
  }
  // Fall back to the last band (highest) if nothing matched.
  return rules.weightBands[rules.weightBands.length - 1].key;
}

/**
 * Resolves the numeric firmness (1-10 scale) for a profile, accepting
 * either a pre-supplied numeric preference or a label looked up in
 * rules.firmnessLabelScale.
 */
function resolveProfileFirmness(rules, profile) {
  if (typeof profile.preferredFirmness === 'number') {
    return profile.preferredFirmness;
  }
  const label = profile.preferredFirmnessLabel;
  if (label && rules.firmnessLabelScale[label] !== undefined) {
    return rules.firmnessLabelScale[label];
  }
  return null; // Preference unknown; comfort-band matching still works off body weight + position.
}

/**
 * Resolves the [min, max] firmness comfort band for a sleep position +
 * weight band, with a safe fallback if the combination isn't in the table.
 */
function resolveComfortBand(rules, sleepPosition, weightBandKey) {
  const byPosition = rules.firmnessComfortBands[sleepPosition];
  if (byPosition && byPosition[weightBandKey]) return byPosition[weightBandKey];
  return [4, 7]; // Generic fallback band.
}

/**
 * Core v0.1 scoring implementation. Kept as a separate function (rather than
 * inlined in scoreEngine) so future versions can each own their own
 * implementation while sharing the same public scoreEngine() entry point.
 */
function scoreV0_1(rules, profile, mattress) {
  const adj = rules.adjustments;
  const thresholds = rules.thresholds;

  const weightBandKey = resolveWeightBand(rules, profile.weightLb);
  const comfortBand = resolveComfortBand(rules, profile.sleepPosition, weightBandKey);
  const [bandMin, bandMax] = comfortBand;

  const baseline =
    rules.mattressTypeBaselines[mattress.type] || rules.mattressTypeBaselines.default;

  const sub = { ...baseline }; // pressureRelief, support, heat, motion, edge, durability

  // --- Support & alignment: penalize distance outside the comfort band ---
  let distanceOutsideBand = 0;
  if (mattress.firmnessRating < bandMin) {
    distanceOutsideBand = bandMin - mattress.firmnessRating;
    sub.support -= distanceOutsideBand * adj.supportPenaltyPerFirmnessPoint;
  } else if (mattress.firmnessRating > bandMax) {
    distanceOutsideBand = mattress.firmnessRating - bandMax;
    sub.support -= distanceOutsideBand * adj.supportPenaltyPerFirmnessPoint;
  } else {
    sub.support += adj.supportBonusInBand;
  }

  // --- Pressure relief: softer-than-band helps, firmer-than-band hurts ---
  if (mattress.firmnessRating < bandMin) {
    sub.pressureRelief += adj.pressureReliefBonusWhenSofterThanBand;
  } else if (mattress.firmnessRating > bandMax) {
    const overBy = mattress.firmnessRating - bandMax;
    sub.pressureRelief -= overBy * adj.pressureReliefPenaltyPerFirmnessPoint;
  }

  // --- Heat & airflow ---
  if (mattress.hasCoolingCover) {
    sub.heat += adj.coolingCoverHeatBonus;
  } else if (mattress.type === 'foam') {
    sub.heat -= adj.noCoolingFoamHeatPenalty;
  }

  // --- Motion isolation ---
  const isLowIsolationType = thresholds.lowIsolationTypesForCoupleHigh.includes(mattress.type);
  if (profile.motionSensitivity === 'couple-high' && isLowIsolationType) {
    sub.motion -= adj.coupleHighMotionPenaltyLowIsolationTypes;
  }

  // --- Edge support ---
  if (mattress.edgeSupportReinforced) {
    sub.edge += adj.reinforcedEdgeBonus;
  }

  // --- Durability / sag risk ---
  const density = mattress.topFoamDensityLbFt3;
  if (density != null) {
    if (density < thresholds.durabilityMinFoamDensityLbFt3 && profile.weightLb >= thresholds.durabilityHighWeightLb) {
      sub.durability -= adj.lowDensityHighWeightDurabilityPenalty;
    } else if (density >= thresholds.durabilityMinFoamDensityLbFt3 + 0.5) {
      sub.durability += adj.highDensityDurabilityBonus;
    }
  }

  // Clamp + round all sub-scores to a 0-10 scale.
  for (const key of rules.categories) {
    sub[key] = round1(clamp(sub[key], 0, 10));
  }

  // Weighted overall score, 0-100.
  let weightedSum = 0;
  for (const key of rules.categories) {
    weightedSum += sub[key] * rules.weights[key];
  }
  const overallScore = Math.round(clamp(weightedSum, 0, 10) * 10);

  // --- Risk flags ---
  const riskFlags = [];
  const ruleByCode = Object.fromEntries(rules.riskFlagRules.map((r) => [r.code, r]));

  if (mattress.firmnessRating < bandMin || mattress.firmnessRating > bandMax) {
    const rule = ruleByCode.SUPPORT_THRESHOLD_MISMATCH;
    const direction = mattress.firmnessRating < bandMin ? 'softer' : 'firmer';
    riskFlags.push({
      code: rule.code,
      category: rule.category,
      rationale:
        `This mattress's firmness rating (${mattress.firmnessRating}/10) is ${direction} than the ` +
        `${bandMin}-${bandMax}/10 comfort band typical for a ${profile.sleepPosition} sleeper in the ` +
        `${weightBandKey} lb range.`,
      mitigation: rule.mitigation,
    });
  }

  if (profile.sleepTemperature === 'hot' && sub.heat <= thresholds.heatRetentionMaxHeatScore) {
    const rule = ruleByCode.HEAT_RETENTION_LIKELY;
    riskFlags.push({
      code: rule.code,
      category: rule.category,
      rationale:
        `Heat & airflow sub-score is ${sub.heat}/10 (at or below the ${thresholds.heatRetentionMaxHeatScore}/10 ` +
        `threshold), and this profile reports sleeping hot.`,
      mitigation: rule.mitigation,
    });
  }

  if (!mattress.edgeSupportReinforced && sub.edge < thresholds.edgeSupportMinScore) {
    const rule = ruleByCode.EDGE_SUPPORT_CONCERN;
    riskFlags.push({
      code: rule.code,
      category: rule.category,
      rationale:
        `No reinforced perimeter is specified, and the edge support sub-score is ${sub.edge}/10 ` +
        `(below the ${thresholds.edgeSupportMinScore}/10 threshold).`,
      mitigation: rule.mitigation,
    });
  }

  if (
    density != null &&
    density < thresholds.durabilityMinFoamDensityLbFt3 &&
    profile.weightLb >= thresholds.durabilityHighWeightLb
  ) {
    const rule = ruleByCode.DURABILITY_SAG_RISK;
    riskFlags.push({
      code: rule.code,
      category: rule.category,
      rationale:
        `Top foam density is ${density} lb/ft³ (below the ${thresholds.durabilityMinFoamDensityLbFt3} lb/ft³ ` +
        `threshold) for a sleeper at ${profile.weightLb} lb (at or above the ${thresholds.durabilityHighWeightLb} lb ` +
        `threshold), which raises long-term sag risk.`,
      mitigation: rule.mitigation,
    });
  }

  return {
    scoreModelVersion: rules.version,
    mattressId: mattress.id || null,
    overallScore,
    subScores: sub,
    weights: rules.weights,
    comfortBand: { min: bandMin, max: bandMax, weightBand: weightBandKey },
    riskFlags,
  };
}

/** Registry of implementations, keyed by version string. */
const VERSION_IMPLEMENTATIONS = {
  '0.1': scoreV0_1,
};

/**
 * Public entry point.
 * @param {string} version e.g. "0.1"
 * @param {object} profile Sleep Profile (see data/samples/sample-profile.json)
 * @param {object} mattress Mattress spec (see data/samples/sample-mattress.json)
 * @returns {object} { scoreModelVersion, mattressId, overallScore, subScores, weights, comfortBand, riskFlags }
 */
function scoreEngine(version, profile, mattress) {
  const impl = VERSION_IMPLEMENTATIONS[version];
  if (!impl) {
    throw new Error(
      `Unsupported scoring model version "${version}". Supported versions: ${Object.keys(
        VERSION_IMPLEMENTATIONS
      ).join(', ')}`
    );
  }
  const rules = loadRules(version);
  return impl(rules, profile, mattress);
}

module.exports = {
  scoreEngine,
  loadRules,
  // Exported for unit testing / reuse.
  resolveWeightBand,
  resolveComfortBand,
  resolveProfileFirmness,
};
