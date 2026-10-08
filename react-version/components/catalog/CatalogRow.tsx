import Link from 'next/link';
import { displayTitle } from '@/lib/format';
import { getVerificationLevel } from '@/lib/dataIntegrity';
import { tierFor } from '@/lib/scoreTiers';
import type { VerificationLevel } from '@/lib/types';
import { MattressRender } from '@/components/ui/MattressRender';
import { VERIFICATION_DISPLAY, badgeClassName } from '@/components/ui/Badge';
import { CompareToggle } from '@/components/compare/CompareToggle';
import { cx } from '@/components/ui/cx';
import { MATTRESS_TYPE_LABEL } from '@/lib/firmness';
import { cardAttributes, listingShot, materialLine, LISTING_STATUS_LABEL } from './catalogData';
import type { ListingEntry } from './catalogData';
import { QueenPrice } from './EntryFacts';
import type { CardMatchItem } from './CatalogCard';
import { FitLine } from './CatalogCard';
import { HeadlineScore } from './HeadlineScore';
import type { BestFit, HeadlineScore as HeadlineScoreData } from '@/components/product/catalogQuery';
import styles from './CatalogRow.module.css';

interface CatalogRowProps {
  entry: ListingEntry | null | undefined;
  /** The visitor's own quiz result for this mattress, if any. */
  matchItem?: CardMatchItem;
  /** Overrides the factual line, e.g. a sort annotation. */
  line?: string | null;
  headingLevel?: 'h3' | 'h4';
  compareSource?: string;
  /** The engine score the row leads with (catalogQuery#headlineScore). */
  headline?: HeadlineScoreData | null;
  /** Engine positioning (catalogQuery#bestFitFor). */
  fit?: BestFit | null;
  /** The row's index in its list: picks the thumbnail's shot (catalogData#listingShot) so neighbours differ. */
  slot?: number;
}

const isLevel = (value: unknown): value is VerificationLevel => typeof value === 'string' && value in VERIFICATION_DISPLAY;

const COLUMN_LABEL = { firmness: 'Firmness', trial: 'Trial' } as const;
const TYPE_LABEL: Readonly<Record<string, string | undefined>> = MATTRESS_TYPE_LABEL;

/**
 * One row of the catalog index (the list view). It leads with the engine
 * score (HeadlineScore), then the illustration, the model name with brand and
 * type beneath it, firmness + trial, the Queen price and status/compare. Its
 * cells are subgrid items of the parent list
 * (components/product/Catalog.module.css .index), so every column lines up
 * down the whole group under one header. Every value is the catalog's own;
 * gaps read "Trial not yet verified" / "Queen price not yet verified", never blank.
 * Narrower than 800px of list width the row folds into a compact module with
 * the "Illustration" label as a caption under the thumbnail.
 */
export function CatalogRow({ entry, matchItem, line, headingLevel = 'h3', compareSource = 'catalog_list', headline, fit, slot }: CatalogRowProps) {
  if (!entry) return null;
  const Heading = headingLevel;
  const href = `/mattress/${encodeURIComponent(entry.id)}`;
  const fullTitle: string = displayTitle(entry);
  const rawScore = matchItem?.result?.overallScore;
  const score = typeof rawScore === 'number' ? rawScore : null;
  const why = matchItem?.whyThisMatch;
  const reason = Array.isArray(why) && typeof why[0] === 'string' ? why[0] : null;
  const text = reason || line || materialLine(entry) || 'Layer-by-layer construction not yet verified.';
  const shot = listingShot(slot, entry.id);
  const rawLevel: unknown = getVerificationLevel(entry);
  const level: VerificationLevel = isLevel(rawLevel) ? rawLevel : 'unknown';
  const status = VERIFICATION_DISPLAY[level];
  // Type rides on the brand line; firmness and trial get their own columns.
  const facts = cardAttributes(entry).filter((a): a is typeof a & { id: 'firmness' | 'trial' } => a.id !== 'type');
  const typeLabel = entry.type ? TYPE_LABEL[entry.type] || entry.type : null;

  // With a headline score the personal tier is already the row's lead; don't repeat it.
  const showTierLine = score !== null && !(headline && headline.basis === 'match');

  return (
    <article className={cx(styles.row, !headline && styles.noScore)} data-shot={shot.id} data-zoom={shot.zoom ? 'true' : undefined}>
      {headline ? <HeadlineScore score={headline} className={styles.score} /> : null}

      <figure className={styles.thumb}>
        <div className={styles.thumbBox}>
          <div className={styles.thumbInner}>
            <MattressRender type={entry.type} seed={entry.id} aspect={shot.aspect} colourway={shot.colourway} objectPosition={shot.objectPosition} fill size="fluid" photo={entry.photo} photoCredit={false} sizes="(min-width: 720px) 128px, 30vw" />
          </div>
        </div>
        <figcaption className={styles.tag}>{entry.photo ? entry.photo.credit : 'Illustration'}</figcaption>
      </figure>

      <div className={styles.name}>
        <Heading className={styles.title}>
          <Link href={href} className={styles.link}>
            {fullTitle}
          </Link>
        </Heading>
        <p className={styles.brand}>
          {entry.brand}
          {typeLabel ? (
            <>
              <span className={styles.sep} aria-hidden="true">
                ·
              </span>
              <span className={styles.type}>{typeLabel}</span>
            </>
          ) : null}
          {entry.sponsored ? <span className={cx(badgeClassName('warning'), styles.sponsored)}>Sponsored</span> : null}
        </p>
        {showTierLine ? (
          <p className={styles.tierLine}>
            <strong>{tierFor(score).label}</strong> <span className="tabular">{score}/100 for your profile</span>
          </p>
        ) : null}
        {score === null && fit ? <FitLine fit={fit} className={styles.fit} /> : null}
        <p className={styles.line}>{text}</p>
      </div>

      <div className={styles.specs}>
        {facts.map((a) => (
          <p key={a.id} className={cx(styles.cell, a.id === 'firmness' ? styles.firmness : styles.trial)}>
            <span className="sr-only">{COLUMN_LABEL[a.id]}: </span>
            {a.text || <em className={styles.missing}>{a.missing}</em>}
          </p>
        ))}
      </div>

      <QueenPrice entry={entry} classes={styles} className={styles.priceCell} />

      <div className={styles.actions}>
        <span className={styles.status} title={status.description}>
          <span className={cx(styles.dot, level === 'verified' ? styles.dotOn : styles.dotOff)} aria-hidden="true" />
          {LISTING_STATUS_LABEL[level]}
        </span>
        <CompareToggle id={entry.id} name={fullTitle} source={compareSource} className={styles.compare} collapse={false} />
      </div>
    </article>
  );
}
