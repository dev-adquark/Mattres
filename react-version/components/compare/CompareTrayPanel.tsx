'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronUp, X } from 'lucide-react';
import { MAX_COMPARE, clearCompare, compareHref, removeFromCompare, useCompareIds, useCompareLabels } from '@/lib/compareStore';
import { track, EVENTS } from '@/lib/analytics';
import { buttonClassName } from '@/components/ui/Button';
import { cx } from '@/components/ui/cx';
import { compareTray as s } from '@/components/ui/systemStyles';

function fallbackName(id: string): string {
  return id.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

// Mobile open/closed choice, kept for the session across route changes and
// across the panel unmounting when the list empties.
let mobileOpenPreference = false;

/**
 * Global compare tray body (loaded by CompareTray once the selection is non-empty). Hidden when the
 * selection is empty, on /compare itself, and on pages that opt out with
 * `data-compare-tray="off"` (404 and error pages, see CompareTray.module.css).
 *
 * Desktop (>= 900px): a floating pill bar with the chips and actions.
 * Mobile: a compact pill ("1 of 3", plus the Compare link once two are
 * picked) that expands into the full bar on demand, so it never sits over a
 * page's hero copy or CTAs.
 *
 * While visible it publishes its footprint (height plus bottom offset) as
 * --tray-h on <html>; the site footer adds it to its own bottom padding (on
 * its night background), so the tray never covers the end of the page and
 * no light band shows under the footer.
 */
export function CompareTrayPanel() {
  const ids = useCompareIds();
  const labels = useCompareLabels();
  const pathname = usePathname();
  const ref = useRef<HTMLElement>(null);
  const visible = ids.length > 0 && pathname !== '/compare';
  const [announcement, setAnnouncement] = useState('');
  const [open, setOpenState] = useState(mobileOpenPreference);
  const setOpen = (next: boolean) => {
    mobileOpenPreference = next;
    setOpenState(next);
  };
  // After a removal, where keyboard focus goes once the chips re-render (WCAG 2.4.3).
  const pendingFocus = useRef<{ id: string | null; removed: string } | null>(null);

  useEffect(() => {
    const pending = pendingFocus.current;
    if (!pending) return;
    pendingFocus.current = null;
    const esc = (v: string) => (typeof CSS !== 'undefined' && CSS.escape ? CSS.escape(v) : v);
    const target =
      (pending.id && ref.current?.querySelector<HTMLElement>(`[data-tray-remove="${esc(pending.id)}"]`)) ||
      // The tray is gone: return to the control that added it, if this page shows one, else the main content.
      document.querySelector<HTMLElement>(`button[data-compare-id="${esc(pending.removed)}"]`) ||
      document.getElementById('main-content');
    target?.focus({ preventScroll: target.id === 'main-content' });
  }, [ids]);

  const removeItem = (id: string, name: string) => {
    const index = ids.indexOf(id);
    const rest = ids.filter((x) => x !== id);
    pendingFocus.current = {
      id: rest[index] ?? rest[index - 1] ?? null,
      removed: id,
    };
    setAnnouncement(`${name} removed from compare.${rest.length ? '' : ' The compare list is empty.'}`);
    removeFromCompare(id, 'tray');
  };

  useEffect(() => {
    const root = document.documentElement;
    const el = ref.current;
    if (!visible || !el) {
      root.style.setProperty('--tray-h', '0px');
      root.style.scrollPaddingBottom = '';
      return undefined;
    }
    const update = () => {
      // offsetHeight is 0 while a page hides the tray (data-compare-tray="off").
      // The floating states sit above the edge: count that gap too.
      const height = el.offsetHeight;
      const h = height ? Math.ceil(height + (parseFloat(getComputedStyle(el).bottom) || 0)) : 0;
      root.style.setProperty('--tray-h', `${h}px`);
      // Keyboard focus scrolled into view must land above the fixed tray, not behind it (WCAG 2.4.11).
      root.style.scrollPaddingBottom = h ? `${h + 16}px` : '';
    };
    update();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(update) : null;
    if (ro) ro.observe(el);
    window.addEventListener('resize', update);
    return () => {
      if (ro) ro.disconnect();
      window.removeEventListener('resize', update);
      root.style.setProperty('--tray-h', '0px');
      root.style.scrollPaddingBottom = '';
    };
  }, [visible]);

  // The live region outlives the tray so "… removed" is still read when the last item goes.
  const live = (
    <p className="sr-only" role="status" aria-live="polite">
      {announcement}
    </p>
  );

  if (!visible) return live;

  const ready = ids.length >= 2;
  const missing = 2 - ids.length; // only shown while not ready, i.e. one picked

  return (
    <>
      {live}
      <aside ref={ref} className={s.tray} data-open={open ? 'true' : 'false'} aria-label="Compare selection">
        <div className={s.inner}>
          <div className={s.head}>
            <p className={s.label} id="compare-tray-label">
              Compare{' '}
              <span className="tabular">
                {ids.length}/{MAX_COMPARE}
              </span>
            </p>
            <p className={s.note}>Saved on this device only</p>
            {/* Mobile only: opens/closes the chip row and actions. */}
            <button
              type="button"
              className={s.toggle}
              aria-expanded={open}
              aria-controls="compare-tray-body"
              onClick={() => setOpen(!open)}
            >
              <span className="sr-only">Compare list: </span>
              <span className="tabular">
                {ids.length} of {MAX_COMPARE}
              </span>
              <span className="sr-only">{open ? ', hide details' : ', show details'}</span>
              <ChevronUp className={s.chevron} aria-hidden="true" />
            </button>
          </div>
          <ul className={s.items} id="compare-tray-body" aria-labelledby="compare-tray-label">
            {ids.map((id) => {
              const name = labels[id] || fallbackName(id);
              return (
                <li key={id} className={s.item}>
                  <span className={s.name}>{name}</span>
                  <button
                    type="button"
                    className={s.remove}
                    onClick={() => removeItem(id, name)}
                    aria-label={`Remove ${name} from compare`}
                    data-tray-remove={id}
                  >
                    <X aria-hidden="true" />
                  </button>
                </li>
              );
            })}
          </ul>
          <div className={s.actions}>
            <button
              type="button"
              className={cx(buttonClassName({ variant: 'ghost', size: 'sm' }), s.ghostAction, s.detail)}
              onClick={() => clearCompare('tray')}
              aria-label="Clear compare list on this device"
            >
              <span>Clear</span>
            </button>
            {ready ? (
              <Link
                href={compareHref(ids)}
                className={cx(buttonClassName({ variant: 'primary', size: 'sm' }), s.primaryAction)}
                aria-label={`Compare ${ids.length} of ${MAX_COMPARE} selected mattresses`}
                onClick={() =>
                  track(EVENTS.COMPARISON_STARTED, {
                    count: ids.length,
                    source: 'tray',
                  })
                }
              >
                Compare<span className={s.linkCount}> {ids.length}/{MAX_COMPARE}</span>
              </Link>
            ) : (
              <>
                <span className={cx(s.hint, s.detail)} role="status">
                  Add {missing} more
                </span>
                <Link href="/compare#popular" className={cx(s.hint, s.popular, s.detail)}>
                  Popular comparisons
                </Link>
              </>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
