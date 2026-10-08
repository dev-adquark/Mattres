import { pairsFor, pairsForBrand, lineupIdsForBrand } from '@/lib/comparePairs';
import type { MattressEntry, VsPage } from '@/lib/types';
import { loadCatalog } from './engine';
import { PairCard } from './PairCard';
import { CompareLineupButton } from './CompareLineupButton';
import type { HeadingLevel } from './types';
import styles from './Pair.module.css';

interface PairGridProps {
  pairs: readonly VsPage[];
  byId: ReadonlyMap<string, MattressEntry>;
}

function PairGrid({ pairs, byId }: PairGridProps) {
  return (
    <div className={styles.pairGrid}>
      {pairs.map((p) => (
        <PairCard key={p.slug} pair={p} a={byId.get(p.a)} b={byId.get(p.b)} headingLevel="h3" />
      ))}
    </div>
  );
}

interface ComparedWithProps {
  id: string;
  headingLevel?: HeadingLevel;
  className?: string;
}

/**
 * "Compared with" for /mattress/[id]: the curated head-to-heads that include
 * this mattress. Renders nothing when there are none (no filler).
 * Async server component: <ComparedWith id={entry.id} />
 */
export async function ComparedWith({ id, headingLevel = 'h2', className }: ComparedWithProps) {
  const pairs = pairsFor(id) as VsPage[];
  if (!pairs.length) return null;
  const entries = await loadCatalog();
  const byId = new Map(entries.map((e) => [e.id, e]));
  const items = pairs.filter((p) => byId.has(p.a) && byId.has(p.b));
  if (!items.length) return null;
  const Heading = headingLevel;
  return (
    <section className={`section section--linen ${className || ''}`} aria-labelledby={`compared-with-${id}`}>
      <div className="container container--wide">
        <header className={styles.sectionHead}>
          <p className="eyebrow">Compared with</p>
          <Heading id={`compared-with-${id}`} className="h2">
            Head to head.
          </Heading>
          <p className={styles.sectionIntro}>Curated comparisons scored by the engine for four reference sleepers, with every difference sourced.</p>
        </header>
        <PairGrid pairs={items} byId={byId} />
      </div>
    </section>
  );
}

interface BrandPairsProps {
  brand: string;
  headingLevel?: HeadingLevel;
  className?: string;
}

/**
 * "Inside the lineup" for /brands/[brand]: same-brand head-to-heads plus a
 * "Compare the whole lineup" button (up to 3 of the brand's models with the
 * most independent ratings on file - chosen by data coverage, never by score).
 * Async server component: <BrandPairs brand="Casper" />. Renders nothing for a
 * brand with fewer than two rated models and no pairs.
 */
export async function BrandPairs({ brand, headingLevel = 'h2', className }: BrandPairsProps) {
  const entries = await loadCatalog();
  const pairs = pairsForBrand(entries, brand) as VsPage[];
  const lineup = lineupIdsForBrand(entries, brand) as string[];
  if (!pairs.length && lineup.length < 2) return null;
  const byId = new Map(entries.map((e) => [e.id, e]));
  const Heading = headingLevel;
  const slug = String(brand).toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const labels = Object.fromEntries(lineup.map((id) => [id, byId.get(id)?.model ?? id]));
  return (
    <section className={`section section--linen ${className || ''}`} aria-labelledby={`lineup-pairs-${slug}`}>
      <div className="container container--wide">
        <header className={styles.sectionHead}>
          <p className="eyebrow">Inside the lineup</p>
          <Heading id={`lineup-pairs-${slug}`} className="h2">
            {brand} against {brand}.
          </Heading>
          {lineup.length >= 2 ? <CompareLineupButton ids={lineup} labels={labels} brand={brand} /> : null}
        </header>
        {pairs.length ? <PairGrid pairs={pairs} byId={byId} /> : null}
      </div>
    </section>
  );
}
