import Link from 'next/link';
import type { CSSProperties } from 'react';
import { Check, FlaskConical, TriangleAlert, X } from 'lucide-react';
import { DataValue } from '@/components/ui/DataValue';
import { VerificationBadge } from '@/components/ui/Badge';
import { MattressRender } from '@/components/ui/MattressRender';
import { ScoreRing } from '@/components/ui/ScoreRing';
import { CompareToggle } from '@/components/compare/CompareToggle';
import { columnName } from './compareModel';
import type { CompareCell, CompareColumn, ScoringState } from './types';
import styles from './Compare.module.css';

interface ColumnHeadProps {
  col: CompareColumn;
  scoreState: ScoringState;
  /** Shows a Remove button (the /compare workspace); otherwise a CompareToggle. */
  onRemove?: (id: string) => void;
  toggleSource: string;
}

/** A column header: thumbnail, name, remove/add control and the Match Score (or why there is none). */
export function ColumnHead({ col, scoreState, onRemove, toggleSource }: ColumnHeadProps) {
  const name = columnName(col.entry);
  const score = col.item && col.item.result ? col.item.result.overallScore : null;
  return (
    <div className={styles.colHeadBox}>
      <div className={styles.colHeadInner}>
        <span className={styles.colThumb}>
          <MattressRender type={col.entry.type} seed={col.entry.id} aspect="card" fill objectPosition="50% 55%" sizes="80px" />
        </span>
        <span className={styles.colText}>
          <Link href={`/mattress/${col.entry.id}`} className={styles.colName}>
            {name}
          </Link>
          {col.entry.sponsored ? <span className={styles.sponsored}>Sponsored</span> : null}
          <span className={styles.colActions}>
            {onRemove ? (
              <button
                type="button"
                className={styles.removeBtn}
                onClick={() => onRemove(col.id)}
                aria-label={`Remove ${name} from comparison`}
                data-remove-id={col.id}
              >
                <X aria-hidden="true" />
                Remove
              </button>
            ) : (
              <CompareToggle id={col.entry.id} name={name} source={toggleSource} labelOff="Add to compare" labelOn="In compare" />
            )}
          </span>
        </span>
        <span className={styles.colScore}>
          {typeof score === 'number' ? (
            <ScoreRing score={score} size="sm" className={styles.ring} />
          ) : scoreState === 'loading' ? (
            <span className={styles.noScore}>Scoring…</span>
          ) : (
            <span className={styles.noScore}>No profile</span>
          )}
        </span>
      </div>
    </div>
  );
}

/** One table cell's value: a verification badge, an honest "missing" value, or the value with its bar, note and flags. */
export function CellValue({ cell, emphasis }: { cell: CompareCell; emphasis?: boolean }) {
  if (cell.kind === 'verification') return <VerificationBadge level={cell.level} />;
  if (cell.missing) {
    return <DataValue value={null} missing={cell.missing} missingText={cell.missingText} className={styles.missing} />;
  }
  // Runtime bar fill, consumed by .bar > span in Compare.module.css.
  const fill =
    typeof cell.bar === 'number'
      ? ({
          '--fill': Math.max(0, Math.min(100, cell.bar)) / 100,
        } as CSSProperties)
      : undefined;
  return (
    <span className={styles.value}>
      <span className={emphasis ? styles.bigValue : styles.mainValue} data-tone={cell.tone || undefined}>
        {cell.tone === 'success' && !emphasis ? <Check aria-hidden="true" className={styles.toneIcon} /> : null}
        {cell.tone === 'warning' && !emphasis && !cell.list ? <TriangleAlert aria-hidden="true" className={styles.toneIcon} /> : null}
        {cell.text}
        {cell.suffix ? <span className={styles.suffix}>{cell.suffix}</span> : null}
      </span>
      {fill ? (
        <span className={styles.bar} aria-hidden="true" data-estimated={cell.estimated ? 'true' : undefined}>
          <span style={fill} />
        </span>
      ) : null}
      {cell.note ? (
        <span className={styles.note} data-tone={cell.tone || undefined}>
          {cell.note}
        </span>
      ) : null}
      {cell.estimated ? (
        <span className={styles.estimated}>
          <FlaskConical aria-hidden="true" />
          Estimated
        </span>
      ) : null}
      {cell.list ? (
        <ul className={styles.miniList}>
          {cell.list.map((w) => (
            <li key={w.title} data-severity={w.severity}>
              {w.title}
            </li>
          ))}
        </ul>
      ) : null}
    </span>
  );
}
