import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { displayTitle } from '@/lib/format';
import { getVerificationLevel } from '@/lib/dataIntegrity';
import { tierFor } from '@/lib/scoreTiers';
import type { VerificationLevel } from '@/lib/types';
import { MattressRender } from '@/components/ui/MattressRender';
import { ScoreRing } from '@/components/ui/ScoreRing';
import { VERIFICATION_DISPLAY, badgeClassName } from '@/components/ui/Badge';
import { CompareToggle } from '@/components/compare/CompareToggle';
import { cx } from '@/components/ui/cx';
import { listingShot, materialLine, LISTING_STATUS_LABEL } from './catalogData';
import type { ListingEntry } from './catalogData';
import { AttributeLine, QueenPrice } from './EntryFacts';
import { HeadlineScore } from './HeadlineScore';
import type { BestFit, HeadlineScore as HeadlineScoreData, PositionScore } from '@/components/product/catalogQuery';
import styles from './CatalogCard.module.css';

/**
 * The parts of a stored quiz result item (lib/types MatchItem) the card reads.
 * Read defensively: the item comes from device storage.
 */
export interface CardMatchItem {
  result?: { overallScore?: unknown } | null;
  whyThisMatch?: unknown;
}

interface CatalogCardProps {
  entry: ListingEntry | null | undefined;
  /** The visitor's own quiz result for this mattress, if any. */
  matchItem?: CardMatchItem;
  /** Overrides the factual line, e.g. a sort annotation. */
  line?: string | null;
  rank?: number;
  headingLevel?: 'h2' | 'h3' | 'h4';
  sizes?: string;
  compareSource?: string;
  className?: string;
  /** The catalog's engine headline score (catalogQuery#headlineScore); shown unless the match ring already carries it. */
  headline?: HeadlineScoreData | null;
  /** Engine positioning (catalogQuery#bestFitFor): the reference sleeper position it scores highest for. */
  fit?: BestFit | null;
  /** Every reference position score (catalogQuery#positionScoresFor), revealed over the image on hover/focus (fine pointers only). */
  positions?: PositionScore[] | null;
  /**
   * The card's index in its grid. When given, the shot (packshot, cutaway,
   * overhead, corner, close-up, low profile: catalogData#LISTING_SHOTS)
   * follows the slot, so neighbours in a 1- to 3-column grid never show the
   * same image. Without it, the shot follows the mattress id.
   */
  slot?: number;
}

/** "Best fit: back sleepers · 81/100", hedged when the score leans on estimated dimensions. */
export function FitLine({ fit, className }: { fit: BestFit; className?: string }) {
  return (
    <p className={className} title={`Engine score for a 160 lb reference ${fit.label.replace(/s$/, '')} (neutral temperature, sleeps alone, no firmness preference)`}>
      <span className={styles.fitLabel}>{fit.estimated ? 'Leans to' : 'Best fit'}</span> {fit.label}{' '}
      <span className="tabular">· {fit.score}/100</span>
      <span className="sr-only"> for a reference sleeper</span>
      {fit.estimated ? <span className={styles.fitNote}> · mostly estimated data</span> : null}
    </p>
  );
}

const isLevel = (value: unknown): value is VerificationLevel => typeof value === 'string' && value in VERIFICATION_DISPLAY;

/**
 * Gallery module for the catalog: no card chrome. A borderless 4:3 render
 * tile (crop varies per mattress), brand caps, the model in Fraunces, one
 * factual line, a hairline row of three attributes, the price (or an honest
 * "Queen price not yet verified"), a dot-style verification status and a quiet
 * compare toggle. With a match item (the visitor's own quiz result) the
 * score ring overlaps the tile's corner and the line becomes the engine's
 * own top reason.
 *
 * The module's four bands (media, copy, facts, foot) are direct children so a
 * parent grid can line them up across a row with `grid-template-rows: subgrid`
 * (components/product/Catalog.module.css .gallery).
 */
export function CatalogCard({ entry, matchItem, line, rank, headingLevel = 'h3', sizes, compareSource = 'card', className, headline, fit, positions, slot }: CatalogCardProps) {
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
  const showHeadline = headline && !(score !== null && headline.basis === 'match');

  return (
    <article className={cx(styles.card, className)} data-shot={shot.id} data-zoom={shot.zoom ? 'true' : undefined}>
      <div className={styles.mediaWrap}>
        <div className={styles.media}>
          <div className={styles.mediaInner}>
            <MattressRender
              type={entry.type}
              seed={entry.id}
              aspect={shot.aspect}
              colourway={shot.colourway}
              objectPosition={shot.objectPosition}
              fill
              size="fluid"
              photo={entry.photo}
              photoCreditLink={false}
              sizes={sizes || '(min-width: 1100px) 320px, (min-width: 640px) 46vw, 92vw'}
            />
          </div>
          {entry.photo ? null : <span className={cx('illus-tag', styles.tag)}>Illustration</span>}
          {positions && positions.length ? (
            <div className={styles.reveal}>
              <p className={styles.revealHead}>
                Engine score by reference sleeper{fit?.estimated ? <span className={styles.revealNote}> · mostly estimated data</span> : null}
              </p>
              <ul className={styles.revealList}>
                {positions.map((p) => (
                  <li key={p.position} className={styles.revealItem}>
                    <span className={styles.revealLabel}>{p.short}</span>
                    <span className={cx('tabular', styles.revealScore)}>{p.score}</span>
                    <span className={styles.revealBar} aria-hidden="true">
                      <span style={{ inlineSize: `${Math.max(0, Math.min(100, p.score))}%` }} />
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {rank ? (
            <span className={styles.rank} aria-hidden="true">
              {String(rank).padStart(2, '0')}
            </span>
          ) : null}
        </div>
        {entry.sponsored ? <span className={cx(badgeClassName('warning'), styles.sponsored)}>Sponsored</span> : null}
        {score !== null ? (
          <div className={styles.ring}>
            <ScoreRing score={score} size="sm" label="Your Match Score" />
          </div>
        ) : null}
      </div>

      <div className={styles.copy}>
        {showHeadline ? <HeadlineScore score={headline} variant="inline" className={styles.headline} /> : null}
        <p className={styles.brand}>
          {rank ? <span className="sr-only">Rank {rank}: </span> : null}
          {entry.brand}
        </p>
        <Heading className={styles.title}>
          <Link href={href} className={styles.link}>
            {fullTitle}
          </Link>
        </Heading>
        {score !== null ? (
          <p className={styles.tier}>
            <strong>{tierFor(score).label}</strong> <span className="tabular">{score}/100 for your profile</span>
          </p>
        ) : null}
        {score === null && fit ? <FitLine fit={fit} className={styles.fit} /> : null}
        <p className={styles.line}>{text}</p>
      </div>

      <div className={styles.facts}>
        <AttributeLine entry={entry} classes={styles} />
        <QueenPrice entry={entry} classes={styles} />
      </div>

      <div className={styles.foot}>
        <span className={styles.status} title={status.description}>
          <span className={cx(styles.dot, level === 'verified' ? styles.dotOn : styles.dotOff)} aria-hidden="true" />
          {LISTING_STATUS_LABEL[level]}
        </span>
        <div className={styles.actions}>
          <CompareToggle id={entry.id} name={fullTitle} source={compareSource} className={styles.compare} collapse={false} />
          {/* Visible "View" affordance for touch and mouse alike. The title link
              already names this page for keyboard and screen-reader users, so
              this duplicate stays out of the tab order and the a11y tree. */}
          <Link href={href} className={styles.cta} tabIndex={-1} aria-hidden="true">
            View mattress <ArrowRight />
          </Link>
        </div>
      </div>
    </article>
  );
}
