import { NextResponse } from 'next/server';
import { runRtingsSync } from '@/lib/apify/rtingsSync';
import { MAX_ITEMS_CAP } from '@/lib/apify/apifyClient';

/**
 * Protected, manually-triggered RTINGS sync. Reuses this project's only
 * existing auth primitive - a bearer secret compared with a
 * timing-naive-but-adequate-here equality check, the same pattern
 * app/api/cron/verify-catalog/route.js already uses for CRON_SECRET -
 * rather than inventing a separate admin auth system this project has no
 * other need for. A distinct ADMIN_API_SECRET (not CRON_SECRET itself)
 * keeps a leaked cron secret from also unlocking this endpoint.
 *
 * Deliberately NOT an unrestricted scraper proxy: maxItems is capped
 * (see apifyClient.MAX_ITEMS_CAP) regardless of what the caller requests,
 * and this is POST-only, secret-gated, and never reachable from the
 * client bundle.
 *
 * DURABILITY: when the database is configured (SUPABASE_URL +
 * SUPABASE_SECRET_KEY), a matched enrichment is upserted into the real
 * `mattresses` table - that write is genuinely durable in production,
 * unlike a plain file write to Vercel's ephemeral function filesystem.
 * The raw RTINGS snapshot this endpoint also writes to data/raw/*.json
 * on disk is NOT durable on Vercel (it doesn't survive past this
 * invocation/a cold start, and isn't committed to git from here) - that
 * file is a local/CI-only audit artifact; running
 * `node scripts/sync-rtings.js` is how it actually gets refreshed and
 * committed. When the database is NOT configured, matched proposals fall
 * back to the same git-committed-JSON-proposal staging this pipeline
 * used before the DB existed - see lib/apify/rtingsSync.js.
 */
export async function POST(request) {
  const authHeader = request.headers.get('authorization');
  const expected = process.env.ADMIN_API_SECRET;

  if (!expected) {
    return NextResponse.json(
      { success: false, data: null, meta: {}, error: { code: 'ADMIN_API_SECRET_NOT_CONFIGURED', message: 'ADMIN_API_SECRET is not configured on this deployment.' } },
      { status: 500 }
    );
  }
  if (authHeader !== `Bearer ${expected}`) {
    return NextResponse.json(
      { success: false, data: null, meta: {}, error: { code: 'UNAUTHORIZED', message: 'Missing or invalid admin bearer token.' } },
      { status: 401 }
    );
  }

  let body = {};
  try {
    body = await request.json();
  } catch {
    // A body-less POST is fine - falls through to runRtingsSync()'s own defaults.
  }

  const options = { triggerSource: 'admin' };
  if (typeof body.maxItems === 'number') options.maxItems = Math.min(body.maxItems, MAX_ITEMS_CAP);
  if (typeof body.searchQuery === 'string') {
    options.mode = 'search';
    options.searchQuery = body.searchQuery;
  } else if (typeof body.reviewUrl === 'string') {
    options.mode = 'url';
    options.reviewUrl = body.reviewUrl;
  }

  const result = await runRtingsSync(options);

  if (!result.success) {
    const status = result.code === 'SYNC_ALREADY_RUNNING' ? 409 : result.code === 'APIFY_NOT_CONFIGURED' ? 503 : result.code === 'INVALID_INPUT' ? 400 : 502;
    return NextResponse.json(
      { success: false, data: null, meta: {}, error: { code: result.code, message: result.message, retryable: result.retryable } },
      { status }
    );
  }

  return NextResponse.json({ success: true, data: result, meta: { ranAt: new Date().toISOString() }, error: null });
}
