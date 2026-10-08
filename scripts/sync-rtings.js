#!/usr/bin/env node
/**
 * Human-run RTINGS sync (trigger 'manual', trigger_source 'cli').
 *
 * Runs the same pipeline as the cron/admin routes (react-version/lib/rtings/
 * syncPipeline.ts). Storage:
 *   - SUPABASE_URL + SUPABASE_SECRET_KEY set -> the rtings_* tables
 *   - otherwise -> the local file store (FileRtingsRepository):
 *       data/rtings/store.json                         normalized rows + run history
 *       data/rtings/raw/run-<id>.json                   raw actor items, never overwritten
 *       react-version/lib/data/rtings-evidence.json     published-only snapshot the site reads
 *
 * Calls Apify (costs credits). Needs APIFY_API_TOKEN in the environment; it
 * is sent only as an Authorization header and is never printed.
 *
 * Usage:
 *   node scripts/sync-rtings.js [--maxItems=50] [--search="query"] [--url="https://www.rtings.com/mattress/reviews/..."]
 *                               [--waitMinutes=15]
 *
 * Exit code 1 when the run failed or was refused, 0 otherwise (held,
 * partial, pending and new_candidate results are honest outcomes, printed
 * for a human to act on).
 */
const path = require('path');
const { requireAppModule } = require('./lib/app-modules');

const { runRtingsSync } = requireAppModule('lib/apify/rtingsSync');
const { FileRtingsRepository, SupabaseRtingsRepository } = requireAppModule('lib/rtings/repository');
const { isDbConfigured, getSupabaseClient } = requireAppModule('lib/db/supabaseClient');

const REPO_ROOT = path.join(__dirname, '..');

function parseArgs(argv) {
  const out = {};
  for (const arg of argv) {
    const match = arg.match(/^--([a-zA-Z]+)=(.*)$/);
    if (match) out[match[1]] = match[2];
  }
  return out;
}

function printSummary(summary) {
  const c = summary.counts;
  console.log(`RTINGS sync ${summary.status.toUpperCase()} (store: ${summary.store}, run #${summary.syncRunId ?? '-'})`);
  console.log(`  Actor:            ${summary.actorId}`);
  console.log(`  Apify run:        ${summary.apifyRunId ?? '-'}   dataset: ${summary.datasetId ?? '-'}`);
  console.log(`  Coverage:         ${summary.coverage ?? '-'}`);
  console.log(`  Received:         ${c.received}   valid: ${c.valid}   rejected: ${c.rejected}`);
  console.log(`  Created:          ${c.created}   updated: ${c.updated}   unchanged: ${c.unchanged}   failed: ${c.failed}`);
  console.log(`  Published:        ${c.published}   pending: ${c.pending}   new candidates: ${c.newCandidate}   source missing: ${c.sourceMissing}`);
  console.log(`  Apify usage:      ${summary.estimatedCostUsd == null ? 'not reported' : `$${summary.estimatedCostUsd}`}`);
  if (summary.safety.flags.length > 0) {
    console.log('  Safety gate:      HELD - nothing from this run was published');
    summary.safety.flags.forEach((f) => console.log(`    - ${f.code}: ${f.message}`));
  }
  if (summary.errors.length > 0) {
    console.log('  Errors:');
    summary.errors.forEach((e) => {
      const affected = e.affected.length ? ` (affected: ${e.affected.slice(0, 20).join(', ')}${e.affected.length > 20 ? ', ...' : ''})` : '';
      console.log(`    - [${e.code}] ${e.message}${affected}`);
    });
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const options = { trigger: 'manual', triggerSource: 'cli' };
  if (args.maxItems) options.maxItems = Number(args.maxItems);
  if (args.search) {
    options.mode = 'search';
    options.searchQuery = args.search;
  } else if (args.url) {
    options.mode = 'url';
    options.reviewUrl = args.url;
  }
  const waitMinutes = args.waitMinutes ? Number(args.waitMinutes) : 15;
  options.waitBudgetMs = (Number.isFinite(waitMinutes) && waitMinutes > 0 ? waitMinutes : 15) * 60000;

  options.repo = isDbConfigured() ? new SupabaseRtingsRepository(getSupabaseClient()) : new FileRtingsRepository({ rootDir: REPO_ROOT });

  const summary = await runRtingsSync(options);
  printSummary(summary);
  if (summary.store === 'file' && summary.syncRunId != null) {
    console.log('\nLocal file store: data/rtings/store.json, data/rtings/raw/, react-version/lib/data/rtings-evidence.json');
  }
  if (summary.status === 'failed') process.exit(1);
}

main().catch((err) => {
  console.error('RTINGS sync crashed unexpectedly:', err && err.message ? err.message : err);
  process.exit(1);
});
