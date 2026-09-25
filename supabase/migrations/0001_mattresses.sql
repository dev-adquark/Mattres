-- Real mattress catalog + RTINGS sync bookkeeping.
--
-- Design: relational columns for the fields the app actually queries/
-- filters/sorts on (brand, type, price, verification status), plus a
-- `data` JSONB column holding the complete entry - the schema has grown
-- organically with many optional, evolving fields (firmnessNote,
-- priceBySize, rtingsRecommendedFor, etc.), and forcing every one of
-- those into its own normalized column right now would be a much larger
-- schema-design task than this migration needs to solve. Existing code
-- that reads `entry.someField` keeps working unchanged: the API layer
-- returns `{ ...row.data, id: row.id }` (see lib/db/mattressRepo.js).
--
-- rtings_sync_runs gives real overlap protection (a row with
-- status='running' blocks a new run from starting) and real run
-- history/logging, rather than nothing at all.
--
-- rtings_review_required persists near-miss matches (e.g. RTINGS's
-- "Helix Midnight Luxe 2025" vs. the catalog's "Helix Midnight") so they
-- are tracked, not silently lost between sync runs.

create table if not exists mattresses (
  id text primary key,
  brand text not null,
  model text not null,
  type text not null,
  price_usd numeric,
  price_from_usd numeric,
  height_in numeric,
  trial_days integer,
  warranty_years integer,
  warranty_lifetime boolean not null default false,
  source_url text,
  source_name text,
  last_verified timestamptz,
  verification_status text,
  sponsored boolean not null default false,
  data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_mattresses_brand on mattresses (brand);
create index if not exists idx_mattresses_type on mattresses (type);
create index if not exists idx_mattresses_verification_status on mattresses (verification_status);

create table if not exists rtings_sync_runs (
  id bigserial primary key,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status text not null default 'running', -- 'running' | 'success' | 'failed'
  trigger_source text, -- 'cron' | 'admin' | 'cli'
  fetched integer,
  normalized integer,
  matched integer,
  review_required integer,
  unmatched integer,
  errors integer,
  error_message text
);

create index if not exists idx_rtings_sync_runs_status on rtings_sync_runs (status);

create table if not exists rtings_review_required (
  id bigserial primary key,
  rtings_brand text not null,
  rtings_model text not null,
  review_url text not null,
  candidates text[],
  reason text,
  created_at timestamptz not null default now(),
  resolved boolean not null default false,
  unique (rtings_brand, rtings_model)
);
