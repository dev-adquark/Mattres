import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { GUIDE_CATEGORIES, guideCategoryLabel, guideNumber, guidesInCategory } from '@/lib/content/guides';
import { positionPageTitle } from '@/lib/content/positions';
import { SLEEP_POSITIONS } from '@/lib/site';
import styles from '../Hub.module.css';

const pad = (n: number) => String(n).padStart(2, '0');
const POSITION_CATEGORY = 'sleep-position';

/** Every guide category as a magazine index column (sleep position also lists the position pages). */
export function HubContents() {
  const categories = GUIDE_CATEGORIES.map((c) => ({ ...c, guides: guidesInCategory(c.id) })).filter(
    (c) => c.guides.length || c.id === POSITION_CATEGORY,
  );
  return (
    <section className={`section section--editorial ${styles.contents}`} aria-labelledby="contents-title">
      <div className="container container--wide">
        <div className={styles.contentsHead}>
          <h2 id="contents-title" className={styles.contentsTitle}>
            Contents
          </h2>
          <nav aria-label="Jump to a category" className={styles.jump}>
            {categories.map((c) => (
              <a key={c.id} href={`#${c.id}`} className="chip">
                {c.label}
              </a>
            ))}
          </nav>
        </div>
        <div className={styles.index}>
          {categories.map((c, i) => (
            <section key={c.id} id={c.id} className={styles.col} aria-labelledby={`${c.id}-title`}>
              <p className={styles.colNo} aria-hidden="true">
                {pad(i + 1)}
              </p>
              <h3 id={`${c.id}-title`} className={styles.colTitle}>
                {c.label}
              </h3>
              <p className={styles.colDesc}>{c.description}</p>
              <ul className={styles.colList}>
                {c.guides.map((g) => (
                  <li key={g.slug}>
                    <Link href={g.path} className={styles.colItem}>
                      <span className={styles.colItemNo}>No. {pad(guideNumber(g.slug))}</span>
                      <span className={styles.colItemTitle}>{g.title}</span>
                      {g.category !== c.id ? (
                        <span className={styles.colItemAlso}>Filed under {guideCategoryLabel(g.category)}</span>
                      ) : null}
                    </Link>
                  </li>
                ))}
                {c.id === POSITION_CATEGORY
                  ? SLEEP_POSITIONS.map((p) => (
                      <li key={p.slug}>
                        <Link href={p.href} className={styles.colItem}>
                          <span className={styles.colItemNo}>Position</span>
                          <span className={styles.colItemTitle}>{positionPageTitle(p.slug)}</span>
                        </Link>
                      </li>
                    ))
                  : null}
              </ul>
              {c.id === POSITION_CATEGORY ? (
                <Link href="/sleep-position" className={styles.colMore}>
                  All sleep positions <ArrowUpRight aria-hidden="true" />
                </Link>
              ) : null}
            </section>
          ))}
        </div>
      </div>
    </section>
  );
}
