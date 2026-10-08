import type { Page } from '@playwright/test';
import catalog from '../lib/data/mattress-catalog.json' with { type: 'json' };
import { test, expect, isMobile, expectNoHorizontalOverflow, tabTo } from './fixtures';

const CATALOG_IDS: string[] = (catalog as unknown as { id: string }[]).map((m) => m.id);

/** Public routes swept for console errors and (at 390px) horizontal overflow. */
const ROUTES = [
  '/',
  '/find-match',
  '/mattresses',
  '/mattresses/best',
  '/mattresses/side-sleepers',
  '/mattress/helix-midnight',
  '/mattress/novaform-comfortgrande-plus',
  '/brands',
  '/compare',
  '/compare/pressure-relief-for-side-sleepers',
  '/guides',
  '/guides/how-to-choose-mattress-firmness',
  '/sleep-position/side',
  '/methodology',
  '/faq',
  '/disclosures',
  '/privacy',
  '/terms',
];

async function openSearch(page: Page) {
  await page.locator('body').click({ position: { x: 5, y: 300 } }).catch(() => {});
  await page.keyboard.press('ControlOrMeta+k');
  const dialog = page.getByRole('dialog', { name: 'Search the site' });
  await expect(dialog).toBeVisible();
  const box = dialog.getByRole('combobox');
  await expect(box).toBeFocused();
  return { dialog, box };
}

test.describe('search', () => {
  test('Ctrl/Cmd+K finds a mattress, a brand, a guide and a category', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1').first()).toBeVisible();
    const { dialog, box } = await openSearch(page);
    const groupOf = (name: string) => dialog.getByRole('group', { name });

    await box.fill('helix midnight');
    await expect(groupOf('Mattresses').getByRole('option', { name: /Helix Midnight/ }).first()).toBeVisible();

    await box.fill('saatva');
    await expect(groupOf('Brands').getByRole('option', { name: /Saatva/ }).first()).toBeVisible();

    await box.fill('firmness');
    await expect(groupOf('Guides').getByRole('option', { name: /How to choose mattress firmness/ })).toBeVisible();

    await box.fill('side sleepers');
    await expect(groupOf('Categories').getByRole('option', { name: /Mattresses for side sleepers/ }).first()).toBeVisible();

    // Keyboard selection navigates.
    await box.fill('helix midnight');
    const first = dialog.getByRole('option').first();
    await expect(first).toHaveAttribute('aria-selected', 'true');
    await expect(first).toContainText('Helix Midnight');
    await page.keyboard.press('Enter');
    await page.waitForURL('**/mattress/helix-midnight');
    await expect(dialog).toBeHidden();

    // A brand name leads with the brand, so Enter opens the brand page.
    const again = await openSearch(page);
    await again.box.fill('purple');
    const lead = again.dialog.getByRole('option').first();
    await expect(lead).toHaveAttribute('aria-selected', 'true');
    await expect(lead).toHaveAttribute('data-kind', 'brand');
    await expect(lead).toContainText('Purple');
    await page.keyboard.press('Enter');
    await page.waitForURL('**/brands/purple');

    // Escape closes.
    await openSearch(page);
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog', { name: 'Search the site' })).toBeHidden();
  });
});

test.describe('outbound CTAs', () => {
  async function checkPage(page: Page, path: string) {
    await page.goto(path);
    await expect(page.locator('h1').first()).toBeVisible();
    const report = await page.evaluate(() => {
      const problems: string[] = [];
      const here = location.host;
      for (const a of Array.from(document.querySelectorAll<HTMLAnchorElement>('a[href]'))) {
        const url = new URL(a.href, location.href);
        const external = /^https?:$/.test(url.protocol) && url.host !== here;
        const rel = (a.getAttribute('rel') || '').split(/\s+/);
        if (a.target === '_blank' && !(rel.includes('noopener') && rel.includes('noreferrer'))) problems.push(`blank without noopener noreferrer: ${a.href}`);
        if (external && a.target !== '_blank') problems.push(`external link not in a new tab: ${a.href}`);
        if (external && !rel.includes('nofollow') && !rel.includes('sponsored')) problems.push(`external without nofollow/sponsored: ${a.href}`);
      }
      const kinds: string[] = [];
      for (const wrap of Array.from(document.querySelectorAll<HTMLElement>('[data-cta-kind]'))) {
        const kind = wrap.dataset.ctaKind || '';
        kinds.push(kind);
        const link = wrap.querySelector('a');
        if (kind === 'unavailable') {
          if (link || wrap.querySelector('button') || wrap.closest('a, button')) problems.push('unavailable CTA is interactive');
        } else {
          if (!link) {
            problems.push(`${kind} CTA has no link`);
            continue;
          }
          const rel = (link.getAttribute('rel') || '').split(/\s+/);
          if (link.target !== '_blank') problems.push(`${kind} CTA not target=_blank`);
          if (kind === 'affiliate' && !rel.includes('sponsored')) problems.push('affiliate CTA without rel=sponsored');
          if (kind !== 'affiliate' && (rel.includes('sponsored') || !rel.includes('nofollow'))) problems.push(`${kind} CTA rel wrong: ${rel.join(' ')}`);
          if (kind === 'affiliate' && !/Affiliate link/i.test(wrap.textContent || '')) problems.push('affiliate CTA without disclosure');
        }
      }
      // Missing data ("Not yet verified", "Data unavailable", "Link coming soon") is never interactive.
      for (const el of Array.from(document.querySelectorAll<HTMLElement>('[data-missing]'))) {
        if (el.closest('a, button') || el.querySelector('a, button') || el.tabIndex >= 0) problems.push(`missing-data marker is interactive: ${el.textContent}`);
      }
      return { problems, kinds };
    });
    expect(report.problems, path).toEqual([]);
    return report.kinds;
  }

  test('rel/target correctness on product pages; unavailable states are inert', async ({ page }, info) => {
    test.setTimeout(240_000);
    const ids = info.project.name === 'desktop' ? CATALOG_IDS : CATALOG_IDS.slice(0, 3);
    const kinds = new Set<string>();
    for (const id of ids) for (const k of await checkPage(page, `/mattress/${encodeURIComponent(id)}`)) kinds.add(k);
    expect(kinds.size).toBeGreaterThan(0);
    await checkPage(page, '/mattresses');
    await checkPage(page, '/brands');
  });
});

test.describe('navigation', () => {
  test('mega-nav is keyboard operable (desktop) / menu sheet (mobile)', async ({ page }, info) => {
    await page.goto('/');
    await expect(page.locator('h1').first()).toBeVisible();
    const primary = page.getByRole('navigation', { name: 'Primary' });

    if (isMobile(info)) {
      const toggle = page.getByRole('button', { name: 'Open menu' });
      await toggle.tap();
      const mobileNav = page.getByRole('navigation', { name: 'Mobile' });
      await expect(mobileNav).toBeVisible();
      const group = mobileNav.getByRole('button').first();
      await group.tap();
      await expect(group).toHaveAttribute('aria-expanded', 'true');
      await expect(mobileNav.getByRole('link').first()).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(mobileNav).toBeHidden();
      await expect(page.getByRole('button', { name: 'Open menu' })).toBeFocused();
      return;
    }

    const triggers = primary.getByRole('button');
    const first = triggers.first();
    const second = triggers.nth(1);
    await tabTo(page, () => first.evaluate((el) => el === document.activeElement));

    // Enter opens the disclosure panel; Escape closes it and returns focus.
    await page.keyboard.press('Enter');
    await expect(first).toHaveAttribute('aria-expanded', 'true');
    const panelId = await first.getAttribute('aria-controls');
    const panel = page.locator(`[id="${panelId}"]`);
    await expect(panel).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(first).toHaveAttribute('aria-expanded', 'false');
    await expect(panel).toBeHidden();
    await expect(first).toBeFocused();

    // Arrow keys move between triggers; ArrowDown opens and focuses the first link.
    await page.keyboard.press('ArrowRight');
    await expect(second).toBeFocused();
    await page.keyboard.press('ArrowDown');
    await expect(second).toHaveAttribute('aria-expanded', 'true');
    const panel2 = page.locator(`[id="${await second.getAttribute('aria-controls')}"]`);
    await expect(panel2.locator('a[href]').first()).toBeFocused();
    const href = await panel2.locator('a[href]').first().getAttribute('href');
    await page.keyboard.press('Enter');
    await page.waitForURL((u) => u.pathname + u.hash === href || u.pathname === href?.split('#')[0]);
  });

  test('carousel moves by keyboard and by its buttons', async ({ page }) => {
    await page.goto('/');
    const carousel = page.locator('section[aria-roledescription="carousel"][aria-label="Discover by how you sleep"]');
    await carousel.scrollIntoViewIfNeeded();
    const slides = carousel.locator('[aria-roledescription="slide"]');
    expect(await slides.count()).toBeGreaterThan(2);

    // Keyboard: arrow from the first slide's link focuses the second slide's link.
    await slides.nth(0).locator('a').first().focus();
    await page.keyboard.press('ArrowRight');
    await expect(slides.nth(1).locator('a').first()).toBeFocused();
    await expect(slides.nth(1)).toHaveAttribute('data-active', 'true');
    await page.keyboard.press('Home');
    await expect(slides.nth(0).locator('a').first()).toBeFocused();
    await expect(slides.nth(0)).toHaveAttribute('data-active', 'true');

    // Buttons.
    const next = carousel.getByRole('button', { name: 'Next slide' });
    const prev = carousel.getByRole('button', { name: 'Previous slide' });
    await expect(prev).toBeDisabled();
    await next.click();
    await expect(slides.nth(1)).toHaveAttribute('data-active', 'true');
    await expect(prev).toBeEnabled();
    await prev.click();
    await expect(slides.nth(0)).toHaveAttribute('data-active', 'true');
  });
});

test.describe('page health', () => {
  for (const route of ROUTES) {
    test(`${route} renders cleanly (no console errors; no overflow at 390)`, async ({ page }, info) => {
      const res = await page.goto(route);
      expect(res?.status(), route).toBeLessThan(400);
      await expect(page.locator('h1').first()).toBeVisible();
      // Deterministic settle instead of 'networkidle': below-the-fold
      // loading="lazy" card images can sit in Chromium's deferred-fetch queue
      // without ever resolving in a headless run, so idleness never arrives.
      // The load event (scripts executed, hydration started) plus fonts plus
      // every already-started image is what this health check needs.
      await page.waitForLoadState('load');
      await page.evaluate(async () => {
        await document.fonts.ready;
        const eager = [...document.images].filter((img) => img.loading !== 'lazy' && !img.complete);
        await Promise.race([
          Promise.all(eager.map((img) => new Promise((r) => { img.addEventListener('load', r, { once: true }); img.addEventListener('error', r, { once: true }); }))),
          new Promise((r) => setTimeout(r, 10_000)),
        ]);
      });
      if (isMobile(info)) {
        await expectNoHorizontalOverflow(page, route);
        // Scroll through so lazy/reveal content is laid out too.
        await page.evaluate(async () => {
          for (let y = 0; y < document.documentElement.scrollHeight; y += 700) {
            window.scrollTo(0, y);
            await new Promise((r) => setTimeout(r, 40));
          }
        });
        await expectNoHorizontalOverflow(page, `${route} (scrolled)`);
      }
    });
  }
});
