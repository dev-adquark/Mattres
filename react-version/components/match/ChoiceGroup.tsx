'use client';

import type { ReactNode, Ref } from 'react';
import { Check } from 'lucide-react';
import type { ChoiceOption } from './quizModel';
import styles from './Quiz.module.css';

/** An answer tile: a quiz option plus an optional decorative visual. */
export interface ChoiceTile<V extends string = string> extends ChoiceOption<V> {
  visual?: ReactNode;
}

export type ChoiceLayout = 'grid' | 'list' | 'visual';

interface ChoiceGroupCommon<V extends string> {
  name: string;
  options: readonly ChoiceTile<V>[];
  labelledBy?: string;
  describedBy?: string;
  invalid?: boolean;
  layout?: ChoiceLayout;
  /** Attached to the first input (focus target after a failed Next). */
  firstRef?: Ref<HTMLInputElement>;
}

interface SingleChoiceProps<V extends string> extends ChoiceGroupCommon<V> {
  multiple?: false;
  value: V | null;
  onChange: (next: V) => void;
}

interface MultiChoiceProps<V extends string> extends ChoiceGroupCommon<V> {
  multiple: true;
  value: readonly V[];
  onChange: (next: V[]) => void;
}

export type ChoiceGroupProps<V extends string> = SingleChoiceProps<V> | MultiChoiceProps<V>;

/**
 * Tactile answer tiles built on native radios / checkboxes, so arrow keys,
 * Space and form semantics work for free. Selected state = filled mark with
 * a check + stronger border + raised surface (never colour alone).
 */
export function ChoiceGroup<V extends string>(props: ChoiceGroupProps<V>) {
  const { name, options, labelledBy, describedBy, invalid, layout = 'grid', firstRef } = props;
  const multiple = props.multiple === true;
  const selected = (v: V): boolean => (props.multiple ? props.value.includes(v) : props.value === v);
  const toggle = (v: V): void => {
    if (!props.multiple) {
      props.onChange(v);
      return;
    }
    const list = props.value;
    props.onChange(list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
  };
  return (
    <div
      role={multiple ? 'group' : 'radiogroup'}
      aria-labelledby={labelledBy}
      aria-describedby={describedBy}
      aria-invalid={!multiple && invalid ? true : undefined}
      className={styles.choices}
      data-layout={layout}
      data-count={options.length}
    >
      {options.map((o, i) => (
        <label key={o.value} className={styles.choice} data-checked={selected(o.value) ? '' : undefined}>
          <input
            ref={i === 0 ? firstRef : undefined}
            className={styles.choiceInput}
            type={multiple ? 'checkbox' : 'radio'}
            name={name}
            value={o.value}
            checked={selected(o.value)}
            onChange={() => toggle(o.value)}
          />
          {o.visual ? <span className={styles.choiceVisual}>{o.visual}</span> : null}
          <span className={styles.choiceMark} aria-hidden="true">
            <Check strokeWidth={3} />
          </span>
          <span className={styles.choiceBody}>
            <span className={styles.choiceTitle}>{o.label}</span>
            {o.desc ? <span className={styles.choiceDesc}>{o.desc}</span> : null}
          </span>
        </label>
      ))}
    </div>
  );
}
