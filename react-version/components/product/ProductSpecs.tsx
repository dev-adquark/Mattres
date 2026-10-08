import type { ReactNode } from 'react';
import { missingFields, REQUIRED_FIELDS } from '@/lib/dataIntegrity';
import { firmnessFor } from '@/lib/firmness';
import type { MattressEntry } from '@/lib/types';
import { Section } from '@/components/ui/Section';
import { DataValue } from '@/components/ui/DataValue';
import { Chapter } from '@/components/motion';
import { QUEEN_PRICE_QUALIFIER, priceAwaitingRecheck, queenPriceOf } from '@/lib/commerce';
import { firmnessDerivation, firmnessText, formatRating, formatUsd, ratingOf, typeLabel, warrantyText } from './productData';
import { FIELD_LABEL, listText } from './productPageModel';
import { componentsFor, independentRating, publicNote, shortDate, sourceLabel } from './productDisplay';
import styles from './ProductPage.module.css';

interface SpecProps {
  label: string;
  children: ReactNode;
  note?: string | null;
  wide?: boolean;
}

/** One spec cell: label / value / note on a shared three-row grid. */
function Spec({ label, children, note, wide = false }: SpecProps) {
  return (
    <div className={wide ? `${styles.spec} ${styles.specWide}` : styles.spec}>
      <dt className={styles.specLabel}>{label}</dt>
      <dd className={styles.specValue}>{children}</dd>
      <dd className={styles.specNote}>{note || null}</dd>
    </div>
  );
}

function RatingSpec({ label, value, note }: { label: string; value: number | null; note?: string | null }) {
  return (
    <Spec label={label} note={value !== null ? (note ? `Independent rating. ${note}` : 'Independent rating') : note}>
      <DataValue value={value} format={(v) => formatRating(v)} missingText="Not yet rated" missing="unavailable" />
    </Spec>
  );
}

/** A number with its unit in the lighter unit style. */
function WithUnit({ value, unit }: { value: number; unit: string }) {
  return (
    <>
      {value}
      <span className={styles.specUnit}> {unit}</span>
    </>
  );
}

/**
 * Spec note for the Queen price: the qualifier for a currency-unconfirmed
 * figure, the reader-facing price note, the check date, or why none is shown.
 * A figure flagged for a re-check is withheld (lib/commerce), and so is its
 * note, since the note's own figures came from the same suspect fetch. A
 * lowest-size "from" price is mentioned here, as that and nothing more,
 * unless it is itself flagged for a re-check.
 */
function priceNoteText(entry: MattressEntry, sourceName: string | null): string | null {
  if (priceAwaitingRecheck(entry)) {
    return `A Queen price was recorded from ${sourceName ?? 'the brand’s page'}, but it is due a re-check, so it isn’t shown until it is verified.`;
  }
  const note = publicNote(entry.priceNote);
  const price = queenPriceOf(entry);
  const fromPrice =
    !price && typeof entry.priceFromUsd === 'number' && entry.priceNeedsReverification !== true
      ? `The brand lists a lowest-size price from ${formatUsd(entry.priceFromUsd)}; the size isn't confirmed, so it isn't shown as the Queen price.`
      : null;
  const parts = [
    price?.status === 'currency-unconfirmed'
      ? `The source names no currency${/cad/i.test(entry.priceCurrency ?? '') ? ' (likely Canadian dollars)' : ''}, so this figure isn’t compared with US-dollar prices.`
      : null,
    note.text,
    note.text ? null : fromPrice,
    price && entry.priceUpdatedAt ? `Checked ${shortDate(entry.priceUpdatedAt)}.` : null,
  ];
  return parts.filter(Boolean).join(' ') || (price ? null : `We couldn't confirm a Queen price on ${sourceName ?? 'a source page'}, so none is shown.`);
}

/** Amount as published, with a small qualifier when its currency is unconfirmed; withheld figures show as missing. */
function QueenPriceValue({ entry }: { entry: MattressEntry }) {
  const price = queenPriceOf(entry);
  if (!price) return <DataValue value={null} />;
  const qualifier = QUEEN_PRICE_QUALIFIER[price.status];
  return (
    <>
      {formatUsd(price.amount)}
      {qualifier ? <span className={styles.specUnit}> {qualifier}</span> : null}
    </>
  );
}

/** Firmness note: how the number was arrived at when it is converted, then the brand's own description. */
function firmnessNoteText(entry: MattressEntry): string | null {
  const derived = firmnessDerivation(entry.firmnessSource);
  const description = publicNote(entry.firmnessDescription).text;
  // A number taken from an independent review is labelled, unless the brand note already says where it came from.
  const independent =
    typeof entry.firmnessSource === 'string' && entry.firmnessSource.startsWith('independent') && !/independent/i.test(description ?? '')
      ? "The number comes from a published independent review, not the brand's own page."
      : null;
  const parts = [derived ? `${derived.charAt(0).toUpperCase()}${derived.slice(1)}.` : null, independent, description];
  return parts.filter(Boolean).join(' ') || null;
}

/** Chapter 4: every core spec with its provenance, missing data marked rather than guessed. */
export function ProductSpecs({ entry }: { entry: MattressEntry }) {
  const gaps: string[] = missingFields(entry);
  const confirmed = REQUIRED_FIELDS.length - gaps.length;
  const firm = firmnessFor(entry);
  const source = sourceLabel(entry);
  const components = componentsFor(entry);

  return (
    <Section mood="editorial" id="specs" className={styles.specsSection} aria-labelledby="specs-title">
      <header className={styles.specsHead}>
        <Chapter index={3} label="Specifications" />
        <h2 id="specs-title" className={styles.h2}>
          The specifications.
        </h2>
        <div className={styles.provenance}>
          <p className={styles.status}>
            <span className={`status-dot ${gaps.length ? styles.dotPartial : ''}`} aria-hidden="true" />
            {gaps.length ? `${confirmed} of ${REQUIRED_FIELDS.length} core specs on file` : `All ${REQUIRED_FIELDS.length} core specs on file`}
          </p>
          <p className={styles.sourceLine}>
            {source ? (
              <>
                Source:{' '}
                <a href={source.href} target="_blank" rel="noopener noreferrer nofollow" className="link">
                  {source.name}
                  <span className="sr-only"> (opens in a new tab)</span>
                </a>{' '}
                — {source.kind}
                {source.date ? `, checked ${source.date}` : ''}.
              </>
            ) : (
              'No source page is on file for this mattress yet.'
            )}
          </p>
        </div>
      </header>

      <dl className={styles.specs}>
        <Spec label="Firmness" note={firm ? firmnessNoteText(entry) : null}>
          {firm ? (
            <>
              {firm.label} <span className={styles.specUnit}>{firmnessText(entry)}</span>
            </>
          ) : (
            <DataValue value={null} />
          )}
        </Spec>
        <Spec label="Construction" note={components.length ? `${components.length} ${components.length === 1 ? 'component' : 'components'} listed ${entry.officialProductUrl ? `by ${entry.brand}` : `on ${entry.sourceName || 'the retailer listing'}`}. See ${components.length === 1 ? 'it' : 'them'} by layer above.` : null}>
          {typeLabel(entry)}
        </Spec>
        <Spec label="Height" note={publicNote(entry.heightNote).text}>
          <DataValue value={entry.heightIn} format={(v) => <WithUnit value={v} unit="in" />} />
        </Spec>
        <Spec label="Queen price" note={priceNoteText(entry, source ? source.name : null)}>
          <QueenPriceValue entry={entry} />
        </Spec>
        <Spec label="Trial" note={publicNote(entry.returnPolicy).text}>
          <DataValue value={entry.trialDays} format={(v) => <WithUnit value={v} unit="nights" />} />
        </Spec>
        <Spec label="Warranty">
          <DataValue value={warrantyText(entry)} />
        </Spec>
        <RatingSpec label="Cooling" value={ratingOf(entry, 'cooling')} note={entry.cooling ? `Manufacturer: ${entry.cooling}` : null} />
        <RatingSpec label="Motion isolation" value={ratingOf(entry, 'motion')} />
        <RatingSpec label="Edge support" value={ratingOf(entry, 'edge')} />
        <RatingSpec label="Durability" value={independentRating(entry, 'durability')} />
      </dl>

      {gaps.length ? (
        <p className={styles.footnote}>
          Still missing: {listText(gaps.map((g) => FIELD_LABEL[g] || g))} — shown as “Not yet verified” rather than guessed.
        </p>
      ) : null}
    </Section>
  );
}
