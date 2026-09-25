'use strict';

/**
 * Server-only Apify client. Never import this from a 'use client'
 * component - it reads APIFY_API_TOKEN from process.env, which must
 * never reach the browser bundle.
 *
 * Reuses the pattern already established by lib/scoreEngine.js in this
 * project (plain CJS, 'use strict') rather than introducing TypeScript
 * or a new module convention, and reuses the CRON_SECRET-style "read one
 * env var, fail loudly and safely if absent" approach already used by
 * app/api/cron/verify-catalog/route.js - not a new config system.
 */

const DEFAULT_TIMEOUT_MS = 60_000;
const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_BASE_DELAY_MS = 500;

const ACTOR_ID = process.env.APIFY_RTINGS_ACTOR_ID || 'crawlerbros/rtings-scraper';

/**
 * True only when a real-looking Apify token is configured. The app must
 * keep working when this is false - callers check this before attempting
 * a sync rather than letting a network call fail unpredictably.
 */
function isApifyConfigured() {
  const token = process.env.APIFY_API_TOKEN;
  return typeof token === 'string' && token.trim().length > 0;
}

function actorRunSyncUrl(actorId) {
  // Apify actor ids use a slash (owner/name) in normal usage but a tilde
  // in REST paths (owner~name) - encoding just the slash keeps a
  // dot/hyphen-bearing actor name intact.
  const pathSafeId = actorId.replace('/', '~');
  return `https://api.apify.com/v2/actors/${pathSafeId}/run-sync-get-dataset-items`;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Returns a structured, machine-checkable error - never throws a raw
 * fetch/parse exception up to a caller that has to guess what happened.
 */
function apifyError(code, message, extra) {
  return { success: false, code, message, retryable: false, ...extra };
}

const RETRYABLE_STATUS = new Set([408, 429, 500, 502, 503, 504]);

/**
 * Runs the RTINGS actor synchronously and returns its dataset items.
 * Retries a bounded number of times, only on statuses that are actually
 * transient (never retries a 401/400 - that will fail identically every
 * time and burns Apify quota for nothing). Every non-2xx or malformed
 * response is a structured error, never a thrown exception the caller
 * has to unwrap.
 *
 * @param {object} input - actor input payload, forwarded as-is (the
 *   caller is responsible for building a valid RTINGS actor input; see
 *   buildRtingsInput()).
 * @param {object} [options]
 * @param {number} [options.timeoutMs]
 * @param {number} [options.maxRetries]
 * @returns {Promise<{success:true, items:object[]}|{success:false, code:string, message:string, retryable:boolean}>}
 */
async function runRtingsActorSync(input, options = {}) {
  if (!isApifyConfigured()) {
    return apifyError('APIFY_NOT_CONFIGURED', 'APIFY_API_TOKEN is not set on this deployment.');
  }
  const token = process.env.APIFY_API_TOKEN;
  const timeoutMs = options.timeoutMs || DEFAULT_TIMEOUT_MS;
  const maxRetries = options.maxRetries != null ? options.maxRetries : DEFAULT_MAX_RETRIES;
  const url = `${actorRunSyncUrl(ACTOR_ID)}?token=${encodeURIComponent(token)}`;

  let lastError = null;
  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    if (attempt > 0) {
      // Bounded exponential backoff with jitter - never retries forever,
      // and the delay grows so a transient outage doesn't turn into a
      // tight retry loop against Apify's API.
      const backoffMs = DEFAULT_BASE_DELAY_MS * 2 ** (attempt - 1);
      await sleep(backoffMs + Math.floor(Math.random() * 200));
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    let response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
        signal: controller.signal,
      });
    } catch (err) {
      clearTimeout(timeout);
      const isTimeout = err.name === 'AbortError';
      lastError = apifyError(
        isTimeout ? 'APIFY_TIMEOUT' : 'APIFY_NETWORK_ERROR',
        isTimeout ? `Request timed out after ${timeoutMs}ms.` : `Network error contacting Apify: ${err.message}`,
        { retryable: true }
      );
      continue;
    }
    clearTimeout(timeout);

    if (!response.ok) {
      const bodyText = await response.text().catch(() => '');
      const retryable = RETRYABLE_STATUS.has(response.status);
      lastError = apifyError(
        response.status === 401 || response.status === 403 ? 'APIFY_UNAUTHORIZED' : 'APIFY_RUN_FAILED',
        `Apify returned HTTP ${response.status}${bodyText ? `: ${bodyText.slice(0, 300)}` : ''}`,
        { retryable, httpStatus: response.status }
      );
      if (!retryable) return lastError; // Don't burn retries on a 401 - it will never succeed.
      continue;
    }

    let items;
    try {
      items = await response.json();
    } catch (err) {
      lastError = apifyError('APIFY_MALFORMED_RESPONSE', `Response was not valid JSON: ${err.message}`, { retryable: true });
      continue;
    }
    if (!Array.isArray(items)) {
      return apifyError('APIFY_MALFORMED_RESPONSE', 'Expected the dataset response to be a JSON array.', { retryable: false });
    }
    return { success: true, items };
  }

  return lastError || apifyError('APIFY_RUN_FAILED', 'Apify run failed for an unknown reason.', { retryable: true });
}

/**
 * Builds a validated RTINGS actor input. Only 'byCategory', 'search',
 * and 'url' modes are supported - matches what this project actually
 * uses this actor for. maxItems is capped to keep a single sync (whether
 * triggered by a human running the script or the admin endpoint) from
 * accidentally requesting an unbounded, costly scrape.
 */
const MAX_ITEMS_CAP = 200;

function buildRtingsInput(options = {}) {
  const mode = options.mode || 'byCategory';
  if (mode === 'byCategory') {
    return {
      mode: 'byCategory',
      category: 'mattress',
      sortBy: options.sortBy || 'newest',
      maxItems: Math.min(options.maxItems || 50, MAX_ITEMS_CAP),
    };
  }
  if (mode === 'search') {
    if (!options.searchQuery || typeof options.searchQuery !== 'string') {
      throw new Error('buildRtingsInput: mode "search" requires a non-empty searchQuery string.');
    }
    return {
      mode: 'search',
      category: 'mattress',
      searchQuery: options.searchQuery,
      maxItems: Math.min(options.maxItems || 20, MAX_ITEMS_CAP),
    };
  }
  if (mode === 'url') {
    if (!options.reviewUrl || !/^https:\/\/www\.rtings\.com\//.test(options.reviewUrl)) {
      throw new Error('buildRtingsInput: mode "url" requires reviewUrl to be a real https://www.rtings.com/ URL.');
    }
    return { mode: 'url', url: options.reviewUrl };
  }
  throw new Error(`buildRtingsInput: unsupported mode "${mode}".`);
}

module.exports = { isApifyConfigured, runRtingsActorSync, buildRtingsInput, ACTOR_ID, MAX_ITEMS_CAP };
