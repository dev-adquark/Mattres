'use client';

import { useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { clearCompare, compareHref, useCompareIds } from '@/lib/compareStore';
import styles from './Compare.module.css';

interface SelectionRedirectProps {
  /** 'open': the URL had no ids. 'stale': the URL had ids (urlIds) but none exist any more. */
  mode?: 'open' | 'stale';
  urlIds?: readonly string[];
  children?: ReactNode;
}

/**
 * Wraps the server-rendered empty state of /compare.
 * mode 'open': if the visitor already has a selection (from the tray /
 *   cards), open it instead of showing the empty state.
 * mode 'stale': open a different stored selection if there is one; if the
 *   store holds the same dead ids, offer to clear them (never redirect to the
 *   same URL: no loop).
 */
export function SelectionRedirect({ mode = 'open', urlIds = [], children }: SelectionRedirectProps) {
  const router = useRouter();
  const ids = useCompareIds();
  const sameAsUrl = ids.length === urlIds.length && ids.every((id, i) => id === urlIds[i]);
  const shouldOpen = ids.length > 0 && !sameAsUrl;

  useEffect(() => {
    if (shouldOpen) router.replace(compareHref(ids), { scroll: false });
  }, [shouldOpen, ids, router]);

  if (shouldOpen) {
    return (
      <p className={styles.opening} role="status">
        Opening your selection of {ids.length} {ids.length === 1 ? 'mattress' : 'mattresses'}…
      </p>
    );
  }
  return (
    <>
      {children}
      {mode === 'stale' && sameAsUrl && ids.length ? (
        <p className={styles.staleNote}>
          Your saved selection points at mattresses we no longer list.{' '}
          <button type="button" className={styles.textBtn} onClick={() => clearCompare('compare_page')}>
            Clear saved selection
          </button>
        </p>
      ) : null}
    </>
  );
}
