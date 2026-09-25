'use strict';

/**
 * Orchestrates one RTINGS sync cycle:
 *
 *   Apify actor run -> raw items -> git-committed raw snapshot
 *     -> normalize -> validate -> identity-match against the real catalog
 *     -> staged enrichment proposals (never auto-applied)
 *
 * This project has no database and Vercel's serverless functions have an
 * ephemeral filesystem - a write from a running function does not
 * persist across requests or deploys. So "publishing" here cannot mean a
 * live auto-write to the production catalog the way a traditional
 * DB-backed pipeline would; that would either silently no-op in
 * production or (worse) create the appearance of a working auto-publish
 * pipeline that doesn't actually persist anything. Matching this
 * project's existing pattern (the catalog is a git-committed JSON file,
 * refreshed by a human/CI running a script - see
 * scripts/ingest-mattresses.js and scripts/verify-catalog-freshness.js),
 * this pipeline is RAW -> NORMALIZED -> VALIDATED -> MATCHED -> STAGED
 * PROPOSAL. A human (or a CI step with write access to open a PR) reviews
 * data/raw/rtings-enrichment-proposals.json and applies it deliberately;
 * nothing here overwrites lib/data/mattress-catalog.json directly.
 *
 * Scope: this enriches EXISTING real catalog entries with a second,
 * independent source (RTINGS) - it does not add brand-new mattresses
 * RTINGS reviews that aren't already in the catalog. Adding a new
 * product requires the same official-source verification the existing
 * 24 entries went through, which is a separate, larger task.
 */

const fs = require('fs');
const path = require('path');

const { isApifyConfigured, runRtingsActorSync, buildRtingsInput } = require('./apifyClient');
const { normalizeRtingsRecord } = require('./rtingsNormalize');
const { matchRtingsRecordToCatalog } = require('./rtingsIdentity');

// This module is loaded from two different processes with two different
// working directories: the Next app (process.cwd() is react-version/,
// same convention lib/scoreEngine.js's RULES_DIR already relies on
// instead of __dirname, which Next's bundler does not guarantee resolves
// to this file's real on-disk location) and the standalone CLI script
// scripts/sync-rtings.js (process.cwd() is the repo root). Detecting
// which one we're in - rather than assuming a fixed cwd - keeps this
// correct under both instead of silently resolving to the wrong
// directory in one of them.
function resolveRoots() {
  const cwd = process.cwd();
  if (fs.existsSync(path.join(cwd, 'lib', 'data', 'mattress-catalog.json'))) {
    return { reactVersionRoot: cwd, repoRoot: path.join(cwd, '..') };
  }
  return { reactVersionRoot: path.join(cwd, 'react-version'), repoRoot: cwd };
}
const { reactVersionRoot, repoRoot: REPO_ROOT } = resolveRoots();
const RAW_PATH = path.join(REPO_ROOT, 'data', 'raw', 'rtings-mattresses-raw.json');
const PROPOSALS_PATH = path.join(REPO_ROOT, 'data', 'raw', 'rtings-enrichment-proposals.json');
const CATALOG_PATH = path.join(reactVersionRoot, 'lib', 'data', 'mattress-catalog.json');

function loadJsonArrayIfExists(filePath) {
  if (!fs.existsSync(filePath)) return [];
  try {
    const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return []; // A corrupt raw file must not crash a sync - it just starts fresh for this run's merge.
  }
}

/**
 * Merges new raw items into the existing raw snapshot, keyed by
 * rtingsProductId, so re-running a sync updates existing records in
 * place rather than duplicating them (idempotent) and never silently
 * drops a product just because a later run's maxItems window missed it.
 */
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
 * overwrites an existing verified field, and never touches
 * sourceUrl/lastVerified/verificationStatus (those stay tied to the
 * original official-source verification, since RTINGS is corroborating
 * evidence, not a replacement source).
 */
function buildEnrichmentProposal(catalogEntry, record) {
  const alreadyHasRtingsSource = (catalogEntry.reviewSources || []).some((s) => s.sourceUrl === record.reviewUrl);
  const proposal = {
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
  return proposal;
}

/**
 * Runs one full sync cycle. Returns the structured summary shape this
 * project's admin endpoint and CLI script both surface directly - never
 * a bare {success:true}.
 *
 * @param {object} [options]
 * @param {string} [options.mode] 'byCategory' | 'search' | 'url'
 * @param {number} [options.maxItems]
 * @param {string} [options.searchQuery]
 * @param {string} [options.reviewUrl]
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

  const runResult = await runRtingsActorSync(input);
  if (!runResult.success) {
    return { success: false, ...runResult };
  }

  const rawItems = runResult.items;
  const existingRaw = loadJsonArrayIfExists(RAW_PATH);
  const mergedRaw = mergeRawSnapshot(existingRaw, rawItems);
  writeJsonFile(RAW_PATH, mergedRaw);

  const catalog = loadJsonArrayIfExists(CATALOG_PATH);

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
      matchedProposals.push(buildEnrichmentProposal(catalogEntry, record));
    } else if (match.status === 'review_required') {
      reviewRequired.push({ rtingsBrand: record.brand, rtingsModel: record.model, reviewUrl: record.reviewUrl, candidates: match.candidates, reason: match.reason });
    } else {
      unmatched.push({ rtingsBrand: record.brand, rtingsModel: record.model, reviewUrl: record.reviewUrl });
    }
  }

  // Merge new proposals into the existing proposals file the same
  // idempotent way as the raw snapshot, keyed by catalogId, so re-running
  // a sync refreshes a proposal rather than duplicating it.
  const existingProposals = loadJsonArrayIfExists(PROPOSALS_PATH);
  const proposalsById = new Map(existingProposals.map((p) => [p.catalogId, p]));
  for (const p of matchedProposals) proposalsById.set(p.catalogId, p);
  const mergedProposals = Array.from(proposalsById.values());
  if (matchedProposals.length > 0) writeJsonFile(PROPOSALS_PATH, mergedProposals);

  return {
    success: true,
    runId: null, // run-sync-get-dataset-items does not return a separate run id to poll - the call itself already waited for completion.
    fetched: rawItems.length,
    normalized,
    rejected,
    rejectedReasons,
    matched: matchedProposals.length,
    reviewRequired: reviewRequired.length,
    reviewRequiredDetail: reviewRequired,
    unmatched: unmatched.length,
    unmatchedDetail: unmatched,
    published: 0, // Nothing is auto-published - see the module doc comment above.
    proposalsFile: matchedProposals.length > 0 ? path.relative(REPO_ROOT, PROPOSALS_PATH) : null,
    rawSnapshotFile: path.relative(REPO_ROOT, RAW_PATH),
    errors: rejected,
  };
}

module.exports = { runRtingsSync, buildEnrichmentProposal, mergeRawSnapshot, RAW_PATH, PROPOSALS_PATH, CATALOG_PATH };
