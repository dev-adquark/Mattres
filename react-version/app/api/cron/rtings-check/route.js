import { NextResponse } from 'next/server';
import fs from 'fs';
import { RAW_PATH } from '@/lib/apify/rtingsSync';

const STALE_AFTER_DAYS = 30;

/**
 * Report-only cron endpoint, gated by the same CRON_SECRET Vercel Cron
 * already sends as a Bearer token for app/api/cron/verify-catalog. This
 * deliberately does NOT trigger a real Apify actor run on every cron
 * tick: doing so would spend real Apify quota/cost on a schedule without
 * anyone deciding that trade-off, and - per the platform caveat in
 * app/api/admin/rtings/sync/route.js - a cron-triggered run's raw-file
 * write wouldn't durably persist on Vercel's ephemeral filesystem
 * anyway. So this only reports how stale the last COMMITTED raw snapshot
 * is, so a human knows when to run `node scripts/sync-rtings.js` (or
 * call the admin sync endpoint) again. This route is not added to
 * vercel.json's cron schedule automatically - wiring it up means opting
 * into a recurring reminder, which is a deliberate choice left to
 * whoever owns the Apify account/cost, not something to enable silently.
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

  if (!fs.existsSync(RAW_PATH)) {
    return NextResponse.json({
      ranAt: new Date().toISOString(),
      status: 'never_synced',
      message: 'No RTINGS raw snapshot exists yet. Run `node scripts/sync-rtings.js` to create one.',
    });
  }

  const stat = fs.statSync(RAW_PATH);
  const ageDays = Math.round((Date.now() - stat.mtime.getTime()) / (1000 * 60 * 60 * 24));
  const stale = ageDays > STALE_AFTER_DAYS;

  return NextResponse.json({
    ranAt: new Date().toISOString(),
    status: stale ? 'stale' : 'fresh',
    lastSnapshotModifiedAt: stat.mtime.toISOString(),
    ageDays,
    staleAfterDays: STALE_AFTER_DAYS,
    message: stale
      ? `RTINGS snapshot is ${ageDays} days old (> ${STALE_AFTER_DAYS}-day threshold). Run node scripts/sync-rtings.js to refresh it.`
      : `RTINGS snapshot is ${ageDays} days old, within the ${STALE_AFTER_DAYS}-day freshness window.`,
  });
}
