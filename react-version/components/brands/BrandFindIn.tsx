import Link from 'next/link';
import type { BrandCategoryLink } from './brandData';
import styles from './Brands.module.css';

interface BrandFindInProps {
  name: string;
  single: boolean;
  categories: readonly BrandCategoryLink[];
}

/**
 * "Find it in": the category pages the brand's models are listed on, by the
 * same predicates those pages use (lib/categories). Counts are computed.
 */
export function BrandFindIn({ name, single, categories }: BrandFindInProps) {
  if (!categories.length) return null;
  return (
    <nav className={styles.findIn} aria-labelledby="find-in-title">
      <h2 id="find-in-title" className={styles.findInTitle}>
        Find {single ? 'it' : `${name} models`} in
      </h2>
      <ul className={styles.findInList}>
        {categories.map((c) => (
          <li key={c.slug}>
            <Link href={c.href} className={styles.findInLink}>
              <span className={styles.findInLabel}>{c.label}</span>
              <span className={styles.findInCount}>
                {single ? `${c.of} listed` : `${c.count} of ${c.of}`}
                <span className="sr-only">{single ? ' mattresses on this page' : ` mattresses on this page are ${name}`}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
