/**
 * Thin entry point over the RTINGS pipeline (lib/rtings/syncPipeline.ts),
 * kept so existing imports keep working. It wires the real dependencies:
 *
 *   input    buildRtingsInput (capped at MAX_ITEMS_CAP)
 *   apify    getApifyPort() - refuses when the token is missing or
 *            APIFY_RTINGS_ACTOR_ID names any other actor
 *   repo     getRtingsRepository() - Supabase when configured, otherwise the
 *            read-only snapshot, in which case the run is refused BEFORE
 *            Apify is called (no paid scrape that cannot be stored)
 *   catalog  getCatalog() (DB first, committed JSON fallback)
 *   aliases  lib/rtings/aliases.json (human-curated)
 *
 * No filesystem writes happen on this path: Vercel's filesystem is read-only
 * and raw evidence lives in rtings_raw_records. The local CLI
 * (scripts/sync-rtings.js) passes its own FileRtingsRepository instead.
 *
 * RTINGS is evidence only: nothing here writes the `mattresses` table or any
 * Match Score engine input.
 */

import fs from 'node:fs';
import path from 'node:path';
import type { RtingsAlias, RtingsRepository, SyncSummary, SyncTrigger, SyncTriggerSource } from '../rtings/types';
import { RTINGS_ACTOR_ID } from '../rtings/types';
import type { ApifyPort, RtingsInputOptions } from './apifyClient';
import { buildRtingsInput, getApifyPort } from './apifyClient';
import { getRtingsRepository, isWritableRepository } from '../rtings/repository';
import { refusedSummary, runRtingsPipeline, syncSummaryHttpStatus } from '../rtings/syncPipeline';
import type { CatalogIdentity } from '../rtings/match';
import { validateAliases } from '../rtings/match';
import { getCatalog } from '../db/mattressRepo';

export { syncSummaryHttpStatus };

export interface RtingsSyncOptions extends RtingsInputOptions {
  trigger?: SyncTrigger;
  triggerSource?: SyncTriggerSource;
  /** Injected in tests / by the CLI; defaults to the real dependencies above. */
  repo?: RtingsRepository;
  apify?: ApifyPort;
  catalog?: readonly CatalogIdentity[];
  aliases?: readonly RtingsAlias[];
  now?: () => Date;
  waitBudgetMs?: number;
}

function resolveReactVersionRoot(): string {
  const cwd = process.cwd();
  if (fs.existsSync(path.join(cwd, 'lib', 'data', 'mattress-catalog.json'))) return cwd;
  return path.join(cwd, 'react-version');
}

/** lib/rtings/aliases.json, validated. A missing or broken file yields no aliases (never a guess). */
export function loadRtingsAliases(): { aliases: RtingsAlias[]; problems: string[] } {
  const file = path.join(resolveReactVersionRoot(), 'lib', 'rtings', 'aliases.json');
  let parsed: unknown;
  try {
    parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    return { aliases: [], problems: code === 'ENOENT' ? [] : [`aliases.json could not be read: ${(err as Error).message}`] };
  }
  return validateAliases(parsed);
}

/**
 * Runs one sync and returns its summary. Never throws for expected failures:
 * refusal reasons come back as summary.errors codes (SYNC_ALREADY_RUNNING,
 * APIFY_NOT_CONFIGURED, APIFY_ACTOR_MISMATCH, STORE_READ_ONLY, INVALID_INPUT).
 * Use syncSummaryHttpStatus(summary) for the HTTP status.
 */
export async function runRtingsSync(options: RtingsSyncOptions = {}): Promise<SyncSummary> {
  const trigger: SyncTrigger = options.trigger ?? (options.triggerSource === 'cron' ? 'cron' : 'manual');
  const triggerSource: SyncTriggerSource = options.triggerSource ?? (trigger === 'cron' ? 'cron' : 'admin');
  const now = options.now ?? (() => new Date());
  const repo = options.repo ?? getRtingsRepository();
  const refuse = (code: string, message: string, retryable = false): SyncSummary =>
    refusedSummary({ trigger, triggerSource, actorId: RTINGS_ACTOR_ID, store: repo.kind, now: now(), error: { code, message, affected: [], retryable } });

  let input;
  try {
    input = buildRtingsInput(options);
  } catch (err) {
    return refuse('INVALID_INPUT', (err as Error).message);
  }

  let apify = options.apify;
  if (!apify) {
    const port = getApifyPort();
    if (!('ok' in port)) return refuse(port.code, port.message, port.retryable);
    apify = port.port;
  }

  if (!isWritableRepository(repo)) {
    return refuse('STORE_READ_ONLY', 'Supabase is not configured, so this server cannot store a sync. Configure SUPABASE_URL and SUPABASE_SECRET_KEY, or run scripts/sync-rtings.js locally.');
  }

  let catalog = options.catalog;
  if (!catalog) {
    const result = await getCatalog();
    catalog = result.entries;
  }
  const aliases = options.aliases ?? loadRtingsAliases().aliases;

  return runRtingsPipeline({ trigger, triggerSource, input, repo, apify, catalog, aliases, now, waitBudgetMs: options.waitBudgetMs });
}
