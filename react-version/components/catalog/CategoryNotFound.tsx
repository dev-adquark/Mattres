'use client';

import { useSyncExternalStore } from 'react';
import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { CATEGORY_PAGES } from '@/lib/categoryPages';
import { Button } from '@/components/ui/Button';
import styles from './CategoryState.module.css';

const STOP_WORDS = new Set(['mattress', 'mattresses', 'for', 'the', 'and', 'with', 'best', 'top']);
const SUGGESTED = ['best', 'side-sleepers', 'back-sleepers', 'cooling', 'hybrid', 'firm'];
const REGISTRY = CATEGORY_PAGES;
type CategoryPage = (typeof REGISTRY)[number];

/** Best guess at the category the visitor meant, from the words in the URL. */
export function nearestCategory(pathname: string | null | undefined): CategoryPage | null {
  const words = (String(pathname || '').toLowerCase().split('/').pop() ?? '')
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w));
  if (!words.length) return null;
  let best: CategoryPage | null = null;
  let bestScore = 0;
  for (const c of REGISTRY) {
    const hay = `${c.slug} ${c.terms} ${c.title}`.toLowerCase();
    const score = words.filter((w) => hay.includes(w) || hay.includes(w.replace(/s$/, ''))).length;
    if (score > bestScore) {
      best = c;
      bestScore = score;
    }
  }
  return best;
}

export function CategoryNotFound() {
  const pathname = usePathname();
  const guess = nearestCategory(pathname);
  const suggestions = REGISTRY.filter((c) => SUGGESTED.includes(c.slug) && c.slug !== guess?.slug);

  return (
    <section className={`section--linen ${styles.wrap}`} aria-labelledby="category-404-title" data-nav-theme="light" data-compare-tray="off">
      <div className="container container--narrow">
        <p className={styles.kicker}>Not a category we rank</p>
        <h1 id="category-404-title" className={styles.title}>
          We don’t have that list. <em>{guess ? 'Did you mean this one?' : 'Try one of these.'}</em>
        </h1>
        <p className={styles.lead}>
          We only build a ranking when the catalog has enough real data behind it, so there are no pages for organic, extra-firm or
          innerspring mattresses yet.
        </p>
        {guess ? (
          <div className={styles.actions}>
            <Button href={guess.href} size="lg" arrow>
              {guess.title}
            </Button>
            <Button href="/mattresses" size="lg" variant="ghost">
              All mattresses
            </Button>
          </div>
        ) : null}
        <ul className={styles.list}>
          {suggestions.map((c) => (
            <li key={c.slug}>
              <Link href={c.href} className={styles.listLink}>
                {c.title}
              </Link>
            </li>
          ))}
          {!guess ? (
            <li>
              <Link href="/mattresses" className={styles.listLink}>
                Search all mattresses
              </Link>
            </li>
          ) : null}
        </ul>
      </div>
    </section>
  );
}

/**
 * Root not-found switch: an unknown /mattresses/<slug> gets the category
 * suggestions above; every other path renders the generic 404 (children).
 * The root 404 is prerendered without a URL, so the server snapshot is always
 * "generic" and the swap happens right after hydration (no mismatch).
 */
const CATEGORY_PATH = /^\/mattresses\/[^/]+\/?$/;
const noopSubscribe = () => () => {};

export function NotFoundSwitch({ children }: { children: ReactNode }) {
  const isCategory = useSyncExternalStore(
    noopSubscribe,
    () => CATEGORY_PATH.test(window.location.pathname),
    () => false
  );
  return isCategory ? <CategoryNotFound /> : children;
}
