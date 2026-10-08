'use client';

import { BUDGET_STOPS, budgetLabel, budgetStopIndex } from './quizModel';
import { cssVars } from '@/components/ui/cssVars';
import styles from './Quiz.module.css';

interface BudgetRangeProps {
  /** Maximum Queen price, or null for "No limit". */
  value: number | null;
  onChange: (next: number | null) => void;
  labelledBy?: string;
  describedBy?: string;
}

/**
 * Maximum-budget scale (Queen price). A native range input over fixed
 * stops; the last stop is "No limit". The spoken value matches the
 * visible readout.
 */
export function BudgetRange({ value, onChange, labelledBy, describedBy }: BudgetRangeProps) {
  const index = budgetStopIndex(value);
  const last = BUDGET_STOPS.length - 1;
  return (
    <div className={styles.budget}>
      <p className={styles.budgetReadout} aria-hidden="true">
        {budgetLabel(value)}
      </p>
      <input
        type="range"
        className={`range ${styles.budgetRange}`}
        min={0}
        max={last}
        step={1}
        value={index}
        style={cssVars({ '--range-pct': `${(index / last) * 100}%` })}
        aria-labelledby={labelledBy}
        aria-describedby={describedBy}
        aria-valuetext={budgetLabel(value)}
        onChange={(e) => onChange(BUDGET_STOPS[Number(e.target.value)] ?? null)}
      />
      <div className="range-scale" aria-hidden="true">
        <span>$750</span>
        <span>No limit</span>
      </div>
    </div>
  );
}
