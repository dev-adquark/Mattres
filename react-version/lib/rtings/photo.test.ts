import { describe, expect, it } from 'vitest';
import { eligiblePhoto, photoBelongsToReview, photoSlug, reviewSlug, RTINGS_PHOTO_CREDIT } from './photo';
import type { RtingsImageRow, RtingsReviewRow, StoredReview } from './types';

const REVIEW_URL = 'https://www.rtings.com/mattress/reviews/purple/restoreplus-hybrid';
const IMAGE_URL = 'https://i.rtings.com/assets/products/XnR1eUV0/purple-restoreplus-hybrid/design-small.jpg';
const RETRIEVED = '2026-10-07T11:15:06.240Z';

function stored(overrides: { reviewUrl?: string; images?: Partial<RtingsImageRow>[]; retrievedAt?: string } = {}): StoredReview {
  const review = {
    id: 3,
    review_url: overrides.reviewUrl ?? REVIEW_URL,
    product_name: 'Purple RestorePlus Hybrid',
    brand: 'Purple',
    model: 'RestorePlus Hybrid',
    retrieved_at: overrides.retrievedAt ?? RETRIEVED,
  } as RtingsReviewRow;
  const images = (overrides.images ?? [{}]).map((img, i) => ({
    id: i + 1,
    review_id: 3,
    source: 'RTINGS',
    source_url: REVIEW_URL,
    image_url: IMAGE_URL,
    scraped_at: RETRIEVED,
    usage_status: 'source_only',
    license_note: null,
    alt: null,
    ...img,
  })) as RtingsImageRow[];
  return { review, scores: [], images };
}

describe('slug helpers', () => {
  it('reads the product slug from an RTINGS product image path', () => {
    expect(photoSlug(IMAGE_URL)).toBe('purple-restoreplus-hybrid');
    expect(photoSlug('https://i.rtings.com/other/path.jpg')).toBeNull();
    expect(photoSlug('not a url')).toBeNull();
  });
  it('builds brand-model from a review URL', () => {
    expect(reviewSlug(REVIEW_URL)).toBe('purple-restoreplus-hybrid');
    expect(reviewSlug('https://www.rtings.com/mattress/reviews/purple')).toBeNull();
  });
});

describe('photoBelongsToReview (strict slug equality)', () => {
  it('accepts a photo whose slug equals the review slug', () => {
    expect(photoBelongsToReview(IMAGE_URL, REVIEW_URL)).toBe(true);
  });
  it('rejects a different product, a sibling variant and a subset slug', () => {
    expect(photoBelongsToReview('https://i.rtings.com/assets/products/a1/purple-restore-hybrid/design-small.jpg', REVIEW_URL)).toBe(false);
    expect(photoBelongsToReview('https://i.rtings.com/assets/products/a1/purple-restoreplus-hybrid-2025/design-small.jpg', REVIEW_URL)).toBe(false);
    expect(photoBelongsToReview('https://i.rtings.com/assets/products/a1/purple/design-small.jpg', REVIEW_URL)).toBe(false);
  });
});

describe('eligiblePhoto', () => {
  it('returns a credited photo linking to the matched review', () => {
    const photo = eligiblePhoto(stored());
    expect(photo).toEqual({
      src: IMAGE_URL,
      alt: 'Purple RestorePlus Hybrid mattress, photographed by RTINGS',
      credit: RTINGS_PHOTO_CREDIT,
      creditUrl: REVIEW_URL,
    });
  });
  it('rejects a foreign host, plain http and a non-product path', () => {
    expect(eligiblePhoto(stored({ images: [{ image_url: 'https://evil.example/assets/products/x/purple-restoreplus-hybrid/design-small.jpg' }] }))).toBeNull();
    expect(eligiblePhoto(stored({ images: [{ image_url: IMAGE_URL.replace('https', 'http') }] }))).toBeNull();
    expect(eligiblePhoto(stored({ images: [{ image_url: 'https://i.rtings.com/images/logo.jpg' }] }))).toBeNull();
  });
  it('rejects a photo whose slug belongs to a different review (held for review, not shown)', () => {
    expect(eligiblePhoto(stored({ images: [{ image_url: 'https://i.rtings.com/assets/products/zz/casper-snow/design-small.jpg' }] }))).toBeNull();
  });
  it('stops showing an image the latest sync no longer returned (falls back to the render)', () => {
    const photo = eligiblePhoto(stored({ images: [{ scraped_at: '2026-09-01T00:00:00.000Z' }], retrievedAt: '2026-10-07T11:15:06.240Z' }));
    expect(photo).toBeNull();
  });
  it('shows a newer image after a sync returns a changed URL', () => {
    const newer = 'https://i.rtings.com/assets/products/NEW12345/purple-restoreplus-hybrid/design-small.jpg';
    const photo = eligiblePhoto(stored({ images: [{ scraped_at: '2026-09-01T00:00:00.000Z' }, { image_url: newer, scraped_at: RETRIEVED }] }));
    expect(photo?.src).toBe(newer);
  });
  it('returns null when the review has no images at all', () => {
    expect(eligiblePhoto(stored({ images: [] }))).toBeNull();
  });
});
