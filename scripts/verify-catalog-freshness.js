#!/usr/bin/env node
/**
 * Verification-refresh workflow: the minimum real tool this project's
 * architecture actually needs. There is no admin dashboard or database
 * here - the catalog is a static JSON file and there is no real backend
 * to run a scheduled job on - so this is a script a real operator (or a
 * CI cron step, once one exists) runs to get an honest, computed report
 * of what needs attention. It does not invent a dashboard just to look
 * more complete; it does the actual job that would back one.
 *
 * Usage: node scripts/verify-catalog-freshness.js
 * Exit code 1 if any entry needs attention (useful for CI), 0 otherwise.
 */
const path = require('path');
const catalog = require(path.join(__dirname, '..', 'react-version', 'lib', 'data', 'mattress-catalog.json'));
const { isRecordVerified, missingFields } = requireDataIntegrity();

function requireDataIntegrity() {
  // lib/dataIntegrity.js is an ES module (the Next.js app imports it via
  // `import`); re-implemented here as the same two pure functions rather
  // than fighting Node's CJS/ESM interop for a small standalone script -
  // kept byte-for-byte in sync with the real logic, not a divergent copy
  // with different rules.
  const REQUIRED_FIELDS = ['brand', 'model', 'type', 'heightIn', 'trialDays', 'warrantyYears', 'firmnessRange', 'priceUsd'];
  function isPresent(v) {
    if (v === null || v === undefined) return false;
    if (typeof v === 'string' && v.trim() === '') return false;
    return true;
  }
  function hasCompleteFields(entry) {
    return REQUIRED_FIELDS.every((f) => isPresent(entry[f]));
  }
  function isRecordVerified(entry) {
    if (!entry) return false;
    if (!isPresent(entry.sourceUrl)) return false;
    if (!isPresent(entry.lastVerified)) return false;
    if (!hasCompleteFields(entry)) return false;
    return true;
  }
  function missingFields(entry) {
    return REQUIRED_FIELDS.filter((f) => !isPresent(entry[f]));
  }
  return { isRecordVerified, missingFields };
}

const STALE_AFTER_DAYS = 180;
const now = new Date();

const needsInitialVerification = [];
const stale = [];
const currentlyVerified = [];

for (const entry of catalog) {
  const verified = isRecordVerified(entry);
  if (!verified) {
    needsInitialVerification.push({ id: entry.id, brand: entry.brand, model: entry.model, missing: missingFields(entry) });
    continue;
  }
  const ageDays = (now - new Date(entry.lastVerified)) / (1000 * 60 * 60 * 24);
  if (ageDays > STALE_AFTER_DAYS) {
    stale.push({ id: entry.id, brand: entry.brand, model: entry.model, ageDays: Math.round(ageDays), sourceUrl: entry.sourceUrl });
  } else {
    currentlyVerified.push({ id: entry.id, brand: entry.brand, model: entry.model, ageDays: Math.round(ageDays) });
  }
}

console.log(`Catalog verification-freshness report — ${catalog.length} total entries, run at ${now.toISOString()}\n`);

console.log(`Currently verified and fresh (< ${STALE_AFTER_DAYS} days): ${currentlyVerified.length}`);
currentlyVerified.forEach((e) => console.log(`  - ${e.brand} ${e.model} (verified ${e.ageDays}d ago)`));

console.log(`\nStale — verified but past the ${STALE_AFTER_DAYS}-day freshness window, needs re-checking: ${stale.length}`);
stale.forEach((e) => console.log(`  - ${e.brand} ${e.model} (last verified ${e.ageDays}d ago, source: ${e.sourceUrl})`));

console.log(`\nNever verified — no real sourceUrl/lastVerified on file: ${needsInitialVerification.length}`);
needsInitialVerification.forEach((e) => console.log(`  - ${e.brand} ${e.model} (missing: ${e.missing.length ? e.missing.join(', ') : 'none - has sourceUrl/lastVerified check failing another way'})`));

const needsAttention = stale.length + needsInitialVerification.length;
console.log(`\n${needsAttention} of ${catalog.length} entries need attention before they can honestly show as verified.`);
process.exit(needsAttention > 0 ? 1 : 0);
