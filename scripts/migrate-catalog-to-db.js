#!/usr/bin/env node
/**
 * One-time (and safely re-runnable - every write is an upsert keyed by
 * id) load of the git-committed lib/data/mattress-catalog.json snapshot
 * into the real `mattresses` table. Run this once after
 * scripts/apply-db-migration.js has created the schema.
 *
 * This does not delete anything: it only ever upserts the entries the
 * JSON file currently has. A row already in the database for an id not
 * present in the JSON file is left alone - this script is a seed/sync
 * tool, not a destructive mirror.
 *
 * Usage: SUPABASE_URL=... SUPABASE_SECRET_KEY=... node scripts/migrate-catalog-to-db.js
 */
const path = require('path');
const { upsertMattress, loadJsonFallback, JSON_FALLBACK_PATH } = require(
  path.join(__dirname, '..', 'react-version', 'lib', 'db', 'mattressRepo')
);
const { isDbConfigured, getSupabaseClient } = require(path.join(__dirname, '..', 'react-version', 'lib', 'db', 'supabaseClient'));

async function main() {
  if (!isDbConfigured()) {
    console.error('SUPABASE_URL / SUPABASE_SECRET_KEY are not set. Nothing to migrate to.');
    process.exit(1);
  }

  const entries = loadJsonFallback();
  console.log(`Loaded ${entries.length} entries from ${JSON_FALLBACK_PATH}`);

  let succeeded = 0;
  const failures = [];
  for (const entry of entries) {
    try {
      await upsertMattress(entry);
      succeeded += 1;
    } catch (err) {
      failures.push({ id: entry.id, error: err.message });
    }
  }

  console.log(`Upserted ${succeeded} of ${entries.length} entries.`);
  if (failures.length) {
    console.error(`${failures.length} failed:`);
    failures.forEach((f) => console.error(`  - ${f.id}: ${f.error}`));
  }

  const client = getSupabaseClient();
  const { count } = await client.from('mattresses').select('*', { count: 'exact', head: true });
  console.log(`Real row count in the mattresses table now: ${count}`);

  process.exit(failures.length > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('Migration crashed unexpectedly:', err);
  process.exit(1);
});
