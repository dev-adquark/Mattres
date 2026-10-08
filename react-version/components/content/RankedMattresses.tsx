import Link from 'next/link';
import { matchProfile } from '@/lib/matchLogic';
import { profileChips, findMatchHref } from '@/lib/content/profiles';
import { ProductCard } from '@/components/ui/ProductCard';
import { Button } from '@/components/ui/Button';
import { cx } from '@/components/ui/cx';
import type { HeadingLevel, LinkItem } from '@/lib/content/types';
import type { SleepProfile } from '@/lib/types';
import styles from './Content.module.css';

interface RankedMattressesProps {
  /** The disclosed example profile the engine ranks for. */
  profile: SleepProfile;
  count?: number;
  headingId?: string;
  title: string;
  intro?: string;
  /** Position used to pre-fill the quiz (defaults to the profile's). */
  position?: string;
  headingLevel?: Extract<HeadingLevel, 'h2' | 'h3'>;
  /** Full ranked lists to hand off to. */
  moreLinks?: readonly LinkItem[];
}

/**
 * "Related mattresses" for editorial pages: the real engine (default score
 * version) ranks the live catalog for a disclosed representative profile.
 * Nothing is hand-picked; the profile is printed above the cards, and the
 * copy says plainly that a reader's own answers will reorder the list.
 *
 * Async server component. Renders an honest note (never an empty grid)
 * when nothing survives the profile's filters.
 */
export async function RankedMattresses({
  profile,
  count = 3,
  headingId,
  title,
  intro,
  position,
  headingLevel = 'h2',
  moreLinks = [],
}: RankedMattressesProps) {
  const { results, scoreVersion } = await matchProfile(profile);
  const top = results.slice(0, count);
  const Heading = headingLevel;
  const chips = profileChips(profile);
  const CardHeading = headingLevel === 'h2' ? 'h3' : 'h4';

  return (
    <div className={styles.ranked}>
      <header className={styles.rankedHead}>
        <div>
          <p className="eyebrow">Ranked by the Match Score engine</p>
          <Heading id={headingId} className={cx('h2', styles.rankedTitle)}>
            {title}
          </Heading>
        </div>
        <div className={styles.rankedIntro}>
          {intro ? <p>{intro}</p> : null}
          <p className={styles.rankedProfileLabel}>Example profile used for this ranking</p>
          <ul className={styles.tags} aria-label="Example profile">
            {chips.map((c) => (
              <li key={c} className={styles.tag}>
                {c}
              </li>
            ))}
          </ul>
        </div>
      </header>

      {top.length ? (
        <ol className={styles.rankedGrid}>
          {top.map((item, i) => (
            <li key={item.entry.id}>
              <ProductCard entry={item.entry} matchItem={item} scoreContext="for the example profile" rank={i + 1} headingLevel={CardHeading} />
            </li>
          ))}
        </ol>
      ) : (
        <p className="callout">No mattress in the current catalog fits this example profile’s filters, so there is nothing to rank here yet.</p>
      )}

      <div className={styles.rankedFoot}>
        <p className={cx('small', 'muted', styles.rankedNote)}>
          Scores are calculated live by scoring model v{scoreVersion} for the example profile above, not for you. Change
          any answer and the order can change.{' '}
          {top.some((item) => item.entry.sponsored)
            ? 'Sponsored placements are labeled; sponsorship never changes a score or this order.'
            : 'No brand paid to appear here.'}
        </p>
        <div className={styles.rankedActions}>
          {moreLinks.length ? (
            <ul className={styles.rankedMore} aria-label="Full rankings">
              {moreLinks.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="link">
                    See all: {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}
          <Button href={findMatchHref(position || profile.sleepPosition)} variant="secondary" arrow>
            Rank them for my profile
          </Button>
        </div>
      </div>
    </div>
  );
}
