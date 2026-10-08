import type { ElementType, ReactNode } from 'react';
import { CircleDashed, Link2Off } from 'lucide-react';
import { queenPriceText, type QueenPriceSource } from '@/lib/commerce';
import { cx } from './cx';
import { dataValue as s } from '@/components/ui/systemStyles';

export type MissingKind = 'unverified' | 'unavailable' | 'link';

const MISSING_TEXT: Record<MissingKind, string> = {
  unverified: 'Not yet verified',
  unavailable: 'Data unavailable',
  link: 'Retailer link not available yet',
};

/**
 * The honest missing-data look for an element that renders its own text
 * (no icon). `data-value` / `data-value--missing` are rule-free hooks parents
 * may target with :global().
 */
export const missingValueClassName: string = cx('data-value', 'data-value--missing', s.value, s.missing);

function isMissing(value: unknown): value is null | undefined {
  return value === null || value === undefined || (typeof value === 'string' && value.trim() === '') || (typeof value === 'number' && !Number.isFinite(value));
}

interface DataValueProps<T> {
  value: T | null | undefined;
  format?: (value: T) => ReactNode;
  prefix?: ReactNode;
  suffix?: ReactNode;
  missing?: MissingKind;
  /** Overrides the missing wording entirely. */
  missingText?: string;
  className?: string;
  as?: ElementType;
}

/**
 * Renders a real value, or an honest, non-interactive missing state.
 *   <DataValue value={entry.heightIn} suffix=" in" />
 *   <DataValue value={entry.warrantyYears} suffix=" years" missing="unavailable" />
 */
export function DataValue<T extends ReactNode>({ value, format, prefix = '', suffix = '', missing = 'unverified', missingText, className, as: Tag = 'span' }: DataValueProps<T>) {
  if (isMissing(value)) {
    const Icon = missing === 'link' ? Link2Off : CircleDashed;
    return (
      <Tag className={cx(missingValueClassName, className)} data-missing={missing}>
        <Icon aria-hidden="true" />
        {missingText || MISSING_TEXT[missing] || MISSING_TEXT.unverified}
      </Tag>
    );
  }
  const rendered = format ? format(value as T) : value;
  return (
    <Tag className={cx('data-value', s.value, className)}>
      {prefix}
      {rendered}
      {suffix}
    </Tag>
  );
}

/**
 * An entry's Queen price, with "(provisional)" / "(currency not confirmed)"
 * when lib/commerce says so. A lowest-size "from" price (priceFromUsd) is
 * never shown as the Queen price.
 */
export function PriceValue({ entry, className }: { entry: (QueenPriceSource & { priceFromUsd?: number | null }) | null | undefined; className?: string }) {
  const text = queenPriceText(entry);
  if (text) return <DataValue value={text} className={className} />;
  return <DataValue value={null} missing="unverified" missingText="Price not yet verified" className={className} />;
}
