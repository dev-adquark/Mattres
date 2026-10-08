'use client';

import { useState } from 'react';
import { Check } from 'lucide-react';
import { MAX_COMPARE, toggleCompare, useCompareIds } from '@/lib/compareStore';
import { cx } from '@/components/ui/cx';
import { compareToggle as s } from '@/components/ui/systemStyles';

interface CompareToggleProps {
  /** Catalog mattress id. */
  id: string;
  /** Display name, cached for the tray and used in the accessible label. */
  name?: string;
  className?: string;
  labelOff?: string;
  labelOn?: string;
  /** Analytics label for compare_added / compare_removed (e.g. 'card'). */
  source?: string;
  /**
   * Below 1100px the control collapses to a compact checkbox with a one-word
   * caption (the full label stays the accessible name). Pass false for a lone, prominent control
   * (e.g. a product hero) that should keep its visible label at every width.
   */
  collapse?: boolean;
}

/**
 * Add/remove a mattress from the compare selection. A toggle button with
 * aria-pressed; when the selection is full it stays operable and politely
 * announces "Compare limit reached (3)" instead of silently doing nothing.
 *
 * Rule-free hooks for parents: .compare-toggle__btn, .compare-toggle__box.
 */
export function CompareToggle({ id, name, className, labelOff = 'Compare', labelOn = 'Added to compare', source = 'toggle', collapse = true }: CompareToggleProps) {
  const ids = useCompareIds();
  const selected = ids.includes(id);
  const [message, setMessage] = useState('');

  const onClick = () => {
    const res = toggleCompare(id, name, source);
    if (!res.ok && res.reason === 'limit') {
      setMessage(`Compare limit reached (${MAX_COMPARE}). Remove one to add another.`);
    } else {
      setMessage('');
    }
  };

  return (
    <span className={cx(s.toggle, className)}>
      <button
        type="button"
        className={cx('compare-toggle__btn', s.btn)}
        aria-pressed={selected}
        data-compare-id={id}
        data-collapse={collapse ? 'true' : undefined}
        onClick={onClick}
        // A constant name; aria-pressed alone carries the state, so it is announced once.
        aria-label={name && !labelOff.includes(name) ? `${labelOff} ${name}` : labelOff}
      >
        <span className={cx('compare-toggle__box', s.box)} aria-hidden="true">
          <Check strokeWidth={3} />
        </span>
        <span className={s.label} aria-hidden="true">
          {selected ? labelOn : labelOff}
        </span>
        {collapse ? (
          <span className={s.short} aria-hidden="true">
            Compare
          </span>
        ) : null}
      </button>
      <span className={s.msg} role="status" aria-live="polite">
        {message}
      </span>
    </span>
  );
}
