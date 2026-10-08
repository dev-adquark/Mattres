import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { CATEGORY_PAGES } from '@/lib/categoryPages';
import styles from './CatalogInterlude.module.css';

const POSITION_SLUGS = ['side-sleepers', 'back-sleepers', 'stomach-sleepers'] as const;
const TYPE_SLUGS = ['hybrid', 'foam', 'memory-foam', 'latex'] as const;

interface CatalogInterludeProps {
  /** lib/categories#categoryCounts(): slug -> live entry count. A page with 0 is left out. */
  counts: Readonly<Record<string, number>>;
  /** How many mattresses the gallery holds, for the heading. */
  total: number;
}

const pagesFor = (slugs: readonly string[], counts: Readonly<Record<string, number>>) =>
  slugs
    .map((slug) => CATEGORY_PAGES.find((c) => c.slug === slug))
    .filter((c): c is (typeof CATEGORY_PAGES)[number] => Boolean(c) && (counts[c?.slug ?? ''] ?? 0) > 0);

/**
 * An editorial band that breaks the catalog gallery partway down (only on the
 * unfiltered gallery): the sleep-position pages as oversized typographic entry
 * points, the construction pages beneath, and the quiz. Every count is the
 * live category count; nothing here is a score.
 */
export function CatalogInterlude({ counts, total }: CatalogInterludeProps) {
  const positions = pagesFor(POSITION_SLUGS, counts);
  const types = pagesFor(TYPE_SLUGS, counts);
  if (!positions.length && !types.length) return null;

  return (
    <aside className={styles.band} aria-labelledby="catalog-interlude-title" data-nav-theme="dark">
      <div className={styles.copy}>
        <p className={styles.eyebrow}>Narrow it down</p>
        <h3 id="catalog-interlude-title" className={styles.title}>
          {total} is a lot to read. <em>Start from how you sleep.</em>
        </h3>
        <p className={styles.body}>Each position page ranks the catalog for a reference sleeper in that position, and says why.</p>
        <Link href="/find-match?from=catalog" className={styles.quiz}>
          Or let the engine rank them for you <ArrowRight aria-hidden="true" />
        </Link>
      </div>

      <nav className={styles.links} aria-label="Browse by sleep position or construction">
        {positions.length ? (
          <ul className={styles.positions}>
            {positions.map((c) => (
              <li key={c.slug}>
                <Link href={c.href} className={styles.position}>
                  {/* No count: a position page ranks the whole catalog, so it would only repeat the total. */}
                  <span className={styles.positionLabel}>{c.navLabel}</span>
                  <ArrowRight aria-hidden="true" className={styles.arrow} />
                </Link>
              </li>
            ))}
          </ul>
        ) : null}
        {types.length ? (
          <div className={styles.types}>
            <p className={styles.typesLabel}>By construction</p>
            <ul className={styles.typeList}>
              {types.map((c) => (
                <li key={c.slug}>
                  <Link href={c.href} className={styles.type}>
                    {c.navLabel} <span className={styles.typeCount}>{counts[c.slug]}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </nav>
    </aside>
  );
}
