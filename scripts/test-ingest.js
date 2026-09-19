#!/usr/bin/env node
'use strict';

/**
 * Minimal dependency-free tests for the ingestion pipeline.
 * Usage: node scripts/test-ingest.js
 *
 * Runs the real ingestion script first (so this also doubles as an
 * end-to-end smoke test), then asserts on the generated output files.
 */

const assert = require('assert');
const { execFileSync } = require('child_process');
const path = require('path');

const ROOT = path.join(__dirname, '..');

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

const REQUIRED_TAGS = [
  'sleepsHot',
  'greatEdgeSupport',
  'tooFirm',
  'offGassing',
  'motionIsolationGood',
  'sagsAfterTime',
];

execFileSync('node', ['scripts/ingest-mattresses.js'], { cwd: ROOT });

// Fresh require each run (ingestion just rewrote these files).
delete require.cache[require.resolve('../data/mattress-catalog.json')];
delete require.cache[require.resolve('../data/review-tags.json')];
const catalog = require('../data/mattress-catalog.json');
const reviewTags = require('../data/review-tags.json');

test('catalog has at least 10 mattresses', () => {
  assert.ok(catalog.mattresses.length >= 10, `expected >=10, got ${catalog.mattresses.length}`);
  assert.strictEqual(catalog.mattressCount, catalog.mattresses.length);
});

test('every mattress has the required normalized fields', () => {
  const requiredFields = [
    'id', 'brand', 'model', 'type', 'retailPartners',
    'height', 'trialDays', 'warrantyYears', 'warrantyLifetime',
    'firmnessRange', 'sourceConfidence', 'dataQualityNotes',
  ];
  for (const m of catalog.mattresses) {
    for (const field of requiredFields) {
      assert.ok(field in m, `mattress "${m.id}" missing field "${field}"`);
    }
    assert.ok(['foam', 'hybrid', 'innerspring'].includes(m.type), `mattress "${m.id}" has invalid type "${m.type}"`);
    assert.ok(m.retailPartners.length >= 1, `mattress "${m.id}" has no retail partners`);
    assert.ok(typeof m.height.inches === 'number' && m.height.inches > 0, `mattress "${m.id}" has invalid height`);
  }
});

test('all three canonical types are represented', () => {
  const types = new Set(catalog.mattresses.map((m) => m.type));
  assert.ok(types.has('foam'), 'no foam mattress in catalog');
  assert.ok(types.has('hybrid'), 'no hybrid mattress in catalog');
  assert.ok(types.has('innerspring'), 'no innerspring mattress in catalog');
});

test('cm height was converted, not left as-is', () => {
  const drift = catalog.mattresses.find((m) => m.model === 'Drift Plush Foam');
  assert.ok(drift, 'Drift Plush Foam not found in catalog');
  assert.ok(Math.abs(drift.height.inches - 11.8) < 0.01, `expected ~11.8in, got ${drift.height.inches}`);
  assert.ok(drift.dataQualityNotes.some((n) => n.includes('cm')), 'expected a data quality note about cm conversion');
});

test('missing firmness falls back to null and is recorded in dataQualityNotes', () => {
  const anchor = catalog.mattresses.find((m) => m.model === 'Anchor Hybrid Support');
  assert.ok(anchor, 'Anchor Hybrid Support not found in catalog');
  assert.strictEqual(anchor.firmnessRange, null);
  assert.strictEqual(anchor.sourceConfidence, 'medium');
  assert.ok(anchor.dataQualityNotes.length > 0);
});

test('every mattress has a review-tags entry (possibly empty)', () => {
  for (const m of catalog.mattresses) {
    assert.ok(
      m.id in reviewTags.reviewHighlightsByMattress,
      `mattress "${m.id}" has no entry in reviewHighlightsByMattress`
    );
  }
});

test('all 6 required controlled-vocabulary tags are used at least once', () => {
  const usedTags = new Set();
  Object.values(reviewTags.reviewHighlightsByMattress).forEach((highlights) =>
    highlights.forEach((h) => usedTags.add(h.tag))
  );
  for (const tag of REQUIRED_TAGS) {
    assert.ok(usedTags.has(tag), `required tag "${tag}" was never used in any review highlight`);
  }
});

test('every review highlight item has tag, confidence, matchCount, and snippet', () => {
  for (const [mattressId, highlights] of Object.entries(reviewTags.reviewHighlightsByMattress)) {
    for (const h of highlights) {
      assert.ok(h.tag, `highlight in "${mattressId}" missing tag`);
      assert.ok(['high', 'medium', 'low'].includes(h.confidence), `highlight "${h.tag}" in "${mattressId}" has invalid confidence`);
      assert.ok(typeof h.matchCount === 'number' && h.matchCount >= 1, `highlight "${h.tag}" in "${mattressId}" has invalid matchCount`);
      assert.ok(typeof h.snippet === 'string' && h.snippet.length > 0, `highlight "${h.tag}" in "${mattressId}" missing snippet`);
    }
  }
});

test('ingestion is deterministic across repeated runs', () => {
  const before = JSON.stringify(catalog) + JSON.stringify(reviewTags);
  execFileSync('node', ['scripts/ingest-mattresses.js'], { cwd: ROOT });
  delete require.cache[require.resolve('../data/mattress-catalog.json')];
  delete require.cache[require.resolve('../data/review-tags.json')];
  const after = JSON.stringify(require('../data/mattress-catalog.json')) + JSON.stringify(require('../data/review-tags.json'));
  assert.strictEqual(before, after);
});

console.log(`\n${passed} test(s) passed.`);
