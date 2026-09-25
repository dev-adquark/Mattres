'use strict';

/**
 * The one place the app talks to the `mattresses` table. Every reader in
 * this project (matchLogic, mattress detail pages, admin status) goes
 * through here rather than querying Supabase directly, so the DB-vs-
 * JSON-fallback decision and the row<->entry shape mapping live in one
 * place.
 *
 * Row shape -> entry shape: the relational columns exist for
 * querying/indexing, but the full entry the rest of the app already
 * knows how to render lives in the `data` JSONB column. Reading a row
 * back out re-derives the entry as `{ ...row.data, id: row.id }` - the
 * JSONB blob is the source of truth for anything beyond what's indexed,
 * so a column and its mirrored JSONB value can never drift silently out
 * of sync from the read side.
 */

const fs = require('fs');
const path = require('path');
const { getSupabaseClient, isDbConfigured } = require('./supabaseClient');

// Same dual-cwd detection lib/apify/rtingsSync.js already uses (this
// module is loaded from both the Next app and standalone scripts).
function resolveReactVersionRoot() {
  const cwd = process.cwd();
  if (fs.existsSync(path.join(cwd, 'lib', 'data', 'mattress-catalog.json'))) return cwd;
  return path.join(cwd, 'react-version');
}
const JSON_FALLBACK_PATH = path.join(resolveReactVersionRoot(), 'lib', 'data', 'mattress-catalog.json');

function loadJsonFallback() {
  return JSON.parse(fs.readFileSync(JSON_FALLBACK_PATH, 'utf8'));
}

function rowToEntry(row) {
  return { ...row.data, id: row.id };
}

/**
 * Returns the full catalog. DB-first with a real fallback to the
 * git-committed JSON file when the database isn't configured or a query
 * fails - the app must keep working either way, the same
 * "APIFY_NOT_CONFIGURED but the app still runs" pattern already
 * established for the RTINGS pipeline.
 *
 * @returns {Promise<{entries: object[], source: 'database'|'json_fallback', error: string|null}>}
 */
async function getCatalog() {
  const client = getSupabaseClient();
  if (!client) {
    return { entries: loadJsonFallback(), source: 'json_fallback', error: isDbConfigured() ? null : 'DB_NOT_CONFIGURED' };
  }
  const { data, error } = await client.from('mattresses').select('*').order('id');
  if (error) {
    // A real DB error must never take the production site down - fall
    // back to the last-known-good committed JSON rather than serving an
    // empty catalog or a 500.
    return { entries: loadJsonFallback(), source: 'json_fallback', error: error.message };
  }
  return { entries: data.map(rowToEntry), source: 'database', error: null };
}

/** @returns {Promise<object|null>} */
async function getMattressById(id) {
  const client = getSupabaseClient();
  if (!client) {
    return loadJsonFallback().find((e) => e.id === id) || null;
  }
  const { data, error } = await client.from('mattresses').select('*').eq('id', id).maybeSingle();
  if (error || !data) {
    return loadJsonFallback().find((e) => e.id === id) || null;
  }
  return rowToEntry(data);
}

/**
 * Upserts one full catalog entry. Used by the migration/seed script and
 * by the RTINGS sync's auto-apply step. Always additive at the call
 * site's discretion - this function itself just writes whatever row is
 * given; callers (see lib/apify/rtingsSync.js) are responsible for only
 * ever merging new evidence into an existing entry's `data`, never
 * discarding verified fields.
 */
async function upsertMattress(entry) {
  const client = getSupabaseClient();
  if (!client) throw new Error('upsertMattress called but the database is not configured.');
  const row = {
    id: entry.id,
    brand: entry.brand,
    model: entry.model,
    type: entry.type,
    price_usd: entry.priceUsd ?? null,
    price_from_usd: entry.priceFromUsd ?? null,
    height_in: entry.heightIn ?? null,
    trial_days: entry.trialDays ?? null,
    warranty_years: entry.warrantyYears ?? null,
    warranty_lifetime: Boolean(entry.warrantyLifetime),
    source_url: entry.sourceUrl ?? null,
    source_name: entry.sourceName ?? null,
    last_verified: entry.lastVerified ?? null,
    verification_status: entry.verificationStatus ?? null,
    sponsored: Boolean(entry.sponsored),
    data: entry,
    updated_at: new Date().toISOString(),
  };
  const { error } = await client.from('mattresses').upsert(row, { onConflict: 'id' });
  if (error) throw new Error(`upsertMattress(${entry.id}) failed: ${error.message}`);
}

module.exports = { getCatalog, getMattressById, upsertMattress, loadJsonFallback, JSON_FALLBACK_PATH };
