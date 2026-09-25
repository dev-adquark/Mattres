import { NextResponse } from 'next/server';
import fs from 'fs';
import { isApifyConfigured } from '@/lib/apify/apifyClient';
import { RAW_PATH, PROPOSALS_PATH } from '@/lib/apify/rtingsSync';
import { getSupabaseClient, isDbConfigured } from '@/lib/db/supabaseClient';

/**
 * Read-only status check - never calls Apify. Reports whether Apify/the
 * database are configured, the real row counts in `mattresses` and
 * `rtings_review_required`, and the most recent sync runs from
 * `rtings_sync_runs` - so this can be checked cheaply (no API quota
 * spent) before deciding to trigger a real sync via
 * POST /api/admin/rtings/sync.
 */
export async function GET(request) {
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

  function readCount(filePath) {
    if (!fs.existsSync(filePath)) return { exists: false, count: 0, lastModified: null };
    try {
      const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      const stat = fs.statSync(filePath);
      return { exists: true, count: Array.isArray(parsed) ? parsed.length : 0, lastModified: stat.mtime.toISOString() };
    } catch {
      return { exists: true, count: 0, lastModified: null, corrupt: true };
    }
  }

  const client = getSupabaseClient();
  let db = { configured: isDbConfigured() ? 'DB_CONFIGURED' : 'DB_NOT_CONFIGURED', mattressCount: null, reviewRequiredOpenCount: null, recentRuns: [] };
  if (client) {
    const [{ count: mattressCount }, { count: reviewRequiredOpenCount }, { data: recentRuns }] = await Promise.all([
      client.from('mattresses').select('*', { count: 'exact', head: true }),
      client.from('rtings_review_required').select('*', { count: 'exact', head: true }).eq('resolved', false),
      client.from('rtings_sync_runs').select('id, started_at, finished_at, status, trigger_source, fetched, normalized, matched, review_required, unmatched, errors, error_message').order('started_at', { ascending: false }).limit(5),
    ]);
    db = { ...db, mattressCount, reviewRequiredOpenCount, recentRuns: recentRuns || [] };
  }

  return NextResponse.json({
    success: true,
    data: {
      apifyConfigured: isApifyConfigured() ? 'APIFY_CONFIGURED' : 'APIFY_NOT_CONFIGURED',
      database: db,
      rawSnapshot: readCount(RAW_PATH),
      // Only meaningful when the database isn't configured - see
      // lib/apify/rtingsSync.js's fallback path.
      pendingProposalsFile: readCount(PROPOSALS_PATH),
    },
    meta: { checkedAt: new Date().toISOString() },
    error: null,
  });
}
