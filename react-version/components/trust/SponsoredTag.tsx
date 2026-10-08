import { badgeClassName } from '@/components/ui/Badge';
import { cx } from '@/components/ui/cx';
import s from './SponsoredTag.module.css';

interface SponsoredTagProps {
  /** The catalog entry's own `sponsored` flag. Nothing renders unless it is true. */
  sponsored: boolean | null | undefined;
  className?: string;
}

/**
 * The visible "Sponsored" label for a paid placement, used wherever a
 * mattress is listed (rankings, cards, carousels, related lists). It reads
 * only the catalog flag; sponsorship never changes a Match Score, so this is
 * a disclosure, not a ranking signal. Renders nothing for unsponsored entries.
 */
export function SponsoredTag({ sponsored, className }: SponsoredTagProps) {
  if (sponsored !== true) return null;
  return <span className={cx(badgeClassName('warning'), s.tag, className)}>Sponsored</span>;
}
