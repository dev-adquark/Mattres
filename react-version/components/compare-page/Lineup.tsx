import Link from 'next/link';
import { Plus } from 'lucide-react';
import { MattressRender } from '@/components/ui/MattressRender';
import { colourwayForSlot } from '@/components/ui/render-stills/stills';
import { ScoreRing } from '@/components/ui/ScoreRing';
import { Skeleton } from '@/components/ui/Skeleton';
import { tierFor } from '@/lib/scoreTiers';
import { firmnessFor } from '@/lib/firmness';
import { MAX_COMPARE_COLUMNS, columnName, typeLabel } from './compareModel';
import type { CompareColumn, HeadingLevel, ScoringState } from './types';
import styles from './Compare.module.css';
import { SponsoredTag } from '@/components/trust/SponsoredTag';

interface LineupProps {
  columns: readonly CompareColumn[];
  scoring?: ScoringState;
  /** Show "Rank n" to screen readers. */
  ranked?: boolean;
  /** Render "Add a mattress" slots up to MAX_COMPARE_COLUMNS. */
  addSlots?: boolean;
  /** Level for the mattress names. */
  headingLevel?: HeadingLevel;
}

/**
 * The finalists, large: an illustrated render per mattress (labelled as an
 * illustration, not a product photo), its name and - when a profile exists -
 * the engine's Match Score. Server-safe (no hooks); also used from the
 * client workspace.
 */
export function Lineup({ columns, scoring = 'none', ranked = false, addSlots = false, headingLevel = 'h3' }: LineupProps) {
  const Heading = headingLevel;
  const empty = addSlots ? Math.max(0, MAX_COMPARE_COLUMNS - columns.length) : 0;
  return (
    <ol className={styles.lineup} data-count={columns.length + empty}>
      {columns.map((col, i) => {
        const { entry, item } = col;
        const score = item && item.result ? item.result.overallScore : null;
        const firm = firmnessFor(entry);
        return (
          <li key={col.id} className={styles.finalist}>
            <div className={styles.finalistMedia}>
              <MattressRender type={entry.type} seed={entry.id} colourway={colourwayForSlot(i, 'light')} aspect="card" fill objectPosition="50% 58%" photo={entry.photo} sizes="(min-width: 720px) 30vw, 80vw" />
              {entry.photo ? null : <span className={`illus-tag ${styles.finalistTag}`}>Illustration</span>}
              <span className={styles.finalistIndex} aria-hidden="true">
                {String(i + 1).padStart(2, '0')}
              </span>
            </div>
            <div className={styles.finalistBody}>
              <div className={styles.finalistText}>
                <p className={styles.finalistBrand}>
                  {ranked ? <span className="sr-only">Rank {i + 1}: </span> : null}
                  {entry.brand}
                  <SponsoredTag sponsored={entry.sponsored} />
                </p>
                <Heading className={styles.finalistName}>
                  <Link href={`/mattress/${entry.id}`} className="link-quiet">
                    {columnName(entry)}
                  </Link>
                </Heading>
                <p className={styles.finalistMeta}>{[typeLabel(entry.type), firm ? firm.label : null].filter(Boolean).join(' · ')}</p>
              </div>
              <div className={styles.finalistScore}>
                {typeof score === 'number' ? (
                  <>
                    <ScoreRing score={score} size="sm" />
                    <span className={styles.finalistTier}>{tierFor(score).label}</span>
                  </>
                ) : scoring === 'loading' ? (
                  <Skeleton variant="circle" width={58} height={58} />
                ) : null}
              </div>
            </div>
          </li>
        );
      })}
      {Array.from({ length: empty }, (_, k) => (
        <li key={`slot-${k}`} className={styles.slot}>
          <Link href="/mattresses" className={styles.slotLink}>
            <Plus aria-hidden="true" />
            <span>
              <strong>Add a mattress</strong>
              <span className={styles.slotHint}>
                {columns.length + k + 1} of {MAX_COMPARE_COLUMNS} · browse the catalog
              </span>
            </span>
          </Link>
        </li>
      ))}
    </ol>
  );
}
