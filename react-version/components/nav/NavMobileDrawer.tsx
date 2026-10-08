'use client';

import { useEffect, useState, type RefObject } from 'react';
import { ArrowUpRight, ChevronDown, Search } from 'lucide-react';
import { NAV_MENU, PRIMARY_CTA, SITE_TAGLINE } from '@/lib/site';
import { Button } from '@/components/ui/Button';
import { IntentLink } from '@/components/ui/IntentLink';
import { cx } from '@/components/ui/cx';
import { activeMenuId, ctaIsCurrent, itemId, linkCurrent } from './navPaths';
import { nav as s } from '@/components/ui/systemStyles';

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * While the mobile sheet is open: scroll lock, a focus trap over the header
 * (wordmark, toggle and sheet - never the desktop nav or the search dialog),
 * Esc to close (focus returns to the toggle), and auto-close when the
 * viewport grows to the desktop layout.
 */
function useDrawerBehavior(open: boolean, close: () => void, headerRef: RefObject<HTMLElement | null>, toggleRef: RefObject<HTMLButtonElement | null>) {
  useEffect(() => {
    if (!open) return undefined;
    const root = document.documentElement;
    root.classList.add('is-scroll-locked');
    const header = headerRef.current;
    // Modal: everything outside the header (page content, footer, compare tray)
    // is inert, so a screen reader's virtual cursor cannot wander under the sheet.
    const inerted: HTMLElement[] = [];
    for (let node: HTMLElement | null = header; node && node !== document.body; node = node.parentElement) {
      for (const sibling of Array.from(node.parentElement?.children ?? [])) {
        if (sibling === node || !(sibling instanceof HTMLElement) || sibling.inert) continue;
        if (['SCRIPT', 'LINK', 'STYLE', 'TEMPLATE'].includes(sibling.tagName)) continue;
        sibling.inert = true;
        inerted.push(sibling);
      }
    }
    const first = header && header.querySelector<HTMLElement>('#mobile-menu button');
    if (first) first.focus();

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        close();
        if (toggleRef.current) toggleRef.current.focus();
        return;
      }
      if (event.key !== 'Tab' || !header) return;
      const nodes = [...header.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
        (el) => el.offsetParent !== null && !el.closest('dialog') && !el.closest('[data-primary-nav]'),
      );
      if (nodes.length === 0) return;
      const firstEl = nodes[0] as HTMLElement;
      const lastEl = nodes[nodes.length - 1] as HTMLElement;
      if (event.shiftKey && document.activeElement === firstEl) {
        event.preventDefault();
        lastEl.focus();
      } else if (!event.shiftKey && document.activeElement === lastEl) {
        event.preventDefault();
        firstEl.focus();
      }
    };
    const onResize = () => {
      if (window.matchMedia('(min-width: 1080px)').matches) close();
    };
    document.addEventListener('keydown', onKey);
    window.addEventListener('resize', onResize);
    return () => {
      inerted.forEach((el) => {
        el.inert = false;
      });
      root.classList.remove('is-scroll-locked');
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', onResize);
    };
  }, [open, close, headerRef, toggleRef]);
}

interface NavMobileDrawerProps {
  open: boolean;
  close: () => void;
  baseId: string;
  pathname: string | null;
  headerRef: RefObject<HTMLElement | null>;
  toggleRef: RefObject<HTMLButtonElement | null>;
  onNavigate: (menu: string, item: string) => void;
  onSearch: () => void;
}

/** Mobile sheet (below 1080px): accordion groups + pinned CTA and search. */
export function NavMobileDrawer({ open, close, baseId, pathname, headerRef, toggleRef, onNavigate, onSearch }: NavMobileDrawerProps) {
  const [group, setGroup] = useState<string | null>(null);
  useDrawerBehavior(open, close, headerRef, toggleRef);
  const activeId = activeMenuId(pathname);

  return (
    <div id="mobile-menu" role="dialog" aria-modal="true" aria-label="Site menu" className={cx(s.mobileMenu, 'mood-dark')} hidden={!open}>
      <nav aria-label="Mobile" className={s.mobileNav}>
        <ul className={s.mobileList}>
          {NAV_MENU.map((menu) => {
            const expanded = group === menu.id;
            const regionId = `${baseId}-m-${menu.id}`;
            return (
              <li key={menu.id} className={s.mobileItem} data-open={expanded ? 'true' : 'false'}>
                <button type="button" className={s.mobileGroup} aria-expanded={expanded} aria-controls={regionId} data-current={activeId === menu.id ? 'true' : undefined} onClick={() => setGroup(expanded ? null : menu.id)}>
                  <span>{menu.label}</span>
                  <ChevronDown aria-hidden="true" />
                </button>
                <div id={regionId} className={s.mobilePanel} hidden={!expanded}>
                  {menu.groups.map((g) => (
                    <div key={g.id} className={s.mobileSub}>
                      <p className={s.mobileSubTitle}>{g.title}</p>
                      <ul>
                        {g.links.map((link) => (
                          <li key={link.href}>
                            <IntentLink
                              href={link.href}
                              className={s.mobileLink}
                              aria-current={linkCurrent(pathname, link.href)}
                              onClick={() => onNavigate(`mobile-${menu.id}`, itemId(link.href))}
                            >
                              {link.label}
                              <ArrowUpRight aria-hidden="true" />
                            </IntentLink>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                  {menu.feature && menu.feature.links && menu.feature.links.length ? (
                    <div className={s.mobileSub}>
                      <p className={s.mobileSubTitle}>Featured</p>
                      <ul>
                        {menu.feature.links.map((l) => (
                          <li key={l.href}>
                            <IntentLink href={l.href} className={s.mobileLink} onClick={() => onNavigate(`mobile-${menu.id}`, itemId(l.href))}>
                              {l.label}
                              <ArrowUpRight aria-hidden="true" />
                            </IntentLink>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      </nav>
      <div className={s.mobileFoot}>
        <Button href={PRIMARY_CTA.href} size="lg" block arrow aria-current={ctaIsCurrent(pathname, PRIMARY_CTA.href) ? 'page' : undefined} onClick={() => onNavigate('mobile', 'cta')}>
          {PRIMARY_CTA.label}
        </Button>
        <Button variant="onDark" size="lg" block icon={<Search aria-hidden="true" />} onClick={onSearch}>
          Search the catalog
        </Button>
        <p className={s.mobileNote}>{SITE_TAGLINE}</p>
      </div>
    </div>
  );
}
