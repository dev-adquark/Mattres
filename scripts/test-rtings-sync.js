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
const path = require('path');

const { buildRtingsInput, MAX_ITEMS_CAP } = require(path.join(__dirname, '..', 'react-version', 'lib', 'apify', 'apifyClient'));
const {
  normalizeRtingsRecord,
  extractFirmnessPaPerMm,
  extractFirmnessLabel,
  normalizeMattressType,
} = require(path.join(__dirname, '..', 'react-version', 'lib', 'apify', 'rtingsNormalize'));
const { matchRtingsRecordToCatalog } = require(path.join(__dirname, '..', 'react-version', 'lib', 'apify', 'rtingsIdentity'));
const { buildEnrichmentProposal } = require(path.join(__dirname, '..', 'react-version', 'lib', 'apify', 'rtingsSync'));

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

// --- fixtures, shaped exactly like the real actor's confirmed output ---
const RAW_BEAR_ELITE = {
  productId: '11111',
  name: 'Bear Elite Hybrid',
  brand: 'Bear',
  reviewUrl: 'https://www.rtings.com/mattress/reviews/bear/elite-hybrid',
  productUrl: 'https://www.rtings.com/mattress/reviews/bear/elite-hybrid',
  category: 'mattress',
  brandSlug: 'bear',
  modelSlug: 'elite-hybrid',
  publishedAt: '2026-01-30 12:38:27 -0500',
  mainImageUrl: 'https://i.rtings.com/assets/x.jpg',
  testScoresFlat: {
    'Mattress Type': 'Hybrid',
    'Bed-In-A-Box': 'Yes',
    'Firmness Level': 'Medium (46 Pa/mm)',
    'Upper Comfort Foam @ Lumbar': 'Copper-Infused Memory Foam',
  },
  recommendedFor: ['Side Sleeping', 'Pressure Relief'],
  recordType: 'review',
  scrapedAt: '2026-09-25T11:46:03.531688+00:00',
};

const RAW_HELIX_MIDNIGHT_LUXE = {
  productId: '22222',
  name: 'Helix Midnight Luxe 2025',
  brand: 'Helix',
  reviewUrl: 'https://www.rtings.com/mattress/reviews/helix/midnight-luxe-2025',
  category: 'mattress',
  brandSlug: 'helix',
  modelSlug: 'midnight-luxe-2025',
  publishedAt: '2026-01-19 15:20:30 -0500',
  testScoresFlat: { 'Mattress Type': 'Hybrid', 'Firmness Level': 'Medium (48 Pa/mm)' },
  recommendedFor: [],
  scrapedAt: '2026-09-25T11:46:03.644520+00:00',
};

const RAW_MISSING_BRAND = { productId: '33333', name: 'No Brand Mattress', reviewUrl: 'https://www.rtings.com/mattress/reviews/x/y' };
const RAW_BAD_URL = { productId: '44444', name: 'Bad URL Co Mattress', brand: 'Bad URL Co', reviewUrl: 'https://example.com/not-rtings' };

const FIXTURE_CATALOG = [
  { id: 'bear-elite-hybrid', brand: 'Bear', model: 'Elite Hybrid', type: 'hybrid', reviewSources: [] },
  { id: 'helix-midnight', brand: 'Helix', model: 'Midnight', type: 'hybrid', reviewSources: [] },
  { id: 'purple-mattress', brand: 'Purple', model: 'The Purple Mattress', type: 'foam', reviewSources: [] },
  { id: 'casper-snow', brand: 'Casper', model: 'Snow', type: 'hybrid', reviewSources: [{ sourceName: 'Sleep Foundation', sourceUrl: 'https://www.sleepfoundation.org/x' }] },
];

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
test('extractFirmnessPaPerMm parses a real "Firmness Level" string', () => {
  assert.strictEqual(extractFirmnessPaPerMm('Medium-Firm (54 Pa/mm)'), 54);
  assert.strictEqual(extractFirmnessPaPerMm('Soft (38.5 Pa/mm)'), 38.5);
});

test('extractFirmnessPaPerMm returns null rather than guessing when absent', () => {
  assert.strictEqual(extractFirmnessPaPerMm(null), null);
  assert.strictEqual(extractFirmnessPaPerMm('Medium'), null);
});

test('extractFirmnessLabel returns the qualitative portion only', () => {
  assert.strictEqual(extractFirmnessLabel('Medium-Firm (54 Pa/mm)'), 'Medium-Firm');
});

test('normalizeMattressType maps known RTINGS types, returns null for unrecognized', () => {
  assert.strictEqual(normalizeMattressType('Hybrid'), 'hybrid');
  assert.strictEqual(normalizeMattressType('Foam'), 'foam');
  assert.strictEqual(normalizeMattressType('Something Weird'), null);
});

// --- normalize: full record ---
test('normalizeRtingsRecord: valid record normalizes with no fabricated fields', () => {
  const result = normalizeRtingsRecord(RAW_BEAR_ELITE);
  assert.strictEqual(result.ok, true);
  assert.strictEqual(result.record.brand, 'Bear');
  assert.strictEqual(result.record.model, 'Bear Elite Hybrid');
  assert.strictEqual(result.record.firmnessPaPerMm, 46);
  assert.strictEqual(result.record.mattressType, 'hybrid');
  assert.strictEqual(result.record.bedInABox, true);
  assert.deepStrictEqual(result.record.recommendedFor, ['Side Sleeping', 'Pressure Relief']);
});

test('normalizeRtingsRecord: rejects a record missing brand rather than defaulting it', () => {
  const result = normalizeRtingsRecord(RAW_MISSING_BRAND);
  assert.strictEqual(result.ok, false);
  assert.ok(result.problems.some((p) => p.includes('brand')));
});

test('normalizeRtingsRecord: rejects a non-rtings.com reviewUrl', () => {
  const result = normalizeRtingsRecord(RAW_BAD_URL);
  assert.strictEqual(result.ok, false);
  assert.ok(result.problems.some((p) => p.includes('reviewUrl')));
});

// --- identity matching ---
test('matchRtingsRecordToCatalog: exact brand+model match', () => {
  const { record } = normalizeRtingsRecord(RAW_BEAR_ELITE);
  const match = matchRtingsRecordToCatalog(record, FIXTURE_CATALOG);
  assert.strictEqual(match.status, 'matched');
  assert.strictEqual(match.catalogId, 'bear-elite-hybrid');
});

test('matchRtingsRecordToCatalog: a real near-miss (Luxe/year variant) is flagged review_required, never auto-merged', () => {
  const { record } = normalizeRtingsRecord(RAW_HELIX_MIDNIGHT_LUXE);
  const match = matchRtingsRecordToCatalog(record, FIXTURE_CATALOG);
  assert.strictEqual(match.status, 'review_required');
  assert.deepStrictEqual(match.candidates, ['helix-midnight']);
});

test('matchRtingsRecordToCatalog: matches despite the catalog model including brand+filler words the RTINGS name does not', () => {
  const raw = { ...RAW_BEAR_ELITE, productId: '55555', brand: 'Purple', name: 'Purple Mattress', reviewUrl: 'https://www.rtings.com/mattress/reviews/purple/mattress' };
  const { record } = normalizeRtingsRecord(raw);
  const match = matchRtingsRecordToCatalog(record, FIXTURE_CATALOG);
  assert.strictEqual(match.status, 'matched');
  assert.strictEqual(match.catalogId, 'purple-mattress'); // catalog model is "The Purple Mattress" - filler words correctly stripped from both sides.
});

test('matchRtingsRecordToCatalog: no catalog entry for the brand at all -> unmatched', () => {
  const raw = { ...RAW_BEAR_ELITE, productId: '66666', brand: 'Nectar', name: 'Nectar Memory Foam', reviewUrl: 'https://www.rtings.com/mattress/reviews/nectar/memory-foam' };
  const { record } = normalizeRtingsRecord(raw);
  const match = matchRtingsRecordToCatalog(record, FIXTURE_CATALOG);
  assert.strictEqual(match.status, 'unmatched');
});

// --- enrichment proposal (never mutates the catalog entry object) ---
test('buildEnrichmentProposal: proposes adding RTINGS as a new review source when not already present', () => {
  const { record } = normalizeRtingsRecord(RAW_BEAR_ELITE);
  const entry = FIXTURE_CATALOG.find((e) => e.id === 'bear-elite-hybrid');
  const before = JSON.stringify(entry);
  const proposal = buildEnrichmentProposal(entry, record);
  assert.strictEqual(JSON.stringify(entry), before, 'must not mutate the catalog entry');
  assert.strictEqual(proposal.addReviewSource.sourceName, 'RTINGS');
  assert.strictEqual(proposal.addFirmnessPaPerMm, 46);
  assert.strictEqual(proposal.rtingsMattressTypeAgrees, true);
});

test('buildEnrichmentProposal: does not propose re-adding a source the catalog already has', () => {
  const raw = { ...RAW_BEAR_ELITE, productId: '77777', brand: 'Casper', name: 'Casper Snow', reviewUrl: 'https://www.sleepfoundation.org/x' };
  const { record } = normalizeRtingsRecord({ ...raw, reviewUrl: 'https://www.rtings.com/mattress/reviews/casper/snow' });
  const entry = FIXTURE_CATALOG.find((e) => e.id === 'casper-snow');
  const proposal = buildEnrichmentProposal(entry, { ...record, reviewUrl: 'https://www.sleepfoundation.org/x' });
  assert.strictEqual(proposal.addReviewSource, null);
});

console.log(`\n${passed} test(s) passed.`);
