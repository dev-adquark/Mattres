import { NextResponse } from 'next/server';
import { guardAdminRequest } from '@/lib/adminAuth';
import type { AdminEnvelope } from '@/lib/adminAuth';
import { buildStatusReport, routeRepository } from '../_lib/syncRuntime';
import type { StatusReport } from '../_lib/syncRuntime';

/**
 * RTINGS sync observability (GET, ADMIN_API_SECRET bearer, rate-limited).
 * Never calls Apify and never writes. Answers brief section 29:
 *
 *   lastSuccessfulSyncAt   last success|partial run's completion time
 *   nextScheduledSyncAt    first daily 06:30 UTC tick at or after nextDueAt (lastSuccess + 14 days,
 *                          or the end of the held/failed backoff when that is later)
 *   dueReason              never_synced | interval_elapsed | resume_awaiting_apify | not_due |
 *                          held_awaiting_review | failed_backoff
 *   lastAttempt            newest finished run, its status and consecutive failures
 *   lastRun                status, counts (received/valid/rejected/created/updated/...),
 *                          safety flags, error summary, completion time
 *   recentRuns             last 5 runs, same shape
 *   reviewCounts           rtings_reviews rows per status
 *
 * Each store read degrades on its own: a failed read is listed in
 * storeErrors and the rest of the report is still real data.
 */
export const dynamic = 'force-dynamic';

export async function GET(request: Request): Promise<NextResponse<AdminEnvelope<StatusReport>>> {
  const denied = await guardAdminRequest(request, 'status');
  if (denied) return denied;

  const now = new Date();
  const report = await buildStatusReport(routeRepository(), now);
  return NextResponse.json<AdminEnvelope<StatusReport>>({
    success: true,
    data: report,
    meta: { checkedAt: now.toISOString() },
    error: null,
  });
}
