'use client';

import { useCallback, useEffect, useId, useMemo, useRef, useState, useSyncExternalStore, type ComponentType, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, BedDouble, BookOpen, Clock, Columns3, CornerDownLeft, LayoutGrid, Search, Sparkles, Tag, X, type LucideProps } from 'lucide-react';
import { EXPANDED_LIMITS, SEARCH_GROUPS, searchIndex } from '@/lib/searchIndex';
import { NAV_MENU, POPULAR_SEARCHES, PRIMARY_CTA, QUIZ_PROMISE, searchUrl } from '@/lib/site';
import { track, EVENTS } from '@/lib/analytics';
import { loadSearchIndex } from './searchEvents';
import { addRecentSearch, clearRecentSearches, useRecentSearches } from './recentSearches';
import type { SearchGroupId, SearchIndexData } from '@/lib/types';
import { IconButton } from '@/components/ui/IconButton';
import { searchDialog as s } from '@/components/ui/systemStyles';

/** One option row: an index item, or a dialog-only entry (recent, popular, quick link, suggestion, see-all). */
interface DialogItem {
  kind: string;
  id: string;
  title: string;
  meta?: string;
  href?: string;
  /** recent: the query to re-run. */
  query?: string;
  group?: string;
}

interface DialogGroup {
  id: string;
  label: string;
  items: DialogItem[];
}

type ChipId = 'all' | SearchGroupId;

const GROUP_ICON: Record<string, ComponentType<LucideProps>> = {
  categories: LayoutGrid,
  mattresses: BedDouble,
  brands: Tag,
  guides: BookOpen,
  comparisons: Columns3,
  quick: ArrowRight,
  popular: Sparkles,
  recent: Clock,
  suggest: Sparkles,
  all: Search,
};

const KIND_LABEL: Record<string, string> = { category: 'Category', mattress: 'Mattress', brand: 'Brand', guide: 'Guide', comparison: 'Compare' };

const GROUP_LABEL = Object.fromEntries(SEARCH_GROUPS.map((g) => [g.id, g.label])) as Record<SearchGroupId, string>;
const CHIP_GROUPS: SearchGroupId[] = ['mattresses', 'brands', 'categories', 'guides', 'comparisons'];
const CHIPS: { id: ChipId; label: string }[] = [{ id: 'all', label: 'All' }, ...CHIP_GROUPS.map((id) => ({ id, label: GROUP_LABEL[id] }))];

const QUICK_LINKS: DialogGroup = {
  id: 'quick',
  label: 'Go to',
  items: [
    ...NAV_MENU.map((m) => ({ kind: 'quick', id: m.href, title: m.label, meta: m.intro, href: m.href })),
    { kind: 'quick', id: PRIMARY_CTA.href, title: PRIMARY_CTA.label, meta: QUIZ_PROMISE, href: PRIMARY_CTA.href },
  ],
};

const POPULAR: DialogGroup = {
  id: 'popular',
  label: 'Start here',
  items: POPULAR_SEARCHES.map((p) => ({ kind: 'popular', id: p.href, title: p.label, meta: p.meta, href: p.href })),
};

const SUGGEST_SLUGS = ['best', 'side-sleepers', 'cooling'];

/** Phones get a placeholder short enough to sit beside the close button. */
const NARROW_QUERY = '(max-width: 499px)';
function subscribeNarrow(onChange: () => void): () => void {
  const mql = window.matchMedia(NARROW_QUERY);
  mql.addEventListener('change', onChange);
  return () => mql.removeEventListener('change', onChange);
}
const useNarrow = () =>
  useSyncExternalStore(
    subscribeNarrow,
    () => window.matchMedia(NARROW_QUERY).matches,
    () => false,
  );

/**
 * Global site search (combobox + grouped listbox in a modal <dialog>).
 * The header (Nav) owns the open state and the global shortcuts
 * (useSearchShortcuts: Cmd/Ctrl+K, "/" outside inputs, openSiteSearch()) and
 * only loads this module on first use. Every opening starts on the "All"
 * chip so Recent searches are visible; `initialQuery` (from
 * openSiteSearch(q)) pre-fills the field. The index is fetched lazily from
 * /api/search-index.
 *
 * - Type chips (role=tablist, arrow keys) filter results client-side.
 * - Empty query: Recent (localStorage mms_recent_searches, clearable,
 *   device-only), Popular (curated) and quick links. With a chip active
 *   and no query, the chip's whole group is listed (browse mode).
 * - No results: three category suggestions + the quiz, never a dead end.
 * - Analytics: search_used {result_count, group, chip}. Never the query text.
 */
interface SearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Pre-fills the query each time the dialog opens (empty = keep blank). */
  initialQuery?: string;
}

export function SearchDialog({ open, onOpenChange, initialQuery = '' }: SearchDialogProps) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const chipRefs = useRef<Partial<Record<ChipId, HTMLButtonElement | null>>>({});
  const baseId = useId();
  const [query, setQuery] = useState('');
  const [chip, setChip] = useState<ChipId>('all');
  const [index, setIndex] = useState<SearchIndexData | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [active, setActive] = useState(0);
  const recent = useRecentSearches();
  const narrow = useNarrow();
  const [wasOpen, setWasOpen] = useState(false);

  // Each opening starts fresh on "All" (derived during render, not in an effect).
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setChip('all');
      setActive(0);
      setQuery(initialQuery);
    }
  }

  const ensureIndex = useCallback(() => {
    if (index || status === 'loading') return;
    setStatus('loading');
    loadSearchIndex()
      .then((data) => {
        setIndex(data);
        setStatus('ready');
      })
      .catch(() => setStatus('error'));
  }, [index, status]);

  // Sync the native dialog with `open`.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      ensureIndex();
      requestAnimationFrame(() => inputRef.current && inputRef.current.focus());
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open, ensureIndex]);

  const trimmed = query.trim();

  const { groups, resultCount, empty } = useMemo((): { groups: DialogGroup[]; resultCount: number; empty: boolean } => {
    if (!trimmed) {
      if (chip !== 'all' && index && index[chip]) {
        return {
          groups: [{ id: chip, label: `All ${GROUP_LABEL[chip].toLowerCase()}`, items: index[chip].slice(0, EXPANDED_LIMITS[chip]) }],
          resultCount: 0,
          empty: false,
        };
      }
      const recentGroup = recent.length
        ? [{ id: 'recent', label: 'Recent', items: recent.map((q) => ({ kind: 'recent', id: `recent-${q}`, title: q, meta: 'Search again', query: q })) }]
        : [];
      return { groups: [...recentGroup, POPULAR, QUICK_LINKS], resultCount: 0, empty: false };
    }
    const found = index ? searchIndex(index, trimmed, chip === 'all' ? undefined : EXPANDED_LIMITS, { group: chip }) : [];
    const count = found.reduce((total, g) => total + g.items.length, 0);
    const all = {
      id: 'all',
      label: 'Catalog',
      items: [{ kind: 'all', id: 'all', title: `Search all mattresses for “${trimmed}”`, meta: 'Opens the full catalog with this filter', href: searchUrl(trimmed) }],
    };
    if (count === 0 && index) {
      const cats = (index.categories || []).filter((c) => SUGGEST_SLUGS.includes(c.id));
      const suggest: DialogGroup = {
        id: 'suggest',
        label: 'Try instead',
        items: [...cats, { kind: 'suggest', id: 'quiz', title: 'Take the quiz', meta: `${QUIZ_PROMISE}.`, href: PRIMARY_CTA.href }],
      };
      return { groups: [suggest, all], resultCount: 0, empty: true };
    }
    return { groups: [...found, all], resultCount: count, empty: false };
  }, [trimmed, index, chip, recent]);

  const flat = useMemo((): DialogItem[] => groups.flatMap((g) => g.items.map((item) => ({ ...item, group: g.id }))), [groups]);
  // Flat option index where each group starts (for aria-activedescendant ids).
  const starts = useMemo(() => groups.map((_, gi) => groups.slice(0, gi).reduce((sum, g) => sum + g.items.length, 0)), [groups]);
  const activeIndex = Math.min(active, Math.max(0, flat.length - 1));
  const optionId = (i: number) => `${baseId}-opt-${i}`;

  const close = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  const choose = (item: DialogItem | undefined) => {
    if (!item) return;
    if (item.kind === 'recent') {
      setQuery(item.query ?? '');
      setActive(0);
      ensureIndex();
      if (inputRef.current) inputRef.current.focus();
      return;
    }
    track(EVENTS.SEARCH_USED, { group: item.group || item.kind, chip, result_count: resultCount });
    if (trimmed) addRecentSearch(trimmed);
    close();
    setQuery('');
    setActive(0);
    if (item.href) router.push(item.href);
  };

  // Keep the active option scrolled into view.
  useEffect(() => {
    if (!open) return;
    const el = document.getElementById(`${baseId}-opt-${activeIndex}`);
    if (el) el.scrollIntoView({ block: 'nearest' });
  }, [activeIndex, open, baseId]);

  const onInputKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      // type="search" would otherwise swallow Esc to clear its value.
      event.preventDefault();
      close();
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (flat.length) setActive((activeIndex + 1) % flat.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (flat.length) setActive((activeIndex - 1 + flat.length) % flat.length);
    } else if (event.key === 'Home' && event.ctrlKey) {
      event.preventDefault();
      setActive(0);
    } else if (event.key === 'End' && event.ctrlKey) {
      event.preventDefault();
      setActive(flat.length - 1);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      choose(flat[activeIndex]);
    }
  };

  const selectChip = (id: ChipId, focus = false) => {
    setChip(id);
    setActive(0);
    ensureIndex();
    if (focus) chipRefs.current[id]?.focus();
  };

  const onChipKeyDown = (i: number) => (e: ReactKeyboardEvent<HTMLButtonElement>) => {
    let next: number | null = null;
    if (e.key === 'ArrowRight') next = (i + 1) % CHIPS.length;
    else if (e.key === 'ArrowLeft') next = (i - 1 + CHIPS.length) % CHIPS.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = CHIPS.length - 1;
    if (next === null) return;
    e.preventDefault();
    const target = CHIPS[next];
    if (target) selectChip(target.id, true);
  };

  let statusText = '';
  if (trimmed) {
    if (status === 'loading') statusText = 'Loading search index…';
    else if (status === 'error') statusText = 'Search is unavailable right now. You can still browse the full catalog.';
    else if (empty) statusText = `No matches for “${trimmed}”. Try a category or the quiz instead.`;
    else statusText = `${resultCount} result${resultCount === 1 ? '' : 's'}`;
  }

  const chipLabel = CHIPS.find((c) => c.id === chip)?.label ?? 'All';
  return (
    <dialog
      ref={dialogRef}
      className={s.dialog}
      aria-label="Search the site"
      onClose={() => open && onOpenChange(false)}
      onCancel={(e) => {
        e.preventDefault();
        close();
      }}
      onClick={(e) => {
        if (e.target === dialogRef.current) close(); // backdrop click
      }}
    >
      <div className={s.field}>
        <Search aria-hidden="true" />
        <input
          ref={inputRef}
          className={s.input}
          type="search"
          role="combobox"
          aria-expanded="true"
          aria-controls={`${baseId}-listbox`}
          aria-activedescendant={flat.length ? optionId(activeIndex) : undefined}
          aria-autocomplete="list"
          aria-label={`Search ${chip === 'all' ? 'mattresses, brands, categories, guides and comparisons' : chipLabel.toLowerCase()}`}
          placeholder={chip !== 'all' ? `Search ${chipLabel.toLowerCase()}…` : narrow ? 'Mattresses, brands, guides' : 'Try “cooling”, “side sleeper” or a brand'}
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
            ensureIndex();
          }}
          onKeyDown={onInputKeyDown}
        />
        <IconButton onClick={close} aria-label="Close search">
          <X aria-hidden="true" />
        </IconButton>
      </div>

      <div className={s.chips} role="tablist" aria-label="Result type">
        {CHIPS.map((c, i) => (
          <button
            key={c.id}
            ref={(el) => {
              chipRefs.current[c.id] = el;
            }}
            type="button"
            role="tab"
            id={`${baseId}-tab-${c.id}`}
            aria-selected={chip === c.id}
            aria-controls={`${baseId}-panel`}
            tabIndex={chip === c.id ? 0 : -1}
            className={s.chip}
            onClick={() => selectChip(c.id)}
            onKeyDown={onChipKeyDown(i)}
          >
            {c.label}
          </button>
        ))}
      </div>

      <div className={s.results} id={`${baseId}-panel`} role="tabpanel" aria-labelledby={`${baseId}-tab-${chip}`} tabIndex={0}>
        {!trimmed && chip === 'all' && recent.length ? (
          <div className={s.recentHead}>
            <span className={s.note}>Recent searches are stored only on this device.</span>
            <button type="button" className={s.clear} onClick={() => clearRecentSearches()}>
              Clear recent
            </button>
          </div>
        ) : null}
        <div id={`${baseId}-listbox`} role="listbox" aria-label="Search results">
          {groups.map((group, gi) => (
            <div key={group.id} role="group" aria-labelledby={`${baseId}-g-${group.id}`} className={s.group} data-group={group.id}>
              <div id={`${baseId}-g-${group.id}`} className={s.groupLabel} role="presentation">
                {group.label}
              </div>
              {group.items.map((item, ii) => {
                const i = (starts[gi] ?? 0) + ii;
                const iconKey = item.kind === 'category' ? 'categories' : ['quick', 'popular', 'recent', 'suggest', 'all'].includes(item.kind) ? item.kind : group.id;
                const Icon = GROUP_ICON[iconKey] || ArrowRight;
                return (
                  <div
                    key={`${group.id}-${item.id}`}
                    id={optionId(i)}
                    role="option"
                    aria-selected={i === activeIndex}
                    className={s.option}
                    data-kind={item.kind}
                    onMouseMove={() => i !== activeIndex && setActive(i)}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => choose({ ...item, group: group.id })}
                  >
                    <span className={s.optionIcon} aria-hidden="true">
                      <Icon />
                    </span>
                    <span className={s.optionText}>
                      <span className={s.optionTitle}>{item.title}</span>
                      {item.meta ? <span className={s.optionMeta}>{item.meta}</span> : null}
                    </span>
                    {KIND_LABEL[item.kind] && chip === 'all' && trimmed ? (
                      <span className={s.optionType} aria-hidden="true">
                        {KIND_LABEL[item.kind]}
                      </span>
                    ) : null}
                    <CornerDownLeft className={s.optionGo} aria-hidden="true" />
                  </div>
                );
              })}
            </div>
          ))}
        </div>
        <p className={statusText ? s.status : 'sr-only'} role="status" aria-live="polite">
          {statusText}
        </p>
      </div>

      <div className={s.foot}>
        <span>Searches mattresses, brands, categories, guides and comparisons.</span>
        <span className={s.keys} aria-hidden="true">
          <span>
            <kbd className={s.kbd}>↑</kbd> <kbd className={s.kbd}>↓</kbd> move
          </span>
          <span>
            <kbd className={s.kbd}>↵</kbd> open
          </span>
          <span>
            <kbd className={s.kbd}>esc</kbd> close
          </span>
        </span>
      </div>
    </dialog>
  );
}
