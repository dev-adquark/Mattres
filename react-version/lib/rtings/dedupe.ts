/**
 * In-batch deduplication (brief section 14). Pure.
 *
 * Two items are the same review when they share a product_id or a canonical
 * review_url (normalize.ts already canonicalized it). The LAST occurrence
 * wins, because Apify appends in scrape order and a later item is the newer
 * read of the same page. Cross-run duplicates are handled by the repository
 * upsert (product_id first, then review_url), never by inserting twice.
 */

import type { DedupeResult, NormalizedReview } from './types';

export function dedupeBatch(reviews: readonly NormalizedReview[]): DedupeResult {
  // Original batch index -> the review currently kept for it.
  const kept = new Map<number, NormalizedReview>();
  const byProductId = new Map<string, number>();
  const byUrl = new Map<string, number>();
  const duplicates: DedupeResult['duplicates'] = [];

  reviews.forEach((review, index) => {
    const previous = new Set<number>();
    const byPid = byProductId.get(review.productId);
    if (byPid !== undefined) previous.add(byPid);
    const byU = byUrl.get(review.reviewUrl);
    if (byU !== undefined) previous.add(byU);

    for (const droppedIndex of previous) {
      const dropped = kept.get(droppedIndex);
      if (!dropped) continue;
      kept.delete(droppedIndex);
      if (byProductId.get(dropped.productId) === droppedIndex) byProductId.delete(dropped.productId);
      if (byUrl.get(dropped.reviewUrl) === droppedIndex) byUrl.delete(dropped.reviewUrl);
      duplicates.push({ productId: dropped.productId, reviewUrl: dropped.reviewUrl, keptIndex: index, droppedIndex });
    }

    kept.set(index, review);
    byProductId.set(review.productId, index);
    byUrl.set(review.reviewUrl, index);
  });

  const unique = Array.from(kept.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([, review]) => review);
  return { unique, duplicates };
}
