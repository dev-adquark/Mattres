import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

vi.mock('next/cache', () => ({
  unstable_cache: <T extends (...args: never[]) => unknown>(fn: T) => fn,
  revalidateTag: vi.fn(),
}));

import catalog from '@/lib/data/mattress-catalog.json';
import type { MattressEntry } from '@/lib/types';
import { catalogRtingsCrossCheck } from '@/lib/rtings/evidence';
import type { RtingsEvidence as RtingsEvidenceData } from '@/lib/rtings/types';
import { RtingsEvidence } from './RtingsEvidence';

const entries = (Array.isArray(catalog) ? catalog : (catalog as { entries: unknown[] }).entries) as MattressEntry[];
const byId = (id: string): MattressEntry => {
  const e = entries.find((x) => x.id === id);
  if (!e) throw new Error(`catalog entry ${id} missing`);
  return e;
};

/** Shaped like the pipeline's output for the real Allswell Hybrid sample record. */
const EVIDENCE: RtingsEvidenceData = {
  mattressId: 'example-id',
  source: 'RTINGS',
  sourceType: 'independent_review',
  reviewUrl: 'https://www.rtings.com/mattress/reviews/allswell/hybrid-mattress',
  productName: 'Allswell Hybrid',
  overallScore: null,
  verdict: null,
  pros: null,
  cons: null,
  mixedSummary: null,
  recommendedFor: ['Side Sleeping', 'Back Sleeping'],
  metrics: [
    { key: 'mattress_type', label: 'Mattress Type', rawValue: 'Hybrid', value: null, scale: null, kind: 'label' },
    { key: 'bed_in_a_box', label: 'Bed-In-A-Box', rawValue: 'Yes', value: 1, scale: null, kind: 'boolean' },
    { key: 'firmness_level', label: 'Firmness Level', rawValue: 'Medium-Firm (54 Pa/mm)', value: 54, scale: 'Pa/mm', kind: 'measurement' },
  ],
  licensedImages: [],
    photo: null,
  publishedAt: '2026-01-30T17:38:27.000Z',
  sourceUpdatedAt: '2026-01-30T17:38:27.000Z',
  retrievedAt: '2026-09-25T13:02:20.105Z',
  testBenchName: '1.2',
  provenance: { apifyActorId: 'dCa1uCOn8ZtEkUamC', apifyRunId: null, datasetId: null },
};

describe('catalogRtingsCrossCheck', () => {
  it('uses only the RTINGS fields the catalog actually holds', () => {
    const check = catalogRtingsCrossCheck(byId('casper-snow'));
    expect(check).toEqual({
      mattressId: 'casper-snow',
      reviewUrl: 'https://www.rtings.com/mattress/reviews/casper/snow',
      firmnessLabel: 'Medium',
      firmnessPaPerMm: 47,
      recommendedFor: [],
      crossCheckedAt: '2026-09-25T11:54:51.405Z',
    });
  });

  it('keeps a missing firmness label null (Big Fig) instead of guessing one', () => {
    const check = catalogRtingsCrossCheck(byId('big-fig-classic'));
    expect(check?.firmnessLabel).toBeNull();
    expect(check?.firmnessPaPerMm).toBe(47);
  });

  it('returns null for an entry with no RTINGS cross-check', () => {
    const without = entries.find((e) => !e.rtingsCrossCheckedAt);
    expect(without).toBeDefined();
    expect(catalogRtingsCrossCheck(without as MattressEntry)).toBeNull();
  });

  it('exists for exactly the six cross-checked catalog entries', () => {
    expect(entries.filter((e) => catalogRtingsCrossCheck(e)).map((e) => e.id).sort()).toEqual(
      ['bear-elite-hybrid', 'big-fig-classic', 'casper-snow', 'leesa-original', 'purple-mattress', 'purple-restore-plus'].sort(),
    );
  });
});

describe('<RtingsEvidence>', () => {
  it('renders nothing without a source', () => {
    expect(renderToStaticMarkup(<RtingsEvidence name="X" evidence={null} crossCheck={null} />)).toBe('');
  });

  it('attributes RTINGS, links the review safely and keeps RTINGS dates apart from retrieval', () => {
    const html = renderToStaticMarkup(<RtingsEvidence name="Allswell Hybrid" evidence={EVIDENCE} crossCheck={null} />);
    expect(html).toContain('Independent testing');
    expect(html).toContain('by RTINGS');
    expect(html).toMatch(/href="https:\/\/www\.rtings\.com\/mattress\/reviews\/allswell\/hybrid-mattress"[^>]*rel="noopener noreferrer nofollow"/);
    expect(html).toContain('RTINGS review published/updated');
    expect(html).toContain('January 30, 2026');
    expect(html).toContain('Data retrieved by us');
    expect(html).toContain('September 25, 2026');
    expect(html).toContain('Medium-Firm (54 Pa/mm)');
    expect(html).toContain('Hybrid');
    expect(html).not.toMatch(/we tested|tested by us|our lab/i);
    expect(html).not.toContain('<img');
    // RTINGS' section headings (scraped as recommendedFor) are never shown as a recommendation.
    expect(html).not.toMatch(/suited to|Side Sleeping/);
  });

  it('shows no overall score, verdict or pros when RTINGS returned none (no zero-filling)', () => {
    const html = renderToStaticMarkup(<RtingsEvidence name="Allswell Hybrid" evidence={EVIDENCE} crossCheck={null} />);
    expect(html).not.toContain('Overall, by RTINGS');
    expect(html).not.toContain('RTINGS pros');
    expect(html).not.toMatch(/>0<span[^>]*>\/10/);
  });

  it('shows a licensed image only, with its license note', () => {
    const html = renderToStaticMarkup(
      <RtingsEvidence
        name="Allswell Hybrid"
        evidence={{ ...EVIDENCE, licensedImages: [{ imageUrl: 'https://i.rtings.com/example.jpg', alt: 'Allswell Hybrid', licenseNote: 'Example license note' }] }}
        crossCheck={null}
      />,
    );
    expect(html).toContain('src="https://i.rtings.com/example.jpg"');
    expect(html).toContain('Example license note');
  });

  it('renders the catalog fallback without inventing an RTINGS publish date', () => {
    const check = catalogRtingsCrossCheck(byId('casper-snow'));
    const html = renderToStaticMarkup(<RtingsEvidence name="Casper Snow" evidence={null} crossCheck={check} />);
    expect(html).toContain('data-rtings-source="catalog"');
    expect(html).toContain('Not on file');
    expect(html).toContain('Checked against RTINGS by us');
    expect(html).toContain('Medium (47 Pa/mm)');
  });
});
