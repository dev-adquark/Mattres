import type { Page } from '@playwright/test';
import { test, expect, isMobile, isReduced, expectNoHorizontalOverflow, tabTo, focusedText } from './fixtures';

/**
 * The core journey, end to end, in every project:
 * Home -> Find My Match -> quiz (keyboard on desktop, touch on mobile) ->
 * reveal (score equals POST /api/match) -> results -> compare 2 via toggles ->
 * product -> X-ray layer (keyboard) -> tray "Compare 2" -> /compare
 * "Best for you" -> guide (reading progress).
 */

interface MatchJson {
  results: { entry: { id: string }; result: { overallScore: number } }[];
}

const isNamedInput = (page: Page, name: string) => () =>
  page.evaluate((n) => {
    const el = document.activeElement as HTMLInputElement | null;
    return !!el && el.tagName === 'INPUT' && el.name === n;
  }, name);
const isRange = (page: Page) => () =>
  page.evaluate(() => {
    const el = document.activeElement as HTMLInputElement | null;
    return !!el && el.tagName === 'INPUT' && el.type === 'range';
  });
const isSubmit = (page: Page) => () =>
  page.evaluate(() => {
    const el = document.activeElement as HTMLButtonElement | null;
    return !!el && el.tagName === 'BUTTON' && el.type === 'submit';
  });

async function nextStepByKeyboard(page: Page, expectedStep: string) {
  await tabTo(page, isSubmit(page));
  await page.keyboard.press('Enter');
  await expect(page.getByText(new RegExp(`Step ${expectedStep} of 5 ·`))).toBeVisible();
}

async function answerQuizByKeyboard(page: Page) {
  // Step 1: sleep position. Tab into the radio group, Space selects.
  await tabTo(page, isNamedInput(page, 'position'), 80);
  await page.keyboard.press('Space');
  await expect(page.locator('input[name="position"]:checked')).toHaveCount(1);
  await nextStepByKeyboard(page, '2');

  // Step 2: weight band. Arrow keys move and select within the group.
  await tabTo(page, isNamedInput(page, 'weightBand'));
  await page.keyboard.press('Space');
  await page.keyboard.press('ArrowDown');
  await expect(page.locator('input[name="weightBand"]:checked')).toHaveCount(1);
  await nextStepByKeyboard(page, '3');

  // Step 3: firmness slider by arrow keys.
  await tabTo(page, isRange(page));
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('input[type="range"]').first()).toHaveAttribute('aria-valuetext', /\S/);
  await expect(page.locator('input[type="range"]').first()).not.toHaveAttribute('aria-valuetext', 'Not set yet');
  await nextStepByKeyboard(page, '4');

  // Step 4: sleep temperature.
  await tabTo(page, isNamedInput(page, 'temperature'));
  await page.keyboard.press('Space');
  await expect(page.locator('input[name="temperature"]:checked')).toHaveCount(1);
  await nextStepByKeyboard(page, '5');

  // Step 5: priorities are optional; submit.
  await tabTo(page, isSubmit(page));
  expect(await focusedText(page)).toContain('See my matches');
}

async function answerQuizByTouch(page: Page) {
  const next = page.getByRole('button', { name: /^Next/ });
  await page.locator('label', { has: page.locator('input[name="position"][value="side"]') }).tap();
  await next.tap();
  await page.locator('label', { has: page.locator('input[name="weightBand"]') }).nth(1).tap();
  await next.tap();
  // Firmness: tap a scale label (the visual ticks are pointer shortcuts).
  await page.getByRole('slider').first().focus();
  await page.keyboard.press('ArrowRight');
  await next.tap();
  await page.locator('label', { has: page.locator('input[name="temperature"]') }).first().tap();
  await next.tap();
  await expect(page.getByText(/Step 5 of 5 ·/)).toBeVisible();
}

test('core journey: home to match, product, compare and guide', async ({ page }, info) => {
  test.setTimeout(180_000);
  const mobile = isMobile(info);
  const reduced = isReduced(info);

  // Home -> Find My Match.
  await page.goto('/');
  await expect(page.locator('h1').first()).toBeVisible();
  await expectNoHorizontalOverflow(page);
  const cta = page.getByRole('link', { name: /Find My Match/ }).first();
  await expect(cta).toBeVisible();
  if (mobile) await cta.tap();
  else await cta.click();
  await page.waitForURL('**/find-match');
  await expect(page.getByText(/Step 1 of 5 ·/)).toBeVisible();
  await expectNoHorizontalOverflow(page);

  // Quiz.
  if (mobile) await answerQuizByTouch(page);
  else await answerQuizByKeyboard(page);

  const matchResponse = page.waitForResponse((r) => r.url().endsWith('/api/match') && r.request().method() === 'POST');
  if (mobile) await page.getByRole('button', { name: /See my matches/ }).tap();
  else await page.keyboard.press('Enter');
  const res = await matchResponse;
  expect(res.status()).toBe(200);
  const body = (await res.json()) as MatchJson;
  expect(body.results.length).toBeGreaterThan(0);
  const top = body.results[0]!;

  // Reveal: the score shown is the engine's score, nothing else.
  const title = page.locator('#match-title');
  await expect(title).toBeVisible({ timeout: 15_000 });
  await expect(title).toContainText(`scoring ${top.result.overallScore} out of 100`);
  if (!reduced) {
    const skip = page.getByRole('button', { name: 'Skip intro' });
    if (await skip.isVisible().catch(() => false)) await page.keyboard.press('Escape');
  }
  const numeral = page.locator('section[aria-labelledby="match-title"] [class*="numeral"]');
  await expect(numeral).toHaveText(String(top.result.overallScore));
  await expectNoHorizontalOverflow(page, 'reveal');

  // Results: compare two via toggles (top match + first of the rest).
  const topToggle = page.locator('section[aria-labelledby="match-title"]').getByRole('button', { pressed: false, name: /^Compare/ });
  await topToggle.click();
  await expect(page.locator('section[aria-labelledby="match-title"]').getByRole('button', { pressed: true, name: /^Compare / })).toHaveCount(1);

  const seeAll = page.getByRole('button', { name: /See all \d+ matches/ });
  if (await seeAll.count()) await seeAll.click();
  const ranking = page.locator('#ranking-title');
  await expect(ranking).toBeVisible();
  // Scope to real compare toggles (data-compare-id): Playwright treats any button without aria-pressed
  // as pressed=false, so a bare role query would also match the "Compare my top 3" action.
  const secondToggle = page.locator('main button[data-compare-id][aria-pressed="false"]').first();
  await secondToggle.scrollIntoViewIfNeeded();
  await secondToggle.click();
  const tray = page.getByRole('complementary', { name: 'Compare selection' });
  await expect(tray).toBeVisible();
  await expect(tray.getByRole('link', { name: /Compare 2/ })).toBeVisible();
  await expectNoHorizontalOverflow(page, 'results');

  // Product page for the top match.
  await page.goto(`/mattress/${encodeURIComponent(top.entry.id)}`);
  await expect(page.locator('h1').first()).toBeVisible();
  await expectNoHorizontalOverflow(page, 'product');

  // X-ray: choose a layer with the keyboard.
  const layers = page.getByRole('group', { name: 'Select a layer' });
  await layers.scrollIntoViewIfNeeded();
  const firstLayer = layers.getByRole('button').first();
  await firstLayer.focus();
  await page.keyboard.press('ArrowRight');
  const second = layers.getByRole('button').nth(1);
  await expect(second).toBeFocused();
  await expect(second).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByText(/Layer 02 of 0\d/)).toBeVisible();
  // The product inspector always keeps one layer selected, so Escape leaves layer 02 in place.
  await page.keyboard.press('Escape');
  await expect(second).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByText(/Layer 02 of 0\d/)).toBeVisible();

  // Tray "Compare 2" -> /compare with the verdict.
  const trayLink = tray.getByRole('link', { name: /Compare 2/ });
  await expect(trayLink).toBeVisible();
  if (mobile) await trayLink.tap();
  else await trayLink.click();
  await page.waitForURL(/\/compare/);
  const verdict = page.locator('section[aria-labelledby="verdict-title"]');
  await expect(verdict.getByText('Best for you', { exact: true })).toBeVisible({ timeout: 15_000 });
  await expect(verdict).not.toHaveAttribute('aria-busy', 'true');
  await expect(page.locator('#verdict-title')).not.toHaveText(/Add one more|Scoring your finalists/);
  // The verdict is the engine's: its score is one this profile actually got.
  const verdictText = (await verdict.innerText()) + (await verdict.locator('.sr-only').allTextContents()).join(' ');
  const scoreMatch = verdictText.match(/Match score (\d+) out of 100/);
  if (scoreMatch) {
    const engineScores = new Set(body.results.map((r) => r.result.overallScore));
    expect(engineScores.has(Number(scoreMatch[1]))).toBe(true);
  } else {
    // A tie is the only other outcome with a profile present.
    await expect(verdict).toContainText(/tie|tied/i);
  }
  await expectNoHorizontalOverflow(page, 'compare');

  // Guide with a reading-progress bar that moves on scroll.
  await page.goto('/guides/how-to-choose-mattress-firmness');
  await expect(page.locator('#guide-article')).toBeAttached();
  const bar = page.locator('[class*="ScrollProgress"] span').first();
  await expect(bar).toBeAttached();
  // Scroll inside the poll: a scroll issued before hydration can be reset to
  // the top by the router, so re-issue it until the bar reflects it.
  const article = page.locator('#guide-article');
  await expect
    .poll(async () => {
      await article.evaluate((el) =>
        window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY + el.clientHeight / 2, behavior: 'instant' }),
      );
      return bar.evaluate((el) => Number((el as HTMLElement).style.transform.match(/scaleX\(([\d.]+)\)/)?.[1] ?? 0));
    })
    .toBeGreaterThan(0);
  await expectNoHorizontalOverflow(page, 'guide');
});
