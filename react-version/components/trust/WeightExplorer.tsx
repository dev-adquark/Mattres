'use client';

import { useId, useMemo, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import type { ScoreCategory, SubScores } from '@/lib/types';
import { DIMENSIONS } from '@/lib/explain';
import { buttonClassName } from '@/components/ui/Button';
import { comboIndex, defaultSelection } from './explorerModel';
import { cssVars } from '@/components/ui/cssVars';
import { multiplierText, pct } from './methodology/format';
import type { ExplorerField, ExplorerSelection, WeightRuleSummary } from './methodologyTypes';
import s from './WeightExplorer.module.css';

/** Track runs 0-50%: no effective weight in the rules gets near half the score. */
const TRACK_MAX = 0.5;

function deltaText(points: number): string {
  if (points === 0) return 'same as default';
  return `${points > 0 ? '+' : '−'}${Math.abs(points)} pts vs default`;
}

type Direction = 'up' | 'down' | 'same';

interface WeightExplorerProps {
  fields: readonly ExplorerField[];
  stride: number;
  table: readonly number[];
  baseWeights: SubScores;
  weightRules: readonly WeightRuleSummary[];
}

interface ExplorerRow {
  weights: Record<ScoreCategory, number>;
  applied: WeightRuleSummary[];
}

/**
 * Interactive weight explorer. Every row of `table` was produced on the
 * server by the engine's computeEffectiveWeights for one combination of
 * answers (see methodologyData.ts); this component only looks rows up.
 */
export function WeightExplorer({ fields, stride, table, baseWeights, weightRules }: WeightExplorerProps) {
  const [selection, setSelection] = useState<ExplorerSelection>(() => defaultSelection(fields));
  const uid = useId();

  const row = useMemo<ExplorerRow>(() => {
    const start = comboIndex(fields, selection) * stride;
    const values = table.slice(start, start + stride);
    const weights = Object.fromEntries(DIMENSIONS.map((d, i) => [d.id, (values[i] ?? 0) / 10000])) as Record<ScoreCategory, number>;
    const mask = values[DIMENSIONS.length] ?? 0;
    const applied = weightRules.filter((_, i) => (mask & (1 << i)) !== 0);
    return { weights, applied };
  }, [fields, selection, stride, table, weightRules]);

  const isDefault = fields.every((f) => selection[f.id] === f.defaultValue);
  const summary = DIMENSIONS.map((d) => `${d.label} ${pct(row.weights[d.id])}`).join(', ');

  return (
    <div className={s.explorer}>
      <form className={s.explorerControls} onSubmit={(e) => e.preventDefault()} aria-label="Sleep profile answers">
        {fields.map((field) => (
          <fieldset key={field.id} className={`fieldset ${s.explorerField}`}>
            <legend>{field.legend}</legend>
            <div className="segmented">
              {field.options.map((option) => (
                <label key={option.value}>
                  <input
                    type="radio"
                    name={`${uid}-${field.id}`}
                    value={option.value}
                    checked={selection[field.id] === option.value}
                    onChange={() => setSelection((prev) => ({ ...prev, [field.id]: option.value }))}
                  />
                  <span>{option.label}</span>
                </label>
              ))}
            </div>
          </fieldset>
        ))}
        <button
          type="button"
          className={buttonClassName({ variant: 'ghost', size: 'sm' })}
          onClick={() => setSelection(defaultSelection(fields))}
          disabled={isDefault}
          aria-disabled={isDefault}
        >
          <RotateCcw aria-hidden="true" />
          <span>Reset to default weights</span>
        </button>
      </form>

      <div className={s.explorerOutput}>
        <p className={s.explorerOutputTitle}>Share of your Match Score</p>
        <ol className={s.weightRows}>
          {DIMENSIONS.map((d) => {
            const value = row.weights[d.id];
            const base = baseWeights[d.id];
            const points = Math.round(value * 100) - Math.round(base * 100);
            const dir: Direction = points > 0 ? 'up' : points < 0 ? 'down' : 'same';
            return (
              <li key={d.id} className={s.weightRow} data-dir={dir}>
                <span className={s.weightName}>{d.label}</span>
                <span className={s.weightValue}>
                  <span className={s.weightPct}>{pct(value)}</span>
                  <span className={s.weightDelta}>
                    <span aria-hidden="true">{dir === 'up' ? '▲ ' : dir === 'down' ? '▼ ' : ''}</span>
                    {deltaText(points)}
                  </span>
                </span>
                <span className={s.weightTrack} aria-hidden="true">
                  <span className={s.weightFill} style={cssVars({ '--w': Math.min(1, value / TRACK_MAX) })} />
                  <span className={s.weightBase} style={cssVars({ '--w': Math.min(1, base / TRACK_MAX) })} />
                </span>
              </li>
            );
          })}
        </ol>
        <p className={s.weightLegend} aria-hidden="true">
          <span className={s.weightLegendFill} /> Your weight
          <span className={s.weightLegendBase} /> Default weight
        </p>

        <div className={s.appliedRules}>
          <p className={s.appliedTitle}>
            {row.applied.length === 0
              ? 'No answer above changes the weights, so these are the defaults.'
              : `${row.applied.length} ${row.applied.length === 1 ? 'rule' : 'rules'} re-weighting this profile`}
          </p>
          {row.applied.length > 0 ? (
            <ul className={s.appliedList}>
              {row.applied.map((rule) => (
                <li key={rule.id}>
                  <span className={s.appliedMult}>{multiplierText(rule.multiply, ' · ')}</span>
                  <span className={s.appliedDesc}>{rule.description}</span>
                  <span className={s.appliedWhy}>{rule.rationale}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
        <p className="sr-only" aria-live="polite" aria-atomic="true">
          {`Weights for this profile: ${summary}.`}
        </p>
      </div>
    </div>
  );
}
