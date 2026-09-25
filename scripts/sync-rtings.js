#!/usr/bin/env node
/**
 * Human/CI-run RTINGS sync. When the database is configured
 * (SUPABASE_URL + SUPABASE_SECRET_KEY), matched enrichment is
 * auto-applied to the real `mattresses` table (additive-only - see
 * lib/apify/rtingsSync.js's module doc comment). Otherwise it falls back
 * to staging proposals in a git-committed JSON file for manual review,
 * matching this project's pre-database pattern (scripts/ingest-mattresses.js,
 * scripts/verify-catalog-freshness.js).
 *
 * Usage:
 *   APIFY_API_TOKEN=... SUPABASE_URL=... SUPABASE_SECRET_KEY=... node scripts/sync-rtings.js [--maxItems=50] [--search="query"] [--url="https://www.rtings.com/..."]
 *
 * Exit code 1 on any hard failure (not configured, run already in
 * progress, run failed), 0 otherwise - review_required/unmatched
 * results are not failures, they are the honest output of a real sync
 * and are printed for a human to act on.
 */
const path = require('path');
const { runRtingsSync } = require(path.join(__dirname, '..', 'react-version', 'lib', 'apify', 'rtingsSync'));
const { isDbConfigured } = require(path.join(__dirname, '..', 'react-version', 'lib', 'db', 'supabaseClient'));

function parseArgs(argv) {
  const out = {};
  for (const arg of argv) {
    const match = arg.match(/^--([a-zA-Z]+)=(.*)$/);
    if (match) out[match[1]] = match[2];
  }
  return out;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const options = { triggerSource: 'cli' };
  if (args.maxItems) options.maxItems = Number(args.maxItems);
  if (args.search) {
    options.mode = 'search';
    options.searchQuery = args.search;
  } else if (args.url) {
    options.mode = 'url';
    options.reviewUrl = args.url;
  }

  const result = await runRtingsSync(options);

  if (!result.success) {
    console.error(`RTINGS sync failed: [${result.code}] ${result.message}`);
    process.exit(1);
  }

  console.log(`RTINGS sync complete (database: ${isDbConfigured() ? 'configured, auto-applied' : 'not configured, staged to file'}).`);
  console.log(`  Fetched:          ${result.fetched}`);
  console.log(`  Normalized:       ${result.normalized}`);
  console.log(`  Rejected:         ${result.rejected}`);
  if (result.rejectedReasons.length) {
    result.rejectedReasons.forEach((r) => console.log(`    - productId ${r.productId}: ${r.problems.join('; ')}`));
  }
  console.log(`  Matched:          ${result.matched}${isDbConfigured() ? ` (${result.applied} applied to the database)` : result.proposalsFile ? ` -> staged in ${result.proposalsFile}` : ''}`);
  console.log(`  Review required:  ${result.reviewRequired}${isDbConfigured() ? ' (persisted to rtings_review_required)' : ''}`);
  result.reviewRequiredDetail.forEach((r) =>
    console.log(`    - ${r.rtingsBrand} ${r.rtingsModel} (${r.reason}; candidates: ${r.candidates.join(', ')})`)
  );
  console.log(`  Unmatched (new to RTINGS, not yet researched/added): ${result.unmatched}`);
  result.unmatchedDetail.forEach((u) => console.log(`    - ${u.rtingsBrand} ${u.rtingsModel}`));
  console.log(`  Raw snapshot:     ${result.rawSnapshotFile}`);
  if (!isDbConfigured()) {
    console.log(
      `\nNo database configured - nothing was written to the production catalog. Review ${result.proposalsFile || '(no proposals this run)'} and apply changes by hand.`
    );
  }
}

main().catch((err) => {
  console.error('RTINGS sync crashed unexpectedly:', err);
  process.exit(1);
});
