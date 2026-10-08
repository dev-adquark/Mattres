import Link from 'next/link';
import { CATEGORY_PAGES } from '@/lib/categories';
import { cx } from '@/components/ui/cx';
import styles from './CategoryIndex.module.css';

const GROUPS = [
  { id: 'best', title: 'Ranked' },
  { id: 'position', title: 'Sleep position' },
  { id: 'feature', title: 'Needs' },
  { id: 'firmness', title: 'Firmness' },
  { id: 'type', title: 'Construction' },
] as const;

interface CategoryIndexProps {
  /** categoryCounts(): slug -> live entry count. */
  counts: Readonly<Record<string, number>>;
  /** A slug to leave out (the current page). */
  exclude?: string;
  /** Only these slugs, in this order (chips variant). */
  only?: readonly string[];
  variant?: 'columns' | 'chips';
  label?: string;
  className?: string;
}

/**
 * Typographic index of every category page, grouped, with live counts from
 * categoryCounts(). A count of 0 is never shown (the category is hidden).
 * `variant`: 'columns' (hairline index, desktop) collapses to a scrollable
 * chip row on phones; 'chips' is always a wrapped chip row.
 */
export function CategoryIndex({ counts, exclude, only, variant = 'columns', label = 'Browse by category', className }: CategoryIndexProps) {
  const countOf = (slug: string): number => counts[slug] ?? 0;
  const pages = CATEGORY_PAGES.filter((c) => c.slug !== exclude && countOf(c.slug) > 0 && (!only || only.includes(c.slug)));
  if (!pages.length) return null;

  if (variant === 'chips') {
    const ordered = only ? only.map((s) => pages.find((c) => c.slug === s)).filter((c): c is (typeof pages)[number] => Boolean(c)) : pages;
    return (
      <nav aria-label={label} className={cx(styles.chipsNav, className)}>
        <ul className={styles.chips}>
          {ordered.map((c) => (
            <li key={c.slug}>
              <Link href={c.href} className={styles.chip}>
                {c.navLabel}
                <span className={styles.count}>{countOf(c.slug)}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    );
  }

  return (
    <nav aria-label={label} className={cx(styles.index, className)}>
      {GROUPS.map((g) => {
        const items = pages.filter((c) => c.group === g.id);
        if (!items.length) return null;
        return (
          <div key={g.id} className={styles.group}>
            <p className={styles.groupTitle}>{g.title}</p>
            <ul className={styles.list}>
              {items.map((c) => (
                <li key={c.slug}>
                  <Link href={c.href} className={styles.link}>
                    <span>{c.navLabel}</span>
                    <span className={styles.count}>{countOf(c.slug)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </nav>
  );
}
