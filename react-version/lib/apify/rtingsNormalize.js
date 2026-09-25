'use strict';

/**
 * Converts one raw RTINGS actor record into this project's canonical
 * shape. Built against the ACTUAL fields a real run returned (confirmed
 * 2026-09-25 via a live 5-item and 20-item test call), not the actor
 * doc's assumed schema - a real mattress record from this actor has no
 * "verdict", "summary", "pros", "cons", or numeric overall score field
 * at all, even when includeVerdict/includeSummaries are requested.
 * featuredTests[].score is present but always 0 (unused placeholder),
 * and recommendedFor is a plain tag list with no rating attached - so
 * neither is treated as a 0-10 dimension score here. The only field this
 * actor genuinely adds beyond what official manufacturer pages give is a
 * physical firmness measurement in Pa/mm, extracted from the
 * "Firmness Level" text (e.g. "Medium-Firm (54 Pa/mm)").
 *
 * Never invents a field the raw record doesn't actually have - every
 * unmapped/unparseable value is null.
 */

const RTINGS_URL_RE = /^https:\/\/www\.rtings\.com\//;

function isNonEmptyString(v) {
  return typeof v === 'string' && v.trim().length > 0;
}

/** Extracts a Pa/mm firmness number from text like "Medium-Firm (54 Pa/mm)". Returns null if not present/parseable. */
function extractFirmnessPaPerMm(firmnessLevelText) {
  if (!isNonEmptyString(firmnessLevelText)) return null;
  const match = firmnessLevelText.match(/([\d.]+)\s*Pa\/mm/i);
  if (!match) return null;
  const value = Number(match[1]);
  return Number.isFinite(value) ? value : null;
}

/** Extracts the qualitative label portion, e.g. "Medium-Firm" from "Medium-Firm (54 Pa/mm)". Null if absent. */
function extractFirmnessLabel(firmnessLevelText) {
  if (!isNonEmptyString(firmnessLevelText)) return null;
  const match = firmnessLevelText.match(/^([^(]+)/);
  return match ? match[1].trim() : null;
}

/** Maps RTINGS's "Mattress Type" text to this project's type vocabulary (foam/hybrid/innerspring/latex), or null if unrecognized - never guesses. */
function normalizeMattressType(rtingsTypeText) {
  if (!isNonEmptyString(rtingsTypeText)) return null;
  const t = rtingsTypeText.trim().toLowerCase();
  if (t === 'hybrid') return 'hybrid';
  if (t === 'foam') return 'foam';
  if (t === 'innerspring' || t === 'spring') return 'innerspring';
  if (t === 'latex') return 'latex';
  return null; // Not one of the four types this project scores - recorded as unrecognized, not guessed into one.
}

/**
 * Validates a single raw record has the minimum identity fields to be
 * usable at all. Returns a list of problems (empty = valid). This is
 * schema validation, not business-logic matching.
 */
function validateRawRecord(raw) {
  const problems = [];
  if (!raw || typeof raw !== 'object') return ['record is not an object'];
  if (!isNonEmptyString(raw.brand)) problems.push('missing brand');
  if (!isNonEmptyString(raw.name)) problems.push('missing name');
  if (!isNonEmptyString(raw.productId)) problems.push('missing productId');
  if (!isNonEmptyString(raw.reviewUrl) || !RTINGS_URL_RE.test(raw.reviewUrl)) {
    problems.push('reviewUrl missing or not a real https://www.rtings.com/ URL');
  }
  if (raw.publishedAt != null && Number.isNaN(new Date(raw.publishedAt).getTime())) {
    problems.push('publishedAt present but not a parseable date');
  }
  return problems;
}

/**
 * @param {object} raw - one raw dataset item from the RTINGS actor.
 * @returns {{ok:true, record:object}|{ok:false, problems:string[], raw:object}}
 */
function normalizeRtingsRecord(raw) {
  const problems = validateRawRecord(raw);
  if (problems.length > 0) {
    return { ok: false, problems, raw };
  }

  const testScores = raw.testScoresFlat && typeof raw.testScoresFlat === 'object' ? raw.testScoresFlat : {};
  const firmnessLevelText = isNonEmptyString(testScores['Firmness Level']) ? testScores['Firmness Level'] : null;
  const publishedAtIso = raw.publishedAt && !Number.isNaN(new Date(raw.publishedAt).getTime())
    ? new Date(raw.publishedAt).toISOString()
    : null;
  const scrapedAtIso = raw.scrapedAt && !Number.isNaN(new Date(raw.scrapedAt).getTime())
    ? new Date(raw.scrapedAt).toISOString()
    : new Date().toISOString();

  const record = {
    source: 'rtings',
    rtingsProductId: String(raw.productId),
    brand: raw.brand.trim(),
    model: raw.name.trim(),
    brandSlug: raw.brandSlug || null,
    modelSlug: raw.modelSlug || null,
    reviewUrl: raw.reviewUrl,
    productUrl: isNonEmptyString(raw.productUrl) ? raw.productUrl : raw.reviewUrl,
    mattressType: normalizeMattressType(testScores['Mattress Type']),
    bedInABox: testScores['Bed-In-A-Box'] === 'Yes' ? true : testScores['Bed-In-A-Box'] === 'No' ? false : null,
    firmnessLabel: extractFirmnessLabel(firmnessLevelText),
    firmnessPaPerMm: extractFirmnessPaPerMm(firmnessLevelText),
    comfortFoamMaterial: isNonEmptyString(testScores['Upper Comfort Foam @ Lumbar']) ? testScores['Upper Comfort Foam @ Lumbar'] : null,
    // Plain evidence tags, not a rating - RTINGS does not publish a 0-10
    // score for these in the fields this actor returns. Never converted
    // to a number.
    recommendedFor: Array.isArray(raw.recommendedFor) ? raw.recommendedFor.slice() : [],
    mainImageUrl: isNonEmptyString(raw.mainImageUrl) ? raw.mainImageUrl : null,
    publishedAt: publishedAtIso,
    scrapedAt: scrapedAtIso,
  };

  return { ok: true, record };
}

module.exports = { normalizeRtingsRecord, validateRawRecord, extractFirmnessPaPerMm, extractFirmnessLabel, normalizeMattressType };
