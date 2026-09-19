#!/usr/bin/env node
'use strict';

/**
 * Minimal dependency-free test runner for the scoring engine skeleton.
 * Usage: node scripts/test-score-engine.js
 */

const assert = require('assert');
const { scoreEngine, resolveWeightBand, loadRules } = require('../src/scoreEngine');

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

const rules = loadRules('0.1');

test('resolveWeightBand: lower boundary is inclusive, upper is exclusive', () => {
  assert.strictEqual(resolveWeightBand(rules, 129), 'under-130');
  assert.strictEqual(resolveWeightBand(rules, 130), '130-180');
  assert.strictEqual(resolveWeightBand(rules, 179.9), '130-180');
  assert.strictEqual(resolveWeightBand(rules, 180), '180-230');
  assert.strictEqual(resolveWeightBand(rules, 231), 'over-230');
});

test('scoreEngine: unsupported version throws', () => {
  assert.throws(() => scoreEngine('9.9', {}, {}), /Unsupported scoring model version/);
});

test('scoreEngine: bundled poor-match sample triggers all 4 required risk flags', () => {
  const profile = require('../data/samples/sample-profile.json');
  const mattress = require('../data/samples/sample-mattress.json');
  const result = scoreEngine('0.1', profile, mattress);

  const codes = result.riskFlags.map((f) => f.code).sort();
  assert.deepStrictEqual(codes, [
    'DURABILITY_SAG_RISK',
    'EDGE_SUPPORT_CONCERN',
    'HEAT_RETENTION_LIKELY',
    'SUPPORT_THRESHOLD_MISMATCH',
  ]);

  for (const flag of result.riskFlags) {
    assert.ok(flag.code, 'flag has a code');
    assert.ok(flag.rationale && flag.rationale.length > 0, 'flag has a rationale');
    assert.ok(flag.mitigation && flag.mitigation.length > 0, 'flag has a mitigation');
  }

  for (const key of rules.categories) {
    assert.ok(typeof result.subScores[key] === 'number', `subScore.${key} is a number`);
    assert.ok(result.subScores[key] >= 0 && result.subScores[key] <= 10, `subScore.${key} in [0,10]`);
  }

  assert.ok(result.overallScore >= 0 && result.overallScore <= 100, 'overallScore in [0,100]');
});

test('scoreEngine: a well-matched mattress produces zero risk flags', () => {
  const profile = {
    sleepPosition: 'side',
    weightLb: 210,
    preferredFirmnessLabel: 'medium-firm',
    sleepTemperature: 'neutral',
    motionSensitivity: 'single',
  };
  const mattress = {
    id: 'test-good-match',
    type: 'hybrid',
    firmnessRating: 6.5,
    hasCoolingCover: true,
    edgeSupportReinforced: true,
    topFoamDensityLbFt3: 2.5,
  };
  const result = scoreEngine('0.1', profile, mattress);
  assert.deepStrictEqual(result.riskFlags, []);
});

test('scoreEngine: is deterministic across repeated calls', () => {
  const profile = require('../data/samples/sample-profile.json');
  const mattress = require('../data/samples/sample-mattress.json');
  const a = JSON.stringify(scoreEngine('0.1', profile, mattress));
  const b = JSON.stringify(scoreEngine('0.1', profile, mattress));
  assert.strictEqual(a, b);
});

console.log(`\n${passed} test(s) passed.`);
