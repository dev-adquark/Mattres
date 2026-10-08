import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { MattressRender } from '@/components/ui/MattressRender';
import { COLOURWAYS, colourwayFor, type Colourway } from '@/components/ui/render-stills/stills';
import type { MattressEntry, VsPage } from '@/lib/types';
import { columnName } from './compareModel';
import type { HeadingLevel } from './types';
import styles from './Pair.module.css';

type PairEntryRef = Pick<MattressEntry, 'id' | 'brand' | 'model' | 'type'>;

/** Two different colourways so the two halves of a pair never look identical. */
export function pairColourways(a: Pick<MattressEntry, 'id'>, b: Pick<MattressEntry, 'id'>): [Colourway, Colourway] {
  const ca = colourwayFor(a.id);
  let cb = colourwayFor(b.id);
  if (cb === ca) cb = COLOURWAYS[(COLOURWAYS.indexOf(ca) + 2) % COLOURWAYS.length] ?? cb;
  return [ca, cb];
}

interface PairCardProps {
  pair: Pick<VsPage, 'href' | 'short'> | null | undefined;
  a: PairEntryRef | null | undefined;
  b: PairEntryRef | null | undefined;
  headingLevel?: HeadingLevel;
  className?: string;
}

const HALF_SIZES = '(min-width: 1200px) 16vw, (min-width: 640px) 30vw, 45vw';

/**
 * A head-to-head as an editorial module: a split still (each half is an
 * original illustration of the mattress TYPE, cropped edge to edge, never
 * letterboxed), the question it answers and the two names. Server-safe.
 */
export function PairCard({ pair, a, b, headingLevel = 'h3', className }: PairCardProps) {
  if (!pair || !a || !b) return null;
  const Heading = headingLevel;
  const [ca, cb] = pairColourways(a, b);
  return (
    <article className={`${styles.card} ${className || ''}`}>
      <div className={styles.cardMedia}>
        <div className={styles.cardHalf}>
          <MattressRender type={a.type} seed={a.id} colourway={ca} aspect="card" fill objectPosition="38% 55%" sizes={HALF_SIZES} />
        </div>
        <div className={styles.cardHalf}>
          <MattressRender type={b.type} seed={b.id} colourway={cb} aspect="card" fill objectPosition="62% 55%" sizes={HALF_SIZES} />
        </div>
        <span className={styles.cardVs} aria-hidden="true">
          vs
        </span>
        <span className={`illus-tag ${styles.cardTag}`}>Illustrations</span>
      </div>
      <div className={styles.cardBody}>
        <p className={styles.cardKicker}>{pair.short}</p>
        <Heading className={styles.cardTitle}>
          <Link href={pair.href} className={styles.cardLink}>
            {columnName(a)} <em>vs</em> {columnName(b)}
          </Link>
        </Heading>
        <span className={styles.cardMore} aria-hidden="true">
          Head to head <ArrowUpRight />
        </span>
      </div>
    </article>
  );
}
