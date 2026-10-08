'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Columns2, Plus } from 'lucide-react';
import { MAX_COMPARE, addToCompare, compareHref, getCompareIds, useCompareIds } from '@/lib/compareStore';
import { track, EVENTS } from '@/lib/analytics';
import { Button } from '@/components/ui/Button';
import type { PairNames } from './types';
import styles from './Pair.module.css';

interface PairActionsProps {
  pairSlug: string;
  /** Mattress ids. */
  a: string;
  b: string;
  names: PairNames;
  tone?: 'light' | 'dark';
}

/**
 * "Add both to compare" (keeps whatever else is already in the tray, up to
 * the 3-mattress limit, and says so when it can't) and "Open side by side"
 * (the /compare workspace with exactly these two, which also becomes the
 * tray selection). compare_added fires per mattress (source 'pair_page');
 * comparison_started fires with the pair slug when the workspace is opened.
 */
export function PairActions({ pairSlug, a, b, names, tone = 'light' }: PairActionsProps) {
  const router = useRouter();
  const ids = useCompareIds();
  const [message, setMessage] = useState('');
  const both = ids.includes(a) && ids.includes(b);

  const addBoth = () => {
    const current = getCompareIds();
    const missing = [a, b].filter((id) => !current.includes(id));
    if (current.length + missing.length > MAX_COMPARE) {
      setMessage(`Your compare list holds ${MAX_COMPARE} mattresses and has ${current.length}. Open these two side by side instead, or remove one from the tray.`);
      return;
    }
    for (const id of missing) addToCompare(id, id === a ? names.a : names.b, 'pair_page');
    setMessage('Both are in your compare tray.');
  };

  const open = () => {
    track(EVENTS.COMPARISON_STARTED, { source: 'pair_page', pair: pairSlug, count: 2 });
    router.push(compareHref([a, b]));
  };

  return (
    <div className={styles.actions} data-tone={tone}>
      <div className={styles.actionsRow}>
        <Button variant={tone === 'dark' ? 'onDark' : 'primary'} onClick={open} icon={<Columns2 aria-hidden="true" />}>
          Open side by side
        </Button>
        <Button
          variant={tone === 'dark' ? 'ghost' : 'secondary'}
          onClick={addBoth}
          disabled={both}
          aria-pressed={both}
          icon={both ? <Check aria-hidden="true" /> : <Plus aria-hidden="true" />}
        >
          {both ? 'Both in your compare' : 'Add both to compare'}
        </Button>
      </div>
      <p className={styles.actionsMsg} role="status" aria-live="polite">
        {message}
      </p>
    </div>
  );
}
