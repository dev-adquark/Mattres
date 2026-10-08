import Link from 'next/link';
import { MattressRender } from '@/components/ui/MattressRender';
import { cx } from '@/components/ui/cx';
import { cropFor } from './catalogData';
import type { CategorySecondaryView } from './buildCategory';
import styles from './CategoryPage.module.css';
import { SponsoredTag } from '@/components/trust/SponsoredTag';

type PositionsView = Extract<CategorySecondaryView, { kind: 'positions' }>;
type ProfileView = Extract<CategorySecondaryView, { kind: 'profile' }>;

/** The secondary list under a category ranking: best per sleep position, or a second engine ranking. */
export function CategorySecondary({ secondary }: { secondary: CategorySecondaryView | null }) {
  if (secondary?.kind === 'positions') return <BestPerPosition view={secondary} />;
  if (secondary?.kind === 'profile') return <ProfileRanking view={secondary} />;
  return null;
}

function BestPerPosition({ view }: { view: PositionsView }) {
  return (
    <section className={cx('section--linen', styles.secondary)} aria-labelledby="positions-title">
      <div className="container container--wide">
        <div className={styles.sectionHead}>
          <h2 id="positions-title" className={styles.sectionTitle}>
            Best for each <em>sleep position.</em>
          </h2>
          <p className={styles.sectionAside}>The highest reference score per position, from the same engine run.</p>
        </div>
        <ul className={styles.positions}>
          {view.items.map((p) => {
            const crop = cropFor(p.entry.id);
            return (
              <li key={p.position} className={styles.position}>
                <p className={styles.positionLabel}>{p.label}</p>
                <div className={styles.positionMedia}>
                  <MattressRender type={p.entry.type} seed={p.entry.id} aspect={crop.aspect} objectPosition={crop.objectPosition} fill photo={p.entry.photo} photoCreditLink={false} sizes="(min-width: 900px) 22vw, 46vw" />
                </div>
                <p className={styles.positionName}>
                  <Link href={`/mattress/${encodeURIComponent(p.entry.id)}`} className={styles.positionLink}>
                    {p.title}
                  </Link>
                  <SponsoredTag sponsored={p.entry.sponsored} />
                </p>
                <p className={styles.positionScore}>
                  <span className="tabular">{p.score}</span>
                  <span className={styles.positionUnit}>/100</span>
                </p>
                {p.href ? (
                  <Link href={p.href} className={styles.positionMore}>
                    Full {p.label.toLowerCase()} ranking
                  </Link>
                ) : null}
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

function ProfileRanking({ view }: { view: ProfileView }) {
  return (
    <section className={cx('section--deep', styles.secondary)} aria-labelledby="secondary-title" data-nav-theme="dark">
      <div className="container container--wide">
        <div className={styles.secondaryGrid}>
          <div>
            <h2 id="secondary-title" className={styles.secondaryTitle}>
              {view.title[0]} <em>{view.title[1]}</em>
            </h2>
            <p className={styles.secondaryIntro}>{view.intro}</p>
            <p className={styles.secondaryProfile}>Ranked for: {view.profileText}</p>
          </div>
          <ol className={styles.miniRows}>
            {view.rows.map((r) => (
              <li key={r.id} className={styles.miniRow}>
                <span className={styles.miniRank}>{String(r.rank).padStart(2, '0')}</span>
                <span className={styles.miniBody}>
                  <Link href={`/mattress/${encodeURIComponent(r.id)}`} className={styles.miniName}>
                    {r.title}
                  </Link>
                  <SponsoredTag sponsored={r.entry.sponsored} />
                  {r.headline ? <span className={styles.miniHeadline}>{r.headline}</span> : null}
                </span>
                <span className={styles.miniScore}>
                  <span className="tabular">{r.score}</span>
                  <span className="sr-only"> out of 100, {r.tier}</span>
                </span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
