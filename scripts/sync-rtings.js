#!/usr/bin/env node
/**
 * Human/CI-run RTINGS sync. Matches this project's existing pattern
 * (scripts/ingest-mattresses.js, scripts/verify-catalog-freshness.js):
 * there is no database and no live auto-publish here - this fetches real
 * RTINGS data, writes a git-committed raw snapshot, and stages
 * enrichment proposals for a human to review and apply deliberately. It
 * never touches lib/data/mattress-catalog.json directly.
 *
 * Usage:
 *   APIFY_API_TOKEN=... node scripts/sync-rtings.js [--maxItems=50] [--search="query"] [--url="https://www.rtings.com/..."]
 *
 * Exit code 1 on any hard failure (not configured, run failed), 0
 * otherwise - review_required/unmatched results are not failures, they
 * are the honest output of a real sync and are printed for a human to
 * act on.
 */
const path = require('path');
const { runRtingsSync } = require(path.join(__dirname, '..', 'react-version', 'lib', 'apify', 'rtingsSync'));

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
  const options = {};
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

  console.log(`RTINGS sync complete.`);
  console.log(`  Fetched:          ${result.fetched}`);
  console.log(`  Normalized:       ${result.normalized}`);
  console.log(`  Rejected:         ${result.rejected}`);
  if (result.rejectedReasons.length) {
    result.rejectedReasons.forEach((r) => console.log(`    - productId ${r.productId}: ${r.problems.join('; ')}`));
  }
  console.log(`  Matched (staged): ${result.matched}${result.proposalsFile ? ` -> ${result.proposalsFile}` : ''}`);
  console.log(`  Review required:  ${result.reviewRequired}`);
  result.reviewRequiredDetail.forEach((r) =>
    console.log(`    - ${r.rtingsBrand} ${r.rtingsModel} (${r.reason}; candidates: ${r.candidates.join(', ')})`)
  );
  console.log(`  Unmatched (new to RTINGS, not in catalog): ${result.unmatched}`);
  result.unmatchedDetail.forEach((u) => console.log(`    - ${u.rtingsBrand} ${u.rtingsModel}`));
  console.log(`  Raw snapshot:     ${result.rawSnapshotFile}`);
  console.log(
    `\nNothing was written to the production catalog. Review ${result.proposalsFile || '(no proposals this run)'} and apply changes to lib/data/mattress-catalog.json by hand.`
  );
}

main().catch((err) => {
  console.error('RTINGS sync crashed unexpectedly:', err);
  process.exit(1);
});
