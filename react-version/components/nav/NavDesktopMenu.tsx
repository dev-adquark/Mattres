'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent, type RefObject } from 'react';
import { ArrowRight, ArrowUpRight, ChevronDown } from 'lucide-react';
import { NAV_MENU } from '@/lib/site';
import { IntentLink } from '@/components/ui/IntentLink';
import { cx } from '@/components/ui/cx';
import type { NavFeature } from '@/lib/types';
import { itemId, linkCurrent, menuIsCurrent, type CategoryCounts } from './navPaths';
import { nav as s } from '@/components/ui/systemStyles';

const HOVER_OPEN_MS = 150;
const HOVER_CLOSE_MS = 220;

export interface MegaMenu {
  panel: string | null;
  openPanel: (id: string) => void;
  closePanel: (focusTrigger?: boolean) => void;
  dismiss: () => void;
  triggerRefs: RefObject<Record<string, HTMLButtonElement | null>>;
  onHeaderEnter: () => void;
  onHeaderLeave: (e: ReactPointerEvent) => void;
  onTriggerEnter: (id: string) => (e: ReactPointerEvent) => void;
  onTriggerLeave: (e: ReactPointerEvent) => void;
}

/**
 * Desktop mega-menu disclosure state: hover intent (mouse only, 150ms open /
 * 220ms close), Esc returns focus to the trigger, and the panel closes on an
 * outside pointer-down or when focus moves outside the open item (its
 * trigger + panel).
 */
export function useMegaMenu(headerRef: RefObject<HTMLElement | null>, onOpen: () => void): MegaMenu {
  const [panel, setPanel] = useState<string | null>(null);
  const triggerRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const timers = useRef<{ open: ReturnType<typeof setTimeout> | undefined; close: ReturnType<typeof setTimeout> | undefined }>({ open: undefined, close: undefined });

  const clearTimers = () => {
    clearTimeout(timers.current.open);
    clearTimeout(timers.current.close);
  };

  const openPanel = useCallback(
    (id: string) => {
      clearTimers();
      setPanel(id);
      onOpen();
    },
    [onOpen],
  );

  const closePanel = useCallback(
    (focusTrigger = false) => {
      clearTimers();
      if (focusTrigger && panel) triggerRefs.current[panel]?.focus();
      setPanel(null);
    },
    [panel],
  );

  const dismiss = useCallback(() => {
    clearTimers();
    setPanel(null);
  }, []);

  useEffect(() => {
    if (!panel) return undefined;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        closePanel(true);
      }
    };
    const onPointer = (e: Event) => {
      if (headerRef.current && !headerRef.current.contains(e.target as Node)) closePanel();
    };
    // Tab past the panel's last link (to the next trigger, search, CTA) or
    // anywhere outside the header closes it.
    const onFocus = (e: Event) => {
      const item = headerRef.current?.querySelector(`[data-menu-item="${panel}"]`);
      if (!item || !item.contains(e.target as Node)) closePanel();
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('focusin', onFocus);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('focusin', onFocus);
    };
  }, [panel, closePanel, headerRef]);

  useEffect(() => {
    const t = timers.current;
    return () => {
      clearTimeout(t.open);
      clearTimeout(t.close);
    };
  }, []);

  const onTriggerEnter = (id: string) => (e: ReactPointerEvent) => {
    if (e.pointerType !== 'mouse') return;
    clearTimers();
    if (panel) openPanel(id);
    else timers.current.open = setTimeout(() => openPanel(id), HOVER_OPEN_MS);
  };
  const onTriggerLeave = (e: ReactPointerEvent) => {
    if (e.pointerType === 'mouse' && !panel) clearTimeout(timers.current.open);
  };
  const onHeaderLeave = (e: ReactPointerEvent) => {
    if (e.pointerType !== 'mouse') return;
    clearTimeout(timers.current.open);
    if (panel) timers.current.close = setTimeout(() => setPanel(null), HOVER_CLOSE_MS);
  };
  const onHeaderEnter = () => clearTimeout(timers.current.close);

  return { panel, openPanel, closePanel, dismiss, triggerRefs, onHeaderEnter, onHeaderLeave, onTriggerEnter, onTriggerLeave };
}

interface FeatureCardProps {
  menuId: string;
  feature: NavFeature | null;
  /** Server-rendered still (see components/nav/navFeatureMedia.tsx). */
  media: ReactNode;
  counts: CategoryCounts | null;
  onNavigate: (menu: string, item: string) => void;
}

function FeatureCard({ menuId, feature, media, counts, onNavigate }: FeatureCardProps) {
  if (!feature) return null;
  const count = feature.categorySlug && counts ? counts[feature.categorySlug] : null;
  return (
    <IntentLink href={feature.href} className={s.megaFeature} onClick={() => onNavigate(menuId, `feature-${feature.categorySlug || 'card'}`)}>
      <span className={s.megaFeatureMedia}>
        {media}
        <span className={s.megaFeatureTag}>Illustration</span>
      </span>
      <span className={s.megaFeatureBody}>
        <span className={s.megaFeatureEyebrow}>{feature.eyebrow}</span>
        <span className={s.megaFeatureTitle}>{feature.title}</span>
        <span className={s.megaFeatureMeta}>
          {count ? <span className={s.megaFeatureCount}>{count.label}</span> : null}
          <span className={s.megaFeatureGo}>
            Explore <ArrowRight aria-hidden="true" />
          </span>
        </span>
      </span>
    </IntentLink>
  );
}

interface NavDesktopMenuProps {
  baseId: string;
  pathname: string | null;
  menu: MegaMenu;
  counts: CategoryCounts | null;
  loadCounts: () => void;
  onNavigate: (menu: string, item: string) => void;
  /** Feature stills keyed by NAV_MENU id, rendered on the server. */
  featureMedia?: Record<string, ReactNode>;
}

/**
 * Desktop primary navigation: one disclosure button per NAV_MENU entry, each
 * followed in the DOM by its mega panel (absolutely positioned under the
 * whole header). Because the panel sits inside the trigger's <li>, Tab from
 * an expanded trigger moves straight into its links and Tab off the last
 * link continues to the next trigger. ArrowDown also jumps to the first
 * link; ArrowLeft/Right move between triggers.
 */
export function NavDesktopMenu({ baseId, pathname, menu, counts, loadCounts, onNavigate, featureMedia }: NavDesktopMenuProps) {
  const { panel, openPanel, closePanel, triggerRefs, onTriggerEnter, onTriggerLeave } = menu;
  const panelId = (id: string) => `${baseId}-panel-${id}`;

  const onTriggerKeyDown = (id: string, i: number) => (e: ReactKeyboardEvent<HTMLButtonElement>) => {
    const ids = NAV_MENU.map((m) => m.id);
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      openPanel(id);
      requestAnimationFrame(() => {
        const el = document.getElementById(panelId(id));
        const first = el && el.querySelector<HTMLElement>('a[href]');
        if (first) first.focus();
      });
    } else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault();
      const next = ids[(i + (e.key === 'ArrowRight' ? 1 : -1) + ids.length) % ids.length];
      if (!next) return;
      const wasOpen = Boolean(panel);
      triggerRefs.current[next]?.focus();
      if (wasOpen) openPanel(next);
    }
  };

  return (
    <nav className={s.nav} aria-label="Primary" data-primary-nav="">
      <ul className={s.navList}>
        {NAV_MENU.map((item, i) => (
          <li key={item.id} data-menu-item={item.id}>
            <button
              ref={(el) => {
                triggerRefs.current[item.id] = el;
              }}
              type="button"
              className={s.navLink}
              aria-expanded={panel === item.id}
              aria-controls={panelId(item.id)}
              data-current={menuIsCurrent(pathname, item) ? 'true' : undefined}
              onClick={() => (panel === item.id ? closePanel() : openPanel(item.id))}
              onPointerEnter={onTriggerEnter(item.id)}
              onPointerLeave={onTriggerLeave}
              onFocus={loadCounts}
              onKeyDown={onTriggerKeyDown(item.id, i)}
            >
              {item.label}
              <ChevronDown aria-hidden="true" className={s.navChev} />
            </button>

            {/* Mega panel (disclosure pattern, not role=menu). */}
            <div id={panelId(item.id)} className={cx(s.megaPanel, 'mood-dark')} hidden={panel !== item.id} data-menu={item.id} data-mega-panel="">
              <div className={cx('container container--wide', s.megaPanelInner)}>
                <div>
                  <p className={s.megaPanelTitle}>{item.label}</p>
                  <p className={s.megaPanelIntro}>{item.intro}</p>
                  <IntentLink href={item.href} className={s.megaPanelAll} onClick={() => onNavigate(item.id, 'landing')}>
                    {item.id === 'mattresses' ? 'View all mattresses' : `Open ${item.label.toLowerCase()}`}
                    <ArrowRight aria-hidden="true" />
                  </IntentLink>
                </div>
                <div className={s.megaPanelGroups} data-count={Math.min(item.groups.length, 4)}>
                  {item.groups.map((group) => (
                    <div key={group.id}>
                      <p className={s.megaGroupTitle} id={`${panelId(item.id)}-${group.id}`}>
                        {group.title}
                      </p>
                      <ul className={s.megaGroupList} aria-labelledby={`${panelId(item.id)}-${group.id}`}>
                        {group.links.map((link) => (
                          <li key={link.href}>
                            <IntentLink href={link.href} className={s.megaLink} aria-current={linkCurrent(pathname, link.href)} onClick={() => onNavigate(item.id, itemId(link.href))}>
                              <span className={s.megaLinkLabel}>{link.label}</span>
                              {link.caption ? <span className={s.megaLinkCaption}>{link.caption}</span> : null}
                            </IntentLink>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
                {item.feature ? (
                  <div>
                    <FeatureCard menuId={item.id} feature={item.feature} media={featureMedia?.[item.id] ?? null} counts={counts} onNavigate={onNavigate} />
                    {item.feature.links && item.feature.links.length ? (
                      <ul className={s.megaFeatureLinks}>
                        {item.feature.links.map((l) => (
                          <li key={l.href}>
                            <IntentLink href={l.href} className={cx(s.megaLink, s.megaLinkInline)} onClick={() => onNavigate(item.id, itemId(l.href))}>
                              <span className={s.megaLinkLabel}>{l.label}</span>
                              <ArrowUpRight aria-hidden="true" />
                            </IntentLink>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                ) : (
                  <div className={s.megaPanelFeatureNote}>
                    <p className={s.megaNote}>
                      Match Score is deterministic: the same profile and the same data always give the same result. We don&rsquo;t lab-test mattresses, and every rating we use is
                      cited to its source.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </nav>
  );
}
