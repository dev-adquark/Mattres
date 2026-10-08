import { test, expect } from './fixtures';
import type { Page } from '@playwright/test';

/**
 * Compare column headers must stay legible at every desktop/tablet width:
 * the product name never overlaps the Match Score ring or the "No profile"
 * status. The risky band is about 900-1180px with three or more columns,
 * where the header stacks the score under the name (container query in
 * components/compare-page/Compare.module.css). Runs only in the desktop
 * project (see testIgnore in playwright.config.ts).
 */
const IDS = 'purple-restore,avocado-green-mattress,helix-midnight-luxe';
const PROFILE = { sleepPosition: 'side', weightLb: 160, preferredFirmnessLabel: 'medium', sleepTemperature: 'neutral' };
const WIDTHS = [820, 900, 960, 1024, 1100, 1180, 1280, 1440];

type Box = { x: number; y: number; width: number; height: number };
const overlaps = (a: Box, b: Box) => a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

async function headerBoxes(page: Page) {
  return page.evaluate(() =>
    Array.from(document.querySelectorAll('thead th[data-col]')).map((th) => {
      const r = (el: Element | null) => {
        if (!el) return null;
        const b = el.getBoundingClientRect();
        return b.width && b.height ? { x: b.x, y: b.y, width: b.width, height: b.height } : null;
      };
      const name = th.querySelector('a[href^="/mattress/"]');
      const range = document.createRange();
      if (name) range.selectNodeContents(name);
      const text = name ? range.getBoundingClientRect() : null;
      const score = th.querySelector('[class*="colScore"]');
      return {
        th: r(th),
        name: text && text.width ? { x: text.x, y: text.y, width: text.width, height: text.height } : null,
        score: r(score && (score.firstElementChild || score)),
      };
    }),
  );
}

for (const withProfile of [false, true]) {
  test(`compare headers never collide (${withProfile ? 'profile' : 'no profile'})`, async ({ page }, info) => {
    if (withProfile) {
      await page.addInitScript((profile) => {
        sessionStorage.setItem('mms_last_result', JSON.stringify({ profile }));
      }, PROFILE);
    }
    for (const width of WIDTHS) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(`/compare?ids=${IDS}`);
      await expect(page.locator('thead th[data-col]')).toHaveCount(3);
      if (withProfile) await expect(page.locator('thead th[data-col] [class*="colScore"] svg').first()).toBeVisible();
      else await expect(page.locator('thead th[data-col]').first()).toContainText('No profile');
      const heads = await headerBoxes(page);
      for (const h of heads) {
        expect(h.name, `name visible at ${width}`).not.toBeNull();
        expect(h.score, `score/status visible at ${width}`).not.toBeNull();
        expect(overlaps(h.name!, h.score!), `name overlaps score at ${width}px`).toBe(false);
        // Both stay inside their own column.
        expect(h.name!.x + h.name!.width, `name inside column at ${width}px`).toBeLessThanOrEqual(h.th!.x + h.th!.width + 0.5);
        expect(h.score!.x + h.score!.width, `score inside column at ${width}px`).toBeLessThanOrEqual(h.th!.x + h.th!.width + 0.5);
      }
      if (width === 1024) {
        await page.locator('thead').screenshot({ path: info.outputPath(`compare-head-1024-${withProfile ? 'profile' : 'none'}.png`) });
      }
    }
  });
}
