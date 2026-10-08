import type { NavMenu } from '@/lib/types';

export function pathOf(href: string): string {
  return href.split('#')[0]?.split('?')[0] ?? href;
}

export function isCurrent(pathname: string | null, href: string): boolean {
  if (!pathname) return false;
  const p = pathOf(href);
  return pathname === p || (p !== '/' && pathname.startsWith(`${p}/`));
}

/**
 * The single route-prefix map behind the header's active state. Each entry
 * maps a route prefix to the one top-level menu it belongs to; the longest
 * matching prefix wins, so exactly one item (or none) is ever active.
 * `null` means the route belongs to no menu: /find-match is the primary CTA's
 * destination, so the CTA carries the current state instead of a menu item.
 */
export const NAV_ACTIVE_PREFIXES: ReadonlyArray<readonly [prefix: string, menuId: string | null]> = [
  ['/mattresses', 'mattresses'],
  ['/mattress', 'mattresses'],
  ['/brands', 'mattresses'],
  ['/find-match', null],
  ['/compare', 'compare'],
  ['/guides', 'guides'],
  ['/sleep-position', 'guides'],
  ['/faq', 'guides'],
  ['/methodology', 'methodology'],
  ['/disclosures', 'methodology'],
];

/** The id of the one active top-level menu for a pathname, or null. */
export function activeMenuId(pathname: string | null): string | null {
  if (!pathname) return null;
  let best: { len: number; id: string | null } | null = null;
  for (const [prefix, id] of NAV_ACTIVE_PREFIXES) {
    if (isCurrent(pathname, prefix) && (!best || prefix.length > best.len)) best = { len: prefix.length, id };
  }
  return best ? best.id : null;
}

export function menuIsCurrent(pathname: string | null, menu: NavMenu): boolean {
  return activeMenuId(pathname) === menu.id;
}

/** True when the pathname is the primary CTA's own route (the quiz/results). */
export function ctaIsCurrent(pathname: string | null, ctaHref: string): boolean {
  return isCurrent(pathname, ctaHref);
}

/** aria-current for a menu link: exact path match, never for in-page (#) links. */
export function linkCurrent(pathname: string | null, href: string): 'page' | undefined {
  return pathname === pathOf(href) && !href.includes('#') ? 'page' : undefined;
}

/** Analytics item id for a link. */
export const itemId = (href: string): string => pathOf(href).replace(/^\//, '') || 'home';

export type CategoryCounts = Record<string, { n: number; label: string }>;
