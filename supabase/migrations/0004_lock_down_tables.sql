-- Lock catalog and RTINGS operational tables to trusted server-side access.
-- The application uses SUPABASE_SECRET_KEY only in server routes and this
-- key bypasses RLS. Do not add public/anon policies to these tables.
alter table public.mattresses enable row level security;
alter table public.rtings_sync_runs enable row level security;
alter table public.rtings_review_required enable row level security;

revoke all on table public.mattresses from anon, authenticated;
revoke all on table public.rtings_sync_runs from anon, authenticated;
revoke all on table public.rtings_review_required from anon, authenticated;

-- Keep this migration safe to rerun. No policies are created intentionally:
-- public browser access is not part of the current database architecture.
