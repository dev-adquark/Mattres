import { NextResponse } from 'next/server';
import catalog from '@/lib/data/mattress-catalog.json';
import { isRecordVerified, missingFields } from '@/lib/dataIntegrity';

const STALE_AFTER_DAYS = 180;

/**
 * Scheduled verification-refresh endpoint, called by Vercel Cron per the
 * schedule in vercel.json. Requires the real CRON_SECRET Vercel sends as
 * a Bearer token on scheduled invocations - a manual request without the
 * correct secret gets a real 401, not a fabricated "verified" response.
 *
 * This does not itself re-scrape or re-confirm product data (this
 * deployment has no outbound access to manufacturer/retailer sites to do
 * that with) - it computes and reports the same real freshness audit
 * scripts/verify-catalog-freshness.js already does standalone, so the
 * schedule has something genuinely real to run on a cadence, honestly
 * reporting what still needs a human to actually go verify.
 */
export async function GET(request) {
  const authHeader = request.headers.get('authorization');
  const expected = process.env.CRON_SECRET;

  if (!expected) {
    return NextResponse.json(
      { error: 'CRON_SECRET is not configured on this deployment.' },
      { status: 500 }
    );
  }
  if (authHeader !== `Bearer ${expected}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const now = new Date();
  const stale = [];
  const neverVerified = [];
  const fresh = [];

  for (const entry of catalog) {
    if (!isRecordVerified(entry)) {
      neverVerified.push({ id: entry.id, brand: entry.brand, model: entry.model, missing: missingFields(entry) });
      continue;
    }
    const ageDays = Math.round((now - new Date(entry.lastVerified)) / (1000 * 60 * 60 * 24));
    if (ageDays > STALE_AFTER_DAYS) {
      stale.push({ id: entry.id, brand: entry.brand, model: entry.model, ageDays, sourceUrl: entry.sourceUrl });
    } else {
      fresh.push({ id: entry.id, ageDays });
    }
  }

  return NextResponse.json({
    ranAt: now.toISOString(),
    totalCatalogEntries: catalog.length,
    freshCount: fresh.length,
    staleCount: stale.length,
    neverVerifiedCount: neverVerified.length,
    stale,
    neverVerified,
  });
}
