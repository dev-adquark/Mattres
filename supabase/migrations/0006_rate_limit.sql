-- Shared, atomic rate-limit counters kept in Supabase PostgreSQL (the only
-- production database). One row per key and fixed window; the function does
-- the increment in a single statement so concurrent serverless instances
-- cannot race. Server-side only: the service key calls it over PostgREST.
create table if not exists public.rate_limit_counters (
  key text primary key,
  window_start timestamptz not null,
  hits integer not null default 0
);

alter table public.rate_limit_counters enable row level security;
revoke all on table public.rate_limit_counters from anon, authenticated;

create or replace function public.rate_limit_hit(p_key text, p_window_ms integer)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  current_hits integer;
begin
  insert into public.rate_limit_counters as c (key, window_start, hits)
  values (p_key, now(), 1)
  on conflict (key) do update
    set window_start = case
          when c.window_start + (p_window_ms || ' milliseconds')::interval <= now() then now()
          else c.window_start end,
        hits = case
          when c.window_start + (p_window_ms || ' milliseconds')::interval <= now() then 1
          else c.hits + 1 end
  returning hits into current_hits;

  -- Opportunistic cleanup keeps the table small (counters expire after an hour).
  if random() < 0.01 then
    delete from public.rate_limit_counters where window_start < now() - interval '1 hour';
  end if;
  return current_hits;
end;
$$;

revoke all on function public.rate_limit_hit(text, integer) from public, anon, authenticated;
grant execute on function public.rate_limit_hit(text, integer) to service_role;
