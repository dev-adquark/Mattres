'use client';

import { Children, isValidElement, useCallback, useEffect, useId, useRef, useState, type CSSProperties, type KeyboardEvent, type ReactNode } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { track, EVENTS } from '@/lib/analytics';
import { cx } from '@/components/ui/cx';
import { prefersReducedMotion } from './useReducedMotion';
import { slider as s } from '@/components/ui/systemStyles';

/** Slides per view: one number, or per breakpoint (base <640, sm, md >=900, lg >=1200, xl >=1600). */
export type PerView = number | Partial<Record<'base' | 'sm' | 'md' | 'lg' | 'xl', number>>;
type SliderAction = 'next' | 'prev' | 'drag' | 'swipe' | 'key' | 'dot';

/** Focus targets inside a slide; anything removed from the tab order or hidden from assistive tech is skipped. */
const NOT_HIDDEN = ':not([tabindex="-1"]):not([aria-hidden="true"]):not([aria-hidden="true"] *)';
const FOCUSABLE = ['a[href]', 'button:not([disabled])', 'input:not([disabled])', 'select:not([disabled])', 'textarea:not([disabled])', '[tabindex]']
  .map((sel) => sel + NOT_HIDDEN)
  .join(', ');
const DEFAULT_PER_VIEW = { base: 1.12, sm: 1.6, md: 2.3, lg: 3.1, xl: 3.6 };

const pad = (n: number) => String(n).padStart(2, '0');

/**
 * Prev/next buttons + "01 / 08" counter. Presentational: use inside a
 * <Slider> (it renders its own) or wire to any custom scroller.
 *
 * An end-of-track button is aria-disabled, never natively `disabled`: a
 * native disabled button drops keyboard focus to <body> the moment the
 * press that reached the end re-renders it (WCAG 2.4.3), so the button
 * keeps focus, says it is unavailable and ignores further presses.
 * `status` (optional) is announced in a polite live region, for scrollers
 * that do not announce their own position (e.g. the compare column pager).
 */
interface SliderControlsProps {
  onPrev: () => void;
  onNext: () => void;
  canPrev?: boolean;
  canNext?: boolean;
  index?: number;
  total?: number;
  label?: string;
  /** id of the controlled scroller. */
  controls?: string;
  showCount?: boolean;
  /** Live position text, e.g. "Showing columns 2–3 of 3". Omit when the scroller announces itself. */
  status?: string;
  className?: string;
}

export function SliderControls({ onPrev, onNext, canPrev = true, canNext = true, index = 0, total = 0, label = 'slide', controls, showCount = true, status, className }: SliderControlsProps) {
  const btn = cx('slider-controls__btn', s.btn);
  return (
    <div className={cx(s.controls, className)}>
      {showCount && total > 0 ? (
        <span className={s.count} aria-hidden="true">
          <strong>{pad(Math.min(index + 1, total))}</strong>
          <span className={s.sep}>/</span>
          {pad(total)}
        </span>
      ) : null}
      <button type="button" className={btn} onClick={canPrev ? onPrev : undefined} aria-disabled={canPrev ? undefined : true} aria-label={`Previous ${label}`} aria-controls={controls}>
        <ArrowLeft aria-hidden="true" />
      </button>
      <button type="button" className={btn} onClick={canNext ? onNext : undefined} aria-disabled={canNext ? undefined : true} aria-label={`Next ${label}`} aria-controls={controls}>
        <ArrowRight aria-hidden="true" />
      </button>
      {status !== undefined ? (
        <span className="sr-only" aria-live="polite" aria-atomic="true">
          {status}
        </span>
      ) : null}
    </div>
  );
}

/** --spv* custom properties: the caller's slides-per-view, read by Slider.module.css. */
function perViewStyle(perView: PerView | undefined): Record<string, number> {
  const pv: Partial<Record<'base' | 'sm' | 'md' | 'lg' | 'xl', number>> = typeof perView === 'number' ? { base: perView } : { ...DEFAULT_PER_VIEW, ...(perView || {}) };
  const style: Record<string, number> = {};
  if (pv.base) style['--spv'] = pv.base;
  if (pv.sm) style['--spv-sm'] = pv.sm;
  if (pv.md) style['--spv-md'] = pv.md;
  if (pv.lg) style['--spv-lg'] = pv.lg;
  if (pv.xl) style['--spv-xl'] = pv.xl;
  return style;
}

/**
 * Accessible editorial carousel built on native horizontal scroll-snap.
 * Rule-free hooks for parents: .slider, .slider__head, .slider__track,
 * .slider__foot, .slider-controls__btn. Supports mouse drag,
 * touch swipe (native), prev/next buttons, keyboard (Arrow keys / Home /
 * End move between slides and focus the slide's first control), a live
 * region ("3 of 8"), edge fades, and a progress hairline or dots.
 * Fires slider_interaction {slider, action, index, total}.
 */
interface SliderProps {
  /** Accessible name of the carousel. */
  label: string;
  id?: string;
  children: ReactNode;
  perView?: PerView;
  /** CSS length for --slider-gap. */
  gap?: string;
  controls?: 'bottom' | 'top' | 'none';
  progress?: 'bar' | 'dots' | false | null;
  edgeFade?: boolean;
  /** Run the track to the right viewport edge. */
  bleed?: boolean;
  header?: ReactNode;
  slideLabel?: (index: number, total: number) => string;
  onIndexChange?: (index: number) => void;
  className?: string;
  trackClassName?: string;
  slideClassName?: string;
  style?: CSSProperties;
}

export function Slider({
  label,
  id,
  children,
  perView,
  gap,
  controls = 'bottom',
  progress = 'bar',
  edgeFade = true,
  bleed = false,
  header = null,
  slideLabel,
  onIndexChange,
  className,
  trackClassName,
  slideClassName,
  style,
}: SliderProps) {
  const slides = Children.toArray(children).filter(Boolean);
  const total = slides.length;
  const sliderId = id || String(label || 'slider').toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const baseId = useId();
  const trackId = `${baseId}-track`;
  const trackRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLSpanElement>(null);
  const [index, setIndex] = useState(0);
  const [edges, setEdges] = useState({ start: true, end: total <= 1 });
  const [announce, setAnnounce] = useState('');
  const [slidesInert, setSlidesInert] = useState(false);
  const indexRef = useRef(0);
  const gesture = useRef({ swiping: false, swipeSent: false });
  const changeCb = useRef(onIndexChange);
  useEffect(() => {
    changeCb.current = onIndexChange;
  });

  const slideEls = useCallback(() => {
    const t = trackRef.current;
    return t ? (Array.from(t.children) as HTMLElement[]) : [];
  }, []);

  const send = useCallback(
    (action: SliderAction, i?: number) => track(EVENTS.SLIDER_INTERACTION, { slider: sliderId, action, index: (i ?? indexRef.current) + 1, total }),
    [sliderId, total],
  );

  const measure = useCallback(() => {
    const t = trackRef.current;
    if (!t) return;
    const els = slideEls();
    if (!els.length) return;
    const first = els[0] as HTMLElement;
    const origin = first.offsetLeft;
    const x = t.scrollLeft;
    let best = 0;
    let bestDist = Infinity;
    els.forEach((el, i) => {
      const d = Math.abs(el.offsetLeft - origin - x);
      if (d < bestDist) {
        bestDist = d;
        best = i;
      }
    });
    const max = t.scrollWidth - t.clientWidth;
    const atStart = x <= 2;
    const atEnd = x >= max - 2;
    if (atEnd) best = Math.max(best, els.length - 1 - Math.floor((t.clientWidth - 1) / Math.max(1, first.offsetWidth)));
    if (best !== indexRef.current) {
      indexRef.current = best;
      setIndex(best);
      if (changeCb.current) changeCb.current(best);
    }
    setEdges((prev) => (prev.start === atStart && prev.end === atEnd ? prev : { start: atStart, end: atEnd }));
    if (barRef.current) {
      const ratio = t.scrollWidth > 0 ? Math.min(1, (x + t.clientWidth) / t.scrollWidth) : 1;
      barRef.current.style.transform = `scaleX(${ratio.toFixed(4)})`;
    }
  }, [slideEls]);

  const goTo = useCallback(
    (i: number, { focus = false, action }: { focus?: boolean; action?: SliderAction } = {}) => {
      const t = trackRef.current;
      const els = slideEls();
      if (!t || !els.length) return;
      const next = Math.max(0, Math.min(els.length - 1, i));
      const el = els[next] as HTMLElement;
      t.scrollTo({ left: el.offsetLeft - (els[0] as HTMLElement).offsetLeft, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
      if (focus) {
        // First control a keyboard user can actually reach: skip tabindex=-1 and anything inside an aria-hidden wrapper (decorative image links).
        const target =
          Array.from(el.querySelectorAll<HTMLElement>(FOCUSABLE)).find((n) => n.tabIndex >= 0 && !n.closest('[aria-hidden="true"]')) || el;
        if (target === el) el.setAttribute('tabindex', '-1');
        target.focus({ preventScroll: true });
      }
      setAnnounce(`${label ? `${label}: ` : ''}${next + 1} of ${els.length}`);
      if (action) send(action, next);
    },
    [label, send, slideEls],
  );

  // Scroll + resize tracking, touch swipe detection.
  useEffect(() => {
    const t = trackRef.current;
    if (!t) return undefined;
    let frame = 0;
    let settle: ReturnType<typeof setTimeout> | undefined;
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(() => {
        frame = 0;
        measure();
      });
      if (gesture.current.swiping && !gesture.current.swipeSent) {
        gesture.current.swipeSent = true;
        send('swipe');
      }
      clearTimeout(settle);
      settle = setTimeout(measure, 140);
    };
    const onTouchStart = () => {
      gesture.current = { swiping: true, swipeSent: false };
    };
    const onTouchEnd = () => {
      gesture.current.swiping = false;
    };
    measure();
    setSlidesInert(!t.querySelector(FOCUSABLE));
    t.addEventListener('scroll', onScroll, { passive: true });
    t.addEventListener('touchstart', onTouchStart, { passive: true });
    t.addEventListener('touchend', onTouchEnd, { passive: true });
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => measure()) : null;
    if (ro) ro.observe(t);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      clearTimeout(settle);
      t.removeEventListener('scroll', onScroll);
      t.removeEventListener('touchstart', onTouchStart);
      t.removeEventListener('touchend', onTouchEnd);
      if (ro) ro.disconnect();
    };
  }, [measure, send, total]);

  // Plain Tab / Shift+Tab into a slide that is (partly) outside the visible
  // track: the browser's focus scroll is skipped or snapped straight back by
  // `scroll-snap-type: x mandatory`, leaving the focused card and its ring
  // clipped by the edge. Move the snap target to that slide instead.
  // Keyboard focus only (:focus-visible), so a mouse press on a partly
  // visible card never starts a scroll under the pointer or fights a drag.
  useEffect(() => {
    const t = trackRef.current;
    if (!t) return undefined;
    const onFocusIn = (e: FocusEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target || target === t) return;
      try {
        if (!target.matches(':focus-visible')) return;
      } catch {
        /* :focus-visible unsupported: treat it as keyboard focus */
      }
      const els = slideEls();
      const i = els.findIndex((el) => el.contains(target));
      if (i < 0) return;
      const cs = getComputedStyle(t);
      // The left edge fade is the track's scroll-padding; the right fade has
      // the same width and covers the edge until the track reaches its end.
      const padL = parseFloat(cs.scrollPaddingLeft) || 0;
      const atEnd = t.scrollLeft >= t.scrollWidth - t.clientWidth - 2;
      const padR = Math.max(parseFloat(cs.scrollPaddingRight) || 0, atEnd ? 0 : padL);
      const tr = t.getBoundingClientRect();
      const sr = (els[i] as HTMLElement).getBoundingClientRect();
      if (sr.left < tr.left + padL - 1) {
        goTo(i);
      } else if (sr.right > tr.right - padR + 1) {
        // Moving forward: advance only as far as needed, to the first snap
        // point that brings the whole slide into view (never past the slide).
        const origin = (els[0] as HTMLElement).offsetLeft;
        const need = t.scrollLeft + (sr.right - (tr.right - padR));
        let j = i;
        for (let k = indexRef.current; k < i; k += 1) {
          if ((els[k] as HTMLElement).offsetLeft - origin >= need - 1) {
            j = k;
            break;
          }
        }
        goTo(j);
      }
    };
    t.addEventListener('focusin', onFocusIn);
    return () => t.removeEventListener('focusin', onFocusIn);
  }, [goTo, slideEls]);

  // Mouse drag (touch and pen use native scrolling).
  useEffect(() => {
    const t = trackRef.current;
    if (!t) return undefined;
    let start: { x: number; scroll: number; index: number } | null = null;
    let moved = false;
    const onMove = (e: PointerEvent) => {
      if (!start) return;
      const dx = e.clientX - start.x;
      if (!moved && Math.abs(dx) > 5) {
        moved = true;
        t.dataset.dragging = 'true';
      }
      if (moved) t.scrollLeft = start.scroll - dx;
    };
    const onUp = (e: PointerEvent) => {
      if (!start) return;
      const dx = e.clientX - start.x;
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      if (moved) {
        delete t.dataset.dragging;
        // Suppress the click that ends a drag so a card link doesn't open.
        const block = (ev: Event) => {
          ev.preventDefault();
          ev.stopPropagation();
        };
        t.addEventListener('click', block, { capture: true, once: true });
        setTimeout(() => t.removeEventListener('click', block, { capture: true }), 0);
        const dir = dx < -40 ? 1 : dx > 40 ? -1 : 0;
        const els = slideEls();
        const origin = els[0] ? els[0].offsetLeft : 0;
        let nearest = 0;
        let dist = Infinity;
        els.forEach((el, i) => {
          const d = Math.abs(el.offsetLeft - origin - t.scrollLeft);
          if (d < dist) {
            dist = d;
            nearest = i;
          }
        });
        const target = dir === 0 ? nearest : dir > 0 ? Math.max(nearest, start.index + 1) : Math.min(nearest, start.index - 1);
        goTo(target);
        send('drag', Math.max(0, Math.min(total - 1, target)));
      }
      start = null;
      moved = false;
    };
    const onDown = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse' || e.button !== 0) return;
      if ((e.target as Element).closest('input, select, textarea, [role="slider"]')) return;
      start = { x: e.clientX, scroll: t.scrollLeft, index: indexRef.current };
      moved = false;
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
      window.addEventListener('pointercancel', onUp);
    };
    const onDragStart = (e: Event) => e.preventDefault();
    t.addEventListener('pointerdown', onDown);
    t.addEventListener('dragstart', onDragStart);
    return () => {
      t.removeEventListener('pointerdown', onDown);
      t.removeEventListener('dragstart', onDragStart);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  }, [goTo, send, slideEls, total]);

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const target = e.target as Element;
    if (target.closest && target.closest('input, select, textarea, [role="slider"], [role="tablist"]')) return;
    let next: number | null = null;
    if (e.key === 'ArrowRight') next = indexRef.current + 1;
    else if (e.key === 'ArrowLeft') next = indexRef.current - 1;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = total - 1;
    if (next === null) return;
    e.preventDefault();
    goTo(next, { focus: true, action: 'key' });
  };

  const canPrev = !edges.start;
  const canNext = !edges.end;
  // The track is a tab stop only when keyboard users need it: its slides have
  // nothing focusable of their own AND the content actually overflows (at
  // wide viewports where every slide fits, arrow keys would do nothing).
  const trackFocusable = slidesInert && (canPrev || canNext);
  const showControls = controls !== 'none' && total > 1;
  const controlsEl = showControls ? (
    <SliderControls
      index={index}
      total={total}
      canPrev={canPrev}
      canNext={canNext}
      controls={trackId}
      onPrev={() => goTo(indexRef.current - 1, { action: 'prev' })}
      onNext={() => goTo(indexRef.current + 1, { action: 'next' })}
    />
  ) : null;

  return (
    <section
      className={cx('slider', s.slider, bleed && s.bleed, edgeFade && s.fade, className)}
      aria-roledescription="carousel"
      aria-label={label}
      data-at-start={edges.start ? 'true' : 'false'}
      data-at-end={edges.end ? 'true' : 'false'}
      style={{ ...perViewStyle(perView), ...(gap ? { '--slider-gap': gap } : null), ...style } as CSSProperties}
    >
      {header || controls === 'top' ? (
        <div className={cx('slider__head', s.head)}>
          {header ? <div className={s.heading}>{header}</div> : <span />}
          {controls === 'top' ? controlsEl : null}
        </div>
      ) : null}
      <div className={s.viewport}>
        <div
          id={trackId}
          ref={trackRef}
          className={cx('slider__track', s.track, trackClassName)}
          onKeyDown={onKeyDown}
          tabIndex={trackFocusable ? 0 : undefined}
          aria-label={trackFocusable ? `${label}, use arrow keys to move between slides` : undefined}
          role={trackFocusable ? 'group' : undefined}
        >
          {slides.map((child, i) => (
            <div
              key={(isValidElement(child) ? child.key : null) ?? i}
              className={cx(s.slide, slideClassName)}
              role="group"
              aria-roledescription="slide"
              aria-label={slideLabel ? slideLabel(i, total) : `${i + 1} of ${total}`}
              data-active={i === index ? 'true' : undefined}
            >
              {child}
            </div>
          ))}
        </div>
      </div>
      {(controls === 'bottom' && showControls) || (progress && total > 1) ? (
        <div className={cx('slider__foot', s.foot)}>
          {progress === 'bar' ? (
            <div className={s.progress} aria-hidden="true">
              <span ref={barRef} className={s.progressFill} />
            </div>
          ) : progress === 'dots' && total <= 12 ? (
            <div className={s.dots}>
              {slides.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  className={s.dot}
                  aria-label={`Go to slide ${i + 1} of ${total}`}
                  aria-current={i === index ? 'true' : undefined}
                  aria-controls={trackId}
                  onClick={() => goTo(i, { action: 'dot' })}
                />
              ))}
            </div>
          ) : (
            <span />
          )}
          {controls === 'bottom' ? controlsEl : null}
        </div>
      ) : null}
      <p className="sr-only" aria-live="polite" aria-atomic="true">
        {announce}
      </p>
    </section>
  );
}
