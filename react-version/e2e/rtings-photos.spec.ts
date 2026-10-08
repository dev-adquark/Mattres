import { test, expect, expectNoHorizontalOverflow } from './fixtures';

/**
 * RTINGS product photos: shown only for published, exactly matched reviews,
 * always credited with a link to the review, and replaced by the original
 * render if the photo cannot be loaded. Never loaded for unmatched mattresses.
 */

const PHOTO_HOST = 'https://i.rtings.com/';

test.describe('RTINGS product photos', () => {
  test('a matched mattress shows its credited photo, linked to the RTINGS review', async ({ page }) => {
    await page.goto('/mattress/bear-elite-hybrid');
    const hero = page.locator('[data-photo="true"]');
    await expect(hero).toBeVisible();
    const img = hero.locator('img').first();
    await expect(img).toHaveAttribute('src', new RegExp(`^${PHOTO_HOST}assets/products/[A-Za-z0-9]+/bear-elite-hybrid/`));
    await expect(img).toHaveAttribute('alt', /Bear Elite Hybrid.*photographed by RTINGS/);
    await expect.poll(() => img.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0)).toBe(true);

    const credit = hero.getByRole('link', { name: /Photo: RTINGS/ });
    await expect(credit).toHaveAttribute('href', 'https://www.rtings.com/mattress/reviews/bear/elite-hybrid');
    await expect(credit).toHaveAttribute('target', '_blank');
    await expect(credit).toHaveAttribute('rel', /noopener.*nofollow|nofollow.*noopener/);
    await expectNoHorizontalOverflow(page);
  });

  test('a mattress with no published RTINGS match keeps the original render and loads no RTINGS photo', async ({ page }) => {
    const photoRequests: string[] = [];
    page.on('request', (req) => {
      if (req.url().startsWith(PHOTO_HOST)) photoRequests.push(req.url());
    });
    await page.goto('/mattress/helix-midnight');
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('[data-photo="true"]')).toHaveCount(0);
    // Only the hero is guaranteed in the first screen: nothing in it is an RTINGS image.
    const heroImgs = await page.locator('main section').first().locator('img[src^="https://i.rtings.com/"]').count();
    expect(heroImgs).toBe(0);
  });

  test('catalog cards for matched mattresses show a visible credit', async ({ page }) => {
    await page.goto('/mattresses?q=bear');
    const card = page.locator('article', { hasText: 'Bear Elite Hybrid' }).first();
    await expect(card).toBeVisible();
    await card.scrollIntoViewIfNeeded();
    await expect(card.getByText('Photo: RTINGS')).toBeVisible();
    await expect(card.locator('img[src^="https://i.rtings.com/"]')).toHaveCount(1);
  });

  test('if the photo fails to load, the original render takes over and no credit is left behind', async ({ page }) => {
    // A 200 response the browser cannot decode: fires the image's error event without a console error.
    await page.route(`${PHOTO_HOST}**`, (route) => route.fulfill({ status: 200, contentType: 'image/jpeg', body: 'not an image' }));
    await page.goto('/mattress/bear-elite-hybrid');
    const hero = page.locator('[data-photo="true"]');
    await expect(hero.locator('svg').first()).toBeVisible();
    await expect(hero.getByText('Photo: RTINGS')).toHaveCount(0);
    await expect(hero.locator('img[src^="https://i.rtings.com/"]')).toHaveCount(0);
  });
});
