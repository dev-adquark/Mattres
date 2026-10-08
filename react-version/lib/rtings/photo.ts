/**
 * RTINGS product photos shown on the site (decision: 2026-10-08).
 *
 * Every sync stores the product image the actor returns (mainImageUrl) next to
 * the review. A photo is DISPLAYED only when all of these hold:
 *   - the review is published and matched to this exact mattress (the caller
 *     checks this, same rule as the evidence block);
 *   - the image is https on an RTINGS image host and is a product asset
 *     (/assets/products/<id>/<slug>/<file>);
 *   - the image slug equals the review's own `<brand>-<model>` slug, so the
 *     photo provably belongs to the review that was matched;
 *   - the image is "current": it was returned by the latest sync (an image the
 *     actor stopped returning falls back to the render without deleting history).
 * Anything else yields null and the page keeps its original render.
 *
 * Pure and dependency-light: used both by the site read path and by tests.
 */
import { currentImages } from './changes';
import { isRtingsImageUrl } from './validate';
import type { RtingsImageRow, StoredReview } from './types';

export const RTINGS_PHOTO_CREDIT = 'Photo: RTINGS';

/** What a card, hero or slider receives; always carries its credit and source link. */
export interface EntryPhoto {
  src: string;
  alt: string;
  credit: string;
  /** The RTINGS review the photo belongs to. */
  creditUrl: string;
}

const PRODUCT_IMAGE_PATH = /^\/assets\/products\/([A-Za-z0-9]+)\/([a-z0-9-]+)\/[^/]+$/;
const REVIEW_PATH = /^\/mattress\/reviews\/([a-z0-9-]+)\/([a-z0-9-]+)\/?$/;

function tokens(slug: string): string[] {
  return slug.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
}

/** `/assets/products/<id>/<slug>/<file>` -> slug, or null for anything else. */
export function photoSlug(imageUrl: string): string | null {
  try {
    const m = PRODUCT_IMAGE_PATH.exec(new URL(imageUrl).pathname);
    return m ? (m[2] as string) : null;
  } catch {
    return null;
  }
}

/** `https://www.rtings.com/mattress/reviews/<brand>/<model>` -> `<brand>-<model>`, or null. */
export function reviewSlug(reviewUrl: string): string | null {
  try {
    const m = REVIEW_PATH.exec(new URL(reviewUrl).pathname);
    return m ? `${m[1]}-${m[2]}` : null;
  } catch {
    return null;
  }
}

/** Strict: the token sequences must be identical (no subset or fuzzy matching). */
export function photoBelongsToReview(imageUrl: string, reviewUrl: string): boolean {
  const a = photoSlug(imageUrl);
  const b = reviewSlug(reviewUrl);
  if (!a || !b) return false;
  const ta = tokens(a);
  const tb = tokens(b);
  return ta.length > 0 && ta.length === tb.length && ta.every((t, i) => t === tb[i]);
}

function isEligibleImage(img: RtingsImageRow, reviewUrl: string): boolean {
  return isRtingsImageUrl(img.image_url) && photoBelongsToReview(img.image_url, reviewUrl);
}

/**
 * The displayable photo for an already-visible review, or null. When the
 * latest sync returned several eligible images the first stored one wins.
 */
export function eligiblePhoto(stored: StoredReview): EntryPhoto | null {
  const review = stored.review;
  const image = currentImages(stored)
    .filter((img) => isEligibleImage(img, review.review_url))
    .sort((a, b) => a.id - b.id)[0];
  if (!image) return null;
  const name = review.product_name?.trim() || `${review.brand} ${review.model}`.trim();
  return {
    src: image.image_url,
    alt: `${name} mattress, photographed by RTINGS`,
    credit: RTINGS_PHOTO_CREDIT,
    creditUrl: review.review_url,
  };
}
