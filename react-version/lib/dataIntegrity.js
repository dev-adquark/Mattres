/**
 * What "verified" actually means for a catalog entry, and the guard
 * functions the rest of the system calls to enforce it - rather than
 * every component independently deciding what counts as trustworthy
 * data.
 *
 * A record is verified only if ALL of the following are true:
 *   1. It has a real sourceUrl (a specific manufacturer/retailer page,
 *      not a homepage or search results page).
 *   2. It has a real lastVerified date (an ISO date string, not null).
 *   3. Every field in REQUIRED_FIELDS is present and non-null.
 * A record missing any of these is unverified, full stop - there is no
 * partial-credit "mostly verified" state, because presenting a record
 * as trustworthy when even one required field is unconfirmed is exactly
 * the failure mode this module exists to prevent.
 */

export const REQUIRED_FIELDS = [
  'brand',
  'model',
  'type',
  'heightIn',
  'trialDays',
  'warrantyYears',
  'firmnessRange',
  'priceUsd',
];

function isPresent(value) {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string' && value.trim() === '') return false;
  return true;
}

/**
 * True only if every required field is present - independent of sourceUrl/lastVerified.
 * warrantyYears gets one specific exception: a mattress with a stated
 * lifetime warranty (warrantyLifetime: true) has COMPLETE warranty
 * information, it's just expressed as "lifetime" rather than a numeric
 * year count - extremely common in this industry (Saatva, Leesa, Purple,
 * Birch, PlushBeds, Bear all brand their warranty this way). Without this,
 * every real lifetime-warranty mattress would incorrectly read as
 * 'unknown' despite the warranty term being fully documented.
 */
export function hasCompleteFields(entry) {
  return REQUIRED_FIELDS.every((field) => {
    if (field === 'warrantyYears') return isPresent(entry.warrantyYears) || entry.warrantyLifetime === true;
    return isPresent(entry[field]);
  });
}

/**
 * The single source of truth for "is this record actually verified".
 * Every place in the app that shows a "verified" indicator must call
 * this rather than checking entry.verified directly, since a stray
 * `verified: true` with no sourceUrl/lastVerified would otherwise slip
 * through - this recomputes the real answer from the underlying facts
 * every time, rather than trusting a flag that could drift from them.
 */
export function isRecordVerified(entry) {
  if (!entry) return false;
  if (!isPresent(entry.sourceUrl)) return false;
  if (!isPresent(entry.lastVerified)) return false;
  if (!hasCompleteFields(entry)) return false;
  return true;
}

/**
 * Fields that ARE present but weren't required for verification (e.g.
 * coreMaterialNotes) still get surfaced as "unknown" in the UI rather
 * than silently omitted, per the standing rule: never infer or hide a
 * gap in the data.
 */
export function missingFields(entry) {
  return REQUIRED_FIELDS.filter((field) => {
    if (field === 'warrantyYears') return !(isPresent(entry.warrantyYears) || entry.warrantyLifetime === true);
    return !isPresent(entry[field]);
  });
}

/**
 * Production gate: filters a catalog down to entries that are safe to
 * show as algorithmic recommendations. An entry can still be scored (the
 * scoring math itself doesn't need sourceUrl/lastVerified to run), but
 * this is the function the matching pipeline calls before a result is
 * allowed to render as a "verified" recommendation. Currently returns
 * every entry as unverified-but-shown-labeled-as-such (see
 * lib/matchLogic.js) rather than hiding the whole catalog, since this
 * project has no real sourced data yet to replace it with - removing
 * every result outright would break Find Match/Compare entirely without
 * fixing the underlying data problem. Once real, sourced entries exist,
 * a stricter mode here (dropping unverified entries) is a one-line
 * change: `catalog.filter(isRecordVerified)`.
 */
export function auditCatalog(catalog) {
  const verified = catalog.filter(isRecordVerified);
  const unverified = catalog.filter((e) => !isRecordVerified(e));
  const byLevel = { verified: 0, partially_verified: 0, unverified: 0, unknown: 0 };
  catalog.forEach((e) => {
    byLevel[getVerificationLevel(e)] += 1;
  });
  return {
    total: catalog.length,
    verifiedCount: verified.length,
    unverifiedCount: unverified.length,
    unverifiedIds: unverified.map((e) => e.id),
    missingByEntry: Object.fromEntries(unverified.map((e) => [e.id, missingFields(e)])),
    byLevel,
  };
}

/**
 * The richer 4-state classification the UI needs (Verified / Partially
 * verified / Unverified / Unknown) - distinct from isRecordVerified()
 * above, which stays a strict boolean gate for "is this trustworthy
 * enough to ever be labeled verified" (used for production-safety
 * checks, not display nuance). Each state reflects a genuinely
 * different, checkable condition of the real data:
 *
 *   'unknown'            - the record itself has real gaps: one or more
 *                           REQUIRED_FIELDS is missing, independent of
 *                           any verification work.
 *   'verified'           - every required field present AND a real
 *                           sourceUrl AND a real lastVerified date.
 *   'partially_verified' - every required field present, and SOME real
 *                           verification evidence (a sourceUrl or a
 *                           lastVerified date, but not both).
 *   'unverified'         - every required field present, but NEITHER a
 *                           sourceUrl NOR a lastVerified date - complete
 *                           internal data never checked against a
 *                           source. The real, honest state of every
 *                           entry in this catalog today.
 */
export function getVerificationLevel(entry) {
  if (!entry) return 'unknown';
  if (missingFields(entry).length > 0) return 'unknown';

  const hasSource = isPresent(entry.sourceUrl);
  const hasDate = isPresent(entry.lastVerified);

  if (hasSource && hasDate) return 'verified';
  if (hasSource || hasDate) return 'partially_verified';
  return 'unverified';
}

export const VERIFICATION_LEVEL_LABEL = {
  verified: 'Verified',
  partially_verified: 'Partially verified',
  unverified: 'Unverified',
  unknown: 'Unknown',
};
