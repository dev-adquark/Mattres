'use client';

import type { Ref } from 'react';
import { SearchX } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { MATTRESS_TYPES, budgetLabel, optionLabel, type QuizAnswers } from './quizModel';
import styles from './Results.module.css';

interface EmptyResultsProps {
  answers: QuizAnswers;
  /** Re-score with these answer changes. */
  onPatch: (partial: Partial<QuizAnswers>) => void;
  onEdit: (step: number) => void;
  headingRef?: Ref<HTMLHeadingElement>;
}

/** No mattress survived the type/budget filters: say which filters, and offer to widen one. */
export function EmptyResults({ answers, onPatch, onEdit, headingRef }: EmptyResultsProps) {
  const types = (answers.types || []).map((t) => optionLabel(MATTRESS_TYPES, t)).filter(Boolean);
  const hasBudget = typeof answers.budgetMax === 'number';
  const filters = [types.length ? `${types.join(', ')} only` : null, hasBudget ? budgetLabel(answers.budgetMax).toLowerCase() : null].filter(Boolean);
  return (
    <section className={`section section--cinematic ${styles.state}`} data-nav-theme="dark" aria-labelledby="empty-title">
      <div className="container container--narrow">
        <SearchX className={styles.stateIcon} aria-hidden="true" strokeWidth={1.25} />
        <p className="eyebrow">Your match</p>
        <h1 id="empty-title" ref={headingRef} tabIndex={-1} className={styles.stateTitle}>
          No mattresses fit those filters.
        </h1>
        <p className={styles.stateText}>
          {filters.length ? `You asked for ${filters.join(', ')}. ` : ''}
          Filters are applied before scoring, and mattresses without a published price can’t be confirmed inside a budget, so
          they’re left out. Widen one filter and we’ll score again with the rest of your answers unchanged.
        </p>
        <div className={styles.stateActions}>
          {hasBudget ? (
            <Button variant="primary" arrow onClick={() => onPatch({ budgetMax: null })}>
              Remove budget limit
            </Button>
          ) : null}
          {types.length ? (
            <Button variant={hasBudget ? 'secondary' : 'primary'} arrow={!hasBudget} onClick={() => onPatch({ types: [] })}>
              Include every mattress type
            </Button>
          ) : null}
          <Button variant="ghost" onClick={() => onEdit(4)}>
            Edit priorities
          </Button>
        </div>
      </div>
    </section>
  );
}
