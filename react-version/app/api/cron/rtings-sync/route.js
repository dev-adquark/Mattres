import { NextResponse } from 'next/server';
import { runRtingsSync } from '@/lib/apify/rtingsSync';

/**
 * Weekly scheduled RTINGS sync - see vercel.json's crons entry
 * ("0 6 * * 1", every Monday 6am UTC). Gated by the same CRON_SECRET
 * Vercel Cron already sends as a Bearer token for the other cron routes.
 *
 * Overlap protection, retry/backoff, and run logging all live in
 * runRtingsSync() / rtings_sync_runs (see lib/apify/rtingsSync.js) so
 * this route is a thin trigger, not where that logic lives - the admin
 * endpoint (POST /api/admin/rtings/sync) calls the exact same function
 * with the exact same safety behavior, just triggered manually instead
 * of on a schedule.
 *
 * Failure recovery: if APIFY_API_TOKEN is missing, or Apify is down, or
 * a run is already in progress, this returns a real non-200 status with
 * a structured error - it does not silently succeed, and critically, it
 * never touches the production catalog on failure (runRtingsSync() only
 * applies enrichment for records it successfully normalized and
 * matched; a failed run writes nothing to the `mattresses` table at
 * all).
 */
export async function GET(request) {
  const authHeader = request.headers.get('authorization');
  const expected = process.env.CRON_SECRET;

  if (!expected) {
    return NextResponse.json({ error: 'CRON_SECRET is not configured on this deployment.' }, { status: 500 });
  }
  if (authHeader !== `Bearer ${expected}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const result = await runRtingsSync({ mode: 'byCategory', sortBy: 'newest', maxItems: 50, triggerSource: 'cron' });

  if (!result.success) {
    const status = result.code === 'SYNC_ALREADY_RUNNING' ? 409 : result.code === 'APIFY_NOT_CONFIGURED' ? 503 : 502;
    return NextResponse.json({ ranAt: new Date().toISOString(), ...result }, { status });
  }

  return NextResponse.json({ ranAt: new Date().toISOString(), ...result });
}
