# Production deployment checklist (Vercel + Supabase)

This app is a Next.js application in `react-version/`. Deploy that directory as the Vercel project root; do not deploy the repository root as a static site.

## 1. Vercel project

1. Import the GitHub repository into Vercel.
2. Set **Root Directory** to `react-version`.
3. Framework preset: Next.js. Build command: `npm run build`. Install command: `npm ci`.
4. Use the Node.js version supported by the Next.js version pinned in `package.json` (Node 20 or newer).
5. Deploy a preview first. Confirm homepage, `/find-match`, mattress detail pages, and API routes before assigning a production domain.

## 2. Environment variables

Add values in Vercel Project Settings → Environment Variables, selecting Preview and Production environments deliberately. Use `react-version/.env.example` as the variable-name inventory.

| Variable | When required | Handling |
|---|---|---|
| `SUPABASE_URL` | Live Supabase catalog | Server-side only |
| `SUPABASE_SECRET_KEY` | Server-side catalog reads/writes requiring elevated access | Secret; never use a `NEXT_PUBLIC_` prefix |
| `DIRECT_URL` | Only for the documented migration script | Secret; do not expose at runtime |
| `CRON_SECRET` | Vercel Cron endpoints | High-entropy secret |
| `ADMIN_API_SECRET` | Admin sync endpoints | Separate from cron secret |
| `APIFY_API_TOKEN` | RTINGS/Apify ingestion is enabled | Secret; rotate if exposed |
| `APIFY_RTINGS_ACTOR_ID` | Optional actor override | Non-secret configuration |

Do not paste secrets into source control, issues, logs, screenshots, or chat. Set separate credentials for Preview and Production. Never use a production database credential in local development.

## 3. Shared rate limiting

Shared rate limits live in Supabase PostgreSQL (the only production database): migration `0006_rate_limit.sql` adds the `rate_limit_counters` table and the atomic `rate_limit_hit` function, called server-side with `SUPABASE_SECRET_KEY`. No other database or cache provider is used. The match API and the admin/cron guards fail closed if the configured database errors; without Supabase configured (local development) a bounded in-memory counter is used.

- Review and apply the SQL migration using the project's documented migration script and a controlled database connection.
- Confirm expected tables, indexes, constraints, and Row Level Security policies exist.
- Confirm the server-side service credential is only imported by server-only modules and no API response returns it.
- Seed or import catalog entries with source URL, source date, and data-quality status.
- Test both live-database success and the documented static-catalog fallback. Make sure the UI does not label fallback or unverified values as live verified data.

## 5. Smoke tests after deployment

- Open the homepage and complete the match quiz on mobile and desktop.
- Verify results, score explanations, filters, and compare flow.
- Open a mattress detail URL directly (not only through client navigation).
- Check invalid quiz input, empty catalog results, and a database outage/fallback.
- Confirm admin and cron routes reject missing or incorrect authorization.
- Inspect browser network requests and built client assets for secret values.
- Check metadata, canonical URLs, sitemap, robots rules, and 404 handling.
- Review Vercel function logs for errors without logging profile data or secrets.

## 6. Go-live gate

Do not announce the site as production-ready until the Vercel build succeeds, smoke tests pass, database permissions are reviewed, product claims have sources, and privacy/affiliate disclosures are visible. A successful deployment alone does not validate mattress claims or the scoring model.
