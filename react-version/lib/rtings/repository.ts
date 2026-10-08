/**
 * Persistence for the RTINGS pipeline (see RtingsRepository in ./types).
 *
 *   SupabaseRtingsRepository  production: the 0005 tables through PostgREST
 *                             with the server-only secret key.
 *   FileRtingsRepository      local CLI store when Supabase is not configured:
 *                               <repo>/data/rtings/store.json        normalized rows + runs
 *                               <repo>/data/rtings/raw/run-<id>.json  raw items, opened 'wx'
 *                               react-version/lib/data/rtings-evidence.json
 *                                 published-only snapshot the site reads
 *                             Writing refuses to run on Vercel (read-only FS).
 *                             readOnly mode serves the snapshot to the site.
 *   InMemoryRtingsRepository  tests and dev; enforces the same constraints as
 *                             the SQL schema so tests catch what Postgres would.
 *
 * getRtingsRepository() is what server code calls: Supabase when configured,
 * otherwise the read-only snapshot. Server code never writes to the local FS.
 */

import fs from 'node:fs';
import path from 'node:path';
import type { SupabaseClient } from '@supabase/supabase-js';
import { RtingsRepositoryError } from './types';
import type {
  ChangeLogEntry,
  ImageWrite,
  RawRecordWrite,
  RepositoryKind,
  ReviewStatus,
  ReviewWrite,
  RtingsChangeLogRow,
  RtingsImageRow,
  RtingsRawRecordRow,
  RtingsRepository,
  RtingsReviewRow,
  RtingsScoreRow,
  RtingsSyncRunRow,
  ScoreWrite,
  StartRunInput,
  StartRunResult,
  StoredReview,
  FinishRunPatch,
} from './types';
import { getSupabaseClient, isDbConfigured } from '../db/supabaseClient';

// ---------------------------------------------------------------------------
// Shared constraint checks (mirror 0005_rtings_pipeline.sql)
// ---------------------------------------------------------------------------

const REVIEW_URL_RE = /^https:\/\/www\.rtings\.com\//;
const FINGERPRINT_RE = /^[0-9a-f]{64}$/;
const METRIC_KEY_RE = /^[a-z0-9_]+$/;
const SHA_RE = /^[0-9a-f]{64}$/;

function fail(operation: string, message: string, retryable = false): never {
  throw new RtingsRepositoryError(operation, message, retryable);
}

function checkReviewWrite(op: string, w: Pick<ReviewWrite, 'review_url' | 'fingerprint' | 'status' | 'mattress_id' | 'match_confidence' | 'overall_score'>): void {
  if (!REVIEW_URL_RE.test(w.review_url)) fail(op, 'review_url must start with https://www.rtings.com/');
  if (!FINGERPRINT_RE.test(w.fingerprint)) fail(op, 'fingerprint must be 64 lowercase hex characters');
  if (w.overall_score != null && (w.overall_score < 0 || w.overall_score > 10)) fail(op, 'overall_score must be within 0-10');
  if (w.status === 'published' && (!w.mattress_id || (w.match_confidence !== 'exact' && w.match_confidence !== 'high'))) {
    fail(op, 'a published review needs mattress_id and an exact/high match');
  }
}

function checkScore(op: string, s: ScoreWrite): void {
  if (!METRIC_KEY_RE.test(s.metric_key)) fail(op, `metric_key "${s.metric_key}" must match ^[a-z0-9_]+$`);
  const v = s.value;
  if (v == null) return;
  if (!Number.isFinite(v)) fail(op, `${s.metric_key}: value must be finite`);
  if (s.value_kind === 'score_0_10' && (v < 0 || v > 10)) fail(op, `${s.metric_key}: score must be within 0-10`);
  if (s.value_kind === 'measurement' && v < 0) fail(op, `${s.metric_key}: measurement must be >= 0`);
  if (s.value_kind === 'boolean' && v !== 0 && v !== 1) fail(op, `${s.metric_key}: boolean must be 0 or 1`);
  if (s.value_kind === 'label') fail(op, `${s.metric_key}: a label has no numeric value`);
}

function byStartedDesc(a: RtingsSyncRunRow, b: RtingsSyncRunRow): number {
  return Date.parse(b.started_at) - Date.parse(a.started_at) || b.id - a.id;
}

function completedTime(run: RtingsSyncRunRow): number {
  const t = Date.parse(run.completed_at ?? run.finished_at ?? run.started_at);
  return Number.isFinite(t) ? t : 0;
}

const SUCCESSFUL_STATUSES = new Set(['success', 'partial']);

function clone<T>(value: T): T {
  return structuredClone(value);
}

// ---------------------------------------------------------------------------
// In-memory implementation
// ---------------------------------------------------------------------------

export interface MemoryState {
  nextId: { run: number; review: number; score: number; image: number; raw: number; change: number };
  runs: RtingsSyncRunRow[];
  reviews: RtingsReviewRow[];
  scores: RtingsScoreRow[];
  images: RtingsImageRow[];
  rawRecords: RtingsRawRecordRow[];
  changeLog: RtingsChangeLogRow[];
}

export function emptyMemoryState(): MemoryState {
  return {
    nextId: { run: 1, review: 1, score: 1, image: 1, raw: 1, change: 1 },
    runs: [],
    reviews: [],
    scores: [],
    images: [],
    rawRecords: [],
    changeLog: [],
  };
}

export interface InMemoryOptions {
  state?: MemoryState;
  now?: () => Date;
  /** Reported kind (FileRtingsRepository reuses this engine and reports 'file'). */
  kind?: RepositoryKind;
  /** Raw payloads are kept in state unless a caller stores them elsewhere. */
  keepRawRecords?: boolean;
}

export class InMemoryRtingsRepository implements RtingsRepository {
  readonly kind: RepositoryKind;
  private state: MemoryState;
  private readonly clock: () => Date;
  private readonly keepRaw: boolean;

  constructor(options: InMemoryOptions = {}) {
    this.kind = options.kind ?? 'memory';
    this.state = options.state ? clone(options.state) : emptyMemoryState();
    this.clock = options.now ?? (() => new Date());
    this.keepRaw = options.keepRawRecords ?? true;
  }

  private nowIso(): string {
    return this.clock().toISOString();
  }

  /** A deep copy of everything stored (tests, the file store's persistence). */
  snapshotState(): MemoryState {
    return clone(this.state);
  }

  private stored(review: RtingsReviewRow): StoredReview {
    return {
      review: clone(review),
      scores: clone(this.state.scores.filter((s) => s.review_id === review.id).sort((a, b) => (a.metric_key < b.metric_key ? -1 : 1))),
      images: clone(this.state.images.filter((i) => i.review_id === review.id).sort((a, b) => a.id - b.id)),
    };
  }

  // Runs ------------------------------------------------------------------

  async failStaleRuns(olderThanMinutes: number, now: Date): Promise<number> {
    const threshold = now.getTime() - olderThanMinutes * 60_000;
    let count = 0;
    for (const run of this.state.runs) {
      if (run.status !== 'running' || Date.parse(run.started_at) >= threshold) continue;
      const at = now.toISOString();
      run.status = 'failed';
      run.completed_at = at;
      run.finished_at = at;
      run.error_message = `Run had not finished after ${olderThanMinutes} minutes; marked failed by a later sync attempt.`;
      run.error_summary = [{ code: 'STALE_RUN', message: run.error_message, affected: [], retryable: true }];
      count += 1;
    }
    return count;
  }

  async startRun(input: StartRunInput): Promise<StartRunResult> {
    if (this.state.runs.some((r) => r.status === 'running')) return { ok: false, reason: 'already_running' };
    const run: RtingsSyncRunRow = {
      id: this.state.nextId.run++,
      started_at: this.nowIso(),
      finished_at: null,
      status: 'running',
      trigger_source: input.triggerSource,
      trigger: input.trigger,
      actor_id: input.actorId,
      actor_input: clone(input.actorInput),
      apify_run_id: null,
      dataset_id: null,
      apify_status: null,
      coverage: null,
      records_received: null,
      records_valid: null,
      records_rejected: null,
      records_created: null,
      records_updated: null,
      records_unchanged: null,
      records_failed: null,
      records_pending: null,
      records_new_candidate: null,
      records_source_missing: null,
      records_published: null,
      safety_flags: [],
      error_summary: null,
      error_message: null,
      estimated_cost_usd: null,
      completed_at: null,
    };
    this.state.runs.push(run);
    return { ok: true, run: clone(run) };
  }

  async finishRun(syncRunId: number, patch: FinishRunPatch): Promise<RtingsSyncRunRow> {
    const run = this.state.runs.find((r) => r.id === syncRunId);
    if (!run) fail('finishRun', `sync run ${syncRunId} not found`);
    for (const [key, value] of Object.entries(patch)) {
      if (value !== undefined) (run as unknown as Record<string, unknown>)[key] = clone(value);
    }
    if (patch.completed_at !== undefined && patch.finished_at === undefined) run.finished_at = patch.completed_at;
    for (const key of Object.keys(run) as (keyof RtingsSyncRunRow)[]) {
      if (key.startsWith('records_')) {
        const v = run[key];
        if (typeof v === 'number' && v < 0) fail('finishRun', `${key} must be >= 0`);
      }
    }
    return clone(run);
  }

  async getRun(syncRunId: number): Promise<RtingsSyncRunRow | null> {
    const run = this.state.runs.find((r) => r.id === syncRunId);
    return run ? clone(run) : null;
  }

  async listRecentRuns(limit: number): Promise<RtingsSyncRunRow[]> {
    return clone([...this.state.runs].sort(byStartedDesc).slice(0, Math.max(0, limit)));
  }

  async getLastSuccessfulRun(): Promise<RtingsSyncRunRow | null> {
    const runs = this.state.runs.filter((r) => SUCCESSFUL_STATUSES.has(r.status)).sort((a, b) => completedTime(b) - completedTime(a) || b.id - a.id);
    return runs[0] ? clone(runs[0]) : null;
  }

  async getAwaitingApifyRun(): Promise<RtingsSyncRunRow | null> {
    const runs = this.state.runs.filter((r) => r.status === 'awaiting_apify').sort(byStartedDesc);
    return runs[0] ? clone(runs[0]) : null;
  }

  // Raw ------------------------------------------------------------------

  async appendRawRecords(rows: RawRecordWrite[]): Promise<void> {
    const keys = new Set(this.state.rawRecords.map((r) => `${r.sync_run_id}:${r.item_index}`));
    for (const row of rows) {
      const key = `${row.sync_run_id}:${row.item_index}`;
      if (keys.has(key)) fail('appendRawRecords', `raw record ${key} already exists (append-only)`);
      if (row.item_index < 0) fail('appendRawRecords', 'item_index must be >= 0');
      if (!SHA_RE.test(row.payload_sha256)) fail('appendRawRecords', 'payload_sha256 must be 64 hex characters');
      if (!this.state.runs.some((r) => r.id === row.sync_run_id)) fail('appendRawRecords', `sync run ${row.sync_run_id} not found`);
      keys.add(key);
    }
    if (!this.keepRaw) return;
    const receivedAt = this.nowIso();
    for (const row of rows) this.state.rawRecords.push({ ...clone(row), id: this.state.nextId.raw++, received_at: receivedAt });
  }

  /** Raw rows kept in memory (tests). */
  listRawRecords(syncRunId?: number): RtingsRawRecordRow[] {
    return clone(this.state.rawRecords.filter((r) => syncRunId === undefined || r.sync_run_id === syncRunId));
  }

  /** Change log rows (tests, CLI report). */
  listChangeLog(reviewId?: number): RtingsChangeLogRow[] {
    return clone(this.state.changeLog.filter((r) => reviewId === undefined || r.review_id === reviewId));
  }

  // Reviews --------------------------------------------------------------

  async findReviewsByIdentity(keys: { productIds: string[]; reviewUrls: string[] }): Promise<StoredReview[]> {
    const pids = new Set(keys.productIds);
    const urls = new Set(keys.reviewUrls);
    return this.state.reviews.filter((r) => pids.has(r.product_id) || urls.has(r.review_url)).map((r) => this.stored(r));
  }

  async listReviews(filter: { statuses?: ReviewStatus[]; mattressId?: string }): Promise<RtingsReviewRow[]> {
    return clone(
      this.state.reviews.filter(
        (r) => (!filter.statuses || filter.statuses.includes(r.status)) && (filter.mattressId === undefined || r.mattress_id === filter.mattressId)
      )
    );
  }

  async countReviews(filter: { statuses?: ReviewStatus[] }): Promise<number> {
    return this.state.reviews.filter((r) => !filter.statuses || filter.statuses.includes(r.status)).length;
  }

  async upsertReview(write: ReviewWrite): Promise<RtingsReviewRow> {
    checkReviewWrite('upsertReview', write);
    const now = this.nowIso();
    const existing = this.state.reviews.find((r) => r.product_id === write.product_id) ?? this.state.reviews.find((r) => r.review_url === write.review_url);
    const urlOwner = this.state.reviews.find((r) => r.review_url === write.review_url);
    const pidOwner = this.state.reviews.find((r) => r.product_id === write.product_id);
    if (existing && ((urlOwner && urlOwner.id !== existing.id) || (pidOwner && pidOwner.id !== existing.id))) {
      fail('upsertReview', `product_id ${write.product_id} and review_url ${write.review_url} belong to different stored reviews`);
    }
    const { first_seen_at: firstSeen, ...rest } = write;
    if (existing) {
      Object.assign(existing, clone(rest), { updated_at: now });
      return clone(existing);
    }
    const row: RtingsReviewRow = { ...clone(rest), id: this.state.nextId.review++, first_seen_at: firstSeen ?? now, created_at: now, updated_at: now };
    this.state.reviews.push(row);
    return clone(row);
  }

  private requireReview(op: string, reviewId: number): RtingsReviewRow {
    const review = this.state.reviews.find((r) => r.id === reviewId);
    if (!review) fail(op, `review ${reviewId} not found`);
    return review;
  }

  async replaceScores(reviewId: number, scores: ScoreWrite[]): Promise<RtingsScoreRow[]> {
    this.requireReview('replaceScores', reviewId);
    const keys = new Set<string>();
    for (const s of scores) {
      checkScore('replaceScores', s);
      if (keys.has(s.metric_key)) fail('replaceScores', `duplicate metric_key ${s.metric_key}`);
      keys.add(s.metric_key);
    }
    const now = this.nowIso();
    this.state.scores = this.state.scores.filter((s) => s.review_id !== reviewId || keys.has(s.metric_key));
    for (const s of scores) {
      const existing = this.state.scores.find((row) => row.review_id === reviewId && row.metric_key === s.metric_key);
      if (existing) Object.assign(existing, clone(s), { updated_at: now });
      else this.state.scores.push({ ...clone(s), id: this.state.nextId.score++, review_id: reviewId, created_at: now, updated_at: now });
    }
    return clone(this.state.scores.filter((s) => s.review_id === reviewId));
  }

  async upsertImages(reviewId: number, images: ImageWrite[]): Promise<RtingsImageRow[]> {
    this.requireReview('upsertImages', reviewId);
    const now = this.nowIso();
    for (const img of images) {
      if (!/^https:\/\//.test(img.image_url)) fail('upsertImages', 'image_url must be https');
      const existing = this.state.images.find((row) => row.review_id === reviewId && row.image_url === img.image_url);
      // usage_status and license_note are human decisions: never touched here.
      if (existing) Object.assign(existing, clone(img), { updated_at: now });
      else this.state.images.push({ ...clone(img), id: this.state.nextId.image++, review_id: reviewId, usage_status: 'source_only', license_note: null, created_at: now, updated_at: now });
    }
    return clone(this.state.images.filter((i) => i.review_id === reviewId));
  }

  async setReviewStatus(reviewIds: number[], status: ReviewStatus, reason: string | null): Promise<void> {
    const rows = reviewIds.map((id) => this.requireReview('setReviewStatus', id));
    for (const row of rows) checkReviewWrite('setReviewStatus', { ...row, status });
    const now = this.nowIso();
    for (const row of rows) Object.assign(row, { status, status_reason: reason, updated_at: now });
  }

  async appendChangeLog(entries: ChangeLogEntry[]): Promise<void> {
    for (const e of entries) {
      this.requireReview('appendChangeLog', e.reviewId);
      if (e.oldFingerprint === e.newFingerprint) fail('appendChangeLog', 'old and new fingerprints must differ');
    }
    for (const e of entries) {
      this.state.changeLog.push({
        id: this.state.nextId.change++,
        review_id: e.reviewId,
        old_fingerprint: e.oldFingerprint,
        new_fingerprint: e.newFingerprint,
        changed_fields: [...e.changedFields],
        old_values: clone(e.oldValues),
        new_values: clone(e.newValues),
        detected_at: e.detectedAt,
        apify_run_id: e.apifyRunId,
        sync_run_id: e.syncRunId,
        outcome: e.outcome,
      });
    }
  }

  // Site -----------------------------------------------------------------

  async getPublishedForMattress(mattressId: string): Promise<StoredReview[]> {
    return this.state.reviews
      .filter((r) => r.status === 'published' && r.mattress_id === mattressId)
      .sort((a, b) => (Date.parse(b.source_updated_at ?? '') || 0) - (Date.parse(a.source_updated_at ?? '') || 0))
      .map((r) => this.stored(r));
  }
}

// ---------------------------------------------------------------------------
// File implementation (local CLI store + read-only site snapshot)
// ---------------------------------------------------------------------------

/** What react-version/lib/data/rtings-evidence.json holds: published rows only, plus run history for status reports. */
export interface RtingsEvidenceSnapshot {
  schema: 'rtings-evidence/v1';
  generatedAt: string;
  /** Review counts by status at generation time (status endpoint). */
  reviewCounts: Partial<Record<ReviewStatus, number>>;
  /** Latest runs, newest first (no secrets: actor_input never holds the token). */
  runs: RtingsSyncRunRow[];
  /** Published reviews with their scores and images. */
  published: StoredReview[];
}

const SNAPSHOT_RUNS = 10;

function resolveReactVersionRoot(): string {
  const cwd = process.cwd();
  if (fs.existsSync(path.join(cwd, 'lib', 'data', 'mattress-catalog.json'))) return cwd;
  return path.join(cwd, 'react-version');
}

/** react-version/lib/data/rtings-evidence.json, from either working directory (app or repo root). */
export function defaultSnapshotPath(): string {
  return path.join(resolveReactVersionRoot(), 'lib', 'data', 'rtings-evidence.json');
}

export interface FileRepositoryOptions {
  /** Repository root (the folder holding data/ and react-version/). */
  rootDir: string;
  /** Serve the published snapshot only; every write throws. */
  readOnly?: boolean;
  /** Defaults to <rootDir>/react-version/lib/data/rtings-evidence.json. */
  snapshotPath?: string;
  now?: () => Date;
}

function readJsonFile<T>(file: string): T | null {
  let text: string;
  try {
    text = fs.readFileSync(file, 'utf8');
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw new RtingsRepositoryError('readFile', `${path.basename(file)}: ${(err as Error).message}`, true);
  }
  try {
    return JSON.parse(text) as T;
  } catch (err) {
    throw new RtingsRepositoryError('readFile', `${path.basename(file)} is not valid JSON: ${(err as Error).message}`, false);
  }
}

function writeJsonAtomic(file: string, data: unknown): void {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
  fs.renameSync(tmp, file);
}

function stateFromSnapshot(snapshot: RtingsEvidenceSnapshot): MemoryState {
  const state = emptyMemoryState();
  state.runs = snapshot.runs ?? [];
  for (const stored of snapshot.published ?? []) {
    state.reviews.push(stored.review);
    state.scores.push(...stored.scores);
    state.images.push(...stored.images);
  }
  return state;
}

export class FileRtingsRepository implements RtingsRepository {
  readonly kind: RepositoryKind = 'file';
  readonly readOnly: boolean;
  readonly storePath: string;
  readonly rawDir: string;
  readonly snapshotPath: string;
  private readonly now: () => Date;
  private engine: InMemoryRtingsRepository | null = null;
  private snapshotCounts: Partial<Record<ReviewStatus, number>> | null = null;

  constructor(options: FileRepositoryOptions) {
    this.readOnly = options.readOnly ?? false;
    if (!this.readOnly && process.env.VERCEL) {
      throw new RtingsRepositoryError('FileRtingsRepository', 'the file store cannot write on Vercel (read-only filesystem); configure Supabase', false);
    }
    this.storePath = path.join(options.rootDir, 'data', 'rtings', 'store.json');
    this.rawDir = path.join(options.rootDir, 'data', 'rtings', 'raw');
    this.snapshotPath = options.snapshotPath ?? path.join(options.rootDir, 'react-version', 'lib', 'data', 'rtings-evidence.json');
    this.now = options.now ?? (() => new Date());
  }

  private load(): InMemoryRtingsRepository {
    if (this.engine) return this.engine;
    if (this.readOnly) {
      const snapshot = readJsonFile<RtingsEvidenceSnapshot>(this.snapshotPath);
      this.snapshotCounts = snapshot?.reviewCounts ?? {};
      this.engine = new InMemoryRtingsRepository({ kind: 'file', state: snapshot ? stateFromSnapshot(snapshot) : emptyMemoryState(), now: this.now });
    } else {
      const state = readJsonFile<MemoryState>(this.storePath) ?? emptyMemoryState();
      this.engine = new InMemoryRtingsRepository({ kind: 'file', state, now: this.now, keepRawRecords: false });
    }
    return this.engine;
  }

  private writable(op: string): InMemoryRtingsRepository {
    if (this.readOnly) fail(op, 'the file store is read-only here (Supabase is not configured); run scripts/sync-rtings.js locally to write');
    if (process.env.VERCEL) fail(op, 'the file store cannot write on Vercel');
    return this.load();
  }

  private async persist(): Promise<void> {
    const engine = this.load();
    const state = engine.snapshotState();
    state.rawRecords = [];
    writeJsonAtomic(this.storePath, state);
    writeJsonAtomic(this.snapshotPath, await this.buildSnapshot(engine));
  }

  private async buildSnapshot(engine: InMemoryRtingsRepository): Promise<RtingsEvidenceSnapshot> {
    const all = await engine.listReviews({});
    const reviewCounts: Partial<Record<ReviewStatus, number>> = {};
    for (const r of all) reviewCounts[r.status] = (reviewCounts[r.status] ?? 0) + 1;
    const publishedRows = all.filter((r) => r.status === 'published').sort((a, b) => a.id - b.id);
    const published = await engine.findReviewsByIdentity({ productIds: publishedRows.map((r) => r.product_id), reviewUrls: [] });
    return {
      schema: 'rtings-evidence/v1',
      generatedAt: this.now().toISOString(),
      reviewCounts,
      runs: await engine.listRecentRuns(SNAPSHOT_RUNS),
      published: published.filter((s) => s.review.status === 'published').sort((a, b) => a.review.id - b.review.id),
    };
  }

  private async mutate<T>(op: string, fn: (engine: InMemoryRtingsRepository) => Promise<T>): Promise<T> {
    const engine = this.writable(op);
    const result = await fn(engine);
    try {
      await this.persist();
    } catch (err) {
      if (err instanceof RtingsRepositoryError) throw err;
      fail(op, `could not save the file store: ${(err as Error).message}`, true);
    }
    return result;
  }

  // Runs
  failStaleRuns(min: number, now: Date): Promise<number> {
    if (this.readOnly) return Promise.resolve(0);
    return this.mutate('failStaleRuns', (e) => e.failStaleRuns(min, now));
  }
  startRun(input: StartRunInput): Promise<StartRunResult> {
    return this.mutate('startRun', (e) => e.startRun(input));
  }
  finishRun(id: number, patch: FinishRunPatch): Promise<RtingsSyncRunRow> {
    return this.mutate('finishRun', (e) => e.finishRun(id, patch));
  }
  getRun(id: number): Promise<RtingsSyncRunRow | null> {
    return this.load().getRun(id);
  }
  listRecentRuns(limit: number): Promise<RtingsSyncRunRow[]> {
    return this.load().listRecentRuns(limit);
  }
  getLastSuccessfulRun(): Promise<RtingsSyncRunRow | null> {
    return this.load().getLastSuccessfulRun();
  }
  getAwaitingApifyRun(): Promise<RtingsSyncRunRow | null> {
    return this.load().getAwaitingApifyRun();
  }

  // Raw: one file per run, created exclusively ('wx'), never overwritten.
  async appendRawRecords(rows: RawRecordWrite[]): Promise<void> {
    const engine = this.writable('appendRawRecords');
    await engine.appendRawRecords(rows); // constraint checks only (keepRawRecords: false)
    const byRun = new Map<number, RawRecordWrite[]>();
    for (const row of rows) byRun.set(row.sync_run_id, [...(byRun.get(row.sync_run_id) ?? []), row]);
    const receivedAt = this.now().toISOString();
    fs.mkdirSync(this.rawDir, { recursive: true });
    for (const [runId, runRows] of byRun) {
      const file = path.join(this.rawDir, `run-${runId}.json`);
      const body = `${JSON.stringify({ syncRunId: runId, receivedAt, records: runRows }, null, 2)}\n`;
      try {
        fs.writeFileSync(file, body, { encoding: 'utf8', flag: 'wx' });
      } catch (err) {
        const code = (err as NodeJS.ErrnoException).code;
        fail('appendRawRecords', code === 'EEXIST' ? `${path.basename(file)} already exists (raw records are append-only)` : (err as Error).message, code !== 'EEXIST');
      }
    }
  }

  // Reviews
  findReviewsByIdentity(keys: { productIds: string[]; reviewUrls: string[] }): Promise<StoredReview[]> {
    return this.load().findReviewsByIdentity(keys);
  }
  listReviews(filter: { statuses?: ReviewStatus[]; mattressId?: string }): Promise<RtingsReviewRow[]> {
    return this.load().listReviews(filter);
  }
  async countReviews(filter: { statuses?: ReviewStatus[] }): Promise<number> {
    const engine = this.load();
    if (this.readOnly && this.snapshotCounts) {
      const counts = this.snapshotCounts;
      const statuses = filter.statuses ?? (Object.keys(counts) as ReviewStatus[]);
      return statuses.reduce((sum, s) => sum + (counts[s] ?? 0), 0);
    }
    return engine.countReviews(filter);
  }
  upsertReview(write: ReviewWrite): Promise<RtingsReviewRow> {
    return this.mutate('upsertReview', (e) => e.upsertReview(write));
  }
  replaceScores(reviewId: number, scores: ScoreWrite[]): Promise<RtingsScoreRow[]> {
    return this.mutate('replaceScores', (e) => e.replaceScores(reviewId, scores));
  }
  upsertImages(reviewId: number, images: ImageWrite[]): Promise<RtingsImageRow[]> {
    return this.mutate('upsertImages', (e) => e.upsertImages(reviewId, images));
  }
  setReviewStatus(ids: number[], status: ReviewStatus, reason: string | null): Promise<void> {
    return this.mutate('setReviewStatus', (e) => e.setReviewStatus(ids, status, reason));
  }
  appendChangeLog(entries: ChangeLogEntry[]): Promise<void> {
    return this.mutate('appendChangeLog', (e) => e.appendChangeLog(entries));
  }

  // Site
  getPublishedForMattress(mattressId: string): Promise<StoredReview[]> {
    return this.load().getPublishedForMattress(mattressId);
  }
}

// ---------------------------------------------------------------------------
// Supabase implementation
// ---------------------------------------------------------------------------

type PgError = { message: string; code?: string | null } | null;

function pgFail(op: string, error: NonNullable<PgError>): never {
  const code = error.code ?? '';
  // Constraint (23xxx), data (22xxx) and schema (42xxx) errors fail identically on retry.
  const retryable = !/^(22|23|42)/.test(code);
  throw new RtingsRepositoryError(op, `${error.message}${code ? ` (${code})` : ''}`, retryable);
}

function chunk<T>(items: readonly T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

const IN_CHUNK = 100;

function toNumberOrNull(v: unknown): number | null {
  if (v == null) return null;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

/** PostgREST returns numeric columns as numbers or strings depending on precision; normalize. */
function reviewFromDb(row: RtingsReviewRow): RtingsReviewRow {
  return { ...row, overall_score: toNumberOrNull(row.overall_score), recommended_for: row.recommended_for ?? [] };
}
function scoreFromDb(row: RtingsScoreRow): RtingsScoreRow {
  return { ...row, value: toNumberOrNull(row.value) };
}
function runFromDb(row: RtingsSyncRunRow): RtingsSyncRunRow {
  return { ...row, estimated_cost_usd: toNumberOrNull(row.estimated_cost_usd), safety_flags: row.safety_flags ?? [] };
}

export class SupabaseRtingsRepository implements RtingsRepository {
  readonly kind: RepositoryKind = 'supabase';
  private readonly db: SupabaseClient;

  constructor(client: SupabaseClient) {
    this.db = client;
  }

  // Runs ------------------------------------------------------------------

  async failStaleRuns(olderThanMinutes: number, now: Date): Promise<number> {
    const at = now.toISOString();
    const message = `Run had not finished after ${olderThanMinutes} minutes; marked failed by a later sync attempt.`;
    const { data, error } = await this.db
      .from('rtings_sync_runs')
      .update({
        status: 'failed',
        completed_at: at,
        finished_at: at,
        error_message: message,
        error_summary: [{ code: 'STALE_RUN', message, affected: [], retryable: true }],
      })
      .eq('status', 'running')
      .lt('started_at', new Date(now.getTime() - olderThanMinutes * 60_000).toISOString())
      .select('id');
    if (error) pgFail('failStaleRuns', error);
    return (data ?? []).length;
  }

  async startRun(input: StartRunInput): Promise<StartRunResult> {
    const { data, error } = await this.db
      .from('rtings_sync_runs')
      .insert({
        status: 'running',
        trigger: input.trigger,
        trigger_source: input.triggerSource,
        actor_id: input.actorId,
        actor_input: input.actorInput,
      })
      .select('*')
      .single();
    if (error) {
      // 0002's unique partial index allows one 'running' row: the insert itself is the lock.
      if (error.code === '23505') return { ok: false, reason: 'already_running' };
      pgFail('startRun', error);
    }
    return { ok: true, run: runFromDb(data as RtingsSyncRunRow) };
  }

  async finishRun(syncRunId: number, patch: FinishRunPatch): Promise<RtingsSyncRunRow> {
    const body: Record<string, unknown> = { ...patch };
    if (patch.completed_at !== undefined && patch.finished_at === undefined) body.finished_at = patch.completed_at;
    const { data, error } = await this.db.from('rtings_sync_runs').update(body).eq('id', syncRunId).select('*').single();
    if (error) pgFail('finishRun', error);
    return runFromDb(data as RtingsSyncRunRow);
  }

  async getRun(syncRunId: number): Promise<RtingsSyncRunRow | null> {
    const { data, error } = await this.db.from('rtings_sync_runs').select('*').eq('id', syncRunId).maybeSingle();
    if (error) pgFail('getRun', error);
    return data ? runFromDb(data as RtingsSyncRunRow) : null;
  }

  async listRecentRuns(limit: number): Promise<RtingsSyncRunRow[]> {
    const { data, error } = await this.db.from('rtings_sync_runs').select('*').order('started_at', { ascending: false }).order('id', { ascending: false }).limit(limit);
    if (error) pgFail('listRecentRuns', error);
    return ((data ?? []) as RtingsSyncRunRow[]).map(runFromDb);
  }

  async getLastSuccessfulRun(): Promise<RtingsSyncRunRow | null> {
    const { data, error } = await this.db
      .from('rtings_sync_runs')
      .select('*')
      .in('status', ['success', 'partial'])
      .order('completed_at', { ascending: false, nullsFirst: false })
      .order('id', { ascending: false })
      .limit(1);
    if (error) pgFail('getLastSuccessfulRun', error);
    const row = (data ?? [])[0] as RtingsSyncRunRow | undefined;
    return row ? runFromDb(row) : null;
  }

  async getAwaitingApifyRun(): Promise<RtingsSyncRunRow | null> {
    const { data, error } = await this.db
      .from('rtings_sync_runs')
      .select('*')
      .eq('status', 'awaiting_apify')
      .order('started_at', { ascending: false })
      .limit(1);
    if (error) pgFail('getAwaitingApifyRun', error);
    const row = (data ?? [])[0] as RtingsSyncRunRow | undefined;
    return row ? runFromDb(row) : null;
  }

  // Raw ------------------------------------------------------------------

  async appendRawRecords(rows: RawRecordWrite[]): Promise<void> {
    for (const part of chunk(rows, 200)) {
      const { error } = await this.db.from('rtings_raw_records').insert(part);
      if (error) pgFail('appendRawRecords', error);
    }
  }

  // Reviews --------------------------------------------------------------

  private async childrenFor(reviews: RtingsReviewRow[]): Promise<StoredReview[]> {
    if (reviews.length === 0) return [];
    const ids = reviews.map((r) => r.id);
    const scores: RtingsScoreRow[] = [];
    const images: RtingsImageRow[] = [];
    for (const part of chunk(ids, IN_CHUNK)) {
      const s = await this.db.from('rtings_scores').select('*').in('review_id', part).order('metric_key');
      if (s.error) pgFail('readScores', s.error);
      scores.push(...((s.data ?? []) as RtingsScoreRow[]).map(scoreFromDb));
      const i = await this.db.from('rtings_images').select('*').in('review_id', part).order('id');
      if (i.error) pgFail('readImages', i.error);
      images.push(...((i.data ?? []) as RtingsImageRow[]));
    }
    return reviews.map((review) => ({
      review,
      scores: scores.filter((s) => s.review_id === review.id),
      images: images.filter((img) => img.review_id === review.id),
    }));
  }

  async findReviewsByIdentity(keys: { productIds: string[]; reviewUrls: string[] }): Promise<StoredReview[]> {
    const byId = new Map<number, RtingsReviewRow>();
    for (const [column, values] of [['product_id', keys.productIds], ['review_url', keys.reviewUrls]] as const) {
      for (const part of chunk(Array.from(new Set(values)), IN_CHUNK)) {
        const { data, error } = await this.db.from('rtings_reviews').select('*').in(column, part);
        if (error) pgFail('findReviewsByIdentity', error);
        for (const row of (data ?? []) as RtingsReviewRow[]) byId.set(row.id, reviewFromDb(row));
      }
    }
    return this.childrenFor(Array.from(byId.values()).sort((a, b) => a.id - b.id));
  }

  async listReviews(filter: { statuses?: ReviewStatus[]; mattressId?: string }): Promise<RtingsReviewRow[]> {
    const out: RtingsReviewRow[] = [];
    const pageSize = 1000;
    for (let from = 0; ; from += pageSize) {
      let query = this.db.from('rtings_reviews').select('*').order('id').range(from, from + pageSize - 1);
      if (filter.statuses) query = query.in('status', filter.statuses);
      if (filter.mattressId !== undefined) query = query.eq('mattress_id', filter.mattressId);
      const { data, error } = await query;
      if (error) pgFail('listReviews', error);
      const rows = (data ?? []) as RtingsReviewRow[];
      out.push(...rows.map(reviewFromDb));
      if (rows.length < pageSize) break;
    }
    return out;
  }

  async countReviews(filter: { statuses?: ReviewStatus[] }): Promise<number> {
    let query = this.db.from('rtings_reviews').select('id', { count: 'exact', head: true });
    if (filter.statuses) query = query.in('status', filter.statuses);
    const { count, error } = await query;
    if (error) pgFail('countReviews', error);
    return count ?? 0;
  }

  async upsertReview(write: ReviewWrite): Promise<RtingsReviewRow> {
    checkReviewWrite('upsertReview', write);
    const find = async (column: 'product_id' | 'review_url', value: string): Promise<RtingsReviewRow | null> => {
      const { data, error } = await this.db.from('rtings_reviews').select('id').eq(column, value).maybeSingle();
      if (error) pgFail('upsertReview', error);
      return (data as RtingsReviewRow | null) ?? null;
    };
    const existing = (await find('product_id', write.product_id)) ?? (await find('review_url', write.review_url));
    if (existing) {
      const { first_seen_at: _firstSeen, ...rest } = write;
      const { data, error } = await this.db.from('rtings_reviews').update(rest).eq('id', existing.id).select('*').single();
      if (error) pgFail('upsertReview', error);
      return reviewFromDb(data as RtingsReviewRow);
    }
    const { data, error } = await this.db.from('rtings_reviews').insert(write).select('*').single();
    if (error) pgFail('upsertReview', error);
    return reviewFromDb(data as RtingsReviewRow);
  }

  async replaceScores(reviewId: number, scores: ScoreWrite[]): Promise<RtingsScoreRow[]> {
    scores.forEach((s) => checkScore('replaceScores', s));
    if (scores.length > 0) {
      const rows = scores.map((s) => ({ ...s, review_id: reviewId }));
      const { error } = await this.db.from('rtings_scores').upsert(rows, { onConflict: 'review_id,metric_key' });
      if (error) pgFail('replaceScores', error);
    }
    let del = this.db.from('rtings_scores').delete().eq('review_id', reviewId);
    // metric keys are ^[a-z0-9_]+$ (checked above), so the list needs no quoting.
    if (scores.length > 0) del = del.not('metric_key', 'in', `(${scores.map((s) => s.metric_key).join(',')})`);
    const { error: delError } = await del;
    if (delError) pgFail('replaceScores', delError);
    const { data, error } = await this.db.from('rtings_scores').select('*').eq('review_id', reviewId).order('metric_key');
    if (error) pgFail('replaceScores', error);
    return ((data ?? []) as RtingsScoreRow[]).map(scoreFromDb);
  }

  async upsertImages(reviewId: number, images: ImageWrite[]): Promise<RtingsImageRow[]> {
    if (images.length > 0) {
      // The payload omits usage_status/license_note, so an update never touches them.
      const rows = images.map((img) => ({ ...img, review_id: reviewId }));
      const { error } = await this.db.from('rtings_images').upsert(rows, { onConflict: 'review_id,image_url' });
      if (error) pgFail('upsertImages', error);
    }
    const { data, error } = await this.db.from('rtings_images').select('*').eq('review_id', reviewId).order('id');
    if (error) pgFail('upsertImages', error);
    return (data ?? []) as RtingsImageRow[];
  }

  async setReviewStatus(reviewIds: number[], status: ReviewStatus, reason: string | null): Promise<void> {
    for (const part of chunk(reviewIds, IN_CHUNK)) {
      const { error } = await this.db.from('rtings_reviews').update({ status, status_reason: reason }).in('id', part);
      if (error) pgFail('setReviewStatus', error);
    }
  }

  async appendChangeLog(entries: ChangeLogEntry[]): Promise<void> {
    if (entries.length === 0) return;
    const rows = entries.map((e) => ({
      review_id: e.reviewId,
      old_fingerprint: e.oldFingerprint,
      new_fingerprint: e.newFingerprint,
      changed_fields: e.changedFields,
      old_values: e.oldValues,
      new_values: e.newValues,
      detected_at: e.detectedAt,
      apify_run_id: e.apifyRunId,
      sync_run_id: e.syncRunId,
      outcome: e.outcome,
    }));
    for (const part of chunk(rows, 200)) {
      const { error } = await this.db.from('rtings_change_log').insert(part);
      if (error) pgFail('appendChangeLog', error);
    }
  }

  // Site -----------------------------------------------------------------

  async getPublishedForMattress(mattressId: string): Promise<StoredReview[]> {
    const { data, error } = await this.db
      .from('rtings_reviews')
      .select('*')
      .eq('mattress_id', mattressId)
      .eq('status', 'published')
      .order('source_updated_at', { ascending: false, nullsFirst: false });
    if (error) pgFail('getPublishedForMattress', error);
    return this.childrenFor(((data ?? []) as RtingsReviewRow[]).map(reviewFromDb));
  }
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * The repository server code uses. Supabase when SUPABASE_URL and
 * SUPABASE_SECRET_KEY are set; otherwise the read-only published snapshot
 * (react-version/lib/data/rtings-evidence.json). Never a writable file store:
 * only scripts/sync-rtings.js constructs one of those.
 */
export function getRtingsRepository(): RtingsRepository {
  if (isDbConfigured()) {
    const client = getSupabaseClient();
    if (client) return new SupabaseRtingsRepository(client);
  }
  return new FileRtingsRepository({ rootDir: path.dirname(resolveReactVersionRoot()), readOnly: true, snapshotPath: defaultSnapshotPath() });
}

/** True when the repository can take pipeline writes (Supabase, memory, or a writable file store). */
export function isWritableRepository(repo: RtingsRepository): boolean {
  return !(repo instanceof FileRtingsRepository && repo.readOnly);
}
