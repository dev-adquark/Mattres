/**
 * Test fixtures for the RTINGS pipeline. TEST-ONLY: nothing in app/,
 * components/ or the server path may import this folder.
 *
 * - `realRecords()` returns deep copies of the 20 records from a real
 *   crawlerbros/rtings-scraper run (rtings-sample.real.json is a byte-for-
 *   byte copy of repo-root data/raw/rtings-mattresses-raw.json).
 * - Every `synthetic*` helper derives a clearly synthetic edge case from a
 *   real record (malformed, missing, foreign domain, changed). They exist to
 *   exercise validation and change detection and are never presented as
 *   RTINGS data.
 */
import sample from './rtings-sample.real.json';
import type { MattressEntry } from '@/lib/types';
import type { RawRtingsRecord } from '../types';

type Raw = RawRtingsRecord & Record<string, unknown>;

const REAL: readonly Raw[] = sample as Raw[];

/** Deep copies of all 20 real actor records. */
export function realRecords(): Raw[] {
  return structuredClone(REAL) as Raw[];
}

/** Deep copy of one real record by RTINGS productId. Throws if absent (fixture typo). */
export function realRecord(productId: string): Raw {
  const found = REAL.find((r) => r.productId === productId);
  if (!found) throw new Error(`fixture: no real record with productId ${productId}`);
  return structuredClone(found) as Raw;
}

/** Real productIds used throughout the tests (all present in the sample). */
export const REAL_IDS = {
  allswellHybrid: '57836', // brand not in our catalog -> new_candidate
  tuftMint: '57746', // "Tuft and Needle" vs catalog "Tuft & Needle"
  purpleRestorePlus: '52697', // catalog reviewSources has this exact RTINGS URL
  casperCoolingSelect: '60405', // has firstPublishedAt
  bearEliteHybrid: '52386', // catalog reviewSources has this exact RTINGS URL
  helixMidnightLuxe2025: '105249', // catalog has "Midnight" and "Midnight Luxe" -> never an exact token match
  casperSnow: '101897',
  leesaOriginal: '52722',
  purpleMattress: '52701',
} as const;

/** A fixed receive time used as the pipeline's ingest clock in tests. */
export const RECEIVED_AT = '2026-09-25T13:05:00.000Z';

export const NORMALIZE_CTX = {
  apifyActorId: 'dCa1uCOn8ZtEkUamC',
  apifyRunId: 'TEST_RUN_fixture_1',
  datasetId: 'TEST_DATASET_fixture_1',
  receivedAt: RECEIVED_AT,
} as const;

// ---------------------------------------------------------------------------
// Synthetic edge cases (derived from real record 57836 unless stated)
// ---------------------------------------------------------------------------

function base(productId: string = REAL_IDS.allswellHybrid): Raw {
  return realRecord(productId);
}

export function syntheticWithout(field: string, productId?: string): Raw {
  const r = base(productId);
  delete r[field];
  return r;
}

export function syntheticForeignDomain(): Raw {
  const r = base();
  r.reviewUrl = 'https://www.example.com/mattress/reviews/allswell/hybrid-mattress';
  r.productUrl = r.reviewUrl;
  return r;
}

export function syntheticLookalikeDomain(): Raw {
  const r = base();
  r.reviewUrl = 'https://www.rtings.com.evil.example/mattress/reviews/allswell/hybrid-mattress';
  return r;
}

export function syntheticHttpUrl(): Raw {
  const r = base();
  r.reviewUrl = 'http://www.rtings.com/mattress/reviews/allswell/hybrid-mattress';
  return r;
}

export function syntheticNotAUrl(): Raw {
  const r = base();
  r.reviewUrl = 'not a url';
  return r;
}

export function syntheticNonMattressPath(): Raw {
  const r = base();
  r.reviewUrl = 'https://www.rtings.com/tv/reviews/lg/c4-oled';
  return r;
}

export function syntheticWrongCategory(): Raw {
  const r = base();
  r.category = 'tv';
  return r;
}

export function syntheticTestScoresNotObject(): Raw {
  const r = base();
  r.testScoresFlat = 'Firmness Level: Medium-Firm';
  return r;
}

export function syntheticNegativeMeasurement(): Raw {
  const r = base();
  r.testScoresFlat = { ...(r.testScoresFlat as Record<string, string>), 'Firmness Level': 'Medium-Firm (-54 Pa/mm)' };
  return r;
}

export function syntheticNaNMeasurement(): Raw {
  const r = base();
  r.testScoresFlat = { ...(r.testScoresFlat as Record<string, string>), 'Firmness Level': 'Medium-Firm (NaN Pa/mm)' };
  return r;
}

export function syntheticFutureDate(): Raw {
  const r = base();
  r.publishedAt = '2099-01-01 00:00:00 -0500';
  return r;
}

export function syntheticAncientDate(): Raw {
  const r = base();
  r.publishedAt = '1999-01-01 00:00:00 -0500';
  return r;
}

export function syntheticGarbageDate(): Raw {
  const r = base();
  r.publishedAt = 'yesterday-ish';
  return r;
}

export function syntheticForeignImage(): Raw {
  const r = base();
  r.mainImageUrl = 'https://cdn.example.com/allswell.jpg';
  return r;
}

export function syntheticUnknownField(): Raw {
  const r = base();
  r.surpriseField = 'drift';
  return r;
}

/** Same product, RTINGS reformatted the title (case/whitespace/query on URL). */
export function syntheticRetitled(productId: string = REAL_IDS.bearEliteHybrid): Raw {
  const r = base(productId);
  r.name = `  ${String(r.name).toUpperCase()}  `;
  r.reviewUrl = `${String(r.reviewUrl).replace('www.rtings.com', 'WWW.RTINGS.COM')}/?utm_source=x#top`;
  return r;
}

/** Same product id, one score changed (simulates an RTINGS retest). */
export function syntheticFirmnessChanged(productId: string = REAL_IDS.bearEliteHybrid, text = 'Firm (99 Pa/mm)'): Raw {
  const r = base(productId);
  r.testScoresFlat = { ...(r.testScoresFlat as Record<string, string>), 'Firmness Level': text };
  return r;
}

/** Same product id, new main image URL. */
export function syntheticImageChanged(productId: string = REAL_IDS.bearEliteHybrid): Raw {
  const r = base(productId);
  r.mainImageUrl = String(r.mainImageUrl).replace('design-small.jpg', 'design-medium.jpg');
  return r;
}

/** Same product id, only scrape metadata changed (must not change the fingerprint). */
export function syntheticRescrapedOnly(productId: string = REAL_IDS.bearEliteHybrid): Raw {
  const r = base(productId);
  r.scrapedAt = '2026-10-06T08:00:00.000000+00:00';
  r.commentCount = 42;
  return r;
}

/** Same product, every metric gone (schema drift / scraper breakage). */
export function syntheticScoresGone(productId: string): Raw {
  const r = base(productId);
  r.testScoresFlat = {};
  r.featuredTests = [];
  return r;
}

// ---------------------------------------------------------------------------
// Catalog
// ---------------------------------------------------------------------------

export type CatalogPick = Pick<MattressEntry, 'id' | 'brand' | 'model' | 'reviewSources'>;

function src(sourceUrl: string): MattressEntry['reviewSources'][number] {
  return { sourceName: 'RTINGS', sourceUrl };
}

/**
 * A small catalog slice with the same ids/brands/models/RTINGS URLs as the
 * real lib/data/mattress-catalog.json entries it mirrors, plus one clearly
 * synthetic duplicate used to provoke the "two catalog rows reduce to the
 * same tokens" ambiguity.
 */
export const TEST_CATALOG: CatalogPick[] = [
  { id: 'bear-elite-hybrid', brand: 'Bear', model: 'Elite Hybrid', reviewSources: [src('https://www.rtings.com/mattress/reviews/bear/elite-hybrid')] },
  { id: 'purple-restore-plus', brand: 'Purple', model: 'RestorePlus Hybrid', reviewSources: [src('https://www.rtings.com/mattress/reviews/purple/restoreplus-hybrid')] },
  { id: 'purple-restore', brand: 'Purple', model: 'Restore Hybrid', reviewSources: [] },
  { id: 'casper-cooling-select', brand: 'Casper', model: 'Cooling Select', reviewSources: [] },
  { id: 'casper-snow', brand: 'Casper', model: 'Snow', reviewSources: [] },
  { id: 'helix-midnight', brand: 'Helix', model: 'Midnight', reviewSources: [] },
  { id: 'helix-midnight-luxe', brand: 'Helix', model: 'Midnight Luxe', reviewSources: [] },
  { id: 'tuft-and-needle-mint-ii', brand: 'Tuft & Needle', model: 'Mint Mattress II', reviewSources: [] },
  { id: 'leesa-original', brand: 'Leesa', model: 'Original', reviewSources: [] },
];
