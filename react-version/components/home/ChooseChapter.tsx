import { Rail } from '@/components/ui/Rail';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { GUIDES, guideCategoryLabel } from '@/lib/content/guides';
import { Chapter } from '@/components/motion';
import type { HomeTrust } from './types';
import { HomeCtas } from './HomeCtas';
import { GuideCover } from '@/components/content/GuideCover';
import styles from './Home.module.css';


/**
 * Chapter 06 - Choose. A magazine spread of guides, the trust statement
 * (real provenance counts from the catalog audit; recommendation kept
 * apart from sponsorship) and the closing line on warm sand.
 */
export function ChooseChapter({ trust }: { trust: HomeTrust }) {
  const [lead, ...rest] = GUIDES;
  const list = rest.slice(0, 3);
  const { total, verified, partial, unverified, incomplete, sponsoredCount } = trust;

  return (
    <section id="choose" className={styles.choose} aria-labelledby="choose-title">
      <div className={`section--linen ${styles.chooseLinen}`} data-nav-theme="light">
        <div className="container container--wide">
          <header className={styles.chooseHeader}>
            <Chapter index={6} label="Choose" />
            <h2 id="choose-title" className={styles.chooseTitle}>
              Know what you&rsquo;re <em>buying.</em>
            </h2>
            <Link href="/guides" className={`link ${styles.chooseAll}`}>
              All sleep guides
            </Link>
          </header>

          {lead ? (
            <div className={styles.guidesSpread}>
              <article className={styles.guideLead}>
                <Link href={lead.path} className={styles.guideLeadLink}>
                  {/* Same cover as the guides hub: comfort-window chart + original render. */}
                  <GuideCover guide={lead} variant="lead" className={styles.guideLeadArt} />
                  <span className={styles.guideCat}>{guideCategoryLabel(lead.category)}</span>
                  <span className={styles.guideLeadTitle}>{lead.title}</span>
                  <span className={styles.guideLeadText}>{lead.description}</span>
                  <span className={styles.guideRead}>
                    Read the guide <ArrowRight aria-hidden="true" />
                  </span>
                </Link>
              </article>

              {list.length ? (
                <ol className={styles.guideList}>
                  {list.map((g, i) => (
                    <li key={g.slug}>
                      <Link href={g.path} className={styles.guideItem}>
                        <span className={styles.guideNo} aria-hidden="true">
                          {String(i + 2).padStart(2, '0')}
                        </span>
                        <span className={styles.guideItemBody}>
                          <span className={styles.guideCat}>{guideCategoryLabel(g.category)}</span>
                          <span className={styles.guideItemTitle}>{g.title}</span>
                        </span>
                        <ArrowRight className={styles.guideArrow} aria-hidden="true" />
                      </Link>
                    </li>
                  ))}
                </ol>
              ) : null}
            </div>
          ) : null}

          <div className={styles.trust}>
            <p className={styles.trustTitle}>
              Scores can&rsquo;t be <em>bought.</em>
            </p>
            <Rail cards label="trust points" column="82%" align="start" className={styles.trustCols}>
              <div>
                <h3 className={styles.trustHead}>Recommendation</h3>
                <p>
                  Ranked only by the scoring engine, from your answers and the data on file. The same answers always give the same
                  result, and every rule is published.
                </p>
              </div>
              <div>
                <h3 className={styles.trustHead}>Sponsored placement</h3>
                <p>
                  {sponsoredCount === 0
                    ? 'None today: no sponsored listings and no commissions. '
                    : `${sponsoredCount} listing${sponsoredCount === 1 ? ' is' : 's are'} sponsored and labeled as such. `}
                  If that changes, sponsored listings will be labeled and scored by the same rules as every other mattress.
                </p>
              </div>
              <div>
                <h3 className={styles.trustHead}>What&rsquo;s on file</h3>
                {/* Every verification level is named, so the counts add up to the whole catalog. */}
                <p>
                  Of <span className="tabular">{total}</span> mattresses, <span className="tabular">{verified}</span>{' '}
                  {verified === 1 ? 'has' : 'have'} every required field sourced and checked
                  {partial > 0 ? (
                    <>
                      ; <span className="tabular">{partial}</span> {partial === 1 ? 'is' : 'are'} complete but only partly checked
                      against a source
                    </>
                  ) : null}
                  {unverified > 0 ? (
                    <>
                      ; <span className="tabular">{unverified}</span> {unverified === 1 ? 'is' : 'are'} complete but not yet checked
                      against a source
                    </>
                  ) : null}
                  ; <span className="tabular">{incomplete}</span> still {incomplete === 1 ? 'has' : 'have'} a gap, shown as &ldquo;Not
                  yet verified&rdquo; rather than filled in.
                </p>
              </div>
            </Rail>
            <div className={styles.trustLinks}>
              <Link href="/methodology" className="link">
                How the Match Score works
              </Link>
              <Link href="/disclosures" className="link">
                Read our disclosures
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className={`section--sand ${styles.final}`} data-nav-theme="light">
        <div className="container container--max">
          <p className={styles.finalTitle} aria-hidden="true">
            Find your <em>match.</em>
          </p>
          <div className={styles.finalFoot}>
            <p className={styles.finalText}>
              <span className="sr-only">Find your match. </span>
              Tell us how you sleep. We&rsquo;ll show you what fits, why it fits and what to watch out for.
            </p>
            <div className={styles.finalActions}>
              <HomeCtas ghostClassName={styles.ghostFlush} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
