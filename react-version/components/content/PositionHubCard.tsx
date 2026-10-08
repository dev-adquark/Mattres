import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { computeEffectiveWeights, loadRules } from '@/lib/scoreEngine';
import { DIMENSION_BY_ID } from '@/lib/explain';
import { POSITIONS } from '@/lib/content/positions';
import { getRepresentativeProfile, findMatchHref } from '@/lib/content/profiles';
import { rankingForPosition } from '@/lib/content/links';
import type { PositionLink, ScoringRules } from '@/lib/content/types';
import type { ScoreCategory, SleepPosition } from '@/lib/types';
import { RangeChart, bandRowsForPosition } from './RangeChart';
import styles from './PositionHub.module.css';

/** A weight share (0-1) as a whole percentage. */
const pct = (v: number) => Math.round(v * 100);

interface WeightedDimension {
  id: ScoreCategory;
  now: number;
  base: number;
}

/** The dimensions this position's rule weights above the default, from the engine itself. */
function weightedUp(rules: ScoringRules, slug: SleepPosition): WeightedDimension[] {
  const profile = getRepresentativeProfile(POSITIONS[slug].profileKey);
  if (!profile) return [];
  // The engine reads the same rules file through its own typed loader.
  const { effective } = computeEffectiveWeights(loadRules('0.2'), { ...profile, sleepPosition: slug });
  return (Object.keys(effective) as ScoreCategory[])
    .map((id) => ({ id, now: pct(effective[id]), base: pct(rules.baseWeights[id]) }))
    .filter((d) => d.now > d.base)
    .sort((a, b) => b.now - b.base - (a.now - a.base));
}

interface PositionHubCardProps {
  position: PositionLink;
  /** 0-based place in the list (printed as "01"). */
  index: number;
  rules: ScoringRules;
}

/** One sleep position on the /sleep-position hub: lead, comfort windows, engine weights and links. */
export function PositionHubCard({ position: p, index, rules }: PositionHubCardProps) {
  const content = POSITIONS[p.slug];
  const ranking = rankingForPosition(p.slug);
  const up = weightedUp(rules, p.slug);
  return (
    <li className={styles.card} id={p.slug}>
      <div className={styles.cardHead}>
        <span className={styles.cardNo} aria-hidden="true">
          {String(index + 1).padStart(2, '0')}
        </span>
        <h3 className={styles.cardTitle}>
          <Link href={p.href} className={styles.cardTitleLink}>
            {content.headline[1]}
            <span className="sr-only"> sleepers</span>
          </Link>
        </h3>
      </div>
      <p className={styles.cardLead}>{content.lead}</p>
      <RangeChart
        className={styles.cardChart}
        caption={`${content.label}: comfort window by body weight`}
        rowHeader="Body weight"
        rows={bandRowsForPosition(rules, p.slug)}
      />
      <p className={styles.weights}>
        {up.length ? (
          <>
            <span className={styles.weightsLabel}>Weighted up by the engine:</span>{' '}
            {up.map((d, j) => (
              <span key={d.id}>
                {j > 0 ? ', ' : null}
                {DIMENSION_BY_ID[d.id]?.label || d.id} <span className="tabular">{d.now}%</span>{' '}
                <span className={styles.weightsBase}>(default {d.base}%)</span>
              </span>
            ))}
          </>
        ) : (
          <>
            <span className={styles.weightsLabel}>Weights:</span> no position rule applies, so every dimension keeps its
            default weight.
          </>
        )}
      </p>
      <div className={styles.cardLinks}>
        <Link href={p.href} className={styles.cardLink}>
          Read the {content.noun} guide <ArrowUpRight aria-hidden="true" />
        </Link>
        {ranking ? (
          <Link href={ranking.href} className={styles.cardLink}>
            See the ranking: {ranking.label} <ArrowUpRight aria-hidden="true" />
          </Link>
        ) : null}
        <Link href={findMatchHref(p.slug)} className={styles.cardLinkQuiet}>
          Start a match as a {content.noun}
        </Link>
      </div>
    </li>
  );
}
