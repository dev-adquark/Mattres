import { JsonLd } from '@/components/ui/JsonLd';
import { absoluteUrl } from '@/lib/site';
import type { MattressEntry, VsPage } from '@/lib/types';
import { columnName } from './compareModel';
import { PairHero } from './PairHero';
import { PairVerdict } from './PairVerdict';
import { PairDimensions } from './PairDimensions';
import { PairChoose } from './PairChoose';
import { PairFacts } from './PairFacts';
import { PairNext } from './PairNext';
import { TrackComparison } from './TrackComparison';
import type { PairData, PairNames } from './types';
import styles from './Pair.module.css';

interface PairPageProps {
  /** The curated pair (lib/comparePairs). */
  pair: VsPage;
  /** pairModel.buildPairData(pair). */
  data: PairData;
  /** All catalog entries, for related pairs. */
  catalog: readonly MattressEntry[];
}

/**
 * A curated head-to-head (/compare/<a>-vs-<b>). Server component.
 * Every number is the catalog's or the engine's; no overall winner is declared
 * because which mattress is better depends on the sleeper.
 */
export function PairPage({ pair, data, catalog }: PairPageProps) {
  const { rows, entries } = data;
  const { a, b } = entries;
  const names: PairNames = { a: columnName(a), b: columnName(b) };

  const itemList = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: pair.title,
    description: pair.angle,
    numberOfItems: 2,
    itemListElement: [a, b].map((e, i) => ({ '@type': 'ListItem', position: i + 1, name: columnName(e), url: absoluteUrl(`/mattress/${e.id}`) })),
  };

  return (
    <>
      <PairHero pair={pair} entries={entries} names={names} />
      <PairVerdict data={data} names={names} />

      <section className={`section section--linen ${styles.dimsSection}`} aria-labelledby="pair-dims">
        <div className="container container--wide">
          <header className={styles.sectionHead}>
            <p className="eyebrow">Six dimensions</p>
            <h2 id="pair-dims" className="h2">
              Line by line, as the engine sees it.
            </h2>
            <p className={styles.sectionIntro}>
              Cooling, motion, edge and durability come from independent ratings and are the same for every sleeper. Support and pressure relief depend on
              position and weight, so pick a sleeper. A solid bar comes from data on file: an independent rating, or the mattress&apos;s firmness (a brand
              label such as &ldquo;Medium&rdquo; is converted to a number, not tested). A dashed bar marked <em>est.</em> is the engine falling back on the
              construction type.
            </p>
          </header>
          <PairDimensions
            rows={rows.map((r) => ({
              id: r.id,
              label: r.label,
              kind: r.kind,
              a: { subScores: r.a.subScores, provenance: r.a.provenance },
              b: { subScores: r.b.subScores, provenance: r.b.provenance },
            }))}
            names={names}
            pairSlug={pair.slug}
            firmnessSources={{ a: a.firmnessSource, b: b.firmnessSource }}
          />
        </div>
      </section>

      <PairChoose data={data} names={names} path={pair.href} />
      <PairFacts entries={entries} names={names} />
      <PairNext pair={pair} entries={entries} names={names} catalog={catalog} />

      <JsonLd data={itemList} id={`itemlist-${pair.slug}`} />
      <TrackComparison count={2} source="pair_page" topic={pair.slug} />
    </>
  );
}
