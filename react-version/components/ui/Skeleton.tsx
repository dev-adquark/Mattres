import type { CSSProperties } from 'react';
import { cx } from './cx';
import { skeleton as s } from '@/components/ui/systemStyles';

interface SkeletonProps {
  variant?: 'block' | 'text' | 'circle';
  /** Any CSS length - the placeholder's size is the caller's runtime layout. */
  width?: CSSProperties['width'];
  height?: CSSProperties['height'];
  /** Render a stack of text lines instead of one block. */
  lines?: number;
  className?: string;
}

/**
 * Loading placeholder. Decorative (aria-hidden); wrap loading regions in an
 * element with aria-busy="true" and give screen readers a text status.
 */
export function Skeleton({ variant = 'block', width, height, lines, className }: SkeletonProps) {
  if (lines) {
    return (
      <span className={cx(s.lines, className)} aria-hidden="true">
        {Array.from({ length: lines }, (_, i) => (
          <span key={i} className={cx(s.skeleton, s.text)} />
        ))}
      </span>
    );
  }
  return (
    <span
      className={cx(s.skeleton, variant !== 'block' && s[variant], className)}
      aria-hidden="true"
      style={{ width, height: height ?? (variant === 'text' ? undefined : '1rem') }}
    />
  );
}
