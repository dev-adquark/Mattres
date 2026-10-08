import type { Page } from '@playwright/test';
import { test, expect } from './fixtures';

/**
 * Data integrity of the product hero Match Score: the big numeral must
 * always be the engine score its accessible name reports - for every
 * reference position and for the visitor's own result - including under
 * prefers-reduced-motion, where the ring skips its count-up animation.
 */

const heroRing = (page: Page) => page.locator('[class*="heroScore"] .score-ring').first();

async function expectNumeralMatchesLabel(page: Page) {
  const ring = heroRing(page);
  await expect
    .poll(async () => {
      const { label, num } = await ring.evaluate((el) => ({
        label: el.getAttribute('aria-label') || '',
        num: el.querySelector('[class*="number"]')?.textContent || '',
      }));
      return label.match(/ (\d+) out of 100/)?.[1] === num ? num : `numeral ${num} vs label "${label}"`;
    })
    .toMatch(/^\d+$/);
  return ring.evaluate((el) => Number(el.getAttribute('aria-label')?.match(/ (\d+) out of 100/)?.[1]));
}

const chip = (page: Page, text: string) => page.locator('[class*="heroScore"] [role="group"] button', { hasText: new RegExp(`^${text}$`) });

/** Click a position chip until it reports pressed (a click before hydration is not handled). */
async function choose(page: Page, text: string) {
  await expect(async () => {
    await chip(page, text).click();
    await expect(chip(page, text)).toHaveAttribute('aria-pressed', 'true', { timeout: 1_000 });
  }).toPass({ timeout: 15_000 });
}

test('hero numeral follows the selected sleeper and the personal result (reduced motion)', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/mattress/casper-the-one');
  await expectNumeralMatchesLabel(page);

  const seen = new Set<number>();
  for (const pos of ['Side', 'Back', 'Stomach', 'Combo']) {
    await choose(page, pos);
    seen.add(await expectNumeralMatchesLabel(page));
  }
  // Casper The One scores differently by position, so a stale numeral would show.
  expect(seen.size).toBeGreaterThan(1);

  // The visitor's own engine result (POST /api/match, stored as the quiz does).
  const engineScore = await page.evaluate(async () => {
    const profile = { sleepPosition: 'side', weightLb: 180, preferredFirmnessLabel: 'medium', sleepTemperature: 'hot' };
    const res = await fetch('/api/match', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(profile) });
    const body = (await res.json()) as { results: { entry: { id: string }; result: { overallScore: number } }[] };
    sessionStorage.setItem('mms_last_result', JSON.stringify({ ...body, profile }));
    return body.results.find((r) => r.entry.id === 'casper-the-one')?.result.overallScore ?? null;
  });
  expect(engineScore).not.toBeNull();
  await page.reload();
  await expect(chip(page, 'You')).toHaveAttribute('aria-pressed', 'true');
  expect(await expectNumeralMatchesLabel(page)).toBe(engineScore);
  await expect(page.locator('[class*="heroScore"] a[href="#score"]')).toContainText(`See why it scores ${engineScore}`);

  await choose(page, 'Side');
  await expectNumeralMatchesLabel(page);
});
