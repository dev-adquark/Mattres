'use client';

import { useMemo, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { MattressRender } from '@/components/ui/MattressRender';
import { cx } from '@/components/ui/cx';
import type { MattressType } from '@/lib/types';
import { ConstructionBar } from './ConstructionBar';
import { typeWord } from './brandCopy';
import type { IndexMeta, TypeMixItem } from './brandData';
import { useCursorFollow } from './useCursorFollow';
import styles from './Brands.module.css';

/** One brand row, computed on the server from catalog facts. */
export interface BrandIndexRow {
  slug: string;
  name: string;
  count: number;
  priceMin: number | null;
  mix: TypeMixItem[];
  meta: IndexMeta;
  type: MattressType | null;
  seed: string;
}

type SortId = 'az' | 'models' | 'price';

const SORTS: readonly { id: SortId; label: string }[] = [
  { id: 'az', label: 'A–Z' },
  { id: 'models', label: 'Most models' },
  { id: 'price', label: 'Lowest Queen price' },
];

function sortRows(rows: readonly BrandIndexRow[], sort: SortId): BrandIndexRow[] {
  const list = [...rows];
  if (sort === 'models') list.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  else if (sort === 'price') list.sort((a, b) => (a.priceMin ?? Infinity) - (b.priceMin ?? Infinity) || a.name.localeCompare(b.name));
  else list.sort((a, b) => a.name.localeCompare(b.name));
  return list;
}

/**
 * The numbered brand index. Rows are plain links (server-rendered data);
 * this component adds a sort control and, on a fine pointer with motion
 * allowed, a 240px construction still that follows the cursor (lerped).
 * On touch / narrow screens each row shows a small still instead.
 */
export function BrandIndex({ rows }: { rows: readonly BrandIndexRow[] }) {
  const [sort, setSort] = useState<SortId>('az');
  const sorted = useMemo(() => sortRows(rows, sort), [rows, sort]);
  const types = useMemo(() => [...new Set(rows.map((r) => r.type).filter((t): t is MattressType => Boolean(t)))], [rows]);
  const maxCount = useMemo(() => Math.max(1, ...rows.map((r) => r.count)), [rows]);
  const [active, setActive] = useState<BrandIndexRow | null>(null);
  const { enabled: floating, ref: floatRef, snapTo } = useCursorFollow<HTMLDivElement>();

  const enter = (row: BrandIndexRow, e: ReactPointerEvent) => {
    if (!floating) return;
    // Start at the cursor so the still doesn't fly in from the corner.
    if (active === null) snapTo(e);
    setActive(row);
  };

  return (
    <div className={styles.indexWrap}>
      <div className={styles.indexBar}>
        <p className={styles.indexCount}>
          <span className="tabular">{rows.length}</span> brands
        </p>
        <div className={styles.sort} role="group" aria-label="Sort brands">
          {SORTS.map((s) => (
            <button key={s.id} type="button" className={styles.sortBtn} aria-pressed={sort === s.id} onClick={() => setSort(s.id)}>
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <ol className={styles.brandIndex} onPointerLeave={() => setActive(null)}>
        {sorted.map((row, i) => (
          <li key={row.slug}>
            <Link
              href={`/brands/${row.slug}`}
              className={styles.brandRow}
              onPointerEnter={(e) => enter(row, e)}
              onFocus={() => setActive(null)}
              data-active={active?.slug === row.slug || undefined}
            >
              <span className={styles.brandNum} aria-hidden="true">
                {String(i + 1).padStart(2, '0')}
              </span>
              <span className={styles.brandThumb} aria-hidden="true">
                <MattressRender type={row.type} seed={row.seed} aspect="card" size="fluid" fill sizes="72px" />
              </span>
              <h2 className={styles.brandName}>{row.name}</h2>
              <span className={styles.brandMeta}>
                <ConstructionBar mix={row.mix} max={maxCount} />
                <span className={styles.brandFacts}>
                  <span>{row.meta.price}</span>
                  <span>{row.meta.verified}</span>
                </span>
              </span>
              <ArrowRight className={styles.brandArrow} aria-hidden="true" />
            </Link>
          </li>
        ))}
      </ol>

      {floating ? (
        <div ref={floatRef} className={cx(styles.float, active && styles.floatOn)} aria-hidden="true">
          <div className={styles.floatFrame}>
            {types.map((t) => (
              <div key={t} className={styles.floatStill} data-on={active?.type === t || undefined}>
                <MattressRender type={t} aspect="cutaway" size="fluid" fill sizes="240px" />
              </div>
            ))}
            <p className={styles.floatCap}>
              <span className="illus-tag">Illustration{active?.type ? ` · typical ${typeWord(active.type)}` : ''}</span>
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
