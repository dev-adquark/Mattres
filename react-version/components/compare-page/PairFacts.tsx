import { missingValueClassName } from '@/components/ui/DataValue';
import { ratingRows, sourcesFor, specRows } from './pairModel';
import type { PairEntries, PairNames, PairSideKey } from './types';
import styles from './Pair.module.css';

const SIDES: readonly PairSideKey[] = ['a', 'b'];

interface PairFactsProps {
  entries: PairEntries;
  names: PairNames;
}

function FactsHead({ names, label }: { names: PairNames; label: string }) {
  return (
    <thead>
      <tr>
        <th scope="col">
          <span className="sr-only">{label}</span>
        </th>
        <th scope="col">{names.a}</th>
        <th scope="col">{names.b}</th>
      </tr>
    </thead>
  );
}

/** "The facts behind the scores": independent ratings with their sources, and specs and policies. Missing values say so. */
export function PairFacts({ entries, names }: PairFactsProps) {
  const ratings = ratingRows(entries.a, entries.b);
  const specs = specRows(entries.a, entries.b);
  return (
    <section className="section section--editorial" aria-labelledby="pair-specs">
      <div className="container container--wide">
        <header className={styles.sectionHead}>
          <p className="eyebrow">On file</p>
          <h2 id="pair-specs" className="h2">
            The facts behind the scores.
          </h2>
        </header>
        <div className={styles.factsGrid}>
          <div>
            <h3 className={styles.factsTitle}>Independent ratings</h3>
            <table className={styles.facts}>
              <caption className="sr-only">Independent reviewer ratings out of 10</caption>
              <FactsHead names={names} label="Rating" />
              <tbody>
                {ratings.map((r) => (
                  <tr key={r.id}>
                    <th scope="row">{r.label}</th>
                    {SIDES.map((who) => {
                      const mine = r[who];
                      const theirs = r[who === 'a' ? 'b' : 'a'];
                      return (
                        <td key={who} data-lead={mine !== null && theirs !== null && mine > theirs ? 'true' : undefined}>
                          {mine === null ? (
                            <span className={missingValueClassName}>Not yet rated</span>
                          ) : (
                            <span className={styles.factNum}>
                              {mine}
                              <span className={styles.factUnit}>/10</span>
                            </span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
            <div className={styles.sources}>
              {SIDES.map((who) => {
                const list = sourcesFor(entries[who]);
                return (
                  <p key={who}>
                    <span className={styles.sourcesWho}>{names[who]}:</span>{' '}
                    {list.length
                      ? list.map((s, i) => (
                          <span key={s.sourceUrl}>
                            {i ? ', ' : ''}
                            <a href={s.sourceUrl} target="_blank" rel="noopener noreferrer nofollow" className="link">
                              {s.sourceName}
                              <span className="sr-only"> (opens in a new tab)</span>
                            </a>
                          </span>
                        ))
                      : 'No independent review on file yet.'}
                  </p>
                );
              })}
              <p className={styles.sourcesNote}>
                Ratings are reviewers&apos; numbers from the sources listed, not Match Scores. When a mattress has more than one source, the catalog records one
                rating per dimension.
              </p>
            </div>
          </div>
          <div>
            <h3 className={styles.factsTitle}>Specs and policies</h3>
            <table className={styles.facts}>
              <caption className="sr-only">Specifications and policies</caption>
              <FactsHead names={names} label="Spec" />
              <tbody>
                {specs.map((r) => (
                  <tr key={r.id} data-long={r.long ? 'true' : undefined}>
                    <th scope="row">{r.label}</th>
                    {SIDES.map((who) => (
                      <td key={who}>
                        {r[who].text ? <span className={styles.factText}>{r[who].text}</span> : <span className={missingValueClassName}>{r[who].missing}</span>}
                        {r[who].note ? <span className={styles.factNote}>{r[who].note}</span> : null}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}
