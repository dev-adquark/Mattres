'use strict';

/**
 * Orchestrates one RTINGS sync cycle:
 *
 *   Apify actor run -> raw items -> git-committed raw snapshot
 *     -> normalize -> validate -> identity-match against the real catalog
 *     -> auto-apply matched enrichment to the database (additive only)
 *     -> persist review_required cases for later human resolution
 *
 * Auto-applying a matched proposal is safe because it is deliberately
 * additive-only: it can add a new reviewSources entry, a
 * firmnessPaPerMm figure, and rtingsRecommendedFor tags to an existing
 * catalog row, but it NEVER touches sourceUrl, lastVerified,
 * verificationStatus, or verifiedFields - those stay tied to the
 * original official-source verification the entry already had. A bad
 * or failed RTINGS run can at worst fail to add new corroborating
 * evidence; it can never overwrite or delete a verified field, and a
 * network/normalize failure aborts before any DB write happens for that
 * item, so partial/garbage data is never written.
 *
 * When the database isn't configured, this falls back to the original
 * git-committed-JSON-proposal behavior (see git history) so local
 * development and CI without DB access still exercise the real pipeline
 * end to end - just staged rather than auto-applied.
 *
 * Scope: this enriches EXISTING catalog entries with a second,
 * independent source, and (once identity-matched) is the SAME path used
 * to bring a genuinely new, already-researched-and-verified product
 * into the catalog - it does not itself go verify a brand-new product
 * against official sources; that research (WebFetch/WebSearch against
 * the manufacturer's own site) is a separate, human/agent-driven step,
 * same as how the original 24-mattress catalog was built.
 */

const fs = require('fs');
const path = require('path');

const { isApifyConfigured, runRtingsActorSync, buildRtingsInput } = require('./apifyClient');
const { normalizeRtingsRecord } = require('./rtingsNormalize');
const { matchRtingsRecordToCatalog } = require('./rtingsIdentity');
const { getSupabaseClient, isDbConfigured } = require('../db/supabaseClient');
const { getCatalog, upsertMattress } = require('../db/mattressRepo');

// This module is loaded from two different processes with two different
// working directories: the Next app (process.cwd() is react-version/,
// same convention lib/scoreEngine.js's RULES_DIR already relies on
// instead of __dirname, which Next's bundler does not guarantee resolves
// to this file's real on-disk location) and the standalone CLI script
// scripts/sync-rtings.js (process.cwd() is the repo root).
function resolveRoots() {
  const cwd = process.cwd();
  if (fs.existsSync(path.join(cwd, 'lib', 'data', 'mattress-catalog.json'))) {
    return { reactVersionRoot: cwd, repoRoot: path.join(cwd, '..') };
  }
  return { reactVersionRoot: path.join(cwd, 'react-version'), repoRoot: cwd };
}
const { repoRoot: REPO_ROOT } = resolveRoots();
const RAW_PATH = path.join(REPO_ROOT, 'data', 'raw', 'rtings-mattresses-raw.json');
const PROPOSALS_PATH = path.join(REPO_ROOT, 'data', 'raw', 'rtings-enrichment-proposals.json');

function loadJsonArrayIfExists(filePath) {
  if (!fs.existsSync(filePath)) return [];
  try {
    const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return []; // A corrupt raw file must not crash a sync - it just starts fresh for this run's merge.
  }
}

/** Idempotent merge keyed by rtingsProductId - a re-run updates existing raw records rather than duplicating them. */
function mergeRawSnapshot(existingRaw, newRawItems) {
  const byId = new Map(existingRaw.map((item) => [String(item.productId), item]));
  for (const item of newRawItems) {
    if (item && item.productId != null) byId.set(String(item.productId), item);
  }
  return Array.from(byId.values());
}

function writeJsonFile(filePath, data) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

/**
 * Builds the enrichment this matched RTINGS record would add to its
 * catalog entry, WITHOUT mutating the catalog. Only ever adds - never
 * overwrites an existing verified field.
 */
function buildEnrichmentProposal(catalogEntry, record) {
  const alreadyHasRtingsSource = (catalogEntry.reviewSources || []).some((s) => s.sourceUrl === record.reviewUrl);
  return {
    catalogId: catalogEntry.id,
    brand: catalogEntry.brand,
    model: catalogEntry.model,
    addReviewSource: alreadyHasRtingsSource ? null : { sourceName: 'RTINGS', sourceUrl: record.reviewUrl },
    addFirmnessPaPerMm: record.firmnessPaPerMm != null ? record.firmnessPaPerMm : null,
    addFirmnessLabelFromRtings: record.firmnessLabel,
    rtingsMattressTypeAgrees: record.mattressType != null ? record.mattressType === catalogEntry.type : null,
    rtingsRecommendedFor: record.recommendedFor,
    checkedAt: new Date().toISOString(),
  };
}

/** Applies a proposal to a copy of the entry - additive only, per the module doc comment. Never mutates the input. */
function applyProposalToEntry(entry, proposal) {
  const updated = { ...entry };
  if (proposal.addReviewSource) {
    updated.reviewSources = [...(entry.reviewSources || []), proposal.addReviewSource];
  }
  if (proposal.addFirmnessPaPerMm != null) updated.firmnessPaPerMm = proposal.addFirmnessPaPerMm;
  if (proposal.addFirmnessLabelFromRtings) updated.firmnessLabelFromRtings = proposal.addFirmnessLabelFromRtings;
  if (Array.isArray(proposal.rtingsRecommendedFor)) updated.rtingsRecommendedFor = proposal.rtingsRecommendedFor;
  updated.rtingsCrossCheckedAt = proposal.checkedAt;
  return updated;
}

/**
 * Real overlap protection. The actual lock is a Postgres partial unique
 * index (see supabase/migrations/0002_sync_run_lock.sql) enforcing "at
 * most one row with status='running'" - not a check-then-act read in
 * application code. A SELECT-then-INSERT approach has a genuine race
 * (confirmed by actually firing two concurrent sync requests locally
 * and watching both succeed instead of one being blocked): two
 * near-simultaneous calls can both see "no running row" before either
 * has inserted theirs. Relying on the INSERT itself to fail with a
 * unique-violation (Postgres error code 23505) when a second run is
 * already active is atomic and race-free.
 *
 * A run stuck >30 min (the process crashed without reaching
 * finishRunRecord's finally block) would otherwise hold the lock
 * forever, since the unique index doesn't expire on its own - so a
 * best-effort cleanup marks stale 'running' rows as 'failed' first.
 * That cleanup is not itself required to be atomic: at worst, two
 * concurrent stale-cleanups both mark the same dead row 'failed', which
 * is harmless.
 */
const STUCK_RUN_MINUTES = 30;

async function startRunRecord(client, triggerSource) {
  if (!client) return null;

  const staleThreshold = new Date(Date.now() - STUCK_RUN_MINUTES * 60000).toISOString();
  await client
    .from('rtings_sync_runs')
    .update({ status: 'failed', finished_at: new Date().toISOString(), error_message: `Run considered stuck (no completion after ${STUCK_RUN_MINUTES} minutes) and marked failed by a later sync attempt.` })
    .eq('status', 'running')
    .lt('started_at', staleThreshold);

  const { data, error } = await client.from('rtings_sync_runs').insert({ status: 'running', trigger_source: triggerSource }).select('id').single();
  if (error) {
    if (error.code === '23505') return { blocked: true }; // The unique index rejected a second concurrent 'running' row - this IS the lock working.
    return null; // Any other logging failure must not block the sync itself from running.
  }
  return { blocked: false, runRowId: data.id };
}

async function finishRunRecord(client, runRowId, status, counts, errorMessage) {
  if (!client || runRowId == null) return;
  await client
    .from('rtings_sync_runs')
    .update({ finished_at: new Date().toISOString(), status, error_message: errorMessage ?? null, ...counts })
    .eq('id', runRowId);
}

async function persistReviewRequired(client, reviewRequired) {
  if (!client || reviewRequired.length === 0) return;
  const rows = reviewRequired.map((r) => ({
    rtings_brand: r.rtingsBrand,
    rtings_model: r.rtingsModel,
    review_url: r.reviewUrl,
    candidates: r.candidates,
    reason: r.reason,
  }));
  // Upsert on (rtings_brand, rtings_model) - re-running a sync refreshes
  // an existing review_required row rather than duplicating it, and never
  // flips an already-resolved row back to unresolved (that column isn't
  // touched by this upsert's target columns).
  await client.from('rtings_review_required').upsert(rows, { onConflict: 'rtings_brand,rtings_model', ignoreDuplicates: false });
}

/**
 * Runs one full sync cycle. Returns the structured summary shape this
 * project's admin endpoint and CLI script both surface directly.
 *
 * @param {object} [options]
 * @param {string} [options.mode] 'byCategory' | 'search' | 'url'
 * @param {number} [options.maxItems]
 * @param {string} [options.searchQuery]
 * @param {string} [options.reviewUrl]
 * @param {string} [options.triggerSource] 'cron' | 'admin' | 'cli' - for run logging only.
 */
async function runRtingsSync(options = {}) {
  if (!isApifyConfigured()) {
    return {
      success: false,
      code: 'APIFY_NOT_CONFIGURED',
      message: 'APIFY_API_TOKEN is not set on this deployment. Set it as a server-side environment variable (never commit it) to enable RTINGS sync.',
      retryable: false,
    };
  }

  let input;
  try {
    input = buildRtingsInput(options);
  } catch (err) {
    return { success: false, code: 'INVALID_INPUT', message: err.message, retryable: false };
  }

  const client = getSupabaseClient();
  const runStart = await startRunRecord(client, options.triggerSource || 'unknown');
  if (runStart && runStart.blocked) {
    return {
      success: false,
      code: 'SYNC_ALREADY_RUNNING',
      message: `A RTINGS sync is already running (started within the last ${STUCK_RUN_MINUTES} minutes). Refusing to start a second overlapping run.`,
      retryable: true,
    };
  }
  const runRowId = runStart ? runStart.runRowId : null;

  const runResult = await runRtingsActorSync(input);
  if (!runResult.success) {
    await finishRunRecord(client, runRowId, 'failed', {}, runResult.message);
    return { success: false, ...runResult };
  }

  try {
    const rawItems = runResult.items;
    const existingRaw = loadJsonArrayIfExists(RAW_PATH);
    writeJsonFile(RAW_PATH, mergeRawSnapshot(existingRaw, rawItems));

    const { entries: catalog } = await getCatalog();

    let normalized = 0;
    let rejected = 0;
    const rejectedReasons = [];
    const matchedProposals = [];
    const reviewRequired = [];
    const unmatched = [];

    for (const raw of rawItems) {
      const result = normalizeRtingsRecord(raw);
      if (!result.ok) {
        rejected += 1;
        rejectedReasons.push({ productId: raw && raw.productId, problems: result.problems });
        continue;
      }
      normalized += 1;
      const record = result.record;
      const match = matchRtingsRecordToCatalog(record, catalog);

      if (match.status === 'matched') {
        const catalogEntry = catalog.find((e) => e.id === match.catalogId);
        matchedProposals.push({ proposal: buildEnrichmentProposal(catalogEntry, record), catalogEntry });
      } else if (match.status === 'review_required') {
        reviewRequired.push({ rtingsBrand: record.brand, rtingsModel: record.model, reviewUrl: record.reviewUrl, candidates: match.candidates, reason: match.reason });
      } else {
        unmatched.push({ rtingsBrand: record.brand, rtingsModel: record.model, reviewUrl: record.reviewUrl });
      }
    }

    // Auto-apply matched proposals to the database (additive-only - see
    // module doc comment) when the DB is configured; otherwise stage them
    // in the git-committed JSON proposals file for manual review, same as
    // before the DB existed.
    let applied = 0;
    if (client) {
      for (const { proposal, catalogEntry } of matchedProposals) {
        const updatedEntry = applyProposalToEntry(catalogEntry, proposal);
        await upsertMattress(updatedEntry);
        applied += 1;
      }
      await persistReviewRequired(client, reviewRequired);
    } else {
      const existingProposals = loadJsonArrayIfExists(PROPOSALS_PATH);
      const proposalsById = new Map(existingProposals.map((p) => [p.catalogId, p]));
      for (const { proposal } of matchedProposals) proposalsById.set(proposal.catalogId, proposal);
      if (matchedProposals.length > 0) writeJsonFile(PROPOSALS_PATH, Array.from(proposalsById.values()));
    }

    const counts = { fetched: rawItems.length, normalized, matched: matchedProposals.length, review_required: reviewRequired.length, unmatched: unmatched.length, errors: rejected };
    await finishRunRecord(client, runRowId, 'success', counts, null);

    return {
      success: true,
      runId: runRowId,
      fetched: rawItems.length,
      normalized,
      rejected,
      rejectedReasons,
      matched: matchedProposals.length,
      applied, // How many matched proposals were actually written to the DB this run (0 if DB not configured - they're staged in proposalsFile instead).
      reviewRequired: reviewRequired.length,
      reviewRequiredDetail: reviewRequired,
      unmatched: unmatched.length,
      unmatchedDetail: unmatched,
      published: applied,
      proposalsFile: !client && matchedProposals.length > 0 ? path.relative(REPO_ROOT, PROPOSALS_PATH) : null,
      rawSnapshotFile: path.relative(REPO_ROOT, RAW_PATH),
      errors: rejected,
    };
  } catch (err) {
    await finishRunRecord(client, runRowId, 'failed', {}, err.message);
    throw err;
  }
}

module.exports = { runRtingsSync, buildEnrichmentProposal, applyProposalToEntry, mergeRawSnapshot, RAW_PATH, PROPOSALS_PATH };
