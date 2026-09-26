-- A review_required row previously only had a boolean `resolved` flag -
-- flipping it to true with no trace of WHAT it was resolved to, or WHY,
-- would make a real identity-match decision unauditable after the fact.
-- These columns make the resolution itself a real, inspectable record:
-- which catalog entry (if any) it was matched to, and the reasoning
-- that justified it (or, for a case left open, why it still isn't
-- provable from available data).
alter table rtings_review_required
  add column if not exists resolved_catalog_id text references mattresses(id),
  add column if not exists resolution_note text;
