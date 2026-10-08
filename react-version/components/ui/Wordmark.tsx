import Link from 'next/link';
import type { MouseEventHandler } from 'react';
import { cx } from './cx';
import { wordmark as s } from '@/components/ui/systemStyles';

/**
 * Original mark: a three-quarter score arc around a stack of three
 * mattress layers - "a score wrapped around a mattress".
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg className={cx(s.mark, className)} viewBox="0 0 32 32" aria-hidden="true" focusable="false">
      <circle cx="16" cy="16" r="13.5" fill="none" stroke="currentColor" strokeOpacity="0.2" strokeWidth="1.5" />
      <path className={s.arc} d="M16 2.5a13.5 13.5 0 1 1-13.5 13.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <rect x="9" y="11" width="14" height="3" rx="1.5" fill="currentColor" />
      <rect x="9" y="15.5" width="14" height="2.4" rx="1.2" fill="currentColor" fillOpacity="0.6" />
      <rect x="9" y="19.4" width="14" height="2.4" rx="1.2" fill="currentColor" fillOpacity="0.35" />
    </svg>
  );
}

interface WordmarkProps {
  href?: string;
  className?: string;
  onClick?: MouseEventHandler<HTMLAnchorElement>;
}

export function Wordmark({ href = '/', className, onClick }: WordmarkProps) {
  return (
    // The accessible name is the visible text ("Mattress Match Score") plus a
    // visually hidden ", home" - no aria-label, so the name always starts
    // with what sighted voice-control users read (WCAG 2.5.3 Label in Name).
    // Below 380px "Mattress" is visually hidden, never removed from the name.
    <Link href={href} className={cx(s.wordmark, className)} onClick={onClick}>
      <LogoMark />
      <span>
        <span className={s.textLong}>Mattress </span>Match <em>Score</em>
        <span className="sr-only">, home</span>
      </span>
    </Link>
  );
}
