'use client';

import { useEffect, useRef, useState, type CSSProperties, type ElementType, type HTMLAttributes, type RefObject } from 'react';
import { prefersReducedMotion } from '@/components/motion/useReducedMotion';
import { cx } from './cx';
import { reveal as s } from '@/components/ui/systemStyles';

export type RevealState = 'static' | 'pending' | 'shown';

/** Put this class on any element that carries data-reveal={state} from useReveal(). */
export const revealClassName: string = s.reveal ?? '';

interface RevealOptions {
  /** Direct children get --reveal-i (0..n) and cascade by --reveal-stagger (80ms). Add data-reveal-stagger too. */
  stagger?: boolean;
  rootMargin?: string;
}

/**
 * Scroll-reveal hook. Returns [ref, state]; put data-reveal={state} and
 * className={revealClassName} on the element.
 *
 * - Content is visible on the server, without JS and under reduced motion:
 *   only elements that start BELOW the fold are hidden ('pending', one
 *   frame after mount) and they reveal once, on first intersection.
 * - Transform + opacity only (see Reveal.module.css).
 */
export function useReveal<T extends HTMLElement = HTMLElement>({ stagger = false, rootMargin = '0px 0px -10% 0px' }: RevealOptions = {}): [RefObject<T | null>, RevealState] {
  const ref = useRef<T>(null);
  const [state, setState] = useState<RevealState>('static');

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined' || prefersReducedMotion()) return undefined;
    if (stagger) {
      Array.from(el.children).forEach((child, i) => (child as HTMLElement).style.setProperty('--reveal-i', String(i)));
    }
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight * 0.9) return undefined; // already on screen: never hide it
    const raf = requestAnimationFrame(() => setState('pending'));
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setState('shown');
          io.disconnect();
        }
      },
      { rootMargin },
    );
    io.observe(el);
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
    };
  }, [stagger, rootMargin]);

  return [ref, state];
}

interface RevealProps extends HTMLAttributes<HTMLElement> {
  as?: ElementType;
  /** ms */
  delay?: number;
  stagger?: boolean;
  variant?: 'rise' | 'fade' | 'scale';
}

/**
 * Opt-in scroll reveal. Use it for the few things that deserve
 * choreography (a major visual, a row of items, a statement) - not for
 * every element.
 */
export function Reveal({ as: Tag = 'div', delay = 0, stagger = false, variant = 'rise', className, style, children, ...rest }: RevealProps) {
  const [ref, state] = useReveal({ stagger });
  // --reveal-delay is a per-instance runtime value.
  const mergedStyle = delay ? ({ ...style, '--reveal-delay': `${delay}ms` } as CSSProperties) : style;
  return (
    <Tag
      ref={ref}
      className={cx(s.reveal, className)}
      data-reveal={state}
      data-reveal-stagger={stagger ? '' : undefined}
      data-reveal-variant={variant !== 'rise' ? variant : undefined}
      style={mergedStyle}
      {...rest}
    >
      {children}
    </Tag>
  );
}
