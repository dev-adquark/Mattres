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
 * PLATFORM CAVEAT: on Vercel, this writes the raw snapshot/proposals
 * files to the function instance's own ephemeral filesystem - that write
 * does not persist to the git repo or survive past this invocation/a
 * cold start. This endpoint is genuinely useful for an on-demand sync
 * whose JSON response you read directly (it returns the full real
 * result), but it is NOT how the committed data/raw/ snapshot actually
 * gets updated in production. That durable path is running
 * `node scripts/sync-rtings.js` locally or in CI (where the filesystem
 * write really does land in a repo you can commit) - the same
 * git-committed-file pattern this project already uses for its catalog
 * and raw ingestion data, not a new one invented for RTINGS.
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

  const options = {};
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
    const status = result.code === 'APIFY_NOT_CONFIGURED' ? 503 : result.code === 'INVALID_INPUT' ? 400 : 502;
    return NextResponse.json(
      { success: false, data: null, meta: {}, error: { code: result.code, message: result.message, retryable: result.retryable } },
      { status }
    );
  }

  return NextResponse.json({ success: true, data: result, meta: { ranAt: new Date().toISOString() }, error: null });
}
