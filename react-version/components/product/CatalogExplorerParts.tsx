'use client';

import { useId } from 'react';
import Link from 'next/link';
import { Search, X } from 'lucide-react';
import { profileSummary } from './lastResult';
import { cx } from '@/components/ui/cx';
import { isCatalogRatingKey } from '@/components/catalog/catalogData';
import { RANKING_RULE_TEXT } from '@/lib/categories';
import { FIT_THRESHOLD, referenceSortText } from './catalogQuery';
import type { FitPosition, SortBasis, SortId } from './catalogQuery';
import type { CategoryPage } from '@/lib/types';
import styles from './Catalog.module.css';

export function SearchField({ value, onChange, onCommit }: { value: string; onChange: (q: string) => void; /** Enter or leaving the field: report a settled query now. */ onCommit?: () => void }) {
  const id = useId();
  return (
    <div className={styles.search}>
      <label htmlFor={id} className={styles.searchLabel}>
        Search the catalog
      </label>
      <div className={styles.searchBox}>
        <Search aria-hidden="true" className={styles.searchIcon} />
        <input
          id={id}
          type="search"
          className={cx('input', styles.searchInput)}
          placeholder="Brand, model or “side sleeper”"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onCommit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onCommit?.();
          }}
          autoComplete="off"
          spellCheck={false}
          enterKeyHint="search"
        />
        {value ? (
          <button type="button" className={styles.searchClear} onClick={() => onChange('')} aria-label="Clear search">
            <X aria-hidden="true" />
          </button>
        ) : null}
      </div>
    </div>
  );
}

interface QueryNoteProps {
  /** catalogQuery#queryCategory for the current text. */
  named: { category: CategoryPage; position: FitPosition | null };
  /** Whether engine reference scores are available (position words depend on them). */
  hasReference: boolean;
}

/** Says what a category word in the search means here, and links to that category's ranked page. */
export function QueryNote({ named, hasReference }: QueryNoteProps) {
  const { category, position } = named;
  return (
    <p className={styles.sortNote}>
      {position && hasReference ? (
        <>
          <strong>“{position}”</strong> lists mattresses the engine rates a Strong match ({FIT_THRESHOLD}+) for a reference {position} sleeper.{' '}
        </>
      ) : null}
      Ranked on its own page:{' '}
      <Link href={category.href} className="link">
        {category.title}
      </Link>
    </p>
  );
}

interface SortNoteProps {
  sort: SortId;
  basis: SortBasis;
  /** The stored quiz profile (device storage; read defensively by profileSummary). */
  profile: unknown;
  hasResult: boolean;
  modelVersion: string | null | undefined;
}

/** One sentence under the toolbar saying what the current order is based on. */
export function SortNote({ sort, basis, profile, hasResult, modelVersion }: SortNoteProps) {
  const version = modelVersion ? ` Scoring model v${modelVersion}.` : '';
  if (basis === 'match') {
    const summary: string | null = profileSummary(profile);
    return (
      <p className={styles.sortNote}>
        <strong>Ranked by your Match Score</strong> from your last quiz{summary ? ` (${summary})` : ''}.{' '}
        <Link href="/find-match" className="link">
          Retake the quiz
        </Link>
      </p>
    );
  }
  const referenceText = basis === 'reference' ? referenceSortText(sort) : null;
  if (referenceText) {
    return (
      <p className={styles.sortNote}>
        <strong>Ranked for a reference sleeper, not for you:</strong> {referenceText}.{version} {RANKING_RULE_TEXT}{' '}
        <Link href="/find-match?from=catalog" className="link">
          {hasResult ? 'Retake the quiz' : 'Get your own Match Score'}
        </Link>
      </p>
    );
  }
  if (isCatalogRatingKey(sort)) {
    return (
      <p className={styles.sortNote}>
        Ratings out of 10 come from the independent reviews linked on each mattress page. We don&apos;t lab-test mattresses ourselves.
      </p>
    );
  }
  if (sort === 'price-asc' || sort === 'price-desc') {
    return (
      <p className={styles.sortNote}>
        Queen prices as published by each manufacturer when we last checked. Mattresses without a published Queen price are listed after the priced ones.
      </p>
    );
  }
  return null;
}
