'use client';

import Link from 'next/link';
import { useState, type ComponentProps } from 'react';

type IntentLinkProps = Omit<ComponentProps<typeof Link>, 'prefetch'>;

/**
 * next/link that prefetches on intent (pointer hover, keyboard focus, touch)
 * instead of on entering the viewport. For chrome links that sit on every
 * page (mega-menu, mobile sheet, footer, header CTA): viewport prefetching
 * them preloads route CSS (quiz, category pages) that the current page never
 * uses, which Chrome reports as "preloaded but not used" on every load.
 * prefetch={null} restores the default once the user shows intent
 * (node_modules/next/dist/docs/01-app/02-guides/prefetching.md).
 */
export function IntentLink({ onPointerEnter, onFocus, onTouchStart, ...props }: IntentLinkProps) {
  const [active, setActive] = useState(false);
  return (
    <Link
      {...props}
      prefetch={active ? null : false}
      onPointerEnter={(e) => {
        setActive(true);
        onPointerEnter?.(e);
      }}
      onFocus={(e) => {
        setActive(true);
        onFocus?.(e);
      }}
      onTouchStart={(e) => {
        setActive(true);
        onTouchStart?.(e);
      }}
    />
  );
}
