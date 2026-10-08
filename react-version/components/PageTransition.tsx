'use client';

import * as React from 'react';
import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';

type ViewTransitionComponent = React.ComponentType<{
  children?: ReactNode;
  enter?: string;
  exit?: string;
  update?: string;
  default?: string;
}>;

// React's <ViewTransition> ships in the canary React that the App Router
// bundles. Read it off the namespace so an environment without it (tests,
// older runtimes) silently falls back to no transition.
const reactNamespace = React as unknown as { ViewTransition?: ViewTransitionComponent; unstable_ViewTransition?: ViewTransitionComponent };
const ViewTransition = reactNamespace.ViewTransition || reactNamespace.unstable_ViewTransition || null;

/**
 * Page-level view transition, mounted once in the root layout around the
 * page content. Keyed by pathname, so:
 *  - a route change exits the old page (fast fade up) and enters the new
 *    one (~240ms fade + 12px rise) inside the navigation transition;
 *  - search-param updates on the same path (filters, sort, ?ids=) do NOT
 *    animate the whole page;
 *  - browsers without the View Transitions API just swap instantly;
 *  - prefers-reduced-motion removes the animation (globals.css).
 * The header and compare tray carry their own view-transition-name and
 * stay still. No wrapper element is added, so `#main-content > :first-child`
 * selectors (the dark-hero nav overlay; nth-child(1 of :not(template…))) keep working. The view-transition
 * classes (.mms-page-exit / .mms-page-enter) are styled in globals.css:
 * ::view-transition pseudo-elements are document-level and cannot live in a
 * CSS Module.
 */
export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  if (!ViewTransition) return <>{children}</>;
  return (
    <ViewTransition key={pathname} enter="mms-page-enter" exit="mms-page-exit" update="none" default="none">
      {children}
    </ViewTransition>
  );
}
