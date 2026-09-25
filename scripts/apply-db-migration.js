#!/usr/bin/env node
/**
 * One-time (and safely re-runnable - every statement is CREATE ... IF
 * NOT EXISTS) DDL migration runner. Applies every .sql file in
 * supabase/migrations/ in filename order (0001_..., 0002_..., etc.), so
 * adding a new migration file is all a future change needs - this
 * script doesn't need editing to pick it up.
 *
 * Uses a direct Postgres connection (DIRECT_URL, session-mode pooler)
 * because Supabase's REST API (PostgREST) cannot execute arbitrary DDL -
 * only the runtime app code uses the Supabase JS client over REST; this
 * script is the one place `pg` is used, and only for schema setup, never
 * for serving requests.
 *
 * Usage: DIRECT_URL="postgresql://...supabase.com:5432/postgres" node scripts/apply-db-migration.js
 */
const fs = require('fs');
const path = require('path');
const { Client } = require(path.join(__dirname, '..', 'react-version', 'node_modules', 'pg'));

async function main() {
  const connectionString = process.env.DIRECT_URL;
  if (!connectionString) {
    console.error('DIRECT_URL is not set. Pass the Supabase session-mode pooler connection string as an env var.');
    process.exit(1);
  }
  const migrationsDir = path.join(__dirname, '..', 'supabase', 'migrations');
  const files = fs.readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort();

  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
  await client.connect();
  try {
    for (const file of files) {
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
      await client.query(sql);
      console.log(`Applied: ${file}`);
    }
    const { rows } = await client.query(
      `select table_name from information_schema.tables where table_schema = 'public' and table_name in ('mattresses','rtings_sync_runs','rtings_review_required') order by table_name`
    );
    console.log('Tables now present:', rows.map((r) => r.table_name).join(', '));
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error('Migration failed:', err.message);
  process.exit(1);
});
