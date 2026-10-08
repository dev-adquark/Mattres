'use client';

import type { ReactNode, Ref } from 'react';
import type { MattressType } from '@/lib/types';
import { CircleAlert } from 'lucide-react';
import { ChoiceGroup } from './ChoiceGroup';
import { FirmnessSpectrum } from './FirmnessSpectrum';
import { BudgetRange } from './BudgetRange';
import { PositionGlyph } from './PositionGlyph';
import {
  EDGE_IMPORTANCE,
  MATTRESS_TYPES,
  PAIN_FOCUS,
  POSITIONS,
  SHARING,
  TEMPERATURES,
  WEIGHT_BANDS,
  type QuizAnswers,
  type QuizErrors,
} from './quizModel';
import styles from './Quiz.module.css';

/** Everything a step body needs from QuizStage. */
export interface StepFieldsProps {
  answers: QuizAnswers;
  errors: QuizErrors;
  /** Scoped DOM id for a key (stable per QuizStage instance). */
  ids: (key: string) => string;
  /** Joins the truthy ids into an aria-describedby value. */
  describe: (...keys: (string | false | null | undefined)[]) => string | undefined;
  answer: (partial: Partial<QuizAnswers>) => void;
  firstInputRef: Ref<HTMLInputElement>;
}

export function FieldError({ id, children }: { id: string; children?: ReactNode }) {
  if (!children) return null;
  return (
    <p id={id} className={`field__error ${styles.error}`}>
      <CircleAlert aria-hidden="true" />
      {children}
    </p>
  );
}

const POSITION_TILES = POSITIONS.map((p) => ({ ...p, visual: <PositionGlyph position={p.value} className={styles.glyph} /> }));

export function SleepStep({ answers, errors, ids, describe, answer, firstInputRef }: StepFieldsProps) {
  return (
    <div id={ids('focus-position')}>
      <ChoiceGroup
        name="position"
        layout="visual"
        firstRef={firstInputRef}
        labelledBy={ids('q')}
        describedBy={describe(ids('sub'), errors.position && ids('err-position'))}
        invalid={!!errors.position}
        value={answers.position}
        onChange={(v) => answer({ position: v })}
        options={POSITION_TILES}
      />
      <FieldError id={ids('err-position')}>{errors.position}</FieldError>
    </div>
  );
}

interface BodyStepProps extends StepFieldsProps {
  exactOpen: boolean;
  onShowExact: () => void;
}

export function BodyStep({ answers, errors, ids, describe, answer, firstInputRef, exactOpen, onShowExact }: BodyStepProps) {
  return (
    <div className={styles.fields}>
      <div id={ids('focus-weightBand')}>
        <ChoiceGroup
          name="weightBand"
          firstRef={firstInputRef}
          labelledBy={ids('q')}
          describedBy={describe(ids('sub'), errors.weightBand && ids('err-weightBand'))}
          invalid={!!errors.weightBand}
          value={answers.weightExact ? null : answers.weightBand}
          onChange={(v) => answer({ weightBand: v, weightExact: '' })}
          options={WEIGHT_BANDS}
        />
        <FieldError id={ids('err-weightBand')}>{errors.weightBand}</FieldError>
      </div>
      {exactOpen ? (
        <div className={`field ${styles.exact}`} id={ids('focus-weightExact')}>
          <label className="field__label" htmlFor={ids('exact')}>
            Exact weight <span className={styles.optional}>(optional)</span>
          </label>
          <div className="input-group">
            <input
              id={ids('exact')}
              className="input"
              inputMode="numeric"
              autoComplete="off"
              value={answers.weightExact}
              aria-invalid={errors.weightExact ? true : undefined}
              aria-describedby={describe(ids('exact-hint'), errors.weightExact && ids('err-weightExact'))}
              onChange={(e) => answer({ weightExact: e.target.value.replace(/[^\d.]/g, '').slice(0, 5) })}
            />
            <span className="input-affix">lb</span>
          </div>
          <p id={ids('exact-hint')} className="field__hint">
            Overrides the range above. Between 50 and 700 lb.
          </p>
          <FieldError id={ids('err-weightExact')}>{errors.weightExact}</FieldError>
        </div>
      ) : (
        <button type="button" className={`link ${styles.textButton}`} onClick={onShowExact}>
          Enter an exact weight instead
        </button>
      )}
    </div>
  );
}

export function ComfortStep({ answers, errors, ids, describe, answer, firstInputRef }: StepFieldsProps) {
  return (
    <div className={styles.fields}>
      <div id={ids('focus-firmness')}>
        <FirmnessSpectrum
          inputRef={firstInputRef}
          value={answers.firmness}
          onChange={(v) => answer({ firmness: v })}
          labelledBy={ids('q')}
          describedBy={describe(ids('sub'), errors.firmness && ids('err-firmness'))}
          invalid={!!errors.firmness}
        />
        <FieldError id={ids('err-firmness')}>{errors.firmness}</FieldError>
      </div>
      <div className={styles.subQuestion}>
        <h3 id={ids('pain')} className={styles.subTitle}>
          Where do you need the most support? <span className={styles.optional}>Optional</span>
        </h3>
        <ChoiceGroup name="painFocus" layout="list" labelledBy={ids('pain')} value={answers.painFocus} onChange={(v) => answer({ painFocus: v })} options={PAIN_FOCUS} />
      </div>
    </div>
  );
}

export function EnvironmentStep({ answers, errors, ids, describe, answer, firstInputRef }: StepFieldsProps) {
  return (
    <div className={styles.fields}>
      <div id={ids('focus-temperature')}>
        <ChoiceGroup
          name="temperature"
          firstRef={firstInputRef}
          labelledBy={ids('q')}
          describedBy={describe(ids('sub'), errors.temperature && ids('err-temperature'))}
          invalid={!!errors.temperature}
          value={answers.temperature}
          onChange={(v) => answer({ temperature: v })}
          options={TEMPERATURES}
        />
        <FieldError id={ids('err-temperature')}>{errors.temperature}</FieldError>
      </div>
      <div className={styles.subQuestion}>
        <h3 id={ids('share')} className={styles.subTitle}>
          Do you share your bed? <span className={styles.optional}>Optional</span>
        </h3>
        <ChoiceGroup name="sharing" labelledBy={ids('share')} value={answers.sharing} onChange={(v) => answer({ sharing: v })} options={SHARING} />
      </div>
    </div>
  );
}

interface PrioritiesStepProps extends StepFieldsProps {
  /** Catalog mattresses that survive the current type/budget filters. */
  eligible: number;
  catalogTotal: number;
}

export function PrioritiesStep({ answers, errors, ids, answer, firstInputRef, eligible, catalogTotal }: PrioritiesStepProps) {
  return (
    <div className={styles.fields}>
      <div className={styles.subQuestion}>
        <h3 id={ids('edge')} className={styles.subTitle}>
          How important is a firm, usable edge?
        </h3>
        <div className={`segmented ${styles.segmented}`} role="radiogroup" aria-labelledby={ids('edge')}>
          {EDGE_IMPORTANCE.map((o, i) => (
            <label key={o.value}>
              <input
                ref={i === 0 ? firstInputRef : undefined}
                type="radio"
                name="edge"
                value={o.value}
                checked={answers.edge === o.value}
                onChange={() => answer({ edge: o.value })}
              />
              <span>{o.label}</span>
            </label>
          ))}
        </div>
      </div>
      <div className={styles.subQuestion} id={ids('focus-eligible')}>
        <h3 id={ids('types')} className={styles.subTitle}>
          Any mattress types you prefer?
        </h3>
        <p id={ids('types-hint')} className={styles.hint}>
          Choose any number. Leave all unticked to include every type.
        </p>
        <ChoiceGroup<MattressType>
          name="types"
          multiple
          labelledBy={ids('types')}
          describedBy={ids('types-hint')}
          value={answers.types}
          onChange={(v) => answer({ types: v })}
          options={MATTRESS_TYPES}
        />
      </div>
      <div className={styles.subQuestion}>
        <h3 id={ids('budget')} className={styles.subTitle}>
          Your budget for a Queen
        </h3>
        <BudgetRange value={answers.budgetMax} onChange={(v) => answer({ budgetMax: v })} labelledBy={ids('budget')} describedBy={ids('budget-hint')} />
        <p id={ids('budget-hint')} className={styles.hint}>
          With a budget set, mattresses without a published price are left out, because we can’t confirm they fit it.
        </p>
      </div>
      <p className={styles.eligible} data-empty={eligible === 0 ? '' : undefined} aria-live="polite">
        <strong className="tabular">{eligible}</strong> of {catalogTotal} mattresses fit these filters.
      </p>
      <FieldError id={ids('err-eligible')}>{errors.eligible}</FieldError>
    </div>
  );
}
