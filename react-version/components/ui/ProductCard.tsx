import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { displayTitle } from '@/lib/format';
import { firmnessCardText, MATTRESS_TYPE_LABEL } from '@/lib/firmness';
import { tierFor } from '@/lib/scoreTiers';
import type { MattressEntry } from '@/lib/types';
import { CompareToggle } from '@/components/compare/CompareToggle';
import { MattressRender } from './MattressRender';
import { ScoreRing } from './ScoreRing';
import { DataValue, PriceValue } from './DataValue';
import { VerificationBadge } from './Badge';
import { cx } from './cx';
import { SponsoredTag } from '@/components/trust/SponsoredTag';
import { productCard as s } from '@/components/ui/systemStyles';

/** The parts of a matchProfile() item the card reads. */
interface ProductCardMatch {
  result?: { overallScore: number } | null;
  whyThisMatch?: string[] | null;
}

interface ProductCardProps {
  entry: MattressEntry | null | undefined;
  /** A matchProfile() result item: adds the score ring, tier and top reason. */
  matchItem?: ProductCardMatch | null;
  /** Show the compare toggle. */
  compare?: boolean;
  headingLevel?: 'h2' | 'h3' | 'h4';
  /**
   * Whose profile the score belongs to, printed after "NN/100". Defaults to
   * the visitor's own result; pass e.g. "for the example profile" when the
   * matchItem was scored for a disclosed example profile instead.
   */
  scoreContext?: string;
  /** Shown as "No. 1". */
  rank?: number;
  showVerification?: boolean;
  className?: string;
}

const TYPE_LABEL: Record<string, string> = MATTRESS_TYPE_LABEL;

/**
 * Editorial product module (not a boxed SaaS card): a full-bleed render
 * tile, brand eyebrow, Fraunces title, one quiet spec line, and a status
 * dot. Without `matchItem` it's neutral; with a matchProfile() result item
 * it adds the amber score ring, tier and the top engine-generated reason.
 *
 * Hover (desktop, motion allowed): the illustration scales inside its frame
 * and a "View mattress" chip reveals. On touch the chip is always visible.
 * The whole card is one link (title ::after).
 *
 * Rule-free hooks for parents: .product-card, .product-card__media.
 */
export function ProductCard({ entry, matchItem, scoreContext = 'for your profile', compare = true, headingLevel = 'h3', rank, showVerification = true, className }: ProductCardProps) {
  if (!entry) return null;
  const title = displayTitle(entry);
  const href = `/mattress/${encodeURIComponent(entry.id)}`;
  const firmness = firmnessCardText(entry);
  const typeLabel = TYPE_LABEL[entry.type] || entry.type;
  const score = matchItem && matchItem.result ? matchItem.result.overallScore : null;
  const tier = typeof score === 'number' ? tierFor(score) : null;
  const reason = matchItem && Array.isArray(matchItem.whyThisMatch) ? matchItem.whyThisMatch[0] : null;
  const Heading = headingLevel;

  return (
    <article className={cx('product-card', s.card, className)}>
      <div className={cx('product-card__media', s.media)}>
        <MattressRender type={entry.type} seed={entry.id} size="fluid" fill photo={entry.photo} sizes="(min-width: 1080px) 380px, (min-width: 640px) 46vw, 92vw" />
        {entry.photo ? null : (
          <span className={s.illus} aria-hidden="true">
            Illustration
          </span>
        )}
        {typeof score === 'number' ? (
          <div className={s.score}>
            <ScoreRing score={score} size="sm" />
          </div>
        ) : null}
        {rank ? (
          <span className={s.rank} aria-hidden="true">
            No. {rank}
          </span>
        ) : null}
        <span className={s.reveal} aria-hidden="true">
          View mattress
          <ArrowRight />
        </span>
      </div>
      <div className={s.body}>
        <div>
          <p className={s.brand}>
            {rank ? <span className="sr-only">Rank {rank}: </span> : null}
            {entry.brand}
            <SponsoredTag sponsored={entry.sponsored} />
          </p>
          <Heading className={s.title}>
            <Link href={href}>{title}</Link>
          </Heading>
        </div>

        {tier ? (
          <p className={s.tier}>
            <strong>{tier.label}</strong>
            <span className="tabular">{score}/100 {scoreContext}</span>
          </p>
        ) : null}
        {reason ? <p className={s.reason}>{reason}</p> : null}

        <dl className={s.facts}>
          <div>
            <dt>Type</dt>
            <dd>{typeLabel}</dd>
          </div>
          <div>
            <dt>Firmness</dt>
            <dd>
              <DataValue value={firmness} />
            </dd>
          </div>
          <div>
            <dt>Queen price</dt>
            <dd>
              <PriceValue entry={entry} />
            </dd>
          </div>
          <div>
            <dt>Trial</dt>
            <dd>
              <DataValue value={entry.trialDays} suffix=" nights" />
            </dd>
          </div>
        </dl>

        <div className={s.footer}>
          {showVerification ? (
            <div className={s.badges}>
              <VerificationBadge entry={entry} />
            </div>
          ) : (
            <span className={s.cta} aria-hidden="true">
              View mattress
              <ArrowRight />
            </span>
          )}
          {compare ? <CompareToggle id={entry.id} name={title} source="card" /> : null}
        </div>
      </div>
    </article>
  );
}
