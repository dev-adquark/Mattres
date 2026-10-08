import { describe, expect, it } from 'vitest';
import { NAV_MENU, PRIMARY_CTA } from '@/lib/site';
import { activeMenuId, ctaIsCurrent, menuIsCurrent } from './navPaths';

const activeCount = (pathname: string) => NAV_MENU.filter((m) => menuIsCurrent(pathname, m)).length;

describe('header active state (single route-prefix map)', () => {
  it.each([
    ['/mattresses', 'mattresses'],
    ['/mattresses/side-sleepers', 'mattresses'],
    ['/mattress/casper-dream', 'mattresses'],
    ['/brands/casper', 'mattresses'],
    ['/compare', 'compare'],
    ['/compare/casper-dream-vs-casper-snow', 'compare'],
    ['/guides', 'guides'],
    ['/guides/how-to-choose-mattress-firmness', 'guides'],
    ['/sleep-position/side', 'guides'],
    ['/methodology', 'methodology'],
    ['/disclosures', 'methodology'],
  ])('%s -> %s', (pathname, id) => {
    expect(activeMenuId(pathname)).toBe(id);
  });

  it('maps /find-match to no menu item; the CTA carries the current state', () => {
    expect(activeMenuId('/find-match')).toBeNull();
    expect(activeCount('/find-match')).toBe(0);
    expect(ctaIsCurrent('/find-match', PRIMARY_CTA.href)).toBe(true);
    expect(ctaIsCurrent('/mattresses', PRIMARY_CTA.href)).toBe(false);
  });

  it('never marks more than one item active, including guide pages linked from the Mattresses menu', () => {
    for (const p of ['/', '/guides/how-to-choose-mattress-firmness', '/sleep-position/combination', '/find-match', '/mattresses/best', '/privacy', '/terms']) {
      expect(activeCount(p)).toBeLessThanOrEqual(1);
    }
    expect(activeMenuId('/')).toBeNull();
    expect(activeMenuId('/mattressesx')).toBeNull();
  });
});
