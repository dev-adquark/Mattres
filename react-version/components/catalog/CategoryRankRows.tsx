import type { CSSProperties } from 'react';
import Link from 'next/link';
import { ArrowRight, Check, TriangleAlert } from 'lucide-react';
import { MattressRender } from '@/components/ui/MattressRender';
import { ScoreRing } from '@/components/ui/ScoreRing';
import type { ScoreRingSize } from '@/components/ui/ScoreRing';
import { CompareToggle } from '@/components/compare/CompareToggle';
import { cx } from '@/components/ui/cx';
import { SponsoredTag } from '@/components/trust/SponsoredTag';
import { cropFor } from './catalogData';
import { AttributeLine, QueenPrice } from './EntryFacts';
import type { CategoryColumn, CategoryMetric, CategoryRow, RankedRow } from './buildCategory';
import styles from './CategoryPage.module.css';

/**
 * The two row shapes of a /mattresses/<category> page: the large editorial
 * podium module (top three) and the dense ranking row. Every value shown is
 * read from the row built by buildCategory (engine output or the entry).
 */

const mattressHref = (id: string): string => `/mattress/${encodeURIComponent(id)}`;
const pad2 = (n: number): string => String(n).padStart(2, '0');

function Metric({ metric, size = 'md' }: { metric: CategoryMetric | null; size?: ScoreRingSize }) {
  if (!metric) return null;
  // The ring prints a whole number; averages are shown with one decimal everywhere ("85.0", "84.8"), so only a score whose text IS the whole number gets the ring.
  if (metric.kind === 'score' && Number.isInteger(metric.value) && metric.display === String(metric.value)) {
    return (
      <div className={styles.metricRing}>
        <ScoreRing score={metric.value} size={size} label={metric.label} />
        <p className={styles.metricLabel}>
          <strong>{metric.tier}</strong>
          <span>{metric.label}</span>
        </p>
      </div>
    );
  }
  return (
    <div className={styles.metricBig}>
      <p className={styles.metricValue}>
        <span className="tabular">{metric.display}</span>
      </p>
      <p className={styles.metricLabel}>
        {metric.tier ? <strong>{metric.tier}</strong> : null}
        <span>{metric.label}</span>
      </p>
    </div>
  );
}

function PositionScores({ positions }: { positions: NonNullable<CategoryRow['positions']> }) {
  return (
    <dl className={styles.positionScores}>
      {positions.map((p) => (
        <div key={p.id}>
          <dt>{p.label.replace(' sleeper', '')}</dt>
          <dd className="tabular">{p.score ?? '–'}</dd>
        </div>
      ))}
    </dl>
  );
}

function ColumnValue({ column }: { column: CategoryColumn }) {
  return (
    <p className={styles.column}>
      <span className={styles.columnLabel}>{column.label}</span>{' '}
      {column.display ? <strong className="tabular">{column.display}</strong> : <em className={styles.missing}>No independent rating</em>}
    </p>
  );
}

function ReviewSources({ sources }: { sources: CategoryRow['sources'] }) {
  return (
    <p className={styles.sources}>
      Review sources on file:{' '}
      {sources.map((s, i) => (
        <span key={s.name}>
          {i > 0 ? ', ' : ''}
          {s.url ? (
            <a href={s.url} target="_blank" rel="noopener noreferrer nofollow" className="link">
              {s.name}
            </a>
          ) : (
            s.name
          )}
        </span>
      ))}
    </p>
  );
}

function Reasons({ row }: { row: CategoryRow }) {
  if (!row.reasons.length && !row.watchOut) return null;
  return (
    <ul className={styles.reasons}>
      {row.reasons.map((r) => (
        <li key={r} className={styles.reason}>
          <Check aria-hidden="true" />
          <span>{r}</span>
        </li>
      ))}
      {row.watchOut ? (
        <li className={cx(styles.reason, styles.watch)}>
          <TriangleAlert aria-hidden="true" />
          <span>
            <span className="sr-only">Watch out: </span>
            {row.watchOut.title ? <strong>{row.watchOut.title}. </strong> : null}
            {row.watchOut.text}
          </span>
        </li>
      ) : null}
    </ul>
  );
}

interface PodiumModuleProps {
  row: RankedRow;
  first: boolean;
  isRating: boolean;
}

export function PodiumModule({ row, first, isRating }: PodiumModuleProps) {
  const href = mattressHref(row.id);
  const crop = cropFor(row.id);
  return (
    <article className={styles.module}>
      <div className={styles.moduleMedia}>
        <MattressRender
          type={row.entry.type}
          seed={row.id}
          aspect={first ? 'product' : crop.aspect}
          objectPosition={first ? '50% 60%' : crop.objectPosition}
          fill
          photo={row.entry.photo}
          photoCreditLink={false}
          sizes={first ? '(min-width: 900px) 56vw, 100vw' : '(min-width: 900px) 40vw, 100vw'}
        />
        {row.entry.photo ? null : <span className={cx('illus-tag', styles.moduleTag)}>Illustration</span>}
      </div>
      <div className={styles.moduleBody}>
        <p className={styles.moduleRank} aria-hidden="true">
          {pad2(row.rank)}
        </p>
        <p className={styles.moduleBrand}>
          <span className="sr-only">Rank {row.rank}: </span>
          {row.entry.brand}
          <SponsoredTag sponsored={row.entry.sponsored} />
        </p>
        <h3 className={styles.moduleTitle}>
          <Link href={href} className={styles.moduleLink}>
            {row.title}
          </Link>
        </h3>
        <Metric metric={row.metric} size={first ? 'md' : 'sm'} />
        {isRating && row.sources.length ? <ReviewSources sources={row.sources} /> : null}
        {row.headline ? (
          <p className={styles.headline}>
            {row.headline}
            {row.explainedFor && (isRating || row.positions) ? <span className={styles.headlineFor}> For a reference {row.explainedFor.toLowerCase()}.</span> : null}
          </p>
        ) : null}
        <Reasons row={row} />
        {row.positions ? <PositionScores positions={row.positions} /> : null}
        {row.column ? <ColumnValue column={row.column} /> : null}
        {row.flag ? <p className={styles.flag}>{row.flag}</p> : null}
        <div className={styles.moduleFoot}>
          <AttributeLine entry={row.entry} classes={styles} />
          <QueenPrice entry={row.entry} classes={styles} />
          <div className={styles.moduleActions}>
            <Link href={href} className={styles.view}>
              View mattress <ArrowRight aria-hidden="true" />
            </Link>
            <CompareToggle id={row.id} name={row.title} source="category" className={styles.compare} />
          </div>
        </div>
      </div>
    </article>
  );
}

type RankRowProps = { row: RankedRow; unranked?: false } | { row: CategoryRow; unranked: true };

/** Bar fill (0-100%) for a row's metric: scores are out of 100, ratings out of 10. */
function fillPercent(metric: CategoryMetric | null): number {
  if (!metric) return 0;
  return Math.max(0, Math.min(100, metric.kind === 'rating' ? metric.value * 10 : metric.value));
}

export function RankRow(props: RankRowProps) {
  const { row } = props;
  const rank = props.unranked ? null : props.row.rank;
  const href = mattressHref(row.id);
  // Runtime value: the bar's fill is the row's own metric.
  const barStyle = { '--fill': `${fillPercent(row.metric)}%` } as CSSProperties;
  return (
    <li className={cx(styles.row, rank === null && styles.rowUnranked)}>
      {rank !== null ? (
        <span className={styles.rowRank} aria-hidden="true">
          {pad2(rank)}
        </span>
      ) : null}
      <div className={styles.rowThumb}>
        <MattressRender type={row.entry.type} seed={row.id} aspect="card" objectPosition="50% 55%" fill sizes="96px" />
      </div>
      <div className={styles.rowMain}>
        <p className={styles.rowBrand}>
          {rank !== null ? <span className="sr-only">Rank {rank}: </span> : null}
          {row.entry.brand}
          <SponsoredTag sponsored={row.entry.sponsored} />
        </p>
        <p className={styles.rowTitle}>
          <Link href={href} className={styles.rowLink}>
            {row.title}
          </Link>
        </p>
        <AttributeLine entry={row.entry} classes={styles} className={styles.rowAttrs} />
        {row.flag ? <p className={styles.flag}>{row.flag}</p> : null}
      </div>
      <div className={styles.rowSide}>
        {row.column ? <ColumnValue column={row.column} /> : null}
        <QueenPrice entry={row.entry} classes={styles} className={styles.rowPrice} />
      </div>
      <div className={styles.rowMetric}>
        {rank === null ? (
          <p className={styles.rowNotRanked}>Not ranked</p>
        ) : row.metric ? (
          <>
            <p className={styles.rowValue}>
              <span className="tabular">{row.metric.display}</span>
              <span className="sr-only"> {row.metric.label}</span>
            </p>
            <span className={styles.bar} style={barStyle} aria-hidden="true">
              <span />
            </span>
          </>
        ) : null}
      </div>
      <div className={styles.rowCompare}>
        <CompareToggle id={row.id} name={row.title} source="category" className={styles.compare} />
      </div>
    </li>
  );
}
