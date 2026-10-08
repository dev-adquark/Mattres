import type { CSSProperties } from 'react';
import { cx } from '@/components/ui/cx';
import type { MattressType } from '@/lib/types';
import type { TypeMixItem } from './brandData';
import styles from './Brands.module.css';

/** Runtime values handed to CSS (see .mixBar / .mixSeg in Brands.module.css). */
type MixVars = CSSProperties & { '--mix-ratio'?: string; '--seg-grow'?: number };

interface ConstructionBarProps {
  /** [{ type, label, count, share }] (see brandData.typeMix). */
  mix: readonly TypeMixItem[];
  /** Largest lineup count on the page, so bar length also encodes the model count. */
  max?: number;
  className?: string;
  showText?: boolean;
}

/**
 * Construction mix micro-bar: one segment per type, width = share of the
 * lineup, plus the same facts as text ("3 hybrid · 2 all-foam"). The bar is
 * decorative; the text carries the information.
 */
export function ConstructionBar({ mix, max, className, showText = true }: ConstructionBarProps) {
  const total = mix.reduce((s, m) => s + m.count, 0);
  const ratio = max ? Math.max(0.12, Math.min(1, total / max)) : null;
  const barVars: MixVars | undefined = ratio ? { '--mix-ratio': ratio.toFixed(3) } : undefined;
  return (
    <span className={cx(styles.mix, className)}>
      <span className={styles.mixBar} aria-hidden="true" style={barVars}>
        {mix.map((m) => (
          <span key={m.type} className={styles.mixSeg} data-type={m.type} style={{ '--seg-grow': m.count } as MixVars} />
        ))}
      </span>
      {showText ? (
        <span className={styles.mixText}>
          <span className="tabular">{total}</span> {total === 1 ? 'model' : 'models'}
          <span className={styles.mixSep} aria-hidden="true">
            ·
          </span>
          {mix.map((m, i) => (
            <span key={m.type}>
              {i ? ', ' : ''}
              {m.count} {m.label.toLowerCase()}
            </span>
          ))}
        </span>
      ) : null}
    </span>
  );
}

interface ConstructionLegendProps {
  types: readonly { type: MattressType; label: string }[];
  className?: string;
}

/** Legend for the micro-bar colours (shown once, above the index). */
export function ConstructionLegend({ types, className }: ConstructionLegendProps) {
  return (
    <ul className={cx(styles.legend, className)} aria-label="Construction colors">
      {types.map((t) => (
        <li key={t.type}>
          <span className={styles.mixSeg} data-type={t.type} aria-hidden="true" />
          {t.label}
        </li>
      ))}
    </ul>
  );
}
