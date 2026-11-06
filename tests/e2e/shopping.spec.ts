/**
 * End-to-end shopping journey against the mock Storefront API:
 * browse → product → variant → add to cart → update → discount → remove →
 * checkout handoff. (A real Shopify test-mode purchase must be done manually
 * against a development store — see docs/TESTING.md.)
 */
import {expect, test} from '@playwright/test';
import {AxeBuilder} from '@axe-core/playwright';

test.describe.configure({mode: 'serial'});

async function addOvershirtToCart(page: import('@playwright/test').Page) {
  await page.goto('/products/linen-overshirt');
  await page.getByRole('button', {name: /Size: M$/}).click();
  await expect(page).toHaveURL(/Size=M/);
  await page.getByRole('button', {name: 'Add to cart', exact: true}).first().click();
  const drawer = page.getByRole('dialog', {name: 'Your cart'});
  await expect(drawer).toBeVisible();
  await expect(drawer.getByText('Linen Overshirt')).toBeVisible();
  return drawer;
}

test('browse a collection and open a product', async ({page}) => {
  await page.goto('/');
  await expect(page.getByRole('heading', {level: 1})).toBeVisible();
  await page.getByRole('navigation', {name: 'Main'}).getByRole('link', {name: 'Best sellers'}).click();
  await expect(page).toHaveURL(/\/best-sellers/);
  await page.getByRole('link', {name: 'Linen Overshirt'}).first().click();
  await expect(page.getByRole('heading', {level: 1, name: 'Linen Overshirt'})).toBeVisible();
});

test('sold-out variants cannot be purchased', async ({page}) => {
  // Ink / XS is sold out in the fixture data.
  await page.goto('/products/linen-overshirt?Color=Ink&Size=XS');
  await expect(page.getByRole('button', {name: 'Sold out', exact: true}).first()).toBeDisabled();
  await expect(page.getByRole('button', {name: 'Buy it now'})).toHaveCount(0);
  await expect(page.getByRole('status').filter({hasText: 'Sold out'})).toBeVisible();
});

test('add to cart, update quantity, apply discount, remove, and hand off to checkout', async ({page}) => {
  const drawer = await addOvershirtToCart(page);

  // Increase quantity via Shopify cartLinesUpdate.
  await drawer.getByRole('button', {name: 'Increase quantity of Linen Overshirt'}).click();
  await expect(drawer.getByRole('group', {name: 'Quantity for Linen Overshirt'})).toContainText('2');
  await expect(drawer.getByTestId('cart-subtotal')).toHaveText('$256.00');

  // Full cart page with discount code.
  await page.goto('/cart');
  const main = page.getByRole('main');
  const discounts = main.getByRole('region', {name: 'Discount codes'});
  await discounts.getByLabel('Discount code').fill('WELCOME10');
  await discounts.getByRole('button', {name: 'Apply'}).click();
  await expect(main.getByRole('button', {name: 'Remove discount WELCOME10'})).toBeVisible();
  await expect(main.getByTestId('cart-total')).toHaveText('$230.40');

  // Invalid code is reported (Shopify decides applicability).
  await discounts.getByLabel('Discount code').fill('NOTREAL');
  await discounts.getByRole('button', {name: 'Apply'}).click();
  await expect(main.getByText(/can.t be applied to/)).toBeVisible();

  // Checkout handoff uses Shopify's checkoutUrl.
  const checkout = main.getByTestId('checkout-button');
  await expect(checkout).toHaveAttribute('href', /\/checkouts\/cn\//);
  await checkout.click();
  await expect(page.getByTestId('mock-checkout')).toBeVisible();
  await expect(page.getByTestId('mock-checkout-qty')).toHaveText('2');

  // Remove the line.
  await page.goto('/cart');
  await page.getByRole('main').getByRole('button', {name: 'Remove Linen Overshirt from cart'}).click();
  await expect(page.getByRole('main').getByText('Your cart is empty')).toBeVisible();
});

test('buy now goes straight to checkout', async ({page}) => {
  await page.goto('/products/ceramic-pour-over-set');
  await page.getByRole('button', {name: 'Buy it now'}).click();
  await expect(page.getByTestId('mock-checkout')).toBeVisible();
  await expect(page.getByTestId('mock-checkout-qty')).toHaveText('1');
});

test('cart persists across navigation and reloads', async ({page}) => {
  await addOvershirtToCart(page);
  await page.goto('/collections/all');
  await page.reload();
  await expect(page.getByTestId('cart-toggle')).toHaveAttribute('aria-label', /Cart, \d+ items/);
});

test('predictive search and full search with filters', async ({page}) => {
  await page.goto('/');
  await page.getByTestId('search-toggle').click();
  const dialog = page.getByRole('dialog', {name: 'Search'});
  await dialog.getByLabel('Search products').fill('linen');
  await expect(dialog.getByRole('link', {name: /Linen Overshirt/})).toBeVisible();
  await dialog.getByLabel('Search products').press('Enter');
  await expect(page).toHaveURL(/\/search\?q=linen/);
  await expect(page.getByRole('heading', {level: 1})).toContainText('linen');

  await page.goto('/search?q=zzzz-no-results');
  await expect(page.getByText(/No results for/)).toBeVisible();
  await expect(page.getByText('Popular right now')).toBeVisible();
});

test('collection filters and sort update the shareable URL', async ({page}) => {
  await page.goto('/collections/apparel');
  await page.getByRole('complementary', {name: 'Filters'}).getByRole('checkbox', {name: /Stride Lab/}).click();
  await expect(page).toHaveURL(/filter\.p\.vendor=Stride/);
  await expect(page.getByRole('link', {name: 'Trail Runner Sneaker'}).first()).toBeVisible();
  await page.getByLabel('Sort by').selectOption('price-desc');
  await expect(page).toHaveURL(/sort=price-desc/);
  await page.getByRole('link', {name: 'Clear all'}).click();
  await expect(page).not.toHaveURL(/filter\./);
});

test('wishlist saves products on this device', async ({page}) => {
  await page.goto('/products/waxed-canvas-tote');
  await page.getByRole('button', {name: 'Save Waxed Canvas Tote to wishlist'}).click();
  await page.goto('/wishlist');
  await expect(page.getByRole('link', {name: 'Waxed Canvas Tote'}).first()).toBeVisible();
});

test('keyboard users can skip to content and close drawers with Escape', async ({page}) => {
  await page.goto('/');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', {name: 'Skip to content'})).toBeFocused();
  await page.getByTestId('cart-toggle').click();
  await expect(page.getByRole('dialog', {name: 'Your cart'})).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', {name: 'Your cart'})).toBeHidden();
});

for (const path of ['/', '/collections/apparel', '/products/linen-overshirt', '/cart', '/search?q=tee', '/contact', '/faq']) {
  test(`no serious accessibility violations on ${path}`, async ({page}) => {
    await page.goto(path);
    await page.waitForLoadState('networkidle');
    const results = await new AxeBuilder({page}).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
    const serious = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
    expect(serious.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).slice(0, 3).join(', ')}`)).toEqual([]);
  });
}
