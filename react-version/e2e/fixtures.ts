import { test as base, expect, type Page, type TestInfo } from '@playwright/test';

/**
 * Shared fixture: every test collects console errors and uncaught page
 * errors and fails if any were seen ("no console errors per page").
 * Nothing is filtered: Vercel Analytics is only rendered on Vercel, so a
 * local `next start` should be completely clean.
 */
export interface PageErrors {
  list: string[];
}

export const test = base.extend<{ pageErrors: PageErrors }>({
  pageErrors: [
    async ({ page }, use) => {
      const errors: PageErrors = { list: [] };
      page.on('console', (msg) => {
        if (msg.type() === 'error') errors.list.push(`[console] ${page.url()} :: ${msg.text()}`);
      });
      page.on('pageerror', (err) => {
        errors.list.push(`[pageerror] ${page.url()} :: ${err.message}`);
      });
      await use(errors);
      expect(errors.list, 'console / page errors').toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };

export const isMobile = (info: TestInfo) => info.project.name === 'mobile';
export const isReduced = (info: TestInfo) => info.project.name === 'reduced-motion';

/** Fails when the document is wider than the viewport (horizontal overflow). */
export async function expectNoHorizontalOverflow(page: Page, label = page.url()) {
  const { scroll, client, offenders } = await page.evaluate(() => {
    const doc = document.documentElement;
    const vw = doc.clientWidth;
    const out: string[] = [];
    if (doc.scrollWidth > vw + 1) {
      for (const el of Array.from(document.body.querySelectorAll<HTMLElement>('*'))) {
        const r = el.getBoundingClientRect();
        if (r.width > 0 && r.right > vw + 1 && getComputedStyle(el).position !== 'fixed') {
          out.push(`${el.tagName.toLowerCase()}.${String(el.className).slice(0, 60)} right=${Math.round(r.right)}`);
          if (out.length >= 5) break;
        }
      }
    }
    return { scroll: doc.scrollWidth, client: vw, offenders: out };
  });
  expect(scroll, `horizontal overflow on ${label}: ${offenders.join(' | ')}`).toBeLessThanOrEqual(client + 1);
}

/** Press Tab until `locator`'s element has focus (keyboard-only reach). */
export async function tabTo(page: Page, matches: () => boolean | Promise<boolean>, max = 60) {
  for (let i = 0; i < max; i += 1) {
    if (await matches()) return;
    await page.keyboard.press('Tab');
  }
  throw new Error('tabTo: target never received focus');
}

/** The accessible name / text of the focused element. */
export function focusedText(page: Page) {
  return page.evaluate(() => {
    const el = document.activeElement as HTMLElement | null;
    if (!el) return '';
    return `${el.getAttribute('aria-label') || ''} ${el.textContent || ''}`.replace(/\s+/g, ' ').trim();
  });
}
