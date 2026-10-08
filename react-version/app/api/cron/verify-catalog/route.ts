import { NextResponse } from 'next/server';
import { guardCronRequest } from '@/lib/cronGuard';
import { getCatalog } from '@/lib/db/mattressRepo';
import { isRecordVerified, missingFields } from '@/lib/dataIntegrity';
import type { RequiredField } from '@/lib/dataIntegrity';

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
export async function GET(request: Request): Promise<NextResponse> {
  const denied = await guardCronRequest(request);
  if (denied) return denied;

  const { entries: catalog, source: catalogSource } = await getCatalog();
  const now = new Date();
  const stale: { id: string; brand: string; model: string; ageDays: number; sourceUrl: string }[] = [];
  const neverVerified: { id: string; brand: string; model: string; missing: RequiredField[] }[] = [];
  const fresh: { id: string; ageDays: number }[] = [];
  const invalidDates: { id: string; brand: string; model: string; lastVerified: string | undefined }[] = [];

  for (const entry of catalog) {
    if (!isRecordVerified(entry)) {
      neverVerified.push({ id: entry.id, brand: entry.brand, model: entry.model, missing: missingFields(entry) });
      continue;
    }
    // isRecordVerified() guarantees lastVerified is present.
    const verifiedAt = new Date(entry.lastVerified as string);
    if (Number.isNaN(verifiedAt.getTime())) {
      invalidDates.push({ id: entry.id, brand: entry.brand, model: entry.model, lastVerified: entry.lastVerified });
      continue;
    }
    const ageDays = Math.round((now.getTime() - verifiedAt.getTime()) / (1000 * 60 * 60 * 24));
    if (ageDays > STALE_AFTER_DAYS) {
      stale.push({ id: entry.id, brand: entry.brand, model: entry.model, ageDays, sourceUrl: entry.sourceUrl });
    } else {
      fresh.push({ id: entry.id, ageDays });
    }
  }

  return NextResponse.json({
    ranAt: now.toISOString(),
    catalogSource,
    totalCatalogEntries: catalog.length,
    freshCount: fresh.length,
    staleCount: stale.length,
    neverVerifiedCount: neverVerified.length,
    invalidVerificationDateCount: invalidDates.length,
    stale,
    neverVerified,
    invalidDates,
  });
}
