import { formatUsd } from '@/lib/format';
import { cx } from '@/components/ui/cx';
import { QUEEN_PRICE_QUALIFIER, queenPriceOf } from '@/lib/commerce';
import { cardAttributes } from './catalogData';
import type { ListingEntry } from './catalogData';

/**
 * The two factual lines every catalog module shows, shared by CatalogCard and
 * the category ranking rows: a hairline row of three attributes (type,
 * firmness, trial) and the published Queen price. Missing values say so
 * ("Trial not yet verified", "Queen price not yet verified" - the same "not yet verified" state the product page and compare table use) rather than being hidden.
 *
 * Styling comes from the caller's CSS Module (`classes`), which must define
 * attrs, attr, sep, missing, price and priceNote.
 */
export interface EntryFactClasses {
  readonly attrs?: string;
  readonly attr?: string;
  readonly sep?: string;
  readonly missing?: string;
  readonly price?: string;
  readonly priceNote?: string;
}

interface EntryFactProps {
  entry: Pick<ListingEntry, 'type' | 'firmnessRange' | 'trialDays' | 'priceUsd'>;
  classes: EntryFactClasses;
  className?: string;
}

export function AttributeLine({ entry, classes, className }: EntryFactProps) {
  return (
    <p className={cx(classes.attrs, className)}>
      {cardAttributes(entry).map((a, i) => (
        <span key={a.id} className={classes.attr}>
          {i > 0 ? (
            <span className={classes.sep} aria-hidden="true">
              ·
            </span>
          ) : null}
          {a.text || <em className={classes.missing}>{a.missing}</em>}
        </span>
      ))}
    </p>
  );
}

export function QueenPrice({ entry, classes, className }: EntryFactProps) {
  // Listing entries carry priceCurrency / priceNeedsReverification at runtime (slimEntry).
  const queenPrice = queenPriceOf(entry);
  return (
    <p className={cx(classes.price, className)}>
      {queenPrice ? (
        <>
          <span className="tabular">{formatUsd(queenPrice.amount)}</span>{' '}
          <span className={classes.priceNote}>{QUEEN_PRICE_QUALIFIER[queenPrice.status] ? `Queen · ${QUEEN_PRICE_QUALIFIER[queenPrice.status]}` : 'Queen'}</span>
        </>
      ) : (
        <em className={classes.missing}>Queen price not yet verified</em>
      )}
    </p>
  );
}
