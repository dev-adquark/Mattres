import type { SearchIndexData } from '@/lib/types';

/** Open the global site search from anywhere on the client. */
export const OPEN_SEARCH_EVENT = 'mms:open-search';

export interface OpenSearchDetail {
  query: string;
}

export function openSiteSearch(initialQuery = ''): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent<OpenSearchDetail>(OPEN_SEARCH_EVENT, { detail: { query: initialQuery } }));
}

let indexPromise: Promise<SearchIndexData> | null = null;

/** Fetches the compact search index once per page load (shared by search + header). */
export function loadSearchIndex(): Promise<SearchIndexData> {
  if (!indexPromise) {
    indexPromise = fetch('/api/search-index')
      .then((res) => {
        if (!res.ok) throw new Error(`Search index unavailable (${res.status})`);
        return res.json() as Promise<SearchIndexData>;
      })
      .catch((err: unknown) => {
        indexPromise = null; // allow a retry on next open
        throw err;
      });
  }
  return indexPromise;
}
