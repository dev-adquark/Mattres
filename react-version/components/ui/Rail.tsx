'use client';

import { Children, useCallback, useEffect, useId, useRef, useState } from 'react';
import type { CSSProperties, ElementType, HTMLAttributes, ReactNode } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { prefersReducedMotion } from '@/components/motion/useReducedMotion';
import { cx } from './cx';
import styles from './Rail.module.css';

interface RailProps extends Omit<HTMLAttributes<HTMLElement>, 'children' | 'className' | 'style'> {
  /** Names the carousel for assistive tech ("Previous {label}" / "Next {label}"). */
  label: string;
  /** Element that carries the items; keep `ul`/`ol` for list content. */
  as?: ElementType;
  className?: string;
  /** Items stacked per column of the phone carousel (default 1). */
  rows?: number;
  /** Width of one column on phones, as a CSS length (default 82%, so the next item peeks in). */
  column?: string;
  /** Vertical alignment of items inside a column. */
  align?: 'stretch' | 'start';
  /** Phone carousel items get a card surface (for text rows that were hairline-separated). */
  cards?: boolean;
  children: ReactNode;
}

/**
 * Below 640px the children become a snap-scrolling carousel with a progress
 * bar, an "n of m" counter and previous/next buttons; from 640px up it renders
 * exactly like the plain element it wraps. All children remain in the DOM.
 */
export function Rail({ label, as: Tag = 'div', className, rows = 1, column, align, cards, children, ...rest }: RailProps) {
  const id = useId();
  const ref = useRef<HTMLElement | null>(null);
  const [state, setState] = useState({ start: true, end: false, ratio: 1, offset: 0, page: 1, pages: 1 });
  const total = Children.count(children);

  const measure = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    const ratio = el.scrollWidth > 0 ? Math.min(1, el.clientWidth / el.scrollWidth) : 1;
    const progress = max > 0 ? el.scrollLeft / max : 0;
    const pages = Math.max(1, Math.round(el.scrollWidth / Math.max(1, el.clientWidth * 0.85)));
    setState({
      start: el.scrollLeft <= 2,
      end: max <= 2 || el.scrollLeft >= max - 2,
      ratio,
      offset: progress * (1 - ratio),
      page: Math.min(pages, Math.round(progress * (pages - 1)) + 1),
      pages,
    });
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [measure, total]);

  const step = (direction: 1 | -1) => {
    const el = ref.current;
    if (!el) return;
    el.scrollBy({ left: direction * el.clientWidth * 0.85, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
  };

  const style = {
    '--rail-rows': rows,
    ...(column ? { '--rail-col': column } : null),
    ...(align ? { '--rail-align': align } : null),
  } as CSSProperties;

  return (
    <div className={styles.wrap}>
      <Tag {...rest} ref={ref} id={id} className={cx(styles.rail, cards && styles.cards, className)} style={style} onScroll={measure}>
        {children}
      </Tag>
      <div className={styles.controls}>
        <button type="button" className={styles.btn} aria-label={`Previous ${label}`} aria-controls={id} disabled={state.start} onClick={() => step(-1)}>
          <ChevronLeft aria-hidden="true" />
        </button>
        <div className={styles.progress} aria-hidden="true">
          <span className={styles.thumb} style={{ width: `${state.ratio * 100}%`, transform: `translateX(${(state.offset / Math.max(state.ratio, 0.01)) * 100}%)` }} />
        </div>
        <span className={styles.count} aria-hidden="true">
          {state.page} / {state.pages}
        </span>
        <button type="button" className={styles.btn} aria-label={`Next ${label}`} aria-controls={id} disabled={state.end} onClick={() => step(1)}>
          <ChevronRight aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
