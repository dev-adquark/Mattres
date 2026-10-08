'use client';

import { useCallback, useEffect, useRef, useState, type Ref } from 'react';
import { ArrowDown } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { badgeClassName } from '@/components/ui/Badge';
import { MattressRender } from '@/components/ui/MattressRender';
import { ScoreBars } from '@/components/ui/ScoreBars';
import { CompareToggle } from '@/components/compare/CompareToggle';
import { MATTRESS_TYPE_LABEL } from '@/lib/firmness';
import { displayTitle } from '@/lib/format';
import { tierFor } from '@/lib/scoreTiers';
import { track, EVENTS } from '@/lib/analytics';
import type { WireMatchItem } from '@/lib/matchPayload';
import { firmnessFitText } from './matchText';
import { prefersReducedMotion } from './motion';
import { RevealScore } from './RevealScore';
import { MatchWhy } from './MatchWhy';
import styles from './Reveal.module.css';

/** Total choreography length (ms): beat 1 score, beat 2 words, beat 3 bars. */
export const REVEAL_MS = 2400;

const TYPE_LABEL: Record<string, string> = MATTRESS_TYPE_LABEL;

interface MatchRevealProps {
  /** The top matchProfile() result item. */
  item: WireMatchItem;
  /**
   * The item's engine rank by Match Score (1-based). Above 1 only when a
   * higher-scoring sponsored placement was kept out of the reveal.
   */
  rank?: number;
  /** Number of scored matches. */
  total?: number;
  headingRef?: Ref<HTMLHeadingElement>;
  onSeeAll?: () => void;
}

/**
 * The match reveal, a three-beat signature moment (about 2.4s, skippable
 * with the button or Escape, instant under reduced motion):
 *   1. full-screen night stage; the score counts up inside an amber ring;
 *   2. tier word, "Built around the way you sleep.", the full product name;
 *   3. the six engine sub-scores cascade in on the right;
 *   4. a construction-matched illustration settles into its own plate
 *      below, labelled as an illustration.
 * Below it: MatchWhy (reasons + watch-outs). Nothing here is written per product.
 */
export function MatchReveal({ item, rank = 1, total = 1, headingRef, onSeeAll }: MatchRevealProps) {
  const { entry, result, explanation } = item;
  const tier = tierFor(result.overallScore);
  const title = displayTitle(entry);
  const typeLabel = TYPE_LABEL[entry.type] || entry.type;
  const fit = firmnessFitText(result);
  const tracked = useRef(false);
  const [skipped, setSkipped] = useState(() => prefersReducedMotion());
  const [playing, setPlaying] = useState(() => !prefersReducedMotion());

  useEffect(() => {
    if (tracked.current) return;
    tracked.current = true;
    track(EVENTS.MATCH_REVEALED, { mattress_id: entry.id, score: result.overallScore, tier: tier.id, score_version: result.modelVersion });
  }, [entry.id, result.overallScore, result.modelVersion, tier.id]);

  const skip = useCallback(() => {
    setSkipped(true);
    setPlaying(false);
  }, []);

  // "Skip intro" only exists while the sequence plays; Escape skips too.
  useEffect(() => {
    if (!playing) return undefined;
    const done = setTimeout(() => setPlaying(false), REVEAL_MS + 200);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') skip();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      clearTimeout(done);
      window.removeEventListener('keydown', onKey);
    };
  }, [playing, skip]);

  return (
    <>
      <section
        className={`section section--cinematic ${styles.reveal}`}
        data-nav-theme="dark"
        data-skipped={skipped ? '' : undefined}
        aria-labelledby="match-title"
      >
        <div className={`container container--wide ${styles.grid}`}>
          <div className={styles.main}>
            <p className={`eyebrow ${styles.eyebrow} ${styles.b1}`}>
              Your top match{total > 1 ? ` · No. ${rank} of ${total} by score` : ''}
            </p>
            <div className={styles.b1}>
              <RevealScore score={result.overallScore} skipped={skipped} />
            </div>
            <div className={styles.words}>
              <p className={`${styles.tier} ${styles.b2a}`} data-tier={tier.id} aria-hidden="true">
                {tier.label}
              </p>
              <p className={`${styles.tagline} ${styles.b2b}`}>Built around the way you sleep.</p>
              <h1 id="match-title" ref={headingRef} tabIndex={-1} className={`${styles.name} ${styles.b2c}`}>
                <span className="sr-only">
                  Your top match, scoring {result.overallScore} out of 100, {tier.label}:{' '}
                </span>
                {title}
              </h1>
            </div>
          </div>

          <div className={styles.side}>
            <p className={`${styles.headline} ${styles.b2c}`}>{explanation.headline}</p>
            <div className={styles.bars}>
              <h2 className={`${styles.barsTitle} ${styles.b3}`}>How it scores for you</h2>
              <ScoreBars subScores={result.subScores} provenance={result.dimensionProvenance} dataProvenance={item.dataProvenance} />
            </div>
            {fit ? (
              <p className={`${styles.fit} ${styles.b3late}`}>
                <span className={styles.fitLabel}>Firmness fit</span>
                <span>{fit}</span>
              </p>
            ) : null}
            <div className={`${styles.actions} ${styles.b3late}`}>
              <Button href={`/mattress/${encodeURIComponent(entry.id)}`} variant="primary" size="lg" arrow magnetic>
                View mattress
              </Button>
              {total > 1 ? (
                <Button variant="secondary" size="lg" icon={<ArrowDown aria-hidden="true" />} onClick={onSeeAll}>
                  See all {total} matches
                </Button>
              ) : null}
            </div>
            {rank > 1 ? (
              <p className={`${styles.sponsorNote} ${styles.b3late}`}>
                {rank === 2 ? 'The No. 1 score is a sponsored placement' : `The ${rank - 1} higher scores are sponsored placements`},
                listed separately in your ranking. Sponsorship never affects a Match Score or this recommendation.
              </p>
            ) : null}
            <div className={`${styles.subActions} ${styles.b3late}`}>
              {item.badge ? <span className={badgeClassName('onDark')}>{item.badge.label}</span> : null}
              <CompareToggle id={entry.id} name={title} source="match_reveal" collapse={false} />
            </div>
          </div>
        </div>

        {/* Beat 4: the construction plate gets its own composed row below the
            hero, never layered behind the ring or the sub-score panel. */}
        <div className={`container container--wide ${styles.plate}`}>
          <div className={styles.plateText}>
            <p className="eyebrow">Typical construction</p>
            <p className={styles.plateType}>{typeLabel}</p>
            <p className={styles.illus}>
              <span className="illus-tag">Illustration</span>
              Typical {typeLabel.toLowerCase()} construction, not a photo of this mattress.
            </p>
          </div>
          <div className={styles.plateArt} aria-hidden="true">
            <MattressRender type={entry.type} aspect="cutaway" fill sizes="(min-width: 1000px) 62vw, 120vw" />
          </div>
        </div>

        {playing ? (
          <button type="button" className={styles.skip} onClick={skip}>
            Skip intro
          </button>
        ) : null}
      </section>

      <MatchWhy explanation={explanation} />
    </>
  );
}
