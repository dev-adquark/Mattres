import Link from 'next/link';
import { displayTitle } from '@/lib/format';
import { tierFor } from '@/lib/scoreTiers';
import { Section } from '@/components/ui/Section';
import { DataValue } from '@/components/ui/DataValue';
import { MattressRender } from '@/components/ui/MattressRender';
import { mattressHref } from '@/components/product/productData';
import { REFERENCE_POSITIONS, REFERENCE_PROFILE_TEXT } from '@/components/product/referenceScores';
import type { MattressType } from '@/lib/types';
import { positionShort, typeWord } from './brandCopy';
import { ordinal } from './brandData';
import type { ReferenceMatrix, ReferenceStanding } from './brandData';
import styles from './Brands.module.css';
import { SponsoredTag } from '@/components/trust/SponsoredTag';

interface BrandScoresProps {
  name: string;
  /** "the Casper lineup" or the single model's title. */
  subject: string;
  single: boolean;
  domType: MattressType | null;
  standings: readonly ReferenceStanding[];
  matrix: ReferenceMatrix;
}

const positionLabel = (id: string): string => REFERENCE_POSITIONS.find((p) => p.id === id)?.label || id;

/** One model: a strip of four reference scores with tier and rank among the ranked set (same as the product page). */
function ScoreStrip({ standings }: { standings: readonly ReferenceStanding[] }) {
  return (
    <dl className={styles.strip}>
      {standings.map((s) => (
        <div key={s.position}>
          <dt>{positionLabel(s.position)}</dt>
          <dd className={styles.stripScore}>
            <span className="tabular">{s.score}</span>
            <span className="sr-only"> out of 100</span>
          </dd>
          <dd className={styles.stripMeta}>
            {tierFor(s.score).label} ·{' '}
            {s.ranked && s.ranked.entry.id === s.entry.id ? `${ordinal(s.ranked.rank)} of ${s.total} ranked` : 'Not ranked: too little data'}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/** Several models: model x position matrix, best brand score per column marked. */
function ScoreMatrix({ name, matrix }: { name: string; matrix: ReferenceMatrix }) {
  return (
    <div className="table-scroll" tabIndex={0} role="region" aria-label={`${name} Match Score table (scrolls sideways)`}>
      <table className={styles.matrix}>
        <caption className="sr-only">
          Match Scores out of 100 for each {name} model and four reference sleep positions. The highest {name} score in each column is marked.
        </caption>
        <thead>
          <tr>
            <th scope="col">Model</th>
            {matrix.positions.map((p) => (
              <th scope="col" key={p}>
                {positionShort(p)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {matrix.rows.map((r) => (
            <tr key={r.entry.id}>
              <th scope="row">
                <Link href={mattressHref(r.entry)}>{r.entry.model || displayTitle(r.entry)}</Link>
                <SponsoredTag sponsored={r.entry.sponsored} />
              </th>
              {matrix.positions.map((p) => {
                const v = r.scores[p] ?? null;
                const top = v !== null && v === matrix.best[p];
                return (
                  <td key={p} className={top ? styles.matrixTop : undefined}>
                    {v === null ? <DataValue value={null} missingText="—" /> : <span className="tabular">{v}</span>}
                    {top ? <span className="sr-only"> (best {name} score)</span> : null}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** 2 - What the engine says, for disclosed reference sleepers. */
export function BrandScores({ name, subject, single, domType, standings, matrix }: BrandScoresProps) {
  return (
    <Section mood="deep" id="scores" className={styles.scores} aria-labelledby="scores-title">
      <div className={styles.scoresGrid}>
        <div className={styles.scoresCopy}>
          <p className="eyebrow">Match Score · reference sleepers</p>
          <h2 id="scores-title" className={styles.scoresTitle}>
            How {subject} scores
          </h2>
          <p className={styles.scoresIntro}>{REFERENCE_PROFILE_TEXT} Your own score will differ, which is what the quiz is for.</p>
          <figure className={styles.scoresStill}>
            <div className={styles.scoresStillFrame}>
              <MattressRender type={domType} aspect="cutaway" size="fluid" fill sizes="(min-width: 900px) 34vw, 100vw" />
            </div>
            <figcaption>
              <span className="illus-tag">Illustration</span> A typical {domType ? typeWord(domType) : 'mattress'} construction, not a {name} product.
            </figcaption>
          </figure>
        </div>
        <div className={styles.matrixWrap}>
          {single ? <ScoreStrip standings={standings} /> : <ScoreMatrix name={name} matrix={matrix} />}
          <p className={styles.matrixNote}>
            Scores come straight from the Match Score engine.{' '}
            <Link href="/methodology" className="link">
              How scoring works
            </Link>
          </p>
        </div>
      </div>
    </Section>
  );
}
