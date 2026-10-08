import type { ReactNode } from 'react';
import { cx } from './cx';

interface TableScrollProps {
  /** Accessible name for the scroll region, e.g. "Score breakdown table". " (scrolls sideways)" is appended. */
  label: string;
  className?: string;
  children: ReactNode;
}

/**
 * The one wrapper for a table that may scroll sideways on narrow screens.
 * It is a focusable, named region so keyboard users can scroll it with the
 * arrow keys (WCAG 2.1.1; axe scrollable-region-focusable).
 */
export function TableScroll({ label, className, children }: TableScrollProps) {
  return (
    <div className={cx('table-scroll', className)} tabIndex={0} role="region" aria-label={`${label} (scrolls sideways)`}>
      {children}
    </div>
  );
}
