import type { CSSProperties } from 'react';
import Link from 'next/link';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { MattressRender } from '@/components/ui/MattressRender';
import { firmnessFor } from '@/lib/firmness';
import { queenPriceText } from '@/lib/commerce';
import type { VsPage } from '@/lib/types';
import { typeLabel } from './compareModel';
import { pairColourways } from './PairCard';
import type { PairEntries, PairNames, PairSideKey } from './types';
import styles from './Pair.module.css';

interface PairHeroProps {
  pair: Pick<VsPage, 'title' | 'href' | 'angle'>;
  entries: PairEntries;
  names: PairNames;
}

const SIDES: readonly PairSideKey[] = ['a', 'b'];
/** Longest title line (in characters) that still sets at a legible size on one line at phone width. */
const FIT_MAX_CHARS = 20;

/**
 * The head-to-head hero: both names, a split illustration (labelled as such) and the question the pair answers.
 * Layout stability (CLS): the title is always set as two lines ("A" / "vs B"), each kept on one line from
 * 1200px, so the web-font swap cannot change its line count and push the split down; both stills are above
 * the fold, so both load eagerly into media boxes whose aspect ratio is reserved in CSS.
 */
export function PairHero({ pair, entries, names }: PairHeroProps) {
  const [ca, cb] = pairColourways(entries.a, entries.b);
  const colourways: Record<PairSideKey, string> = { a: ca, b: cb };
  // Longest title line in characters ("A" or "vs B"). From 1200px - and at every width when the lines are
  // short enough to stay legible - each line is kept on one line and the type is capped so it fits the
  // container (see .heroTitle in Pair.module.css). Longer names wrap below 1200px.
  const titleChars = Math.max(names.a.length, names.b.length + 3);
  const fitAtAllWidths = titleChars <= FIT_MAX_CHARS;
  return (
    <section className={`section--cinematic ${styles.hero}`} data-nav-theme="dark" aria-labelledby="pair-title">
      <div className="container container--max">
        <Breadcrumbs
          items={[
            { label: 'Home', href: '/' },
            { label: 'Compare', href: '/compare' },
            { label: pair.title, href: pair.href },
          ]}
        />
        <div className={styles.heroHead} style={{ '--hero-chars': titleChars } as CSSProperties}>
          <p className="eyebrow eyebrow--accent">Head to head</p>
          <h1 id="pair-title" className={styles.heroTitle} data-fit={fitAtAllWidths ? '' : undefined}>
            <span className={styles.heroLine}>{names.a}</span>{' '}
            <span className={styles.heroLine}>
              <em>vs</em> {names.b}
            </span>
          </h1>
        </div>
        <div className={styles.split}>
          {SIDES.map((who) => {
            const e = entries[who];
            const firm = firmnessFor(e);
            return (
              <figure key={who} className={styles.splitItem} data-side={who}>
                <div className={styles.splitMedia}>
                  <MattressRender
                    type={e.type}
                    seed={e.id}
                    colourway={colourways[who]}
                    aspect="card"
                    fill
                    preload
                    objectPosition={who === 'a' ? '40% 58%' : '60% 58%'}
                    sizes="(min-width: 900px) 46vw, 50vw"
                  />
                  <span className={`illus-tag ${styles.splitTag}`}>Illustration · {typeLabel(e.type)}</span>
                </div>
                <figcaption className={styles.splitCaption}>
                  <span className={styles.splitBrand}>{e.brand}</span>
                  <Link href={`/mattress/${e.id}`} className={styles.splitName}>
                    {names[who]}
                  </Link>
                  <span className={styles.splitMeta}>
                    {[typeLabel(e.type), firm ? firm.label : null].filter(Boolean).join(' · ')}
                    <span aria-hidden="true"> · </span>
                    {queenPriceText(e) ? `Queen ${queenPriceText(e)}` : 'No published price'}
                  </span>
                </figcaption>
              </figure>
            );
          })}
          <span className={styles.splitVs} aria-hidden="true">
            vs
          </span>
        </div>
        <p className={`lead ${styles.heroLead}`}>{pair.angle}</p>
      </div>
    </section>
  );
}
