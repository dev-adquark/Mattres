import { computeEffectiveWeights, loadRules } from '@/lib/scoreEngine';
import { DIMENSIONS, DIMENSION_BY_ID } from '@/lib/explain';
import { cx } from '@/components/ui/cx';
import type { ScoringRules } from '@/lib/content/types';
import type { ScoreCategory, SleepProfile } from '@/lib/types';
import { cssVars } from '@/components/ui/cssVars';
import styles from './Position.module.css';

/** A weight share (0-1) as a whole percentage. */
const pct = (v: number) => Math.round(v * 100);

interface WeightPanelProps {
  rules: ScoringRules;
  profile: SleepProfile;
  /** "side sleeper" */
  noun: string;
}

const isScoreCategory = (id: string): id is ScoreCategory => Object.hasOwn(DIMENSION_BY_ID, id);
const dimensionLabel = (id: string): string => (isScoreCategory(id) ? DIMENSION_BY_ID[id].label : id);

/**
 * How much each dimension counts for the page's example profile, computed by
 * the engine itself (computeEffectiveWeights) and compared with the defaults.
 */
export function WeightPanel({ rules, profile, noun }: WeightPanelProps) {
  // The engine reads the same rules file through its own typed loader.
  const { effective, weightRulesUsed } = computeEffectiveWeights(loadRules('0.2'), profile);
  const base = rules.baseWeights;
  const positionRules = weightRulesUsed.filter((r) => r.ruleId.startsWith('WEIGHT_POSITION_'));
  return (
    <figure className={styles.weights}>
      <figcaption className={styles.weightsCaption}>
        <span className={styles.weightsTitle}>How much each dimension counts</span>
        <span className={styles.weightsSub}>For the example {noun} below, compared with the default weights.</span>
      </figcaption>
      <table className={styles.weightTable}>
        <thead className="sr-only">
          <tr>
            <th scope="col">Dimension</th>
            <th scope="col">Weight for this profile</th>
            <th scope="col">Default weight</th>
          </tr>
        </thead>
        <tbody>
          {DIMENSIONS.map((d) => {
            const now = pct(effective[d.id]);
            const def = pct(base[d.id]);
            const change = now === def ? 'same' : now > def ? 'up' : 'down';
            return (
              <tr key={d.id} data-change={change}>
                <th scope="row" className={styles.weightLabel}>
                  {d.label}
                </th>
                <td className={styles.weightCell}>
                  <span className={styles.weightTrack} aria-hidden="true">
                    <span className={styles.weightFill} style={cssVars({ '--weight-now': `${Math.min(100, now * 2.5)}%` })} />
                    <span className={styles.weightDefault} style={cssVars({ '--weight-default': `${Math.min(100, def * 2.5)}%` })} />
                  </span>
                  <span className={cx(styles.weightValue, 'tabular')}>
                    {now}%
                    {change !== 'same' ? (
                      <span className={styles.weightDelta}>
                        {change === 'up' ? '▲' : '▼'}
                        <span className="sr-only">{change === 'up' ? ' up' : ' down'}</span>
                      </span>
                    ) : null}
                  </span>
                </td>
                <td className={cx(styles.weightBase, 'tabular')}>
                  {def}% default
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {positionRules.length ? (
        <ul className={styles.weightRules}>
          {positionRules.map((r) => {
            const full = rules.weightModifiers.rules.find((x) => x.id === r.ruleId);
            const changes = Object.entries(r.multiply)
              .map(([dim, factor]) => `${dimensionLabel(dim)} ×${factor}`)
              .join(', ');
            return (
              <li key={r.ruleId}>
                <strong>{changes}.</strong> {full ? full.rationale : r.description}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className={styles.weightRules}>No position rule applies, so every dimension keeps its default weight.</p>
      )}
      <p className={styles.weightNote}>
        The thin mark on each bar is the default weight. Weights are re-balanced to total 100%, so when one rises the
        others fall slightly. Your own answers (temperature, partner, pain, edge, weight) change them further.
      </p>
    </figure>
  );
}
