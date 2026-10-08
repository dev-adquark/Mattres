'use client';

import { STORAGE_KEYS } from '@/lib/deviceStorage';
import { Suspense, useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { useSearchParams } from 'next/navigation';
import { SlidersHorizontal } from 'lucide-react';
import { track, EVENTS } from '@/lib/analytics';
import { useLastResult } from '@/lib/useLastResult';
import { slugify } from '@/lib/searchIndex';
import { MATTRESS_TYPE_LABEL } from '@/lib/firmness';
import { buttonClassName } from '@/components/ui/Button';
import { openSiteSearch } from '@/components/search/searchEvents';
import { cx } from '@/components/ui/cx';
import type { CardMatchItem } from '@/components/catalog/CatalogCard';
import { CATALOG_RATING_FIELDS, MATERIAL_TAGS, isCatalogRatingKey } from '@/components/catalog/catalogData';
import type { CatalogListEntry } from '@/components/catalog/catalogData';
import type { CatalogReference } from '@/components/catalog/referenceRankings';
import {
  FIRMNESS_BANDS,
  PRICE_BUCKETS,
  SORTS,
  FIT_POSITIONS,
  RATED_THRESHOLD,
  EMPTY_STATE,
  serializeState,
  passes,
  facetCounts,
  sortIntoGroups,
  activeFilterCount,
  isPristine,
  effectiveSort,
  limitingFilters,
  isSortId,
  parseState,
  toggleFacetValue,
  queryCategory,
  bestFitFor,
  positionScoresFor,
} from './catalogQuery';
import type { CatalogState, Facet, ListFacet, QueryContext, SearchParamsRecord } from './catalogQuery';
import { FilterDrawer, FilterPanel } from './CatalogFilters';
import type { FilterAnalytics, FilterPanelProps, ToggleFacet, UpdateState } from './CatalogFilters';
import { QueryNote, SearchField, SortNote } from './CatalogExplorerParts';
import { CatalogInterlude } from '@/components/catalog/CatalogInterlude';
import { CatalogEmpty, CatalogGroups, CatalogStatus, ViewToggle, isCatalogView } from './CatalogResults';
import type { ActiveChip, CatalogView } from './CatalogResults';
import { indexLastResult } from './lastResult';
import { hasQueenPrice } from './productData';
import styles from './Catalog.module.css';

const slugOf = (brand: string): string => slugify(brand);
const TYPE_LABEL: Readonly<Record<string, string | undefined>> = MATTRESS_TYPE_LABEL;
/** Per-visitor layout preference (a convenience only; the page works without storage). */
const VIEW_STORAGE_KEY = STORAGE_KEYS.catalogView;

const viewListeners = new Set<() => void>();
/** In-memory choice so the switch still works when storage is blocked; null until the visitor picks one. */
let memoryView: CatalogView | null = null;

/**
 * Below this width the default is the compact list: a phone-width gallery is
 * one 600px card per row (a 37-card page runs past 25,000px). The visitor's
 * own choice, once made, wins at every width.
 */
const COMPACT_QUERY = '(max-width: 639px)';

function compactViewport(): boolean {
  try {
    return window.matchMedia(COMPACT_QUERY).matches;
  } catch {
    return false;
  }
}

function readView(): CatalogView {
  try {
    const stored = window.localStorage.getItem(VIEW_STORAGE_KEY);
    if (isCatalogView(stored)) return stored;
  } catch {
    // Storage blocked (private window, previews): fall back to memory.
  }
  if (memoryView) return memoryView;
  return compactViewport() ? 'list' : 'gallery';
}

function writeView(view: CatalogView): void {
  memoryView = view;
  try {
    window.localStorage.setItem(VIEW_STORAGE_KEY, view);
  } catch {
    // Not remembered across visits; the in-memory value still applies.
  }
  viewListeners.forEach((fn) => fn());
}

function subscribeView(onChange: () => void): () => void {
  viewListeners.add(onChange);
  window.addEventListener('storage', onChange);
  let media: MediaQueryList | null = null;
  try {
    media = window.matchMedia(COMPACT_QUERY);
    media.addEventListener('change', onChange);
  } catch {
    media = null;
  }
  return () => {
    viewListeners.delete(onChange);
    window.removeEventListener('storage', onChange);
    media?.removeEventListener('change', onChange);
  };
}

/**
 * The server HTML is the gallery (large-image cards); a remembered preference,
 * or the compact list on a phone-width viewport, applies after hydration.
 */
const serverView = (): CatalogView => 'gallery';

const FACET_FILTER_NAME: Partial<Record<Facet, string>> = { types: 'type', brands: 'brand' };

interface CatalogExplorerProps {
  /** Catalog entries slimmed by components/catalog/catalogData#catalogSlim. */
  entries: readonly CatalogListEntry[];
  brands: readonly { slug: string; name: string }[];
  /** components/catalog/referenceRankings#getCatalogReference() payload, or null when the engine failed. */
  reference: CatalogReference | null;
  /** lib/categories#categoryCounts(): live counts for the editorial interlude's category links. */
  categoryCounts?: Readonly<Record<string, number>>;
  /** Starting state; the explorer then applies the address bar's query string on mount. */
  initialState?: CatalogState;
}

/** Reports the current query string (useSearchParams) whenever it changes. Renders nothing. */
function UrlStateSync({ onSearch }: { onSearch: (search: string) => void }) {
  const params = useSearchParams();
  const search = params.toString();
  useEffect(() => {
    onSearch(search);
  }, [search, onSearch]);
  return null;
}

/**
 * /mattresses search + filters + sort. State lives in the URL (?q=, ?type=,
 * ?firmness=, ?price=, ?brand=, ?rated=, ?fit=, ?material=, ?sort=) via
 * history.replaceState, so a filtered view can be shared. The page itself is
 * static (one cached HTML for every query), so a shared URL's state is read
 * from the address bar once, after hydration.
 */
export function CatalogExplorer({ entries, brands, reference, categoryCounts, initialState }: CatalogExplorerProps) {
  const [state, setState] = useState<CatalogState>(initialState || EMPTY_STATE);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const view = useSyncExternalStore(subscribeView, readView, serverView);
  const { payload } = useLastResult();
  const lastResult = useMemo(() => indexLastResult(payload), [payload]);
  const matchScores: Record<string, number> | null = lastResult ? lastResult.scores : null;
  const ctx = useMemo<QueryContext>(() => ({ matchScores, reference }), [matchScores, reference]);

  const filtered = useMemo(() => entries.filter((e) => passes(e, state, slugOf, null, ctx)), [entries, state, ctx]);
  const counts = useMemo(() => facetCounts(entries, state, slugOf, ctx), [entries, state, ctx]);
  const { sort, basis, groups } = useMemo(() => sortIntoGroups(filtered, state.sort, ctx), [filtered, state.sort, ctx]);
  const named = useMemo(() => queryCategory(state.q), [state.q]);
  const unpricedTotal = useMemo(() => entries.filter((e) => !hasQueenPrice(e)).length, [entries]);

  // Follow the address bar: a shared or bookmarked query string on first load
  // (the cached server HTML is the unfiltered catalog) and later soft
  // navigations to /mattresses?q=... (site search). Our own replaceState
  // writes come back here too; they serialize to the current state and are ignored.
  const brandSlugs = useMemo(() => brands.map((b) => b.slug), [brands]);
  const syncFromUrl = useCallback(
    (search: string) => {
      const params = new URLSearchParams(search);
      const record: SearchParamsRecord = {};
      for (const key of new Set(params.keys())) {
        const all = params.getAll(key);
        record[key] = all.length > 1 ? all : all[0];
      }
      const fromUrl = parseState(record, { brandSlugs });
      setState((current) => (serializeState(current) === serializeState(fromUrl) ? current : fromUrl));
    },
    [brandSlugs]
  );

  // Keep the address bar in sync without a navigation (shareable, no re-render from the server).
  const firstRun = useRef(true);
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    const qs = serializeState(state);
    const url = `${window.location.pathname}${qs ? `?${qs}` : ''}${window.location.hash}`;
    window.history.replaceState(window.history.state, '', url);
  }, [state]);

  // search_used: fires once the query settles (or on Enter / leaving the
  // field), once per distinct query. Sends the length and result count, never the text.
  const lastSearchSent = useRef('');
  const filteredCount = filtered.length;
  const sendSearch = useCallback(() => {
    const q = state.q.trim();
    if (!q || q === lastSearchSent.current) return;
    lastSearchSent.current = q;
    track(EVENTS.SEARCH_USED, { surface: 'catalog', source: 'catalog', query_length: q.length, results: filteredCount });
  }, [state.q, filteredCount]);
  useEffect(() => {
    if (!state.q.trim()) {
      lastSearchSent.current = '';
      return undefined;
    }
    const t = setTimeout(sendSearch, 700);
    return () => clearTimeout(t);
  }, [state.q, sendSearch]);

  const update: UpdateState = useCallback(
    (patch, analytics) => {
      const next = { ...state, ...patch };
      setState(next);
      if (analytics) {
        const results = entries.filter((e) => passes(e, next, slugOf, null, ctx)).length;
        track(EVENTS.FILTER_USED, { ...analytics, results });
      }
    },
    [entries, state, ctx]
  );

  const toggleFacet: ToggleFacet = (facet, value, filterName) => {
    const selected: readonly string[] = state[facet];
    const analytics: FilterAnalytics = { filter: filterName, value, action: selected.includes(value) ? 'remove' : 'add' };
    update(toggleFacetValue(state, facet, value), analytics);
  };

  const clearAll = () => update({ ...EMPTY_STATE, sort: state.sort }, { filter: 'all', value: 'clear', action: 'remove' });

  const sortOptions = SORTS.filter((s) => (s.requires === 'reference' ? Boolean(reference) : true));
  const sortValue = effectiveSort(state.sort, ctx);
  const nFilters = activeFilterCount(state);
  const brandName = useMemo<Record<string, string>>(() => Object.fromEntries(brands.map((b) => [b.slug, b.name])), [brands]);

  const labelFor = (facet: Facet, value: string): string => {
    if (facet === 'q') return `“${value}”`;
    if (facet === 'types') return TYPE_LABEL[value] || value;
    if (facet === 'firmness') return FIRMNESS_BANDS.find((b) => b.id === value)?.label || value;
    if (facet === 'price') return `Queen ${PRICE_BUCKETS.find((b) => b.id === value)?.label}`;
    if (facet === 'brands') return brandName[value] || value;
    if (facet === 'rated') return isCatalogRatingKey(value) ? `${CATALOG_RATING_FIELDS[value].label} ${RATED_THRESHOLD}+` : value;
    if (facet === 'fit') return `Strong fit: ${FIT_POSITIONS.find((p) => p.id === value)?.label.toLowerCase()}`;
    if (facet === 'material') return MATERIAL_TAGS.find((m) => m.id === value)?.label || value;
    return value;
  };

  const removeFilter = (facet: Facet, value: string): void => {
    if (facet === 'q') return update({ q: '' });
    if (facet === 'price') return update({ price: '' }, { filter: 'price', value, action: 'remove' });
    const name = FACET_FILTER_NAME[facet] || facet;
    return toggleFacet(facet, value, name);
  };

  const listChips = (facet: ListFacet, values: readonly string[]): [Facet, string][] => values.map((v) => [facet, v]);
  const activeChips: ActiveChip[] = [
    ...listChips('types', state.types),
    ...listChips('firmness', state.firmness),
    ...(state.price ? [['price', state.price] as [Facet, string]] : []),
    ...listChips('brands', state.brands),
    ...listChips('rated', state.rated),
    ...listChips('fit', state.fit),
    ...listChips('material', state.material),
  ].map(([facet, value]) => ({ key: `${facet}-${value}`, label: labelFor(facet, value), onRemove: () => removeFilter(facet, value) }));

  const limits = filtered.length === 0 ? limitingFilters(entries, state, slugOf, ctx).slice(0, 4) : [];
  const panelProps: FilterPanelProps = { state, counts, brands, unpricedTotal, toggleFacet, update, hasReference: Boolean(reference) };
  const matchItemFor = (id: string): CardMatchItem | undefined => lastResult?.items[id] || undefined;
  const fitFor = (id: string) => bestFitFor(id, reference);
  const positionsFor = (id: string) => positionScoresFor(id, reference);

  return (
    <div className={styles.explorer}>
      {/* Only this null-rendering reader suspends on the query string, so the
          static HTML still carries the whole catalog grid. */}
      <Suspense fallback={null}>
        <UrlStateSync onSearch={syncFromUrl} />
      </Suspense>
      <div className={styles.toolbar}>
        <SearchField value={state.q} onChange={(q) => update({ q })} onCommit={sendSearch} />
        <div className={styles.toolbarRow}>
          <button
            type="button"
            className={cx(buttonClassName({ variant: 'secondary', size: 'md' }), styles.filterButton)}
            aria-haspopup="dialog"
            aria-expanded={drawerOpen}
            onClick={() => setDrawerOpen(true)}
          >
            <SlidersHorizontal aria-hidden="true" />
            <span>Filters{nFilters ? ` (${nFilters})` : ''}</span>
          </button>
          <label className={styles.sort}>
            <span className={styles.sortLabel}>Sort by</span>
            <select
              className="select"
              value={sortValue}
              onChange={(e) => {
                const next = e.target.value;
                if (isSortId(next)) update({ sort: next }, { filter: 'sort', value: next, action: 'set' });
              }}
            >
              {sortOptions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className={styles.layout}>
        <aside className={styles.sidebar} aria-label="Filters">
          <FilterPanel {...panelProps} />
        </aside>

        <div className={styles.results}>
          {/* Outline anchor for the row/card headings (h3) and group titles below. */}
          <h2 className="sr-only">Results</h2>
          <CatalogStatus
            shown={filtered.length}
            total={entries.length}
            chips={activeChips}
            onClearAll={clearAll}
            aside={filtered.length ? <ViewToggle view={view} onChange={writeView} /> : null}
          />

          <SortNote sort={sort} basis={basis} profile={lastResult?.profile} hasResult={Boolean(matchScores)} modelVersion={reference?.modelVersion} />
          {named ? <QueryNote named={named} hasReference={Boolean(reference)} /> : null}

          {filtered.length === 0 ? (
            <CatalogEmpty
              limits={limits}
              query={state.q.trim()}
              labelFor={labelFor}
              onRemove={removeFilter}
              onReset={() => update({ ...EMPTY_STATE }, { filter: 'all', value: 'reset', action: 'remove' })}
              onSearchSite={openSiteSearch}
            />
          ) : (
            <CatalogGroups
              groups={groups}
              matchItemFor={matchItemFor}
              view={view}
              fitFor={fitFor}
              positionsFor={positionsFor}
              interlude={categoryCounts && isPristine(state) ? <CatalogInterlude counts={categoryCounts} total={entries.length} /> : null}
            />
          )}
        </div>
      </div>

      <FilterDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} resultCount={filtered.length} onClear={clearAll} canClear={!isPristine(state)}>
        <FilterPanel {...panelProps} />
      </FilterDrawer>
    </div>
  );
}
