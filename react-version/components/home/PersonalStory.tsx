'use client';

import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import { Slider } from '@/components/motion';
import { cssVars, type CssVars } from '@/components/ui/cssVars';
import styles from './Home.module.css';

/** The pinned horizontal story runs only on desktop with motion allowed; everything else gets the slider. */
const HORIZONTAL_QUERY = '(min-width: 900px) and (prefers-reduced-motion: no-preference)';

function subscribe(cb: () => void): () => void {
  if (typeof window === 'undefined' || !window.matchMedia) return () => {};
  const mq = window.matchMedia(HORIZONTAL_QUERY);
  mq.addEventListener('change', cb);
  return () => mq.removeEventListener('change', cb);
}
const getSnapshot = (): boolean => typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia(HORIZONTAL_QUERY).matches;

interface PersonalStoryProps {
  /** The section's h3, rendered on the server. */
  title: ReactNode;
  /** One server-rendered <article> per panel, in order. */
  panels: ReactNode[];
  /** Accessible name for the carousel / story region. */
  label: string;
}

const pad = (n: number): string => String(n).padStart(2, '0');

/**
 * "What moves the answer" as a sticky horizontal story (brief v3 s39):
 * on desktop with motion allowed, the section pins and vertical scroll
 * advances the panels sideways, one at a time, with a counter and a
 * progress hairline. Scroll maps 1:1 to the horizontal travel.
 *
 * Fallbacks (same panels, nothing hidden): under 900px a swipeable slider;
 * under reduced motion the same slider, which shows all three panels side
 * by side on desktop - no pinning, no scroll-linked movement.
 */
export function PersonalStory({ title, panels, label }: PersonalStoryProps) {
  const horizontal = useSyncExternalStore(subscribe, getSnapshot, () => false);
  if (!horizontal) {
    return (
      <>
        {title}
        <Slider label={label} id="home-understand" perView={{ base: 1.08, sm: 1.6, md: 3 }} controls="bottom" progress="bar" edgeFade={false} className={styles.panels}>
          {panels}
        </Slider>
      </>
    );
  }
  return <HorizontalTrack title={title} panels={panels} label={label} />;
}

/** Breathing room between the fixed nav and a pinned stage that is as tall as the space below it. */
const PIN_GAP = 24;

function HorizontalTrack({ title, panels, label }: PersonalStoryProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const pinRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLOListElement>(null);
  const [shift, setShift] = useState(0);
  const [edge, setEdge] = useState<number | null>(null);
  const [pin, setPin] = useState<{ top: number; height: number } | null>(null);
  const [active, setActive] = useState(0);
  const total = panels.length;
  // Latest geometry for the scroll handler (read in rAF, not reactive).
  const geo = useRef({ top: 0, shift: 0 });

  // Geometry, measured rather than reserved:
  //  - horizontal travel = how far the track overflows its clipped viewport, so the
  //    last panel comes to rest on the grid's right edge;
  //  - the stage is only as tall as its content and pins centred in the space below
  //    the nav, and the wrapper is exactly stage height + travel - so nothing is left
  //    behind before the first panel or after the last one.
  useEffect(() => {
    const viewport = viewportRef.current;
    const track = trackRef.current;
    const stage = pinRef.current;
    if (!viewport || !track || !stage) return undefined;
    const measure = () => {
      const nextShift = Math.max(0, Math.round(track.scrollWidth - viewport.clientWidth));
      const vh = window.innerHeight;
      const navH = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--nav-h')) || 72;
      const height = Math.round(stage.offsetHeight);
      const room = vh - navH;
      const top = Math.round(height + PIN_GAP * 2 <= room ? navH + (room - height) / 2 : navH + PIN_GAP);
      geo.current = { top, shift: nextShift };
      setShift(nextShift);
      setPin((prev) => (prev && prev.top === top && prev.height === height ? prev : { top, height }));
      // Align the pinned stage's content with the surrounding container (the wrapper itself is full-bleed).
      const host = rootRef.current?.parentElement;
      if (host) setEdge(Math.max(0, Math.round(host.getBoundingClientRect().left)));
    };
    measure();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null;
    ro?.observe(viewport);
    ro?.observe(track);
    ro?.observe(stage);
    window.addEventListener('resize', measure);
    return () => {
      ro?.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [total]);

  // Scroll -> --progress (0..1): 0 when the stage reaches its pinned position,
  // 1 when the wrapper has scrolled through exactly the horizontal travel.
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;
    let frame = 0;
    let last = -1;
    const update = () => {
      frame = 0;
      const { top, shift: travel } = geo.current;
      const raw = travel > 0 ? (top - root.getBoundingClientRect().top) / travel : 0;
      const p = raw < 0 ? 0 : raw > 1 ? 1 : raw;
      if (Math.abs(p - last) < 0.0005 && p !== 0 && p !== 1) return;
      last = p;
      root.style.setProperty('--progress', p.toFixed(4));
      const next = Math.min(total - 1, Math.max(0, Math.round(p * (total - 1))));
      setActive((prev) => (prev === next ? prev : next));
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [total, shift, pin]);

  const vars: CssVars = { '--shift': `${shift}px` };
  if (edge !== null) vars['--story-edge'] = `${edge}px`;
  if (pin) {
    vars['--pin-top'] = `${pin.top}px`;
    vars['--pin-h'] = `${pin.height}px`;
  }

  return (
    <div ref={rootRef} className={`full-bleed ${styles.hstory}`} style={cssVars(vars)} role="region" aria-label={label}>
      <div ref={pinRef} className={styles.hpin}>
        <div className={styles.hhead}>
          {title}
          <p className={styles.hcount} aria-hidden="true">
            <strong>{pad(active + 1)}</strong> / {pad(total)}
          </p>
        </div>
        {/* Clipped to the content box: panels travelling out fade at the grid edge
            instead of painting into the gutter under the chapter rail. */}
        <div ref={viewportRef} className={styles.hviewport}>
          <ol className={styles.htrack} ref={trackRef}>
            {panels.map((panel, i) => (
              <li key={i} className={styles.hslide} data-active={i === active ? 'true' : 'false'}>
                {panel}
              </li>
            ))}
          </ol>
        </div>
        <div className={styles.hbar} aria-hidden="true">
          <span />
        </div>
      </div>
    </div>
  );
}
