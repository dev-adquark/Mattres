import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { guideCategoryLabel } from '@/lib/content/guides';
import { cx } from '@/components/ui/cx';
import type { ComparisonLink, LinkItem, PositionLink } from '@/lib/content/types';
import type { Guide } from '@/lib/types';
import styles from './Content.module.css';

interface RelatedLinksProps {
  guides?: readonly Guide[];
  positions?: readonly PositionLink[];
  comparisons?: readonly ComparisonLink[];
  headingId?: string;
  title?: string;
}

interface RelatedStripProps {
  categories?: readonly LinkItem[];
  positions?: readonly PositionLink[];
  comparisons?: readonly ComparisonLink[];
}

interface StripColumn {
  id: string;
  title: string;
  items: readonly LinkItem[];
}

/**
 * "Keep reading" block: related guides as an editorial hairline list, with
 * sleep-position pages and engine-ranked comparisons as a quieter second
 * column. Groups with nothing in them are omitted.
 */
export function RelatedLinks({ guides = [], positions = [], comparisons = [], headingId = 'related-title', title = 'Keep reading' }: RelatedLinksProps) {
  const hasSide = positions.length > 0 || comparisons.length > 0;
  return (
    <div className={styles.related}>
      <h2 id={headingId} className={cx('h2', styles.relatedTitle)}>
        {title}
      </h2>
      <div className={cx(styles.relatedGrid, !hasSide && styles.relatedGridSingle)}>
        {guides.length ? (
          <ol className={styles.relatedList}>
            {guides.map((g, i) => (
              <li key={g.slug}>
                <Link href={g.path} className={styles.relatedItem}>
                  <span className={styles.relatedIndex} aria-hidden="true">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span className={styles.relatedBody}>
                    <span className={styles.relatedMeta}>{guideCategoryLabel(g.category)}</span>
                    <span className={styles.relatedName}>{g.title}</span>
                    <span className={styles.relatedDesc}>{g.description}</span>
                  </span>
                  <ArrowUpRight className={styles.relatedArrow} aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ol>
        ) : null}
        {hasSide ? (
          <div className={styles.relatedSide}>
            {positions.length ? (
              <div>
                <h3 className={styles.relatedSideTitle}>By sleep position</h3>
                <ul className={styles.relatedPills}>
                  {positions.map((p) => (
                    <li key={p.slug}>
                      <Link href={p.href} className="chip">
                        {p.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {comparisons.length ? (
              <div>
                <h3 className={styles.relatedSideTitle}>Engine-ranked comparisons</h3>
                <ul className={styles.relatedCompare}>
                  {comparisons.map((c) => (
                    <li key={c.slug}>
                      <Link href={c.href} className="link-quiet">
                        {c.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

/**
 * Compact "more ways in" strip under the related-guides carousel: ranked
 * category pages, sleep-position pages and engine-ranked comparisons, as
 * up to three ruled columns. Columns with nothing in them are omitted.
 */
export function RelatedStrip({ categories = [], positions = [], comparisons = [] }: RelatedStripProps) {
  const cols = [
    categories.length ? { id: 'ranked', title: 'Ranked lists', items: categories } : null,
    positions.length ? { id: 'positions', title: 'By sleep position', items: positions.map((p) => ({ href: p.href, label: p.label })) } : null,
    comparisons.length ? { id: 'compare', title: 'Engine-ranked comparisons', items: comparisons.map((c) => ({ href: c.href, label: c.title })) } : null,
  ].filter((col): col is StripColumn => col !== null);
  if (!cols.length) return null;
  return (
    <nav className={styles.strip} aria-label="More ways into this topic">
      {cols.map((col) => (
        <div key={col.id} className={styles.stripCol}>
          <h3 className={styles.relatedSideTitle}>{col.title}</h3>
          <ul className={styles.relatedCompare}>
            {col.items.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className={styles.stripLink}>
                  {item.label}
                  <ArrowUpRight aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}
