# RTINGS sync

How Mattress Match Score pulls independent RTINGS review data through Apify, checks it, and shows it on product pages. RTINGS data is supporting evidence only. The Match Score engine (`lib/scoreEngine.ts` and `lib/rules/*.json`) never reads it, and nothing in this pipeline changes scoring weights or rules.

> Status of this document: the architecture sections (actor, data flow, tables, statuses, matching, change detection, safety, cadence) are the agreed contract. Sections marked **Builder** are filled in by the module owners as they implement them. **Live run** sections are filled in only from a real, controlled run and are never written ahead of one.

## 1. Actor

| | |
|---|---|
| Actor | `crawlerbros/rtings-scraper` |
| Actor ID | `dCa1uCOn8ZtEkUamC` |
| Category | Mattress |
| Called from | Server only (`lib/apify/apifyClient.ts`). Never from the browser and never during a page request. |

The pipeline refuses to run any other actor. `APIFY_RTINGS_ACTOR_ID` may only be the id above or the `crawlerbros/rtings-scraper` slug.

### What the actor actually returns for mattresses

Observed in a real run (`data/raw/rtings-mattresses-raw.json`, 20 items, scraped 2026-09-25):

| Field | Present | Used as |
|---|---|---|
| `productId` | 20/20 | `rtings_reviews.product_id` (dedupe key) |
| `name` | 20/20 | `product_name`; `model` = name minus the brand prefix |
| `brand` | 20/20 | `brand` |
| `reviewUrl` | 20/20 | `review_url` (canonical, unique) |
| `productUrl` | 20/20 (same as `reviewUrl`) | `product_url` |
| `category`, `recordType` | 20/20 (`mattress`, `review`) | validation + stored |
| `brandSlug`, `modelSlug` | 20/20 | stored |
| `publishedAt` | 20/20 | `source_updated_at` (RTINGS' latest publish or update) |
| `firstPublishedAt` | 2/20 | `published_at` when present, else `publishedAt` |
| `publishedYear` | 20/20 | raw only |
| `testBenchName`, `testBenchId` | 20/20 | stored (RTINGS test methodology version) |
| `mainImageUrl` | 20/20 (`i.rtings.com`) | `rtings_images`; shown only as a credited photo when it passes the eligibility rules in §16 |
| `testScoresFlat` | 20/20, 4 keys: Mattress Type, Bed-In-A-Box, Firmness Level, Upper Comfort Foam @ Lumbar | `rtings_scores` |
| `featuredTests` | 20/20, `score` is always `0` | raw only. The 0 is a placeholder, not a rating |
| `recommendedFor` | 20/20, plain tags | `recommended_for` (tags, never converted to numbers) |
| `scrapedAt` | 20/20 | `retrieved_at` |
| `commentCount` | 8/20 | raw only |

The first controlled live run (Apify run `UfDUazV8gNM2kE3Zh`, 2026-10-07, section 17) returned exactly the same field set: 20/20 for every field above, `commentCount` 8/20 and `firstPublishedAt` 2/20. The same `testScoresFlat` keys came back, and `featuredTests[].score` was again `0` everywhere. That run explicitly requested `includeVerdict: true` and `includeSummaries: true`, and still got no verdict or summaries. The actor's log shows why: `category=mattress → 20 from listing`, `sitemap → 93 review URLs`, and then `no ProductVuePage payload` on 93 of the 94 review pages it opened. It therefore emits only the listing data. The normalizer needed no change.

None of the 20 items included a verdict, pros, cons, a mixed summary, or a numeric overall or category score. Those columns stay `null` until a real run returns them. The actor's Store page documents `overallScore` (0-10), `verdict` (string), `pros` and `cons` (string arrays), plus `reviewId`, `usageRatings`, `reviewedVariation`, `variantCount`, `skuIds` and `authors` (`RTINGS_RAW_DOCUMENTED_OPTIONAL_FIELDS` in `types.ts`). These are known fields, so their appearance is not schema drift. `validate.ts` type-checks overall score, verdict, pros and cons, and `normalize.ts` maps them verbatim only when they are present and correctly typed. A wrong type drops the value to `null` with a `MALFORMED_FIELD` warning, which does count toward `SCHEMA_DRIFT`. The "mixed notes" field name is not documented, so `mixed_summary` is never mapped from a guessed key. Any undocumented key raises a non-blocking `NEW_OPTIONAL_FIELDS` warning that names it, and a person maps it after inspecting real output (brief section 37).

## 2. Input configuration

**Builder (`lib/apify/apifyClient.ts`, `lib/rtings/syncPipeline.ts`).** Contract:

- Scheduled run: `{ mode: 'byCategory', category: 'mattress', sortBy: 'newest', maxItems: RTINGS_SYNC_MAX_ITEMS (default 50, hard cap 200) }`.
- Manual run: the same, or `url` mode for one `https://www.rtings.com/mattress/...` URL. `search` mode needs a non-empty query. The admin endpoint never accepts arbitrary hosts.
- **Wire input, checked against the actor's published input schema** (build 1.0.1, `GET /v2/acts/dCa1uCOn8ZtEkUamC/builds/{latest}`, 2026-10-07). `toActorRunInput()` in `apifyClient.ts` translates the internal input into the actor's field names: `mode` (`byCategory` | `search` | `byUrls` | `byBrand`), `category: 'mattress'`, `sortBy` (`score-desc` | `score-asc` | `newest` | `oldest` | `alphabetical`), `searchQuery`, `reviewUrls: string[]`, `includeVerdict: true`, `includeSummaries: true` and `maxItems` (1-500). Our internal `url` mode becomes the actor's `byUrls` with `reviewUrls: [url]` and `maxItems: 1`. Before this check the client sent `{mode: 'url', url}`, which the actor's schema doesn't accept.
- **Apify-side caps on every run.** The start request carries `?maxItems=<n>`, which bounds billed results, and `?maxTotalChargeUsd=<cap>`. The actor is pay-per-event, so the second cap bounds the total charge. The cap comes from `RTINGS_SYNC_MAX_CHARGE_USD`: a positive number, at most 10, default 1.50.
- **Coverage.** A `byCategory` run counts as `full_category` only when it returned fewer items than `maxItems` *and* more than one listing page (`CATEGORY_LISTING_PAGE_SIZE = 20`). Otherwise it is `partial`, and a partial run never marks anything `source_missing`. This rule comes from the live run: it asked for 200 and got 20, while RTINGS' sitemap lists 93 mattress reviews. "Fewer than requested" therefore doesn't prove the whole category came back.
- The client uses Apify's asynchronous run API (start the run, poll it, then read its default dataset) so the real `apify_run_id`, `dataset_id`, run status and `usageTotalUsd` are recorded. A run that hasn't finished within the function's time budget is saved as `awaiting_apify` and picked up again on the next tick. It is not started a second time.

## 3. Environment variables

| Name | Where | Purpose |
|---|---|---|
| `APIFY_API_TOKEN` | server only | Apify API token. Never logged, never in URLs that get logged, never sent to the client. |
| `APIFY_RTINGS_ACTOR_ID` | server only | `dCa1uCOn8ZtEkUamC` |
| `RTINGS_SYNC_MAX_ITEMS` | server only, optional | Items per category run (default 50, cap 200) |
| `RTINGS_SYNC_MAX_CHARGE_USD` | server only, optional | Per-run Apify spending cap passed to the actor run (default 1.5, capped at 10). Also the headroom `checkSyncBudget()` reserves against the account's monthly cap before any run starts (section 4, data flow). |
| `SUPABASE_URL`, `SUPABASE_SECRET_KEY` | server only | Production store. Without them, the site reads the committed snapshot. |
| `CRON_SECRET` | server only | Bearer secret Vercel Cron sends to `/api/cron/*` |
| `ADMIN_API_SECRET` | server only | Bearer secret for `/api/admin/rtings/*` (separate from `CRON_SECRET`) |

Template: `react-version/.env.example`. Real values go in `.env.local` (gitignored) or the Vercel project settings.

## 4. Data flow

```text
Vercel Cron (daily tick)  ──►  /api/cron/rtings-sync  ──►  freshness.ts: due? (RTINGS_SYNC_INTERVAL_DAYS since last success, or resume awaiting_apify)
                                                         │ no → 200 { skipped: 'not_due', nextDueAt }
                                                         ▼ yes
                                  checkSyncBudget(): monthly Apify cap has headroom?
                                                         │ no → 503 { error: { code: 'BUDGET_LIMIT_EXCEEDED' } }, nothing spent
                                                         ▼ yes
                                  syncPipeline.ts  (lock: rtings_sync_runs status='running')
   Apify run ─► dataset items ─► rtings_raw_records (append-only, every item, valid or not)
             ─► validate.ts ─► normalize.ts ─► dedupe.ts ─► match.ts ─► fingerprint.ts / changes.ts
             ─► safety.ts (gate) ─► publish.ts ─► rtings_reviews / rtings_scores / rtings_images / rtings_change_log
             ─► rtings_sync_runs (counts, flags, errors, cost) ─► revalidateTag('rtings-evidence', 'max')
Product page ─► evidence.ts getPublishedEvidence(mattressId) ─► repository (status='published' only). Never calls Apify.
```

## 5. Database tables

Migration: `supabase/migrations/0005_rtings_pipeline.sql`. It can be re-run safely, follows the 0004 lockdown (RLS on, no grants to `anon` or `authenticated`, server-only access), and was checked by applying 0001–0005 twice in PGlite.

| Table | Layer | Notes |
|---|---|---|
| `rtings_raw_records` | raw | One row per dataset item per run. Append-only: a trigger rejects UPDATE and DELETE. |
| `rtings_reviews` | normalized + published | Unique `review_url` and unique `product_id`. Provenance columns. `status` lifecycle. A row can't be `published` without a `mattress_id` and an `exact` or `high` match (check constraint). |
| `rtings_scores` | normalized | One typed row per metric. `unique(review_id, metric_key)`. Range checks per `value_kind`. |
| `rtings_images` | normalized | Source image references. `usage_status` defaults to `source_only` (a human decision field: `licensed` requires a `license_note`). Whether a photo is *displayed* is decided by `lib/rtings/photo.ts` (§16), not by this column. |
| `rtings_change_log` | audit | Append-only record of every fingerprint change, with old and new values. |
| `rtings_sync_runs` | audit | Existing table, extended with trigger, actor/run/dataset ids, `records_*` counts, `safety_flags`, `error_summary`, `estimated_cost_usd`, `completed_at`. |
| `rtings_review_required` | legacy | Kept for history and no longer written. Ambiguous matches are now `rtings_reviews.status = 'pending'`. |

Without Supabase (local CLI): `FileRtingsRepository` writes `data/rtings/store.json` and `data/rtings/raw/run-<id>.json` (one new file per run, never overwritten). It also writes `react-version/lib/data/rtings-evidence.json`, the published-only snapshot the site reads when the database isn't configured. It refuses to write when `VERCEL` is set, because that filesystem is read-only.

## 6. Validation

**Builder (`lib/rtings/validate.ts`).** Contract: the problem codes in `lib/rtings/types.ts` (`VALIDATION_PROBLEM_CODES`).

- Fatal (the record is rejected): not an object, a missing or empty `productId`/`name`/`brand`, a model that is empty once the brand is removed, or a `reviewUrl` that isn't `https://www.rtings.com/mattress/...`.
- Field-level (only that field becomes `null` and a warning is recorded): an unparseable date, a date before 2010-01-01, a date more than one day in the future, an image URL that isn't https on `i.rtings.com` with an image extension, a score that is NaN or out of range, or a known field with the wrong JSON type.
- Rejected records stay in `rtings_raw_records` with `validation_status = 'rejected'` and their problems. They never reach the published catalog.

## 7. Deduplication

**Builder (`lib/rtings/dedupe.ts`).** Identity, in order: `product_id`, then the canonical `review_url` (https, lowercase host, no query or hash, no trailing slash). In-batch duplicates collapse with the last occurrence winning, and the drop is recorded. Across runs, `upsertReview` finds the existing row by `product_id` first and `review_url` second. If RTINGS changes a title's formatting, the existing row is updated and a new row is not created.

## 8. Product matching

**Builder (`lib/rtings/match.ts`).** Uses only deterministic rules, in this order:

1. **review_url (exact).** A catalog entry's `reviewSources[].sourceUrl` equals the canonical review URL. Today six catalog entries carry an RTINGS URL.
2. **product_id_alias (exact).** A curated entry in `lib/rtings/aliases.json`, each with a human-written evidence note. Code never generates aliases.
3. **brand_model (high).** Same normalized brand, and the model token sets are identical once brand and filler words are removed (the existing `lib/apify/rtingsIdentity.ts` rules).
4. **Ambiguous.** A subset or superset token match (e.g. "Helix Midnight Luxe 2025" vs "Helix Midnight Luxe"), or more than one candidate. Status becomes `pending` with `match_candidates`. Never auto-attached.
5. **No same-brand candidate.** Status becomes `new_candidate`. Never injected into the catalog.

There is no fuzzy matching. Only an `exact` or `high` match can be published.

## 9. Change detection

**Builder (`lib/rtings/fingerprint.ts`, `lib/rtings/changes.ts`).** The fingerprint is SHA-256 (hex) of the canonical JSON `FingerprintInput` (types.ts). That covers identity, overall score, verdict, pros, cons, mixed summary, recommended-for tags, RTINGS dates, every metric's raw and parsed value, and image URLs. It excludes `scrapedAt`/`retrieved_at` and `commentCount`, so re-syncing unchanged data produces the same fingerprint.

- Same fingerprint: `unchanged`. Only `last_seen_at`, `retrieved_at` and the run ids are updated.
- Different fingerprint: `updated`. The pipeline writes a `rtings_change_log` row (changed field paths plus old and new values) before it overwrites the normalized row. Raw evidence for both versions stays in `rtings_raw_records`.

## 10. Review statuses

| Status | Meaning | On site |
|---|---|---|
| `pending` | Valid, but the match is ambiguous | no |
| `validated` | Valid and confidently matched, not yet promoted | no |
| `published` | Validated, matched to a catalog product, sourced from RTINGS | **yes** |
| `rejected` | Failed validation | no |
| `changed` | The fingerprint changed while the safety gate held publication | no (the last published values stay in the change log) |
| `new_candidate` | An RTINGS mattress that isn't in the catalog | no |
| `source_missing` | Absent from a run with full coverage; history kept | no |

"Verified" in the UI means `published`, i.e. validated, matched and sourced from RTINGS. It never means only that Apify returned the record.

## 11. Cron schedule

Vercel Cron can't express "every 14 days" exactly, so `vercel.json` schedules a **daily** tick for `/api/cron/rtings-sync` (staggered from `verify-catalog`). The route runs the sync only when `now - last_successful_sync_at >= 14 days` (`lib/rtings/freshness.ts`), or when an `awaiting_apify` run needs to be resumed. Any other tick returns `200 { skipped: 'not_due', nextDueAt }` and spends nothing. `success` and `partial` runs count as successful. `held` and `failed` runs do not reset the clock, but they do back off the cron (see below), so a lasting problem never turns into a paid scrape every day.

> **Current value (testing phase):** `RTINGS_SYNC_INTERVAL_DAYS = 31` (`lib/rtings/types.ts`), not the original 14 - the schedule below and every day figure in this document scale with that constant. Exactly one run is intended per 31-day cycle while the pipeline, the Supabase schema and the Apify budget are being verified.

**Builder (scheduler).** `react-version/vercel.json`:

| Path | Schedule | What it does |
|---|---|---|
| `/api/cron/verify-catalog` | `0 6 * * *` | Catalog freshness audit (unchanged) |
| `/api/cron/rtings-sync` | `30 6 * * *` | Daily tick at 06:30 UTC. Runs the 14-day gate; replaces the old weekly `0 6 * * 1` schedule |

`/api/cron/rtings-check` is deliberately not scheduled. It is a report-only check for monitors and people.

The gate in `lib/rtings/freshness.ts` (pure functions, no I/O):

- `decideSyncDue(lastSuccess, awaiting, now)` checks these in order. An `awaiting_apify` run with an Apify run id gives `resume_awaiting_apify`. No `success`/`partial` run with a parseable `completed_at` (or legacy `finished_at`) gives `never_synced`. `now - lastSuccess >= 14 days` gives `interval_elapsed`. Anything else is `not_due`, with `nextDueAt`. A due tick is then checked against the newest finished run from `listRecentRuns(10)`. If that run was `held`, the result is `held_awaiting_review` until 14 days after it, because the same data would be held again; an admin manual sync (`POST /api/admin/rtings/sync`) bypasses the gate once someone has read the flags. If it `failed`, the result is `failed_backoff`, with 1, 2, 4 and then 7 days after the 1st, 2nd, 3rd and 4th consecutive failure, and 14 days from the 5th failure (`RTINGS_MAX_AUTO_FAILURES`) on. Backoff windows close one hour early, so a run that finished at 06:33 is retried on the intended 06:30 tick. Resuming an `awaiting_apify` run is never blocked, because it costs no new scrape.
- `nextDueAt(lastSuccessAt)` returns `lastSuccessAt + 14 days`, or `null` when never synced or unparseable.
- `nextScheduledSyncAt(lastSuccessAt, now)` returns the first 06:30 UTC tick at or after `max(now, nextDueAt)`. This is the "Next scheduled sync" the status endpoint reports. It assumes the deployment's cron is active, and Vercel Cron runs only on production deployments.
- Because the tick is daily, a sync starts on the first tick at or after the 14-day mark, so the real interval is 14 days plus at most one day. After a held run the next automatic attempt is 14 days later. Over 30 days of permanent failure the cron starts 6 runs (days 0, 1, 3, 7, 14 and 28) instead of 30.

Responses from `GET /api/cron/rtings-sync`:

| Status | Body | When |
|---|---|---|
| 200 | `{ ranAt, skipped: 'not_due' \| 'held_awaiting_review' \| 'failed_backoff', lastSuccessfulSyncAt, nextDueAt, lastAttempt, nextScheduledSyncAt, schedule }` | Gate closed or backing off. No Apify call |
| 200 | `{ ranAt, due: { reason, lastSuccessfulSyncAt }, summary: SyncSummary }` | Run finished `success`, `partial`, `held` or `awaiting_apify` |
| 409 | `{ ranAt, due, error \| summary }` | Another run holds the lock (`SYNC_ALREADY_RUNNING`) |
| 503 | `{ ranAt, store, error: { code: 'APIFY_NOT_CONFIGURED' \| 'STORE_NOT_CONFIGURED' \| 'APIFY_ACTOR_MISMATCH' } }` | Credentials missing, or there's no writable store (Supabase isn't configured). Checked **before** any Apify call |
| 502 | `{ ranAt, due, summary }` or `{ ranAt, error }` | Run `failed` (Apify, structural or DB failure), or the store couldn't be read |
| 401 / 500 | `{ error }` | Missing or wrong bearer token / `CRON_SECRET` unset |

After a run that published something or marked rows `source_missing`, the route calls `revalidateTag('rtings-evidence', 'max')`. `maxDuration` is 300 s and the pipeline gets a 240 s Apify wait budget. A run that hasn't finished by then is parked as `awaiting_apify` and resumed on the next tick, never started twice.

## 12. Failure handling

**Builder (`lib/rtings/safety.ts`, `lib/rtings/syncPipeline.ts`).**

- Apify failure, timeout or unauthorized: the run is marked `failed` with `error_summary`, and nothing is written to the reviews, scores or images tables. The site keeps serving the last published snapshot.
- Partial invalid data: valid records are processed and invalid ones are rejected and counted. Run status is `partial`.
- Safety gate (thresholds exported from `safety.ts`): `MALFORMED_RESPONSE`, `EMPTY_DATASET` (0 items while anything is published), `COUNT_DROP`, `HIGH_REJECTION_RATE`, `INVALID_DOMAIN`, `SCHEMA_DRIFT`, `SCORES_DISAPPEARED`, `IMAGES_DISAPPEARED`, `VERDICTS_DISAPPEARED`. `SCHEMA_DRIFT` covers required fields missing, or known fields with a changed type, on more than half the items. New unknown fields alone never hold a run: they become a `NEW_OPTIONAL_FIELDS` warning (`safety.warnings`), stored in `error_summary` with the field names in `affected`, never in `safety_flags` or `error_message`. Any flag sets run status to `held`. Raw records and normalized rows are stored, but nothing new is promoted to `published`, and existing published rows stay as they are.
- Database failure: the run is marked `failed` where possible. `RtingsRepositoryError` is reported in the summary, and a write is never reported as successful when it wasn't.
- Stuck runs: a `running` row older than 30 minutes is marked `failed` before a new run takes the lock (the partial unique index from 0002).
- Existing data is never deleted.

## 13. Manual sync

`POST /api/admin/rtings/sync` with `Authorization: Bearer $ADMIN_API_SECRET` (rate-limited, inside the admin envelope). It always runs, ignoring the 14-day gate, and uses the same pipeline as cron. `GET /api/admin/rtings/status` reports, without calling Apify: last successful sync, next scheduled sync, last run status, records processed, updated and rejected, and errors. The CLI `node scripts/sync-rtings.js` runs the same pipeline against the file store when Supabase isn't configured. There is no public sync button.

**Builder (endpoints).** Shared wiring lives in `react-version/app/api/admin/rtings/_lib/syncRuntime.ts`, a private folder that isn't routable.

`POST /api/admin/rtings/sync` takes a JSON body of at most 2 KB. It is validated strictly, and unknown keys, wrong types or combined modes return `400 INVALID_INPUT`:

| Body | Actor input |
|---|---|
| `{}` | `byCategory` / `mattress` / `newest`, `maxItems` = `RTINGS_SYNC_MAX_ITEMS` or 50 |
| `{ "maxItems": n }` | Same, with `n` an integer from 1 to 200 |
| `{ "searchQuery": "...", "maxItems"?: n }` | `search` within the mattress category. 2–80 characters: letters, digits, spaces and `. , ' & + -` |
| `{ "reviewUrl": "..." }` | `url` mode for one review. The URL must canonicalize (`validate.canonicalReviewUrl`) to `https://www.rtings.com/mattress/...` **and** already be known, either as a catalog entry's `reviewSources[].sourceUrl` or as a stored `rtings_reviews.review_url`. Any other URL is refused, so the endpoint can't be used to point the scraper at arbitrary pages. Use a category run to discover new reviews |

Response: `AdminEnvelope<SyncSummary>`, with `meta.requested` echoing the validated request. `success` is `true` for `success`, `partial`, `held` and `awaiting_apify`. Status codes: 409 already running, 503 Apify or store not configured, 502 failed, and 401, 429 or 500 from the guard.

`GET /api/admin/rtings/status` returns `AdminEnvelope<StatusReport>`:

```text
apifyConfigured, dbConfigured, store ('supabase' | 'file'), serverSyncAvailable,
schedule { cron: '30 6 * * *', intervalDays: 14 },
lastSuccessfulSyncAt, nextDueAt, nextScheduledSyncAt, dueNow, dueReason, lastAttempt, awaitingApifyRunId,
lastRun { id, status, trigger, triggerSource, apifyRunId, datasetId, coverage, startedAt, completedAt,
          counts { received, valid, rejected, created, updated, unchanged, failed, pending, newCandidate, sourceMissing, published },
          safetyFlags, errorSummary, errorMessage, estimatedCostUsd },
recentRuns [5, same shape], reviewCounts { <status>: n }, storeErrors []
```

Each store read degrades on its own: a failed read adds a `STORE_READ_FAILED` entry to `storeErrors`, and the rest of the report is still real data.

`GET /api/cron/rtings-check` (`CRON_SECRET`) is report-only. It reads the repository through `freshness.ts`, with no filesystem access and no Apify call, and returns `status`: `never_synced`, `awaiting_apify`, `fresh`, `due`, `overdue` (more than 16 days since the last success, which means the daily tick isn't succeeding), `held_awaiting_review` (the newest finished run was held, so read its flags) or `failed_backoff` (the newest runs failed; `lastAttempt.consecutiveFailures` has the count). It also returns `lastSuccessfulSyncAt`, `ageDays`, `nextDueAt` and `nextScheduledSyncAt`.

## 13a. Endpoint security

**Builder (endpoints).** Checked against brief section 44:

- **Fail closed.** `/api/cron/*` needs `Authorization: Bearer $CRON_SECRET`: 500 when the secret is unset, 401 when the header is missing or wrong. `/api/admin/*` needs `Bearer $ADMIN_API_SECRET`, which is a separate secret so a leaked cron secret can't trigger manual runs. It is rate-limited to 10 attempts per minute per IP and endpoint before the token is checked (429 with `Retry-After: 60`), and Upstash is used when configured. `lib/cronAuth.ts` compares SHA-256 digests of both sides with `crypto.timingSafeEqual`, so response timing reveals neither the token length nor a prefix.
- **No public scraper.** The cron route takes no body and no query parameters, and its actor input is fixed. The admin route accepts only the validated body above. Neither route fetches a caller-supplied URL. The only outbound host is `api.apify.com` (in `apifyClient`), and the actor is pinned to `dCa1uCOn8ZtEkUamC`.
- **No wasted spend.** Apify and the store are checked before any Apify call. On a deployment without Supabase, `getRtingsRepository()` is the read-only file snapshot, so the routes return `503 STORE_NOT_CONFIGURED` instead of scraping into a store they can't write.
- **No secret leakage.** Responses and log lines go through `redactSecrets()`, which replaces the values of `APIFY_API_TOKEN`, `CRON_SECRET`, `ADMIN_API_SECRET`, `SUPABASE_SECRET_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `DIRECT_URL`, `DATABASE_URL` and `UPSTASH_REDIS_REST_TOKEN`, plus any `token=` query value, with `[redacted]`. Unexpected errors return a fixed message (`SYNC_FAILED` or `STORE_READ_FAILED`) and log one line with no stack trace. The Apify token is sent only in the `Authorization` header.
- **Server-only.** These modules are imported only by route handlers. The client-bundle check (no secret names or values in `.next/static`) is recorded in the completion matrix.

## 13b. Operations

**Builder (endpoints).** Common checks, where `$BASE` is the deployment URL:

```bash
# Is it healthy? When does it run next?
curl -s -H "Authorization: Bearer $ADMIN_API_SECRET" "$BASE/api/admin/rtings/status"
# Same freshness answer with the cron secret (for uptime monitors)
curl -s -H "Authorization: Bearer $CRON_SECRET" "$BASE/api/cron/rtings-check"
# Force a run now (ignores the 14-day gate; costs Apify credit)
curl -s -X POST -H "Authorization: Bearer $ADMIN_API_SECRET" -H "Content-Type: application/json" \
     -d '{"maxItems":50}' "$BASE/api/admin/rtings/sync"
# Re-check one known review
curl -s -X POST -H "Authorization: Bearer $ADMIN_API_SECRET" -H "Content-Type: application/json" \
     -d '{"reviewUrl":"https://www.rtings.com/mattress/reviews/purple/mattress"}' "$BASE/api/admin/rtings/sync"
```

| Symptom | Meaning | Action |
|---|---|---|
| `rtings-check` → `overdue` | The daily tick has had no success for more than 16 days | Read `lastRun.status`/`errorSummary` in the status endpoint. Check the Vercel cron logs |
| `lastRun.status = held` | The safety gate flagged the run (`safetyFlags`). Nothing new was published | Compare the run's raw records with the previous run. The cron does not retry for 14 days (`held_awaiting_review`). Once the cause is understood, an admin manual sync can confirm the fix |
| `lastRun.status = failed` | Apify, structural or DB failure | `errorSummary[].retryable` says whether the next tick can fix it. Published data is untouched |
| `awaitingApifyRunId` set | Apify was still running when the function budget ran out | Nothing to do. The next tick resumes it without starting a new scrape |
| 503 `STORE_NOT_CONFIGURED` | No Supabase credentials on this deployment | Expected until Supabase is configured. Use the CLI (`node scripts/sync-rtings.js`) and ship the snapshot |
| 409 `SYNC_ALREADY_RUNNING` | Another run holds the lock | Wait. A `running` row older than 30 minutes is failed automatically |

## 14. Testing

**Builder.** Every test mocks Apify. CI never calls it. Coverage required by brief section 35: parsing, normalization, matching, deduplication, change detection, security (missing, invalid and valid secret), failure recovery (Apify failure, empty dataset, partial invalid, DB failure), and one stubbed end-to-end journey (mock Apify → sync → in-memory repository → `getPublishedEvidence`). `lib/rtings/types.test.ts` keeps the TypeScript unions in step with the SQL check constraints and with the real sample's field set.

## 15. Cost

The actor is billed per result. The listing advertised about $4.33 per 1,000 results at integration time, and that is not a quoted final cost. Controls: the 14-day gate, a hard cap of 200 items, a default of 50, resuming `awaiting_apify` runs instead of re-running them, and no scrape on page requests. Each run records `records_received` and, when Apify reports it, `estimated_cost_usd` from the run's `usageTotalUsd`. If Apify doesn't report it, the value is `null` and is never estimated.

**Actual pricing, read from the actor record on 2026-10-07:** pay-per-event. `apify-actor-start` costs $0.005 per GB of run memory; the default memory is 4096 MB, so a start is 4 events, $0.02. `apify-default-dataset-item` costs $0.005 (FREE tier), $0.00433 (BRONZE), $0.00367 (SILVER) or $0.003 (GOLD and above) per result. Platform usage is paid by the user. The first live run's real cost is in section 17.

## 16. Product photos: provenance, rules and licensing

Every RTINGS-derived row carries `source = 'RTINGS'`, `source_type = 'independent_review'`, the RTINGS review URL, `retrieved_at`, RTINGS' own dates, `apify_actor_id`, `apify_run_id` and `dataset_id`. UI copy says "Independent testing by RTINGS" and links to the review. It never claims Mattress Match Score tested a mattress. The UI keeps "Published/updated by RTINGS" separate from "Data retrieved".

**Decision (2026-10-08, product owner).** Every sync, scheduled or manual, stores the product image the actor returns (`mainImageUrl`) together with the review, and the website shows it automatically. We do **not** own these photos. They are RTINGS', displayed credited and linked, and they can be switched off by changing one rule in `lib/rtings/photo.ts` if RTINGS objects. This is a copyright-risk decision taken by the site owner, not a license; if a license is later agreed, record it in `license_note` and set `usage_status = 'licensed'`.

**When a photo is displayed.** Only if all of these hold (`eligiblePhoto` in `lib/rtings/photo.ts`, unit-tested in `photo.test.ts`, `photos.test.ts`):

1. The review is `published`, matched to that exact catalog mattress with `exact` or `high` confidence (the same rule as the evidence block). Pending, new-candidate, rejected and source-missing records never show a photo.
2. The image URL is `https` on an RTINGS image host (`i.rtings.com`) and is a product asset: `/assets/products/<id>/<slug>/<file>`.
3. The image slug equals the review's own `<brand>-<model>` slug (strict token equality, no subset or fuzzy match), so the photo provably belongs to the review that was matched. All 14 published photos were also checked by eye against their product names on 2026-10-08.
4. The image was returned by the latest sync for that review. If a later sync stops returning it, the page falls back to the original render (history is kept, nothing is deleted); a changed URL is picked up automatically and recorded in the change log.

**How it reaches the pages.** `lib/db/mattressRepo.getCatalog()` attaches `entry.photo` (`src`, `alt`, `credit: "Photo: RTINGS"`, `creditUrl`) from a cached read of the RTINGS store (`lib/rtings/photos.ts`, revalidated every 6 hours and on `revalidateTag('rtings-evidence')` after a sync). Cards, sliders, results and the product hero then render it through `MattressRender`. A page request never calls Apify. If the store cannot be read, entries come back unchanged and the page keeps its renders. Mattresses without a photo keep the labeled original render.

**Browser side.** Photos load straight from `i.rtings.com` (un-optimized `next/image`, `referrerPolicy="no-referrer"`), so our image optimizer never proxies third-party URLs. The Content-Security-Policy `img-src` allows exactly that one third-party host. If a photo fails to load, the component swaps to the render and drops the credit. The credit is a visible "Photo: RTINGS" label, a link (`rel="noopener noreferrer nofollow"`, new tab) wherever the photo is not itself inside a link, and plain text where it is. The Privacy page discloses that RTINGS can see a visitor's IP address when a photo loads.

**Not shown.** Brand-site images (`og:image`) are not collected or displayed. Very small thumbnails (compare table headers, ranking rows) keep the render, because a legible credit does not fit.

## 17. First production sync

**Live run, executed 2026-10-07.** This is the only Apify call made during the integration. Every figure below comes from the run object Apify returned or from the stored rows. Nothing is estimated.

| | |
|---|---|
| Date | 2026-10-07, Apify run started 11:14:53Z and finished 11:15:39Z (46 s) |
| Account / plan | `adquark_dev`, STARTER |
| Actor | `crawlerbros/rtings-scraper` (`dCa1uCOn8ZtEkUamC`), build 1.0.1 (`QL1nYdPv2KFG780XV`) |
| Apify run id | `UfDUazV8gNM2kE3Zh` (status `SUCCEEDED`) |
| Dataset id | `rZ7Ityg5qDgWuve2V` |
| Input (actor wire form) | `{mode: 'byCategory', category: 'mattress', sortBy: 'newest', includeVerdict: true, includeSummaries: true, maxItems: 200}`, plus run options `maxItems=200` and `maxTotalChargeUsd=1.5` |
| Charged events | `apify-actor-start` × 4, `apify-default-dataset-item` × 20 |
| Cost | `usageTotalUsd` = **$0.1147** (from the finished run object; the pipeline's last poll read $0.1068 before the final accounting) |
| Entry point | `runRtingsSync()` → `getApifyPort()` → `runRtingsPipeline()`, the same path the CLI and the admin route use |

**Counts** (sync run #1 in the local file store):

| received | valid | rejected | created | updated | unchanged | failed | published | pending | new_candidate | source_missing |
|---|---|---|---|---|---|---|---|---|---|---|
| 20 | 20 | 0 | 20 | 0 | 0 | 0 | 14 | 2 | 4 | 0 |

Status `success`, coverage `partial`, no safety flags, no errors.

**Published, matched to the catalog** (14): exact match by review URL: Purple RestorePlus Hybrid → `purple-restore-plus`, Leesa Original → `leesa-original`, Casper Snow → `casper-snow`, Big Fig Mattress → `big-fig-classic`, Bear Elite Hybrid → `bear-elite-hybrid`. High confidence by identical brand and model tokens: Casper Cooling Select, Silk & Snow Mattress, Avocado Green, Sleep On Latex Hybrid, Saatva Latex Hybrid, Brooklyn Bedding Signature Hybrid, Sleep On Latex Pure Green Organic, DreamCloud Classic Hybrid and Tempur-Pedic TEMPUR-Adapt, each to the catalog entry with the same brand and model.

**Pending, ambiguous** (2, not shown on the site):

- Tuft and Needle Mint (RTINGS `57746`). The only candidate is `tuft-and-needle-mint-ii`, a subset match.
- Helix Midnight Luxe 2025 (`105249`). Candidates: `helix-midnight` and `helix-midnight-luxe`.

A person resolves these through `lib/rtings/aliases.json`. No alias was added automatically.

**New candidates** (4, RTINGS-reviewed mattresses that aren't in our catalog and were **not** added to it): Allswell Hybrid (`57836`), Zinus Original Green Tea 2025 (`124347`), Novaform Legacy (`109858`) and Novaform Serafina Pearl (`60401`).

**Rejections:** none.

**Where it was written.** Supabase is still credential-blocked (`SUPABASE_URL` and `SUPABASE_SECRET_KEY` are unset), so no Supabase rows exist and none are claimed. The run was stored in the local file store:

- Raw dataset, append-only: `data/raw/rtings-live-UfDUazV8gNM2kE3Zh.json` (20 items as returned; no secrets).
- Normalized rows, run history and fingerprints: `data/rtings/store.json`.
- Raw records with validation status: `data/rtings/raw/run-1.json`.
- Published-only snapshot the site reads: `react-version/lib/data/rtings-evidence.json`.

The live call wrote first into a staging file store so the real output could be inspected before anything reached the repository. The repository store was then filled by running the saved dataset through the same pipeline, with no second Apify call. The replay carried the run's real ids, status and `usageTotalUsd`, so store run #1's `started_at` is the ingestion time (11:17:23Z) and not the Apify start time.

**What changed after inspecting the real output.**

- The normalizer needed no change, because the field set was identical to section 1.
- The coverage rule was fixed (section 2). The pipeline had labelled this 20-of-93 run `full_category`, which would have let a later run wrongly mark reviews `source_missing`.
- The client now sends the actor's real `byUrls`/`reviewUrls` field names and a `maxTotalChargeUsd` ceiling.
- `lib/rtings/liveRun.regression.test.ts` and its fixture `lib/rtings/__fixtures__/rtings-live-UfDUazV8gNM2kE3Zh.real.json` (6 of the real items) lock in validation, parsing, dates, match outcomes and the partial-coverage behaviour.

**Match Score unaffected.** `lib/data/mattress-catalog.json`, `lib/scoreEngine.ts` and `lib/rules/*` are unchanged. The v0.1 byte-identical regression and the v0.2 tests (including the 288-profile spread test) pass, and RTINGS stays separate evidence.

**Website check** (isolated dev server, port 3885, desktop 1440 and mobile 390):

- `/mattress/bear-elite-hybrid` and `/mattress/casper-cooling-select` show "Independent testing by RTINGS" with the RTINGS link, RTINGS' own dates kept apart from "Data retrieved by us", the firmness value as RTINGS wrote it (for example "Medium (42 Pa/mm)"), only metrics that exist, no zeros, and the provenance line naming the run id.
- The page made no requests to RTINGS hosts and rendered no RTINGS image. (At the time of that check; superseded 2026-10-08 by the credited-photo rules in §16.)
- `/mattress/helix-midnight-luxe`, which is pending, shows no panel.
- No horizontal overflow at either width.

**Next scheduled sync.** With the 14-day gate, the next run is due at 2026-10-21T11:17:23Z (`nextDueAt` = last successful completion + 14 days). The daily cron only does it when Supabase is configured; until then a sync is run by hand with `node scripts/sync-rtings.js`.

**Not done in this pass.**

- Recording catalog-side RTINGS provenance fields.
- Brand og:image references (`source_only`).

Both need edits to `lib/data/mattress-catalog.json`, and reading or editing that file for this purpose was refused by the session's permission gate. Neither affects the evidence panel, which reads the snapshot. RTINGS `mainImageUrl` references are stored as `source_only` rows in the store and are not displayed.

## 18. On the website

**Builder (`lib/rtings/evidence.ts`, `components/product/RtingsEvidence.tsx`, `app/mattress/[id]/page.tsx`, methodology "Data & sources").**

- **Read path.** A mattress page calls `getPublishedEvidence(id)`: `unstable_cache` (key `rtings-evidence-v1`, tag `rtings-evidence`, `revalidate` 21600 s) around `loadPublishedEvidence(id, repo)`, which calls `repo.getPublishedForMattress(id)`. The repository is Supabase when `SUPABASE_URL` and `SUPABASE_SECRET_KEY` are set, otherwise the read-only snapshot `react-version/lib/data/rtings-evidence.json`. `evidence.ts` never imports the Apify client, so no page request can start a scrape. A sync that publishes calls `revalidateTag('rtings-evidence', 'max')`. Otherwise the cache refreshes within 6 hours, and the page itself revalidates hourly.
- **What reaches the page.** Only rows with `status = 'published'`, `mattress_id` equal to the page's mattress, `match_confidence` `exact` or `high`, `source = 'RTINGS'` and an `https://www.rtings.com/` review URL. If several qualify, the one with the latest RTINGS update wins. Metrics appear only where a score row exists with a raw text or a number, so a missing metric is absent, never `0`. The credited photo (`photo`) follows the rules in §16; `licensedImages` is for photos with a documented license. The panel's source line says the page photo is RTINGS' and links to their review. Any repository error is logged and returns `null`, and the page renders without the panel.
- **Panel ("Independent testing by RTINGS").** It sits between Specifications and Independent notes. It shows RTINGS' overall score when returned, otherwise its first measurement (for mattresses, the firmness figure such as `54 Pa/mm`, with RTINGS' verbatim text "Medium-Firm (54 Pa/mm)"). It then shows the remaining metrics as RTINGS wrote them, plus verdict, pros, cons and mixed summary only when returned, and RTINGS' "recommended for" list. Dates are kept apart: "RTINGS review published/updated" (or first published and last updated when they differ) comes from RTINGS' own dates, and "Data retrieved by us" comes from `retrieved_at`. A re-sync never makes the review look new. The copy says Mattress Match Score did not test the mattress and that the results don't change the Match Score. The review link uses `target="_blank" rel="noopener noreferrer nofollow"`. The provenance line names the Apify actor and, when known, the run id.
- **Fallback with no published record.** Six catalog entries carry RTINGS figures cross-checked by hand before the pipeline existed (`firmnessPaPerMm`, `firmnessLabelFromRtings`, `rtingsRecommendedFor`, an RTINGS `reviewSources` link and `rtingsCrossCheckedAt`). `catalogRtingsCrossCheck(entry)` shows those in the same panel. It labels the date "Checked against RTINGS by us", shows "Not on file" for the RTINGS publish date because the catalog never stored it, and lists only the fields that exist. An entry with neither source gets no panel.
- **Methodology.** The "Data & sources" section states what the pipeline does and whether it is live, using `loadRtingsPipelineStatus()`. That function reports the store kind and the published count, and makes no Apify call. While Supabase isn't configured, the page says scheduled syncing is built but not live, and that syncs are run by hand and ship with each site update. It never claims an automated sync is running.
