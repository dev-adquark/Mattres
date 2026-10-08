/**
 * Published RTINGS photos for the whole catalog, in one cached read.
 *
 * lib/db/mattressRepo.getCatalog attaches `photo` to each entry from this map,
 * so every card, slider, results list and product page gets it without
 * threading data through pages. Reads only the RTINGS store (Supabase, or the
 * committed snapshot): a page request never calls Apify, and RTINGS being down
 * can never break a page (the image itself falls back client-side to the render).
 */
import { unstable_cache } from 'next/cache';
import { isVisible } from './evidence';
import { eligiblePhoto, type EntryPhoto } from './photo';
import { getRtingsRepository } from './repository';
import { RTINGS_EVIDENCE_CACHE_TAG, type RtingsRepository } from './types';

export const PHOTO_REVALIDATE_SECONDS = 21600;

/** Uncached: mattress id -> credited photo for every published, exactly matched review. */
export async function loadPublishedPhotoMap(repo?: RtingsRepository): Promise<Record<string, EntryPhoto>> {
  const store = repo ?? getRtingsRepository();
  const rows = await store.listReviews({ statuses: ['published'] });
  const ids = Array.from(new Set(rows.map((r) => r.mattress_id).filter((id): id is string => typeof id === 'string' && id !== '')));
  const map: Record<string, EntryPhoto> = {};
  for (const id of ids) {
    const stored = (await store.getPublishedForMattress(id)).filter((s) => isVisible(s, id));
    const newest = stored.sort((a, b) => (b.review.source_updated_at || b.review.published_at || '').localeCompare(a.review.source_updated_at || a.review.published_at || ''))[0];
    const photo = newest ? eligiblePhoto(newest) : null;
    if (photo) map[id] = photo;
  }
  return map;
}

export const getPublishedPhotoMap: () => Promise<Record<string, EntryPhoto>> = unstable_cache(
  async () => loadPublishedPhotoMap(),
  ['rtings-photo-map-v1'],
  { tags: [RTINGS_EVIDENCE_CACHE_TAG], revalidate: PHOTO_REVALIDATE_SECONDS },
);
