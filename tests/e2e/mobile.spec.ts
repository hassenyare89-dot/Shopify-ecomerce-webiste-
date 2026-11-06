import {expect, test} from '@playwright/test';

test('mobile menu drawer navigates', async ({page}) => {
  await page.goto('/');
  await page.getByRole('button', {name: 'Open menu'}).click();
  const menu = page.getByRole('dialog', {name: 'Menu'});
  await expect(menu).toBeVisible();
  await menu.getByRole('link', {name: 'New arrivals'}).click();
  await expect(page).toHaveURL(/new-arrivals/);
});

test('sticky add-to-cart bar appears after scrolling on product pages', async ({page}) => {
  await page.goto('/products/merino-crew-sweater');
  await page.evaluate(() => window.scrollTo(0, 2500));
  const bar = page.getByTestId('sticky-atc');
  await expect(bar).toHaveAttribute('aria-hidden', 'false');
  await expect(bar.getByRole('button', {name: 'Add to cart'})).toBeInViewport();
});

test('mobile filters open in a drawer', async ({page}) => {
  await page.goto('/collections/apparel');
  await page.getByRole('button', {name: /^Filters/}).click();
  await expect(page.getByRole('dialog', {name: 'Filters'})).toBeVisible();
});

test('no horizontal overflow on key pages', async ({page}) => {
  for (const path of ['/', '/collections/apparel', '/products/linen-overshirt', '/cart']) {
    await page.goto(path);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, path).toBeLessThanOrEqual(1);
  }
});
