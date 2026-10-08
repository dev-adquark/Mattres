-- RTINGS evidence pipeline (crawlerbros/rtings-scraper, actor dCa1uCOn8ZtEkUamC).
--
-- Separates the three layers the pipeline must never mix:
--   raw        rtings_raw_records   exactly what Apify returned, append-only,
--                                   one row per dataset item per sync run
--   normalized rtings_reviews       one row per RTINGS review (deduplicated
--              rtings_scores        by product_id and canonical review_url),
--              rtings_images        typed score rows, source image references
--   published  rtings_reviews.status = 'published' (the only rows the site reads)
-- plus rtings_change_log (append-only audit of every fingerprint change) and
-- extra audit columns on the existing rtings_sync_runs table.
--
-- RTINGS is evidence only. Nothing here feeds the Match Score engine
-- (lib/scoreEngine.ts + lib/rules/*.json); no engine input reads these tables.
--
-- Conventions follow 0001-0004: bigserial ids, text keys for catalog ids
-- (mattresses.id), timestamptz everywhere, RLS enabled with every grant to
-- anon/authenticated revoked (server-only access through SUPABASE_SECRET_KEY,
-- which bypasses RLS). No policies are created on purpose.
--
-- Idempotent: scripts/apply-db-migration.js re-applies every migration in
-- order on each run, so every statement here is safe to repeat.
--
-- The legacy rtings_review_required table (0001/0003) is kept read-only for
-- history. The new pipeline records ambiguous matches as rtings_reviews rows
-- with status = 'pending' and match_candidates instead of writing there.

-- ---------------------------------------------------------------------------
-- Shared helpers
-- ---------------------------------------------------------------------------

create or replace function public.rtings_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- Raw evidence and the change log are history: rows can be added, never
-- edited or removed (not even by the service role, which bypasses RLS but
-- not triggers).
create or replace function public.rtings_forbid_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception '% is append-only (% rejected)', tg_table_name, tg_op
    using errcode = 'insufficient_privilege';
end;
$$;

-- ---------------------------------------------------------------------------
-- rtings_sync_runs: extend the existing audit table (0001/0002)
-- ---------------------------------------------------------------------------
-- Existing columns stay: started_at, finished_at, status, trigger_source
-- ('cron' | 'admin' | 'cli'), fetched, normalized, matched, review_required,
-- unmatched, errors, error_message. The legacy count columns are no longer
-- written by the new pipeline; the records_* columns replace them.

alter table public.rtings_sync_runs
  add column if not exists trigger text,
  add column if not exists actor_id text,
  add column if not exists actor_input jsonb,
  add column if not exists apify_run_id text,
  add column if not exists dataset_id text,
  add column if not exists apify_status text,
  add column if not exists coverage text,
  add column if not exists records_received integer,
  add column if not exists records_valid integer,
  add column if not exists records_rejected integer,
  add column if not exists records_created integer,
  add column if not exists records_updated integer,
  add column if not exists records_unchanged integer,
  add column if not exists records_failed integer,
  add column if not exists records_pending integer,
  add column if not exists records_new_candidate integer,
  add column if not exists records_source_missing integer,
  add column if not exists records_published integer,
  add column if not exists safety_flags jsonb not null default '[]'::jsonb,
  add column if not exists error_summary jsonb,
  add column if not exists estimated_cost_usd numeric(10, 4),
  add column if not exists completed_at timestamptz;

-- Backfill trigger for rows written before this migration.
update public.rtings_sync_runs
set trigger = case when trigger_source = 'cron' then 'cron' else 'manual' end
where trigger is null and trigger_source is not null;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'rtings_sync_runs_trigger_check') then
    alter table public.rtings_sync_runs
      add constraint rtings_sync_runs_trigger_check check (trigger is null or trigger in ('cron', 'manual'));
  end if;
  -- running         lock held, pipeline in progress (0002's unique index)
  -- awaiting_apify  Apify run started but not finished inside the function's
  --                 time budget; the next tick resumes it by apify_run_id
  -- success         every received record processed, publication applied
  -- partial         publication applied, some records rejected/failed
  -- held            safety gate withheld publication; previous data kept
  -- failed          Apify/DB/structural failure; previous data kept
  if not exists (select 1 from pg_constraint where conname = 'rtings_sync_runs_status_check') then
    alter table public.rtings_sync_runs
      add constraint rtings_sync_runs_status_check
      check (status in ('running', 'awaiting_apify', 'success', 'partial', 'held', 'failed'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'rtings_sync_runs_coverage_check') then
    alter table public.rtings_sync_runs
      add constraint rtings_sync_runs_coverage_check
      check (coverage is null or coverage in ('full_category', 'targeted_urls', 'partial'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'rtings_sync_runs_counts_check') then
    alter table public.rtings_sync_runs
      add constraint rtings_sync_runs_counts_check check (
        coalesce(records_received, 0) >= 0 and coalesce(records_valid, 0) >= 0
        and coalesce(records_rejected, 0) >= 0 and coalesce(records_created, 0) >= 0
        and coalesce(records_updated, 0) >= 0 and coalesce(records_unchanged, 0) >= 0
        and coalesce(records_failed, 0) >= 0 and coalesce(estimated_cost_usd, 0) >= 0
      );
  end if;
end;
$$;

create index if not exists idx_rtings_sync_runs_started_at on public.rtings_sync_runs (started_at desc);
create index if not exists idx_rtings_sync_runs_status_completed on public.rtings_sync_runs (status, completed_at desc);
create index if not exists idx_rtings_sync_runs_apify_run_id on public.rtings_sync_runs (apify_run_id) where apify_run_id is not null;

-- ---------------------------------------------------------------------------
-- rtings_reviews: one normalized row per RTINGS review
-- ---------------------------------------------------------------------------

create table if not exists public.rtings_reviews (
  id bigserial primary key,
  -- Null until matched with confidence; never guessed.
  mattress_id text references public.mattresses(id) on delete set null,
  source text not null default 'RTINGS',
  source_type text not null default 'independent_review',
  -- Identity as RTINGS publishes it.
  brand text not null,
  model text not null,
  product_name text not null,
  brand_key text not null,
  model_key text not null,
  brand_slug text,
  model_slug text,
  product_id text not null,
  review_url text not null,
  product_url text,
  category text,
  record_type text,
  test_bench_name text,
  test_bench_id text,
  -- Review content. Null = the actor did not return it (never '' or 0).
  overall_score numeric(4, 2),
  verdict text,
  pros text[],
  cons text[],
  mixed_summary text,
  recommended_for text[] not null default '{}',
  -- RTINGS dates (source) vs our retrieval date - never conflated.
  published_at timestamptz,
  source_updated_at timestamptz,
  retrieved_at timestamptz not null,
  -- Provenance.
  apify_actor_id text not null,
  apify_run_id text,
  dataset_id text,
  sync_run_id bigint references public.rtings_sync_runs(id) on delete set null,
  -- Change detection.
  fingerprint text not null,
  fingerprint_version smallint not null default 1,
  -- Lifecycle.
  status text not null default 'pending',
  status_reason text,
  match_method text,
  match_confidence text,
  match_candidates text[],
  resolution_note text,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  site_published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint rtings_reviews_review_url_key unique (review_url),
  constraint rtings_reviews_product_id_key unique (product_id),
  constraint rtings_reviews_source_check check (source = 'RTINGS'),
  constraint rtings_reviews_source_type_check check (source_type = 'independent_review'),
  constraint rtings_reviews_review_url_check check (review_url ~ '^https://www\.rtings\.com/'),
  constraint rtings_reviews_overall_score_check check (overall_score is null or (overall_score >= 0 and overall_score <= 10)),
  constraint rtings_reviews_fingerprint_check check (fingerprint ~ '^[0-9a-f]{64}$'),
  constraint rtings_reviews_status_check check (
    status in ('pending', 'validated', 'published', 'rejected', 'changed', 'new_candidate', 'source_missing')
  ),
  constraint rtings_reviews_match_method_check check (
    match_method is null or match_method in ('review_url', 'product_id_alias', 'brand_model', 'manual')
  ),
  constraint rtings_reviews_match_confidence_check check (
    match_confidence is null or match_confidence in ('exact', 'high', 'ambiguous', 'none')
  ),
  -- A review can only be published when it is attached to a catalog product.
  constraint rtings_reviews_published_needs_match check (
    status <> 'published' or (mattress_id is not null and match_confidence in ('exact', 'high'))
  )
);

create index if not exists idx_rtings_reviews_mattress_published on public.rtings_reviews (mattress_id) where status = 'published';
create index if not exists idx_rtings_reviews_status on public.rtings_reviews (status, updated_at desc);
create index if not exists idx_rtings_reviews_brand_model on public.rtings_reviews (brand_key, model_key);
create index if not exists idx_rtings_reviews_last_seen on public.rtings_reviews (last_seen_at);
create index if not exists idx_rtings_reviews_source_updated on public.rtings_reviews (source_updated_at desc nulls last);

drop trigger if exists trg_rtings_reviews_updated_at on public.rtings_reviews;
create trigger trg_rtings_reviews_updated_at
  before update on public.rtings_reviews
  for each row execute function public.rtings_touch_updated_at();

-- ---------------------------------------------------------------------------
-- rtings_scores: one typed row per metric per review
-- ---------------------------------------------------------------------------

create table if not exists public.rtings_scores (
  id bigserial primary key,
  review_id bigint not null references public.rtings_reviews(id) on delete cascade,
  metric_key text not null,
  metric_label text not null,
  -- Exactly the text RTINGS showed, e.g. 'Medium-Firm (54 Pa/mm)'.
  raw_value text,
  -- Parsed number, or null when the metric is not numeric / not parseable.
  value numeric,
  -- '0-10' for a rating, a unit such as 'Pa/mm' for a measurement, null for labels.
  scale text,
  value_kind text not null,
  source text not null default 'RTINGS',
  retrieved_at timestamptz not null,
  apify_run_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint rtings_scores_review_metric_key unique (review_id, metric_key),
  constraint rtings_scores_metric_key_check check (metric_key ~ '^[a-z0-9_]+$'),
  constraint rtings_scores_source_check check (source = 'RTINGS'),
  constraint rtings_scores_value_kind_check check (value_kind in ('score_0_10', 'measurement', 'label', 'boolean')),
  constraint rtings_scores_value_check check (
    value is null
    or (value_kind = 'score_0_10' and value >= 0 and value <= 10)
    or (value_kind = 'measurement' and value >= 0)
    or (value_kind = 'boolean' and value in (0, 1))
  )
);

create index if not exists idx_rtings_scores_metric_value on public.rtings_scores (metric_key, value desc nulls last);

drop trigger if exists trg_rtings_scores_updated_at on public.rtings_scores;
create trigger trg_rtings_scores_updated_at
  before update on public.rtings_scores
  for each row execute function public.rtings_touch_updated_at();

-- ---------------------------------------------------------------------------
-- rtings_raw_records: append-only raw actor output, one row per item per run
-- ---------------------------------------------------------------------------

create table if not exists public.rtings_raw_records (
  id bigserial primary key,
  sync_run_id bigint not null references public.rtings_sync_runs(id) on delete restrict,
  item_index integer not null,
  apify_actor_id text not null,
  apify_run_id text,
  dataset_id text,
  -- Extracted only for lookup; null when the raw item lacks them.
  product_id text,
  review_url text,
  payload jsonb not null,
  payload_sha256 text not null,
  validation_status text not null,
  validation_problems text[] not null default '{}',
  received_at timestamptz not null default now(),
  constraint rtings_raw_records_run_item_key unique (sync_run_id, item_index),
  constraint rtings_raw_records_item_index_check check (item_index >= 0),
  constraint rtings_raw_records_sha_check check (payload_sha256 ~ '^[0-9a-f]{64}$'),
  constraint rtings_raw_records_validation_check check (validation_status in ('valid', 'rejected'))
);

create index if not exists idx_rtings_raw_records_product on public.rtings_raw_records (product_id, received_at desc);
create index if not exists idx_rtings_raw_records_apify_run on public.rtings_raw_records (apify_run_id);

drop trigger if exists trg_rtings_raw_records_append_only on public.rtings_raw_records;
create trigger trg_rtings_raw_records_append_only
  before update or delete on public.rtings_raw_records
  for each row execute function public.rtings_forbid_mutation();

-- ---------------------------------------------------------------------------
-- rtings_images: source image references (never mirrored)
-- ---------------------------------------------------------------------------

create table if not exists public.rtings_images (
  id bigserial primary key,
  review_id bigint not null references public.rtings_reviews(id) on delete cascade,
  source text not null default 'RTINGS',
  -- The RTINGS review page the image belongs to.
  source_url text not null,
  image_url text not null,
  -- Which actor field it came from, e.g. 'mainImageUrl'.
  source_field text not null,
  alt text,
  scraped_at timestamptz not null,
  -- 'source_only' = we only hold the reference; the site must not display it.
  -- 'licensed' requires a documented license_note.
  usage_status text not null default 'source_only',
  license_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint rtings_images_review_image_key unique (review_id, image_url),
  constraint rtings_images_source_check check (source = 'RTINGS'),
  constraint rtings_images_image_url_check check (image_url ~ '^https://'),
  constraint rtings_images_usage_status_check check (usage_status in ('source_only', 'licensed')),
  constraint rtings_images_license_note_check check (usage_status <> 'licensed' or license_note is not null)
);

drop trigger if exists trg_rtings_images_updated_at on public.rtings_images;
create trigger trg_rtings_images_updated_at
  before update on public.rtings_images
  for each row execute function public.rtings_touch_updated_at();

-- ---------------------------------------------------------------------------
-- rtings_change_log: append-only audit of fingerprint changes
-- ---------------------------------------------------------------------------

create table if not exists public.rtings_change_log (
  id bigserial primary key,
  review_id bigint not null references public.rtings_reviews(id) on delete restrict,
  old_fingerprint text not null,
  new_fingerprint text not null,
  -- JSON array of changed field paths, e.g. ["scores.firmness_level", "images"].
  changed_fields jsonb not null,
  old_values jsonb not null,
  new_values jsonb not null,
  detected_at timestamptz not null default now(),
  apify_run_id text,
  sync_run_id bigint references public.rtings_sync_runs(id) on delete set null,
  -- Whether the change went live in that run or was held by the safety gate.
  outcome text not null,
  constraint rtings_change_log_fingerprints_differ check (old_fingerprint <> new_fingerprint),
  constraint rtings_change_log_changed_fields_check check (jsonb_typeof(changed_fields) = 'array'),
  constraint rtings_change_log_outcome_check check (outcome in ('published', 'held', 'recorded'))
);

create index if not exists idx_rtings_change_log_review on public.rtings_change_log (review_id, detected_at desc);
create index if not exists idx_rtings_change_log_detected on public.rtings_change_log (detected_at desc);

drop trigger if exists trg_rtings_change_log_append_only on public.rtings_change_log;
create trigger trg_rtings_change_log_append_only
  before update or delete on public.rtings_change_log
  for each row execute function public.rtings_forbid_mutation();

-- ---------------------------------------------------------------------------
-- Lockdown (same as 0004): server-only, no public/anon policies.
-- ---------------------------------------------------------------------------

alter table public.rtings_reviews enable row level security;
alter table public.rtings_scores enable row level security;
alter table public.rtings_raw_records enable row level security;
alter table public.rtings_images enable row level security;
alter table public.rtings_change_log enable row level security;

revoke all on table public.rtings_reviews from anon, authenticated;
revoke all on table public.rtings_scores from anon, authenticated;
revoke all on table public.rtings_raw_records from anon, authenticated;
revoke all on table public.rtings_images from anon, authenticated;
revoke all on table public.rtings_change_log from anon, authenticated;

revoke all on sequence public.rtings_reviews_id_seq from anon, authenticated;
revoke all on sequence public.rtings_scores_id_seq from anon, authenticated;
revoke all on sequence public.rtings_raw_records_id_seq from anon, authenticated;
revoke all on sequence public.rtings_images_id_seq from anon, authenticated;
revoke all on sequence public.rtings_change_log_id_seq from anon, authenticated;

revoke all on function public.rtings_touch_updated_at() from public, anon, authenticated;
revoke all on function public.rtings_forbid_mutation() from public, anon, authenticated;
