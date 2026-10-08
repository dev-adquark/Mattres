#!/usr/bin/env node
/**
 * Catalog verification/freshness audit.
 * Uses the same required-field and lifetime-warranty rules as
 * react-version/lib/dataIntegrity.ts. Keep both implementations aligned.
 *
 * Usage: node scripts/verify-catalog-freshness.js
 * Exit code 1 when records need source verification or are stale.
 */
const path = require('path');
const catalog = require(path.join(__dirname, '..', 'react-version', 'lib', 'data', 'mattress-catalog.json'));
const { isRecordVerified, missingFields } = requireDataIntegrity();

function requireDataIntegrity() {
  const REQUIRED_FIELDS = ['brand', 'model', 'type', 'heightIn', 'trialDays', 'warrantyYears', 'firmnessRange', 'priceUsd'];
  function isPresent(v) {
    if (v === null || v === undefined) return false;
    if (typeof v === 'string' && v.trim() === '') return false;
    return true;
  }
  function warrantyComplete(entry) {
    return isPresent(entry.warrantyYears) || entry.warrantyLifetime === true;
  }
  function hasCompleteFields(entry) {
    return REQUIRED_FIELDS.every((field) =>
      field === 'warrantyYears' ? warrantyComplete(entry) : isPresent(entry[field])
    );
  }
  function isRecordVerified(entry) {
    return Boolean(entry && isPresent(entry.sourceUrl) && isPresent(entry.lastVerified) && hasCompleteFields(entry));
  }
  function missingFields(entry) {
    return REQUIRED_FIELDS.filter((field) =>
      field === 'warrantyYears' ? !warrantyComplete(entry) : !isPresent(entry[field])
    );
  }
  return { isRecordVerified, missingFields };
}

const STALE_AFTER_DAYS = 180;
const now = new Date();
const needsInitialVerification = [];
const stale = [];
const currentlyVerified = [];

for (const entry of catalog) {
  if (!isRecordVerified(entry)) {
    needsInitialVerification.push({ id: entry.id, brand: entry.brand, model: entry.model, missing: missingFields(entry) });
    continue;
  }
  const verifiedDate = new Date(entry.lastVerified);
  if (Number.isNaN(verifiedDate.getTime())) {
    needsInitialVerification.push({ id: entry.id, brand: entry.brand, model: entry.model, missing: ['valid lastVerified date'] });
    continue;
  }
  const ageDays = (now - verifiedDate) / 86400000;
  const report = { id: entry.id, brand: entry.brand, model: entry.model, ageDays: Math.round(ageDays) };
  if (ageDays > STALE_AFTER_DAYS) stale.push({ ...report, sourceUrl: entry.sourceUrl });
  else currentlyVerified.push(report);
}

console.log(`Catalog verification-freshness report — ${catalog.length} total entries, run at ${now.toISOString()}\n`);
console.log(`Currently verified and fresh (< ${STALE_AFTER_DAYS} days): ${currentlyVerified.length}`);
currentlyVerified.forEach((e) => console.log(`  - ${e.brand} ${e.model} (verified ${e.ageDays}d ago)`));
console.log(`\nStale — verified but past the ${STALE_AFTER_DAYS}-day freshness window: ${stale.length}`);
stale.forEach((e) => console.log(`  - ${e.brand} ${e.model} (last verified ${e.ageDays}d ago, source: ${e.sourceUrl})`));
console.log(`\nNeeds verification — incomplete required data or invalid source/date: ${needsInitialVerification.length}`);
needsInitialVerification.forEach((e) => console.log(`  - ${e.brand} ${e.model} (missing: ${e.missing.length ? e.missing.join(', ') : 'verification evidence'})`));
const needsAttention = stale.length + needsInitialVerification.length;
console.log(`\n${needsAttention} of ${catalog.length} entries need attention before they can honestly show as verified.`);
process.exit(needsAttention > 0 ? 1 : 0);
