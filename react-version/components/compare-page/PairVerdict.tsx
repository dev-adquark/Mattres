import { comparableQueenPriceUsd } from '@/lib/commerce';
import Link from 'next/link';
import { Check } from 'lucide-react';
import { PAIR_REFERENCE_PROFILE } from '@/lib/comparePairs';
import { columnName } from './compareModel';
import { largestGap, positionTally, priceGap, subToPoints, type LargestGap, type PositionTally } from './pairModel';
import { PairPersonal } from './PairPersonal';
import type { PairData, PairNames, PairRow, PairSideKey } from './types';
import styles from './Pair.module.css';

const REFERENCE_TEXT = `${PAIR_REFERENCE_PROFILE.weightLb} lb, no stated firmness preference, neutral temperature, sleeps alone; the same sleeper as on each mattress page`;
const SIDES: readonly PairSideKey[] = ['a', 'b'];
const other = (who: PairSideKey): PairSideKey => (who === 'a' ? 'b' : 'a');

function countWord(n: number): string {
  return ['no sleepers', 'one', 'two', 'three', 'four', 'five'][n] || String(n);
}

function verdictLeadText(gap: LargestGap | null, names: PairNames): string | null {
  if (!gap) return null;
  if (!gap.leader) return 'The engine scores them the same on every dimension.';
  const lead = gap.leader;
  const leadSub = lead === 'a' ? gap.a : gap.b;
  const trailSub = lead === 'a' ? gap.b : gap.a;
  return `${gap.label} is where they differ most: ${names[lead]} ${subToPoints(leadSub)}, ${names[other(lead)]} ${subToPoints(trailSub)} out of 100${gap.positionDependent ? ` for a ${gap.row.label.toLowerCase()}` : ''}.`;
}

function tallyText(tally: PositionTally, names: PairNames): string {
  if (tally.a && tally.b) {
    return `For the four reference sleepers, ${names.a} scores higher for ${countWord(tally.a)} and ${names.b} for ${countWord(tally.b)}${tally.tie ? `, with ${countWord(tally.tie)} tied` : ''}.`;
  }
  if (tally.a || tally.b) {
    return `${tally.a ? names.a : names.b} scores higher for ${tally.a + tally.b === 4 ? 'all four' : countWord(tally.a || tally.b)} reference sleepers${tally.tie ? ` (${countWord(tally.tie)} tied)` : ''}. That is still a score for those sleepers, not a ruling for you.`;
  }
  return 'They tie for all four reference sleepers.';
}

/** "The short answer": the biggest engine gap, the position tally, the price gap, and scores by sleeper. No overall winner. */
export function PairVerdict({ data, names }: { data: PairData; names: PairNames }) {
  const { rows, modelVersion, entries } = data;
  const { a, b } = entries;
  const gap = largestGap(rows.filter((r) => r.kind === 'reference'));
  const price = priceGap(a, b);
  const missingPrice = [a, b].filter((e) => comparableQueenPriceUsd(e) === null);
  return (
    <section className="section section--editorial" aria-labelledby="pair-verdict">
      <div className="container container--wide">
        <div className={styles.verdictGrid}>
          <div className={styles.verdictCopy}>
            <p className="eyebrow">The short answer</p>
            <h2 id="pair-verdict" className={styles.verdictLine}>
              {verdictLeadText(gap, names)}
            </h2>
            <p className={styles.verdictSub}>{tallyText(positionTally(rows), names)}</p>
            {price ? (
              <p className={styles.verdictSub}>{price.text}</p>
            ) : missingPrice.length ? (
              <p className={styles.verdictSub}>
                {missingPrice.map((e) => columnName(e)).join(' and ')}: no confirmed US-dollar Queen price on file, so we can&apos;t compare cost.
              </p>
            ) : null}
            <p className={styles.verdictNote}>
              No overall winner is declared here: the better mattress depends on how you sleep. Scores are from the Match Score engine v{modelVersion}{' '}
              for disclosed reference sleepers ({REFERENCE_TEXT}).{' '}
              <Link href="/methodology" className="link">
                How scoring works
              </Link>
            </p>
          </div>
          <div className={styles.verdictSide}>
            <PairPersonal a={a.id} b={b.id} names={names} />
            <ScoresBySleeper rows={rows} names={names} />
          </div>
        </div>
      </div>
    </section>
  );
}

function ScoresBySleeper({ rows, names }: { rows: readonly PairRow[]; names: PairNames }) {
  return (
    <table className={styles.posTable}>
      <caption className={styles.posCaption}>Match Score by sleeper, out of 100</caption>
      <thead>
        <tr>
          <th scope="col">Sleeper</th>
          <th scope="col">{names.a}</th>
          <th scope="col">{names.b}</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.id} data-kind={r.kind}>
            <th scope="row">
              {r.kind === 'spotlight' ? <span className={styles.spotTag}>Spotlight</span> : null}
              {r.label}
              {r.kind === 'spotlight' ? <span className={styles.posHint}>{r.chips.slice(1).join(' · ')}</span> : null}
            </th>
            {SIDES.map((who) => {
              const mine = r[who].score;
              const theirs = r[other(who)].score;
              return (
                <td key={who} data-lead={mine > theirs ? 'true' : undefined}>
                  <span className={styles.posScore}>{mine}</span>
                  {mine > theirs ? (
                    <span className={styles.tick}>
                      <Check aria-hidden="true" />
                      Higher
                    </span>
                  ) : null}
                  {r.kind === 'spotlight' ? (
                    <span className={styles.posHint}>
                      {r[who].rank ? `No. ${r[who].rank} of ${r[who].total} ranked` : 'Not ranked: too little data'}
                    </span>
                  ) : null}
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
