import type { ComponentType, HTMLAttributes, ReactNode, SVGProps } from 'react';
import { BadgeCheck, CircleDashed, CircleHelp, FileSearch } from 'lucide-react';
import { getVerificationLevel } from '@/lib/dataIntegrity';
import type { MattressEntry, VerificationLevel } from '@/lib/types';
import { cx } from './cx';
import { badge as s } from '@/components/ui/systemStyles';
import { formatShortDate } from '@/lib/format';

export type BadgeTone = 'neutral' | 'accent' | 'warning' | 'success' | 'muted' | 'onDark';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
  icon?: ReactNode;
}

/** The badge look for a plain element (prefer <Badge>). */
export function badgeClassName(tone: BadgeTone = 'neutral'): string {
  return cx(s.badge, tone !== 'neutral' && s[tone]);
}

export function Badge({ tone = 'neutral', icon = null, className, children, ...rest }: BadgeProps) {
  return (
    <span className={cx(badgeClassName(tone), className)} {...rest}>
      {icon}
      {children}
    </span>
  );
}

interface VerificationDisplay {
  label: string;
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
  description: string;
}

export const VERIFICATION_DISPLAY: Record<VerificationLevel, VerificationDisplay> = {
  verified: {
    label: 'Verified',
    Icon: BadgeCheck,
    description:
      'Every required spec is on file and is recorded as confirmed against the cited source on the date shown. A firmness number taken from an independent review rather than the brand is labeled as such.',
  },
  partially_verified: {
    label: 'Source checked',
    Icon: FileSearch,
    description:
      'Every required spec is on file, but the source check is incomplete: some specs are not yet confirmed against the cited source page, or only a source link or a check date is recorded.',
  },
  unverified: {
    label: 'Needs verification',
    Icon: CircleDashed,
    description: 'Specs are on file but have not yet been checked against a manufacturer source.',
  },
  unknown: {
    label: 'Data unavailable',
    Icon: CircleHelp,
    description: 'One or more required specs (such as price, warranty or firmness) are missing for this mattress.',
  },
};

interface VerificationBadgeProps {
  /** Preferred: the level is recomputed via getVerificationLevel, never trusted from stored flags. */
  entry?: Partial<MattressEntry> | null;
  level?: VerificationLevel | null;
  showDescription?: boolean;
  lastVerified?: string | null;
  className?: string;
}

/**
 * Honest data-verification status. Pass the catalog `entry` (preferred) or
 * an explicit `level`. Rendered as text with a 6px status dot (the label
 * carries the meaning, never colour alone).
 */
export function VerificationBadge({ entry, level, showDescription = false, lastVerified, className }: VerificationBadgeProps) {
  const resolved: VerificationLevel = level || getVerificationLevel(entry);
  const display = VERIFICATION_DISPLAY[resolved] || VERIFICATION_DISPLAY.unknown;
  const rawDate = lastVerified || (resolved === 'verified' && entry ? entry.lastVerified : null);
  const date = rawDate ? formatShortDate(rawDate) || rawDate : null;
  const badge = (
    <span className={cx(s.badge, s.vbadge, s[resolved], !showDescription && className)} title={display.description}>
      <span className={s.dot} aria-hidden="true" />
      <span>{display.label}</span>
      {date ? <span className="sr-only">, checked {date}</span> : null}
    </span>
  );
  if (!showDescription) return badge;
  return (
    <span className={cx(s.wrap, className)}>
      {badge}
      <span className={s.desc}>
        {display.description}
        {date ? ` Last checked ${date}.` : ''}
      </span>
    </span>
  );
}
