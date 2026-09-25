import { NextResponse } from 'next/server';
import fs from 'fs';
import { isApifyConfigured } from '@/lib/apify/apifyClient';
import { RAW_PATH, PROPOSALS_PATH } from '@/lib/apify/rtingsSync';

/**
 * Read-only status check - never calls Apify. Reports whether the
 * integration is configured and what the last sync actually produced,
 * so this can be checked cheaply (no API quota spent) before deciding
 * to trigger a real sync via POST /api/admin/rtings/sync.
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

  return NextResponse.json({
    success: true,
    data: {
      apifyConfigured: isApifyConfigured() ? 'APIFY_CONFIGURED' : 'APIFY_NOT_CONFIGURED',
      rawSnapshot: readCount(RAW_PATH),
      pendingProposals: readCount(PROPOSALS_PATH),
    },
    meta: { checkedAt: new Date().toISOString() },
    error: null,
  });
}
