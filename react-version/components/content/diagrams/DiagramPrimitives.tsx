import type { ReactNode } from 'react';
import { cx } from '@/components/ui/cx';
import styles from '../Diagrams.module.css';

/**
 * SVG building blocks shared by the conceptual guide diagrams. Line art
 * only; colours come from the section tokens via the CSS module.
 */

/** `true` shows the diagram's default caption, `false` none, a string replaces it. */
export type DiagramCaption = boolean | string;

/** The caption text a Frame should render for a DiagramCaption value. */
export function captionText(caption: DiagramCaption, fallback: string): string | null {
  if (caption === true) return fallback;
  return caption || null;
}

interface FrameProps {
  /** Accessible description of the whole diagram. */
  label: string;
  caption?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function Frame({ label, caption, children, className }: FrameProps) {
  return (
    <figure className={cx(styles.figure, className)}>
      <svg className={styles.svg} viewBox="0 0 440 280" role="img" aria-label={label} focusable="false">
        {children}
      </svg>
      {caption ? <figcaption className={styles.caption}>{caption}</figcaption> : null}
    </figure>
  );
}

interface SlabProps {
  x: number;
  y: number;
  w: number;
  h?: number;
  /** Share of the height taken by the comfort layer. */
  comfort?: number;
  coils?: boolean;
  dense?: boolean;
}

/** Mattress cross-section slab with a comfort layer over a core. */
export function Slab({ x, y, w, h = 70, comfort = 0.38, coils = false, dense = false }: SlabProps) {
  const ch = h * comfort;
  const coilsEls: ReactNode[] = [];
  if (coils) {
    const n = Math.floor(w / 16);
    for (let i = 0; i < n; i += 1) {
      const cx0 = x + 8 + (i * (w - 16)) / (n - 1);
      coilsEls.push(
        <path
          key={i}
          className={styles.coil}
          d={`M${cx0} ${y + ch + 4} q 5 4 0 8 q -5 4 0 8 q 5 4 0 8 q -5 4 0 8 q 5 4 0 8`}
        />,
      );
    }
  }
  return (
    <g>
      <rect className={styles.layerComfort} x={x} y={y} width={w} height={ch} />
      <rect className={dense ? styles.layerDense : styles.layerCore} x={x} y={y + ch} width={w} height={h - ch} />
      {coilsEls}
      <rect className={styles.outline} x={x} y={y} width={w} height={h} rx="3" />
    </g>
  );
}

interface ArrowProps {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  className?: string;
}

export function Arrow({ x1, y1, x2, y2, className }: ArrowProps) {
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const a = 6;
  const p1 = [x2 - a * Math.cos(angle - 0.5), y2 - a * Math.sin(angle - 0.5)];
  const p2 = [x2 - a * Math.cos(angle + 0.5), y2 - a * Math.sin(angle + 0.5)];
  return (
    <g className={cx(styles.arrow, className)}>
      <line x1={x1} y1={y1} x2={x2} y2={y2} />
      <polyline points={`${p1.join(',')} ${x2},${y2} ${p2.join(',')}`} />
    </g>
  );
}
