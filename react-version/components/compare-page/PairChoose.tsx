import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { CommerceCta } from '@/components/product/CommerceCta';
import { ctaFor } from '@/lib/outbound';
import { chooseLists } from './pairModel';
import type { PairData, PairNames, PairSideKey } from './types';
import styles from './Pair.module.css';

const SIDES: readonly PairSideKey[] = ['a', 'b'];

interface PairChooseProps {
  data: PairData;
  names: PairNames;
  /** Page path, for outbound-click analytics. */
  path: string;
}

/** "Choose A if… / Choose B if…", built only from engine leads of 10+ points and published price, trial and warranty. */
export function PairChoose({ data, names, path }: PairChooseProps) {
  const choose = chooseLists(data.rows, data.entries);
  return (
    <section className={`section section--cinematic ${styles.choose}`} aria-labelledby="pair-choose">
      <div className="container container--wide">
        <header className={styles.sectionHead}>
          <p className="eyebrow eyebrow--accent">Which one</p>
          <h2 id="pair-choose" className="h2">
            Choose by what matters to you.
          </h2>
          <p className={styles.sectionIntro}>Built only from dimensions where one leads by 10 points or more, plus published price, trial and warranty.</p>
        </header>
        <div className={styles.chooseGrid}>
          {SIDES.map((who) => {
            const e = data.entries[who];
            const list = choose[who];
            return (
              <div key={who} className={styles.chooseCol}>
                <h3 className={styles.chooseTitle}>
                  Choose <span>{names[who]}</span> if…
                </h3>
                {list.length ? (
                  <ul className={styles.chooseList}>
                    {list.map((item) => (
                      <li key={item.id}>
                        <span className={styles.chooseIf}>{item.condition}</span>
                        <span className={styles.chooseEvidence}>{item.evidence}</span>
                        {item.reason ? (
                          <span className={styles.chooseReason}>
                            Engine note{item.context ? ` (${item.context.toLowerCase()})` : ''}: {item.reason}
                          </span>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className={styles.chooseNone}>
                    The engine doesn&apos;t find a dimension where {names[who]} leads by 10 points or more, and it doesn&apos;t lead on price, trial or warranty.
                  </p>
                )}
                <div className={styles.chooseCta}>
                  <CommerceCta cta={ctaFor(e)} mattressId={e.id} brand={e.brand} placement="pair_choose" page={path} variant="onDark" size="md" />
                  <Link href={`/mattress/${e.id}`} className={styles.moreLink}>
                    Full {names[who]} breakdown <ArrowRight aria-hidden="true" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
