#!/usr/bin/env node
'use strict';

/**
 * Minimal dependency-free tests for the RTINGS ingestion pipeline
 * (matches this project's existing test style - see
 * scripts/test-score-engine.js, scripts/test-ingest.js). Runs entirely
 * offline against fixture data - no real Apify call. The real,
 * network-hitting end-to-end path is exercised separately by actually
 * running `node scripts/sync-rtings.js` against the live actor.
 *
 * Usage: node scripts/test-rtings-sync.js
 */
const assert = require('assert');

const { requireAppModule } = require('./lib/app-modules');

const { buildRtingsInput, MAX_ITEMS_CAP } = requireAppModule('lib/apify/apifyClient');

let passed = 0;
function test(name, fn) {
  try {
    fn();
    passed += 1;
    console.log(`  ok  - ${name}`);
  } catch (err) {
    console.error(`FAIL - ${name}`);
    console.error(err);
    process.exitCode = 1;
  }
}

// --- buildRtingsInput ---
test('buildRtingsInput: byCategory mode defaults to mattress category', () => {
  const input = buildRtingsInput({ mode: 'byCategory', maxItems: 10 });
  assert.strictEqual(input.category, 'mattress');
  assert.strictEqual(input.maxItems, 10);
});

test('buildRtingsInput: maxItems is capped even if a caller requests more', () => {
  const input = buildRtingsInput({ mode: 'byCategory', maxItems: 999999 });
  assert.strictEqual(input.maxItems, MAX_ITEMS_CAP);
});

test('buildRtingsInput: search mode requires a non-empty searchQuery', () => {
  assert.throws(() => buildRtingsInput({ mode: 'search' }), /searchQuery/);
  const input = buildRtingsInput({ mode: 'search', searchQuery: 'purple' });
  assert.strictEqual(input.searchQuery, 'purple');
});

test('buildRtingsInput: url mode rejects a non-rtings.com URL', () => {
  assert.throws(() => buildRtingsInput({ mode: 'url', reviewUrl: 'https://example.com/x' }), /rtings\.com/);
  const input = buildRtingsInput({ mode: 'url', reviewUrl: 'https://www.rtings.com/mattress/reviews/x/y' });
  assert.strictEqual(input.mode, 'url');
});

// --- normalize: firmness extraction ---
console.log(`\n${passed} test(s) passed.`);
