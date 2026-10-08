'use client';

import { useCallback, useId, useRef, useState, type ReactNode } from 'react';
import dynamic from 'next/dynamic';
import { usePathname, useRouter } from 'next/navigation';
import { Menu, Search, X } from 'lucide-react';
import { PRIMARY_CTA } from '@/lib/site';
import { track, EVENTS } from '@/lib/analytics';
import { Button } from '@/components/ui/Button';
import { Wordmark } from '@/components/ui/Wordmark';
import { IconButton } from '@/components/ui/IconButton';
import { cx } from '@/components/ui/cx';
import { loadSearchIndex } from '@/components/search/searchEvents';
import { importSearchDialog, useSearchShortcuts } from '@/components/search/useSearchShortcuts';
import { NavDesktopMenu, useMegaMenu } from '@/components/nav/NavDesktopMenu';
import { NavMobileDrawer } from '@/components/nav/NavMobileDrawer';
import { useNavScrollTheme } from '@/components/nav/useNavScrollTheme';
import { ctaIsCurrent, type CategoryCounts } from '@/components/nav/navPaths';
import { nav as s } from '@/components/ui/systemStyles';

// The dialog (and its search UI) loads on first use or on hover/focus of the
// search button, so it stays out of every route's first-load JS.
const SearchDialog = dynamic(() => importSearchDialog().then((m) => m.SearchDialog), { ssr: false });

const navUsed = (menu: string, item: string) => track(EVENTS.NAV_USED, { menu, item });

/**
 * Site header: wordmark, desktop mega-navigation (NavDesktopMenu), search,
 * primary CTA, and the mobile sheet (NavMobileDrawer). The header theme
 * follows the section beneath it (useNavScrollTheme); it is transparent over
 * a dark first section until the page scrolls.
 */
export default function Nav({ featureMedia }: { featureMedia?: Record<string, ReactNode> }) {
  const pathname = usePathname();
  const router = useRouter();
  const baseId = useId().replace(/:/g, '');
  const [menuOpen, setMenuOpen] = useState(false);
  const [search, setSearch] = useState<{ open: boolean; mounted: boolean; query: string }>({ open: false, mounted: false, query: '' });
  const [counts, setCounts] = useState<CategoryCounts | null>(null);
  const [prevPath, setPrevPath] = useState(pathname);
  const headerRef = useRef<HTMLElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const { theme, scrolled } = useNavScrollTheme(pathname);

  const loadCounts = useCallback(() => {
    if (counts) return;
    loadSearchIndex()
      .then((index) => {
        const map: CategoryCounts = {};
        (index.categories || []).forEach((c) => {
          map[c.id] = { n: c.count ?? 0, label: c.meta };
        });
        setCounts(map);
      })
      .catch(() => {});
  }, [counts]);

  const mega = useMegaMenu(headerRef, loadCounts);
  const { panel, dismiss } = mega;

  // Close menus on navigation (derived during render, not in an effect).
  if (pathname !== prevPath) {
    setPrevPath(pathname);
    if (menuOpen) setMenuOpen(false);
    if (panel) dismiss();
  }

  const setSearchOpen = useCallback(
    (open: boolean, query = '') => {
      if (open) {
        setMenuOpen(false);
        dismiss();
      }
      setSearch((prev) => ({ open, mounted: prev.mounted || open, query: open ? query : prev.query }));
    },
    [dismiss],
  );
  useSearchShortcuts(search.open, setSearchOpen);
  const onDialogOpenChange = useCallback((open: boolean) => setSearchOpen(open), [setSearchOpen]);

  const preloadSearch = () => {
    loadSearchIndex().catch(() => {});
    importSearchDialog().catch(() => {});
  };

  const closeMenu = useCallback(() => setMenuOpen(false), []);

  const onNavigate = (menuId: string, item: string) => {
    navUsed(menuId, item);
    dismiss();
    setMenuOpen(false);
  };

  const prefetchCta = () => router.prefetch(PRIMARY_CTA.href);

  const headerState = menuOpen || panel ? 'open' : scrolled ? 'scrolled' : 'top';

  return (
    <header
      ref={headerRef}
      className={s.header}
      data-theme={theme}
      data-state={headerState}
      data-scrolled={scrolled ? 'true' : 'false'}
      data-menu-open={menuOpen ? 'true' : 'false'}
      data-panel-open={panel ? 'true' : 'false'}
      onPointerLeave={mega.onHeaderLeave}
      onPointerEnter={mega.onHeaderEnter}
    >
      <div className={cx('container container--wide', s.inner)}>
        <Wordmark />

        <NavDesktopMenu baseId={baseId} pathname={pathname} menu={mega} counts={counts} loadCounts={loadCounts} onNavigate={onNavigate} featureMedia={featureMedia} />

        <div className={s.actions}>
          <IconButton
            className={s.searchTrigger}
            onClick={() => setSearchOpen(true)}
            onPointerEnter={preloadSearch}
            onFocus={preloadSearch}
            aria-haspopup="dialog"
            aria-keyshortcuts="Meta+K Control+K"
          >
            <Search aria-hidden="true" />
            {/* The visible word is the accessible name (sr-only below 1080px). */}
            <span className={s.searchText}>Search</span>
            <kbd className={s.searchKbd} aria-hidden="true">
              ⌘K
            </kbd>
          </IconButton>
          <Button
            href={PRIMARY_CTA.href}
            size="sm"
            className={s.cta}
            wrapClassName={s.ctaWrap}
            magnetic
            prefetch={false}
            onPointerEnter={prefetchCta}
            onFocus={prefetchCta}
            onTouchStart={prefetchCta}
            onClick={() => navUsed('header', 'cta')}
            aria-current={ctaIsCurrent(pathname, PRIMARY_CTA.href) ? 'page' : undefined}
          >
            {PRIMARY_CTA.label}
          </Button>
          <IconButton
            ref={toggleRef}
            className={s.menuToggle}
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            onClick={() => setMenuOpen((v) => !v)}
          >
            {menuOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
          </IconButton>
        </div>
      </div>

      <NavMobileDrawer
        open={menuOpen}
        close={closeMenu}
        baseId={baseId}
        pathname={pathname}
        headerRef={headerRef}
        toggleRef={toggleRef}
        onNavigate={onNavigate}
        onSearch={() => setSearchOpen(true)}
      />

      {search.mounted ? <SearchDialog open={search.open} onOpenChange={onDialogOpenChange} initialQuery={search.query} /> : null}
    </header>
  );
}
