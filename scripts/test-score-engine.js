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
    'PREFERRED_FIRMNESS_MISMATCH',
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

test('scoreEngine: result includes a modelVersion field matching the requested version', () => {
  const profile = require('../data/samples/sample-profile.json');
  const mattress = require('../data/samples/sample-mattress.json');
  const result = scoreEngine('0.1', profile, mattress);
  assert.strictEqual(result.modelVersion, '0.1');
  assert.strictEqual(result.scoreModelVersion, '0.1'); // backward-compat alias
});

test('scoreEngine: trace.categoryRulesUsed is non-empty and every entry is fully shaped', () => {
  const profile = require('../data/samples/sample-profile.json');
  const mattress = require('../data/samples/sample-mattress.json');
  const result = scoreEngine('0.1', profile, mattress);

  assert.ok(Array.isArray(result.trace.categoryRulesUsed));
  assert.ok(result.trace.categoryRulesUsed.length > 0);
  for (const entry of result.trace.categoryRulesUsed) {
    assert.ok(typeof entry.ruleId === 'string' && entry.ruleId.length > 0, 'categoryRulesUsed entry has a ruleId');
    assert.ok(typeof entry.description === 'string' && entry.description.length > 0, 'categoryRulesUsed entry has a description');
    assert.ok(typeof entry.delta === 'number', 'categoryRulesUsed entry has a numeric delta');
    assert.ok(typeof entry.note === 'string' && entry.note.length > 0, 'categoryRulesUsed entry has a note');
  }
  // The baseline rule always fires exactly once.
  const baselineEntries = result.trace.categoryRulesUsed.filter((e) => e.ruleId === 'BASELINE_BY_TYPE');
  assert.strictEqual(baselineEntries.length, 1);
});

test('scoreEngine: trace.riskRulesUsed evaluates all 5 risk rules, triggered or not', () => {
  const profile = require('../data/samples/sample-profile.json');
  const mattress = require('../data/samples/sample-mattress.json');
  const result = scoreEngine('0.1', profile, mattress);

  assert.ok(Array.isArray(result.trace.riskRulesUsed));
  assert.strictEqual(result.trace.riskRulesUsed.length, 5);

  const ruleIds = result.trace.riskRulesUsed.map((e) => e.ruleId).sort();
  assert.deepStrictEqual(ruleIds, [
    'DURABILITY_SAG_RISK',
    'EDGE_SUPPORT_CONCERN',
    'HEAT_RETENTION_LIKELY',
    'PREFERRED_FIRMNESS_MISMATCH',
    'SUPPORT_THRESHOLD_MISMATCH',
  ]);

  for (const entry of result.trace.riskRulesUsed) {
    assert.ok(typeof entry.triggered === 'boolean', `${entry.ruleId} has a boolean triggered flag`);
    assert.ok('thresholdId' in entry, `${entry.ruleId} has a thresholdId`);
    assert.ok('thresholdValue' in entry, `${entry.ruleId} has a thresholdValue`);
    assert.ok('evaluatedValue' in entry, `${entry.ruleId} has an evaluatedValue`);
  }

  // For the bundled poor-match sample, every rule should actually be triggered.
  assert.ok(result.trace.riskRulesUsed.every((e) => e.triggered === true));

  // Every triggered risk rule in the trace should correspond to an entry in riskFlags, and vice versa.
  const triggeredIds = result.trace.riskRulesUsed.filter((e) => e.triggered).map((e) => e.ruleId).sort();
  const flagCodes = result.riskFlags.map((f) => f.code).sort();
  assert.deepStrictEqual(triggeredIds, flagCodes);
});

test('scoreEngine: trace.riskRulesUsed records untriggered rules too (well-matched mattress)', () => {
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
  assert.strictEqual(result.riskFlags.length, 0);
  assert.strictEqual(result.trace.riskRulesUsed.length, 5);
  assert.ok(result.trace.riskRulesUsed.every((e) => e.triggered === false));
});

// ---------------------------------------------------------------------------
// v0.1 byte-identical regression + v0.2 (root copy of the engine)
// ---------------------------------------------------------------------------
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

test('scoreEngine v0.1: root engine output is byte-identical to the pre-v0.2 snapshot', () => {
  const snapshot = require('../react-version/lib/__fixtures__/scoreEngine-v0.1-snapshot.json');
  const mismatches = [];
  snapshot.profiles.forEach((profile, i) => {
    const outs = snapshot.inputs.map((m) => JSON.stringify(scoreEngine('0.1', profile, m)));
    const hash = crypto.createHash('sha256').update(outs.join('\n')).digest('hex').slice(0, 24);
    if (hash !== snapshot.hashes[i]) mismatches.push(i);
  });
  assert.deepStrictEqual(mismatches, []);
});

// src/scoreEngine.js stays plain JavaScript on purpose: it is the engine the
// root Node CLI tooling runs (score-demo, serve-demo-api, the trace API
// handler) under bare `node` with no TypeScript toolchain or bundler. The
// app's engine is react-version/lib/scoreEngine.ts. They used to be compared
// as source text; since the app copy is TypeScript, they are now compared
// output-for-output (same rules files, same JSON for every profile x input).
test('scoreEngine v0.1 + v0.2: rules identical and output byte-identical to the react-version TypeScript engine', () => {
  const read = (p) => fs.readFileSync(path.join(__dirname, '..', p), 'utf8');
  assert.strictEqual(read('data/rules/0.1.json'), read('react-version/lib/rules/0.1.json'));
  assert.strictEqual(read('data/rules/0.2.json'), read('react-version/lib/rules/0.2.json'));

  // The app engine resolves lib/rules from process.cwd() (the Next app root).
  const { requireAppModule, APP_ROOT } = require('./lib/app-modules');
  const previousCwd = process.cwd();
  process.chdir(APP_ROOT);
  let appEngine;
  try {
    appEngine = requireAppModule('lib/scoreEngine');
  } finally {
    process.chdir(previousCwd);
  }

  const snapshot = require('../react-version/lib/__fixtures__/scoreEngine-v0.1-snapshot.json');
  const v02Inputs = require('../react-version/lib/data/mattress-catalog.json').map((e) => ({
    id: e.id,
    type: e.type,
    firmnessRating: e.firmnessRange && typeof e.firmnessRange.min === 'number' && typeof e.firmnessRange.max === 'number'
      ? (e.firmnessRange.min + e.firmnessRange.max) / 2
      : null,
    coolingRatingOutOf10: e.coolingRatingOutOf10,
    motionIsolationRatingOutOf10: e.motionIsolationRatingOutOf10,
    edgeSupportRatingOutOf10: e.edgeSupportRatingOutOf10,
    durabilityRatingOutOf10: e.durabilityRatingOutOf10,
    topFoamDensityLbFt3: e.topFoamDensityLbFt3,
  }));
  const extras = [{}, { painFocus: 'shoulders', edgeImportance: 'high', motionSensitivity: 'couple-high' }, { painFocus: ['hip', 'lowerBack'], edgeImportance: 'low' }];
  let compared = 0;
  for (const profile of snapshot.profiles) {
    for (const m of snapshot.inputs) {
      assert.strictEqual(JSON.stringify(appEngine.scoreEngine('0.1', profile, m)), JSON.stringify(scoreEngine('0.1', profile, m)));
      compared += 1;
    }
    for (const extra of extras) {
      const p = { ...profile, ...extra };
      for (const m of v02Inputs) {
        assert.strictEqual(JSON.stringify(appEngine.scoreEngine('0.2', p, m)), JSON.stringify(scoreEngine('0.2', p, m)));
        compared += 1;
      }
    }
  }
  assert.ok(compared > 100000, `compared ${compared} outputs`);
});

test('scoreEngine v0.2: deterministic, weights sum to 1, provenance reported', () => {
  const profile = { sleepPosition: 'side', weightLb: 160, preferredFirmnessLabel: 'medium-soft', sleepTemperature: 'hot', motionSensitivity: 'couple-high', painFocus: 'shoulders', edgeImportance: 'high' };
  const mattress = { id: 'm', type: 'hybrid', firmnessRating: 4.5, coolingRatingOutOf10: 8, motionIsolationRatingOutOf10: null, edgeSupportRatingOutOf10: 7, durabilityRatingOutOf10: null };
  const a = scoreEngine('0.2', profile, mattress);
  assert.strictEqual(JSON.stringify(a), JSON.stringify(scoreEngine('0.2', profile, mattress)));
  assert.strictEqual(a.modelVersion, '0.2');
  const sum = Object.values(a.effectiveWeights).reduce((s, w) => s + w, 0);
  assert.ok(Math.abs(sum - 1) < 0.001, `weights sum ${sum}`);
  assert.deepStrictEqual(a.dimensionProvenance, { support: 'measured', pressureRelief: 'measured', heat: 'measured', motion: 'estimated', edge: 'measured', durability: 'estimated' });
  assert.ok(a.overallScore >= 0 && a.overallScore <= 100);
});

console.log(`\n${passed} test(s) passed.`);
