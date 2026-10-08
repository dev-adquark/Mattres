import Link from 'next/link';
import { FirmnessScale } from './FirmnessScale';
import type { BandRange, HomeContrast } from './types';
import styles from './Home.module.css';

type Relation = 'below' | 'above' | 'inside';

function relation(value: number, band: BandRange | null): Relation | null {
  if (!band) return null;
  if (value < band.min) return 'below';
  if (value > band.max) return 'above';
  return 'inside';
}

function bandSentence(contrast: HomeContrast): string {
  if (!contrast.firmness) return '';
  const value = contrast.firmness.rating;
  const parts = contrast.sleepers.map((s) => {
    const rel = relation(value, s.band);
    if (!rel || !s.band) return null;
    const who = `the ${s.label.toLowerCase()}’s range (${s.band.min}–${s.band.max}/10)`;
    return rel === 'inside' ? `inside ${who}` : `${rel} ${who}`;
  });
  if (parts.some((p) => !p)) return '';
  return ` At about ${value}/10 it sits ${parts.join(' and ')}.`;
}

/** "One mattress. Two sleepers." - one real engine result for two profiles that differ only in position. */
export function ContrastEvidence({ contrast }: { contrast: HomeContrast }) {
  return (
    <figure className={styles.evidence}>
      <p className={styles.evidenceKicker}>One mattress. Two sleepers.</p>
      <p className={styles.evidenceName}>
        <Link href={`/mattress/${encodeURIComponent(contrast.id)}`} className="link-quiet">
          {contrast.title}
        </Link>
      </p>
      <ol className={styles.evidenceScores}>
        {contrast.sleepers.map((s) => (
          <li key={s.id}>
            <span className={styles.evidenceWho}>{s.label}</span>
            <span className={styles.evidenceNumber}>
              {s.score}
              <span className="sr-only"> out of 100</span>
            </span>
            <span className={styles.evidenceTier}>{s.tier}</span>
          </li>
        ))}
      </ol>
      {contrast.firmness ? (
        <FirmnessScale
          compact
          className={styles.evidenceScale}
          rows={contrast.sleepers.map((s) => ({ id: s.id, label: s.label.replace(' sleeper', ''), band: s.band }))}
          markers={[{ id: 'mattress', value: contrast.firmness.rating, label: `This mattress ${contrast.firmness.rating}/10` }]}
        />
      ) : null}
      <figcaption className={styles.evidenceCaption}>
        Real v0.2 engine scores. Both sleepers weigh 170 lb, prefer a medium feel and sleep neutral; only position changes.
        {bandSentence(contrast)}
      </figcaption>
    </figure>
  );
}
