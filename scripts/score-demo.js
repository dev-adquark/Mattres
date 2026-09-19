#!/usr/bin/env node
'use strict';

/**
 * Runnable demo of the Match Scoring Engine.
 *
 * Usage:
 *   node scripts/score-demo.js
 *   node scripts/score-demo.js --version 0.1 --profile path/to/profile.json --mattress path/to/mattress.json
 *
 * With no flags, scores the bundled sample profile/mattress in data/samples/,
 * which is deliberately a poor match on purpose so all four risk flag rules
 * fire in one demo run.
 */

const fs = require('fs');
const path = require('path');
const { scoreEngine } = require('../src/scoreEngine');

function parseArgs(argv) {
  const args = { version: '0.1' };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--version') args.version = argv[++i];
    else if (arg === '--profile') args.profilePath = argv[++i];
    else if (arg === '--mattress') args.mattressPath = argv[++i];
  }
  return args;
}

function loadJson(relativeOrAbsolutePath, fallbackRelativeToRepoRoot) {
  const resolved = relativeOrAbsolutePath
    ? path.resolve(process.cwd(), relativeOrAbsolutePath)
    : path.join(__dirname, '..', fallbackRelativeToRepoRoot);
  const raw = fs.readFileSync(resolved, 'utf8');
  return JSON.parse(raw);
}

function main() {
  const args = parseArgs(process.argv.slice(2));

  const profile = loadJson(args.profilePath, 'data/samples/sample-profile.json');
  const mattress = loadJson(args.mattressPath, 'data/samples/sample-mattress.json');

  const result = scoreEngine(args.version, profile, mattress);

  // Deterministic, pretty-printed JSON to stdout.
  process.stdout.write(JSON.stringify(result, null, 2) + '\n');
}

main();
