'use client';

import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';

export interface PagerPosition {
  index: number;
  canPrev: boolean;
  canNext: boolean;
  /** The columns don't all fit, so the table scrolls sideways. */
  overflow: boolean;
  /** First and last column (0-based) mostly in view, for the pager's live status. */
  first: number;
  last: number;
}

export interface ColumnPager {
  scrollerRef: RefObject<HTMLDivElement | null>;
  /** The compact sticky lineup's track, kept aligned with the scroller. */
  trackRef: RefObject<HTMLDivElement | null>;
  pos: PagerPosition;
  go: (dir: -1 | 1) => void;
  /** Re-measure (e.g. when the sticky lineup reappears). */
  measure: () => void;
}

/** Columns at least half inside the scroller, right of the sticky row-label column (when it shows). */
function visibleRange(el: HTMLElement, count: number): { first: number; last: number } {
  const box = el.getBoundingClientRect();
  const corner = el.querySelector('thead th:not([data-col])');
  const cornerW = corner ? corner.getBoundingClientRect().width : 0;
  const left = box.left + cornerW;
  let first = -1;
  let last = -1;
  el.querySelectorAll<HTMLElement>('thead th[data-col]').forEach((th) => {
    const r = th.getBoundingClientRect();
    const i = Number(th.dataset.col);
    if (!r.width || !Number.isFinite(i)) return;
    const overlap = Math.min(r.right, box.right) - Math.max(r.left, left);
    if (overlap >= r.width / 2) {
      if (first < 0 || i < first) first = i;
      if (i > last) last = i;
    }
  });
  return first < 0 ? { first: 0, last: Math.max(0, count - 1) } : { first, last };
}

function colWidth(el: HTMLElement): number {
  const first = el.querySelector('thead th[data-col="0"]');
  return first ? first.getBoundingClientRect().width : el.clientWidth;
}

/**
 * Below 960px the comparison table is a 2-up carousel of
 * columns. This tracks which column is in view, whether prev/next are
 * possible, and mirrors the scroll offset onto the compact sticky lineup.
 */
export function useColumnPager(count: number): ColumnPager {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<PagerPosition>({ index: 0, canPrev: false, canNext: count > 1, overflow: false, first: 0, last: Math.max(0, count - 1) });

  const measure = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const overflow = el.scrollWidth - el.clientWidth > 4;
    const w = colWidth(el);
    const index = w ? Math.min(count - 1, Math.round(el.scrollLeft / w)) : 0;
    // Imperative per-scroll transform: a runtime value updated on every scroll frame.
    if (trackRef.current) trackRef.current.style.transform = `translate3d(${-el.scrollLeft}px,0,0)`;
    setPos((prev) => {
      const next = { index, overflow, canPrev: el.scrollLeft > 4, canNext: el.scrollLeft < el.scrollWidth - el.clientWidth - 4, ...visibleRange(el, count) };
      return prev.index === next.index &&
        prev.overflow === next.overflow &&
        prev.canPrev === next.canPrev &&
        prev.canNext === next.canNext &&
        prev.first === next.first &&
        prev.last === next.last
        ? prev
        : next;
    });
  }, [count]);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return undefined;
    const raf = requestAnimationFrame(measure);
    el.addEventListener('scroll', measure, { passive: true });
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null;
    if (ro) ro.observe(el);
    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener('scroll', measure);
      if (ro) ro.disconnect();
    };
  }, [measure]);

  const go = (dir: -1 | 1) => {
    const el = scrollerRef.current;
    if (!el) return;
    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.scrollTo({ left: Math.max(0, (pos.index + dir) * colWidth(el)), behavior: reduce ? 'auto' : 'smooth' });
  };

  return { scrollerRef, trackRef, pos, go, measure };
}

/**
 * The compact sticky lineup is shown only while the real header row is above
 * the viewport and the table is still on screen.
 */
export function useStickyLineup(theadRef: RefObject<HTMLElement | null>, blockRef: RefObject<HTMLElement | null>): boolean {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const head = theadRef.current;
    const block = blockRef.current;
    if (!head || !block || typeof IntersectionObserver === 'undefined') return undefined;
    const navH = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--nav-h')) || 72;
    let headAbove = false;
    let blockOn = false;
    const update = () => setVisible(headAbove && blockOn);
    const io1 = new IntersectionObserver(
      ([e]) => {
        if (!e) return;
        headAbove = !e.isIntersecting && e.boundingClientRect.top < navH;
        update();
      },
      { rootMargin: `-${navH}px 0px 0px 0px` }
    );
    const io2 = new IntersectionObserver(
      ([e]) => {
        if (!e) return;
        blockOn = e.isIntersecting;
        update();
      },
      { rootMargin: `-${navH + 140}px 0px 0px 0px` }
    );
    io1.observe(head);
    io2.observe(block);
    return () => {
      io1.disconnect();
      io2.disconnect();
    };
  }, [theadRef, blockRef]);
  return visible;
}
